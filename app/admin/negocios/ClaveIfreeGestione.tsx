"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export default function ClaveIfreeGestione() {
  const [clave, setClave] = useState("");
  const [hayClave, setHayClave] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const llamar = async (body: Record<string, string>) => {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error("Sesión expirada. Volvé a iniciar sesión.");
    const res = await fetch("/api/ifree/clave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(data.error || "No se pudo usar iFree."));
    return data as { hayClave?: boolean; saldo?: number };
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => {
      if (!user) return;
      llamar({ accion: "estado" })
        .then((data) => setHayClave(Boolean(data.hayClave)))
        .catch(() => setHayClave(false));
    });
    return () => unsub();
  }, []);

  const guardar = async () => {
    setOcupado(true);
    setMensaje("");
    try {
      await llamar({ accion: "guardar", apiKey: clave.trim() });
      setHayClave(true);
      setClave("");
      setMensaje("Clave guardada. Con eso se consultan los IMEI de los negocios que habilites.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setOcupado(false);
    }
  };

  const verSaldo = async () => {
    setOcupado(true);
    setMensaje("");
    try {
      const data = await llamar({ accion: "saldo" });
      const saldo = Number(data.saldo);
      setMensaje(
        `Saldo iFree: USD ${saldo.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo leer el saldo.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] p-4">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-[#2c3e50]">Clave iFree de Gestione</p>
          <p className="text-xs text-[#7f8c8d] mt-1 mb-2">
            Es la PHP API Key de tu cuenta. No la ve el cliente. Cada consulta sale de este saldo.
            {hayClave ? " Ya hay una clave guardada." : ""}
          </p>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder={hayClave ? "Pegá otra solo si la querés cambiar" : "PHP API Key"}
            autoComplete="off"
            className="w-full max-w-md px-3 py-2 border border-[#bdc3c7] rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={ocupado || clave.trim().length < 8}
            className="px-4 py-2 rounded-lg bg-[#2c3e50] text-white text-sm font-semibold disabled:opacity-40"
          >
            Guardar clave
          </button>
          <button
            type="button"
            onClick={verSaldo}
            disabled={ocupado || !hayClave}
            className="px-4 py-2 rounded-lg bg-[#ecf0f1] text-[#2c3e50] text-sm font-semibold disabled:opacity-40"
          >
            Ver saldo
          </button>
        </div>
      </div>
      {mensaje ? <p className="text-sm text-[#2c3e50] mt-3">{mensaje}</p> : null}
    </div>
  );
}
