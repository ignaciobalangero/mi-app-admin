"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import {
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import {
  configToParams,
  defaultConfigDoc,
  fracToPctInput,
  pctInputToFrac,
} from "@/lib/zingueria/config";
import { zConfigRef, zMaterialesCol } from "@/lib/zingueria/paths";
import type { Material, ZingueriaConfig } from "@/lib/zingueria/types";
import {
  Spinner,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

interface FormState {
  pctDiseno: number;
  pctManoObra: number;
  pctManoObraBabetas: number;
  pctRecargoPublico: number;
  pctRecargoPublicoPlegadosVarios: number;
  pctListaRioCuarto: number;
  pctListaRioCuartoTubos: number;
  pctColocacionBase: number;
  pctIva: number;
  redondearCortes: boolean;
  materialReferenciaColocacionId: string;
  canaletasPb: number;
  canaletasPaMult: number;
  canosPb: number;
  canosPaMult: number;
  babetasPb: number;
  babetasPaMult: number;
  cenefasPb: number;
  cenefasPaMult: number;
}

function toForm(cfg: Partial<ZingueriaConfig> | null): FormState {
  const p = configToParams(cfg);
  const f = p.factoresColocacion;
  return {
    pctDiseno: fracToPctInput(p.pctDiseno),
    pctManoObra: fracToPctInput(p.pctManoObra),
    pctManoObraBabetas: fracToPctInput(p.pctManoObraBabetas),
    pctRecargoPublico: fracToPctInput(p.pctRecargoPublico),
    pctRecargoPublicoPlegadosVarios: fracToPctInput(
      p.pctRecargoPublicoPlegadosVarios
    ),
    pctListaRioCuarto: fracToPctInput(p.pctListaRioCuarto),
    pctListaRioCuartoTubos: fracToPctInput(p.pctListaRioCuartoTubos),
    pctColocacionBase: fracToPctInput(p.pctColocacionBase),
    pctIva: fracToPctInput(p.pctIva),
    redondearCortes: p.redondearCortes,
    materialReferenciaColocacionId:
      cfg?.materialReferenciaColocacionId || "",
    canaletasPb: f.canaletasPb,
    canaletasPaMult: f.canaletasPaMult,
    canosPb: f.canosPb,
    canosPaMult: f.canosPaMult,
    babetasPb: f.babetasPb,
    babetasPaMult: f.babetasPaMult,
    cenefasPb: f.cenefasPb,
    cenefasPaMult: f.cenefasPaMult,
  };
}

export default function AjustesPage() {
  const { user } = useZingueriaSession();
  const [form, setForm] = useState<FormState | null>(null);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    const uCfg = onSnapshot(zConfigRef(user.uid), (snap) => {
      setForm((prev) =>
        prev ? prev : toForm(snap.exists() ? (snap.data() as ZingueriaConfig) : null)
      );
    });
    const uMat = onSnapshot(
      query(zMaterialesCol(), where("ownerUid", "==", user.uid)),
      (s) =>
        setMateriales(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Material, "id">) }))
        )
    );
    return () => {
      uCfg();
      uMat();
    };
  }, [user]);

  const referencias = materiales.filter(
    (m) => m.tipoCalculo === "plegado" && m.categoria === "canaleta"
  );

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!user || !form) return;
    setGuardando(true);
    setMsg("");
    try {
      await setDoc(
        zConfigRef(user.uid),
        {
          ...defaultConfigDoc(user.uid),
          ownerUid: user.uid,
          pctDiseno: pctInputToFrac(form.pctDiseno),
          pctManoObra: pctInputToFrac(form.pctManoObra),
          pctManoObraBabetas: pctInputToFrac(form.pctManoObraBabetas),
          pctRecargoPublico: pctInputToFrac(form.pctRecargoPublico),
          pctRecargoPublicoPlegadosVarios: pctInputToFrac(
            form.pctRecargoPublicoPlegadosVarios
          ),
          pctListaRioCuarto: pctInputToFrac(form.pctListaRioCuarto),
          pctListaRioCuartoTubos: pctInputToFrac(form.pctListaRioCuartoTubos),
          pctColocacionBase: pctInputToFrac(form.pctColocacionBase),
          pctIva: pctInputToFrac(form.pctIva),
          redondearCortes: form.redondearCortes,
          materialReferenciaColocacionId:
            form.materialReferenciaColocacionId || null,
          factoresColocacion: {
            canaletasPb: Number(form.canaletasPb) || 0,
            canaletasPaMult: Number(form.canaletasPaMult) || 0,
            canosPb: Number(form.canosPb) || 0,
            canosPaMult: Number(form.canosPaMult) || 0,
            babetasPb: Number(form.babetasPb) || 0,
            babetasPaMult: Number(form.babetasPaMult) || 0,
            cenefasPb: Number(form.cenefasPb) || 0,
            cenefasPaMult: Number(form.cenefasPaMult) || 0,
          },
          actualizado: serverTimestamp(),
        },
        { merge: true }
      );
      setMsg("Ajustes guardados.");
    } catch (err) {
      console.error(err);
      setMsg("No se pudieron guardar los ajustes.");
    } finally {
      setGuardando(false);
    }
  }

  if (!form) return <Spinner label="Cargando ajustes…" />;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <form onSubmit={guardar}>
      <h1 style={{ margin: "0 0 16px", fontSize: 22 }}>Ajustes de costeo</h1>

      <section style={{ ...zCard, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Porcentajes generales
        </div>
        <Grid>
          <Num
            label="Diseño %"
            value={form.pctDiseno}
            onChange={(v) => set("pctDiseno", v)}
          />
          <Num
            label="Mano de obra %"
            value={form.pctManoObra}
            onChange={(v) => set("pctManoObra", v)}
          />
          <Num
            label="Mano de obra babetas %"
            value={form.pctManoObraBabetas}
            onChange={(v) => set("pctManoObraBabetas", v)}
          />
          <Num
            label="Recargo público %"
            value={form.pctRecargoPublico}
            onChange={(v) => set("pctRecargoPublico", v)}
          />
          <Num
            label="Recargo plegados varios %"
            value={form.pctRecargoPublicoPlegadosVarios}
            onChange={(v) => set("pctRecargoPublicoPlegadosVarios", v)}
          />
          <Num
            label="Lista Río Cuarto %"
            value={form.pctListaRioCuarto}
            onChange={(v) => set("pctListaRioCuarto", v)}
          />
          <Num
            label="Lista Río Cuarto tubos %"
            value={form.pctListaRioCuartoTubos}
            onChange={(v) => set("pctListaRioCuartoTubos", v)}
          />
          <Num
            label="IVA %"
            value={form.pctIva}
            onChange={(v) => set("pctIva", v)}
          />
        </Grid>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            fontSize: 14,
          }}
        >
          <input
            type="checkbox"
            checked={form.redondearCortes}
            onChange={(e) => set("redondearCortes", e.target.checked)}
          />
          Redondear cortes por chapa hacia abajo
        </label>
      </section>

      <section style={{ ...zCard, marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Colocación</div>
        <Grid>
          <Num
            label="Base colocación %"
            value={form.pctColocacionBase}
            onChange={(v) => set("pctColocacionBase", v)}
          />
        </Grid>
        <label style={{ display: "block", fontSize: 12, marginTop: 10 }}>
          <span style={{ color: zColors.muted }}>
            Material de referencia (canaleta plegada)
          </span>
          <select
            value={form.materialReferenciaColocacionId}
            onChange={(e) =>
              set("materialReferenciaColocacionId", e.target.value)
            }
            style={{ ...zInput, marginTop: 4 }}
          >
            <option value="">Sin referencia</option>
            {referencias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo || m.nombre}
              </option>
            ))}
          </select>
        </label>

        <div
          style={{
            fontSize: 12,
            color: zColors.muted,
            margin: "14px 0 6px",
            textTransform: "uppercase",
          }}
        >
          Factores por categoría
        </div>
        <Grid>
          <Num
            label="Canaletas PB"
            value={form.canaletasPb}
            onChange={(v) => set("canaletasPb", v)}
          />
          <Num
            label="Canaletas PA (mult.)"
            value={form.canaletasPaMult}
            onChange={(v) => set("canaletasPaMult", v)}
          />
          <Num
            label="Caños PB"
            value={form.canosPb}
            onChange={(v) => set("canosPb", v)}
          />
          <Num
            label="Caños PA (mult.)"
            value={form.canosPaMult}
            onChange={(v) => set("canosPaMult", v)}
          />
          <Num
            label="Babetas PB"
            value={form.babetasPb}
            onChange={(v) => set("babetasPb", v)}
          />
          <Num
            label="Babetas PA (mult.)"
            value={form.babetasPaMult}
            onChange={(v) => set("babetasPaMult", v)}
          />
          <Num
            label="Cenefas PB"
            value={form.cenefasPb}
            onChange={(v) => set("cenefasPb", v)}
          />
          <Num
            label="Cenefas PA (mult.)"
            value={form.cenefasPaMult}
            onChange={(v) => set("cenefasPaMult", v)}
          />
        </Grid>
      </section>

      <button type="submit" style={zBtnPrimary} disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar ajustes"}
      </button>
      {msg && (
        <p style={{ marginTop: 10, fontSize: 13, color: zColors.muted }}>
          {msg}
        </p>
      )}
    </form>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "block", fontSize: 12 }}>
      <span style={{ color: zColors.muted }}>{label}</span>
      <input
        type="number"
        step="any"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        style={{ ...zInput, marginTop: 4 }}
      />
    </label>
  );
}
