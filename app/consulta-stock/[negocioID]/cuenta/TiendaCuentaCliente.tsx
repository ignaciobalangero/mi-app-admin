"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/auth";
import type { PedidoTienda } from "@/lib/tiendaClienteTypes";
import { labelMetodoPago, labelTransportista } from "@/lib/tiendaCheckoutOpciones";
import { useTiendaCliente } from "../../hooks/useTiendaCliente";
import TiendaAuthShell from "../../components/TiendaAuthShell";

export default function TiendaCuentaCliente({ negocioID }: { negocioID: string }) {
  const router = useRouter();
  const { user, perfil, cargando, esClienteTienda, getToken } = useTiendaCliente(negocioID);
  const [pedidos, setPedidos] = useState<PedidoTienda[]>([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);

  const cargarPedidos = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setCargandoPedidos(true);
    try {
      const res = await fetch(`/api/tienda/pedidos?negocioId=${encodeURIComponent(negocioID)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPedidos(data.pedidos ?? []);
      }
    } finally {
      setCargandoPedidos(false);
    }
  }, [getToken, negocioID]);

  useEffect(() => {
    if (esClienteTienda) void cargarPedidos();
  }, [esClienteTienda, cargarPedidos]);

  useEffect(() => {
    if (!cargando && !user) {
      router.replace(`/consulta-stock/${negocioID}/login`);
    }
  }, [cargando, user, negocioID, router]);

  const salir = async () => {
    await signOut(auth);
    router.push(`/consulta-stock/${negocioID}`);
  };

  if (cargando || !esClienteTienda) {
    return (
      <TiendaAuthShell negocioID={negocioID} titulo="Mi cuenta">
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2563eb] border-t-transparent" />
        </div>
      </TiendaAuthShell>
    );
  }

  return (
    <TiendaAuthShell negocioID={negocioID} titulo="Mi cuenta">
      <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Mi cuenta</h1>
          <p className="text-sm text-neutral-600">{perfil?.nombre}</p>
          <p className="text-xs text-neutral-500">{perfil?.email}</p>
        </div>
        <button type="button" onClick={() => void salir()} className="text-xs font-semibold text-red-600 hover:underline">
          Cerrar sesión
        </button>
      </div>

      <section className="mb-8 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-neutral-900">Datos de contacto</h2>
        <p className="text-sm text-neutral-700">Tel: {perfil?.telefono}</p>
        {perfil?.dniCuit && <p className="text-sm text-neutral-700">DNI/CUIT: {perfil.dniCuit}</p>}
        {(perfil?.direcciones?.length ?? 0) > 0 && (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <p className="mb-2 text-xs font-semibold text-neutral-500">Direcciones guardadas</p>
            {perfil!.direcciones.map((d) => (
              <p key={d.id} className="text-xs text-neutral-600">
                <strong>{d.etiqueta}:</strong> {d.calle} {d.numero}, {d.localidad}
              </p>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-neutral-900">Historial de pedidos</h2>
        {cargandoPedidos ? (
          <p className="text-sm text-neutral-500">Cargando…</p>
        ) : pedidos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-500">
            Todavía no hiciste pedidos.
          </p>
        ) : (
          <ul className="space-y-3">
            {pedidos.map((p) => (
              <li key={p.id} className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setExpandido(expandido === p.id ? null : p.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-neutral-900">Pedido #{p.numero}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(p.creadoEn).toLocaleDateString("es-AR")} · {p.estado}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#00a650]">
                    ${p.pago.totalConRecargoARS.toLocaleString("es-AR")}
                  </span>
                </button>
                {expandido === p.id && (
                  <div className="border-t border-neutral-100 px-4 py-3 text-xs text-neutral-700">
                    <p className="mb-2">
                      <strong>Envío:</strong>{" "}
                      {p.envio.tipo === "retiro_deposito"
                        ? "Retiro en depósito"
                        : `${labelTransportista(p.envio.transportista)} · Declarado ${p.envio.valorDeclaradoPct}%`}
                    </p>
                    <p className="mb-2">
                      <strong>Pago:</strong> {labelMetodoPago(p.pago.metodo)}
                    </p>
                    <ul className="space-y-1">
                      {p.lineas.map((l, i) => (
                        <li key={i}>
                          {l.cantidad}× {l.producto} ({l.codigo}) — ${l.subtotalRefARS.toLocaleString("es-AR")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center">
        <Link href={`/consulta-stock/${negocioID}`} className="text-sm font-semibold text-[#2563eb] hover:underline">
          ← Seguir comprando
        </Link>
      </p>
      </div>
    </TiendaAuthShell>
  );
}
