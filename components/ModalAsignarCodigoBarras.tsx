"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type ItemAsignar = {
  id: string;
  coleccion: "stockAccesorios" | "stockRepuestos" | "stockExtra";
  tipo: "accesorio" | "repuesto" | "extra";
  codigo: string;
  producto: string;
  codigoBarras?: string;
  cantidad: number;
};

type Props = {
  abierto: boolean;
  negocioID: string;
  codigoLeido: string;
  onClose: () => void;
  onAsignado: (item: ItemAsignar) => void;
};

export default function ModalAsignarCodigoBarras({
  abierto,
  negocioID,
  codigoLeido,
  onClose,
  onAsignado,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ItemAsignar[]>([]);
  const [cargando, setCargando] = useState(false);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "accesorio" | "repuesto" | "extra">("todos");
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!abierto || !negocioID) return;
    let cancel = false;
    const cargar = async () => {
      setCargando(true);
      try {
        const [acc, rep, extra] = await Promise.all([
          getDocs(collection(db, `negocios/${negocioID}/stockAccesorios`)),
          getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`)),
          getDocs(collection(db, `negocios/${negocioID}/stockExtra`)),
        ]);
        if (cancel) return;
        const lista: ItemAsignar[] = [
          ...acc.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              coleccion: "stockAccesorios" as const,
              tipo: "accesorio" as const,
              codigo: String(data.codigo ?? d.id),
              producto: String(data.producto || data.modelo || "Accesorio"),
              codigoBarras: data.codigoBarras ? String(data.codigoBarras) : undefined,
              cantidad: Number(data.cantidad) || 0,
            };
          }),
          ...rep.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              coleccion: "stockRepuestos" as const,
              tipo: "repuesto" as const,
              codigo: String(data.codigo ?? d.id),
              producto: String(data.producto || data.modelo || "Repuesto"),
              codigoBarras: data.codigoBarras ? String(data.codigoBarras) : undefined,
              cantidad: Number(data.cantidad) || 0,
            };
          }),
          ...extra.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              coleccion: "stockExtra" as const,
              tipo: "extra" as const,
              codigo: String(data.codigo ?? d.id),
              producto: String(data.producto || data.modelo || "Stock Extra"),
              codigoBarras: data.codigoBarras ? String(data.codigoBarras) : undefined,
              cantidad: Number(data.cantidad) || 0,
            };
          }),
        ];
        lista.sort((a, b) => a.producto.localeCompare(b.producto, "es"));
        setItems(lista);
      } catch (e) {
        console.error(e);
        alert("No se pudo cargar el catálogo.");
      } finally {
        if (!cancel) setCargando(false);
      }
    };
    void cargar();
    return () => {
      cancel = true;
    };
  }, [abierto, negocioID]);

  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items
      .filter((it) => (filtro === "todos" ? true : it.tipo === filtro))
      .filter((it) => {
        if (!query) return true;
        return (
          it.producto.toLowerCase().includes(query) ||
          it.codigo.toLowerCase().includes(query) ||
          String(it.codigoBarras || "")
            .toLowerCase()
            .includes(query)
        );
      })
      .slice(0, 40);
  }, [items, q, filtro]);

  const asignar = async (item: ItemAsignar) => {
    if (!negocioID || !codigoLeido) return;
    const ok = window.confirm(
      `¿Asignar el código\n${codigoLeido}\n\na ${item.tipo} "${item.producto}" (${item.codigo})?`
    );
    if (!ok) return;
    setGuardandoId(item.id);
    try {
      await updateDoc(doc(db, `negocios/${negocioID}/${item.coleccion}/${item.id}`), {
        codigoBarras: codigoLeido.trim(),
      });
      onAsignado({ ...item, codigoBarras: codigoLeido.trim() });
    } catch (e) {
      console.error(e);
      alert("No se pudo asignar el código.");
    } finally {
      setGuardandoId(null);
    }
  };

  if (!abierto || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483001] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-[#ecf0f1] max-h-[92dvh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-[#e67e22] to-[#d35400] text-white p-4 flex justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-lg">Código no cargado</h2>
            <p className="text-sm text-white/90 mt-1 break-all">
              No hay producto con: <strong>{codigoLeido}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 font-bold flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-3 border-b border-[#ecf0f1] bg-[#f8f9fa]">
          <p className="text-sm text-[#2c3e50]">
            Asignalo a un accesorio, repuesto o stock extra existente para poder escanearlo después.
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["todos", "Todos"],
                ["accesorio", "Accesorios"],
                ["repuesto", "Repuestos"],
                ["extra", "Stock Extra"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 ${
                  filtro === id
                    ? "bg-[#3498db] border-[#3498db] text-white"
                    : "bg-white border-[#bdc3c7] text-[#2c3e50]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full p-3 border-2 border-[#bdc3c7] rounded-xl text-sm text-[#2c3e50]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {cargando ? (
            <p className="text-center text-sm text-[#7f8c8d] py-8">Cargando productos…</p>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-sm text-[#7f8c8d] py-8">Sin resultados</p>
          ) : (
            filtrados.map((it) => (
              <button
                key={`${it.coleccion}-${it.id}`}
                type="button"
                disabled={guardandoId === it.id}
                onClick={() => void asignar(it)}
                className="w-full text-left rounded-xl border-2 border-[#ecf0f1] bg-white hover:border-[#3498db] p-3 transition-colors disabled:opacity-50"
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#2c3e50] text-sm truncate">{it.producto}</p>
                    <p className="text-xs text-[#7f8c8d]">
                      {it.tipo === "accesorio"
                        ? "Accesorio"
                        : it.tipo === "extra"
                          ? "Stock Extra"
                          : "Repuesto"}{" "}
                      · {it.codigo}
                      {it.codigoBarras ? ` · ya tiene: ${it.codigoBarras}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#3498db] flex-shrink-0 self-center">
                    {guardandoId === it.id ? "…" : "Asignar"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-[#ecf0f1] bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#ecf0f1] text-[#2c3e50] font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
