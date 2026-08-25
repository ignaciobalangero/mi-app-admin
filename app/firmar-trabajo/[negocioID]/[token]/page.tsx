"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CampoFirmaDigital from "@/components/CampoFirmaDigital";

type Payload = {
  ok: boolean;
  negocio: { id: string; nombre: string };
  trabajo: {
    id: string;
    nroOrden: string;
    cliente: string;
    modelo: string;
    trabajo: string;
    fecha: string;
    yaFirmado: boolean;
    firmaClienteUrl: string | null;
  };
};

export default function FirmarTrabajoPage() {
  const params = useParams();
  const negocioID = String(params?.negocioID || "");
  const token = String(params?.token || "");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [firmaLocal, setFirmaLocal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [okGuardado, setOkGuardado] = useState(false);

  useEffect(() => {
    if (!negocioID || !token) return;
    let cancel = false;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const res = await fetch(
          `/api/firmar-trabajo?negocioID=${encodeURIComponent(negocioID)}&token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No encontrado");
        if (!cancel) {
          setData(json);
          if (json.trabajo?.firmaClienteUrl) {
            setFirmaLocal(json.trabajo.firmaClienteUrl);
          }
        }
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID, token]);

  const guardarFirma = async () => {
    if (!firmaLocal?.startsWith("data:image/")) {
      alert("Firmá en el recuadro y confirmá la firma antes de guardar.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const res = await fetch("/api/firmar-trabajo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocioID, token, dataUrl: firmaLocal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setOkGuardado(true);
      setFirmaLocal(json.firmaClienteUrl || firmaLocal);
      setData((prev) =>
        prev
          ? {
              ...prev,
              trabajo: {
                ...prev.trabajo,
                yaFirmado: true,
                firmaClienteUrl: json.firmaClienteUrl || prev.trabajo.firmaClienteUrl,
              },
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <p className="text-[#2c3e50] font-medium">Cargando…</p>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-[#e74c3c] mb-2">No disponible</h1>
          <p className="text-[#7f8c8d] text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) return null;
  const t = data.trabajo;

  return (
    <main className="min-h-screen bg-[#f4f6f8] p-4 pb-10">
      <div className="max-w-lg mx-auto space-y-4">
        <header className="bg-white rounded-2xl shadow-sm border border-[#ecf0f1] p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-[#7f8c8d]">Firma de recepción</p>
          <h1 className="text-xl font-bold text-[#2c3e50] mt-1">{data.negocio.nombre}</h1>
          <p className="text-sm text-[#34495e] mt-2">
            {t.cliente}
            {t.id ? ` · Orden ${t.id}` : t.nroOrden ? ` · ${t.nroOrden}` : ""}
          </p>
          <p className="text-sm text-[#7f8c8d]">
            {[t.modelo, t.trabajo].filter(Boolean).join(" — ")}
          </p>
        </header>

        {okGuardado || (t.yaFirmado && !firmaLocal?.startsWith("data:image/")) ? (
          <div className="bg-[#eafaf1] border border-[#27ae60] rounded-2xl p-4 text-center space-y-3">
            <p className="text-[#1e8449] font-bold text-lg">✓ Firma guardada</p>
            <p className="text-sm text-[#2c3e50]">
              Ya podés volver a la PC e imprimir el ticket: va a salir la firma del cliente.
            </p>
            {t.firmaClienteUrl || (firmaLocal && firmaLocal.startsWith("http")) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.firmaClienteUrl || firmaLocal || ""}
                alt="Firma"
                className="max-h-24 mx-auto bg-white rounded border border-[#d5f5e3] p-2"
              />
            ) : null}
          </div>
        ) : (
          <>
            <CampoFirmaDigital
              value={firmaLocal}
              onChange={setFirmaLocal}
              disabled={guardando}
              titulo="Firma del cliente"
            />
            {error ? <p className="text-sm text-[#e74c3c] text-center">{error}</p> : null}
            <button
              type="button"
              disabled={guardando || !firmaLocal?.startsWith("data:image/")}
              onClick={guardarFirma}
              className="w-full py-4 rounded-2xl bg-[#27ae60] hover:bg-[#1e8449] text-white font-bold text-lg disabled:opacity-50 shadow-lg"
            >
              {guardando ? "Guardando…" : "Guardar firma"}
            </button>
            <p className="text-xs text-center text-[#7f8c8d]">
              Usá el Apple Pencil o el dedo. No hace falta iniciar sesión.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
