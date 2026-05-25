import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import {
  negocioIdValido,
  verificarTokenClienteTienda,
  refClienteTienda,
  colPedidosTienda,
} from "@/lib/tiendaAuthServer";
import {
  calcularValorDeclarado,
  generarNumeroPedido,
} from "@/lib/tiendaCheckoutOpciones";
import { cargarCheckoutConfigTienda } from "@/lib/tiendaWebConfigServer";
import {
  metodosPagoActivos,
  recargoMetodoConfig,
  transportistasActivos,
} from "@/lib/tiendaWebConfigTypes";
import type {
  DireccionTienda,
  LineaPedidoTienda,
  MetodoPagoTienda,
  PedidoTienda,
  TipoEnvioTienda,
  TransportistaTienda,
} from "@/lib/tiendaClienteTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validarDireccion(d: Partial<DireccionTienda> | null | undefined): string | null {
  if (!d) return "Falta la dirección de envío.";
  if (!String(d.calle ?? "").trim()) return "Ingresá la calle.";
  if (!String(d.numero ?? "").trim()) return "Ingresá el número.";
  if (!String(d.localidad ?? "").trim()) return "Ingresá la localidad.";
  if (!String(d.provincia ?? "").trim()) return "Ingresá la provincia.";
  if (!String(d.codigoPostal ?? "").trim()) return "Ingresá el código postal.";
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const negocioId = searchParams.get("negocioId")?.trim() ?? "";
  if (!negocioIdValido(negocioId)) {
    return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
  }

  const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
  if (!sesion) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const snap = await db
    .collection(colPedidosTienda(negocioId))
    .where("uid", "==", sesion.uid)
    .limit(50)
    .get();

  const pedidos = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as PedidoTienda) }))
    .sort((a, b) => String(b.creadoEn).localeCompare(String(a.creadoEn)));
  return NextResponse.json({ pedidos });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const negocioId = String(body.negocioId ?? "").trim();
    if (!negocioIdValido(negocioId)) {
      return NextResponse.json({ error: "Negocio inválido." }, { status: 400 });
    }

    const sesion = await verificarTokenClienteTienda(req.headers.get("authorization"), negocioId);
    if (!sesion) {
      return NextResponse.json(
        { error: "Iniciá sesión o registrate para completar el pedido." },
        { status: 401 }
      );
    }

    const perfilSnap = await db.doc(refClienteTienda(negocioId, sesion.uid)).get();
    if (!perfilSnap.exists) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }

    const lineasRaw = Array.isArray(body.lineas) ? body.lineas : [];
    if (lineasRaw.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío." }, { status: 400 });
    }

    const lineas: LineaPedidoTienda[] = lineasRaw.map((l: Record<string, unknown>) => ({
      itemId: String(l.itemId ?? ""),
      codigo: String(l.codigo ?? ""),
      producto: String(l.producto ?? ""),
      marca: String(l.marca ?? ""),
      cantidad: Math.max(1, Number(l.cantidad) || 1),
      precioRefARS: Math.round(Number(l.precioRefARS) || 0),
      subtotalRefARS: Math.round(Number(l.subtotalRefARS) || 0),
    }));

    const totalRefARS = lineas.reduce((a, l) => a + l.subtotalRefARS, 0);
    const tipoEnvio = String(body.tipoEnvio ?? "") as TipoEnvioTienda;
    const metodoPago = String(body.metodoPago ?? "transferencia") as MetodoPagoTienda;

    if (tipoEnvio !== "envio" && tipoEnvio !== "retiro_deposito") {
      return NextResponse.json({ error: "Elegí tipo de envío." }, { status: 400 });
    }
    if (metodoPago !== "transferencia" && metodoPago !== "modo_qr") {
      return NextResponse.json({ error: "Elegí método de pago." }, { status: 400 });
    }

    const checkoutConfig = await cargarCheckoutConfigTienda(negocioId);
    if (!metodosPagoActivos(checkoutConfig).some((m) => m.id === metodoPago)) {
      return NextResponse.json({ error: "Método de pago no disponible." }, { status: 400 });
    }

    let transportista: TransportistaTienda | null = null;
    let valorDeclaradoPct: number | null = null;
    let valorDeclaradoARS: number | null = null;
    let direccion: DireccionTienda | null = null;

    if (tipoEnvio === "envio") {
      transportista = String(body.transportista ?? "") as TransportistaTienda;
      if (!transportistasActivos(checkoutConfig).some((t) => t.id === transportista)) {
        return NextResponse.json({ error: "Transportista no disponible." }, { status: 400 });
      }
      const pct = Number(body.valorDeclaradoPct);
      if (!checkoutConfig.valoresDeclarados.includes(pct)) {
        return NextResponse.json({ error: "Elegí un valor declarado válido." }, { status: 400 });
      }
      valorDeclaradoPct = pct;
      valorDeclaradoARS = calcularValorDeclarado(totalRefARS, pct);

      const dirErr = validarDireccion(body.direccion);
      if (dirErr) return NextResponse.json({ error: dirErr }, { status: 400 });

      direccion = {
        id: String(body.direccion.id ?? ""),
        etiqueta: String(body.direccion.etiqueta ?? "Envío").trim(),
        calle: String(body.direccion.calle).trim(),
        numero: String(body.direccion.numero).trim(),
        pisoDepto: String(body.direccion.pisoDepto ?? "").trim(),
        localidad: String(body.direccion.localidad).trim(),
        provincia: String(body.direccion.provincia).trim(),
        codigoPostal: String(body.direccion.codigoPostal).trim(),
        nombreRecepcion: String(body.direccion.nombreRecepcion ?? body.cliente?.nombre ?? "").trim(),
        telefono: String(body.direccion.telefono ?? body.cliente?.telefono ?? "").trim(),
      };
    }

    const recargoPct = recargoMetodoConfig(checkoutConfig, metodoPago);
    const totalConRecargoARS = Math.round(totalRefARS * (1 + recargoPct / 100));
    const perfil = perfilSnap.data()!;
    const numero = generarNumeroPedido();
    const ahora = new Date().toISOString();

    const pedido: Omit<PedidoTienda, "id"> = {
      numero,
      uid: sesion.uid,
      negocioId,
      cliente: {
        nombre: String(body.cliente?.nombre ?? perfil.nombre ?? "").trim(),
        email: sesion.email,
        telefono: String(body.cliente?.telefono ?? perfil.telefono ?? "").trim(),
        dniCuit: String(body.cliente?.dniCuit ?? perfil.dniCuit ?? "").trim(),
      },
      envio: {
        tipo: tipoEnvio,
        transportista,
        valorDeclaradoPct,
        valorDeclaradoARS,
        direccion,
      },
      pago: {
        metodo: metodoPago,
        recargoPct,
        totalRefARS,
        totalConRecargoARS,
      },
      lineas,
      totalRefARS,
      estado: "pendiente",
      origen: "tienda_web",
      creadoEn: ahora,
    };

    if (!pedido.cliente.nombre || pedido.cliente.telefono.length < 10) {
      return NextResponse.json({ error: "Completá nombre y teléfono de contacto." }, { status: 400 });
    }

    const docRef = await db.collection(colPedidosTienda(negocioId)).add({
      ...pedido,
      creadoEnTs: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, pedidoId: docRef.id, numero, pedido: { ...pedido, id: docRef.id } });
  } catch (e: unknown) {
    console.error("[tienda/pedidos POST]", e);
    return NextResponse.json({ error: "No se pudo crear el pedido." }, { status: 500 });
  }
}
