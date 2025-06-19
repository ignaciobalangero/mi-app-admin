import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    enviarAServicio,
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