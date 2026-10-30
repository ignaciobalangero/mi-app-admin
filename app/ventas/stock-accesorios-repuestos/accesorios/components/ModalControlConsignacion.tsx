"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { vendidosConsignacion, type LineaVentaAccesorio } from "@/lib/accesorios/consignacion";

type Accesorio = {
  id: string;
  codigo: string;
  nombre: string;
  proveedor: string;
  cantidad: number;
  precioCosto: number;
  moneda: "ARS" | "USD";
};

type Fila = Accesorio & { vendido: number; aPagar: number };

function diaISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function texto(moneda: "ARS" | "USD", monto: number): string {
  const n = Math.abs(monto).toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return moneda === "USD" ? `USD $${n}` : `$${n}`;
}

export default function ModalControlConsignacion({
  negocioID,
  onClose,
}: {
  negocioID: string;
  onClose: () => void;
}) {
  const hoy = diaISO(new Date());
  const haceUnMes = diaISO(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [desde, setDesde] = useState(haceUnMes);
  const [hasta, setHasta] = useState(hoy);
  const [ultimo, setUltimo] = useState("");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [conteo, setConteo] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [aviso, setAviso] = useState("");

  const cargar = async (desdeISO: string, hastaISO: string) => {
    setCargando(true);
    setAviso("");
    try {
      const inicio = new Date(`${desdeISO}T00:00:00`);
      const fin = new Date(`${hastaISO}T23:59:59`);
      const [stockSnap, ventasSnap] = await Promise.all([
        getDocs(query(collection(db, `negocios/${negocioID}/stockAccesorios`), where("consignacion", "==", true))),
        getDocs(
          query(
            collection(db, `negocios/${negocioID}/ventasGeneral`),
            where("timestamp", ">=", Timestamp.fromDate(inicio)),
            orderBy("timestamp", "asc"),
            limit(2000)
          )
        ),
      ]);
      const accesorios: Accesorio[] = stockSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          codigo: String(data.codigo || ""),
          nombre: String(data.producto || data.modelo || "Accesorio"),
          proveedor: String(data.proveedor || "").trim() || "Sin proveedor",
          cantidad: Math.max(0, Number(data.cantidad) || 0),
          precioCosto: Math.max(0, Number(data.precioCosto) || 0),
          moneda: String(data.moneda || "ARS").toUpperCase() === "USD" ? "USD" : "ARS",
        };
      });
      const ventas = ventasSnap.docs
        .map((d) => {
          const data = d.data();
          const ts = data.timestamp?.toMillis?.() || 0;
          if (ts && ts > fin.getTime()) return null;
          return { productos: (data.productos || []) as LineaVentaAccesorio[] };
        })
        .filter((v): v is { productos: LineaVentaAccesorio[] } => v !== null);
      const vendidos = vendidosConsignacion(accesorios, ventas);
      setFilas(
        accesorios
          .map((a) => {
            const vendido = vendidos.get(a.id) || 0;
            return { ...a, vendido, aPagar: Math.round(vendido * a.precioCosto * 100) / 100 };
          })
          .sort((a, b) => a.proveedor.localeCompare(b.proveedor, "es") || a.nombre.localeCompare(b.nombre, "es"))
      );
      if (ventasSnap.size === 2000) {
        setAviso("Hay muchas ventas en el período. Achicalo para no perder ninguna.");
      }
    } catch (error) {
      console.error(error);
      setAviso("No se pudo armar el control.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/controlConsignacionAccesorios`));
        const millis = Number(snap.data()?.ultimoHasta || 0);
        if (!cancel && millis > 0) {
          const iso = diaISO(new Date(millis + 1000));
          setUltimo(new Date(millis).toLocaleString("es-AR"));
          setDesde(iso);
          await cargar(iso, hoy);
          return;
        }
      } catch (error) {
        console.error(error);
      }
      if (!cancel) await cargar(haceUnMes, hoy);
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID]);

  const grupos = useMemo(() => {
    const map = new Map<string, Fila[]>();
    for (const fila of filas) {
      const lista = map.get(fila.proveedor) || [];
      lista.push(fila);
      map.set(fila.proveedor, lista);
    }
    return [...map.entries()];
  }, [filas]);

  const totales = useMemo(() => {
    return filas.reduce(
      (acc, f) => {
        if (f.moneda === "USD") acc.usd += f.aPagar;
        else acc.ars += f.aPagar;
        acc.unidades += f.vendido;
        return acc;
      },
      { ars: 0, usd: 0, unidades: 0 }
    );
  }, [filas]);

  const cerrarControl = async () => {
    if (!window.confirm("¿Cerrar este control? El próximo arranca después de esta fecha, para no pagar dos veces lo mismo.")) return;
    setCerrando(true);
    setAviso("");
    try {
      const fin = new Date(`${hasta}T23:59:59`).getTime();
      await addDoc(collection(db, `negocios/${negocioID}/controlesConsignacionAccesorios`), {
        desde,
        hasta,
        creadoEn: Date.now(),
        unidades: totales.unidades,
        totalARS: Math.round(totales.ars * 100) / 100,
        totalUSD: Math.round(totales.usd * 100) / 100,
        lineas: filas
          .filter((f) => f.vendido > 0)
          .map((f) => ({
            id: f.id,
            codigo: f.codigo,
            nombre: f.nombre,
            proveedor: f.proveedor,
            vendido: f.vendido,
            costo: f.precioCosto,
            moneda: f.moneda,
            aPagar: f.aPagar,
            stockSistema: f.cantidad,
            ...(conteo[f.id] !== undefined && conteo[f.id] !== "" ? { conteo: Number(conteo[f.id]) || 0 } : {}),
          })),
      });
      await setDoc(
        doc(db, `negocios/${negocioID}/configuracion/controlConsignacionAccesorios`),
        { ultimoHasta: fin },
        { merge: true }
      );
      setUltimo(new Date(fin).toLocaleString("es-AR"));
      setAviso("Control cerrado. Lo vendido de este período no vuelve a sumarse.");
    } catch (error) {
      console.error(error);
      setAviso("No se pudo cerrar el control.");
    } finally {
      setCerrando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-3xl sm:rounded-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#2c3e50]">Control de consignación</h2>
            <p className="mt-1 text-sm text-[#7f8c8d]">
              Lo que se vendió de accesorios en consignación, para pagar al proveedor. No mueve la cuenta del proveedor.
            </p>
            {ultimo ? <p className="mt-1 text-xs text-[#95a5a6]">Último control: {ultimo}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 text-lg font-bold" aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium">
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 block rounded-xl border px-3 py-2" />
          </label>
          <label className="text-sm font-medium">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 block rounded-xl border px-3 py-2" />
          </label>
          <button
            type="button"
            onClick={() => void cargar(desde, hasta)}
            disabled={cargando}
            className="rounded-xl bg-[#2c3e50] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {cargando ? "Revisando…" : "Revisar"}
          </button>
        </div>

        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
          <p>A pagar: <strong>{texto("ARS", totales.ars)}</strong> · <strong>{texto("USD", totales.usd)}</strong></p>
          <p className="text-[#7f8c8d]">Unidades vendidas: {totales.unidades}</p>
        </div>

        {aviso ? <p className="mt-2 text-sm text-[#2c3e50]">{aviso}</p> : null}
        {!cargando && filas.length === 0 ? (
          <p className="mt-4 text-sm text-[#7f8c8d]">No hay accesorios marcados como consignación.</p>
        ) : null}

        <div className="mt-4 space-y-4">
          {grupos.map(([proveedor, items]) => {
            const ars = items.filter((i) => i.moneda === "ARS").reduce((s, i) => s + i.aPagar, 0);
            const usd = items.filter((i) => i.moneda === "USD").reduce((s, i) => s + i.aPagar, 0);
            return (
              <section key={proveedor}>
                <h3 className="font-bold text-[#2c3e50]">
                  {proveedor}{" "}
                  <span className="text-sm font-semibold text-amber-800">
                    {texto("ARS", ars)} · {texto("USD", usd)}
                  </span>
                </h3>
                <div className="mt-2 space-y-2">
                  {items.map((item) => {
                    const contado = conteo[item.id];
                    const diferencia = contado === undefined || contado === "" ? null : item.cantidad - (Number(contado) || 0);
                    return (
                      <div key={item.id} className="rounded-xl border border-[#ecf0f1] p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{item.nombre}</p>
                            <p className="text-xs text-[#7f8c8d]">
                              {item.codigo ? `${item.codigo} · ` : ""}
                              costo {texto(item.moneda, item.precioCosto)} · en sistema {item.cantidad}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{item.vendido} vendidos</p>
                            <p className="text-amber-800">{texto(item.moneda, item.aPagar)}</p>
                          </div>
                        </div>
                        <label className="mt-2 flex items-center gap-2 text-xs">
                          Conté
                          <input
                            value={conteo[item.id] ?? ""}
                            onChange={(e) => setConteo((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            inputMode="numeric"
                            placeholder="opcional"
                            className="w-24 rounded-lg border px-2 py-1"
                          />
                          {diferencia != null && diferencia !== 0 ? (
                            <span className="text-[#e67e22]">
                              {diferencia > 0 ? `Faltan ${diferencia} contra el sistema` : `Sobran ${Math.abs(diferencia)} contra el sistema`}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-200 py-2 font-semibold">
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => void cerrarControl()}
            disabled={cerrando || cargando || filas.length === 0}
            className="flex-1 rounded-xl bg-amber-600 py-2 font-bold text-white disabled:opacity-60"
          >
            {cerrando ? "Guardando…" : "Cerrar control"}
          </button>
        </div>
      </div>
    </div>
  );
}
