"use client";

import { useEffect, useMemo, useState } from "react";
import { getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import {
  deudaTrabajo,
  gananciaTrabajo,
  totalTrabajo,
} from "@/lib/zingueria/calculos";
import { agruparCronograma, countUrgentes } from "@/lib/zingueria/cronograma";
import { formatMoney } from "@/lib/zingueria/format";
import {
  zClientesCol,
  zMaterialesCol,
  zPagosCol,
  zTrabajosCol,
} from "@/lib/zingueria/paths";
import { ESTADOS_ACTIVOS, type Material, type Trabajo } from "@/lib/zingueria/types";
import { zCard, zColors } from "@/lib/zingueria/ui";

export default function ResumenPage() {
  const { user, perfil } = useZingueriaSession();
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [clientes, setClientes] = useState(0);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [aCobrar, setACobrar] = useState(0);
  const [gananciaPotencial, setGananciaPotencial] = useState(0);

  useEffect(() => {
    if (!user) return;
    const u1 = onSnapshot(
      query(zTrabajosCol(), where("ownerUid", "==", user.uid)),
      async (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Trabajo, "id">),
        }));
        setTrabajos(list);
        let cobrar = 0;
        let gan = 0;
        await Promise.all(
          list.map(async (t) => {
            if (t.estado === "cancelado") return;
            gan += gananciaTrabajo(t);
            if (t.estado === "presupuesto") return;
            const pagosSnap = await getDocs(zPagosCol(t.id));
            const pagos = pagosSnap.docs.map(
              (p) => p.data() as { monto: number }
            );
            cobrar += deudaTrabajo(t, pagos);
          })
        );
        setACobrar(cobrar);
        setGananciaPotencial(gan);
      }
    );
    const u2 = onSnapshot(
      query(zClientesCol(), where("ownerUid", "==", user.uid)),
      (snap) => setClientes(snap.size)
    );
    const u3 = onSnapshot(
      query(zMaterialesCol(), where("ownerUid", "==", user.uid)),
      (snap) =>
        setMateriales(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Material, "id">),
          }))
        )
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [user]);

  const stats = useMemo(() => {
    const activos = trabajos.filter((t) =>
      ESTADOS_ACTIVOS.includes(t.estado)
    ).length;
    const finalizados = trabajos.filter((t) => t.estado === "finalizado").length;
    const facturado = trabajos
      .filter((t) => t.estado !== "cancelado")
      .reduce((acc, t) => acc + totalTrabajo(t), 0);
    const urgentes = countUrgentes(agruparCronograma(trabajos));
    const stockBajo = materiales.filter(
      (m) => m.stock <= (m.stockMinimo || 0)
    ).length;
    const valorStock = materiales.reduce(
      (acc, m) => acc + (m.stock || 0) * (m.precioCosto || 0),
      0
    );
    return {
      activos,
      finalizados,
      facturado,
      urgentes,
      stockBajo,
      valorStock,
    };
  }, [trabajos, materiales]);

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Resumen</h1>
      <p style={{ margin: "0 0 16px", color: zColors.muted, fontSize: 14 }}>
        {perfil?.nombreTaller}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        <Card title="Trabajos activos" value={String(stats.activos)} />
        <Card title="Finalizados" value={String(stats.finalizados)} />
        <Card title="Clientes" value={String(clientes)} />
        <Card title="Urgentes" value={String(stats.urgentes)} warn={stats.urgentes > 0} />
        <Card title="A cobrar" value={formatMoney(aCobrar)} accent />
        <Card title="Facturado" value={formatMoney(stats.facturado)} />
        <Card title="Ganancia pot." value={formatMoney(gananciaPotencial)} />
        <Card title="Valor stock" value={formatMoney(stats.valorStock)} />
        <Card
          title="Stock bajo"
          value={String(stats.stockBajo)}
          warn={stats.stockBajo > 0}
        />
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  accent,
  warn,
}: {
  title: string;
  value: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div style={zCard}>
      <div style={{ fontSize: 12, color: zColors.muted }}>{title}</div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 20,
          marginTop: 6,
          color: warn
            ? zColors.warn
            : accent
              ? zColors.accent
              : zColors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
