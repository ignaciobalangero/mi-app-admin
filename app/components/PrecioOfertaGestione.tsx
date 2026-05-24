import {
  PRECIO_MENSUAL_LISTA_ARS,
  PRECIO_MENSUAL_OFERTA_ARS,
  formatoPrecioGestione,
} from "@/lib/preciosGestione";

type Props = {
  /** Más compacto para el login */
  compact?: boolean;
};

export default function PrecioOfertaGestione({ compact = false }: Props) {
  return (
    <div className={`text-center ${compact ? "space-y-1" : "space-y-2"}`}>
      <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5">
        <span
          className={`font-semibold text-[#95a5a6] line-through decoration-[#e74c3c]/80 ${
            compact ? "text-base" : "text-lg sm:text-xl"
          }`}
        >
          {formatoPrecioGestione(PRECIO_MENSUAL_LISTA_ARS)}
        </span>
        <span
          className={`font-black text-[#27ae60] ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}
        >
          {formatoPrecioGestione(PRECIO_MENSUAL_OFERTA_ARS)}
        </span>
        <span className={`font-medium text-[#2c3e50] ${compact ? "text-xs" : "text-sm"}`}>
          / mes
        </span>
      </div>
      <p className={`text-[#7f8c8d] ${compact ? "text-[11px]" : "text-xs"}`}>
        Precio promocional · 7 días gratis para probar
      </p>
    </div>
  );
}
