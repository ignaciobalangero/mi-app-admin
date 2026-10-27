"use client";

import { useEffect, useRef, useState } from "react";
import VideoMudo from "@/components/VideoMudo";
import CotizadorCliente from "./CotizadorCliente";
import type { ModeloCotizacion } from "@/lib/cotizador/telefonos";

type Equipo = {
  id: string;
  marca: string;
  modelo: string;
  color: string;
  gb: string;
  bateria: string;
  estado: string;
  accesorios?: string;
  moneda: "ARS" | "USD";
  precio: number;
  fotos: string[];
  video?: string;
};

type Respuesta = {
  nombre: string;
  logoUrl: string | null;
  lista: "mayorista" | "minorista";
  equipos: Equipo[];
  cotizador?: { whatsapp: string; modelos: ModeloCotizacion[] } | null;
};

function textoPrecio(e: Equipo): string {
  if (!e.precio) return "Consultar";
  const monto = e.precio.toLocaleString("es-AR");
  return e.moneda === "USD" ? `USD $${monto}` : `$${monto}`;
}

function nombreEquipo(e: Equipo): string {
  if (e.marca && !e.modelo.toLowerCase().includes(e.marca.toLowerCase())) {
    return `${e.marca} ${e.modelo}`;
  }
  return e.modelo;
}

function detalle(e: Equipo): string {
  return [e.gb, e.color, e.bateria ? `Bat ${e.bateria.replace(/%$/, "")}%` : ""]
    .filter(Boolean)
    .join(" · ");
}

export default function VitrinaCelulares({
  negocioID,
  listaInicial,
}: {
  negocioID: string;
  listaInicial: "mayorista" | "minorista";
}) {
  const [data, setData] = useState<Respuesta | null>(null);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState<Equipo | null>(null);
  const [equipoCotizar, setEquipoCotizar] = useState("");
  const [fotoIdx, setFotoIdx] = useState(0);
  const toqueX = useRef<number | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/celulares-publicos?negocioId=${encodeURIComponent(negocioID)}&lista=${listaInicial}`,
          { cache: "no-store" }
        );
        if (res.status === 404) throw new Error("Este link no existe.");
        if (!res.ok) throw new Error("No se pudo cargar la lista.");
        const json = (await res.json()) as Respuesta;
        if (!cancel) setData(json);
      } catch (err) {
        if (!cancel) {
          setError(err instanceof Error ? err.message : "No se pudo cargar la lista.");
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID, listaInicial]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setAbierto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const abrir = (e: Equipo) => {
    setFotoIdx(0);
    setEquipoCotizar(e.id);
    setAbierto(e);
  };

  const moverFoto = (delta: number) => {
    if (!abierto || abierto.fotos.length < 2) return;
    setFotoIdx((i) => (i + delta + abierto.fotos.length) % abierto.fotos.length);
  };

  const tituloLista = listaInicial === "mayorista" ? "Precios mayoristas" : "Precios";
  const hayCotizador = Boolean(data?.cotizador?.modelos?.length);

  const linkDescarga = (equipoId: string, tipo: "foto" | "video" | "paquete", indice?: number) => {
    const q = new URLSearchParams({
      negocioId: negocioID,
      id: equipoId,
      tipo,
    });
    if (indice != null) q.set("i", String(indice));
    return `/api/celulares-publicos/descarga?${q.toString()}`;
  };

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900">
      <header className="bg-white border-b border-neutral-200 px-4 py-4">
        <div className={`${hayCotizador ? "max-w-6xl" : "max-w-lg"} mx-auto flex items-center gap-3`}>
          {data?.logoUrl ? (
            <img src={data.logoUrl} alt="" className="h-10 w-auto max-w-[120px] object-contain" />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{data?.nombre || "Celulares"}</h1>
            <p className="text-sm text-neutral-500">{tituloLista}</p>
          </div>
        </div>
        <p className={`${hayCotizador ? "max-w-6xl" : "max-w-lg"} mx-auto mt-2 text-sm text-neutral-500`}>
          Tocá un equipo para ver las fotos y el video, y descargarlos para reenviarlos.
        </p>
      </header>

      <div
        className={
          hayCotizador
            ? "max-w-6xl mx-auto px-3 py-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-4 lg:items-start"
            : "max-w-lg mx-auto px-3 py-4"
        }
      >
        <div className="order-2 lg:order-1 space-y-2">
        {error ? <p className="text-center text-red-700 py-10">{error}</p> : null}
        {!data && !error ? (
          <p className="text-center text-neutral-500 py-10">Cargando equipos…</p>
        ) : null}
        {data && data.equipos.length === 0 ? (
          <p className="text-center text-neutral-500 py-10">No hay equipos publicados.</p>
        ) : null}
        {data?.equipos.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => abrir(e)}
            className="w-full bg-white rounded-2xl border border-neutral-200 p-3 flex gap-3 text-left shadow-sm active:scale-[0.99]"
          >
            {e.fotos[0] ? (
              <img src={e.fotos[0]} alt="" className="h-16 w-16 rounded-xl object-cover flex-shrink-0 bg-neutral-100" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0 text-2xl">
                📱
              </div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold truncate">{nombreEquipo(e)}</span>
              <span className="block text-sm text-neutral-500 truncate">{detalle(e) || e.estado}</span>
              {e.accesorios ? (
                <span className="block text-sm text-neutral-700 truncate">Incluye {e.accesorios}</span>
              ) : null}
              <span className="mt-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-sky-700">
                  {e.fotos.length > 1
                    ? `Ver ${e.fotos.length} fotos${e.video ? " y video" : ""}`
                    : e.fotos.length === 1
                      ? `Ver foto${e.video ? " y video" : ""}`
                      : e.video
                        ? "Ver video"
                        : e.estado}
                </span>
                <span className="font-bold text-emerald-700">{textoPrecio(e)}</span>
              </span>
            </span>
          </button>
        ))}
        </div>
        {hayCotizador && data?.cotizador ? (
          <div className="order-1 lg:order-2 mb-4 lg:mb-0 lg:sticky lg:top-4">
            <CotizadorCliente
              equipos={data.equipos}
              modelos={data.cotizador.modelos}
              whatsapp={data.cotizador.whatsapp}
              equipoId={equipoCotizar}
              onElegirEquipo={setEquipoCotizar}
            />
          </div>
        ) : null}
      </div>

      {abierto ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAbierto(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b">
              <div className="min-w-0">
                <h2 className="font-bold text-lg leading-tight">{nombreEquipo(abierto)}</h2>
                <p className="text-sm text-neutral-500">{[detalle(abierto), abierto.estado].filter(Boolean).join(" · ")}</p>
                <p className="font-bold text-emerald-700 mt-1">{textoPrecio(abierto)}</p>
                {abierto.accesorios ? (
                  <p className="text-sm text-neutral-800 mt-1">Incluye {abierto.accesorios}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setAbierto(null)}
                className="h-10 w-10 rounded-full bg-neutral-100 font-bold text-lg"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {abierto.fotos.length === 0 && !abierto.video ? (
              <p className="p-8 text-center text-neutral-500">Este equipo todavía no tiene fotos.</p>
            ) : (
              <div className="p-3 space-y-3">
                {abierto.fotos.length > 0 ? (
                  <div>
                    <div
                      className="relative touch-pan-y"
                      onPointerDown={(ev) => {
                        toqueX.current = ev.clientX;
                      }}
                      onPointerUp={(ev) => {
                        if (toqueX.current == null) return;
                        const dx = ev.clientX - toqueX.current;
                        toqueX.current = null;
                        if (dx > 40) moverFoto(-1);
                        else if (dx < -40) moverFoto(1);
                      }}
                    >
                      <img
                        src={abierto.fotos[fotoIdx] || abierto.fotos[0]}
                        alt={`${nombreEquipo(abierto)} foto ${fotoIdx + 1}`}
                        className="w-full max-h-[62vh] object-contain bg-neutral-50 rounded-xl select-none"
                        draggable={false}
                      />
                      {abierto.fotos.length > 1 ? (
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                          {fotoIdx + 1} / {abierto.fotos.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={linkDescarga(abierto.id, "foto", fotoIdx)}
                        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Descargar esta foto
                      </a>
                      {abierto.fotos.length > 1 || abierto.video ? (
                        <a
                          href={linkDescarga(abierto.id, "paquete")}
                          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-800"
                        >
                          Descargar fotos{abierto.video ? " y video" : ""}
                        </a>
                      ) : null}
                    </div>
                    {abierto.fotos.length > 1 ? (
                      <>
                        <div className="mt-3 flex justify-center gap-1.5">
                          {abierto.fotos.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-label={`Foto ${i + 1}`}
                              onClick={() => setFotoIdx(i)}
                              className={`h-2.5 rounded-full ${i === fotoIdx ? "w-6 bg-neutral-900" : "w-2.5 bg-neutral-300"}`}
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {abierto.fotos.map((url, i) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setFotoIdx(i)}
                              className={`h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                                i === fotoIdx ? "border-neutral-900" : "border-transparent"
                              }`}
                            >
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {abierto.video ? (
                  <div className="space-y-2">
                    <VideoMudo
                      key={abierto.video}
                      src={abierto.video}
                      className="w-full max-h-[50vh] rounded-xl bg-black"
                    />
                    <a
                      href={linkDescarga(abierto.id, "video")}
                      download
                      className="inline-block rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Descargar video
                    </a>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
