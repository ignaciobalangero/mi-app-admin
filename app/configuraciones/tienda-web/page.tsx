"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import { esSuperAdminUsuario } from "@/lib/superAdminConstants";
import { useRouter } from "next/navigation";
import Header from "@/app/Header";
import {
  DEFAULT_TIENDA_WEB_CHECKOUT,
  nuevoTransportistaConfig,
  type TiendaWebCheckoutConfig,
  type TransportistaConfig,
} from "@/lib/tiendaWebConfigTypes";

const inputCls =
  "rounded-lg border border-[#bdc3c7] bg-white px-3 py-2 text-sm text-[#2c3e50] placeholder:text-[#95a5a6] focus:border-[#3498db] focus:ring-2 focus:ring-[#3498db]/20";

export default function ConfigTiendaWebPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { rol } = useRol();
  const params = useSearchParams();
  const esSuperAdmin = esSuperAdminUsuario(user);

  const [negocioId, setNegocioId] = useState("");
  const [config, setConfig] = useState<TiendaWebCheckoutConfig>({ ...DEFAULT_TIENDA_WEB_CHECKOUT });
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && !esSuperAdmin) {
      router.replace("/configuraciones");
    }
  }, [user, esSuperAdmin, router]);

  useEffect(() => {
    const fromQuery = params.get("negocioId")?.trim();
    const id = fromQuery || rol?.negocioID || (esSuperAdmin ? "iphonetec" : "");
    if (id) setNegocioId(id);
  }, [params, rol?.negocioID, esSuperAdmin]);

  const cargar = useCallback(async () => {
    if (!user || !negocioId || !esSuperAdmin) return;
    setCargando(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/tienda/config/admin?negocioId=${encodeURIComponent(negocioId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo cargar.");
      setConfig(data.config);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setCargando(false);
    }
  }, [user, negocioId, esSuperAdmin]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!user || !negocioId) return;
    setGuardando(true);
    setMensaje("");
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/tienda/config/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ negocioId, config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar.");
      setConfig(data.config);
      setMensaje("Configuración guardada.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const actualizarTransportista = (idx: number, patch: Partial<TransportistaConfig>) => {
    setConfig((prev) => ({
      ...prev,
      transportistas: prev.transportistas.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  };

  const agregarTransportista = () => {
    const label = nuevoCorreo.trim();
    if (!label) return;
    setConfig((prev) => ({
      ...prev,
      transportistas: [...prev.transportistas, nuevoTransportistaConfig(label)],
    }));
    setNuevoCorreo("");
  };

  const quitarTransportista = (idx: number) => {
    setConfig((prev) => ({
      ...prev,
      transportistas: prev.transportistas.filter((_, i) => i !== idx),
    }));
  };

  const agregarValorDeclarado = () => {
    const n = Number(nuevoValor);
    if (!Number.isFinite(n) || n <= 0 || n > 100) return;
    if (config.valoresDeclarados.includes(n)) return;
    setConfig((prev) => ({
      ...prev,
      valoresDeclarados: [...prev.valoresDeclarados, n].sort((a, b) => a - b),
    }));
    setNuevoValor("");
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>Iniciá sesión en Gestione para configurar la tienda web.</p>
      </div>
    );
  }

  if (!esSuperAdmin) {
    return (
      <>
        <Header />
        <main className="pt-16 bg-[#f8f9fa] min-h-screen text-black [color-scheme:light]">
          <div className="p-8 text-center text-sm text-[#7f8c8d]">
            Esta configuración es solo para el superadmin de la plataforma.
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16 bg-[#f8f9fa] min-h-screen text-black [color-scheme:light]">
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/configuraciones" className="text-xs text-[#3498db] hover:underline">
              ← Configuraciones
            </Link>
            <h1 className="mt-1 text-2xl font-bold text-[#2c3e50]">Checkout de la tienda web</h1>
            <p className="text-sm text-[#7f8c8d]">
              Transportistas, valores declarados, CBU y métodos de pago que ven los clientes al comprar.
            </p>
          </div>
          <Link
            href={`/ventas/pedidos-tienda${negocioId ? `?negocioId=${encodeURIComponent(negocioId)}` : ""}`}
            className="rounded-lg bg-[#3498db] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2980b9]"
          >
            Ver pedidos web →
          </Link>
        </div>

        {esSuperAdmin && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label className="block text-xs font-semibold text-amber-900 mb-1">Negocio (superadmin)</label>
            <input
              value={negocioId}
              onChange={(e) => setNegocioId(e.target.value.trim())}
              onBlur={() => void cargar()}
              className={`w-full max-w-xs ${inputCls} border-amber-300`}
              placeholder="iphonetec"
            />
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-[#7f8c8d]">Cargando…</p>
        ) : (
          <>
            {/* Transportistas / correos */}
            <section className="rounded-xl border border-[#ecf0f1] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#2c3e50] mb-1">Transportistas (correos)</h2>
              <p className="text-xs text-[#7f8c8d] mb-4">
                Opciones que el cliente elige al hacer envío. Podés cambiar el nombre, desactivar o agregar nuevos.
              </p>
              <div className="space-y-3">
                {config.transportistas.map((t, idx) => (
                  <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#ecf0f1] p-3">
                    <input
                      value={t.label}
                      onChange={(e) => actualizarTransportista(idx, { label: e.target.value })}
                      className={`flex-1 min-w-[140px] ${inputCls}`}
                    />
                    <span className="text-xs text-[#95a5a6]">id: {t.id}</span>
                    <label className="flex items-center gap-1 text-xs text-[#2c3e50]">
                      <input
                        type="checkbox"
                        checked={t.activo}
                        onChange={(e) => actualizarTransportista(idx, { activo: e.target.checked })}
                      />
                      Activo
                    </label>
                    <button
                      type="button"
                      onClick={() => quitarTransportista(idx)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <input
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  placeholder="Nombre nuevo transportista (ej. Correo Argentino)"
                  className={`flex-1 min-w-[200px] ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={agregarTransportista}
                  className="rounded-lg bg-[#2ecc71] px-4 py-2 text-sm font-semibold text-white"
                >
                  + Agregar
                </button>
              </div>
            </section>

            {/* Valores declarados */}
            <section className="rounded-xl border border-[#ecf0f1] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#2c3e50] mb-4">Valores declarados (%)</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {config.valoresDeclarados.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ecf0f1] px-3 py-1 text-sm font-semibold"
                  >
                    {v}%
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          valoresDeclarados: prev.valoresDeclarados.filter((x) => x !== v),
                        }))
                      }
                      className="text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={nuevoValor}
                  onChange={(e) => setNuevoValor(e.target.value)}
                  placeholder="Ej. 25"
                  className={`w-24 ${inputCls}`}
                />
                <button
                  type="button"
                  onClick={agregarValorDeclarado}
                  className="rounded-lg border border-[#3498db] px-3 py-2 text-sm text-[#3498db]"
                >
                  Agregar %
                </button>
              </div>
            </section>

            {/* Transferencia */}
            <section className="rounded-xl border border-[#ecf0f1] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#2c3e50] mb-4">Datos de transferencia bancaria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(
                  [
                    ["titular", "Titular de la cuenta"],
                    ["banco", "Banco"],
                    ["cbu", "CBU (22 dígitos)"],
                    ["alias", "Alias"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-[#2c3e50] mb-1">{label}</label>
                    <input
                      value={config.transferencia[key]}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          transferencia: { ...prev.transferencia, [key]: e.target.value },
                        }))
                      }
                      className={`w-full ${inputCls}`}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#2c3e50] mb-1">Instrucciones al cliente</label>
                  <textarea
                    value={config.transferencia.instrucciones}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        transferencia: { ...prev.transferencia, instrucciones: e.target.value },
                      }))
                    }
                    rows={2}
                    className={`w-full ${inputCls} resize-y`}
                  />
                </div>
              </div>
            </section>

            {/* Métodos de pago */}
            <section className="rounded-xl border border-[#ecf0f1] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#2c3e50] mb-4">Métodos de pago</h2>
              <div className="space-y-3">
                {config.metodosPago.map((m, idx) => (
                  <div key={m.id} className="rounded-lg border border-[#ecf0f1] p-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                    <input
                      value={m.label}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          metodosPago: prev.metodosPago.map((x, i) =>
                            i === idx ? { ...x, label: e.target.value } : x
                          ),
                        }))
                      }
                      className={`md:col-span-2 ${inputCls}`}
                    />
                    <label className="flex items-center gap-2 text-sm text-[#2c3e50]">
                      Recargo %
                      <input
                        type="number"
                        min={0}
                        value={m.recargoPct}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            metodosPago: prev.metodosPago.map((x, i) =>
                              i === idx ? { ...x, recargoPct: Math.max(0, Number(e.target.value) || 0) } : x
                            ),
                          }))
                        }
                        className={`w-16 ${inputCls} px-2 py-1`}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#2c3e50]">
                      <input
                        type="checkbox"
                        checked={m.activo}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            metodosPago: prev.metodosPago.map((x, i) =>
                              i === idx ? { ...x, activo: e.target.checked } : x
                            ),
                          }))
                        }
                      />
                      Activo
                    </label>
                  </div>
                ))}
              </div>
            </section>

            {mensaje && <p className="text-sm text-emerald-700">{mensaje}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={guardando}
              onClick={() => void guardar()}
              className="w-full rounded-xl bg-[#3498db] py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando…" : "Guardar configuración"}
            </button>
          </>
        )}
      </div>
      </main>
    </>
  );
}
