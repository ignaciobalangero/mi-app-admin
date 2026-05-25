"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import { esSuperAdminUsuario } from "@/lib/superAdminConstants";
import Header from "@/app/Header";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";
import { labelMetodoPago } from "@/lib/tiendaCheckoutOpciones";
import {
  irAVentaDesdePedidoTienda,
  negocioTiendaPanel,
  usePedidosTiendaPendientesVenta,
} from "@/lib/usePedidosTiendaPendientesVenta";

type PedidoConId = PedidoTienda & { id: string };

function fmtFecha(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function badgeEstado(estado: PedidoTienda["estado"]) {
  const map: Record<PedidoTienda["estado"], string> = {
    pendiente: "bg-amber-100 text-amber-900",
    confirmado: "bg-blue-100 text-blue-900",
    enviado: "bg-emerald-100 text-emerald-900",
    cancelado: "bg-neutral-200 text-neutral-600",
  };
  return map[estado] ?? map.pendiente;
}

export default function IphonetecPanelPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { rol, puedeVerPedidosTienda } = useRol();
  const esSuperAdmin = esSuperAdminUsuario(user);
  const tieneAcceso = esSuperAdmin || puedeVerPedidosTienda;

  const negocioId = negocioTiendaPanel(rol?.negocioID, esSuperAdmin);
  const { count: pendientesSinVenta, recargar: recargarPendientes } =
    usePedidosTiendaPendientesVenta(negocioId);

  const [pedidos, setPedidos] = useState<PedidoConId[]>([]);
  const [clientesGestione, setClientesGestione] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"pendientes" | "historial" | "info">("pendientes");

  useEffect(() => {
    if (user && !tieneAcceso) {
      router.replace("/");
    }
  }, [user, tieneAcceso, router]);

  const cargarPedidos = useCallback(async () => {
    if (!user || !negocioId || !tieneAcceso) return;
    setCargando(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/tienda/pedidos/admin?negocioId=${encodeURIComponent(negocioId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudieron cargar los pedidos.");
      }
      const data = await res.json();
      setPedidos(data.pedidos ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar pedidos.");
    } finally {
      setCargando(false);
    }
  }, [user, negocioId, tieneAcceso]);

  useEffect(() => {
    void cargarPedidos();
  }, [cargarPedidos]);

  useEffect(() => {
    if (!rol?.negocioID) return;
    const cargarClientes = async () => {
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/clientes`));
      setClientesGestione(snap.docs.map((d) => String(d.data().nombre ?? "")).filter(Boolean));
    };
    void cargarClientes();
  }, [rol?.negocioID]);

  const sinVenta = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          !p.ventaGeneralId &&
          p.estado !== "cancelado" &&
          (p.estado === "pendiente" || p.estado === "confirmado")
      ),
    [pedidos]
  );

  const historial = useMemo(
    () => pedidos.filter((p) => p.ventaGeneralId || p.estado === "enviado" || p.estado === "cancelado"),
    [pedidos]
  );

  const convertirAVenta = (p: PedidoConId) => {
    irAVentaDesdePedidoTienda(p, negocioId, router);
  };

  if (!tieneAcceso) return null;

  return (
    <>
      <Header />
      <main className="pt-16 sm:pt-20 pb-10 min-h-screen bg-[#f8f9fa] text-[#2c3e50] [color-scheme:light]">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <div className="rounded-2xl bg-white border border-[#ecf0f1] shadow-lg p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <span>🛒</span> iPhoneTEC — Tienda web
                </h1>
                <p className="text-sm text-[#7f8c8d] mt-1">
                  Pedidos de{" "}
                  <a
                    href="https://iphonetec.com.ar"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3498db] hover:underline"
                  >
                    iphonetec.com.ar
                  </a>{" "}
                  · Negocio <strong>{negocioId}</strong>
                </p>
              </div>
              {pendientesSinVenta > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm text-red-800">
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#e74c3c] text-white text-xs font-bold flex items-center justify-center">
                    {pendientesSinVenta}
                  </span>
                  sin registrar en Ventas General
                </span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["pendientes", `Pendientes (${sinVenta.length})`],
                  ["historial", `Historial (${historial.length})`],
                  ["info", "Cómo funciona"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    tab === id
                      ? "bg-[#3498db] text-white"
                      : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
                  }`}
                >
                  {label}
                </button>
              ))}
              <Link
                href={`/ventas/pedidos-tienda?negocioId=${encodeURIComponent(negocioId)}`}
                className="ml-auto text-sm text-[#3498db] hover:underline self-center"
              >
                Vista detallada de pedidos →
              </Link>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {tab === "pendientes" && (
            <section className="space-y-3">
              {cargando ? (
                <p className="text-sm text-[#7f8c8d]">Cargando…</p>
              ) : sinVenta.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#bdc3c7] bg-white p-10 text-center text-[#7f8c8d]">
                  No hay pedidos pendientes de convertir a venta.
                </div>
              ) : (
                sinVenta.map((p) => {
                  const clienteExiste = clientesGestione.some(
                    (c) => c.toLowerCase() === p.cliente.nombre.toLowerCase()
                  );
                  return (
                    <article
                      key={p.id}
                      className="rounded-xl border border-[#ecf0f1] bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-lg font-bold">#{p.numero}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeEstado(p.estado)}`}>
                          {p.estado}
                        </span>
                        <span className="text-xs text-[#7f8c8d]">{fmtFecha(p.creadoEn)}</span>
                        <span className="ml-auto font-bold">
                          ${p.pago.totalConRecargoARS.toLocaleString("es-AR")}
                        </span>
                      </div>
                      <p className="text-sm">
                        <strong>{p.cliente.nombre}</strong> · {p.cliente.email} · {p.cliente.telefono}
                      </p>
                      {!clienteExiste && (
                        <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          El nombre <strong>{p.cliente.nombre}</strong> no coincide con un cliente de Gestione.
                          Creá el cliente en{" "}
                          <Link href="/clientes" className="underline">
                            Clientes
                          </Link>{" "}
                          o usá el mismo nombre al guardar la venta para que impacte la cuenta corriente.
                        </p>
                      )}
                      <ul className="mt-3 text-sm divide-y divide-[#ecf0f1] border border-[#ecf0f1] rounded-lg">
                        {p.lineas.map((l, i) => (
                          <li key={i} className="flex justify-between px-3 py-2">
                            <span>
                              {l.cantidad}x {l.producto}{" "}
                              <span className="text-[#95a5a6]">({l.codigo})</span>
                            </span>
                            <span>${l.subtotalRefARS.toLocaleString("es-AR")}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-[#7f8c8d]">
                        Pago: {labelMetodoPago(p.pago.metodo)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => convertirAVenta(p)}
                          className="rounded-lg bg-[#27ae60] px-4 py-2 text-sm font-semibold text-white hover:bg-[#229954]"
                        >
                          Registrar en Ventas General
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          )}

          {tab === "historial" && (
            <section className="space-y-3">
              {cargando ? (
                <p className="text-sm text-[#7f8c8d]">Cargando…</p>
              ) : historial.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#bdc3c7] bg-white p-10 text-center text-[#7f8c8d]">
                  Todavía no hay pedidos convertidos o cerrados.
                </div>
              ) : (
                historial.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border border-[#ecf0f1] bg-white p-4 shadow-sm text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">#{p.numero}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeEstado(p.estado)}`}>
                        {p.estado}
                      </span>
                      <span className="text-[#7f8c8d]">{fmtFecha(p.creadoEn)}</span>
                      <span className="ml-auto font-semibold">{p.cliente.nombre}</span>
                    </div>
                    <p className="mt-2 text-[#7f8c8d]">
                      Total ${p.pago.totalConRecargoARS.toLocaleString("es-AR")} ·{" "}
                      {labelMetodoPago(p.pago.metodo)}
                    </p>
                    {p.ventaGeneralId ? (
                      <p className="mt-2 text-emerald-700">
                        ✓ Venta registrada en Gestione
                        {p.convertidoEn && ` · ${fmtFecha(p.convertidoEn)}`}
                      </p>
                    ) : (
                      <p className="mt-2 text-[#7f8c8d]">Sin venta vinculada</p>
                    )}
                  </article>
                ))
              )}
            </section>
          )}

          {tab === "info" && (
            <section className="rounded-xl border border-[#ecf0f1] bg-white p-6 shadow-sm space-y-4 text-sm leading-relaxed">
              <h2 className="text-lg font-bold">Flujo recomendado</h2>
              <ol className="list-decimal list-inside space-y-2 text-[#34495e]">
                <li>El cliente compra en la tienda web y se crea un pedido en Firebase.</li>
                <li>
                  En el menú lateral, <strong>Ventas General</strong> muestra un número rojo si hay pedidos sin
                  registrar.
                </li>
                <li>
                  Desde acá o desde Ventas General, abrís el pedido precargado: productos, cliente y observaciones del
                  envío.
                </li>
                <li>
                  Guardás la venta. El pedido queda vinculado y desaparece del contador de pendientes.
                </li>
              </ol>
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
                <h3 className="font-bold text-[#2c3e50] mb-1">Cuenta corriente</h3>
                <p className="text-[#34495e]">
                  Para que el saldo del cliente se actualice, el nombre del pedido debe coincidir con un cliente creado
                  en Gestione (<Link href="/clientes" className="text-[#3498db] underline">Clientes</Link>).
                  Si tenés empleados con clientes asignados, usá ese mismo nombre al registrar la venta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void cargarPedidos();
                  void recargarPendientes();
                }}
                className="rounded-lg border border-[#3498db] px-4 py-2 text-sm font-semibold text-[#3498db]"
              >
                Actualizar datos
              </button>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
