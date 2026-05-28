"use client";

import { useRef } from "react";
import {
  Battery,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Package,
  PlugZap,
  Wrench,
} from "lucide-react";
import {
  CATEGORIAS_TIENDA_INICIO,
  type ChipCategoria,
} from "@/lib/catalogoChipCategoria";

const ICONOS: Record<
  (typeof CATEGORIAS_TIENDA_INICIO)[number]["id"],
  typeof Monitor
> = {
  pantallas: Monitor,
  placas_carga: PlugZap,
  baterias: Battery,
  herramientas: Wrench,
  insumos: Package,
};

const GRADIENTES: Record<(typeof CATEGORIAS_TIENDA_INICIO)[number]["id"], string> = {
  pantallas: "from-neutral-700 via-neutral-600 to-neutral-800",
  placas_carga: "from-slate-700 via-slate-600 to-slate-900",
  baterias: "from-neutral-600 via-neutral-700 to-neutral-800",
  herramientas: "from-neutral-600 via-neutral-700 to-neutral-900",
  insumos: "from-neutral-700 via-neutral-600 to-neutral-800",
};

type Props = {
  onElegir: (chip: ChipCategoria) => void;
};

export default function TarjetasCategoriasTienda({ onElegir }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const desplazar = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.85, 280), behavior: "smooth" });
  };

  return (
    <section className="mb-6 sm:mb-8" aria-label="Categorías de productos">
      <div className="mb-3 flex items-end justify-between gap-2 px-0.5">
        <div>
          <h2 className="text-base font-bold text-neutral-900 sm:text-lg">Explorá por categoría</h2>
          <p className="text-xs text-neutral-500 sm:text-sm">Elegí una sección o buscá por modelo arriba</p>
        </div>
        <div className="hidden shrink-0 gap-1 sm:flex">
          <button
            type="button"
            onClick={() => desplazar(-1)}
            className="rounded-full border border-neutral-300 bg-white p-2 text-neutral-600 shadow-sm hover:bg-neutral-50"
            aria-label="Categorías anteriores"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => desplazar(1)}
            className="rounded-full border border-neutral-300 bg-white p-2 text-neutral-600 shadow-sm hover:bg-neutral-50"
            aria-label="Categorías siguientes"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none lg:grid-cols-3 xl:grid-cols-5"
      >
        {CATEGORIAS_TIENDA_INICIO.map(({ id, label, hint }) => {
          const Icon = ICONOS[id];
          const gradient = GRADIENTES[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onElegir(id)}
              className={`group relative flex h-28 min-w-[68%] shrink-0 snap-center flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${gradient} shadow-md transition hover:scale-[1.02] hover:shadow-lg active:scale-[0.99] sm:min-w-0 sm:h-32`}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.35) 0%, transparent 45%)",
                }}
                aria-hidden
              />
              <Icon
                className="pointer-events-none absolute -right-2 -bottom-2 h-20 w-20 text-white/10 sm:h-24 sm:w-24"
                strokeWidth={1}
                aria-hidden
              />
              <span className="relative px-2 text-center text-base font-black uppercase leading-tight tracking-wide text-white drop-shadow sm:text-lg">
                {label}
              </span>
              <span className="relative mt-1 px-3 text-center text-[10px] font-medium text-white/80 sm:text-xs">
                {hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
