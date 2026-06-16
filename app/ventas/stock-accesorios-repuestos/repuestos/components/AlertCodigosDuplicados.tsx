"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import { detectarCodigosDuplicadosRepuestos } from "@/lib/stockLookup";
import {
  planificarRenumeracionDuplicados,
  type CambioCodigoRepuesto,
} from "@/lib/codigoRepuestoUnico";

type Props = {
  onActualizado?: () => void;
};

export default function AlertCodigosDuplicados({ onActualizado }: Props) {
  const { rol } = useRol();
  const [duplicados, setDuplicados] = useState<
    Array<{ codigo: string; items: { id: string; producto: string; categoria: string; codigo: string }[] }>
  >([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState(false);
  const [renumerando, setRenumerando] = useState(false);
  const [progreso, setProgreso] = useState("");

  const cargar = useCallback(async () => {
    if (!rol?.negocioID) return;
    setCargando(true);
    try {
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockRepuestos`));
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          codigo: String(data.codigo ?? d.id).trim(),
          producto: String(data.producto ?? data.modelo ?? "Sin nombre").trim(),
          categoria: String(data.categoria ?? "").trim(),
          coleccion: "stockRepuestos",
        };
      });
      setDuplicados(
        detectarCodigosDuplicadosRepuestos(items).map((g) => ({
          codigo: g.codigo,
          items: g.items.map((i) => ({
            id: i.id,
            producto: i.producto,
            categoria: i.categoria,
            codigo: i.codigo,
          })),
        }))
      );
    } catch (e) {
      console.error("[AlertCodigosDuplicados]", e);
    } finally {
      setCargando(false);
    }
  }, [rol?.negocioID]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiosPlanificados = useMemo(
    () =>
      planificarRenumeracionDuplicados(
        duplicados.map((g) => ({
          codigo: g.codigo,
          items: g.items.map((i) => ({
            id: i.id,
            codigo: i.codigo,
            producto: i.producto,
          })),
        }))
      ),
    [duplicados]
  );

  const aplicarCambios = async (cambios: CambioCodigoRepuesto[]) => {
    if (!rol?.negocioID || cambios.length === 0) return;

    setRenumerando(true);
    try {
      const col = collection(db, `negocios/${rol.negocioID}/stockRepuestos`);
      const chunks: CambioCodigoRepuesto[][] = [];
      for (let i = 0; i < cambios.length; i += 400) {
        chunks.push(cambios.slice(i, i + 400));
      }

      let hechos = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const c of chunk) {
          batch.update(doc(col, c.id), { codigo: c.codigoNuevo });
        }
        await batch.commit();
        hechos += chunk.length;
        setProgreso(`${hechos} de ${cambios.length}…`);
      }

      alert(`✅ Listo: ${cambios.length} producto${cambios.length !== 1 ? "s" : ""} con código nuevo.`);
      setProgreso("");
      await cargar();
      onActualizado?.();
    } catch (e) {
      console.error("[renumerar codigos]", e);
      alert("No se pudieron actualizar todos los códigos. Intentá de nuevo.");
      setProgreso("");
    } finally {
      setRenumerando(false);
    }
  };

  const corregirTodoAutomatico = async () => {
    const cambios = cambiosPlanificados;
    if (cambios.length === 0) {
      alert("No hay códigos para corregir.");
      return;
    }

    const ok = window.confirm(
      `Se van a corregir ${cambios.length} producto${cambios.length !== 1 ? "s" : ""} automáticamente.\n\n` +
        "· El primero de cada grupo mantiene su código\n" +
        "· El resto recibe un código nuevo (ej: ABC-02, ABC-03)\n" +
        "· iPhoneTEC no se afecta (usa el ID del documento)\n\n" +
        "¿Continuar?"
    );
    if (!ok) return;

    await aplicarCambios(cambios);
  };

  if (cargando) {
    return (
      <div className="bg-[#fef9e7] border border-[#f9e79f] rounded-xl p-4 text-sm text-[#7d6608]">
        Revisando códigos duplicados en stock repuestos…
      </div>
    );
  }

  if (duplicados.length === 0) return null;

  const totalConflictos = duplicados.reduce((n, d) => n + d.items.length, 0);
  const aCorregir = cambiosPlanificados.length;

  return (
    <div className="bg-[#fdedec] border-2 border-[#e74c3c] rounded-xl p-4 sm:p-5 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#c0392b] text-base sm:text-lg">
            ⚠️ {duplicados.length} códigos repetidos — {totalConflictos} productos afectados
          </p>
          <p className="text-sm text-[#922b21] mt-1">
            {aCorregir} producto{aCorregir !== 1 ? "s" : ""} se pueden corregir solos, sin editar uno por uno.
            La tienda iPhoneTEC sigue usando el ID de cada documento.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void corregirTodoAutomatico()}
          disabled={renumerando || aCorregir === 0}
          className="shrink-0 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#27ae60] hover:bg-[#229954] text-white font-bold text-sm sm:text-base shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {renumerando
            ? `Corrigiendo… ${progreso}`
            : `🔧 Corregir los ${aCorregir} automáticamente`}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg bg-white border border-[#f5b7b1] text-[#c0392b] font-medium hover:bg-[#fadbd8]"
        >
          {expandido ? "Ocultar detalle" : "Ver qué se va a cambiar"}
        </button>
      </div>

      {expandido && (
        <ul className="mt-3 space-y-2 max-h-48 overflow-y-auto text-sm">
          {cambiosPlanificados.map((c) => (
            <li
              key={c.id}
              className="bg-white/80 rounded-lg px-2 py-1.5 border border-[#f5b7b1] text-xs text-[#566573]"
            >
              <strong className="text-[#2c3e50]">{c.producto}</strong>: {c.codigoAnterior} →{" "}
              <span className="text-[#27ae60] font-semibold">{c.codigoNuevo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
