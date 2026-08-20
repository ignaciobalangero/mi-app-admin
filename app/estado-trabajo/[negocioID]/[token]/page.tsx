"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { etiquetaEstadoTrabajo } from "@/lib/trabajosFotos";

type Payload = {
  ok: boolean;
  negocio: { id: string; nombre: string };
  trabajo: {
    id: string;
    nroOrden: string;
    cliente: string;
    modelo: string;
    trabajo: string;
    estado: string;
    estadoLabel: string;
    fecha: string;
    observaciones: string;
    reparacionRealizada: string;
    fotosIngreso: string[];
    fotosProceso: string[];
  };
};

export default function EstadoTrabajoPublicoPage() {
  const params = useParams();
  const negocioID = String(params?.negocioID || "");
  const token = String(params?.token || "");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!negocioID || !token) return;
    let cancel = false;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const res = await fetch(
          `/api/estado-trabajo?negocioID=${encodeURIComponent(negocioID)}&token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No encontrado");
        if (!cancel) setData(json);
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

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <p className="text-[#2c3e50] font-medium">Cargando estado del trabajo…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-[#e74c3c] mb-2">No disponible</h1>
          <p className="text-[#7f8c8d] text-sm">{error || "Trabajo no encontrado"}</p>
        </div>
      </main>
    );
  }

  const t = data.trabajo;
  const estadoColor =
    String(t.estado).toUpperCase() === "REPARADO"
      ? "bg-[#27ae60]"
      : String(t.estado).toUpperCase().includes("PENDIENTE")
        ? "bg-[#f39c12]"
        : "bg-[#3498db]";

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#2c3e50]">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <header className="bg-white rounded-2xl shadow p-5">
          <p className="text-xs uppercase tracking-wide text-[#7f8c8d]">Seguimiento de reparación</p>
          <h1 className="text-xl font-bold mt-1">{data.negocio.nombre}</h1>
          <p className="text-sm text-[#7f8c8d] mt-1">
            Orden {t.id || t.nroOrden}
            {t.fecha ? ` · ${t.fecha}` : ""}
          </p>
          <div className={`mt-4 inline-flex px-3 py-1.5 rounded-full text-white text-sm font-semibold ${estadoColor}`}>
            {t.estadoLabel || etiquetaEstadoTrabajo(t.estado)}
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow p-5 space-y-2 text-sm">
          <Row label="Cliente" value={t.cliente} />
          <Row label="Equipo" value={t.modelo} />
          <Row label="Trabajo" value={t.trabajo} />
          {t.reparacionRealizada ? (
            <Row label="Reparación" value={t.reparacionRealizada} />
          ) : null}
          {t.observaciones ? <Row label="Obs." value={t.observaciones} /> : null}
        </section>

        <Galeria titulo="Cómo ingresó el equipo" urls={t.fotosIngreso} />
        <Galeria titulo="Avance / proceso" urls={t.fotosProceso} />

        <p className="text-center text-xs text-[#95a5a6] pb-8">
          Escaneá el QR de tu orden para ver actualizaciones y fotos.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-[#7f8c8d]">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Galeria({ titulo, urls }: { titulo: string; urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <section className="bg-white rounded-2xl shadow p-5">
      <h2 className="font-bold mb-3">{titulo}</h2>
      <div className="grid grid-cols-2 gap-2">
        {urls.map((url) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="block aspect-square rounded-xl overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
    </section>
  );
}
