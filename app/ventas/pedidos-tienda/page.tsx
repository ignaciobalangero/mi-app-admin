"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import { esSuperAdminUsuario } from "@/lib/superAdminConstants";
import Header from "@/app/Header";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";
import { labelMetodoPago } from "@/lib/tiendaCheckoutOpciones";
import { irAVentaDesdePedidoTienda } from "@/lib/usePedidosTiendaPendientesVenta";

type PedidoConId = PedidoTienda & { id: string };

const ESTADOS: { id: PedidoTienda["estado"]; label: string; color: string }[] = [
  { id: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-900" },
  { id: "confirmado", label: "Confirmado", color: "bg-blue-100 text-blue-900" },
  { id: "enviado", label: "Enviado", color: "bg-emerald-100 text-emerald-900" },
  { id: "cancelado", label: "Cancelado", color: "bg-neutral-200 text-neutral-600" },
];

function badgeEstado(estado: PedidoTienda["estado"]) {
  const e = ESTADOS.find((x) => x.id === estado);
  return e ?? ESTADOS[0];
}

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

export default function PedidosTiendaPage() {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const { rol, puedeVerPedidosTienda } = useRol();
  const params = useSearchParams();
  const esSuperAdmin = esSuperAdminUsuario(user);
  const tieneAcceso = esSuperAdmin || puedeVerPedidosTienda;

  const [negocioId, setNegocioId] = useState("");
  const [pedidos, setPedidos] = useState<PedidoConId[]>([]);
  const [pendientes, setPendientes] = useState(0);
  const [filtro, setFiltro] = useState<string>("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && !tieneAcceso) {
      router.replace("/");
    }
  }, [user, tieneAcceso, router]);

  useEffect(() => {
    const fromQuery = params.get("negocioId")?.trim();
    const id = fromQuery || rol?.negocioID || (esSuperAdmin ? "iphonetec" : "");
    if (id) setNegocioId(id);
  }, [params, rol?.negocioID, esSuperAdmin]);

  const cargar = useCallback(async () => {
    if (!user || !negocioId || !tieneAcceso) return;
    setCargando(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const q = filtro ? `&estado=${encodeURIComponent(filtro)}` : "";
      const res = await fetch(
        `/api/tienda/pedidos/admin?negocioId=${encodeURIComponent(negocioId)}${q}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron cargar los pedidos.");
      setPedidos(data.pedidos ?? []);
      setPendientes(data.pendientes ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setCargando(false);
    }
  }, [user, negocioId, filtro, tieneAcceso]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiarEstado = async (pedidoId: string, estado: PedidoTienda["estado"]) => {
    if (!user || !negocioId) return;
    setActualizando(pedidoId);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/tienda/pedidos/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ negocioId, pedidoId, estado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar.");
      await cargar();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al actualizar.");
    } finally {
      setActualizando(null);
    }
  };

  const copiarEtiqueta = (p: PedidoConId) => {
    const d = p.envio.direccion;
    const lineas = [
      `Pedido #${p.numero}`,
      `Cliente: ${p.cliente.nombre}`,
      `Tel: ${p.cliente.telefono}`,
      `Email: ${p.cliente.email}`,
      p.envio.tipo === "retiro_deposito"
        ? "Retiro en depósito"
        : [
            `Transportista: ${p.envio.transportista ?? "—"}`,
            d
              ? `${d.calle} ${d.numero}${d.pisoDepto ? ` ${d.pisoDepto}` : ""}, ${d.localidad}, ${d.provincia} CP ${d.codigoPostal}`
              : "",
            d ? `Recibe: ${d.nombreRecepcion} · ${d.telefono}` : "",
            p.envio.valorDeclaradoPct != null
              ? `Valor declarado: ${p.envio.valorDeclaradoPct}% ($${(p.envio.valorDeclaradoARS ?? 0).toLocaleString("es-AR")})`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
      "",
      "Productos:",
      ...p.lineas.map(
        (l) => `${l.cantidad}x ${l.producto} (${l.codigo}) — $${l.subtotalRefARS.toLocaleString("es-AR")}`
      ),
      "",
      `Total ref: $${p.totalRefARS.toLocaleString("es-AR")}`,
      `Pago: ${labelMetodoPago(p.pago.metodo)} — $${p.pago.totalConRecargoARS.toLocaleString("es-AR")}`,
    ];
    void navigator.clipboard.writeText(lineas.join("\n"));
  };

  if (!user || !tieneAcceso) {
    return (
      <>
        <Header />
        <main className="pt-16 bg-[#f8f9fa] min-h-screen text-black [color-scheme:light]">
          <div className="p-8 text-center text-sm text-[#7f8c8d]">
            No tenés permiso para ver pedidos de la tienda web.
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-16 bg-[#f8f9fa] min-h-screen text-black [color-scheme:light]">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#2c3e50]">Pedidos tienda web</h1>
            <p className="text-sm text-[#7f8c8d]">
              Pedidos que completan los clientes en la tienda online. Prepará envíos y actualizá el estado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {esSuperAdmin && (
              <Link
                href={`/configuraciones/tienda-web${negocioId ? `?negocioId=${encodeURIComponent(negocioId)}` : ""}`}
                className="rounded-lg border border-[#3498db] px-3 py-2 text-sm text-[#3498db] hover:bg-blue-50"
              >
                Config. checkout
              </Link>
            )}
            <button
              type="button"
              onClick={() => void cargar()}
              className="rounded-lg bg-[#3498db] px-3 py-2 text-sm font-semibold text-white"
            >
              Actualizar
            </button>
          </div>
        </div>

        {esSuperAdmin && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <label className="text-xs font-semibold text-amber-900">Negocio</label>
            <input
              value={negocioId}
              onChange={(e) => setNegocioId(e.target.value.trim())}
              onBlur={() => void cargar()}
              className="mt-1 block w-full max-w-xs rounded-lg border border-amber-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            {pendientes} pendiente{pendientes !== 1 ? "s" : ""}
          </span>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="rounded-lg border border-[#bdc3c7] bg-white px-3 py-2 text-sm text-[#2c3e50]"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {cargando ? (
          <p className="text-sm text-[#7f8c8d]">Cargando pedidos…</p>
        ) : pedidos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#bdc3c7] bg-white p-10 text-center text-[#7f8c8d]">
            No hay pedidos web todavía.
          </div>
        ) : (
          <ul className="space-y-3">
            {pedidos.map((p) => {
              const badge = badgeEstado(p.estado);
              const abierto = expandido === p.id;
              return (
                <li key={p.id} className="rounded-xl border border-[#ecf0f1] bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandido(abierto ? null : p.id)}
                    className="flex w-full flex-wrap items-center gap-3 p-4 text-left hover:bg-[#f8f9fa]"
                  >
                    <span className="text-lg font-bold text-[#2c3e50]">#{p.numero}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-sm text-[#2c3e50]">{p.cliente.nombre}</span>
                    <span className="text-xs text-[#7f8c8d]">{fmtFecha(p.creadoEn)}</span>
                    <span className="ml-auto text-sm font-bold text-[#2c3e50]">
                      ${p.pago.totalConRecargoARS.toLocaleString("es-AR")}
                    </span>
                  </button>

                  {abierto && (
                    <div className="border-t border-[#ecf0f1] p-4 space-y-4 bg-[#fafafa]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-bold text-[#2c3e50] mb-1">Cliente</h4>
                          <p>{p.cliente.nombre}</p>
                          <p className="text-[#7f8c8d]">{p.cliente.email}</p>
                          <p className="text-[#7f8c8d]">Tel: {p.cliente.telefono}</p>
                          {p.cliente.dniCuit && <p className="text-[#7f8c8d]">DNI/CUIT: {p.cliente.dniCuit}</p>}
                        </div>
                        <div>
                          <h4 className="font-bold text-[#2c3e50] mb-1">Envío</h4>
                          {p.envio.tipo === "retiro_deposito" ? (
                            <p>Retiro en depósito</p>
                          ) : (
                            <>
                              <p>Transportista: <strong>{p.envio.transportista ?? "—"}</strong></p>
                              {p.envio.valorDeclaradoPct != null && (
                                <p>
                                  Valor declarado: {p.envio.valorDeclaradoPct}% ($
                                  {(p.envio.valorDeclaradoARS ?? 0).toLocaleString("es-AR")})
                                </p>
                              )}
                              {p.envio.direccion && (
                                <p className="mt-1 text-[#7f8c8d]">
                                  {p.envio.direccion.calle} {p.envio.direccion.numero}
                                  {p.envio.direccion.pisoDepto ? `, ${p.envio.direccion.pisoDepto}` : ""}
                                  <br />
                                  {p.envio.direccion.localidad}, {p.envio.direccion.provincia} (CP{" "}
                                  {p.envio.direccion.codigoPostal})
                                  <br />
                                  Recibe: {p.envio.direccion.nombreRecepcion} · {p.envio.direccion.telefono}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-[#2c3e50] mb-2">Productos</h4>
                        <ul className="divide-y divide-[#ecf0f1] rounded-lg border border-[#ecf0f1] bg-white text-sm">
                          {p.lineas.map((l, i) => (
                            <li key={i} className="flex justify-between gap-2 px-3 py-2">
                              <span>
                                {l.cantidad}x {l.producto}{" "}
                                <span className="text-[#95a5a6]">({l.codigo})</span>
                              </span>
                              <span className="font-semibold">${l.subtotalRefARS.toLocaleString("es-AR")}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-sm">
                          Pago: {labelMetodoPago(p.pago.metodo)} · Total ref ${p.totalRefARS.toLocaleString("es-AR")}
                          {p.pago.recargoPct > 0 && (
                            <> · Con recargo ${p.pago.totalConRecargoARS.toLocaleString("es-AR")}</>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!p.ventaGeneralId &&
                          p.estado !== "cancelado" &&
                          (p.estado === "pendiente" || p.estado === "confirmado") && (
                            <button
                              type="button"
                              onClick={() => irAVentaDesdePedidoTienda(p, negocioId, router)}
                              className="rounded-lg bg-[#27ae60] px-3 py-2 text-xs font-semibold text-white"
                            >
                              Registrar en Ventas General
                            </button>
                          )}
                        {p.ventaGeneralId && (
                          <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                            Venta vinculada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => copiarEtiqueta(p)}
                          className="rounded-lg border border-[#3498db] px-3 py-2 text-xs font-semibold text-[#3498db]"
                        >
                          Copiar datos para etiqueta
                        </button>
                        {p.estado === "pendiente" && (
                          <button
                            type="button"
                            disabled={actualizando === p.id}
                            onClick={() => void cambiarEstado(p.id, "confirmado")}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Confirmar pedido
                          </button>
                        )}
                        {(p.estado === "pendiente" || p.estado === "confirmado") && (
                          <button
                            type="button"
                            disabled={actualizando === p.id}
                            onClick={() => void cambiarEstado(p.id, "enviado")}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Marcar enviado
                          </button>
                        )}
                        {p.estado !== "cancelado" && p.estado !== "enviado" && (
                          <button
                            type="button"
                            disabled={actualizando === p.id}
                            onClick={() => void cambiarEstado(p.id, "cancelado")}
                            className="rounded-lg bg-neutral-500 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </main>
    </>
  );
}
