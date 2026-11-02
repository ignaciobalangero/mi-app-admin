"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import useCotizacion from "@/lib/hooks/useCotizacion";

type RepuestoStock = {
  id: string;
  fuente: "stockRepuestos" | "stockExtra";
  producto: string;
  categoria?: string;
  modelo?: string;
  marca?: string;
  color?: string;
  cantidad: number;
  precioCosto: number;
  moneda?: string;
  [key: string]: unknown;
};

type RepuestoUsado = {
  id: string;
  fuente?: string;
  producto?: string;
  modelo?: string;
  costoARS?: number;
  timestamp: number;
  precioCosto?: number;
  moneda?: string;
};

function costoARS(repuesto: { precioCosto?: number; fuente?: string; moneda?: string }, cotizacion: number) {
  const costo = Number(repuesto?.precioCosto ?? 0);
  if (costo <= 0) return 0;
  if (repuesto.fuente === "stockExtra" || !("moneda" in repuesto)) {
    if (!cotizacion || cotizacion <= 0) return 0;
    return Number((costo * cotizacion).toFixed(2));
  }
  if (repuesto.moneda === "USD") {
    if (!cotizacion || cotizacion <= 0) return 0;
    return Number((costo * cotizacion).toFixed(2));
  }
  return costo;
}

function pesos(valor: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

function costoDeGuardado(r: RepuestoUsado, cotizacion: number) {
  if (r.costoARS != null && Number.isFinite(Number(r.costoARS))) return Number(r.costoARS);
  return costoARS(r, cotizacion);
}

async function sincronizarStockExtra(negocioID: string, cotizacion: number) {
  const sheetConfigSnap = await getDocs(
    collection(db, `negocios/${negocioID}/configuracion/datos/googleSheets`)
  );
  if (sheetConfigSnap.empty) return;

  const configPorHoja: Record<string, { sheetID: string; hoja: string }> = {};
  sheetConfigSnap.docs.forEach((d) => {
    const config = d.data();
    const nombreHoja = String(config.hoja || "");
    if (!nombreHoja) return;
    configPorHoja[nombreHoja.toLowerCase()] = {
      sheetID: String(config.id || ""),
      hoja: nombreHoja,
    };
  });

  const snap = await getDocs(collection(db, `negocios/${negocioID}/stockExtra`));
  const productosPorHoja: Record<string, Record<string, unknown>[]> = {};
  snap.docs.forEach((d) => {
    const p = d.data();
    const categoria = String(p.categoria || "");
    if (!categoria) return;
    const clave = categoria.toLowerCase();
    if (!productosPorHoja[clave]) productosPorHoja[clave] = [];
    const precioUSD = Number(p.precioUSD) || 0;
    productosPorHoja[clave].push({
      codigo: d.id,
      categoria,
      producto: p.producto || "",
      cantidad: Number(p.cantidad) || 0,
      precioARS: Number((precioUSD * cotizacion).toFixed(2)),
      precioUSD,
    });
  });

  for (const [nombreHoja, filas] of Object.entries(productosPorHoja)) {
    const config = configPorHoja[nombreHoja];
    if (!config?.sheetID) continue;
    const res = await fetch("/api/actualizar-precios-sheet", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sheetID: config.sheetID, hoja: config.hoja, filas }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || "No se pudo actualizar la hoja");
    }
  }
}

export default function PanelRepuestosTaller({
  negocioID,
  trabajoId,
}: {
  negocioID: string;
  trabajoId: string;
}) {
  const { cotizacion } = useCotizacion(negocioID);
  const cotiz = Number(cotizacion) || 0;
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [stock, setStock] = useState<RepuestoStock[]>([]);
  const [usados, setUsados] = useState<RepuestoUsado[]>([]);
  const [cargandoStock, setCargandoStock] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, `negocios/${negocioID}/trabajos/${trabajoId}`));
        if (cancel || !snap.exists()) return;
        const lista = (snap.data().repuestosUsados || []) as RepuestoUsado[];
        setUsados(
          lista.map((r) => ({
            ...r,
            timestamp: Number(r.timestamp) || Date.now(),
          }))
        );
      } catch (e) {
        console.warn("No se pudieron leer los repuestos de la orden:", e);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID, trabajoId]);

  const cargarStock = async () => {
    if (stock.length > 0 || cargandoStock) return;
    setCargandoStock(true);
    try {
      const [snapRep, snapExtra] = await Promise.all([
        getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
        getDocs(collection(db, `negocios/${negocioID}/stockExtra`)),
      ]);
      const locales = snapRep.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        fuente: "stockRepuestos" as const,
      }));
      const extras = snapExtra.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        fuente: "stockExtra" as const,
      }));
      setStock([...locales, ...extras] as RepuestoStock[]);
    } catch (e) {
      console.error(e);
      setAviso("No se pudo cargar el stock");
    } finally {
      setCargandoStock(false);
    }
  };

  const resultados = useMemo(() => {
    const palabras = busqueda.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return [];
    return stock
      .filter((r) => {
        const texto = `${r.categoria || ""} ${r.producto || ""} ${r.modelo || ""} ${r.marca || ""} ${r.color || ""}`.toLowerCase();
        return palabras.every((p) => texto.includes(p));
      })
      .slice(0, 12);
  }, [busqueda, stock]);

  const agregar = async (repuesto: RepuestoStock) => {
    if (ocupado) return;
    if (Number(repuesto.cantidad) <= 0) {
      setAviso("Ese repuesto no tiene stock");
      return;
    }
    const costo = costoARS(repuesto, cotiz);
    if (costo <= 0) {
      setAviso("Ese repuesto no tiene un costo válido");
      return;
    }

    setOcupado(repuesto.id);
    setAviso("");
    try {
      const nuevo: RepuestoUsado = {
        ...repuesto,
        costoARS: costo,
        precioCostoOriginal: repuesto.precioCosto,
        monedaCosto: repuesto.moneda ?? "USD",
        timestamp: Date.now() + Math.random(),
      } as RepuestoUsado;

      const guardados = await runTransaction(db, async (tx) => {
        const stockRef = doc(db, `negocios/${negocioID}/${repuesto.fuente}/${repuesto.id}`);
        const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajoId}`);
        const stockSnap = await tx.get(stockRef);
        const trabajoSnap = await tx.get(trabajoRef);
        const cant = Number(stockSnap.data()?.cantidad ?? 0);
        if (cant <= 0) throw new Error("Sin stock");
        const previos = (trabajoSnap.data()?.repuestosUsados || []) as RepuestoUsado[];
        const todos = [...previos, nuevo];
        const costoTotal = todos.reduce((sum, r) => sum + costoDeGuardado(r, cotiz), 0);
        tx.update(stockRef, { cantidad: cant - 1 });
        tx.update(trabajoRef, {
          repuestosUsados: todos,
          costo: Number(costoTotal.toFixed(2)),
        });
        return todos;
      });

      setUsados(guardados);
      setStock((prev) =>
        prev.map((r) =>
          r.id === repuesto.id && r.fuente === repuesto.fuente
            ? { ...r, cantidad: Math.max(0, Number(r.cantidad) - 1) }
            : r
        )
      );
      if (repuesto.fuente === "stockExtra") {
        try {
          await sincronizarStockExtra(negocioID, cotiz);
        } catch (sheetErr) {
          console.warn(sheetErr);
          setAviso("Repuesto agregado. La hoja no se pudo actualizar.");
          setBusqueda("");
          return;
        }
      }
      setAviso(`${repuesto.producto || "Repuesto"} agregado`);
      setBusqueda("");
    } catch (e) {
      console.error(e);
      setAviso(e instanceof Error ? e.message : "No se pudo agregar el repuesto");
    } finally {
      setOcupado("");
    }
  };

  const quitar = async (repuesto: RepuestoUsado) => {
    if (ocupado) return;
    setOcupado(String(repuesto.timestamp));
    setAviso("");
    try {
      const fuente = repuesto.fuente === "stockExtra" ? "stockExtra" : "stockRepuestos";
      const guardados = await runTransaction(db, async (tx) => {
        const stockRef = doc(db, `negocios/${negocioID}/${fuente}/${repuesto.id}`);
        const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajoId}`);
        const stockSnap = await tx.get(stockRef);
        const trabajoSnap = await tx.get(trabajoRef);
        const previos = (trabajoSnap.data()?.repuestosUsados || []) as RepuestoUsado[];
        const todos = previos.filter((r) => Number(r.timestamp) !== Number(repuesto.timestamp));
        const costoTotal = todos.reduce((sum, r) => sum + costoDeGuardado(r, cotiz), 0);
        const cant = Number(stockSnap.data()?.cantidad ?? 0);
        if (stockSnap.exists()) tx.update(stockRef, { cantidad: cant + 1 });
        tx.update(trabajoRef, {
          repuestosUsados: todos,
          costo: Number(Math.max(0, costoTotal).toFixed(2)),
        });
        return todos;
      });
      setUsados(guardados);
      setStock((prev) =>
        prev.map((r) =>
          r.id === repuesto.id && r.fuente === fuente
            ? { ...r, cantidad: Number(r.cantidad) + 1 }
            : r
        )
      );
      if (fuente === "stockExtra") {
        try {
          await sincronizarStockExtra(negocioID, cotiz);
        } catch (sheetErr) {
          console.warn(sheetErr);
          setAviso("Repuesto quitado. La hoja no se pudo actualizar.");
          return;
        }
      }
      setAviso("Repuesto quitado y devuelto al stock");
    } catch (e) {
      console.error(e);
      setAviso(e instanceof Error ? e.message : "No se pudo quitar el repuesto");
    } finally {
      setOcupado("");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#2c3e50]">Repuestos</p>
        <button
          type="button"
          onClick={() => {
            setAbierto((v) => !v);
            void cargarStock();
          }}
          className="rounded-xl bg-[#8e44ad] text-white text-sm font-bold px-3 py-2"
        >
          {abierto ? "Cerrar" : "Agregar"}
        </button>
      </div>

      {usados.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {usados.map((r) => (
            <li
              key={r.timestamp}
              className="flex items-center justify-between gap-2 rounded-xl bg-[#f8f9fa] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2c3e50] truncate">
                  {r.producto || "Repuesto"}
                </p>
                <p className="text-xs text-[#7f8c8d]">
                  {r.modelo ? `${r.modelo} · ` : ""}
                  {pesos(costoDeGuardado(r, cotiz))}
                </p>
              </div>
              <button
                type="button"
                disabled={!!ocupado}
                onClick={() => quitar(r)}
                className="text-xs font-bold text-[#e74c3c] shrink-0"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#95a5a6] mt-2">Todavía no hay repuestos en esta orden.</p>
      )}

      {abierto ? (
        <div className="mt-4">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar tapa, batería, modelo..."
            className="w-full rounded-xl border-2 border-[#bdc3c7] px-3 py-3 text-[#2c3e50]"
          />
          {cargandoStock ? (
            <p className="text-sm text-[#7f8c8d] mt-3">Cargando stock…</p>
          ) : null}
          <ul className="mt-3 space-y-2">
            {resultados.map((r) => {
              const costo = costoARS(r, cotiz);
              const sinStock = Number(r.cantidad) <= 0 || costo <= 0;
              return (
                <li
                  key={`${r.fuente}-${r.id}`}
                  className="rounded-xl border border-[#ecf0f1] px-3 py-2"
                >
                  <p className="text-sm font-semibold text-[#2c3e50]">
                    {r.producto || "Sin nombre"}
                  </p>
                  <p className="text-xs text-[#7f8c8d]">
                    {[r.modelo, r.color, r.fuente === "stockExtra" ? "Hoja" : "Stock"]
                      .filter(Boolean)
                      .join(" · ")}
                    {" · "}
                    {Number(r.cantidad) || 0} u.
                    {costo > 0 ? ` · ${pesos(costo)}` : " · sin costo"}
                  </p>
                  <button
                    type="button"
                    disabled={sinStock || !!ocupado}
                    onClick={() => agregar(r)}
                    className="mt-2 rounded-lg bg-[#3498db] text-white text-sm font-bold px-3 py-2 disabled:bg-[#bdc3c7]"
                  >
                    {ocupado === r.id ? "Guardando…" : "Sumar a la orden"}
                  </button>
                </li>
              );
            })}
          </ul>
          {busqueda.trim() && !cargandoStock && resultados.length === 0 ? (
            <p className="text-sm text-[#7f8c8d] mt-3">No hay coincidencias.</p>
          ) : null}
        </div>
      ) : null}

      {aviso ? <p className="text-sm text-[#2c3e50] mt-3">{aviso}</p> : null}
    </div>
  );
}
