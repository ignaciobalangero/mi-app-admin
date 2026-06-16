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
        gestioneEnlace ? (
          <a
            href={gestioneEnlace}
            {...linkExternoProps}
            className="group relative block overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-100 shadow-md transition hover:shadow-lg hover:ring-2 hover:ring-[#3b82f6]/30"
          >
            <BannerGestioneContenido logo={gestioneLogo} conEnlace />
          </a>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-100 shadow-md">
            <BannerGestioneContenido logo={gestioneLogo} conEnlace={false} />
          </div>
        )
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
    <div className="relative flex flex-col items-center gap-4 px-5 py-6 sm:flex-row sm:justify-between sm:gap-6 sm:px-8 sm:py-7">
      <img
        src={logo}
        alt="Gestione"
        className="h-14 max-w-[70vw] object-contain drop-shadow sm:h-20 sm:max-w-[220px]"
      />
      <div className="flex flex-col items-center text-center sm:items-end sm:text-right">
        <p className="flex items-center gap-1.5 text-base font-bold uppercase tracking-wide text-[#1e3a5f] sm:text-lg">
          <Sparkles className="h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden />
          Gestioná tu negocio
        </p>
        {conEnlace ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#2563eb] transition group-hover:text-[#1d4ed8]">
            Conocé Gestione
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </p>
        ) : (
          <p className="mt-1 text-sm font-medium text-[#475569]">
            Stock, ventas y trabajos en un solo sistema
          </p>
        )}
      </div>
    </div>
  );
}
