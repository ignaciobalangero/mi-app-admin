"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import {
  cuentaCorriente,
  deudaTrabajo,
  totalPagado,
  totalTrabajo,
} from "@/lib/zingueria/calculos";
import { formatDate, formatMoney } from "@/lib/zingueria/format";
import {
  zClienteRef,
  zPagosCol,
  zTrabajosCol,
} from "@/lib/zingueria/paths";
import {
  ESTADOS_TRABAJO,
  type Cliente,
  type Pago,
  type Trabajo,
} from "@/lib/zingueria/types";
import {
  estadoColor,
  zBtnGhost,
  zCard,
  zColors,
  Spinner,
} from "@/lib/zingueria/ui";

export default function ClienteDetallePage() {
  const { user } = useZingueriaSession();
  const params = useParams();
  const id = String(params?.id || "");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [pagosMap, setPagosMap] = useState<Record<string, Pago[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    const u1 = onSnapshot(zClienteRef(id), (snap) => {
      if (!snap.exists()) {
        setCliente(null);
        setLoading(false);
        return;
      }
      const data = snap.data() as Omit<Cliente, "id">;
      if (data.ownerUid !== user.uid) {
        setCliente(null);
        setLoading(false);
        return;
      }
      setCliente({ id: snap.id, ...data });
      setLoading(false);
    });
    const u2 = onSnapshot(
      query(zTrabajosCol(), where("ownerUid", "==", user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Trabajo, "id">),
          }))
          .filter((t) => t.clienteId === id);
        list.sort((a, b) =>
          String(b.fechaInicio || "").localeCompare(String(a.fechaInicio || ""))
        );
        setTrabajos(list);
      }
    );
    return () => {
      u1();
      u2();
    };
  }, [user, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, Pago[]> = {};
      await Promise.all(
        trabajos.map(async (t) => {
          const snap = await getDocs(zPagosCol(t.id));
          map[t.id] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Pago, "id">),
          }));
        })
      );
      if (!cancelled) setPagosMap(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [trabajos]);

  const cc = useMemo(() => {
    const pagosArr = trabajos.map((t) => pagosMap[t.id] || []);
    return cuentaCorriente(trabajos, pagosArr);
  }, [trabajos, pagosMap]);

  const wa = cliente?.telefono
    ? `https://wa.me/${cliente.telefono.replace(/\D/g, "")}`
    : null;

  if (loading) return <Spinner label="Cargando cliente…" />;
  if (!cliente) {
    return (
      <div>
        <p style={{ color: zColors.muted }}>Cliente no encontrado.</p>
        <Link href="/zingueria/app/clientes" style={{ color: zColors.accent }}>
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/zingueria/app/clientes"
        style={{
          color: zColors.muted,
          textDecoration: "none",
          fontSize: 13,
        }}
      >
        ← Clientes
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          margin: "10px 0 16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{cliente.nombre}</h1>
          <div style={{ color: zColors.muted, fontSize: 13, marginTop: 4 }}>
            {[cliente.telefono, cliente.direccion].filter(Boolean).join(" · ") ||
              "Sin contacto"}
          </div>
          {cliente.notas && (
            <div style={{ fontSize: 13, marginTop: 6, color: zColors.muted }}>
              {cliente.notas}
            </div>
          )}
        </div>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            style={{ ...zBtnGhost, textDecoration: "none" }}
          >
            WhatsApp
          </a>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <Kpi label="Facturado" value={formatMoney(cc.totalFacturado)} />
        <Kpi label="Pagado" value={formatMoney(cc.totalPagado)} />
        <Kpi
          label={cc.saldo > 0 ? "Debe" : "Saldo"}
          value={formatMoney(cc.saldo)}
          accent={cc.saldo > 0}
        />
      </div>

      <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>
        Trabajos ({trabajos.length})
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {trabajos.map((t) => {
          const pagos = pagosMap[t.id] || [];
          const deuda = deudaTrabajo(t, pagos);
          return (
            <Link
              key={t.id}
              href={`/zingueria/app/trabajos/${t.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  ...zCard,
                  borderLeft: `4px solid ${estadoColor(t.estado)}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.titulo}</div>
                    <div style={{ fontSize: 12, color: zColors.muted }}>
                      {formatDate(t.fechaInicio)} ·{" "}
                      {
                        ESTADOS_TRABAJO.find((e) => e.value === t.estado)
                          ?.label
                      }
                    </div>
                    <div style={{ fontSize: 12, color: zColors.muted, marginTop: 4 }}>
                      Total {formatMoney(totalTrabajo(t))} · Pagado{" "}
                      {formatMoney(totalPagado(pagos))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: zColors.muted }}>
                      Saldo
                    </div>
                    <div
                      style={{
                        fontWeight: 800,
                        color: deuda > 0 ? zColors.accent : zColors.ok,
                      }}
                    >
                      {formatMoney(deuda)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
        {!trabajos.length && (
          <p style={{ color: zColors.muted }}>Sin trabajos todavía.</p>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div style={zCard}>
      <div style={{ fontSize: 11, color: zColors.muted }}>{label}</div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 15,
          color: accent ? zColors.accent : zColors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
