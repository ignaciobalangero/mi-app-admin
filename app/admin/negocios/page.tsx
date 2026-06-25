"use client";

import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { esSuperAdminUsuario } from "@/lib/superAdminConstants";
import {
  calcularNuevaFechaVencimiento,
  cuentaAccesoSuspendido,
  debePagoSuscripcion,
  etiquetaPlan,
  fechaFirestoreADate,
  formatearFechaSuscripcion,
  formatearMontoPago,
  pagoSuscripcionDesdeFirestore,
  type PagoSuscripcionRegistro,
} from "@/lib/pagosSuscripcionAdmin";

interface AdminSuscripcion {
  id: string;
  email: string;
  negocioID: string;
  planActivo?: string;
  fechaVencimiento?: unknown;
  esExento?: boolean;
  fechaRegistro?: unknown;
  nombre?: string;
  ultimoPagoSuscripcion?: unknown;
  ultimoPagoMonto?: number | null;
  estado?: string;
  accesoHabilitado?: boolean;
}

interface DetailModal {
  isOpen: boolean;
  admin: AdminSuscripcion | null;
}

interface EditModal {
  isOpen: boolean;
  admin: AdminSuscripcion | null;
  newEmail: string;
  newPassword: string;
}

export default function GestionSuscripciones() {
  const auth = getAuth();
  const router = useRouter();
  const [currentUID, setCurrentUID] = useState<string | null>(null);
  const [adminsSuscripcion, setAdminsSuscripcion] = useState<AdminSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<
    "todos" | "vencidos" | "por_vencer" | "activos" | "exentos" | "deben_pagar"
  >("todos");
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState("");
  
  const [detailModal, setDetailModal] = useState<DetailModal>({
    isOpen: false,
    admin: null
  });
  
  const [editModal, setEditModal] = useState<EditModal>({
    isOpen: false,
    admin: null,
    newEmail: "",
    newPassword: ""
  });

  const [configFacturacion, setConfigFacturacion] = useState<Record<string, {
    facturacionElectronicaHabilitada: boolean;
    facturacionElectronicaSolicitada?: boolean;
    cuit?: string;
    puntoVenta?: number;
  }>>({});

  const [modalDatosFacturacion, setModalDatosFacturacion] = useState<{
    isOpen: boolean;
    negocioID: string;
    nombre: string;
    cuit: string;
    puntoVenta: string;
  }>({ isOpen: false, negocioID: "", nombre: "", cuit: "", puntoVenta: "1" });
  const [guardandoDatosFacturacion, setGuardandoDatosFacturacion] = useState(false);

  const [modalPago, setModalPago] = useState<{
    isOpen: boolean;
    admin: AdminSuscripcion | null;
    fechaPago: string;
    monto: string;
    meses: number;
    notas: string;
  }>({
    isOpen: false,
    admin: null,
    fechaPago: new Date().toISOString().slice(0, 10),
    monto: "",
    meses: 1,
    notas: "",
  });
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [historialPagos, setHistorialPagos] = useState<PagoSuscripcionRegistro[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const esSuperAdmin = esSuperAdminUsuario(
    currentUID ? { uid: currentUID } : null
  );

  const llamarApiSuscripcion = async (payload: Record<string, unknown>) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sesión expirada. Volvé a iniciar sesión.");

    const res = await fetch("/api/superadmin/suscripcion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(String(data.error || "No se pudo actualizar la suscripción"));
    }
    return data;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUID(user?.uid || null);
    });
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (currentUID && !esSuperAdminUsuario({ uid: currentUID })) {
      router.push("/");
      return;
    }

    if (currentUID && esSuperAdminUsuario({ uid: currentUID })) {
      cargarAdminsSuscripcion();
    }
  }, [currentUID, router]);

  // FUNCIÓN OPTIMIZADA - Solo carga admins
  const cargarAdminsSuscripcion = async () => {
    try {
      setLoading(true);
      
      const q = query(
        collection(db, "usuarios"),
        where("rol", "==", "admin"),
        orderBy("email")
      );
      
      const snapshot = await getDocs(q);
      const adminsData: AdminSuscripcion[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        adminsData.push({
          id: doc.id,
          email: data.email,
          negocioID: data.negocioID,
          planActivo: data.planActivo,
          fechaVencimiento: data.fechaVencimiento,
          esExento: data.esExento,
          fechaRegistro: data.fechaRegistro,
          nombre: data.nombre,
          ultimoPagoSuscripcion: data.ultimoPagoSuscripcion,
          ultimoPagoMonto: data.ultimoPagoMonto ?? null,
          estado: data.estado,
          accesoHabilitado: data.accesoHabilitado,
        });
      });

      setAdminsSuscripcion(adminsData);

      // Evitar problemas con downlevelIteration en builds (Set no iterable en targets viejos).
      const negocioIDs = Array.from(new Set(adminsData.map((a) => a.negocioID)));
      const configs: Record<string, {
        facturacionElectronicaHabilitada: boolean;
        facturacionElectronicaSolicitada?: boolean;
        cuit?: string;
        puntoVenta?: number;
      }> = {};
      for (const nid of negocioIDs) {
        try {
          const configSnap = await getDoc(doc(db, `negocios/${nid}/configuracion`, "datos"));
          if (configSnap.exists()) {
            const d = configSnap.data();
            configs[nid] = {
              facturacionElectronicaHabilitada: !!d.facturacionElectronicaHabilitada,
              facturacionElectronicaSolicitada: !!d.facturacionElectronicaSolicitada,
              cuit: d.cuit != null ? String(d.cuit) : undefined,
              puntoVenta: d.puntoVenta != null ? Number(d.puntoVenta) : undefined,
            };
          } else {
            configs[nid] = { facturacionElectronicaHabilitada: false, facturacionElectronicaSolicitada: false };
          }
        } catch {
          configs[nid] = { facturacionElectronicaHabilitada: false, facturacionElectronicaSolicitada: false };
        }
      }
      setConfigFacturacion(configs);
      
    } catch (error) {
      console.error("Error al cargar admins:", error);
      setMensaje("❌ Error al cargar suscripciones");
    } finally {
      setLoading(false);
    }
  };

  const toggleFacturacionElectronica = async (negocioID: string, habilitar: boolean) => {
    try {
      const configRef = doc(db, `negocios/${negocioID}/configuracion`, "datos");
      await setDoc(configRef, { facturacionElectronicaHabilitada: habilitar }, { merge: true });
      setConfigFacturacion((prev) => ({
        ...prev,
        [negocioID]: {
          ...prev[negocioID],
          facturacionElectronicaHabilitada: habilitar,
        },
      }));
      setMensaje(habilitar ? "✅ Facturación electrónica habilitada" : "✅ Facturación electrónica deshabilitada");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error: any) {
      console.error("Error:", error);
      setMensaje("❌ Error al actualizar");
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const abrirModalDatosFacturacion = (admin: AdminSuscripcion) => {
    const cfg = configFacturacion[admin.negocioID];
    setModalDatosFacturacion({
      isOpen: true,
      negocioID: admin.negocioID,
      nombre: admin.nombre || admin.negocioID,
      cuit: cfg?.cuit ?? "",
      puntoVenta: cfg?.puntoVenta != null ? String(cfg.puntoVenta) : "1",
    });
  };

  const guardarDatosFacturacion = async () => {
    const { negocioID, cuit, puntoVenta } = modalDatosFacturacion;
    if (!negocioID || !cuit.trim()) {
      setMensaje("❌ El CUIT es obligatorio");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }
    setGuardandoDatosFacturacion(true);
    try {
      const configRef = doc(db, `negocios/${negocioID}/configuracion`, "datos");
      const cuitNum = cuit.replace(/\D/g, "");
      const pv = puntoVenta.trim() ? parseInt(puntoVenta, 10) || 1 : 1;
      await setDoc(configRef, { cuit: cuitNum, puntoVenta: pv }, { merge: true });
      setConfigFacturacion((prev) => ({
        ...prev,
        [negocioID]: {
          ...prev[negocioID],
          cuit: cuitNum,
          puntoVenta: pv,
        },
      }));
      setMensaje("✅ Datos de facturación guardados");
      setTimeout(() => setMensaje(""), 3000);
      setModalDatosFacturacion((prev) => ({ ...prev, isOpen: false }));
    } catch (error: any) {
      console.error("Error:", error);
      setMensaje("❌ Error al guardar");
      setTimeout(() => setMensaje(""), 3000);
    } finally {
      setGuardandoDatosFacturacion(false);
    }
  };

  const extenderSuscripcion = async (admin: AdminSuscripcion, meses: number) => {
    setActualizando(admin.id);
    try {
      await llamarApiSuscripcion({
        action: "extender",
        adminId: admin.id,
        meses,
      });

      await cargarAdminsSuscripcion();
      setMensaje(`✅ Suscripción extendida ${meses} mes${meses !== 1 ? "es" : ""}`);
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMensaje(
        `❌ ${error instanceof Error ? error.message : "Error al extender suscripción"}`
      );
      setTimeout(() => setMensaje(""), 5000);
    }
    setActualizando(null);
  };

  const habilitarAccesoNegocio = async (admin: AdminSuscripcion) => {
    setActualizando(admin.id);
    try {
      await llamarApiSuscripcion({
        action: "habilitar",
        adminId: admin.id,
        meses: 1,
      });

      await cargarAdminsSuscripcion();
      setMensaje("✅ Acceso habilitado por 1 mes (sin registrar pago)");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error al habilitar acceso:", error);
      setMensaje(
        `❌ ${error instanceof Error ? error.message : "Error al habilitar el acceso"}`
      );
      setTimeout(() => setMensaje(""), 5000);
    }
    setActualizando(null);
  };

  const suspenderAccesoNegocio = async (admin: AdminSuscripcion) => {
    const ok = window.confirm(
      `¿Suspender el acceso de "${admin.negocioID}"? No podrá entrar al sistema hasta que lo habilites de nuevo.`
    );
    if (!ok) return;

    setActualizando(admin.id);
    try {
      await llamarApiSuscripcion({
        action: "suspender",
        adminId: admin.id,
      });
      await cargarAdminsSuscripcion();
      setMensaje("⛔ Acceso suspendido");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error al suspender acceso:", error);
      setMensaje(
        `❌ ${error instanceof Error ? error.message : "Error al suspender el acceso"}`
      );
      setTimeout(() => setMensaje(""), 5000);
    }
    setActualizando(null);
  };

  const abrirModalPago = (admin: AdminSuscripcion, meses = 1) => {
    setModalPago({
      isOpen: true,
      admin,
      fechaPago: new Date().toISOString().slice(0, 10),
      monto: "",
      meses,
      notas: "",
    });
  };

  const cerrarModalPago = () => {
    setModalPago({
      isOpen: false,
      admin: null,
      fechaPago: new Date().toISOString().slice(0, 10),
      monto: "",
      meses: 1,
      notas: "",
    });
  };

  const guardarPagoSuscripcion = async () => {
    if (!modalPago.admin) return;

    const fechaPago = new Date(`${modalPago.fechaPago}T12:00:00`);
    if (Number.isNaN(fechaPago.getTime())) {
      setMensaje("❌ Fecha de pago inválida");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    const montoRaw = modalPago.monto.trim().replace(",", ".");
    const monto = montoRaw ? parseFloat(montoRaw) : null;
    if (montoRaw && (monto == null || Number.isNaN(monto) || monto < 0)) {
      setMensaje("❌ Monto inválido");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    setGuardandoPago(true);
    try {
      await llamarApiSuscripcion({
        action: "pago",
        adminId: modalPago.admin.id,
        fechaPago: modalPago.fechaPago,
        monto: montoRaw ? monto : null,
        meses: modalPago.meses,
        notas: modalPago.notas,
      });
      await cargarAdminsSuscripcion();
      setMensaje("✅ Pago registrado correctamente");
      setTimeout(() => setMensaje(""), 3000);
      cerrarModalPago();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setMensaje(
        `❌ ${error instanceof Error ? error.message : "Error al registrar el pago"}`
      );
      setTimeout(() => setMensaje(""), 5000);
    } finally {
      setGuardandoPago(false);
    }
  };

  const cargarHistorialPagos = async (adminId: string) => {
    setCargandoHistorial(true);
    try {
      const col = collection(db, "usuarios", adminId, "pagosSuscripcion");
      let pagos: PagoSuscripcionRegistro[] = [];
      try {
        const q = query(col, orderBy("fechaPago", "desc"));
        const snap = await getDocs(q);
        pagos = snap.docs.map((d) => pagoSuscripcionDesdeFirestore(d.id, d.data()));
      } catch {
        const snap = await getDocs(col);
        pagos = snap.docs
          .map((d) => pagoSuscripcionDesdeFirestore(d.id, d.data()))
          .sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime());
      }
      setHistorialPagos(pagos);
    } catch (error) {
      console.error("Error cargando historial de pagos:", error);
      setHistorialPagos([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const marcarExento = async (adminId: string, exento: boolean) => {
    setActualizando(adminId);
    try {
      const adminRef = doc(db, "usuarios", adminId);
      await updateDoc(adminRef, {
        esExento: exento,
        fechaModificacionExencion: new Date()
      });

      await cargarAdminsSuscripcion();
      setMensaje(exento ? "✅ Negocio marcado como exento" : "✅ Exención removida");
      setTimeout(() => setMensaje(""), 3000);
    } catch (error) {
      console.error("Error:", error);
      setMensaje("❌ Error al actualizar usuario");
    }
    setActualizando(null);
  };

  const eliminarNegocio = async (adminId: string, negocioID: string) => {
    const confirmacion = window.confirm(
      `¿Estás seguro de que quieres eliminar el negocio "${negocioID}"? Esta acción eliminará todos los datos del negocio y no se puede deshacer.`
    );

    if (!confirmacion) return;

    try {
      // Eliminar de la colección usuarios
      await deleteDoc(doc(db, "usuarios", adminId));
      
      // Eliminar de la colección negocios
      await deleteDoc(doc(db, "negocios", negocioID));
      
      setMensaje("✅ Negocio eliminado exitosamente");
      await cargarAdminsSuscripcion();
    } catch (error: any) {
      console.error("Error al eliminar negocio:", error);
      setMensaje(`❌ Error al eliminar: ${error.message}`);
    }
  };

  // Modales
  const abrirModalDetalle = (admin: AdminSuscripcion) => {
    setDetailModal({
      isOpen: true,
      admin,
    });
    void cargarHistorialPagos(admin.id);
  };

  const abrirModalEdicion = (admin: AdminSuscripcion) => {
    setEditModal({
      isOpen: true,
      admin,
      newEmail: admin.email,
      newPassword: ""
    });
  };

  const cerrarModales = () => {
    setDetailModal({ isOpen: false, admin: null });
    setEditModal({ isOpen: false, admin: null, newEmail: "", newPassword: "" });
    setHistorialPagos([]);
    setMensaje("");
  };

  const guardarCambios = async () => {
    if (!editModal.admin) return;

    try {
      const { admin, newEmail, newPassword } = editModal;
      const updates: any = {};

      if (newEmail && newEmail !== admin.email) {
        updates.email = newEmail;
      }

      if (newPassword) {
        updates.password = newPassword;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "usuarios", admin.id), updates);
        
        setMensaje("✅ Usuario actualizado exitosamente");
        setTimeout(() => {
          cerrarModales();
          cargarAdminsSuscripcion();
        }, 1500);
      } else {
        setMensaje("⚠️ No hay cambios para guardar");
      }

    } catch (error: any) {
      console.error("Error al guardar cambios:", error);
      setMensaje(`❌ Error: ${error.message}`);
    }
  };

  // Función para obtener estado de suscripción
  const obtenerEstadoSuscripcion = (admin: AdminSuscripcion) => {
    if (admin.esExento) {
      return { estado: 'exento', dias: null, color: 'text-blue-600' };
    }

    if (!admin.fechaVencimiento) {
      return { estado: 'sin_plan', dias: null, color: 'text-gray-600' };
    }

    const ahora = new Date();
    const fechaVencimiento = fechaFirestoreADate(admin.fechaVencimiento);
    if (!fechaVencimiento) {
      return { estado: "sin_plan", dias: null, color: "text-gray-600" };
    }
    const diferencia = fechaVencimiento.getTime() - ahora.getTime();
    const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

    if (diasRestantes < 0) {
      return { estado: 'vencido', dias: Math.abs(diasRestantes), color: 'text-red-600' };
    } else if (diasRestantes <= 7) {
      return { estado: 'por_vencer', dias: diasRestantes, color: 'text-orange-600' };
    } else {
      return { estado: 'activo', dias: diasRestantes, color: 'text-green-600' };
    }
  };

  const prioridadEstadoSuscripcion = (estado: string): number => {
    switch (estado) {
      case "activo":
        return 1;
      case "por_vencer":
        return 2;
      case "vencido":
        return 3;
      case "sin_plan":
        return 4;
      case "exento":
        return 5;
      default:
        return 6;
    }
  };

  const compararAdminsSuscripcion = (a: AdminSuscripcion, b: AdminSuscripcion): number => {
    const sa = obtenerEstadoSuscripcion(a);
    const sb = obtenerEstadoSuscripcion(b);
    const pa = prioridadEstadoSuscripcion(sa.estado);
    const pb = prioridadEstadoSuscripcion(sb.estado);
    if (pa !== pb) return pa - pb;

    if (sa.estado === "activo" || sa.estado === "por_vencer") {
      return (sa.dias ?? 0) - (sb.dias ?? 0);
    }
    if (sa.estado === "vencido") {
      return (sa.dias ?? 0) - (sb.dias ?? 0);
    }

    return a.negocioID.localeCompare(b.negocioID, "es", { sensitivity: "base" });
  };

  const formatearFecha = (fecha: unknown) => formatearFechaSuscripcion(fecha) || "N/A";

  const previewNuevaFechaVencimiento = () => {
    if (!modalPago.admin) return null;
    const fechaPago = new Date(`${modalPago.fechaPago}T12:00:00`);
    if (Number.isNaN(fechaPago.getTime())) return null;
    return calcularNuevaFechaVencimiento(
      fechaFirestoreADate(modalPago.admin.fechaVencimiento),
      fechaPago,
      modalPago.meses
    );
  };

  // Filtrar y ordenar admins
  const adminsFiltrados = adminsSuscripcion
    .filter(admin => {
    if (filtro === 'todos') return true;
    
    const { estado } = obtenerEstadoSuscripcion(admin);
    
    switch (filtro) {
      case 'vencidos':
        return estado === 'vencido';
      case 'por_vencer':
        return estado === 'por_vencer';
      case 'activos':
        return estado === 'activo';
      case 'exentos':
        return estado === 'exento';
      case "deben_pagar":
        return debePagoSuscripcion(
          admin.fechaVencimiento,
          admin.ultimoPagoSuscripcion,
          admin.esExento
        );
      default:
        return true;
    }
  })
    .sort(compararAdminsSuscripcion);

  // Estadísticas
  const estadisticas = {
    total: adminsSuscripcion.length,
    activos: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'activo').length,
    vencidos: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'vencido').length,
    porVencer: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'por_vencer').length,
    exentos: adminsSuscripcion.filter(a => obtenerEstadoSuscripcion(a).estado === 'exento').length,
    debenPagar: adminsSuscripcion.filter((a) =>
      debePagoSuscripcion(a.fechaVencimiento, a.ultimoPagoSuscripcion, a.esExento)
    ).length,
  };

  if (currentUID && !esSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚫</span>
            <p className="text-lg font-medium">Acceso denegado. Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUID || loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 text-[#7f8c8d]">
            <span className="animate-spin text-2xl">⏳</span>
            <p className="text-lg">Cargando suscripciones...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f9fa] px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">💳</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Gestión de Suscripciones
                </h1>
                <p className="text-blue-100">
                  Suscripciones, pagos recibidos y vencimientos de cada negocio
                </p>
              </div>
            </div>
            
            <button
              onClick={() => router.push("/admin/super")}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-gray-200 text-sm">Total Negocios</p>
                <p className="text-2xl font-bold text-white">{estadisticas.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-green-100 text-sm">Activos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.activos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <p className="text-orange-100 text-sm">Por Vencer</p>
                <p className="text-2xl font-bold text-white">{estadisticas.porVencer}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
              <div>
                <p className="text-red-100 text-sm">Vencidos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.vencidos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔓</span>
              </div>
              <div>
                <p className="text-blue-100 text-sm">Exentos</p>
                <p className="text-2xl font-bold text-white">{estadisticas.exentos}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#8e44ad] to-[#9b59b6] rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💸</span>
              </div>
              <div>
                <p className="text-purple-100 text-sm">Deben pagar</p>
                <p className="text-2xl font-bold text-white">{estadisticas.debenPagar}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#2c3e50] font-medium">Filtrar:</span>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'todos', label: 'Todos', color: 'bg-gray-100' },
                  { key: 'activos', label: 'Activos', color: 'bg-green-100 text-green-800' },
                  { key: 'por_vencer', label: 'Por Vencer', color: 'bg-orange-100 text-orange-800' },
                  { key: 'vencidos', label: 'Vencidos', color: 'bg-red-100 text-red-800' },
                  { key: 'exentos', label: 'Exentos', color: 'bg-blue-100 text-blue-800' },
                  { key: 'deben_pagar', label: 'Deben pagar', color: 'bg-purple-100 text-purple-800' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFiltro(f.key as any)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${f.color} ${
                      filtro === f.key ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Lista de Suscripciones */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#ecf0f1] overflow-hidden">
          <div className="bg-gradient-to-r from-[#34495e] to-[#2c3e50] p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">💳</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Gestión de Suscripciones</h2>
                <p className="text-gray-200 text-sm">
                  Administra las suscripciones de todos los negocios ({adminsFiltrados.length} mostrados)
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Negocio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vencimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Último pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fact. electrónica
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adminsFiltrados.map(admin => {
                  const { estado, dias, color } = obtenerEstadoSuscripcion(admin);
                  const cfg = configFacturacion[admin.negocioID];
                  const facturaHabilitada = cfg?.facturacionElectronicaHabilitada ?? false;
                  const facturaSolicitada = cfg?.facturacionElectronicaSolicitada ?? false;
                  const debePagar = debePagoSuscripcion(
                    admin.fechaVencimiento,
                    admin.ultimoPagoSuscripcion,
                    admin.esExento
                  );
                  const accesoSuspendido = cuentaAccesoSuspendido({
                    estado: admin.estado,
                    accesoHabilitado: admin.accesoHabilitado,
                  });
                  
                  return (
                    <tr
                      key={admin.id}
                      className={`hover:bg-gray-50 ${debePagar ? "bg-purple-50/60" : ""} ${accesoSuspendido ? "bg-red-50/50" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {admin.negocioID} ({admin.nombre || 'Sin nombre'})
                          </p>
                          <p className="text-sm text-gray-500">{admin.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${color}`}>
                          {estado === 'exento' && '🔓 Exento'}
                          {estado === 'activo' && `✅ Activo (${dias}d)`}
                          {estado === 'por_vencer' && `⚠️ Por vencer (${dias}d)`}
                          {estado === 'vencido' && `❌ Vencido (${dias}d)`}
                          {estado === 'sin_plan' && '⭕ Sin plan'}
                        </span>
                        {accesoSuspendido ? (
                          <p className="text-[10px] text-red-700 font-semibold mt-1">
                            Acceso bloqueado
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {admin.planActivo || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatearFecha(admin.fechaVencimiento)}
                      </td>
                      <td className="px-6 py-4">
                        {admin.ultimoPagoSuscripcion ? (
                          <div>
                            <p className="text-sm font-medium text-[#27ae60]">
                              {formatearFecha(admin.ultimoPagoSuscripcion)}
                            </p>
                            {admin.ultimoPagoMonto != null && (
                              <p className="text-xs text-gray-500">
                                {formatearMontoPago(admin.ultimoPagoMonto)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-[#c0392b]">Sin pagos</span>
                        )}
                        {debePagar && (
                          <p className="text-[10px] text-purple-700 font-semibold mt-1">
                            Pendiente de cobro
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {facturaSolicitada && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded w-fit">
                              📩 Solicitada
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleFacturacionElectronica(admin.negocioID, !facturaHabilitada)}
                            className={`px-2 py-1 text-xs rounded w-fit font-medium ${
                              facturaHabilitada
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {facturaHabilitada ? "✅ Habilitada" : "🧾 Habilitar"}
                          </button>
                          {facturaHabilitada && (
                            <>
                              {cfg?.cuit ? (
                                <span className="text-xs text-gray-500">CUIT: {cfg.cuit.slice(0, 4)}…{cfg.cuit.slice(-2)}</span>
                              ) : (
                                <span className="text-xs text-amber-600">Sin CUIT</span>
                              )}
                              <button
                                type="button"
                                onClick={() => abrirModalDatosFacturacion(admin)}
                                className="px-2 py-1 text-xs rounded w-fit font-medium bg-[#9b59b6]/10 text-[#9b59b6] hover:bg-[#9b59b6]/20"
                              >
                                📋 Datos AFIP
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => abrirModalPago(admin, 1)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded hover:bg-emerald-200 disabled:opacity-50 font-semibold"
                          >
                            💰 Pago
                          </button>
                          {(accesoSuspendido || estado === "vencido" || estado === "sin_plan") && (
                            <button
                              onClick={() => habilitarAccesoNegocio(admin)}
                              disabled={actualizando === admin.id}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 font-semibold"
                              title="Permite entrar y extiende 1 mes sin registrar pago"
                            >
                              ✅ Habilitar
                            </button>
                          )}
                          {!accesoSuspendido && (
                            <button
                              onClick={() => suspenderAccesoNegocio(admin)}
                              disabled={actualizando === admin.id}
                              className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200 disabled:opacity-50"
                              title="Bloquea el acceso al sistema"
                            >
                              ⛔ Suspender
                            </button>
                          )}
                          <button
                            onClick={() => extenderSuscripcion(admin, 1)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200 disabled:opacity-50"
                            title="Registra pago de hoy y extiende 1 mes"
                          >
                            +1M
                          </button>
                          <button
                            onClick={() => extenderSuscripcion(admin, 3)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200 disabled:opacity-50"
                            title="Registra pago de hoy y extiende 3 meses"
                          >
                            +3M
                          </button>
                          <button
                            onClick={() => extenderSuscripcion(admin, 12)}
                            disabled={actualizando === admin.id}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded hover:bg-purple-200 disabled:opacity-50"
                            title="Registra pago de hoy y extiende 1 año"
                          >
                            +1A
                          </button>
                          <button
                            onClick={() => marcarExento(admin.id, !admin.esExento)}
                            disabled={actualizando === admin.id}
                            className={`px-2 py-1 text-xs rounded disabled:opacity-50 ${
                              admin.esExento 
                                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            }`}
                          >
                            {admin.esExento ? 'Quitar' : 'Exento'}
                          </button>
                          <button
                            onClick={() => abrirModalDetalle(admin)}
                            className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded hover:bg-purple-200"
                          >
                            👁️ Ver
                          </button>
                          <button
                            onClick={() => abrirModalEdicion(admin)}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => eliminarNegocio(admin.id, admin.negocioID)}
                            className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200"
                          >
                            🗑️ Eliminar
                          </button>
                          {actualizando === admin.id && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div className={`p-4 rounded-xl border ${
            mensaje.includes("✅") 
              ? "bg-[#d5f4e6] border-[#27ae60] text-[#27ae60]" 
              : "bg-[#fadbd8] border-[#e74c3c] text-[#e74c3c]"
          }`}>
            <p className="font-medium">{mensaje}</p>
          </div>
        )}
      </div>

      {/* Modal de Detalle */}
      {detailModal.isOpen && detailModal.admin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">👁️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Detalle de Suscripción</h3>
                    <p className="text-purple-100 text-sm">{detailModal.admin.negocioID}</p>
                  </div>
                </div>
                
                <button
                  onClick={cerrarModales}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#f8f9fa] rounded-xl p-4">
                <h4 className="font-bold text-[#2c3e50] mb-3">📊 Información del Negocio</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Negocio ID:</strong> {detailModal.admin.negocioID}</p>
                  <p><strong>Admin Email:</strong> {detailModal.admin.email}</p>
                  <p><strong>Nombre:</strong> {detailModal.admin.nombre || 'No especificado'}</p>
                  <p><strong>Plan Activo:</strong> {detailModal.admin.planActivo || 'N/A'}</p>
                  <p><strong>Estado:</strong> 
                    <span className={`ml-2 ${obtenerEstadoSuscripcion(detailModal.admin).color}`}>
                      {obtenerEstadoSuscripcion(detailModal.admin).estado.toUpperCase()}
                    </span>
                  </p>
                  <p><strong>Vencimiento:</strong> {formatearFecha(detailModal.admin.fechaVencimiento)}</p>
                  <p><strong>Último pago:</strong>{" "}
                    {detailModal.admin.ultimoPagoSuscripcion
                      ? `${formatearFecha(detailModal.admin.ultimoPagoSuscripcion)} (${formatearMontoPago(detailModal.admin.ultimoPagoMonto)})`
                      : "Sin pagos registrados"}
                  </p>
                  <p><strong>Es Exento:</strong> {detailModal.admin.esExento ? '✅ Sí' : '❌ No'}</p>
                </div>
              </div>

              <div className="bg-[#f8f9fa] rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="font-bold text-[#2c3e50]">💰 Historial de pagos</h4>
                  <button
                    type="button"
                    onClick={() => {
                      cerrarModales();
                      abrirModalPago(detailModal.admin!, 1);
                    }}
                    className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200"
                  >
                    + Registrar pago
                  </button>
                </div>
                {cargandoHistorial ? (
                  <p className="text-sm text-[#7f8c8d]">Cargando pagos…</p>
                ) : historialPagos.length === 0 ? (
                  <p className="text-sm text-[#7f8c8d]">Todavía no hay pagos cargados para este negocio.</p>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto">
                    {historialPagos.map((pago) => (
                      <li
                        key={pago.id}
                        className="bg-white rounded-lg border border-[#ecf0f1] px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[#2c3e50]">
                              {formatearFechaSuscripcion(pago.fechaPago)} · {etiquetaPlan(pago.plan)}
                            </p>
                            <p className="text-xs text-[#7f8c8d]">
                              Vencimiento: {formatearFechaSuscripcion(pago.fechaVencimientoAnterior)} →{" "}
                              {formatearFechaSuscripcion(pago.fechaVencimientoNueva)}
                            </p>
                            {pago.notas && (
                              <p className="text-xs text-[#566573] mt-1">{pago.notas}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium text-[#27ae60] shrink-0">
                            {formatearMontoPago(pago.monto)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                onClick={cerrarModales}
                className="w-full bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6] hover:from-[#6c7b7d] hover:to-[#839192] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
              >
                ✅ Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {editModal.isOpen && editModal.admin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">✏️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Editar Usuario</h3>
                    <p className="text-blue-100 text-sm">{editModal.admin.negocioID}</p>
                  </div>
                </div>
                
                <button
                  onClick={cerrarModales}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                  📧 Email del Administrador
                </label>
                <input
                  type="email"
                  value={editModal.newEmail}
                  onChange={(e) => setEditModal(prev => ({ ...prev, newEmail: e.target.value }))}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="admin@negocio.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                  🔒 Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={editModal.newPassword}
                  onChange={(e) => setEditModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                  placeholder="Dejar vacío para mantener actual"
                />
              </div>

              <div className="bg-[#f8f9fa] rounded-lg p-3 text-sm">
                <p className="font-medium text-[#2c3e50] mb-2">📊 Información actual:</p>
                <div className="space-y-1 text-[#7f8c8d]">
                  <p>• Negocio: {editModal.admin.negocioID}</p>
                  <p>• Email actual: {editModal.admin.email}</p>
                  <p>• Plan: {editModal.admin.planActivo || 'N/A'}</p>
                  <p>• Estado: {obtenerEstadoSuscripcion(editModal.admin).estado}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={guardarCambios}
                  className="flex-1 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ✅ Guardar
                </button>
                
                <button
                  onClick={cerrarModales}
                  className="flex-1 bg-gradient-to-r from-[#7f8c8d] to-[#95a5a6] hover:from-[#6c7b7d] hover:to-[#839192] text-white py-3 px-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Pago */}
      {modalPago.isOpen && modalPago.admin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">💰</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Registrar pago</h3>
                    <p className="text-green-100 text-sm">
                      {modalPago.admin.negocioID} · {modalPago.admin.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cerrarModalPago}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#f8f9fa] rounded-lg p-3 text-sm text-[#566573]">
                <p>
                  <strong>Vencimiento actual:</strong>{" "}
                  {formatearFecha(modalPago.admin.fechaVencimiento)}
                </p>
                <p className="mt-1">
                  <strong>Último pago:</strong>{" "}
                  {modalPago.admin.ultimoPagoSuscripcion
                    ? formatearFecha(modalPago.admin.ultimoPagoSuscripcion)
                    : "Sin pagos"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                  Fecha del pago
                </label>
                <input
                  type="date"
                  value={modalPago.fechaPago}
                  onChange={(e) =>
                    setModalPago((prev) => ({ ...prev, fechaPago: e.target.value }))
                  }
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] text-[#2c3e50]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                  Monto (opcional)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={modalPago.monto}
                  onChange={(e) =>
                    setModalPago((prev) => ({ ...prev, monto: e.target.value }))
                  }
                  placeholder="Ej: 25000"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] text-[#2c3e50]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                  Período cubierto
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { meses: 1, label: "1 mes" },
                    { meses: 3, label: "3 meses" },
                    { meses: 12, label: "1 año" },
                  ].map((opt) => (
                    <button
                      key={opt.meses}
                      type="button"
                      onClick={() =>
                        setModalPago((prev) => ({ ...prev, meses: opt.meses }))
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        modalPago.meses === opt.meses
                          ? "bg-[#27ae60] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={modalPago.notas}
                  onChange={(e) =>
                    setModalPago((prev) => ({ ...prev, notas: e.target.value }))
                  }
                  rows={2}
                  placeholder="Transferencia, efectivo, factura…"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] text-[#2c3e50] resize-none"
                />
              </div>

              {previewNuevaFechaVencimiento() && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-900">
                  Nuevo vencimiento:{" "}
                  <strong>
                    {previewNuevaFechaVencimiento()!.toLocaleDateString("es-AR")}
                  </strong>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => void guardarPagoSuscripcion()}
                  disabled={guardandoPago}
                  className="flex-1 bg-[#27ae60] hover:bg-[#229954] disabled:opacity-50 text-white py-3 px-4 rounded-lg font-bold"
                >
                  {guardandoPago ? "Guardando…" : "Guardar pago"}
                </button>
                <button
                  type="button"
                  onClick={cerrarModalPago}
                  disabled={guardandoPago}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-bold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Datos AFIP (CUIT y Punto de venta) */}
      {modalDatosFacturacion.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">🧾</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Datos para facturación electrónica</h3>
                    <p className="text-purple-100 text-sm">{modalDatosFacturacion.nombre} ({modalDatosFacturacion.negocioID})</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalDatosFacturacion((prev) => ({ ...prev, isOpen: false }))}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#7f8c8d]">
                Cargá el CUIT y el punto de venta del negocio para poder emitir facturas desde Ventas, Gestión de trabajos y Resumen.
              </p>
              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-1">CUIT (11 dígitos)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={modalDatosFacturacion.cuit}
                  onChange={(e) => setModalDatosFacturacion((prev) => ({ ...prev, cuit: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Ej: 20123456789"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] text-[#2c3e50]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2c3e50] mb-1">Punto de venta</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={modalDatosFacturacion.puntoVenta}
                  onChange={(e) => setModalDatosFacturacion((prev) => ({ ...prev, puntoVenta: e.target.value.replace(/\D/g, "") }))}
                  placeholder="1"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] text-[#2c3e50]"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={guardarDatosFacturacion}
                  disabled={guardandoDatosFacturacion || !modalDatosFacturacion.cuit.trim()}
                  className="flex-1 bg-[#9b59b6] hover:bg-[#8e44ad] disabled:opacity-50 text-white py-3 px-4 rounded-lg font-bold"
                >
                  {guardandoDatosFacturacion ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalDatosFacturacion((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-bold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}