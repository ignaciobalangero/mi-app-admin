"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, Truck, Building2, CreditCard, Landmark } from "lucide-react";
import type { ItemStockPublico } from "@/lib/stockPublicoTypes";
import { subtotalLineaARS, textoPrecioTienda } from "@/lib/stockPublicoPrecios";
import type {
  ClienteTiendaPerfil,
  DireccionTienda,
  MetodoPagoTienda,
  TipoEnvioTienda,
} from "@/lib/tiendaClienteTypes";
import {
  METODOS_PAGO,
  TRANSPORTISTAS,
  VALORES_DECLARADOS,
  calcularValorDeclarado,
} from "@/lib/tiendaCheckoutOpciones";
import type { DatosTransferenciaConfig } from "@/lib/tiendaWebConfigTypes";
import { construirUrlWhatsApp } from "@/lib/consultaStockWhatsApp";

type LineaCarrito = { item: ItemStockPublico; cantidad: number };

export type CheckoutConfigPublico = {
  transportistas: { id: string; label: string }[];
  valoresDeclarados: number[];
  metodosPago: {
    id: MetodoPagoTienda;
    label: string;
    recargoPct: number;
    hint?: string;
  }[];
  transferencia: DatosTransferenciaConfig;
};

type Props = {
  negocioId: string;
  nombreTienda: string;
  telefonoPedidos: string;
  checkoutConfig?: CheckoutConfigPublico | null;
  carrito: Record<string, LineaCarrito>;
  cotizacionUSD: number;
  perfil: ClienteTiendaPerfil | null;
  esClienteTienda: boolean;
  getToken: () => Promise<string | null>;
  onPedidoOk: () => void;
  onVolver: () => void;
};

const dirVacia = (): DireccionTienda => ({
  id: "",
  etiqueta: "Principal",
  calle: "",
  numero: "",
  pisoDepto: "",
  localidad: "",
  provincia: "",
  codigoPostal: "",
  nombreRecepcion: "",
  telefono: "",
});

const DEFAULT_CHECKOUT: CheckoutConfigPublico = {
  transportistas: TRANSPORTISTAS.map(({ id, label }) => ({ id, label })),
  valoresDeclarados: [...VALORES_DECLARADOS],
  metodosPago: METODOS_PAGO.map(({ id, label, recargoPct, hint }) => ({
    id,
    label,
    recargoPct,
    hint,
  })),
  transferencia: {
    cbu: "",
    alias: "",
    titular: "",
    banco: "",
    instrucciones:
      "Al realizar el pedido recibirás los datos bancarios. Tenés 24 hs hábiles para abonar.",
  },
};

export default function CheckoutCarritoTienda({
  negocioId,
  nombreTienda,
  telefonoPedidos,
  checkoutConfig,
  carrito,
  cotizacionUSD,
  perfil,
  esClienteTienda,
  getToken,
  onPedidoOk,
  onVolver,
}: Props) {
  const config = checkoutConfig ?? DEFAULT_CHECKOUT;

  const lineas = useMemo(() => Object.values(carrito), [carrito]);
  const totalRef = useMemo(
    () => lineas.reduce((a, l) => a + subtotalLineaARS(l.item, l.cantidad, cotizacionUSD), 0),
    [lineas, cotizacionUSD]
  );

  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvioTienda>("envio");
  const [transportista, setTransportista] = useState<string>(
    config.transportistas[0]?.id ?? "oca"
  );
  const [valorDeclaradoPct, setValorDeclaradoPct] = useState<number>(
    config.valoresDeclarados[0] ?? 10
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPagoTienda>(
    config.metodosPago[0]?.id ?? "transferencia"
  );
  const [direccionId, setDireccionId] = useState<string>("");
  const [direccion, setDireccion] = useState<DireccionTienda>(() => {
    const d = perfil?.direcciones?.[0];
    return d ? { ...d } : dirVacia();
  });
  const [guardarDireccion, setGuardarDireccion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (config.transportistas.length && !config.transportistas.some((t) => t.id === transportista)) {
      setTransportista(config.transportistas[0].id);
    }
    if (config.valoresDeclarados.length && !config.valoresDeclarados.includes(valorDeclaradoPct)) {
      setValorDeclaradoPct(config.valoresDeclarados[0]);
    }
    if (config.metodosPago.length && !config.metodosPago.some((m) => m.id === metodoPago)) {
      setMetodoPago(config.metodosPago[0].id);
    }
  }, [config, transportista, valorDeclaradoPct, metodoPago]);

  const metodoSel = config.metodosPago.find((m) => m.id === metodoPago);
  const recargoPct = metodoSel?.recargoPct ?? 0;
  const totalConRecargo = Math.round(totalRef * (1 + recargoPct / 100));
  const valorDeclarado = tipoEnvio === "envio" ? calcularValorDeclarado(totalRef, valorDeclaradoPct) : 0;
  const labelTransportista = (id: string) =>
    config.transportistas.find((t) => t.id === id)?.label ?? id;

  const elegirDireccionGuardada = (d: DireccionTienda) => {
    setDireccionId(d.id);
    setDireccion({ ...d });
  };

  const textoTransferencia = () => {
    const t = config.transferencia;
    const partes: string[] = [];
    if (t.titular) partes.push(`Titular: ${t.titular}`);
    if (t.banco) partes.push(`Banco: ${t.banco}`);
    if (t.cbu) partes.push(`CBU: ${t.cbu}`);
    if (t.alias) partes.push(`Alias: ${t.alias}`);
    if (partes.length === 0) return t.instrucciones;
    return `${partes.join(" · ")}\n${t.instrucciones}`;
  };

  const armarMensajeWhatsApp = (numeroPedido: string) => {
    let body = `*Pedido #${numeroPedido}*\n_${nombreTienda}_\n\n`;
    lineas.forEach((l, i) => {
      const sub = subtotalLineaARS(l.item, l.cantidad, cotizacionUSD);
      body += `${i + 1}. ${l.item.producto}\n`;
      body += `   Cód: ${l.item.codigo} · Cant: ${l.cantidad} · ${textoPrecioTienda(l.item, cotizacionUSD)} c/u\n`;
      body += `   Subtotal ref.: $${sub.toLocaleString("es-AR")}\n\n`;
    });
    body += `*Total referencia: $${totalRef.toLocaleString("es-AR")}*\n`;
    body += `*Pago (${metodoSel?.label ?? metodoPago}): $${totalConRecargo.toLocaleString("es-AR")}*\n`;
    if (metodoPago === "transferencia" && config.transferencia.cbu) {
      body += `\n*Datos transferencia:*\n`;
      if (config.transferencia.titular) body += `Titular: ${config.transferencia.titular}\n`;
      if (config.transferencia.banco) body += `Banco: ${config.transferencia.banco}\n`;
      if (config.transferencia.cbu) body += `CBU: ${config.transferencia.cbu}\n`;
      if (config.transferencia.alias) body += `Alias: ${config.transferencia.alias}\n`;
    }
    body += `\n`;
    if (tipoEnvio === "retiro_deposito") {
      body += `*Retiro en depósito* (Gratis)\n`;
    } else {
      body += `*Envío:* ${labelTransportista(transportista)}\n`;
      body += `*Valor declarado:* ${valorDeclaradoPct}% ($${valorDeclarado.toLocaleString("es-AR")})\n`;
      body += `*Dirección:* ${direccion.calle} ${direccion.numero}${direccion.pisoDepto ? `, ${direccion.pisoDepto}` : ""}\n`;
      body += `${direccion.localidad}, ${direccion.provincia} (CP ${direccion.codigoPostal})\n`;
      body += `Recibe: ${direccion.nombreRecepcion || perfil?.nombre} · Tel: ${direccion.telefono || perfil?.telefono}\n`;
    }
    body += `\n_Cliente: ${perfil?.nombre} · ${perfil?.email}_\n`;
    body += "_Precios y stock sujetos a confirmación._";
    return body;
  };

  const confirmarPedido = async () => {
    setError("");
    if (!esClienteTienda || !perfil) {
      setError("Iniciá sesión para completar el pedido.");
      return;
    }
    setEnviando(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Sesión vencida. Volvé a iniciar sesión.");

      if (guardarDireccion && tipoEnvio === "envio") {
        await fetch("/api/tienda/cuenta", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            negocioId,
            accion: "guardar_direccion",
            direccion: { ...direccion, id: direccionId || undefined },
            nombre: perfil.nombre,
            telefono: perfil.telefono,
          }),
        });
      }

      const lineasPayload = lineas.map((l) => ({
        itemId: l.item.id,
        codigo: l.item.codigo,
        producto: l.item.producto,
        marca: l.item.marca,
        cantidad: l.cantidad,
        precioRefARS: subtotalLineaARS(l.item, 1, cotizacionUSD),
        subtotalRefARS: subtotalLineaARS(l.item, l.cantidad, cotizacionUSD),
      }));

      const res = await fetch("/api/tienda/pedidos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          negocioId,
          lineas: lineasPayload,
          tipoEnvio,
          transportista: tipoEnvio === "envio" ? transportista : null,
          valorDeclaradoPct: tipoEnvio === "envio" ? valorDeclaradoPct : null,
          metodoPago,
          direccion:
            tipoEnvio === "envio"
              ? {
                  ...direccion,
                  nombreRecepcion: direccion.nombreRecepcion || perfil.nombre,
                  telefono: direccion.telefono || perfil.telefono,
                }
              : null,
          cliente: {
            nombre: perfil.nombre,
            telefono: perfil.telefono,
            dniCuit: perfil.dniCuit,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo crear el pedido.");

      const url = construirUrlWhatsApp(telefonoPedidos, armarMensajeWhatsApp(data.numero));
      window.open(url, "_blank", "noopener,noreferrer");
      onPedidoOk();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al confirmar.");
    } finally {
      setEnviando(false);
    }
  };

  if (!esClienteTienda) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-neutral-600">
          Para comprar necesitás iniciar sesión con tu cuenta de la tienda.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link
            href={`/consulta-stock/${negocioId}/login?return=checkout`}
            className="rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white"
          >
            Iniciar sesión
          </Link>
          <Link
            href={`/consulta-stock/${negocioId}/registro?return=checkout`}
            className="rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-800"
          >
            Crear cuenta
          </Link>
        </div>
        <button type="button" onClick={onVolver} className="text-xs text-neutral-500 hover:underline">
          ← Volver al carrito
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-3 py-2 pb-6">
      <button type="button" onClick={onVolver} className="self-start text-xs font-semibold text-neutral-500 hover:underline">
        ← Volver al carrito
      </button>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-neutral-900">Tipo de envío</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipoEnvio("envio")}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
              tipoEnvio === "envio" ? "border-[#2563eb] bg-blue-50 text-[#2563eb]" : "border-neutral-200 text-neutral-700"
            }`}
          >
            <Truck className="h-5 w-5" />
            Envío
          </button>
          <button
            type="button"
            onClick={() => setTipoEnvio("retiro_deposito")}
            className={`relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition ${
              tipoEnvio === "retiro_deposito"
                ? "border-[#2563eb] bg-blue-50 text-[#2563eb]"
                : "border-neutral-200 text-neutral-700"
            }`}
          >
            <Building2 className="h-5 w-5" />
            Retiro en depósito
            <span className="absolute right-2 top-2 text-[10px] font-bold text-emerald-600">Gratis</span>
          </button>
        </div>

        {tipoEnvio === "envio" && (
          <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-600">Transportista</p>
              <div className="flex flex-wrap gap-2">
                {config.transportistas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTransportista(t.id)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      transportista === t.id
                        ? "border-[#2563eb] bg-blue-50 text-[#2563eb]"
                        : "border-neutral-200 text-neutral-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-neutral-600">Valor declarado (para seguro)</p>
              <div className="flex gap-2">
                {config.valoresDeclarados.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setValorDeclaradoPct(pct)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-bold ${
                      valorDeclaradoPct === pct
                        ? "border-[#2563eb] bg-blue-50 text-[#2563eb]"
                        : "border-neutral-200 text-neutral-700"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-500">
                Valor a declarar: <strong>${valorDeclarado.toLocaleString("es-AR")}</strong>
              </p>
            </div>
          </div>
        )}
      </section>

      {tipoEnvio === "envio" && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-neutral-900">Datos de envío *</h3>
          {(perfil?.direcciones?.length ?? 0) > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {perfil!.direcciones.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => elegirDireccionGuardada(d)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    direccionId === d.id ? "border-[#2563eb] bg-blue-50" : "border-neutral-200"
                  }`}
                >
                  {d.etiqueta || "Dirección"}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <input placeholder="Calle *" value={direccion.calle} onChange={(e) => setDireccion({ ...direccion, calle: e.target.value })} className="col-span-2 rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Número *" value={direccion.numero} onChange={(e) => setDireccion({ ...direccion, numero: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Piso / Depto" value={direccion.pisoDepto} onChange={(e) => setDireccion({ ...direccion, pisoDepto: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Localidad *" value={direccion.localidad} onChange={(e) => setDireccion({ ...direccion, localidad: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Provincia *" value={direccion.provincia} onChange={(e) => setDireccion({ ...direccion, provincia: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Código postal *" value={direccion.codigoPostal} onChange={(e) => setDireccion({ ...direccion, codigoPostal: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Nombre quien recibe *" value={direccion.nombreRecepcion} onChange={(e) => setDireccion({ ...direccion, nombreRecepcion: e.target.value })} className="col-span-2 rounded-lg border border-neutral-200 px-3 py-2" />
            <input placeholder="Teléfono contacto *" value={direccion.telefono} onChange={(e) => setDireccion({ ...direccion, telefono: e.target.value })} className="col-span-2 rounded-lg border border-neutral-200 px-3 py-2" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
            <input type="checkbox" checked={guardarDireccion} onChange={(e) => setGuardarDireccion(e.target.checked)} />
            Guardar esta dirección en mi cuenta (máx. 2)
          </label>
        </section>
      )}

      <section className="rounded-2xl bg-[#1e3a5f] p-4 text-white shadow-md">
        <h3 className="mb-3 text-sm font-bold">Método de pago</h3>
        <div className="space-y-2">
          {config.metodosPago.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetodoPago(m.id)}
              className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${
                metodoPago === m.id ? "border-blue-300 bg-white/10" : "border-white/20 bg-white/5"
              }`}
            >
              {m.id === "transferencia" ? <Landmark className="h-5 w-5 shrink-0" /> : <CreditCard className="h-5 w-5 shrink-0" />}
              <span className="flex-1 text-sm font-semibold">{m.label}</span>
              {m.recargoPct > 0 && (
                <span className="rounded bg-amber-500/90 px-2 py-0.5 text-xs font-bold text-white">+{m.recargoPct}%</span>
              )}
            </button>
          ))}
        </div>
        {metodoPago === "transferencia" && (
          <p className="mt-3 rounded-lg bg-blue-900/40 p-3 text-xs leading-relaxed text-blue-100 whitespace-pre-line">
            {textoTransferencia()}
          </p>
        )}
      </section>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-600">Total referencia</span>
          <span className="font-bold">${totalRef.toLocaleString("es-AR")}</span>
        </div>
        {recargoPct > 0 && (
          <div className="mt-1 flex justify-between text-sm text-amber-700">
            <span>Con recargo ({recargoPct}%)</span>
            <span className="font-bold">${totalConRecargo.toLocaleString("es-AR")}</span>
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}

      <button
        type="button"
        disabled={enviando || lineas.length === 0}
        onClick={() => void confirmarPedido()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-sm font-bold text-white shadow-md disabled:bg-neutral-300"
      >
        <MessageCircle className="h-5 w-5" />
        {enviando ? "Confirmando…" : "Confirmar pedido y abrir WhatsApp"}
      </button>
    </div>
  );
}
