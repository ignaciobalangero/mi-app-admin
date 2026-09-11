"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useZingueriaSession } from "@/lib/zingueria/auth";
import { gananciaTrabajo, totalTrabajo } from "@/lib/zingueria/calculos";
import { formatMoney, todayISO } from "@/lib/zingueria/format";
import { uploadFotoTrabajo } from "@/lib/zingueria/fotos";
import {
  zClientesCol,
  zFotosCol,
  zMedidasCol,
  zPagosCol,
  zTrabajosCol,
} from "@/lib/zingueria/paths";
import type { Cliente, EstadoTrabajo } from "@/lib/zingueria/types";
import { ESTADOS_TRABAJO } from "@/lib/zingueria/types";
import {
  zBtnGhost,
  zBtnPrimary,
  zColors,
  zInput,
} from "@/lib/zingueria/ui";

interface MedidaDraft {
  key: string;
  descripcion: string;
  valor: string;
}

interface FotoDraft {
  key: string;
  file: File;
  preview: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ModalNuevoTrabajo({ open, onClose }: Props) {
  const { user } = useZingueriaSession();
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [busqCliente, setBusqCliente] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState("");
  const [estado, setEstado] = useState<EstadoTrabajo>("presupuesto");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState(todayISO());
  const [fechaFin, setFechaFin] = useState("");
  const [precioTrabajo, setPrecioTrabajo] = useState(0);
  const [precioMaterial, setPrecioMaterial] = useState(0);
  const [costoMaterial, setCostoMaterial] = useState(0);
  const [sena, setSena] = useState(0);
  const [notas, setNotas] = useState("");
  const [medidas, setMedidas] = useState<MedidaDraft[]>([
    { key: "1", descripcion: "", valor: "" },
  ]);
  const [fotos, setFotos] = useState<FotoDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFotos((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    const q = query(zClientesCol(), where("ownerUid", "==", user.uid));
    getDocs(q).then((snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Cliente, "id">),
      }));
      list.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      setClientes(list);
    });
  }, [open, user]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: FotoDraft[] = [];
    Array.from(list).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      next.push({
        key: `${Date.now()}-${file.name}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    });
    if (next.length) setFotos((f) => [...f, ...next]);
  }

  function removeFoto(key: string) {
    setFotos((arr) => {
      const hit = arr.find((f) => f.key === key);
      if (hit) URL.revokeObjectURL(hit.preview);
      return arr.filter((f) => f.key !== key);
    });
  }

  const total = useMemo(
    () => totalTrabajo({ precioTrabajo, precioMaterial }),
    [precioTrabajo, precioMaterial]
  );
  const ganancia = useMemo(
    () => gananciaTrabajo({ precioTrabajo, precioMaterial, costoMaterial }),
    [precioTrabajo, precioMaterial, costoMaterial]
  );
  const clientesFiltrados = useMemo(() => {
    const term = busqCliente.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((c) =>
      `${c.nombre} ${c.telefono || ""}`.toLowerCase().includes(term)
    );
  }, [clientes, busqCliente]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError("");
    setBusy(true);
    try {
      let cid = clienteId;
      let cNombre =
        clientes.find((c) => c.id === clienteId)?.nombre || nuevoCliente.trim();

      if (!cid && nuevoCliente.trim()) {
        const ref = await addDoc(zClientesCol(), {
          ownerUid: user.uid,
          nombre: nuevoCliente.trim(),
          telefono: "",
          direccion: "",
          notas: "",
          creado: serverTimestamp(),
        });
        cid = ref.id;
        cNombre = nuevoCliente.trim();
      }
      if (!cid || !cNombre) {
        setError("Elegí o creá un cliente.");
        setBusy(false);
        return;
      }
      if (!titulo.trim()) {
        setError("Falta el título del trabajo.");
        setBusy(false);
        return;
      }

      const trabajoRef = await addDoc(zTrabajosCol(), {
        ownerUid: user.uid,
        clienteId: cid,
        clienteNombre: cNombre,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        estado,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
        precioTrabajo: Number(precioTrabajo) || 0,
        precioMaterial: Number(precioMaterial) || 0,
        costoMaterial: Number(costoMaterial) || 0,
        notas: notas.trim(),
        creado: serverTimestamp(),
      });

      const medidasValidas = medidas.filter(
        (m) => m.descripcion.trim() || m.valor.trim()
      );
      await Promise.all(
        medidasValidas.map((m) =>
          addDoc(zMedidasCol(trabajoRef.id), {
            descripcion: m.descripcion.trim(),
            valor: m.valor.trim(),
            creado: serverTimestamp(),
          })
        )
      );

      if (Number(sena) > 0) {
        await addDoc(zPagosCol(trabajoRef.id), {
          monto: Number(sena),
          fecha: todayISO(),
          metodo: "seña",
          notas: "Seña al crear trabajo",
        });
      }

      for (const f of fotos) {
        try {
          const { url, storagePath } = await uploadFotoTrabajo(
            user.uid,
            trabajoRef.id,
            f.file
          );
          await addDoc(zFotosCol(trabajoRef.id), {
            url,
            storagePath,
            descripcion: "",
            creado: serverTimestamp(),
          });
        } catch {
          // el trabajo ya se creó; seguimos con el resto
        }
      }
      fotos.forEach((f) => URL.revokeObjectURL(f.preview));

      onClose();
      router.push(`/zingueria/app/trabajos/${trabajoRef.id}`);
    } catch {
      setError("No se pudo guardar el trabajo.");
    } finally {
      setBusy(false);
    }
  }

  const btnFile = {
    ...zBtnGhost,
    display: "inline-block" as const,
    textAlign: "center" as const,
    flex: 1,
    padding: "12px 10px",
    cursor: "pointer" as const,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "24px 12px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
        style={{
          background: zColors.card,
          border: `1px solid ${zColors.border}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 560,
          padding: 20,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>Nuevo trabajo</h2>
          <button type="button" style={zBtnGhost} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <Field label="Buscar cliente">
          <input
            value={busqCliente}
            onChange={(e) => setBusqCliente(e.target.value)}
            style={zInput}
            placeholder="Escribí nombre o teléfono…"
          />
          <select
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              if (e.target.value) setNuevoCliente("");
            }}
            style={{ ...zInput, marginTop: 8 }}
          >
            <option value="">— Elegir —</option>
            {clientesFiltrados.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.telefono ? ` · ${c.telefono}` : ""}
              </option>
            ))}
          </select>
          {busqCliente && !clientesFiltrados.length && (
            <div style={{ fontSize: 12, color: zColors.muted, marginTop: 6 }}>
              No hay coincidencias. Creá uno nuevo abajo.
            </div>
          )}
        </Field>

        <Field label="O crear cliente nuevo">
          <input
            value={nuevoCliente}
            onChange={(e) => {
              setNuevoCliente(e.target.value);
              if (e.target.value) setClienteId("");
            }}
            style={zInput}
            placeholder="Nombre del cliente"
          />
        </Field>

        <Field label="Estado">
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoTrabajo)}
            style={zInput}
          >
            {ESTADOS_TRABAJO.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Título">
          <input
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            style={zInput}
            placeholder="Ej. Canaleta 6m + bajadas"
          />
        </Field>

        <Field label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            style={{ ...zInput, minHeight: 72, resize: "vertical" }}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Fecha inicio">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={zInput}
            />
          </Field>
          <Field label="Fecha fin">
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={zInput}
            />
          </Field>
        </div>

        <div style={{ marginTop: 8, marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <strong style={{ fontSize: 13 }}>Medidas</strong>
            <button
              type="button"
              style={{ ...zBtnGhost, padding: "6px 10px", fontSize: 12 }}
              onClick={() =>
                setMedidas((m) => [
                  ...m,
                  { key: String(Date.now()), descripcion: "", valor: "" },
                ])
              }
            >
              + Medida
            </button>
          </div>
          {medidas.map((m, idx) => (
            <div
              key={m.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr auto",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <input
                placeholder="Descripción"
                value={m.descripcion}
                onChange={(e) => {
                  const v = e.target.value;
                  setMedidas((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, descripcion: v } : x))
                  );
                }}
                style={zInput}
              />
              <input
                placeholder="Valor"
                value={m.valor}
                onChange={(e) => {
                  const v = e.target.value;
                  setMedidas((arr) =>
                    arr.map((x, i) => (i === idx ? { ...x, valor: v } : x))
                  );
                }}
                style={zInput}
              />
              <button
                type="button"
                style={zBtnGhost}
                onClick={() =>
                  setMedidas((arr) =>
                    arr.length === 1 ? arr : arr.filter((_, i) => i !== idx)
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>Fotos</strong>
          <p style={{ margin: "4px 0 10px", fontSize: 12, color: zColors.muted }}>
            Sacá del celu o elegí de la galería / PC. Se suben al guardar.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <label style={btnFile}>
              📷 Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                  addFiles(e.target.files);
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
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {fotos.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {fotos.map((f) => (
                <div key={f.key} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.preview}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                      borderRadius: 8,
                      border: `1px solid ${zColors.border}`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeFoto(f.key)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      border: "none",
                      borderRadius: 999,
                      width: 24,
                      height: 24,
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
        >
          <Field label="Precio trabajo">
            <input
              type="number"
              min={0}
              value={precioTrabajo || ""}
              onChange={(e) => setPrecioTrabajo(Number(e.target.value) || 0)}
              style={zInput}
            />
          </Field>
          <Field label="Precio material">
            <input
              type="number"
              min={0}
              value={precioMaterial || ""}
              onChange={(e) => setPrecioMaterial(Number(e.target.value) || 0)}
              style={zInput}
            />
          </Field>
          <Field label="Costo material">
            <input
              type="number"
              min={0}
              value={costoMaterial || ""}
              onChange={(e) => setCostoMaterial(Number(e.target.value) || 0)}
              style={zInput}
            />
          </Field>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            margin: "8px 0 12px",
            fontSize: 14,
            color: zColors.accent,
            fontWeight: 700,
          }}
        >
          <span>Total: {formatMoney(total)}</span>
          <span>Ganancia: {formatMoney(ganancia)}</span>
        </div>

        <Field label="Seña (pago inicial)">
          <input
            type="number"
            min={0}
            value={sena || ""}
            onChange={(e) => setSena(Number(e.target.value) || 0)}
            style={zInput}
          />
        </Field>

        <Field label="Notas">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            style={{ ...zInput, minHeight: 60, resize: "vertical" }}
          />
        </Field>

        {error && (
          <p style={{ color: zColors.danger, fontSize: 13 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            ...zBtnPrimary,
            width: "100%",
            marginTop: 8,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy
            ? fotos.length
              ? "Guardando y subiendo fotos…"
              : "Guardando…"
            : "Crear trabajo"}
        </button>
      </form>
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
    <label style={{ display: "block", marginBottom: 10, fontSize: 12 }}>
      <span style={{ color: zColors.muted }}>{label}</span>
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}
