"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, doc, limit, query, updateDoc, where, getDocs } from "firebase/firestore";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import { etiquetaEstadoTrabajo } from "@/lib/trabajosFotos";
import { payloadMarcasEstadoAlCambiar } from "@/lib/trabajosFiltros";
import { actualizarSaldoClienteNegocio } from "@/lib/actualizarSaldoCliente";
import { notificarWhatsappTrabajoSiConfigurado } from "@/lib/whatsapp/notificarEstadoTrabajoCliente";
import PanelRepuestosTaller from "./PanelRepuestosTaller";

type TrabajoPublico = {
  id: string;
  nroOrden: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  estado: string;
  estadoLabel: string;
  fecha: string;
};

type TrabajoStaff = {
  firebaseId: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  id: string;
  precio: number;
  moneda: string;
  estado: string;
  esGarantia?: boolean;
  sinReparacion?: boolean;
  reparacionRealizada?: string;
};

const ESTADOS_TALLER = [
  { id: "PENDIENTE", label: "Pendiente" },
  { id: "GARANTIA", label: "Garantía" },
  { id: "SIN REPARACION", label: "Sin reparación" },
  { id: "REPARADO", label: "Reparado" },
  { id: "ENTREGADO", label: "Entregado" },
] as const;

export default function TallerTrabajoPage() {
  const params = useParams();
  const negocioID = String(params?.negocioID || "");
  const token = String(params?.token || "");
  const [user, authLoading] = useAuthState(auth);
  const { rol } = useRol();
  const [publico, setPublico] = useState<TrabajoPublico | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [staff, setStaff] = useState<TrabajoStaff | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState("");
  const [aviso, setAviso] = useState("");
  const [staffListo, setStaffListo] = useState(false);
  const [rolListo, setRolListo] = useState(false);
  const [pedirReparacion, setPedirReparacion] = useState(false);
  const [reparacionInput, setReparacionInput] = useState("");
  const [guardandoReparacion, setGuardandoReparacion] = useState(false);

  const esStaff =
    !!user &&
    !!rol &&
    rol.tipo !== "cliente" &&
    rol.negocioID === negocioID;

  useEffect(() => {
    if (!user || rol) {
      setRolListo(true);
      return;
    }
    setRolListo(false);
    const t = window.setTimeout(() => setRolListo(true), 4000);
    return () => window.clearTimeout(t);
  }, [user, rol]);

  useEffect(() => {
    if (!negocioID || !token) return;
    let cancel = false;
    (async () => {
      setCargando(true);
      setError("");
      try {
        const res = await fetch(
          `/api/estado-trabajo?negocioID=${encodeURIComponent(negocioID)}&token=${encodeURIComponent(token)}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "No encontrado");
        if (cancel) return;
        setNombreNegocio(String(json.negocio?.nombre || ""));
        setPublico(json.trabajo as TrabajoPublico);
      } catch (e) {
        if (!cancel) setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (!cancel) setCargando(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [negocioID, token]);

  useEffect(() => {
    if (!esStaff || !negocioID || !token) {
      setStaff(null);
      setStaffListo(!esStaff);
      return;
    }
    setStaffListo(false);
    let cancel = false;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, `negocios/${negocioID}/trabajos`),
            where("tokenPublico", "==", token),
            limit(1)
          )
        );
        if (cancel) return;
        const docSnap = snap.docs[0];
        if (!docSnap) {
          setStaff(null);
          setStaffListo(true);
          return;
        }
        const d = docSnap.data();
        setStaff({
          firebaseId: docSnap.id,
          cliente: String(d.cliente || ""),
          modelo: String(d.modelo || ""),
          trabajo: String(d.trabajo || ""),
          id: String(d.id || ""),
          precio: Number(d.precio ?? 0),
          moneda: String(d.moneda || "ARS"),
          estado: String(d.estado || ""),
          esGarantia: d.esGarantia === true,
          sinReparacion: d.sinReparacion === true,
          reparacionRealizada: String(d.reparacionRealizada || ""),
        });
        setStaffListo(true);
      } catch (e) {
        console.warn("No se pudo cargar la orden para editar:", e);
        if (!cancel) {
          setStaff(null);
          setStaffListo(true);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [esStaff, negocioID, token]);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!staff || !esStaff || guardando) return;
    const estadoAnterior = String(staff.estado || publico?.estado || "").toUpperCase();
    if (estadoAnterior === nuevoEstado) return;

    setGuardando(nuevoEstado);
    setAviso("");
    try {
      const fechaModificacion = new Date().toLocaleDateString("es-AR");
      await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${staff.firebaseId}`), {
        estado: nuevoEstado,
        fechaModificacion,
        ...payloadMarcasEstadoAlCambiar(staff, nuevoEstado),
      });

      const estadosValidos = ["ENTREGADO", "PAGADO"];
      const precio = Number(staff.precio || 0);
      const moneda = staff.moneda || "ARS";
      const entro = !estadosValidos.includes(estadoAnterior) && estadosValidos.includes(nuevoEstado);
      const salio = estadosValidos.includes(estadoAnterior) && !estadosValidos.includes(nuevoEstado);
      if ((entro || salio) && precio > 0 && staff.cliente) {
        const signo = entro ? 1 : -1;
        await actualizarSaldoClienteNegocio(
          negocioID,
          staff.cliente,
          moneda === "ARS" ? signo * precio : 0,
          moneda === "USD" ? signo * precio : 0
        );
      }

      await notificarWhatsappTrabajoSiConfigurado(
        negocioID,
        {
          firebaseId: staff.firebaseId,
          cliente: staff.cliente,
          modelo: staff.modelo,
          trabajo: staff.trabajo,
          id: staff.id,
        },
        estadoAnterior,
        nuevoEstado
      );

      setStaff({ ...staff, estado: nuevoEstado, ...payloadMarcasEstadoAlCambiar(staff, nuevoEstado) });
      setPublico((prev) =>
        prev
          ? {
              ...prev,
              estado: nuevoEstado,
              estadoLabel: etiquetaEstadoTrabajo(nuevoEstado),
            }
          : prev
      );
      const pideDetalle = nuevoEstado === "REPARADO" || nuevoEstado === "ENTREGADO";
      if (pideDetalle && !String(staff.reparacionRealizada ?? "").trim()) {
        setReparacionInput("");
        setPedirReparacion(true);
        setAviso("Estado actualizado. Anotá qué reparación se le hizo.");
      } else {
        setAviso("Estado actualizado");
      }
    } catch (e) {
      console.error(e);
      setAviso(e instanceof Error ? e.message : "No se pudo cambiar el estado");
    } finally {
      setGuardando("");
    }
  };

  const guardarReparacion = async () => {
    if (!staff || guardandoReparacion) return;
    const reparacion = reparacionInput.trim();
    if (!reparacion) {
      setPedirReparacion(false);
      setReparacionInput("");
      return;
    }
    setGuardandoReparacion(true);
    setAviso("");
    try {
      const fechaModificacion = new Date().toLocaleDateString("es-AR");
      await updateDoc(doc(db, `negocios/${negocioID}/trabajos/${staff.firebaseId}`), {
        reparacionRealizada: reparacion,
        fechaModificacion,
      });
      setStaff({ ...staff, reparacionRealizada: reparacion });
      setPedirReparacion(false);
      setReparacionInput("");
      setAviso("Reparación guardada");
    } catch (e) {
      console.error(e);
      setAviso(e instanceof Error ? e.message : "No se pudo guardar la reparación");
    } finally {
      setGuardandoReparacion(false);
    }
  };

  if (cargando || authLoading || (user && !rol && !rolListo) || (esStaff && !staffListo)) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <p className="text-[#2c3e50] font-medium">Cargando orden…</p>
      </main>
    );
  }

  if (error || !publico) {
    return (
      <main className="min-h-screen bg-[#f4f6f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-[#e74c3c] mb-2">No disponible</h1>
          <p className="text-[#7f8c8d] text-sm">{error || "Trabajo no encontrado"}</p>
        </div>
      </main>
    );
  }

  const estadoActual = String(staff?.estado || publico.estado || "").toUpperCase();
  const volver = `/taller/${encodeURIComponent(negocioID)}/${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-xs font-bold tracking-wide text-[#7f8c8d] uppercase">
            {nombreNegocio || "Taller"}
          </p>
          <h1 className="text-2xl font-black text-[#2c3e50] mt-1">
            {publico.id || publico.nroOrden || "Orden"}
          </h1>
          <p className="text-[#2c3e50] font-semibold mt-2">{publico.cliente}</p>
          <p className="text-sm text-[#34495e]">{publico.modelo}</p>
          <p className="text-sm text-[#7f8c8d] mt-1">{publico.trabajo}</p>
          {staff?.reparacionRealizada ? (
            <p className="text-sm text-[#2c3e50] mt-3">
              <span className="font-bold">Reparación realizada: </span>
              {staff.reparacionRealizada}
            </p>
          ) : null}
          <div className="mt-4 inline-flex items-center rounded-full bg-[#2c3e50] text-white text-sm font-bold px-3 py-1">
            {etiquetaEstadoTrabajo(estadoActual)}
          </div>
        </div>

        {esStaff && staff ? (
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm font-bold text-[#2c3e50] mb-3">Cambiar estado</p>
            <div className="grid grid-cols-1 gap-2">
              {ESTADOS_TALLER.map((op) => {
                const activo = estadoActual === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    disabled={activo || !!guardando}
                    onClick={() => cambiarEstado(op.id)}
                    className={`w-full rounded-xl px-4 py-3 text-left font-bold ${
                      activo
                        ? "bg-[#2c3e50] text-white"
                        : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#dfe6e9]"
                    } disabled:opacity-70`}
                  >
                    {guardando === op.id ? "Guardando…" : op.label}
                  </button>
                );
              })}
            </div>
            {aviso ? <p className="text-sm text-[#2c3e50] mt-3">{aviso}</p> : null}
            <p className="text-xs text-[#95a5a6] mt-3">
              Entregado actualiza la cuenta del cliente, igual que en gestión de trabajos. Pagado se marca desde el panel.
            </p>
          </div>
        ) : null}

        {esStaff && staff ? (
          <PanelRepuestosTaller negocioID={negocioID} trabajoId={staff.firebaseId} />
        ) : null}

        {pedirReparacion && staff ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="rounded-t-2xl bg-[#2c3e50] px-4 py-3 text-white">
                <h2 className="text-lg font-bold">Reparación realizada</h2>
              </div>
              <div className="space-y-3 p-4">
                <p className="text-sm font-semibold text-[#2c3e50]">¿Qué reparación se le realizó?</p>
                <p className="text-xs text-[#7f8c8d]">
                  El estado ya quedó guardado. Describí el trabajo para verlo en el detalle, o cerrá sin escribir.
                </p>
                <textarea
                  value={reparacionInput}
                  onChange={(e) => setReparacionInput(e.target.value)}
                  placeholder="Ej: Cambio de pantalla, cambio de batería, limpieza de conector..."
                  className="min-h-[110px] w-full rounded-xl border border-[#bdc3c7] px-3 py-2 text-base text-[#2c3e50]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={guardandoReparacion}
                    onClick={() => {
                      setPedirReparacion(false);
                      setReparacionInput("");
                    }}
                    className="flex-1 rounded-xl bg-[#ecf0f1] py-3 font-bold text-[#2c3e50]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={guardandoReparacion}
                    onClick={() => void guardarReparacion()}
                    className="flex-1 rounded-xl bg-[#8e44ad] py-3 font-bold text-white disabled:opacity-60"
                  >
                    {guardandoReparacion ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {esStaff && staff ? null : (
          <div className="bg-white rounded-2xl shadow p-5 text-center">
            <p className="text-sm text-[#7f8c8d] mb-3">
              {user && rol && rol.negocioID !== negocioID
                ? "Esta orden es de otro negocio. Ingresá con el usuario de ese taller para cambiar el estado o agregar un repuesto."
                : "Ingresá con tu usuario del taller para cambiar el estado o agregar un repuesto."}
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(volver)}`}
              className="inline-block rounded-xl bg-[#3498db] text-white font-bold px-4 py-3"
            >
              Ingresar
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
