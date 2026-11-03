"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/Header";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import useCotizacion from "@/lib/hooks/useCotizacion";
import FormularioAccesorio from "../accesorios/components/FormularioProducto";
import FormularioRepuesto from "../repuestos/components/FormularioProducto";
import { fotosParaFirestore, normalizarFotosURLs } from "@/lib/fotosRepuestoHelpers";
import { normalizarCategoriaKey } from "@/lib/categoriaRepuesto";
import { resolverCodigoAltaRepuesto } from "@/lib/codigoRepuestoUnico";
import { promedioPonderadoCosto } from "@/lib/stock/promedioPonderado";

type Destino = "stockAccesorios" | "stockRepuestos";

type ItemPrecarga = {
  producto: string;
  codigo: string;
  codigoBarras: string;
  proveedor: string;
  categoria: string;
  marca: string;
  modelo: string;
  color: string;
  precioCosto: number;
  precio1: number;
  precio2: number;
  precio3: number;
  moneda: "ARS" | "USD";
  cantidad: number;
  stockIdeal: number;
  stockBajo: number;
  observacion: string;
  fotosURLs: string[];
  publicarEnCatalogoWeb: boolean;
  cotizacion: number;
  productoId: string;
  stockEnSistema: number;
  costoEnSistema: number;
};

type ProductoStock = ItemPrecarga & { id: string };

type Precarga = {
  id: string;
  destino: Destino;
  estado: string;
  fecha: string;
  items: ItemPrecarga[];
};

const itemVacio = (): ItemPrecarga => ({
  producto: "",
  codigo: "",
  codigoBarras: "",
  proveedor: "",
  categoria: "",
  marca: "",
  modelo: "",
  color: "",
  precioCosto: 0,
  precio1: 0,
  precio2: 0,
  precio3: 0,
  moneda: "ARS",
  cantidad: 1,
  stockIdeal: 5,
  stockBajo: 3,
  observacion: "",
  fotosURLs: [],
  publicarEnCatalogoWeb: false,
  cotizacion: 0,
  productoId: "",
  stockEnSistema: 0,
  costoEnSistema: 0,
});

function num(valor: unknown, fallback = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
}

function aProducto(id: string, data: Record<string, unknown>): ProductoStock {
  const moneda = String(data.moneda || "").toUpperCase() === "USD" ? "USD" : "ARS";
  const costo = num(data.precioCosto);
  return {
    id,
    producto: String(data.producto || ""),
    codigo: String(data.codigo || ""),
    codigoBarras: String(data.codigoBarras || ""),
    proveedor: String(data.proveedor || ""),
    categoria: String(data.categoria || ""),
    marca: String(data.marca || ""),
    modelo: String(data.modelo || ""),
    color: String(data.color || ""),
    precioCosto: costo,
    precio1: num(data.precio1),
    precio2: num(data.precio2),
    precio3: num(data.precio3),
    moneda,
    cantidad: 1,
    stockIdeal: num(data.stockIdeal, 5),
    stockBajo: num(data.stockBajo, 3),
    observacion: typeof data.observacion === "string" ? data.observacion : "",
    fotosURLs: normalizarFotosURLs(data),
    publicarEnCatalogoWeb: data.publicarEnCatalogoWeb === true,
    cotizacion: num(data.cotizacion),
    productoId: id,
    stockEnSistema: num(data.cantidad),
    costoEnSistema: costo,
  };
}

export default function PrecargasStockPage() {
  const router = useRouter();
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";
  const { cotizacion } = useCotizacion(negocioID);
  const cotiz = typeof cotizacion === "number" && cotizacion > 0 ? cotizacion : 0;

  const [destino, setDestino] = useState<Destino>("stockAccesorios");
  const [form, setForm] = useState<ItemPrecarga>(itemVacio());
  const [lista, setLista] = useState<Precarga[]>([]);
  const [catalogo, setCatalogo] = useState<ProductoStock[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [recibiendo, setRecibiendo] = useState("");
  const [aviso, setAviso] = useState("");

  const set = <K extends keyof ItemPrecarga>(clave: K, valor: ItemPrecarga[K]) => {
    setForm((prev) => ({ ...prev, [clave]: valor }));
  };

  const cargar = async () => {
    if (!negocioID) return;
    const snap = await getDocs(collection(db, `negocios/${negocioID}/precargasStock`));
    const rows: Precarga[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        destino: data.destino === "stockRepuestos" ? "stockRepuestos" : "stockAccesorios",
        estado: String(data.estado || "pendiente"),
        fecha: String(data.fecha || ""),
        items: Array.isArray(data.items) ? (data.items as ItemPrecarga[]) : [],
      };
    });
    rows.sort((a, b) => (a.estado === b.estado ? b.fecha.localeCompare(a.fecha) : a.estado === "pendiente" ? -1 : 1));
    setLista(rows);
  };

  useEffect(() => {
    void cargar();
  }, [negocioID]);

  useEffect(() => {
    if (!negocioID) return;
    let cancelado = false;
    void getDocs(collection(db, `negocios/${negocioID}/${destino}`)).then((snap) => {
      if (cancelado) return;
      setCatalogo(snap.docs.map((d) => aProducto(d.id, d.data() as Record<string, unknown>)));
    });
    return () => {
      cancelado = true;
    };
  }, [negocioID, destino]);

  const coincidencias = useMemo(() => {
    const palabras = busqueda.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (palabras.length === 0 || busqueda.trim().length < 2) return [];
    return catalogo
      .filter((p) => {
        const texto = [p.producto, p.codigo, p.codigoBarras, p.marca, p.modelo, p.color, p.categoria, p.proveedor]
          .join(" ")
          .toLowerCase();
        return palabras.every((w) => texto.includes(w));
      })
      .slice(0, 8);
  }, [busqueda, catalogo]);

  const preview = form.productoId
    ? promedioPonderadoCosto(form.stockEnSistema, form.costoEnSistema, form.cantidad, form.precioCosto)
    : null;

  const elegirProducto = (p: ProductoStock) => {
    setBusqueda("");
    setForm({
      ...p,
      cantidad: 1,
      cotizacion: cotiz || p.cotizacion,
    });
    setAviso("Se completó con el producto del stock. La cantidad es lo que va a llegar.");
  };

  const pesos = (valor: number) => (form.moneda === "USD" && cotiz > 0 ? valor * cotiz : valor);

  const agregar = async () => {
    if (!negocioID || !form.producto.trim() || form.cantidad <= 0) return;
    if (destino === "stockRepuestos" && form.precioCosto <= 0) return;
    setGuardando(true);
    setAviso("");
    try {
      const item: ItemPrecarga = {
        ...form,
        producto: form.producto.trim(),
        codigo: form.codigo.trim(),
        codigoBarras: form.codigoBarras.trim(),
        proveedor: form.proveedor.trim(),
        categoria: form.categoria.trim(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        color: form.color.trim(),
        observacion: form.observacion.trim(),
        cotizacion: cotiz,
      };
      await addDoc(collection(db, `negocios/${negocioID}/precargasStock`), {
        destino,
        estado: "pendiente",
        fecha: new Date().toLocaleDateString("es-AR"),
        items: [item],
        creadaEn: serverTimestamp(),
      });
      setForm({ ...itemVacio(), moneda: destino === "stockRepuestos" ? "USD" : "ARS" });
      setBusqueda("");
      setAviso(
        item.productoId
          ? "Quedó en la pre carga. Al llegar, la cantidad se suma y el costo sale por promedio ponderado."
          : "Quedó en la pre carga. Todavía no entra al stock."
      );
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const pasarAStock = async (precarga: Precarga) => {
    if (!negocioID || precarga.estado === "recibida") return;
    setRecibiendo(precarga.id);
    setAviso("");
    try {
      const colPath = `negocios/${negocioID}/${precarga.destino}`;
      const col = collection(db, colPath);
      for (const item of precarga.items) {
        const cantidad = Number(item.cantidad) || 0;
        if (!item.producto || cantidad <= 0) continue;
        const codigo = String(item.codigo || "").trim();
        const barras = String(item.codigoBarras || "").trim();
        let existente: { id: string; data: () => Record<string, unknown> } | null = null;
        if (item.productoId) {
          const porId = await getDoc(doc(db, `${colPath}/${item.productoId}`));
          if (porId.exists()) existente = porId;
        }
        if (!existente && codigo) {
          const porCodigo = await getDocs(query(col, where("codigo", "==", codigo), limit(1)));
          existente = porCodigo.docs[0] || null;
        }
        if (!existente && barras) {
          const porBarras = await getDocs(query(col, where("codigoBarras", "==", barras), limit(1)));
          existente = porBarras.docs[0] || null;
        }
        if (existente) {
          const actual = existente.data();
          const { nuevaCantidad, nuevoCosto } = promedioPonderadoCosto(
            num(actual.cantidad),
            num(actual.precioCosto),
            cantidad,
            num(item.precioCosto)
          );
          const monedaActual = String(actual.moneda || item.moneda || "ARS").toUpperCase();
          const cotizacionItem = num(item.cotizacion) || cotiz;
          const patch: Record<string, number> = {
            cantidad: nuevaCantidad,
            precioCosto: nuevoCosto,
          };
          if (precarga.destino === "stockRepuestos") {
            patch.precioCostoPesos =
              monedaActual === "USD" && cotizacionItem > 0 ? nuevoCosto * cotizacionItem : nuevoCosto;
          }
          await updateDoc(doc(db, `${colPath}/${existente.id}`), patch);
          continue;
        }

        const cotizacionItem = Number(item.cotizacion) || cotiz;
        const aPesos = (n: number) =>
          item.moneda === "USD" && cotizacionItem > 0 ? n * cotizacionItem : n;

        if (precarga.destino === "stockAccesorios") {
          const snap = await getDocs(col);
          const nuevoCodigo = codigo || `ACC${String(snap.size + 1).padStart(3, "0")}`;
          await addDoc(col, {
            codigo: nuevoCodigo,
            codigoBarras: item.codigoBarras || "",
            proveedor: item.proveedor || "",
            producto: item.producto,
            categoria: item.categoria || "",
            marca: item.marca || "",
            modelo: item.modelo || "",
            color: item.color || "",
            precioCosto: Number(item.precioCosto) || 0,
            precio1: Number(item.precio1) || 0,
            precio2: Number(item.precio2) || 0,
            precio3: Number(item.precio3) || 0,
            precio1Pesos: aPesos(Number(item.precio1) || 0),
            precio2Pesos: aPesos(Number(item.precio2) || 0),
            precio3Pesos: aPesos(Number(item.precio3) || 0),
            moneda: item.moneda === "USD" ? "USD" : "ARS",
            cotizacion: cotizacionItem,
            cantidad,
            stockIdeal: Number(item.stockIdeal) || 5,
            stockBajo: Number(item.stockBajo) || 3,
            tipo: "accesorio",
            consignacion: false,
          });
          continue;
        }

        const snap = await getDocs(col);
        const itemsCodigo = snap.docs.map((d) => ({
          id: d.id,
          codigo: String(d.data().codigo ?? d.id).trim(),
        }));
        const resultado = resolverCodigoAltaRepuesto(codigo, itemsCodigo, snap.size);
        if (resultado.ok === false) {
          throw new Error(resultado.error);
        }
        await addDoc(col, {
          codigo: resultado.codigo,
          codigoBarras: item.codigoBarras || "",
          proveedor: item.proveedor || "",
          producto: item.producto,
          categoria: item.categoria || "",
          categoriaKey: normalizarCategoriaKey(item.categoria || ""),
          marca: item.marca || "",
          color: item.color || "",
          precioCosto: Number(item.precioCosto) || 0,
          moneda: item.moneda === "USD" ? "USD" : "ARS",
          cotizacion: cotizacionItem,
          cantidad,
          stockIdeal: Number(item.stockIdeal) || 5,
          stockBajo: Number(item.stockBajo) || 3,
          precioCostoPesos: aPesos(Number(item.precioCosto) || 0),
          precio1: Number(item.precio1) || 0,
          precio2: Number(item.precio2) || 0,
          precio3: Number(item.precio3) || 0,
          precio1Pesos: aPesos(Number(item.precio1) || 0),
          precio2Pesos: aPesos(Number(item.precio2) || 0),
          precio3Pesos: aPesos(Number(item.precio3) || 0),
          tipo: "repuesto",
          ...fotosParaFirestore(item.fotosURLs || []),
          observacion: item.observacion || "",
          publicarEnCatalogoWeb: item.publicarEnCatalogoWeb === true,
          consignacion: false,
        });
      }
      await updateDoc(doc(db, `negocios/${negocioID}/precargasStock/${precarga.id}`), {
        estado: "recibida",
        recibidaEn: serverTimestamp(),
      });
      setAviso("El pedido entró al stock con los mismos datos del formulario.");
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo pasar al stock");
    } finally {
      setRecibiendo("");
    }
  };

  return (
    <>
      <Header />
      <main className="pt-16 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-4 max-w-[1200px] mx-auto space-y-4 py-4">
          <div className="bg-gradient-to-r from-[#16a085] to-[#1abc9c] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Pre cargas</h1>
              <button
                type="button"
                onClick={() => router.push("/ventas/stock-accesorios-repuestos")}
                className="ml-auto rounded-lg bg-white/20 px-3 py-2 text-sm font-semibold"
              >
                ← Stock
              </button>
            </div>
            <p className="text-sm text-white/90 mt-2">
              El formulario es el mismo del alta. Si el producto ya existe, buscalo: se completa solo y, al llegar, el costo se promedia.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDestino("stockAccesorios");
                setBusqueda("");
                setForm({ ...itemVacio(), moneda: "ARS" });
              }}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                destino === "stockAccesorios" ? "bg-[#9b59b6] text-white" : "bg-white text-[#2c3e50] border border-[#ecf0f1]"
              }`}
            >
              Accesorios
            </button>
            <button
              type="button"
              onClick={() => {
                setDestino("stockRepuestos");
                setBusqueda("");
                setForm({ ...itemVacio(), moneda: "USD" });
              }}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                destino === "stockRepuestos" ? "bg-[#e67e22] text-white" : "bg-white text-[#2c3e50] border border-[#ecf0f1]"
              }`}
            >
              Repuestos
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#ecf0f1] p-4 shadow space-y-3">
            <label className="block text-sm font-semibold text-[#2c3e50]">
              Buscar producto existente
            </label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, código o código de barras"
              className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl text-[#2c3e50]"
            />
            {coincidencias.length > 0 ? (
              <ul className="border border-[#ecf0f1] rounded-xl overflow-hidden">
                {coincidencias.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => elegirProducto(p)}
                      className="w-full text-left px-3 py-2 hover:bg-[#e8f8f5] text-sm"
                    >
                      <span className="font-semibold text-[#2c3e50]">{p.producto}</span>
                      <span className="text-[#7f8c8d]">
                        {p.codigo ? ` · ${p.codigo}` : ""}
                        {p.marca ? ` · ${p.marca}` : ""}
                        {` · stock ${p.stockEnSistema}`}
                        {` · costo ${p.moneda} ${p.costoEnSistema}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : busqueda.trim().length >= 2 ? (
              <p className="text-sm text-[#7f8c8d]">No hay un producto con ese texto. Podés cargarlo como nuevo.</p>
            ) : null}
            {form.productoId && preview ? (
              <div className="rounded-xl border-2 border-[#16a085] bg-[#e8f8f5] p-3 text-sm space-y-1">
                <p className="font-semibold text-[#0e6655]">
                  Reposición de {form.producto}. Al llegar se aplica promedio ponderado.
                </p>
                <p className="text-[#2c3e50]">
                  Stock actual: <strong>{form.stockEnSistema}</strong> · costo actual:{" "}
                  <strong>
                    {form.moneda} ${form.costoEnSistema.toLocaleString("es-AR")}
                  </strong>
                </p>
                <p className="text-[#2c3e50]">
                  Esta compra: <strong>{form.cantidad}</strong> a{" "}
                  <strong>
                    {form.moneda} ${form.precioCosto.toLocaleString("es-AR")}
                  </strong>
                </p>
                <p className="text-[#2c3e50]">
                  Nuevo stock: <strong>{preview.nuevaCantidad}</strong> · nuevo costo:{" "}
                  <strong>
                    {form.moneda} ${preview.nuevoCosto.toLocaleString("es-AR")}
                  </strong>
                </p>
                <p className="text-xs text-[#7f8c8d]">
                  Los precios de venta no se modifican. El promedio se vuelve a calcular con el stock que haya cuando marcás que llegó.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ ...itemVacio(), moneda: destino === "stockRepuestos" ? "USD" : "ARS" });
                    setBusqueda("");
                  }}
                  className="text-xs font-bold text-[#0e6655] underline"
                >
                  Cargar uno nuevo
                </button>
              </div>
            ) : null}
          </div>

          {destino === "stockAccesorios" ? (
            <FormularioAccesorio
              codigo={form.codigo}
              setCodigo={(v) => set("codigo", v)}
              proveedor={form.proveedor}
              setProveedor={(v) => set("proveedor", v)}
              producto={form.producto}
              setProducto={(v) => set("producto", v)}
              categoria={form.categoria}
              setCategoria={(v) => set("categoria", v)}
              marca={form.marca}
              setMarca={(v) => set("marca", v)}
              modelo={form.modelo}
              setModelo={(v) => set("modelo", v)}
              color={form.color}
              setColor={(v) => set("color", v)}
              codigoBarras={form.codigoBarras}
              setCodigoBarras={(v) => set("codigoBarras", v)}
              precioCosto={form.precioCosto}
              setPrecioCosto={(v) => set("precioCosto", v)}
              precio1={form.precio1}
              setPrecio1={(v) => set("precio1", v)}
              precio2={form.precio2}
              setPrecio2={(v) => set("precio2", v)}
              precio3={form.precio3}
              setPrecio3={(v) => set("precio3", v)}
              moneda={form.moneda}
              setMoneda={(v) => set("moneda", v)}
              cotizacion={cotiz || 1200}
              cantidad={form.cantidad}
              setCantidad={(v) => set("cantidad", v)}
              stockIdeal={form.stockIdeal}
              setStockIdeal={(v) => set("stockIdeal", v)}
              stockBajo={form.stockBajo}
              setStockBajo={(v) => set("stockBajo", v)}
              guardarProducto={() => void agregar()}
              editandoId={null}
              textoBoton={guardando ? "Guardando…" : "Guardar en la pre carga"}
            />
          ) : (
            <FormularioRepuesto
              codigo={form.codigo}
              setCodigo={(v) => set("codigo", v)}
              proveedor={form.proveedor}
              setProveedor={(v) => set("proveedor", v)}
              producto={form.producto}
              setProducto={(v) => set("producto", v)}
              categoria={form.categoria}
              setCategoria={(v) => set("categoria", v)}
              marca={form.marca}
              setMarca={(v) => set("marca", v)}
              color={form.color}
              setColor={(v) => set("color", v)}
              codigoBarras={form.codigoBarras}
              setCodigoBarras={(v) => set("codigoBarras", v)}
              precioCosto={form.precioCosto}
              setPrecioCosto={(v) => set("precioCosto", v)}
              moneda={form.moneda}
              setMoneda={(v) => set("moneda", v)}
              cotizacion={cotiz}
              setCotizacion={() => undefined}
              precioCostoPesos={pesos(form.precioCosto)}
              precio1={form.precio1}
              setPrecio1={(v) => set("precio1", v)}
              precio2={form.precio2}
              setPrecio2={(v) => set("precio2", v)}
              precio3={form.precio3}
              setPrecio3={(v) => set("precio3", v)}
              precio1Pesos={pesos(form.precio1)}
              setPrecio1Pesos={() => undefined}
              precio2Pesos={pesos(form.precio2)}
              setPrecio2Pesos={() => undefined}
              precio3Pesos={pesos(form.precio3)}
              setPrecio3Pesos={() => undefined}
              cantidad={form.cantidad}
              setCantidad={(v) => set("cantidad", v)}
              stockIdeal={form.stockIdeal}
              setStockIdeal={(v) => set("stockIdeal", v)}
              stockBajo={form.stockBajo}
              setStockBajo={(v) => set("stockBajo", v)}
              fotosURLs={form.fotosURLs}
              setFotosURLs={(v) => set("fotosURLs", v)}
              observacion={form.observacion}
              setObservacion={(v) => set("observacion", v)}
              publicarEnCatalogoWeb={form.publicarEnCatalogoWeb}
              setPublicarEnCatalogoWeb={(v) => set("publicarEnCatalogoWeb", v)}
              negocioID={negocioID}
              guardarProducto={() => void agregar()}
              editandoId={null}
              textoBoton={guardando ? "Guardando…" : "Guardar en la pre carga"}
            />
          )}

          {aviso ? <p className="text-sm font-semibold text-[#2c3e50]">{aviso}</p> : null}

          <div className="space-y-3">
            {lista.length === 0 ? (
              <p className="text-sm text-[#7f8c8d]">No hay pre cargas.</p>
            ) : (
              lista.map((p) => (
                <article key={p.id} className="bg-white rounded-2xl border border-[#ecf0f1] p-4 shadow">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#2c3e50]">{p.fecha}</p>
                    <span className="text-xs font-bold rounded-full bg-[#ecf0f1] px-2 py-1">
                      {p.destino === "stockRepuestos" ? "Repuestos" : "Accesorios"}
                    </span>
                    <span
                      className={`text-xs font-bold rounded-full px-2 py-1 ${
                        p.estado === "recibida" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {p.estado === "recibida" ? "En stock" : "Pendiente"}
                    </span>
                  </div>
                  <ul className="mt-2 text-sm text-[#34495e] space-y-1">
                    {p.items.map((it, idx) => (
                      <li key={idx}>
                        {it.cantidad} × {it.producto}
                        {it.codigo ? ` · ${it.codigo}` : ""}
                        {it.marca ? ` · ${it.marca}` : ""}
                        {it.color ? ` · ${it.color}` : ""}
                        {it.precioCosto ? ` · costo ${it.moneda === "USD" ? "USD" : "$"} ${it.precioCosto}` : ""}
                        {it.productoId ? " · promedio ponderado" : ""}
                      </li>
                    ))}
                  </ul>
                  {p.estado !== "recibida" ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={recibiendo === p.id}
                        onClick={() => void pasarAStock(p)}
                        className="rounded-lg bg-[#27ae60] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {recibiendo === p.id ? "Pasando…" : "Llegó, pasar al stock"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void deleteDoc(doc(db, `negocios/${negocioID}/precargasStock/${p.id}`)).then(() => cargar())
                        }
                        className="rounded-lg bg-[#fdecea] px-3 py-2 text-sm font-bold text-[#c0392b]"
                      >
                        Borrar
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
