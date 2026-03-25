"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";

export type CuentaNegocio = {
  uid: string;
  email: string;
  rol: string;
  nombre: string;
  fechaCreacion: string | null;
  creadoPor: string | null;
};

type Counts = {
  admin: number;
  empleado: number;
  cliente: number;
  otros: number;
};

type Props = {
  refreshKey?: number;
  compacto?: boolean;
  /** Nombre comercial del negocio (pantalla admin local) */
  nombreNegocioLocal?: string;
  /** ID del negocio actual (admin / empleado local) */
  negocioIdLocal?: string;
};

function etiquetaRol(rol: string) {
  if (rol === "admin") return "Administrador";
  if (rol === "empleado") return "Empleado";
  if (rol === "cliente") return "Cliente (portal)";
  return rol || "—";
}

function chipRolClass(rol: string) {
  if (rol === "admin") return "bg-violet-100 text-violet-900 border-violet-200";
  if (rol === "empleado") return "bg-sky-100 text-sky-900 border-sky-200";
  if (rol === "cliente") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function TablaCuentas({
  filas,
  compacto,
}: {
  filas: CuentaNegocio[];
  compacto: boolean;
}) {
  if (filas.length === 0) {
    return <p className="py-2 text-sm text-slate-500">Ninguna cuenta en esta categoría.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600">
          <tr>
            <th className="px-3 py-2">Rol</th>
            <th className="px-3 py-2">Nombre</th>
            <th className="px-3 py-2">Email</th>
            {!compacto && (
              <>
                <th className="hidden px-3 py-2 md:table-cell">Alta</th>
                <th className="hidden px-3 py-2 lg:table-cell">Creado por</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {filas.map((u) => (
            <tr key={u.uid} className="hover:bg-slate-50/80">
              <td className="px-3 py-2">
                <span
                  className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${chipRolClass(u.rol)}`}
                >
                  {etiquetaRol(u.rol)}
                </span>
              </td>
              <td className="px-3 py-2 font-medium text-slate-900">{u.nombre || "—"}</td>
              <td className="px-3 py-2 break-all text-slate-700">{u.email || "—"}</td>
              {!compacto && (
                <>
                  <td className="hidden px-3 py-2 text-xs text-slate-600 md:table-cell">
                    {u.fechaCreacion
                      ? new Date(u.fechaCreacion).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td className="hidden max-w-[180px] break-all px-3 py-2 text-xs text-slate-600 lg:table-cell">
                    {u.creadoPor || "—"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PanelCuentasNegocio({
  refreshKey = 0,
  compacto = false,
  nombreNegocioLocal,
  negocioIdLocal,
}: Props) {
  const [user] = useAuthState(auth);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<CuentaNegocio[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;

    setCargando(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/usuarios-negocio", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo cargar el listado");
        setUsuarios([]);
        setCounts(null);
        return;
      }
      setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
      setCounts(data.counts ?? null);
    } catch (e) {
      console.error(e);
      setError("Error de red al cargar cuentas");
      setUsuarios([]);
      setCounts(null);
    } finally {
      setCargando(false);
    }
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  const equipo = useMemo(
    () => usuarios.filter((u) => u.rol === "admin" || u.rol === "empleado"),
    [usuarios]
  );
  const clientesPortal = useMemo(() => usuarios.filter((u) => u.rol === "cliente"), [usuarios]);
  const otros = useMemo(
    () => usuarios.filter((u) => u.rol !== "admin" && u.rol !== "empleado" && u.rol !== "cliente"),
    [usuarios]
  );

  const tituloNegocio =
    [nombreNegocioLocal, negocioIdLocal].filter(Boolean).join(" · ") || null;

  if (!user) return null;

  return (
    <div
      className={
        compacto
          ? "mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
          : "rounded-2xl border border-[#ecf0f1] bg-white p-5 shadow-sm"
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            className={
              compacto
                ? "text-base font-bold text-slate-800"
                : "text-lg font-bold text-[#2c3e50]"
            }
          >
            Cuentas de acceso del negocio
          </h3>
          <p className="text-xs text-slate-600">
            Administradores, empleados y clientes con login al portal, de este negocio.
          </p>
          {tituloNegocio && (
            <p className="mt-1 text-sm font-semibold text-slate-800">{tituloNegocio}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => cargar()}
          disabled={cargando}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {cargando ? "Cargando…" : "Actualizar"}
        </button>
      </div>

      {counts && (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-semibold text-violet-900">
            Admin: {counts.admin}
          </span>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-900">
            Empleados: {counts.empleado}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-900">
            Clientes (portal): {counts.cliente}
          </span>
          {counts.otros > 0 && (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-semibold text-slate-800">
              Otros: {counts.otros}
            </span>
          )}
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {cargando && usuarios.length === 0 && !error ? (
        <p className="text-sm text-slate-500">Cargando cuentas…</p>
      ) : usuarios.length === 0 && !error ? (
        <p className="text-sm text-slate-500">No hay usuarios listados para este negocio.</p>
      ) : (
        <div className="space-y-8">
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-900">Equipo</span>
              Administrador y empleados
              <span className="font-normal text-slate-500">({equipo.length})</span>
            </h4>
            <TablaCuentas filas={equipo} compacto={compacto} />
          </div>
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-900">Portal</span>
              Cuentas de cliente
              <span className="font-normal text-slate-500">({clientesPortal.length})</span>
            </h4>
            <TablaCuentas filas={clientesPortal} compacto={compacto} />
          </div>
          {otros.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold text-amber-900">Otros roles</h4>
              <TablaCuentas filas={otros} compacto={compacto} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
