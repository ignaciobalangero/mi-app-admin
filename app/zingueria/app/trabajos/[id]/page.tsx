"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  query,
  where,
  increment,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import {
  deudaTrabajo,
  gananciaTrabajo,
  totalPagado,
  totalTrabajo,
} from "@/lib/zingueria/calculos";
import { uploadFotoTrabajo, borrarFotoStorage } from "@/lib/zingueria/fotos";
import { formatDate, formatMoney, todayISO } from "@/lib/zingueria/format";
import {
  zFotosCol,
  zMaterialesCol,
  zMaterialRef,
  zMedidasCol,
  zMovimientosCol,
  zPagosCol,
  zTrabajoRef,
} from "@/lib/zingueria/paths";
import type {
  EstadoTrabajo,
  Foto,
  Material,
  Medida,
  Pago,
  Trabajo,
} from "@/lib/zingueria/types";
import { ESTADOS_TRABAJO } from "@/lib/zingueria/types";
import {
  estadoColor,
  Spinner,
  zBtnGhost,
  zBtnPrimary,
  zCard,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

export default function TrabajoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useZingueriaSession();
  const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
  const [loading, setLoading] = useState(true);
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [open, setOpen] = useState({
    medidas: true,
    fotos: true,
    pagos: true,
    materiales: false,
  });

  useEffect(() => {
    if (!id) return;
    return onSnapshot(zTrabajoRef(id), (snap) => {
      if (!snap.exists()) {
        setTrabajo(null);
      } else {
        setTrabajo({ id: snap.id, ...(snap.data() as Omit<Trabajo, "id">) });
      }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const u1 = onSnapshot(zMedidasCol(id), (s) =>
      setMedidas(
        s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Medida, "id">) }))
      )
    );
    const u2 = onSnapshot(zFotosCol(id), (s) =>
      setFotos(
        s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Foto, "id">) }))
      )
    );
    const u3 = onSnapshot(zPagosCol(id), (s) =>
      setPagos(
        s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Pago, "id">) }))
      )
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    const q = query(zMaterialesCol(), where("ownerUid", "==", user.uid));
    return onSnapshot(q, (s) => {
      setMateriales(
        s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Material, "id">) }))
      );
    });
  }, [user]);

  const totales = useMemo(() => {
    if (!trabajo) return null;
    return {
      total: totalTrabajo(trabajo),
      ganancia: gananciaTrabajo(trabajo),
      pagado: totalPagado(pagos),
      deuda: deudaTrabajo(trabajo, pagos),
    };
  }, [trabajo, pagos]);

  if (loading) return <Spinner />;
  if (!trabajo || !totales) {
    return (
      <p style={{ color: zColors.muted }}>
        Trabajo no encontrado.{" "}
        <Link href="/zingueria/app/trabajos" style={{ color: zColors.accent }}>
          Volver
        </Link>
      </p>
    );
  }

  async function patchTrabajo(data: Partial<Trabajo>) {
    await updateDoc(zTrabajoRef(id), data as Record<string, unknown>);
  }

  return (
    <div>
      <Link
        href="/zingueria/app/trabajos"
        style={{ color: zColors.muted, fontSize: 13, textDecoration: "none" }}
      >
        ← Trabajos
      </Link>

      <div style={{ ...zCard, marginTop: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              value={trabajo.titulo}
              onChange={(e) =>
                setTrabajo({ ...trabajo, titulo: e.target.value })
              }
              onBlur={(e) => patchTrabajo({ titulo: e.target.value })}
              style={{
                ...zInput,
                fontSize: 20,
                fontWeight: 700,
                border: "none",
                background: "transparent",
                padding: 0,
              }}
            />
            <div style={{ color: zColors.muted, fontSize: 13, marginTop: 4 }}>
              {trabajo.clienteNombre}
            </div>
          </div>
          <select
            value={trabajo.estado}
            onChange={(e) => {
              const estado = e.target.value as EstadoTrabajo;
              setTrabajo({ ...trabajo, estado });
              void patchTrabajo({ estado });
            }}
            style={{
              ...zInput,
              width: "auto",
              color: estadoColor(trabajo.estado),
              fontWeight: 700,
            }}
          >
            {ESTADOS_TRABAJO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
            marginTop: 14,
          }}
        >
          <Field label="Fecha inicio">
            <input
              type="date"
              value={trabajo.fechaInicio || ""}
              onChange={(e) => {
                const fechaInicio = e.target.value || null;
                setTrabajo({ ...trabajo, fechaInicio });
                void patchTrabajo({ fechaInicio });
              }}
              style={zInput}
            />
          </Field>
          <Field label="Fecha fin">
            <input
              type="date"
              value={trabajo.fechaFin || ""}
              onChange={(e) => {
                const fechaFin = e.target.value || null;
                setTrabajo({ ...trabajo, fechaFin });
                void patchTrabajo({ fechaFin });
              }}
              style={zInput}
            />
          </Field>
          <Field label="Precio trabajo">
            <input
              type="number"
              value={trabajo.precioTrabajo || ""}
              onChange={(e) =>
                setTrabajo({
                  ...trabajo,
                  precioTrabajo: Number(e.target.value) || 0,
                })
              }
              onBlur={() =>
                patchTrabajo({ precioTrabajo: trabajo.precioTrabajo })
              }
              style={zInput}
            />
          </Field>
          <Field label="Precio material">
            <input
              type="number"
              value={trabajo.precioMaterial || ""}
              onChange={(e) =>
                setTrabajo({
                  ...trabajo,
                  precioMaterial: Number(e.target.value) || 0,
                })
              }
              onBlur={() =>
                patchTrabajo({ precioMaterial: trabajo.precioMaterial })
              }
              style={zInput}
            />
          </Field>
          <Field label="Costo material">
            <input
              type="number"
              value={trabajo.costoMaterial || ""}
              onChange={(e) =>
                setTrabajo({
                  ...trabajo,
                  costoMaterial: Number(e.target.value) || 0,
                })
              }
              onBlur={() =>
                patchTrabajo({ costoMaterial: trabajo.costoMaterial })
              }
              style={zInput}
            />
          </Field>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginTop: 14,
          }}
        >
          <Tot label="Total" value={formatMoney(totales.total)} />
          <Tot label="Ganancia" value={formatMoney(totales.ganancia)} />
          <Tot label="Pagado" value={formatMoney(totales.pagado)} />
          <Tot label="Deuda" value={formatMoney(totales.deuda)} accent />
        </div>
      </div>

      <Section
        title={`Medidas (${medidas.length})`}
        open={open.medidas}
        onToggle={() => setOpen((o) => ({ ...o, medidas: !o.medidas }))}
      >
        <MedidasBlock trabajoId={id} medidas={medidas} />
      </Section>

      <Section
        title={`Fotos (${fotos.length})`}
        open={open.fotos}
        onToggle={() => setOpen((o) => ({ ...o, fotos: !o.fotos }))}
      >
        <FotosBlock trabajoId={id} fotos={fotos} uid={user!.uid} />
      </Section>

      <Section
        title={`Pagos (${pagos.length})`}
        open={open.pagos}
        onToggle={() => setOpen((o) => ({ ...o, pagos: !o.pagos }))}
      >
        <PagosBlock trabajoId={id} pagos={pagos} />
      </Section>

      <Section
        title="Materiales usados"
        open={open.materiales}
        onToggle={() => setOpen((o) => ({ ...o, materiales: !o.materiales }))}
      >
        <MaterialesUsadosBlock
          trabajoId={id}
          materiales={materiales}
          onUsado={(costoExtra) =>
            patchTrabajo({
              costoMaterial: (trabajo.costoMaterial || 0) + costoExtra,
            })
          }
        />
      </Section>
    </div>
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
        borderRadius: 8,
        padding: "8px 10px",
        border: `1px solid ${zColors.border}`,
      }}
    >
      <div style={{ fontSize: 11, color: zColors.muted }}>{label}</div>
      <div
        style={{
          fontWeight: 800,
          color: accent ? zColors.accent : zColors.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div style={{ ...zCard, marginTop: 12 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: "none",
          border: "none",
          color: zColors.text,
          width: "100%",
          textAlign: "left",
          fontWeight: 700,
          fontSize: 15,
          cursor: "pointer",
          padding: 0,
        }}
      >
        {open ? "▼" : "▶"} {title}
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", fontSize: 12 }}>
      <span style={{ color: zColors.muted }}>{label}</span>
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}

function MedidasBlock({
  trabajoId,
  medidas,
}: {
  trabajoId: string;
  medidas: Medida[];
}) {
  const [desc, setDesc] = useState("");
  const [valor, setValor] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!desc.trim() && !valor.trim()) return;
    await addDoc(zMedidasCol(trabajoId), {
      descripcion: desc.trim(),
      valor: valor.trim(),
      creado: serverTimestamp(),
    });
    setDesc("");
    setValor("");
  }

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
        {medidas.map((m) => (
          <li
            key={m.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              padding: "6px 0",
              borderBottom: `1px solid ${zColors.border}`,
              fontSize: 14,
            }}
          >
            <span>
              {m.descripcion || "—"}: <strong>{m.valor}</strong>
            </span>
            <button
              type="button"
              style={{ ...zBtnGhost, padding: "4px 8px", fontSize: 12 }}
              onClick={() => deleteDoc(doc(zMedidasCol(trabajoId), m.id))}
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={add}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6 }}
      >
        <input
          placeholder="Descripción"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          style={zInput}
        />
        <input
          placeholder="Valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          style={zInput}
        />
        <button type="submit" style={zBtnPrimary}>
          +
        </button>
      </form>
    </div>
  );
}

function FotosBlock({
  trabajoId,
  fotos,
  uid,
}: {
  trabajoId: string;
  fotos: Foto[];
  uid: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function onFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) {
        setError("Elegí una imagen (jpg, png, etc.).");
        return;
      }
      for (const file of files) {
        const { url, storagePath } = await uploadFotoTrabajo(
          uid,
          trabajoId,
          file
        );
        await addDoc(zFotosCol(trabajoId), {
          url,
          storagePath,
          descripcion: "",
          creado: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
      setError(
        "No se pudo subir la foto. Revisá las reglas de Storage en Firebase (carpeta Zingueria)."
      );
    } finally {
      setBusy(false);
    }
  }

  async function borrar(f: Foto) {
    if (!confirm("¿Borrar esta foto?")) return;
    try {
      await borrarFotoStorage(f.storagePath);
      await deleteDoc(doc(zFotosCol(trabajoId), f.id));
    } catch (e) {
      console.error(e);
      setError("No se pudo borrar la foto.");
    }
  }

  const btnFile: CSSProperties = {
    ...zBtnGhost,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.7 : 1,
    flex: 1,
    minHeight: 44,
  };

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: zColors.muted }}>
        Sacá fotos con la cámara del celu o cargá imágenes desde la galería / PC.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {fotos.map((f) => (
          <div key={f.id} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setLightbox(f.url)}
              style={{
                display: "block",
                width: "100%",
                padding: 0,
                border: `1px solid ${zColors.border}`,
                borderRadius: 8,
                overflow: "hidden",
                background: "#0f172a",
                cursor: "pointer",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.url}
                alt=""
                style={{
                  width: "100%",
                  height: 110,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </button>
            <button
              type="button"
              onClick={() => borrar(f)}
              title="Borrar"
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 28,
                height: 28,
                borderRadius: 8,
                border: "none",
                background: "rgba(15,23,42,0.85)",
                color: "#f87171",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {fotos.length === 0 && (
        <p style={{ color: zColors.muted, fontSize: 13, marginBottom: 12 }}>
          Todavía no hay fotos en este trabajo.
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <label style={btnFile}>
          📷 Tomar foto
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            disabled={busy}
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label style={btnFile}>
          🖼️ Galería / PC
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              void onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {busy && (
        <p style={{ marginTop: 10, fontSize: 13, color: zColors.accent }}>
          Subiendo foto…
        </p>
      )}
      {error && (
        <p style={{ marginTop: 10, fontSize: 13, color: zColors.danger }}>
          {error}
        </p>
      )}

      {lightbox && (
        <div
          role="dialog"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </div>
  );
}

function PagosBlock({
  trabajoId,
  pagos,
}: {
  trabajoId: string;
  pagos: Pago[];
}) {
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(todayISO());
  const [metodo, setMetodo] = useState("efectivo");
  const [notas, setNotas] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!(Number(monto) > 0)) return;
    await addDoc(zPagosCol(trabajoId), {
      monto: Number(monto),
      fecha,
      metodo,
      notas: notas.trim(),
    });
    setMonto(0);
    setNotas("");
  }

  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
        {pagos.map((p) => (
          <li
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: `1px solid ${zColors.border}`,
              fontSize: 14,
            }}
          >
            <span>
              {formatDate(p.fecha)} · {p.metodo || "—"}
              {p.notas ? ` · ${p.notas}` : ""}
            </span>
            <strong>{formatMoney(p.monto)}</strong>
          </li>
        ))}
      </ul>
      <form
        onSubmit={add}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}
      >
        <input
          type="number"
          placeholder="Monto"
          value={monto || ""}
          onChange={(e) => setMonto(Number(e.target.value) || 0)}
          style={zInput}
        />
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={zInput}
        />
        <input
          placeholder="Método"
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          style={zInput}
        />
        <input
          placeholder="Notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          style={zInput}
        />
        <button
          type="submit"
          style={{ ...zBtnPrimary, gridColumn: "1 / -1" }}
        >
          Registrar pago
        </button>
      </form>
    </div>
  );
}

function MaterialesUsadosBlock({
  trabajoId,
  materiales,
  onUsado,
}: {
  trabajoId: string;
  materiales: Material[];
  onUsado: (costoExtra: number) => void;
}) {
  const [materialId, setMaterialId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function descontar(e: FormEvent) {
    e.preventDefault();
    const mat = materiales.find((m) => m.id === materialId);
    if (!mat || !(cantidad > 0)) return;
    if (mat.stock < cantidad) {
      setMsg("No hay stock suficiente.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await updateDoc(zMaterialRef(mat.id), {
        stock: increment(-cantidad),
      });
      await addDoc(zMovimientosCol(mat.id), {
        tipo: "salida",
        cantidad,
        trabajoId,
        fecha: todayISO(),
        notas: `Usado en trabajo ${trabajoId}`,
        creado: serverTimestamp(),
      });
      const costoExtra = (mat.precioCosto || 0) * cantidad;
      onUsado(costoExtra);
      setMsg(`Descontado ${cantidad} ${mat.unidad} de ${mat.nombre}`);
      setCantidad(1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={descontar}
        style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 8 }}
      >
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          style={zInput}
          required
        >
          <option value="">Material…</option>
          {materiales.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre} (stock {m.stock} {m.unidad})
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0.01}
          step="any"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value) || 0)}
          style={zInput}
        />
        <button type="submit" style={zBtnPrimary} disabled={busy}>
          Usar
        </button>
      </form>
      {msg && (
        <p style={{ color: zColors.muted, fontSize: 13, marginTop: 8 }}>{msg}</p>
      )}
    </div>
  );
}
