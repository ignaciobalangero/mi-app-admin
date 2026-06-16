"use client";

import { useMemo, useState } from "react";
import { Minus, Package, Plus } from "lucide-react";
import type { CatalogoPublicoOpciones, ItemStockPublico } from "@/lib/stockPublicoTypes";
import {
  etiquetaVariante,
  precioDesdeGrupo,
  variantePorDefecto,
  type GrupoVariantesTienda,
} from "@/lib/agruparVariantesTienda";
import { textoPrecioTienda } from "@/lib/stockPublicoPrecios";
import { resolverUrlFotoProducto } from "@/lib/fotoProductoUrl";

type MiniFotoProps = {
  url: string | null | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
};

type Props = {
  grupo: GrupoVariantesTienda;
  ops: CatalogoPublicoOpciones;
  cotizacionUSD: number;
  indice?: number;
  MiniFoto: React.ComponentType<MiniFotoProps>;
  carrito: Record<string, { item: ItemStockPublico; cantidad: number }>;
  agregar: (item: ItemStockPublico) => void;
  mas: (id: string) => void;
  menos: (id: string) => void;
  onAmpliarFoto?: (urls: string[], alt: string, titulo: string) => void;
};

export default function TarjetaGrupoVariantes({
  grupo,
  ops,
  cotizacionUSD,
  indice = 0,
  MiniFoto,
  carrito,
  agregar,
  mas,
  menos,
  onAmpliarFoto,
}: Props) {
  const [seleccionId, setSeleccionId] = useState(() => variantePorDefecto(grupo.variantes).id);

  const varianteActiva = useMemo(
    () => grupo.variantes.find((v) => v.id === seleccionId) ?? grupo.variantes[0],
    [grupo.variantes, seleccionId]
  );

  const enCarrito = carrito[varianteActiva.id];
  const sinStockActivo = varianteActiva.stock <= 0;
  const precioGrupo = precioDesdeGrupo(grupo.variantes, cotizacionUSD);
  const precioActivo = textoPrecioTienda(varianteActiva, cotizacionUSD);
  const hayVariosPrecios = precioGrupo.min !== precioGrupo.max;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition active:scale-[0.99] sm:hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-white p-1.5 sm:p-2 lg:p-2 [color-scheme:light]">
        {ops.mostrarFoto !== false ? (
          <MiniFoto
            url={varianteActiva.fotoURL}
            alt={grupo.titulo}
            className="h-full w-full"
            priority={indice < 6}
            onClick={
              varianteActiva.fotoURL && onAmpliarFoto
                ? () => {
                    const urls = (
                      varianteActiva.fotosURLs?.length
                        ? varianteActiva.fotosURLs
                        : [varianteActiva.fotoURL!]
                    ).map((u) => resolverUrlFotoProducto(u));
                    onAmpliarFoto(urls, grupo.titulo, grupo.titulo);
                  }
                : undefined
            }
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100">
            <Package className="h-14 w-14 text-neutral-300" strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3 lg:p-2">
        <h2 className="line-clamp-2 min-h-[2.5rem] text-xs font-semibold leading-snug text-neutral-900 sm:min-h-[2.75rem] sm:text-sm lg:min-h-[2.25rem] lg:text-xs">
          {grupo.titulo}
        </h2>

        {ops.mostrarMarca !== false && grupo.marca && (
          <p className="mt-1 text-xs leading-snug text-neutral-500">
            <span className="font-medium text-neutral-500">Marca:</span>{" "}
            <span className="font-semibold text-neutral-800">{grupo.marca}</span>
          </p>
        )}

        <div className="mt-2">
          <label className="sr-only" htmlFor={`variante-${grupo.clave}`}>
            Elegir variante
          </label>
          <select
            id={`variante-${grupo.clave}`}
            value={seleccionId}
            onChange={(e) => setSeleccionId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs text-neutral-900 sm:text-sm"
          >
            {grupo.variantes.map((v) => {
              const sinStock = v.stock <= 0;
              const etiqueta = etiquetaVariante(v);
              const precio = textoPrecioTienda(v, cotizacionUSD);
              return (
                <option
                  key={v.id}
                  value={v.id}
                  disabled={false}
                  className={sinStock ? "text-neutral-400" : "text-neutral-900"}
                  style={{ color: sinStock ? "#9ca3af" : "#111827" }}
                >
                  {sinStock ? `${etiqueta} — sin stock` : `${etiqueta} — ${precio}`}
                </option>
              );
            })}
          </select>
        </div>

        {ops.mostrarCodigo !== false && (
          <p className="mt-1 font-mono text-[11px] text-neutral-500">{varianteActiva.codigo}</p>
        )}

        {ops.mostrarPrecio !== false && (
          <p className="mt-1.5 text-base font-bold tracking-tight text-neutral-900 sm:text-lg lg:text-sm">
            {hayVariosPrecios && !enCarrito ? precioGrupo.texto : precioActivo}
          </p>
        )}

        {ops.mostrarStock !== false && (
          <p className="mt-0.5 text-xs text-neutral-500">
            {sinStockActivo ? (
              <span className="font-medium text-neutral-400">Sin stock</span>
            ) : (
              <span>
                Stock:{" "}
                <span className="font-semibold text-neutral-800">{varianteActiva.stock}</span>
              </span>
            )}
          </p>
        )}

        <div className="mt-3 flex flex-1 items-end gap-2 lg:mt-2">
          {enCarrito ? (
            <div className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/80 px-1 py-1">
              <button
                type="button"
                onClick={() => menos(varianteActiva.id)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white hover:text-neutral-900"
                aria-label="Quitar uno"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[2ch] text-center text-sm font-bold tabular-nums">
                {enCarrito.cantidad}
              </span>
              <button
                type="button"
                onClick={() => mas(varianteActiva.id)}
                disabled={
                  sinStockActivo ||
                  (varianteActiva.stock > 0 && enCarrito.cantidad >= varianteActiva.stock)
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-white hover:text-neutral-900 disabled:opacity-40"
                aria-label="Agregar uno"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => agregar(varianteActiva)}
              disabled={sinStockActivo}
              className="flex w-full min-h-[40px] items-center justify-center rounded-md bg-[#2563eb] py-2.5 text-[11px] font-bold uppercase tracking-wide text-white transition active:bg-[#1d4ed8] sm:py-2 sm:text-xs lg:min-h-[36px] lg:py-2 lg:text-[10px] sm:hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              Comprar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
