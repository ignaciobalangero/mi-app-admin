"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fusionarCategoriasUnicas } from "@/lib/categoriaRepuesto";
import {
  calcularDiferenciasConteo,
  crearLineasConteo,
  docAProductoControlStock,
  etiquetaFiltroTienda,
  filtrarProductosControl,
  generarHtmlImpresionControlStock,
  imprimirControlStock,
  parseStockReal,
  type DiferenciaConteoStock,
  type FiltroTiendaControl,
  type LineaConteoStock,
  type ProductoControlStock,
} from "@/lib/controlStockRepuestos";

type PasoControl = "config" | "conteo" | "resumen";

interface Props {
  negocioID: string;
  abierto: boolean;
  onCerrar: () => void;
  onStockActualizado?: () => void;
}

export default function ControlStockRepuestos({
  negocioID,
  abierto,
  onCerrar,
  onStockActualizado,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [paso, setPaso] = useState<PasoControl>("config");
  const [cargando, setCargando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [todosProductos, setTodosProductos] = useState<ProductoControlStock[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [filtroTienda, setFiltroTienda] = useState<FiltroTiendaControl>("todos");

  const [lineas, setLineas] = useState<LineaConteoStock[]>([]);
  const [busquedaConteo, setBusquedaConteo] = useState("");
  const [diferencias, setDiferencias] = useState<DiferenciaConteoStock[]>([]);

  useEffect(() => setMounted(true), []);

  const productosFiltrados = useMemo(
    () => filtrarProductosControl(todosProductos, categoriaFiltro, filtroTienda),
    [todosProductos, categoriaFiltro, filtroTienda]
  );

  const cargarProductos = useCallback(async () => {
    if (!negocioID) return;
    setCargando(true);
    setError(null);
    try {
      const snap = await getDocs(
        collection(db, `negocios/${negocioID}/stockRepuestos`)
      );
      const lista = snap.docs.map((d) =>
        docAProductoControlStock(d.id, d.data() as Record<string, unknown>)
      );
      setTodosProductos(lista);
      setCategorias(
        fusionarCategoriasUnicas(lista.map((p) => p.categoria))
      );
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar el stock.");
    } finally {
      setCargando(false);
    }
  }, [negocioID]);

  useEffect(() => {
    if (abierto && negocioID) {
      setPaso("config");
      setBusquedaConteo("");
      setDiferencias([]);
      setLineas([]);
      void cargarProductos();
    }
  }, [abierto, negocioID, cargarProductos]);

  const subtituloFiltros = useMemo(() => {
    const partes = [etiquetaFiltroTienda(filtroTienda)];
    if (categoriaFiltro) partes.unshift(`Categoría: ${categoriaFiltro}`);
    return partes.join(" · ");
  }, [categoriaFiltro, filtroTienda]);

  const lineasVisibles = useMemo(() => {
    const q = busquedaConteo.trim().toLowerCase();
    if (!q) return lineas;
    return lineas.filter((l) => {
      const blob = [
        l.producto.codigo,
        l.producto.producto,
        l.producto.marca,
        l.producto.categoria,
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [lineas, busquedaConteo]);

  const statsConteo = useMemo(() => {
    const contados = lineas.filter((l) => l.contado).length;
    const difs = calcularDiferenciasConteo(lineas);
    return {
      total: lineas.length,
      contados,
      pendientes: lineas.length - contados,
      diferencias: difs.length,
    };
  }, [lineas]);

  const handleImprimir = () => {
    if (productosFiltrados.length === 0) {
      alert("No hay productos con esos filtros.");
      return;
    }
    const html = generarHtmlImpresionControlStock({
      titulo: "Control de stock — Repuestos",
      subtitulo: subtituloFiltros,
      productos: productosFiltrados,
      mostrarTienda: filtroTienda === "todos",
    });
    const ok = imprimirControlStock(html);
    if (!ok) alert("Permití ventanas emergentes para imprimir.");
  };

  const iniciarConteo = () => {
    if (productosFiltrados.length === 0) {
      alert("No hay productos con esos filtros.");
      return;
    }
    setLineas(crearLineasConteo(productosFiltrados));
    setBusquedaConteo("");
    setPaso("conteo");
  };

  const toggleContado = (id: string) => {
    setLineas((prev) =>
      prev.map((l) =>
        l.producto.id === id
          ? {
              ...l,
              contado: !l.contado,
              stockReal: l.stockReal || String(l.producto.cantidad),
            }
          : l
      )
    );
  };

  const marcarTodosContados = () => {
    setLineas((prev) =>
      prev.map((l) => ({
        ...l,
        contado: true,
        stockReal: l.stockReal || String(l.producto.cantidad),
      }))
    );
  };

  const actualizarStockReal = (id: string, valor: string) => {
    setLineas((prev) =>
      prev.map((l) =>
        l.producto.id === id ? { ...l, stockReal: valor } : l
      )
    );
  };

  const irAResumen = () => {
    const difs = calcularDiferenciasConteo(lineas);
    setDiferencias(difs);
    setPaso("resumen");
  };

  const aplicarCorrecciones = async () => {
    if (!negocioID || diferencias.length === 0) return;
    const ok = confirm(
      `¿Actualizar stock de ${diferencias.length} producto(s) en el sistema?`
    );
    if (!ok) return;

    setAplicando(true);
    try {
      const batch = writeBatch(db);
      for (const d of diferencias) {
        batch.update(doc(db, `negocios/${negocioID}/stockRepuestos`, d.id), {
          cantidad: d.stockReal,
          ultimaActualizacion: serverTimestamp(),
        });
      }
      await batch.commit();
      onStockActualizado?.();
      alert("Stock actualizado correctamente.");
      onCerrar();
    } catch (e) {
      console.error(e);
      alert("Error al aplicar correcciones.");
    } finally {
      setAplicando(false);
    }
  };

  if (!abierto || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#f8f9fa] text-[#2c3e50]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#ecf0f1] bg-white px-4 py-3 shadow-sm safe-area-top">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (paso === "conteo") setPaso("config");
              else if (paso === "resumen") setPaso("conteo");
              else onCerrar();
            }}
            className="rounded-xl border border-[#ecf0f1] px-3 py-2 text-sm font-medium hover:bg-[#f8f9fa]"
          >
            {paso === "config" ? "✕ Cerrar" : "← Volver"}
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">
              {paso === "config" && "Control de stock"}
              {paso === "conteo" && "Conteo de stock"}
              {paso === "resumen" && "Resumen de diferencias"}
            </h2>
            <p className="truncate text-xs text-[#7f8c8d]">{subtituloFiltros}</p>
          </div>
          {paso === "conteo" && (
            <div className="text-right text-xs font-semibold">
              <div className="text-[#27ae60]">
                {statsConteo.contados}/{statsConteo.total} contados
              </div>
              {statsConteo.diferencias > 0 && (
                <div className="text-[#e67e22]">
                  {statsConteo.diferencias} con diferencia
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Config */}
      {paso === "config" && (
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-lg space-y-5">
            {cargando ? (
              <div className="py-12 text-center text-[#7f8c8d]">
                Cargando stock...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-[#e74c3c]/30 bg-[#fdecea] p-4 text-[#c0392b]">
                {error}
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-[#ecf0f1] bg-white p-5 shadow-sm space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Categoría
                    </label>
                    <select
                      value={categoriaFiltro}
                      onChange={(e) => setCategoriaFiltro(e.target.value)}
                      className="w-full rounded-xl border-2 border-[#ecf0f1] bg-[#f8f9fa] px-3 py-3 text-base focus:border-[#3498db] focus:outline-none"
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Alcance tienda web
                    </label>
                    <div className="grid gap-2">
                      {(
                        [
                          ["todos", "Todo el stock"],
                          ["tienda", "Solo aptos para tienda web 🌐"],
                          ["no_tienda", "Solo NO publicados en tienda"],
                        ] as const
                      ).map(([val, label]) => (
                        <label
                          key={val}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                            filtroTienda === val
                              ? "border-[#3498db] bg-[#ebf3fd]"
                              : "border-[#ecf0f1] hover:bg-[#f8f9fa]"
                          }`}
                        >
                          <input
                            type="radio"
                            name="filtroTienda"
                            checked={filtroTienda === val}
                            onChange={() => setFiltroTienda(val)}
                            className="h-5 w-5"
                          />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm text-[#7f8c8d]">
                    <strong className="text-[#2c3e50]">
                      {productosFiltrados.length}
                    </strong>{" "}
                    productos seleccionados para control
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleImprimir}
                    disabled={productosFiltrados.length === 0}
                    className="rounded-2xl border-2 border-[#9b59b6] bg-[#f4ecf7] px-4 py-4 text-left transition hover:bg-[#ebdef0] disabled:opacity-50"
                  >
                    <div className="text-2xl mb-1">🖨️</div>
                    <div className="font-bold text-[#7d3c98]">
                      Imprimir listado
                    </div>
                    <div className="text-xs text-[#7f8c8d] mt-1">
                      Formato compacto A4 con casillas para tildar
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={iniciarConteo}
                    disabled={productosFiltrados.length === 0}
                    className="rounded-2xl border-2 border-[#3498db] bg-[#ebf3fd] px-4 py-4 text-left transition hover:bg-[#d6eaff] disabled:opacity-50"
                  >
                    <div className="text-2xl mb-1">📋</div>
                    <div className="font-bold text-[#2980b9]">
                      Contar en iPad / tablet
                    </div>
                    <div className="text-xs text-[#7f8c8d] mt-1">
                      Tildá lo contado y cargá stock real si hay diferencia
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Conteo iPad */}
      {paso === "conteo" && (
        <>
          <div className="flex-shrink-0 border-b border-[#ecf0f1] bg-white px-4 py-2">
            <div className="mx-auto flex max-w-4xl flex-wrap gap-2">
              <input
                type="search"
                value={busquedaConteo}
                onChange={(e) => setBusquedaConteo(e.target.value)}
                placeholder="Buscar en el conteo..."
                className="min-w-[200px] flex-1 rounded-xl border-2 border-[#ecf0f1] px-3 py-2 text-base focus:border-[#3498db] focus:outline-none"
              />
              <button
                type="button"
                onClick={marcarTodosContados}
                className="rounded-xl border border-[#27ae60] bg-[#d5f4e6] px-3 py-2 text-sm font-semibold text-[#229954]"
              >
                Marcar todos
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 sm:px-4">
            <ul className="mx-auto max-w-4xl space-y-2 pb-32">
              {lineasVisibles.map((linea) => {
                const stockSistema = linea.producto.cantidad;
                const stockRealNum = parseStockReal(
                  linea.stockReal,
                  stockSistema
                );
                const hayDiff =
                  linea.contado && stockRealNum !== stockSistema;

                return (
                  <li
                    key={linea.producto.id}
                    className={`rounded-2xl border-2 bg-white p-3 sm:p-4 transition-colors ${
                      linea.contado
                        ? hayDiff
                          ? "border-[#e67e22] bg-[#fef9f3]"
                          : "border-[#27ae60] bg-[#f8fdf9]"
                        : "border-[#ecf0f1]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleContado(linea.producto.id)}
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 text-xl transition-colors touch-manipulation ${
                          linea.contado
                            ? "border-[#27ae60] bg-[#27ae60] text-white"
                            : "border-[#bdc3c7] bg-white text-transparent"
                        }`}
                        aria-label={
                          linea.contado ? "Contado" : "Marcar como contado"
                        }
                      >
                        ✓
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs font-bold text-[#7f8c8d]">
                            {linea.producto.codigo}
                          </span>
                          {linea.producto.publicarEnCatalogoWeb && (
                            <span className="text-xs">🌐</span>
                          )}
                          <span className="rounded-full bg-[#ecf0f1] px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {linea.producto.categoria}
                          </span>
                        </div>
                        <p className="font-semibold text-[#2c3e50] leading-snug">
                          {linea.producto.producto}
                          {linea.producto.marca && (
                            <span className="font-normal text-[#7f8c8d]">
                              {" "}
                              · {linea.producto.marca}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <div className="text-center">
                          <div className="text-[10px] uppercase text-[#95a5a6]">
                            Sistema
                          </div>
                          <div className="text-lg font-black text-[#2c3e50]">
                            {stockSistema}
                          </div>
                        </div>
                        <div className="text-[#bdc3c7]">→</div>
                        <div className="text-center">
                          <div className="text-[10px] uppercase text-[#95a5a6]">
                            Real
                          </div>
                          <input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={linea.stockReal}
                            onChange={(e) =>
                              actualizarStockReal(
                                linea.producto.id,
                                e.target.value
                              )
                            }
                            onFocus={() => {
                              if (!linea.contado) toggleContado(linea.producto.id);
                            }}
                            className={`w-16 rounded-xl border-2 px-2 py-2 text-center text-lg font-bold focus:outline-none touch-manipulation ${
                              hayDiff
                                ? "border-[#e67e22] bg-[#fdebd0] text-[#d35400]"
                                : "border-[#ecf0f1] bg-[#f8f9fa]"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <footer className="fixed bottom-0 left-0 right-0 border-t border-[#ecf0f1] bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] safe-area-bottom">
            <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="font-bold text-[#27ae60]">
                  {statsConteo.contados}
                </span>{" "}
                contados ·{" "}
                <span className="font-bold text-[#7f8c8d]">
                  {statsConteo.pendientes}
                </span>{" "}
                pendientes
                {statsConteo.diferencias > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="font-bold text-[#e67e22]">
                      {statsConteo.diferencias} diferencias
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={irAResumen}
                disabled={statsConteo.contados === 0}
                className="rounded-xl bg-[#3498db] px-6 py-3 text-base font-bold text-white shadow-lg disabled:opacity-50 touch-manipulation"
              >
                Ver resumen →
              </button>
            </div>
          </footer>
        </>
      )}

      {/* Resumen */}
      {paso === "resumen" && (
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#ecf0f1] bg-white p-4 text-center">
                <div className="text-2xl font-black text-[#3498db]">
                  {statsConteo.total}
                </div>
                <div className="text-xs text-[#7f8c8d]">Total</div>
              </div>
              <div className="rounded-xl border border-[#27ae60]/30 bg-[#d5f4e6] p-4 text-center">
                <div className="text-2xl font-black text-[#27ae60]">
                  {statsConteo.contados}
                </div>
                <div className="text-xs text-[#229954]">Contados</div>
              </div>
              <div className="rounded-xl border border-[#e67e22]/30 bg-[#fdebd0] p-4 text-center">
                <div className="text-2xl font-black text-[#e67e22]">
                  {diferencias.length}
                </div>
                <div className="text-xs text-[#d35400]">Diferencias</div>
              </div>
            </div>

            {statsConteo.pendientes > 0 && (
              <div className="rounded-xl border border-[#f39c12]/30 bg-[#fef3cd] px-4 py-3 text-sm text-[#d68910]">
                ⚠️ Quedan {statsConteo.pendientes} productos sin contar. Podés
                volver y completarlos, o aplicar solo las correcciones detectadas.
              </div>
            )}

            {diferencias.length === 0 ? (
              <div className="rounded-2xl border border-[#27ae60]/30 bg-[#d5f4e6] p-8 text-center">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-bold text-[#229954]">
                  Sin diferencias en lo contado
                </p>
                <p className="text-sm text-[#27ae60] mt-1">
                  El stock real coincide con el sistema
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#ecf0f1] bg-white overflow-hidden">
                <div className="border-b border-[#ecf0f1] px-4 py-3 font-bold">
                  Productos con diferencia
                </div>
                <ul className="divide-y divide-[#ecf0f1]">
                  {diferencias.map((d) => (
                    <li
                      key={d.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs text-[#7f8c8d]">
                          {d.codigo}
                        </div>
                        <div className="font-semibold truncate">{d.producto}</div>
                        <div className="text-xs text-[#95a5a6]">
                          {d.categoria}
                        </div>
                      </div>
                      <div className="text-center text-sm">
                        <div className="text-[#7f8c8d]">Sistema</div>
                        <div className="font-bold">{d.stockSistema}</div>
                      </div>
                      <div className="text-[#bdc3c7]">→</div>
                      <div className="text-center text-sm">
                        <div className="text-[#7f8c8d]">Real</div>
                        <div className="font-bold text-[#e67e22]">
                          {d.stockReal}
                        </div>
                      </div>
                      <div
                        className={`rounded-lg px-2 py-1 text-sm font-bold ${
                          d.diferencia > 0
                            ? "bg-[#d5f4e6] text-[#27ae60]"
                            : "bg-[#fdecea] text-[#e74c3c]"
                        }`}
                      >
                        {d.diferencia > 0 ? "+" : ""}
                        {d.diferencia}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {diferencias.length > 0 && (
                <button
                  type="button"
                  onClick={aplicarCorrecciones}
                  disabled={aplicando}
                  className="flex-1 rounded-xl bg-[#27ae60] px-4 py-3 font-bold text-white disabled:opacity-50 touch-manipulation"
                >
                  {aplicando
                    ? "Aplicando..."
                    : `Aplicar ${diferencias.length} corrección(es)`}
                </button>
              )}
              <button
                type="button"
                onClick={onCerrar}
                className="rounded-xl border-2 border-[#ecf0f1] px-4 py-3 font-semibold hover:bg-white touch-manipulation"
              >
                {diferencias.length > 0 ? "Cerrar sin aplicar" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
