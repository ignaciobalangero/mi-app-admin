"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import type { TiendaPublicaInfo } from "@/lib/tiendaPublicaTypes";
import { DEFAULT_LISTA_PRECIOS_GREMIO_TITULO } from "@/lib/tiendaPublicaTypes";
import { normalizarUrlExterna } from "@/lib/urlExterna";

type Props = {
  tienda: TiendaPublicaInfo;
  logoNegocio: string | null;
};

const linkExternoProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

export default function BannersTienda({ tienda, logoNegocio }: Props) {
  const gestioneLogo = tienda.gestioneLogoUrl?.trim() || null;
  const gestioneEnlace = normalizarUrlExterna(tienda.gestioneEnlace);
  const listaUrl = normalizarUrlExterna(tienda.listaPreciosGremioUrl);
  const listaTitulo =
    tienda.listaPreciosGremioTitulo?.trim() || DEFAULT_LISTA_PRECIOS_GREMIO_TITULO;
  const logoTienda = logoNegocio || tienda.logoUrl?.trim() || null;

  if (!gestioneLogo && !listaUrl) return null;

  return (
    <section className="mb-6 space-y-4 sm:mb-8" aria-label="Promociones">
      {gestioneLogo && (
        <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100 shadow-md">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(99,102,241,0.12) 0%, transparent 40%)",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-indigo-400/10 blur-xl" aria-hidden />

          {gestioneEnlace ? (
            <a
              href={gestioneEnlace}
              {...linkExternoProps}
              className="relative flex flex-col items-center gap-4 p-5 transition hover:bg-white/20 sm:flex-row sm:gap-8 sm:p-8"
            >
              <BannerGestioneContenido logo={gestioneLogo} conEnlace />
            </a>
          ) : (
            <div className="relative flex flex-col items-center gap-4 p-5 sm:flex-row sm:gap-8 sm:p-8">
              <BannerGestioneContenido logo={gestioneLogo} conEnlace={false} />
            </div>
          )}
        </div>
      )}

      {listaUrl && (
        <a
          href={listaUrl}
          {...linkExternoProps}
          className="group relative block overflow-hidden rounded-2xl border border-neutral-700 bg-gradient-to-r from-neutral-950 via-neutral-900 to-[#1e3a5f] shadow-lg transition hover:shadow-xl hover:ring-2 hover:ring-[#3b82f6]/50"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 40%, rgba(59,130,246,0.3) 100%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-4 px-5 py-6 sm:flex-row sm:justify-between sm:gap-6 sm:px-8 sm:py-7">
            {logoTienda ? (
              <img
                src={logoTienda}
                alt=""
                className="h-14 max-w-[70vw] object-contain sm:h-20 sm:max-w-[220px]"
              />
            ) : (
              <span className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                {tienda.nombre}
              </span>
            )}
            <div className="flex flex-col items-center text-center sm:items-end sm:text-right">
              <p className="text-base font-bold uppercase tracking-wide text-white sm:text-lg">
                {listaTitulo}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-blue-200 transition group-hover:text-white">
                Abrir lista en Google Drive
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </p>
            </div>
          </div>
        </a>
      )}
    </section>
  );
}

function BannerGestioneContenido({
  logo,
  conEnlace,
}: {
  logo: string;
  conEnlace: boolean;
}) {
  return (
    <>
      <img
        src={logo}
        alt="Gestione"
        className="h-14 w-auto max-w-[200px] object-contain drop-shadow sm:h-20 sm:max-w-[260px]"
      />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
          <Sparkles className="h-4 w-4 text-[#2563eb]" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest text-[#1d4ed8]">
            Software de gestión
          </span>
        </div>
        <h2 className="text-xl font-black tracking-tight text-[#1e3a5f] sm:text-2xl">
          Gestioná tu negocio con{" "}
          <span className="bg-gradient-to-r from-[#2563eb] to-[#7c3aed] bg-clip-text text-transparent">
            Gestione
          </span>
        </h2>
        <p className="mt-1 max-w-xl text-sm text-[#475569] sm:text-base">
          Stock, ventas, trabajos y más — todo en un solo sistema pensado para service técnico.
        </p>
        {conEnlace && (
          <p className="mt-2 text-xs font-semibold text-[#2563eb] sm:text-sm">
            Conocé más →
          </p>
        )}
      </div>
    </>
  );
}
