import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  calcularNuevaFechaVencimiento,
  fechaFirestoreADate,
  planDesdeMeses,
} from "@/lib/pagosSuscripcionAdmin";

export type AccionSuscripcionSuperadmin =
  | "extender"
  | "pago"
  | "habilitar"
  | "suspender";

function fechaAdminADate(valor: unknown): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (valor instanceof Timestamp) return valor.toDate();
  return fechaFirestoreADate(valor);
}

function planActivoDesdeMeses(meses: number): string {
  const plan = planDesdeMeses(meses);
  if (plan === "anual") return "anual";
  if (plan === "trimestral") return "trimestral";
  return "mensual";
}

async function obtenerAdmin(adminId: string) {
  const ref = getAdminDb().collection("usuarios").doc(adminId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Usuario admin no encontrado");
  }
  return { ref, data: snap.data()! };
}

async function aplicarExtension(
  adminId: string,
  meses: number,
  opts: {
    fechaPago: Date;
    monto?: number | null;
    notas?: string;
    registrarHistorial: boolean;
  }
) {
  const { ref, data } = await obtenerAdmin(adminId);
  const vencimientoAnterior = fechaAdminADate(data.fechaVencimiento);
  const nuevaFecha = calcularNuevaFechaVencimiento(
    vencimientoAnterior,
    opts.fechaPago,
    meses
  );
  const plan = planDesdeMeses(meses);
  const ahora = new Date();

  if (opts.registrarHistorial) {
    await ref.collection("pagosSuscripcion").add({
      fechaPago: Timestamp.fromDate(opts.fechaPago),
      monto: opts.monto ?? null,
      meses,
      plan,
      notas: String(opts.notas ?? "").trim(),
      fechaVencimientoAnterior: vencimientoAnterior
        ? Timestamp.fromDate(vencimientoAnterior)
        : null,
      fechaVencimientoNueva: Timestamp.fromDate(nuevaFecha),
      negocioID: data.negocioID ?? "",
      registradoEn: Timestamp.fromDate(ahora),
    });
  }

  await ref.update({
    fechaVencimiento: Timestamp.fromDate(nuevaFecha),
    planActivo: planActivoDesdeMeses(meses),
    estado: "activo",
    accesoHabilitado: true,
    ultimaActualizacion: Timestamp.fromDate(ahora),
    ...(opts.registrarHistorial
      ? {
          ultimoPagoSuscripcion: Timestamp.fromDate(opts.fechaPago),
          ultimoPagoMonto: opts.monto ?? null,
        }
      : {}),
  });

  return {
    fechaVencimiento: nuevaFecha.toISOString(),
    planActivo: planActivoDesdeMeses(meses),
  };
}

export async function ejecutarAccionSuscripcionSuperadmin(
  action: AccionSuscripcionSuperadmin,
  body: Record<string, unknown>
) {
  const adminId = String(body.adminId ?? "").trim();
  if (!adminId) throw new Error("adminId requerido");

  switch (action) {
    case "extender": {
      const meses = Math.max(1, Number(body.meses) || 1);
      return aplicarExtension(adminId, meses, {
        fechaPago: new Date(),
        notas: "Extensión rápida desde panel superadmin",
        registrarHistorial: false,
      });
    }
    case "pago": {
      const meses = Math.max(1, Number(body.meses) || 1);
      const fechaRaw = String(body.fechaPago ?? "");
      const fechaPago = fechaRaw
        ? new Date(`${fechaRaw.includes("T") ? fechaRaw : `${fechaRaw}T12:00:00`}`)
        : new Date();
      if (Number.isNaN(fechaPago.getTime())) {
        throw new Error("Fecha de pago inválida");
      }
      const montoRaw = body.monto;
      const monto =
        montoRaw == null || montoRaw === ""
          ? null
          : Number(montoRaw);
      if (monto != null && Number.isNaN(monto)) {
        throw new Error("Monto inválido");
      }
      return aplicarExtension(adminId, meses, {
        fechaPago,
        monto,
        notas: String(body.notas ?? ""),
        registrarHistorial: true,
      });
    }
    case "habilitar": {
      const meses = Math.max(1, Number(body.meses) || 1);
      return aplicarExtension(adminId, meses, {
        fechaPago: new Date(),
        notas: "Habilitación manual desde panel superadmin",
        registrarHistorial: false,
      });
    }
    case "suspender": {
      const { ref } = await obtenerAdmin(adminId);
      await ref.update({
        accesoHabilitado: false,
        estado: "suspendida",
        ultimaActualizacion: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    }
    default:
      throw new Error("Acción inválida");
  }
}
