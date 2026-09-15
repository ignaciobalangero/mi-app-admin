"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { round2 } from "@/lib/zingueria/costeo";
import { formatMoneyExact } from "@/lib/zingueria/format";
import {
  precioColocacionLinea,
  precioReferenciaColocacion,
  precioSegunLista,
  resolverPrecioMaterial,
  type PrecioMaterialResuelto,
} from "@/lib/zingueria/preciosMaterial";
import {
  zChapasCol,
  zConfigRef,
  zLineaRef,
  zLineasCol,
  zMaterialesCol,
  zPlanchuelasCol,
  zTrabajoRef,
} from "@/lib/zingueria/paths";
import type {
  Chapa,
  LineaTrabajo,
  ListaPrecios,
  Material,
  Planchuela,
  PlantaLinea,
  ZingueriaConfig,
} from "@/lib/zingueria/types";
import { zBtnGhost, zBtnPrimary, zColors, zInput } from "@/lib/zingueria/ui";

const LISTAS: { value: ListaPrecios; label: string }[] = [
  { value: "publico", label: "Público" },
  { value: "mayorista", label: "Mayorista" },
  { value: "rio_cuarto", label: "Río Cuarto" },
];

const PLANTAS: { value: PlantaLinea; label: string }[] = [
  { value: "sin_colocacion", label: "Sin coloc." },
  { value: "baja", label: "Planta baja" },
  { value: "alta", label: "Planta alta" },
];

export default function LineasTrabajoBlock({
  trabajoId,
  uid,
  listaPrecios = "publico",
  onTotalesChange,
}: {
  trabajoId: string;
  uid: string;
  listaPrecios?: ListaPrecios;
  onTotalesChange?: (precioMaterial: number, costoMaterial: number) => void;
}) {
  const [lineas, setLineas] = useState<LineaTrabajo[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [chapas, setChapas] = useState<Chapa[]>([]);
  const [planchuelas, setPlanchuelas] = useState<Planchuela[]>([]);
  const [config, setConfig] = useState<Partial<ZingueriaConfig> | null>(null);
  const [lista, setLista] = useState<ListaPrecios>(listaPrecios);
  const [busqueda, setBusqueda] = useState("");
  const [nueva, setNueva] = useState({
    materialId: "",
    descripcion: "",
    cantidad: 1,
    planta: "sin_colocacion" as PlantaLinea,
    precioUnitarioMaterial: 0,
    precioUnitarioColocacion: 0,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    return onSnapshot(zLineasCol(trabajoId), (s) => {
      const list = s.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LineaTrabajo, "id">),
      }));
      list.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setLineas(list);
    });
  }, [trabajoId]);

  useEffect(() => {
    if (!uid) return;
    const uMat = onSnapshot(
      query(zMaterialesCol(), where("ownerUid", "==", uid)),
      (s) =>
        setMateriales(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Material, "id">) }))
        )
    );
    const uCha = onSnapshot(
      query(zChapasCol(), where("ownerUid", "==", uid)),
      (s) =>
        setChapas(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chapa, "id">) }))
        )
    );
    const uPla = onSnapshot(
      query(zPlanchuelasCol(), where("ownerUid", "==", uid)),
      (s) =>
        setPlanchuelas(
          s.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Planchuela, "id">),
          }))
        ),
      () => setPlanchuelas([])
    );
    const uCfg = onSnapshot(zConfigRef(uid), (s) =>
      setConfig(s.exists() ? (s.data() as ZingueriaConfig) : null)
    );
    return () => {
      uMat();
      uCha();
      uPla();
      uCfg();
    };
  }, [uid]);

  const refColocacion = useMemo(
    () =>
      precioReferenciaColocacion({ materiales, chapas, planchuelas, config }),
    [materiales, chapas, planchuelas, config]
  );

  const precios = useMemo(() => {
    const map = new Map<string, PrecioMaterialResuelto>();
    for (const m of materiales) {
      map.set(
        m.id,
        resolverPrecioMaterial({
          material: m,
          chapa: chapas.find((c) => c.id === m.chapaId) || null,
          planchuela: planchuelas.find((p) => p.id === m.planchuelaId) || null,
          config,
          precioPublicoReferenciaColocacion: refColocacion,
        })
      );
    }
    return map;
  }, [materiales, chapas, planchuelas, config, refColocacion]);

  const sugerencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return materiales
      .filter((m) =>
        `${m.codigo || ""} ${m.nombre}`.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [materiales, busqueda]);

  /** Precarga precios al elegir material / planta / lista. */
  useEffect(() => {
    if (!nueva.materialId) return;
    const r = precios.get(nueva.materialId);
    if (!r) return;
    setNueva((n) => ({
      ...n,
      precioUnitarioMaterial: precioSegunLista(r, lista),
      precioUnitarioColocacion: precioColocacionLinea(
        n.planta,
        r.colocacionPb,
        r.colocacionPa
      ),
    }));
  }, [nueva.materialId, nueva.planta, lista, precios]);

  const totales = useMemo(() => {
    const precioMaterial = lineas.reduce(
      (a, l) => a + (Number(l.totalLinea) || 0),
      0
    );
    const costoMaterial = lineas.reduce(
      (a, l) =>
        a + (Number(l.cantidad) || 0) * (Number(l.costoUnitarioSnapshot) || 0),
      0
    );
    const soloMaterial = lineas.reduce(
      (a, l) => a + (Number(l.subtotalMaterial) || 0),
      0
    );
    const soloColocacion = lineas.reduce(
      (a, l) => a + (Number(l.subtotalColocacion) || 0),
      0
    );
    return {
      precioMaterial: round2(precioMaterial),
      costoMaterial: round2(costoMaterial),
      soloMaterial: round2(soloMaterial),
      soloColocacion: round2(soloColocacion),
    };
  }, [lineas]);

  // Sin líneas no se pisan los totales cargados a mano, salvo que se hayan borrado todas.
  const ultimoSync = useRef("");
  useEffect(() => {
    if (!lineas.length && !ultimoSync.current) return;
    const key = `${totales.precioMaterial}|${totales.costoMaterial}`;
    if (ultimoSync.current === key) return;
    ultimoSync.current = key;
    void updateDoc(zTrabajoRef(trabajoId), {
      precioMaterial: totales.precioMaterial,
      costoMaterial: totales.costoMaterial,
      listaPrecios: lista,
    });
    onTotalesChange?.(totales.precioMaterial, totales.costoMaterial);
  }, [lineas.length, totales, trabajoId, lista, onTotalesChange]);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    const mat = materiales.find((m) => m.id === nueva.materialId);
    const r = nueva.materialId ? precios.get(nueva.materialId) : null;
    const cantidad = Number(nueva.cantidad) || 0;
    const descripcion =
      nueva.descripcion.trim() ||
      r?.descripcionSugerida ||
      mat?.nombre ||
      "";
    if (!descripcion || !(cantidad > 0)) {
      setMsg("Falta descripción o cantidad.");
      return;
    }
    const pUnit = Number(nueva.precioUnitarioMaterial) || 0;
    const pCol = Number(nueva.precioUnitarioColocacion) || 0;
    const subtotalMaterial = round2(pUnit * cantidad);
    const subtotalColocacion = round2(pCol * cantidad);
    await addDoc(zLineasCol(trabajoId), {
      materialId: nueva.materialId || null,
      descripcion,
      cantidad,
      listaPrecios: lista,
      precioUnitarioMaterial: pUnit,
      subtotalMaterial,
      planta: nueva.planta,
      precioUnitarioColocacion: pCol,
      subtotalColocacion,
      totalLinea: round2(subtotalMaterial + subtotalColocacion),
      costoUnitarioSnapshot: r?.costoUnitario || 0,
      orden: lineas.length,
      creado: serverTimestamp(),
    });
    setNueva({
      materialId: "",
      descripcion: "",
      cantidad: 1,
      planta: "sin_colocacion",
      precioUnitarioMaterial: 0,
      precioUnitarioColocacion: 0,
    });
    setBusqueda("");
    setMsg("");
  }

  async function patchLinea(l: LineaTrabajo, cambios: Partial<LineaTrabajo>) {
    const merged = { ...l, ...cambios };
    const cantidad = Number(merged.cantidad) || 0;
    const subtotalMaterial = round2(
      (Number(merged.precioUnitarioMaterial) || 0) * cantidad
    );
    const subtotalColocacion = round2(
      (Number(merged.precioUnitarioColocacion) || 0) * cantidad
    );
    await updateDoc(zLineaRef(trabajoId, l.id), {
      ...cambios,
      subtotalMaterial,
      subtotalColocacion,
      totalLinea: round2(subtotalMaterial + subtotalColocacion),
    } as Record<string, unknown>);
  }

  async function actualizarPrecios() {
    const cambios: {
      linea: LineaTrabajo;
      pUnit: number;
      pCol: number;
      costo: number;
    }[] = [];
    for (const l of lineas) {
      if (!l.materialId) continue;
      const r = precios.get(l.materialId);
      if (!r || !r.ok) continue;
      const pUnit = precioSegunLista(r, l.listaPrecios || lista);
      const pCol = precioColocacionLinea(
        l.planta,
        r.colocacionPb,
        r.colocacionPa
      );
      if (
        round2(pUnit) === round2(l.precioUnitarioMaterial) &&
        round2(pCol) === round2(l.precioUnitarioColocacion)
      ) {
        continue;
      }
      cambios.push({ linea: l, pUnit, pCol, costo: r.costoUnitario });
    }
    if (!cambios.length) {
      setMsg("Los precios ya están al día.");
      return;
    }
    const detalle = cambios
      .slice(0, 12)
      .map(
        (c) =>
          `• ${c.linea.descripcion}: ${formatMoneyExact(
            c.linea.precioUnitarioMaterial
          )} → ${formatMoneyExact(c.pUnit)}`
      )
      .join("\n");
    const extra =
      cambios.length > 12 ? `\n…y ${cambios.length - 12} más` : "";
    if (
      !confirm(
        `Actualizar ${cambios.length} línea(s) con los precios del catálogo?\n\n${detalle}${extra}`
      )
    ) {
      return;
    }
    for (const c of cambios) {
      const cantidad = Number(c.linea.cantidad) || 0;
      const subtotalMaterial = round2(c.pUnit * cantidad);
      const subtotalColocacion = round2(c.pCol * cantidad);
      await updateDoc(zLineaRef(trabajoId, c.linea.id), {
        precioUnitarioMaterial: c.pUnit,
        precioUnitarioColocacion: c.pCol,
        costoUnitarioSnapshot: c.costo,
        subtotalMaterial,
        subtotalColocacion,
        totalLinea: round2(subtotalMaterial + subtotalColocacion),
      });
    }
    setMsg(`${cambios.length} línea(s) actualizada(s).`);
  }

  const resNueva = nueva.materialId ? precios.get(nueva.materialId) : null;

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <select
          value={lista}
          onChange={(e) => setLista(e.target.value as ListaPrecios)}
          style={{ ...zInput, width: "auto" }}
        >
          {LISTAS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          style={{ ...zBtnGhost, padding: "8px 12px", fontSize: 13 }}
          onClick={actualizarPrecios}
          disabled={!lineas.length}
        >
          Actualizar precios
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lineas.map((l) => (
          <div
            key={l.id}
            style={{
              border: `1px solid ${zColors.border}`,
              borderRadius: 10,
              padding: 10,
              background: "#0f172a",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 14 }}>{l.descripcion}</strong>
              <span style={{ fontWeight: 800, color: zColors.accent }}>
                {formatMoneyExact(l.totalLinea)}
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                gap: 6,
                marginTop: 8,
              }}
            >
              <LabeledInput
                label="Cant."
                value={l.cantidad}
                onCommit={(v) => patchLinea(l, { cantidad: v })}
              />
              <LabeledInput
                label="P. unit."
                value={l.precioUnitarioMaterial}
                onCommit={(v) => patchLinea(l, { precioUnitarioMaterial: v })}
              />
              <LabeledInput
                label="Coloc. u."
                value={l.precioUnitarioColocacion}
                onCommit={(v) => patchLinea(l, { precioUnitarioColocacion: v })}
              />
              <label style={{ display: "block", fontSize: 11 }}>
                <span style={{ color: zColors.muted }}>Planta</span>
                <select
                  value={l.planta}
                  onChange={(e) =>
                    patchLinea(l, { planta: e.target.value as PlantaLinea })
                  }
                  style={{ ...zInput, marginTop: 3, padding: "6px 8px" }}
                >
                  {PLANTAS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
                fontSize: 12,
                color: zColors.muted,
              }}
            >
              <span>
                Material {formatMoneyExact(l.subtotalMaterial)} · Colocación{" "}
                {formatMoneyExact(l.subtotalColocacion)} ·{" "}
                {LISTAS.find((x) => x.value === (l.listaPrecios || "publico"))
                  ?.label}
              </span>
              <button
                type="button"
                style={{ ...zBtnGhost, padding: "4px 8px", fontSize: 12 }}
                onClick={() => deleteDoc(zLineaRef(trabajoId, l.id))}
              >
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      {!lineas.length && (
        <p style={{ color: zColors.muted, fontSize: 13 }}>
          Todavía no hay líneas cargadas.
        </p>
      )}

      {lineas.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 6,
            margin: "12px 0",
          }}
        >
          <Tot label="Materiales" value={formatMoneyExact(totales.soloMaterial)} />
          <Tot
            label="Colocación"
            value={formatMoneyExact(totales.soloColocacion)}
          />
          <Tot
            label="Total líneas"
            value={formatMoneyExact(totales.precioMaterial)}
            accent
          />
          <Tot label="Costo" value={formatMoneyExact(totales.costoMaterial)} />
        </div>
      )}

      <form
        onSubmit={agregar}
        style={{
          marginTop: 12,
          borderTop: `1px solid ${zColors.border}`,
          paddingTop: 12,
        }}
      >
        <input
          placeholder="Buscar material…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={zInput}
        />
        {sugerencias.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 6,
            }}
          >
            {sugerencias.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  const r = precios.get(m.id);
                  setNueva((n) => ({
                    ...n,
                    materialId: m.id,
                    descripcion: r?.descripcionSugerida || m.nombre,
                  }));
                  setBusqueda("");
                }}
                style={{
                  ...zBtnGhost,
                  padding: "5px 9px",
                  fontSize: 12,
                  borderColor:
                    nueva.materialId === m.id ? zColors.accent : zColors.border,
                }}
              >
                {m.codigo || m.nombre}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 6,
            marginTop: 8,
          }}
        >
          <input
            placeholder="Descripción"
            value={nueva.descripcion}
            onChange={(e) =>
              setNueva({ ...nueva, descripcion: e.target.value })
            }
            style={{ ...zInput, gridColumn: "1 / -1" }}
          />
          <input
            type="number"
            step="any"
            min={0}
            placeholder="Cantidad"
            value={nueva.cantidad || ""}
            onChange={(e) =>
              setNueva({ ...nueva, cantidad: Number(e.target.value) || 0 })
            }
            style={zInput}
          />
          <select
            value={nueva.planta}
            onChange={(e) =>
              setNueva({ ...nueva, planta: e.target.value as PlantaLinea })
            }
            style={zInput}
          >
            {PLANTAS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            placeholder="Precio unit."
            value={nueva.precioUnitarioMaterial || ""}
            onChange={(e) =>
              setNueva({
                ...nueva,
                precioUnitarioMaterial: Number(e.target.value) || 0,
              })
            }
            style={zInput}
          />
          <input
            type="number"
            step="any"
            placeholder="Coloc. unit."
            value={nueva.precioUnitarioColocacion || ""}
            onChange={(e) =>
              setNueva({
                ...nueva,
                precioUnitarioColocacion: Number(e.target.value) || 0,
              })
            }
            style={zInput}
          />
        </div>

        {resNueva && !resNueva.ok && (
          <p style={{ color: zColors.danger, fontSize: 12, marginTop: 6 }}>
            {resNueva.error || "Ese material no tiene precio calculable."}
          </p>
        )}

        <button type="submit" style={{ ...zBtnPrimary, marginTop: 8 }}>
          Agregar línea
        </button>
      </form>

      {msg && (
        <p style={{ color: zColors.muted, fontSize: 13, marginTop: 8 }}>{msg}</p>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value ?? 0));
  useEffect(() => setLocal(String(value ?? 0)), [value]);
  return (
    <label style={{ display: "block", fontSize: 11 }}>
      <span style={{ color: zColors.muted }}>{label}</span>
      <input
        type="number"
        step="any"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local) || 0;
          if (n !== value) onCommit(n);
        }}
        style={{ ...zInput, marginTop: 3, padding: "6px 8px" }}
      />
    </label>
  );
}

function Tot({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: `1px solid ${zColors.border}`,
        borderRadius: 8,
        padding: "6px 8px",
      }}
    >
      <div style={{ fontSize: 10, color: zColors.muted }}>{label}</div>
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          color: accent ? zColors.accent : zColors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
