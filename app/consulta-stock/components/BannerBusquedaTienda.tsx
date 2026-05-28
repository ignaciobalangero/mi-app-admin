"use client";

import { ArrowUp, Search } from "lucide-react";

type Props = {
  minChars?: number;
};

export default function BannerBusquedaTienda({ minChars = 2 }: Props) {
  return (
    <section
      className="relative mb-4 overflow-visible rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-amber-50 pt-8 shadow-sm sm:mb-6 sm:pt-9"
      aria-label="Cómo buscar productos"
    >
      {/* Flecha hacia el buscador del header */}
      <div
        className="pointer-events-none absolute -top-1 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center sm:left-[58%]"
        aria-hidden
      >
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
          Buscador
        </span>
        <ArrowUp className="h-7 w-7 animate-bounce text-amber-500 drop-shadow-sm" strokeWidth={2.5} />
        <div className="h-4 w-0.5 rounded-full bg-gradient-to-t from-amber-400/80 to-transparent" />
      </div>

      <div className="flex flex-col items-center gap-3 px-4 py-5 text-center sm:flex-row sm:gap-5 sm:px-6 sm:py-5 sm:text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Search className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900 sm:text-base">
            ¿Buscás un repuesto? Usá el buscador de arriba ↑
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600 sm:text-sm">
            Escribí modelo, marca o código (mínimo {minChars} letras). Ej:{" "}
            <span className="font-semibold text-neutral-800">A06</span>,{" "}
            <span className="font-semibold text-neutral-800">iPhone 11</span>,{" "}
            <span className="font-semibold text-neutral-800">Samsung A32</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
