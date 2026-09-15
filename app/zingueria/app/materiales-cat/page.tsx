"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { configToParams } from "@/lib/zingueria/config";
import {
  calcularPlegado,
  desarrolloDesdePerfil,
  sugerirCodigo,
} from "@/lib/zingueria/costeo";
import { formatMoneyExact } from "@/lib/zingueria/format";
import {
  precioReferenciaColocacion,
  resolverPrecioMaterial,
} from "@/lib/zingueria/preciosMaterial";
import {
  zChapasCol,
  zConfigRef,
  zMaterialesCol,
  zPlanchuelasCol,
} from "@/lib/zingueria/paths";
import {
  CATEGORIAS_MATERIAL,
  type CategoriaMaterial,
  type Chapa,
  type Material,
  type Planchuela,
  type TipoDesarrollo,
  type ZingueriaConfig,
} from "@/lib/zingueria/types";
import {
  zBtnGhost,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

const FORM_VACIO = {
  codigo: "",
  nombre: "",
  categoria: "canaleta" as CategoriaMaterial,
  tipoDesarrollo: "estandar_406" as TipoDesarrollo,
  chapaId: "",
  perfil: "",
  desarrolloMm: 406,
  pctDiseno: "",
  pctManoObra: "",
  pctRecargoPublico: "",
  pctListaRioCuarto: "",
  precioPublicoManual: "",
};

export default function MaterialesCatalogoPage() {
  const { user } = useZingueriaSession();
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [chapas, setChapas] = useState<Chapa[]>([]);
  const [planchuelas, setPlanchuelas] = useState<Planchuela[]>([]);
  const [config, setConfig] = useState<Partial<ZingueriaConfig> | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroAcabado, setFiltroAcabado] = useState("");
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uMat = onSnapshot(
      query(zMaterialesCol(), where("ownerUid", "==", user.uid)),
      (s) =>
        setMateriales(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Material, "id">) }))
        )
    );
    const uCha = onSnapshot(
      query(zChapasCol(), where("ownerUid", "==", user.uid)),
      (s) =>
        setChapas(
          s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Chapa, "id">) }))
        )
    );
    const uPla = onSnapshot(
      query(zPlanchuelasCol(), where("ownerUid", "==", user.uid)),
      (s) =>
        setPlanchuelas(
          s.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Planchuela, "id">),
          }))
        ),
      () => setPlanchuelas([])
    );
    const uCfg = onSnapshot(zConfigRef(user.uid), (s) =>
      setConfig(s.exists() ? (s.data() as ZingueriaConfig) : null)
    );
    return () => {
      uMat();
      uCha();
      uPla();
      uCfg();
    };
  }, [user]);

  const chapaPorId = useMemo(
    () => new Map(chapas.map((c) => [c.id, c])),
    [chapas]
  );

  const refColocacion = useMemo(
    () =>
      precioReferenciaColocacion({ materiales, chapas, planchuelas, config }),
    [materiales, chapas, planchuelas, config]
  );

  const filas = useMemo(() => {
    return materiales
      .map((m) => ({
        material: m,
        chapa: chapaPorId.get(m.chapaId || "") || null,
        precio: resolverPrecioMaterial({
          material: m,
          chapa: chapaPorId.get(m.chapaId || "") || null,
          planchuela:
            planchuelas.find((p) => p.id === m.planchuelaId) || null,
          config,
          precioPublicoReferenciaColocacion: refColocacion,
        }),
      }))
      .filter((f) => {
        if (filtroCategoria && f.material.categoria !== filtroCategoria)
          return false;
        if (filtroAcabado && f.chapa?.acabado !== filtroAcabado) return false;
        return true;
      })
      .sort((a, b) =>
        `${a.material.categoria || ""} ${a.material.codigo || a.material.nombre}`.localeCompare(
          `${b.material.categoria || ""} ${b.material.codigo || b.material.nombre}`,
          "es"
        )
      );
  }, [
    materiales,
    chapaPorId,
    planchuelas,
    config,
    refColocacion,
    filtroCategoria,
    filtroAcabado,
  ]);

  const chapaForm = chapaPorId.get(form.chapaId) || null;

  const preview = useMemo(() => {
    if (!chapaForm) return null;
    return calcularPlegado({
      chapa: chapaForm,
      desarrolloMm: Number(form.desarrolloMm) || 0,
      categoria: form.categoria,
      params: configToParams(config),
      pctDiseno: numOrNull(form.pctDiseno),
      pctManoObra: numOrNull(form.pctManoObra),
      pctRecargoPublico: numOrNull(form.pctRecargoPublico),
      pctListaRioCuarto: numOrNull(form.pctListaRioCuarto),
      precioPublicoManual: numOrNull(form.precioPublicoManual),
    });
  }, [chapaForm, form, config]);

  function setDesarrolloPreset(tipo: TipoDesarrollo) {
    setForm((f) => ({
      ...f,
      tipoDesarrollo: tipo,
      desarrolloMm:
        tipo === "estandar_406" ? 406 : tipo === "estandar_305" ? 305 : f.desarrolloMm,
    }));
  }

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!user || !chapaForm) return;
    const desarrollo = Number(form.desarrolloMm) || 0;
    if (!(desarrollo > 0)) return;
    const codigo =
      form.codigo.trim() ||
      sugerirCodigo({
        desarrolloMm: desarrollo,
        calibre: chapaForm.calibre,
        acabado: chapaForm.acabado,
      });
    const nombre =
      form.nombre.trim() ||
      `${form.categoria} ${desarrollo}/${chapaForm.calibre}/${chapaForm.acabado}`;
    await addDoc(zMaterialesCol(), {
      ownerUid: user.uid,
      nombre,
      tipo: form.categoria,
      unidad: "metro",
      stock: 0,
      stockMinimo: 0,
      precioCosto: 0,
      precioVenta: 0,
      notas: "",
      creado: serverTimestamp(),
      tipoCalculo: "plegado",
      categoria: form.categoria,
      codigo,
      perfil: form.perfil.trim() || null,
      desarrolloMm: desarrollo,
      tipoDesarrollo: form.tipoDesarrollo,
      chapaId: chapaForm.id,
      pctDiseno: numOrNull(form.pctDiseno),
      pctManoObra: numOrNull(form.pctManoObra),
      pctRecargoPublico: numOrNull(form.pctRecargoPublico),
      pctListaRioCuarto: numOrNull(form.pctListaRioCuarto),
      precioPublicoManual: numOrNull(form.precioPublicoManual),
      activo: true,
    });
    setForm({ ...FORM_VACIO, chapaId: form.chapaId });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Materiales</h1>
        <button
          type="button"
          style={zBtnGhost}
          onClick={() => setMostrarForm((v) => !v)}
        >
          {mostrarForm ? "Cerrar" : "+ Plegado"}
        </button>
      </div>

      {!chapas.length && (
        <p style={{ color: zColors.warn, fontSize: 13 }}>
          No hay chapas cargadas: los precios no se pueden calcular.
        </p>
      )}

      {mostrarForm && (
        <form onSubmit={crear} style={{ ...zCard, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Nuevo material plegado
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {(
              [
                ["estandar_406", "406"],
                ["estandar_305", "305"],
                ["especial", "Especial"],
              ] as [TipoDesarrollo, string][]
            ).map(([tipo, label]) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setDesarrolloPreset(tipo)}
                style={
                  form.tipoDesarrollo === tipo
                    ? { ...zBtnPrimary, padding: "6px 12px", fontSize: 13 }
                    : { ...zBtnGhost, padding: "6px 12px", fontSize: 13 }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8,
            }}
          >
            <select
              required
              value={form.chapaId}
              onChange={(e) => setForm({ ...form, chapaId: e.target.value })}
              style={zInput}
            >
              <option value="">Chapa…</option>
              {chapas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.calibre} {c.acabado} ({c.anchoMm}×{c.largoMm})
                </option>
              ))}
            </select>
            <select
              value={form.categoria}
              onChange={(e) =>
                setForm({
                  ...form,
                  categoria: e.target.value as CategoriaMaterial,
                })
              }
              style={zInput}
            >
              {CATEGORIAS_MATERIAL.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              placeholder="Perfil (100+150+156)"
              value={form.perfil}
              onChange={(e) => {
                const perfil = e.target.value;
                const sug = desarrolloDesdePerfil(perfil);
                setForm((f) => ({
                  ...f,
                  perfil,
                  desarrolloMm: sug && sug > 0 ? sug : f.desarrolloMm,
                  tipoDesarrollo: sug && sug > 0 ? "especial" : f.tipoDesarrollo,
                }));
              }}
              style={zInput}
            />
            <input
              type="number"
              placeholder="Desarrollo (mm)"
              value={form.desarrolloMm || ""}
              onChange={(e) =>
                setForm({ ...form, desarrolloMm: Number(e.target.value) || 0 })
              }
              style={zInput}
            />
            <input
              placeholder="Código (auto)"
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              style={zInput}
            />
            <input
              placeholder="Nombre (auto)"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              style={zInput}
            />
          </div>

          <details style={{ marginTop: 10 }}>
            <summary
              style={{ cursor: "pointer", color: zColors.muted, fontSize: 13 }}
            >
              Overrides de porcentajes (opcional)
            </summary>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 8,
                marginTop: 8,
              }}
            >
              <PctInput
                label="% Diseño"
                value={form.pctDiseno}
                onChange={(v) => setForm({ ...form, pctDiseno: v })}
              />
              <PctInput
                label="% Mano de obra"
                value={form.pctManoObra}
                onChange={(v) => setForm({ ...form, pctManoObra: v })}
              />
              <PctInput
                label="% Recargo público"
                value={form.pctRecargoPublico}
                onChange={(v) => setForm({ ...form, pctRecargoPublico: v })}
              />
              <PctInput
                label="% Lista Río Cuarto"
                value={form.pctListaRioCuarto}
                onChange={(v) => setForm({ ...form, pctListaRioCuarto: v })}
              />
              <PctInput
                label="Público manual ($)"
                value={form.precioPublicoManual}
                onChange={(v) => setForm({ ...form, precioPublicoManual: v })}
              />
            </div>
          </details>

          {preview && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                background: "#0f172a",
                border: `1px solid ${preview.ok ? zColors.border : zColors.danger}`,
                fontSize: 13,
              }}
            >
              {preview.ok ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 6,
                  }}
                >
                  <Mini label="Cortes/chapa" value={String(preview.cortesPorChapa)} />
                  <Mini label="Costo tira" value={formatMoneyExact(preview.costoTira)} />
                  <Mini label="Costo/m" value={formatMoneyExact(preview.costoMetro)} />
                  <Mini label="Diseño" value={formatMoneyExact(preview.diseno)} />
                  <Mini label="Mano obra" value={formatMoneyExact(preview.manoObra)} />
                  <Mini label="Neto" value={formatMoneyExact(preview.precioNeto)} />
                  <Mini
                    label="Público"
                    value={formatMoneyExact(preview.precioPublico)}
                    accent
                  />
                  <Mini
                    label="Río Cuarto"
                    value={formatMoneyExact(preview.precioRioCuarto)}
                  />
                  <Mini label="Coef." value={String(preview.coeficienteGanancia)} />
                </div>
              ) : (
                <span style={{ color: zColors.danger }}>
                  {preview.error || "No se puede calcular."}
                </span>
              )}
            </div>
          )}

          <button type="submit" style={{ ...zBtnPrimary, marginTop: 12 }}>
            Crear material
          </button>
        </form>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          style={zInput}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS_MATERIAL.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={filtroAcabado}
          onChange={(e) => setFiltroAcabado(e.target.value)}
          style={zInput}
        >
          <option value="">Todo acabado</option>
          <option value="galva">Galvanizada</option>
          <option value="color">Color</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filas.map(({ material: m, chapa, precio }) => (
          <div key={m.id} style={zCard}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {m.codigo || m.nombre}
                  {m.categoria && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        color: zColors.muted,
                        textTransform: "uppercase",
                      }}
                    >
                      {m.categoria}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: zColors.muted }}>
                  {m.nombre}
                </div>
                <div style={{ fontSize: 12, color: zColors.muted }}>
                  {m.desarrolloMm ? `Desarrollo ${m.desarrolloMm} mm · ` : ""}
                  {chapa
                    ? `Chapa ${chapa.calibre} ${chapa.acabado}`
                    : m.tipoCalculo && m.tipoCalculo !== "stock_simple"
                      ? "Sin chapa"
                      : "Stock simple"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, color: zColors.accent }}>
                  {formatMoneyExact(precio.precioPublico)}
                </div>
                <div style={{ fontSize: 11, color: zColors.muted }}>
                  público / {precio.unidad}
                </div>
              </div>
            </div>

            {precio.ok ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                <Mini label="Costo" value={formatMoneyExact(precio.costoUnitario)} />
                <Mini label="Neto" value={formatMoneyExact(precio.precioMayorista)} />
                <Mini
                  label="Río Cuarto"
                  value={formatMoneyExact(precio.precioRioCuarto)}
                />
                <Mini label="Coef." value={String(precio.coeficiente ?? "—")} />
                <Mini label="Coloc. PB" value={formatMoneyExact(precio.colocacionPb)} />
                <Mini label="Coloc. PA" value={formatMoneyExact(precio.colocacionPa)} />
              </div>
            ) : (
              <div
                style={{ marginTop: 8, fontSize: 12, color: zColors.danger }}
              >
                {precio.error || "Sin precio"}
              </div>
            )}
          </div>
        ))}
      </div>

      {!filas.length && (
        <p style={{ color: zColors.muted }}>No hay materiales para ese filtro.</p>
      )}
    </div>
  );
}

function numOrNull(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function PctInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: "block", fontSize: 12 }}>
      <span style={{ color: zColors.muted }}>{label}</span>
      <input
        type="number"
        step="any"
        placeholder="auto"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...zInput, marginTop: 4 }}
      />
    </label>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: zColors.muted }}>{label}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: accent ? zColors.accent : zColors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}
