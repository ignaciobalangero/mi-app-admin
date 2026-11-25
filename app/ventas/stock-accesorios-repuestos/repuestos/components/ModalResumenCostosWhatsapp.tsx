"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fusionarValoresUnicos } from "@/lib/categoriaRepuesto";
import { normalizarMoneda } from "@/lib/monedaRepuesto";
import {
  armarResumenCosto,
  archivoResumenCostoPdf,
  type ItemResumenCosto,
} from "@/lib/repuestos/resumenCostosImagen";

interface Props {
  abierto: boolean;
  negocioID: string;
  onCerrar: () => void;
}

export default function ModalResumenCostosWhatsapp({ abierto, negocioID, onCerrar }: Props) {
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [items, setItems] = useState<ItemResumenCosto[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [elegidas, setElegidas] = useState<string[]>([]);

  useEffect(() => {
    if (!abierto || !negocioID) return;
    let cancelado = false;
    setCargando(true);
    void (async () => {
      try {
        const snap = await getDocs(collection(db, `negocios/${negocioID}/stockRepuestos`));
        const lista: ItemResumenCosto[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            marca: String(data.marca ?? "").trim(),
            modelo: String(data.producto ?? "").trim() || "Sin nombre",
            cantidad: Number(data.cantidad) || 0,
            moneda: normalizarMoneda(data.moneda),
            costo: Number(data.precioCosto) || 0,
          };
        });
        if (cancelado) return;
        const nombres = fusionarValoresUnicos(lista.map((p) => p.marca));
        if (lista.some((p) => p.cantidad > 0 && !p.marca.trim())) nombres.push("Sin marca");
        setItems(lista);
        setMarcas(nombres);
        setElegidas(nombres);
      } catch (e) {
        console.error(e);
        if (!cancelado) alert("No se pudo cargar el stock.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [abierto, negocioID]);

  const resumen = useMemo(() => {
    const todas = elegidas.length === marcas.length;
    const filtrados = items.filter((item) => {
      if (!(item.cantidad > 0)) return false;
      if (todas) return true;
      const marca = item.marca.trim() || "Sin marca";
      return elegidas.includes(marca);
    });
    return armarResumenCosto(filtrados);
  }, [items, elegidas, marcas.length]);

  const alternar = (marca: string) => {
    setElegidas((prev) =>
      prev.includes(marca) ? prev.filter((item) => item !== marca) : [...prev, marca]
    );
  };

  const armarPdf = () => {
    const fecha = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
    return archivoResumenCostoPdf(resumen, fecha);
  };

  const descargar = () => {
    if (resumen.modelos === 0) {
      alert("No hay modelos con stock en las marcas elegidas.");
      return;
    }
    const file = armarPdf();
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const enviar = async () => {
    if (resumen.modelos === 0) {
      alert("No hay modelos con stock en las marcas elegidas.");
      return;
    }
    setEnviando(true);
    try {
      const file = armarPdf();
      const mensaje = "Te mando el stock de repuestos con costos. Adjuntá el PDF en este chat.";
      const shareData: ShareData = { files: [file], title: "Stock de repuestos" };
      const puede =
        typeof navigator.canShare === "function" &&
        typeof navigator.share === "function" &&
        navigator.canShare({ files: [file] });
      if (puede) {
        await navigator.share(shareData);
        onCerrar();
        return;
      }

      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
      onCerrar();
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error(e);
      alert("No se pudo armar el PDF.");
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#ecf0f1] px-4 py-3">
          <div>
            <h3 className="font-bold text-[#2c3e50]">PDF · costos</h3>
            <p className="text-xs text-[#7f8c8d]">Modelos, cantidad y costo, en varias páginas si hace falta</p>
          </div>
          <button type="button" onClick={onCerrar} className="text-sm font-semibold text-[#7f8c8d]">
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {cargando ? (
            <p className="py-8 text-center text-sm text-[#7f8c8d]">Cargando stock…</p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#2c3e50]">Marcas</span>
                <span className="flex gap-3">
                  <button type="button" onClick={() => setElegidas(marcas)} className="text-xs font-semibold text-[#128C7E]">
                    Todas
                  </button>
                  <button type="button" onClick={() => setElegidas([])} className="text-xs font-semibold text-[#7f8c8d]">
                    Ninguna
                  </button>
                </span>
              </div>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#ecf0f1] p-2">
                {marcas.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[#7f8c8d]">No hay marcas con stock.</p>
                ) : (
                  marcas.map((marca) => (
                    <label key={marca} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f8f9fa]">
                      <input
                        type="checkbox"
                        checked={elegidas.includes(marca)}
                        onChange={() => alternar(marca)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{marca}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="mt-3 text-sm text-[#2c3e50]">
                <strong>{resumen.modelos}</strong> modelos · <strong>{resumen.unidades}</strong> unidades
              </p>
            </>
          )}
        </div>

        <div className="border-t border-[#ecf0f1] p-4">
          <button
            type="button"
            onClick={descargar}
            disabled={cargando || enviando || resumen.modelos === 0}
            className="mb-2 w-full rounded-xl border-2 border-[#0e6655] bg-[#e8f8f5] py-3 text-sm font-bold text-[#0e6655] hover:bg-[#d5f5e3] disabled:opacity-50"
          >
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={() => void enviar()}
            disabled={cargando || enviando || resumen.modelos === 0}
            className="w-full rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white shadow hover:bg-[#1ebe5d] disabled:opacity-50"
          >
            {enviando ? "Armando PDF…" : "Enviar PDF por WhatsApp"}
          </button>
          <p className="mt-2 text-center text-[11px] text-[#7f8c8d]">
            El PDF no pierde calidad por más modelos que haya. En el celular se comparte el archivo; en la compu se descarga para adjuntarlo.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
