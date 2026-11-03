"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import CampoCodigoBarras from "@/components/CampoCodigoBarras";

type Destino = "stockAccesorios" | "stockRepuestos";

type Linea = {
  producto: string;
  cantidad: number;
  precioCosto: number;
  moneda: "ARS" | "USD";
  codigo: string;
  codigoBarras: string;
  productoId: string;
};

type Precarga = {
  id: string;
  proveedor: string;
  destino: Destino;
  estado: string;
  fecha: string;
  items: Linea[];
};

const lineaVacia = (): Linea => ({
  producto: "",
  cantidad: 1,
  precioCosto: 0,
  moneda: "ARS",
  codigo: "",
  codigoBarras: "",
  productoId: "",
});

export default function PrecargasStockPage() {
  const router = useRouter();
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";
  const [lista, setLista] = useState<Precarga[]>([]);
  const [proveedor, setProveedor] = useState("");
  const [destino, setDestino] = useState<Destino>("stockAccesorios");
  const [items, setItems] = useState<Linea[]>([lineaVacia()]);
  const [guardando, setGuardando] = useState(false);
  const [recibiendo, setRecibiendo] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = async () => {
    if (!negocioID) return;
    const snap = await getDocs(collection(db, `negocios/${negocioID}/precargasStock`));
    const rows = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        proveedor: String(data.proveedor || ""),
        destino: data.destino === "stockRepuestos" ? "stockRepuestos" : "stockAccesorios",
        estado: String(data.estado || "pendiente"),
        fecha: String(data.fecha || ""),
        items: Array.isArray(data.items) ? (data.items as Linea[]) : [],
      } satisfies Precarga;
    });
    rows.sort((a, b) => (a.estado === b.estado ? b.fecha.localeCompare(a.fecha) : a.estado === "pendiente" ? -1 : 1));
    setLista(rows);
  };

  useEffect(() => {
    void cargar();
  }, [negocioID]);

  const guardar = async () => {
    if (!negocioID) return;
    const limpias = items
      .map((it) => ({
        ...it,
        producto: it.producto.trim(),
        codigo: it.codigo.trim(),
        codigoBarras: it.codigoBarras.trim(),
        cantidad: Number(it.cantidad) || 0,
        precioCosto: Number(it.precioCosto) || 0,
      }))
      .filter((it) => it.producto && it.cantidad > 0);
    if (limpias.length === 0) {
      setAviso("Agregá al menos un producto con cantidad.");
      return;
    }
    setGuardando(true);
    setAviso("");
    try {
      await addDoc(collection(db, `negocios/${negocioID}/precargasStock`), {
        proveedor: proveedor.trim(),
        destino,
        estado: "pendiente",
        fecha: new Date().toLocaleDateString("es-AR"),
        items: limpias,
        creadaEn: serverTimestamp(),
      });
      setProveedor("");
      setItems([lineaVacia()]);
      setAviso("Pre carga guardada. Todavía no suma al stock.");
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
      const col = collection(db, `negocios/${negocioID}/${precarga.destino}`);
      for (const item of precarga.items) {
        const cantidad = Number(item.cantidad) || 0;
        if (cantidad <= 0) continue;
        let existenteId = String(item.productoId || "");
        if (existenteId) {
          const snap = await getDoc(doc(db, `negocios/${negocioID}/${precarga.destino}/${existenteId}`));
          if (!snap.exists()) existenteId = "";
        }
        if (!existenteId && item.codigo) {
          const encontrado = await getDocs(query(col, where("codigo", "==", item.codigo), limit(1)));
          existenteId = encontrado.docs[0]?.id || "";
        }
        if (existenteId) {
          await updateDoc(doc(db, `negocios/${negocioID}/${precarga.destino}/${existenteId}`), {
            cantidad: increment(cantidad),
          });
          continue;
        }
        const tipo = precarga.destino === "stockAccesorios" ? "accesorio" : "repuesto";
        await addDoc(col, {
          producto: item.producto,
          codigo: item.codigo || "",
          codigoBarras: item.codigoBarras || "",
          proveedor: precarga.proveedor || "",
          categoria: "",
          marca: "",
          modelo: "",
          color: "",
          precioCosto: Number(item.precioCosto) || 0,
          precio1: Number(item.precioCosto) || 0,
          precio2: 0,
          precio3: 0,
          moneda: item.moneda === "USD" ? "USD" : "ARS",
          cantidad,
          stockIdeal: 5,
          stockBajo: 3,
          tipo,
          consignacion: false,
        });
      }
      await updateDoc(doc(db, `negocios/${negocioID}/precargasStock/${precarga.id}`), {
        estado: "recibida",
        recibidaEn: serverTimestamp(),
      });
      setAviso("El pedido entró al stock.");
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
        <div className="w-full px-4 max-w-[900px] mx-auto space-y-4 py-4">
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
              El pedido queda anotado. Cuando marcás que llegó, entra al stock de accesorios o de repuestos.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#ecf0f1] p-4 space-y-3 shadow">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-[#2c3e50]">
                Proveedor
                <input
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  className="mt-1 w-full rounded-lg border-2 border-[#bdc3c7] p-2 font-normal"
                />
              </label>
              <label className="text-sm font-semibold text-[#2c3e50]">
                Va a
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value as Destino)}
                  className="mt-1 w-full rounded-lg border-2 border-[#bdc3c7] p-2 font-normal bg-white"
                >
                  <option value="stockAccesorios">Stock accesorios</option>
                  <option value="stockRepuestos">Stock repuestos</option>
                </select>
              </label>
            </div>

            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-[#ecf0f1] p-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={item.producto}
                    onChange={(e) =>
                      setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, producto: e.target.value } : row)))
                    }
                    placeholder="Producto"
                    className="rounded-lg border-2 border-[#bdc3c7] p-2"
                  />
                  <input
                    value={item.codigo}
                    onChange={(e) =>
                      setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, codigo: e.target.value, productoId: "" } : row)))
                    }
                    placeholder="Código, si ya existe en el stock"
                    className="rounded-lg border-2 border-[#bdc3c7] p-2"
                  />
                </div>
                <CampoCodigoBarras
                  value={item.codigoBarras}
                  onChange={(codigoBarras) =>
                    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, codigoBarras } : row)))
                  }
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) =>
                      setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, cantidad: Number(e.target.value) } : row)))
                    }
                    className="rounded-lg border-2 border-[#bdc3c7] p-2"
                    placeholder="Cantidad"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.precioCosto}
                    onChange={(e) =>
                      setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, precioCosto: Number(e.target.value) } : row)))
                    }
                    className="rounded-lg border-2 border-[#bdc3c7] p-2"
                    placeholder="Costo"
                  />
                  <select
                    value={item.moneda}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, idx) => (idx === i ? { ...row, moneda: e.target.value === "USD" ? "USD" : "ARS" } : row))
                      )
                    }
                    className="rounded-lg border-2 border-[#bdc3c7] p-2 bg-white"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, lineaVacia()])}
                className="rounded-lg bg-[#ecf0f1] px-3 py-2 text-sm font-bold text-[#2c3e50]"
              >
                Otra línea
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={() => void guardar()}
                className="rounded-lg bg-[#16a085] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar pre carga"}
              </button>
            </div>
            {aviso ? <p className="text-sm text-[#2c3e50]">{aviso}</p> : null}
          </div>

          <div className="space-y-3">
            {lista.length === 0 ? (
              <p className="text-sm text-[#7f8c8d]">No hay pre cargas.</p>
            ) : (
              lista.map((p) => (
                <article key={p.id} className="bg-white rounded-2xl border border-[#ecf0f1] p-4 shadow">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#2c3e50]">
                      {p.proveedor || "Sin proveedor"} · {p.fecha}
                    </p>
                    <span className="text-xs font-bold rounded-full bg-[#ecf0f1] px-2 py-1">
                      {p.destino === "stockRepuestos" ? "Repuestos" : "Accesorios"}
                    </span>
                    <span className={`text-xs font-bold rounded-full px-2 py-1 ${p.estado === "recibida" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {p.estado === "recibida" ? "En stock" : "Pendiente"}
                    </span>
                  </div>
                  <ul className="mt-2 text-sm text-[#34495e] space-y-1">
                    {p.items.map((it, idx) => (
                      <li key={idx}>
                        {it.cantidad} × {it.producto}
                        {it.codigo ? ` · ${it.codigo}` : ""}
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
                          void deleteDoc(doc(db, `negocios/${negocioID}/precargasStock/${p.id}`)).then(cargar)
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
