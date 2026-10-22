import { useState } from "react";
import { doc, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import useCotizacion from "@/lib/hooks/useCotizacion";

export type RepuestoServicioPropio = {
  id: string;
  coleccion: "stockRepuestos" | "stockExtra";
  nombre: string;
  codigo: string;
  cantidad: number;
  costoUnitario: number;
  moneda: string;
  costoPesos?: number;
};

export type RegistroServicioPropio = {
  motivo: string;
  manoObra: number;
  repuestos: RepuestoServicioPropio[];
};

function monedaNorm(m: unknown): "ARS" | "USD" {
  return String(m || "USD").toUpperCase() === "ARS" ? "ARS" : "USD";
}

/** Pasa el costo de un repuesto a la moneda del equipo con la cotización de Venta general. */
export function costoEnMonedaEquipo(
  costo: number,
  monedaOrigen: string,
  monedaEquipo: string,
  cotizacion: number | null
): number | null {
  const origen = monedaNorm(monedaOrigen);
  const destino = monedaNorm(monedaEquipo);
  if (origen === destino) return costo;
  if (!cotizacion || cotizacion <= 0) return null;
  if (origen === "USD" && destino === "ARS") return costo * cotizacion;
  return costo / cotizacion;
}

interface DatosServicio {
  lugar: string;
  motivo: string;
  fechaEnvio: string;
  costoServicio: string;
  monedaServicio: string;
  observacionesServicio: string;
}

interface UseServiciosProps {
  negocioID: string;
  setTelefonos: React.Dispatch<React.SetStateAction<any[]>>;
  setMensaje: (mensaje: string) => void;
}

export const useServicios = ({ negocioID, setTelefonos, setMensaje }: UseServiciosProps) => {
  const { dolarManual, usarDolarManual } = useCotizacion(negocioID);
  const cotizacion =
    usarDolarManual && dolarManual != null && dolarManual > 0 ? dolarManual : null;
  // Estados para modales
  const [mostrarModalServicio, setMostrarModalServicio] = useState(false);
  const [mostrarModalHistorial, setMostrarModalHistorial] = useState(false);
  const [mostrarModalCosto, setMostrarModalCosto] = useState(false);
  const [mostrarModalServicioActual, setMostrarModalServicioActual] = useState(false);

  // Estados para teléfonos seleccionados
  const [telefonoServicio, setTelefonoServicio] = useState<any | null>(null);
  const [telefonoHistorial, setTelefonoHistorial] = useState<any | null>(null);
  const [telefonoRetorno, setTelefonoRetorno] = useState<any | null>(null);
  const [telefonoServicioActual, setTelefonoServicioActual] = useState<any | null>(null);

  // Estados para formularios
  const [costoRetorno, setCostoRetorno] = useState("");
  const [datosServicio, setDatosServicio] = useState<DatosServicio>({
    lugar: "",
    motivo: "",
    fechaEnvio: "",
    costoServicio: "",
    monedaServicio: "USD",
    observacionesServicio: ""
  });

  // Función para enviar a servicio técnico
  const enviarAServicio = async () => {
    if (!telefonoServicio || !datosServicio.lugar || !datosServicio.motivo) {
      alert("Por favor completá todos los campos obligatorios");
      return;
    }

    try {
      const docRef = doc(db, `negocios/${negocioID}/stockTelefonos/${telefonoServicio.id}`);
      const datosActualizados = {
        ...telefonoServicio,
        enServicio: true,
        servicioTecnico: {
          lugar: datosServicio.lugar,
          motivo: datosServicio.motivo,
          fechaEnvio: datosServicio.fechaEnvio || new Date().toLocaleDateString("es-AR"),
          costoServicio: datosServicio.costoServicio ? parseFloat(datosServicio.costoServicio) : 0,
          monedaServicio: datosServicio.monedaServicio,
          observacionesServicio: datosServicio.observacionesServicio
        }
      };

      await updateDoc(docRef, datosActualizados);
      setTelefonos(prev => prev.map(t => 
        t.id === telefonoServicio.id ? datosActualizados : t
      ));

      setMensaje("🔧 Teléfono enviado a servicio técnico y guardado en Firebase");
      cerrarModalServicio();
    } catch (error) {
      console.error("Error al enviar a servicio:", error);
      alert("Error al enviar a servicio técnico: " + error.message);
    }
  };

  const registrarServicioPropio = async (payload: RegistroServicioPropio) => {
    if (!telefonoServicio) return;
    const motivo = payload.motivo.trim();
    if (!motivo) {
      alert("Contá qué se le hizo al equipo.");
      return;
    }
    const repuestos = payload.repuestos.filter((r) => r.cantidad > 0);
    const manoObra = Math.max(0, Number(payload.manoObra) || 0);
    const monedaEquipo = monedaNorm(telefonoServicio.moneda);

    const lineas = repuestos.map((r) => {
      const costo = costoEnMonedaEquipo(
        r.costoUnitario,
        r.moneda,
        monedaEquipo,
        cotizacion
      );
      return { ...r, costoEnEquipo: costo };
    });
    if (lineas.some((l) => l.costoEnEquipo == null)) {
      alert("Hay un repuesto en otra moneda. Cargá la cotización en Venta general: acá se usa solo esa.");
      return;
    }

    const costoRepuestos = lineas.reduce(
      (s, l) => s + (l.costoEnEquipo || 0) * l.cantidad,
      0
    );
    const costoFinal = Math.round((costoRepuestos + manoObra) * 100) / 100;
    const costoActual = parseFloat(telefonoServicio.precioCompra) || 0;
    const hoy = new Date().toLocaleDateString("es-AR");

    try {
      const phoneRef = doc(db, `negocios/${negocioID}/stockTelefonos/${telefonoServicio.id}`);
      const historialPrevio = telefonoServicio.historialServicios || [];
      const servicioCompleto = {
        lugar: "Servicio propio",
        motivo,
        fechaEnvio: hoy,
        fechaRetorno: hoy,
        propio: true,
        repuestos: lineas.map((l) => ({
          id: l.id,
          coleccion: l.coleccion,
          nombre: l.nombre,
          codigo: l.codigo,
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          moneda: l.moneda,
          costoEnEquipo: Math.round((l.costoEnEquipo || 0) * 100) / 100,
        })),
        manoObra,
        costoFinal,
        monedaServicio: monedaEquipo,
        sumadoAlCosto: true,
        id: Date.now(),
      };

      await runTransaction(db, async (tx) => {
        const lecturas = [];
        for (const linea of lineas) {
          const ref = doc(db, `negocios/${negocioID}/${linea.coleccion}/${linea.id}`);
          const snap = await tx.get(ref);
          lecturas.push({ linea, ref, snap });
        }
        for (const { linea, snap } of lecturas) {
          if (!snap.exists()) {
            throw new Error(`No está en stock: ${linea.nombre}`);
          }
          const cant = Number(snap.data()?.cantidad ?? snap.data()?.stock) || 0;
          if (cant < linea.cantidad) {
            throw new Error(
              `${linea.nombre} tiene ${cant} en stock y querés usar ${linea.cantidad}.`
            );
          }
        }
        for (const { linea, ref, snap } of lecturas) {
          const cant = Number(snap.data()?.cantidad ?? snap.data()?.stock) || 0;
          tx.update(ref, { cantidad: cant - linea.cantidad });
        }
        tx.update(phoneRef, {
          enServicio: false,
          precioCompra: Math.round((costoActual + costoFinal) * 100) / 100,
          costoTotalServicio:
            (parseFloat(telefonoServicio.costoTotalServicio) || 0) + costoFinal,
          historialServicios: [...historialPrevio, servicioCompleto],
        });
      });

      const datosActualizados = {
        ...telefonoServicio,
        enServicio: false,
        precioCompra: Math.round((costoActual + costoFinal) * 100) / 100,
        costoTotalServicio:
          (parseFloat(telefonoServicio.costoTotalServicio) || 0) + costoFinal,
        historialServicios: [...historialPrevio, servicioCompleto],
      };
      setTelefonos((prev) =>
        prev.map((t) => (t.id === telefonoServicio.id ? datosActualizados : t))
      );
      const detalle =
        lineas.length > 0
          ? ` Se descontaron ${lineas.length} repuesto${lineas.length === 1 ? "" : "s"} del stock.`
          : "";
      setMensaje(
        `✅ Servicio propio registrado. Costo del equipo +$${costoFinal} ${monedaEquipo}.${detalle}`
      );
      cerrarModalServicio();
    } catch (error) {
      console.error("Error en servicio propio:", error);
      const msg = error instanceof Error ? error.message : "No se pudo registrar";
      alert(msg);
    }
  };

  // Función para retornar de servicio técnico
  const handleRetornoServicio = async (sumarAlCosto: boolean) => {
    if (!telefonoRetorno) return;
    const costoFinal = parseFloat(costoRetorno) || 0;

    try {
      const docRef = doc(db, `negocios/${negocioID}/stockTelefonos/${telefonoRetorno.id}`);
      const historialServicios = telefonoRetorno.historialServicios || [];
      const servicioCompleto = {
        ...telefonoRetorno.servicioTecnico,
        fechaRetorno: new Date().toLocaleDateString("es-AR"),
        costoFinal: costoFinal,
        sumadoAlCosto: sumarAlCosto,
        id: Date.now()
      };
      
      const datosActualizados = {
        ...telefonoRetorno,
        enServicio: false,
        servicioTecnico: null,
        historialServicios: [...historialServicios, servicioCompleto],
        precioCompra: sumarAlCosto ? 
          (parseFloat(telefonoRetorno.precioCompra) || 0) + costoFinal : 
          telefonoRetorno.precioCompra,
        costoTotalServicio: (parseFloat(telefonoRetorno.costoTotalServicio) || 0) + costoFinal
      };

      await updateDoc(docRef, datosActualizados);
      setTelefonos(prev => prev.map(t => 
        t.id === telefonoRetorno.id ? datosActualizados : t
      ));

      const mensajeAdicional = sumarAlCosto ? 
        ` y sumado al costo ($${costoFinal})` : 
        ` (no sumado al costo)`;
      
      setMensaje(`✅ Teléfono retornado del servicio técnico${mensajeAdicional}`);
      cerrarModalCosto();
    } catch (error) {
      console.error("Error al retornar de servicio:", error);
      alert("Error al retornar del servicio técnico: " + error.message);
    }
  };

  // Funciones para abrir modales
  const abrirModalServicio = (telefono: any) => {
    setTelefonoServicio(telefono);
    setMostrarModalServicio(true);
  };

  const abrirModalHistorial = (telefono: any) => {
    setTelefonoHistorial(telefono);
    setMostrarModalHistorial(true);
  };

  const abrirModalRetorno = (telefono: any) => {
    setTelefonoRetorno(telefono);
    setCostoRetorno("");
    setMostrarModalCosto(true);
  };

  const abrirModalServicioActual = (telefono: any) => {
    setTelefonoServicioActual(telefono);
    setMostrarModalServicioActual(true);
  };

  // Funciones para cerrar modales
  const cerrarModalServicio = () => {
    setMostrarModalServicio(false);
    setTelefonoServicio(null);
    setDatosServicio({
      lugar: "",
      motivo: "",
      fechaEnvio: "",
      costoServicio: "",
      monedaServicio: "USD",
      observacionesServicio: ""
    });
  };

  const cerrarModalHistorial = () => {
    setMostrarModalHistorial(false);
    setTelefonoHistorial(null);
  };

  const cerrarModalCosto = () => {
    setMostrarModalCosto(false);
    setTelefonoRetorno(null);
    setCostoRetorno("");
  };

  const cerrarModalServicioActual = () => {
    setMostrarModalServicioActual(false);
    setTelefonoServicioActual(null);
  };

  // Función para ir desde modal de ver servicio actual a modal de retorno
  const irARetornoDesdeServicioActual = () => {
    if (telefonoServicioActual) {
      cerrarModalServicioActual();
      abrirModalRetorno(telefonoServicioActual);
    }
  };

  return {
    // Estados de modales
    mostrarModalServicio,
    mostrarModalHistorial,
    mostrarModalCosto,
    mostrarModalServicioActual,

    // Estados de teléfonos
    telefonoServicio,
    telefonoHistorial,
    telefonoRetorno,
    telefonoServicioActual,

    // Estados de formularios
    costoRetorno,
    setCostoRetorno,
    datosServicio,
    setDatosServicio,

    // Funciones principales
    cotizacion,
    enviarAServicio,
    registrarServicioPropio,
    handleRetornoServicio,

    // Funciones para abrir modales
    abrirModalServicio,
    abrirModalHistorial,
    abrirModalRetorno,
    abrirModalServicioActual,

    // Funciones para cerrar modales
    cerrarModalServicio,
    cerrarModalHistorial,
    cerrarModalCosto,
    cerrarModalServicioActual,

    // Función de navegación entre modales
    irARetornoDesdeServicioActual
  };
};