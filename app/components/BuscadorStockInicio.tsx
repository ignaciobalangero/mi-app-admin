"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRol } from "@/lib/useRol";
import {
  badgeOrigenClass,
  cargarItemsBusquedaStockInicio,
  filtrarItemsBusquedaStockInicio,
  type ItemBusquedaStockInicio,
} from "@/lib/busquedaStockInicio";

const MIN_CHARS = 2;
const MAX_RESULTADOS = 20;

export default function BuscadorStockInicio() {
  const { rol } = useRol();
  const negocioID = rol?.negocioID;

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemBusquedaStockInicio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogoCargado, setCatalogoCargado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(
    () => filtrarItemsBusquedaStockInicio(items, query, MAX_RESULTADOS),
    [items, query]
  );

  const cargarCatalogo = useCallback(async () => {
    if (!negocioID || catalogoCargado || cargando) return;

    setCargando(true);
    setError(null);

    try {
      const lista = await cargarItemsBusquedaStockInicio(negocioID);
      setItems(lista);
      setCatalogoCargado(true);
    } catch (err) {
      console.error("Error cargando stock para búsqueda:", err);
      setError("No se pudo cargar el stock. Intentá de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [negocioID, catalogoCargado, cargando]);

  useEffect(() => {
    if (query.trim().length >= MIN_CHARS && !catalogoCargado && negocioID) {
      void cargarCatalogo();
    }
  }, [query, catalogoCargado, negocioID, cargarCatalogo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contenedorRef.current &&
        !contenedorRef.current.contains(event.target as Node)
      ) {
        setAbierto(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mostrarPanel =
    abierto &&
    (query.trim().length >= MIN_CHARS || cargando || Boolean(error));

  return (
    <div
      ref={contenedorRef}
      className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-[#ecf0f1]"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 bg-gradient-to-br from-[#3498db] to-[#2980b9] rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
          <span className="text-white text-lg">🔎</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-[#2c3e50]">
            Búsqueda rápida de stock
          </h2>
          <p className="text-sm text-[#7f8c8d]">
            Accesorios, repuestos, stock extra y teléfonos
          </p>
        </div>
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => {
            setAbierto(true);
            if (query.trim().length >= MIN_CHARS) {
              void cargarCatalogo();
            }
          }}
          placeholder="Ej: batería A50, flex carga, Samsung A04..."
          className="w-full rounded-xl border-2 border-[#ecf0f1] bg-[#f8f9fa] px-4 py-3 pr-10 text-[#2c3e50] placeholder:text-[#95a5a6] focus:border-[#3498db] focus:bg-white focus:outline-none transition-colors"
          autoComplete="off"
        />
        {cargando && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 border-2 border-[#3498db] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {mostrarPanel && (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-[420px] overflow-y-auto rounded-xl border border-[#ecf0f1] bg-white shadow-2xl">
            {error ? (
              <div className="px-4 py-6 text-center text-sm text-[#e74c3c]">
                {error}
              </div>
            ) : cargando && !catalogoCargado ? (
              <div className="px-4 py-6 text-center text-sm text-[#7f8c8d]">
                Cargando stock...
              </div>
            ) : query.trim().length < MIN_CHARS ? (
              <div className="px-4 py-6 text-center text-sm text-[#7f8c8d]">
                Escribí al menos {MIN_CHARS} caracteres para buscar
              </div>
            ) : resultados.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[#7f8c8d]">
                No se encontraron productos para &quot;{query.trim()}&quot;
              </div>
            ) : (
              <ul className="divide-y divide-[#ecf0f1]">
                {resultados.map((item) => (
                  <li key={`${item.origen}-${item.id}`}>
                    <Link
                      href={item.href}
                      onClick={() => setAbierto(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badgeOrigenClass(item.origen)}`}
                          >
                            {item.labelOrigen}
                          </span>
                          {item.codigo && (
                            <span className="text-xs font-mono text-[#7f8c8d]">
                              {item.codigo}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-[#2c3e50] truncate">
                          {item.nombre}
                        </p>
                        {item.subtitulo && (
                          <p className="text-xs text-[#7f8c8d] truncate">
                            {item.subtitulo}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#2c3e50]">
                          {item.precioTexto}
                        </p>
                        {item.cantidad !== null && (
                          <p
                            className={`text-xs font-semibold ${
                              item.cantidad > 0
                                ? "text-[#27ae60]"
                                : "text-[#e74c3c]"
                            }`}
                          >
                            Stock: {item.cantidad}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {catalogoCargado && resultados.length > 0 && (
              <div className="border-t border-[#ecf0f1] px-4 py-2 text-xs text-[#95a5a6] text-center">
                {resultados.length} resultado
                {resultados.length !== 1 ? "s" : ""} · click para ir al módulo
              </div>
            )}
          </div>
        )}
      </div>

      {catalogoCargado && !cargando && (
        <p className="mt-2 text-xs text-[#95a5a6]">
          {items.length.toLocaleString("es-AR")} productos indexados
        </p>
      )}
    </div>
  );
}
