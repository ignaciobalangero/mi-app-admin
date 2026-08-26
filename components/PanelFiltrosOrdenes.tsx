"use client";

import type { ReactNode } from "react";

export type EstadoFiltroOrdenes =
  | "TODOS"
  | "PENDIENTE ACEPTACION"
  | "PENDIENTE"
  | "REPARADO"
  | "ENTREGADO"
  | "PAGADO"
  | string;

type EstadoChip = {
  valor: EstadoFiltroOrdenes;
  label: string;
  labelCorto?: string;
};

const INPUT =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-400/25";

type Props = {
  filtroTexto: string;
  setFiltroTexto: (v: string) => void;
  filtroTrabajo: string;
  setFiltroTrabajo: (v: string) => void;
  filtroIMEI: string;
  setFiltroIMEI: (v: string) => void;
  filtroCodigo?: string;
  setFiltroCodigo?: (v: string) => void;
  filtroFechaDesde: string;
  setFiltroFechaDesde: (v: string) => void;
  filtroFechaHasta: string;
  setFiltroFechaHasta: (v: string) => void;
  tipoFecha: "ingreso" | "modificacion";
  setTipoFecha: (v: "ingreso" | "modificacion") => void;
  filtroEstado: EstadoFiltroOrdenes;
  setFiltroEstado: (v: EstadoFiltroOrdenes) => void;
  estados: EstadoChip[];
  accionExtra?: ReactNode;
  mostrarCodigo?: boolean;
};

function ClearBtn({ onClick, show }: { onClick: () => void; show: boolean }) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-400 hover:bg-slate-200/80 hover:text-slate-700"
      aria-label="Limpiar"
    >
      ✕
    </button>
  );
}

/**
 * Panel de filtros unificado (Gestión + Resumen).
 * Estética más limpia: misma altura, chips de estado, fechas compactas.
 */
export default function PanelFiltrosOrdenes({
  filtroTexto,
  setFiltroTexto,
  filtroTrabajo,
  setFiltroTrabajo,
  filtroIMEI,
  setFiltroIMEI,
  filtroCodigo = "",
  setFiltroCodigo,
  filtroFechaDesde,
  setFiltroFechaDesde,
  filtroFechaHasta,
  setFiltroFechaHasta,
  tipoFecha,
  setTipoFecha,
  filtroEstado,
  setFiltroEstado,
  estados,
  accionExtra,
  mostrarCodigo = false,
}: Props) {
  const hayFechas = Boolean(filtroFechaDesde || filtroFechaHasta);

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 text-sm font-bold">
            ⌕
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 sm:text-base">Filtros</h2>
            <p className="hidden text-xs text-slate-500 sm:block">
              Buscá por cliente, modelo, trabajo, IMEI o fechas
            </p>
          </div>
        </div>
        {accionExtra}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Fila de búsquedas */}
        <div
          className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
            mostrarCodigo ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          <div className="relative">
            <input
              type="search"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Cliente o modelo"
              className={`${INPUT} pr-9`}
              autoComplete="off"
            />
            <ClearBtn show={!!filtroTexto} onClick={() => setFiltroTexto("")} />
          </div>
          <div className="relative">
            <input
              type="search"
              value={filtroTrabajo}
              onChange={(e) => setFiltroTrabajo(e.target.value)}
              placeholder="Tipo de trabajo"
              className={`${INPUT} pr-9`}
              autoComplete="off"
            />
            <ClearBtn show={!!filtroTrabajo} onClick={() => setFiltroTrabajo("")} />
          </div>
          <div className="relative">
            <input
              type="search"
              value={filtroIMEI}
              onChange={(e) => setFiltroIMEI(e.target.value)}
              placeholder="IMEI o modelo"
              className={`${INPUT} pr-9`}
              title="Buscar por IMEI o modelo"
              autoComplete="off"
            />
            <ClearBtn show={!!filtroIMEI} onClick={() => setFiltroIMEI("")} />
          </div>
          {mostrarCodigo && setFiltroCodigo ? (
            <div className="relative">
              <input
                type="search"
                value={filtroCodigo}
                onChange={(e) => setFiltroCodigo(e.target.value)}
                placeholder="Código (ej. EO-52348)"
                className={`${INPUT} pr-9`}
                title="Buscar por código de trabajo"
                autoComplete="off"
              />
              <ClearBtn show={!!filtroCodigo} onClick={() => setFiltroCodigo("")} />
            </div>
          ) : null}
        </div>

        {/* Fechas + estados */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 p-1.5">
            <div className="inline-flex rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-slate-200/80">
              <button
                type="button"
                onClick={() => setTipoFecha("ingreso")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tipoFecha === "ingreso"
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Ingreso
              </button>
              <button
                type="button"
                onClick={() => setTipoFecha("modificacion")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  tipoFecha === "modificacion"
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Modificación
              </button>
            </div>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            />
            {hayFechas ? (
              <button
                type="button"
                onClick={() => {
                  setFiltroFechaDesde("");
                  setFiltroFechaHasta("");
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
              >
                Limpiar fechas
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {estados.map((e) => {
              const activo = filtroEstado === e.valor;
              return (
                <button
                  key={e.valor}
                  type="button"
                  onClick={() => setFiltroEstado(e.valor)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                    activo
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/25"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  <span className="sm:hidden">{e.labelCorto || e.label}</span>
                  <span className="hidden sm:inline">{e.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export const ESTADOS_GESTION: EstadoChip[] = [
  { valor: "TODOS", label: "Todos", labelCorto: "Todos" },
  { valor: "PENDIENTE ACEPTACION", label: "Pend. aceptación", labelCorto: "Acept." },
  { valor: "PENDIENTE", label: "Pendiente", labelCorto: "Pend." },
  { valor: "REPARADO", label: "Reparado", labelCorto: "Rep." },
  { valor: "ENTREGADO", label: "Entregado", labelCorto: "Ent." },
  { valor: "PAGADO", label: "Pagado", labelCorto: "Pag." },
];

export const ESTADOS_RESUMEN: EstadoChip[] = [
  { valor: "TODOS", label: "Todos", labelCorto: "Todos" },
  { valor: "PENDIENTE", label: "Pendientes", labelCorto: "Pend." },
  { valor: "REPARADO", label: "Reparados", labelCorto: "Rep." },
  { valor: "ENTREGADO", label: "Entregados", labelCorto: "Ent." },
  { valor: "PAGADO", label: "Pagados", labelCorto: "Pag." },
];
