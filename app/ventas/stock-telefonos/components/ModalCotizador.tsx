"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  digitosWhatsapp,
  monedaDe,
  normalizarModelos,
  type MonedaCotizacion,
} from "@/lib/cotizador/telefonos";

type Fila = { id: string; modelo: string; precio: string; moneda: MonedaCotizacion };

function filaVacia(): Fila {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, modelo: "", precio: "", moneda: "USD" };
}

export default function ModalCotizador({
  negocioID,
  onClose,
}: {
  negocioID: string;
  onClose: () => void;
}) {
  const [filas, setFilas] = useState<Fila[]>([filaVacia()]);
  const [whatsapp, setWhatsapp] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/cotizadorTelefonos`));
        if (cancel || !snap.exists()) return;
        const data = snap.data();
        const modelos = normalizarModelos(data.modelos);
        setWhatsapp(digitosWhatsapp(data.whatsapp));
        setFilas(
          modelos.length
            ? modelos.map((m) => ({
                id: m.id,
                modelo: m.modelo,
                precio: String(m.precio),
                moneda: m.moneda,
              }))
            : [filaVacia()]
        );
      } catch (error) {
        console.error(error);
        if (!cancel) setAviso("No se pudo cargar el cotizador.");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID]);

  const guardar = async () => {
    setGuardando(true);
    setAviso("");
    try {
      const modelos = normalizarModelos(
        filas.map((f) => ({
          id: f.id,
          modelo: f.modelo,
          precio: Number(String(f.precio).replace(",", ".")) || 0,
          moneda: f.moneda,
        }))
      );
      await setDoc(
        doc(db, `negocios/${negocioID}/configuracion/cotizadorTelefonos`),
        { whatsapp: digitosWhatsapp(whatsapp), modelos },
        { merge: true }
      );
      setAviso("Lista guardada. Ya se ve en el link de la lista.");
    } catch (error) {
      console.error(error);
      setAviso("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#2c3e50]">Cotizador</h2>
            <p className="text-sm text-[#7f8c8d] mt-1">
              Modelos y precios de toma. En el link de la lista, el cliente elige un equipo, cotiza el suyo y te escribe por WhatsApp con el saldo.
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full bg-gray-100 font-bold text-lg" aria-label="Cerrar">
            ×
          </button>
        </div>

        <label className="block text-sm font-medium text-[#2c3e50]">
          WhatsApp del negocio
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="5493510000000"
            className="mt-1 w-full px-3 py-2 border rounded-xl"
          />
          <span className="block text-xs text-[#95a5a6] mt-1">Con código de país, sin espacios.</span>
        </label>

        {cargando ? <p className="text-sm text-[#7f8c8d]">Cargando…</p> : null}

        <div className="space-y-2">
          {filas.map((fila) => (
            <div key={fila.id} className="grid grid-cols-1 sm:grid-cols-[1fr_120px_90px_auto] gap-2">
              <input
                value={fila.modelo}
                onChange={(e) =>
                  setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, modelo: e.target.value } : f)))
                }
                placeholder="Modelo, ej. iPhone 11 128GB"
                className="px-3 py-2 border rounded-xl"
              />
              <input
                value={fila.precio}
                onChange={(e) =>
                  setFilas((prev) => prev.map((f) => (f.id === fila.id ? { ...f, precio: e.target.value } : f)))
                }
                inputMode="decimal"
                placeholder="Precio"
                className="px-3 py-2 border rounded-xl"
              />
              <select
                value={fila.moneda}
                onChange={(e) =>
                  setFilas((prev) =>
                    prev.map((f) => (f.id === fila.id ? { ...f, moneda: monedaDe(e.target.value) } : f))
                  )
                }
                className="px-3 py-2 border rounded-xl bg-white"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
              </select>
              <button
                type="button"
                onClick={() => setFilas((prev) => (prev.length === 1 ? [filaVacia()] : prev.filter((f) => f.id !== fila.id)))}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-semibold"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setFilas((prev) => [...prev, filaVacia()])}
          className="px-3 py-2 rounded-xl border border-[#d5d8dc] text-sm font-semibold"
        >
          Agregar modelo
        </button>

        {aviso ? <p className="text-sm text-[#2c3e50]">{aviso}</p> : null}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-xl bg-gray-200 font-semibold">
            Cerrar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || cargando}
            className="flex-1 py-2 rounded-xl bg-[#8e44ad] text-white font-bold disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar lista"}
          </button>
        </div>
      </div>
    </div>
  );
}
