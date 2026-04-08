"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { guardarTrabajo, guardarTrabajosBatch } from "./guardarTrabajo";
import CheckInForm from "./CheckInForm";
import { Combobox } from "@headlessui/react";
import BotonesImpresionTrabajo from "@/app/configuraciones/impresion/components/BotonesImpresionTrabajo";
import ModalConfirmarImpresion from "./ModalConfirmarImpresion";
import { PatronDrawer, PatronViewer, type Patron } from "@/app/components/PatronDesbloqueo";

interface Cliente {
  nombre: string;
  telefono: string;
  dni: string;
  direccion: string;
  email: string;
}

// ✅ MOVER LAS CONSTANTES FUERA DEL COMPONENTE
const hoy = new Date();
const inicialForm = {
  fecha: hoy.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  id: "",
  cliente: "",
  modelo: "",
  color: "",
  trabajo: "",
  clave: "",
  patronDesbloqueo: [] as Patron,
  observaciones: "",
  imei: "",
  accesorios: "",
  precio: "",
  anticipo: "",
};

const inicialEquipo = {
  modelo: "",
  color: "",
  trabajo: "",
  clave: "",
  patronDesbloqueo: [] as Patron,
  observaciones: "",
  imei: "",
  accesorios: "",
  precio: "",
  anticipo: "",
};

const inicialCheckData = {
  imeiEstado: "",
  pantalla: "",
  camaras: "",
  microfonos: "",
  cargaCable: "",
  cargaInalambrica: "",
  tapaTrasera: "",
};

export default function IngresoForm() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [form, setForm] = useState(inicialForm);
  const [equiposExtra, setEquiposExtra] = useState<any[]>([]);
  const [nroOrden, setNroOrden] = useState("");
  const [fechaManual, setFechaManual] = useState(false);
  const [mostrarCheckIn, setMostrarCheckIn] = useState(false);
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([]);
  const [mensajeExito, setMensajeExito] = useState("");
  const [configImpresion, setConfigImpresion] = useState(true);
  const [checkData, setCheckData] = useState(inicialCheckData);
  const [queryCliente, setQueryCliente] = useState("");
  const [mostrandoOpcionesImpresion, setMostrandoOpcionesImpresion] = useState(false);
  const [trabajosParaImprimir, setTrabajosParaImprimir] = useState<any[] | null>(null); // ✨ MULTI
  const [trabajoParaImprimir, setTrabajoParaImprimir] = useState<any>(null); // compat (1x)
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false); // ✨ MODAL ELEGANTE
  const [modoImpresionMultiple, setModoImpresionMultiple] = useState<"todas" | "una" | "no" | null>(null);
  const [trabajoSeleccionadoImpresion, setTrabajoSeleccionadoImpresion] = useState<any>(null);
  const [mostrarModalMetodoPagoAnticipo, setMostrarModalMetodoPagoAnticipo] = useState(false);
  const [formaPagoAnticipo, setFormaPagoAnticipo] = useState("");
  const [trabajosGuardadosConAnticipo, setTrabajosGuardadosConAnticipo] = useState<any[]>([]);
  const [totalAnticipoPendiente, setTotalAnticipoPendiente] = useState(0);
  const [mostrarModalPatron, setMostrarModalPatron] = useState(false);
  const [patronTarget, setPatronTarget] = useState<
    { tipo: "principal" } | { tipo: "extra"; idx: number } | null
  >(null);
  const [patronBorrador, setPatronBorrador] = useState<Patron>([]);

  // ✨ FUNCIÓN PARA FORMATEAR NÚMEROS CON PUNTOS (50.000)
  const formatearNumero = (valor: string) => {
    // Remover todo excepto números
    const numero = valor.replace(/[^\d]/g, '');
    // Formatear con puntos cada 3 dígitos
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // ✨ FUNCIÓN PARA OBTENER VALOR NUMÉRICO (sin puntos)
  const obtenerValorNumerico = (valorFormateado: string) => {
    return valorFormateado.replace(/\./g, '');
  };

  // ✨ FUNCIÓN PARA CALCULAR EL SALDO AUTOMÁTICAMENTE
  const calcularSaldo = () => {
    const precio = parseFloat(obtenerValorNumerico(form.precio || "0"));
    const anticipo = parseFloat(obtenerValorNumerico(form.anticipo || "0"));
    const saldo = precio - anticipo;
    return saldo >= 0 ? formatearNumero(saldo.toString()) : "0";
  };

  const abrirPatronPara = (target: { tipo: "principal" } | { tipo: "extra"; idx: number }) => {
    setPatronTarget(target);
    if (target.tipo === "principal") {
      setPatronBorrador((form as any).patronDesbloqueo || []);
    } else {
      const eq = equiposExtra[target.idx];
      setPatronBorrador((eq as any)?.patronDesbloqueo || []);
    }
    setMostrarModalPatron(true);
  };

  const guardarPatronActual = () => {
    if (!patronTarget) return;
    if (patronTarget.tipo === "principal") {
      setForm((prev: any) => ({ ...prev, patronDesbloqueo: patronBorrador }));
    } else {
      setEquiposExtra((prev) =>
        prev.map((e: any, i: number) =>
          i === patronTarget.idx ? { ...e, patronDesbloqueo: patronBorrador } : e
        )
      );
    }
    setMostrarModalPatron(false);
    setPatronTarget(null);
  };

  const actualizarSaldoCliente = async (nombreCliente: string, sumarARS: number, sumarUSD: number) => {
    if (!negocioID) return;
    try {
      const clientesSnap = await getDocs(
        query(
          collection(db, `negocios/${negocioID}/clientes`),
          where("nombre", "==", nombreCliente),
          limit(1)
        )
      );
      if (clientesSnap.empty) return;
      const clienteDoc = clientesSnap.docs[0];
      const datosCliente = clienteDoc.data();
      const nuevoSaldoARS = Number(datosCliente.saldoARS ?? 0) + sumarARS;
      const nuevoSaldoUSD = Number(datosCliente.saldoUSD ?? 0) + sumarUSD;
      await updateDoc(clienteDoc.ref, {
        saldoARS: Number(Math.round(nuevoSaldoARS * 100) / 100),
        saldoUSD: Number(Math.round(nuevoSaldoUSD * 100) / 100),
        ultimaActualizacion: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error actualizando saldo cliente:", error);
    }
  };

  const calcularSaldoEquipo = (equipo: any) => {
    const precio = parseFloat(obtenerValorNumerico(equipo?.precio || "0"));
    const anticipo = parseFloat(obtenerValorNumerico(equipo?.anticipo || "0"));
    const saldo = precio - anticipo;
    return saldo >= 0 ? formatearNumero(saldo.toString()) : "0";
  };

  const agregarEquipoExtra = () => {
    const idx = equiposExtra.length + 2;
    const idNuevo = `${nroOrden}-${String(idx).padStart(2, "0")}`;
    setEquiposExtra((prev) => [...prev, { ...inicialEquipo, id: idNuevo }]);
  };

  const actualizarEquipoExtra = (index: number, patch: any) => {
    setEquiposExtra((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const eliminarEquipoExtra = (index: number) => {
    setEquiposExtra((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!user) return;

    const obtenerDatos = async () => {
      const ref = doc(db, "usuarios", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const id = snap.data().negocioID || "";
        setNegocioID(id);
        await cargarClientes(id);
        await obtenerConfiguracion(id);

        const hoy = new Date();
        const nroOrdenGenerado = "ORD-" + hoy.getTime().toString().slice(-6);
        setNroOrden(nroOrdenGenerado);
        const idGenerado = `${nroOrdenGenerado}-01`;
        const clienteNuevo = typeof window !== "undefined" ? localStorage.getItem("clienteNuevo") : null;

        setForm((prev) => ({
          ...prev,
          id: idGenerado,
          cliente: clienteNuevo || "",
        }));
        setEquiposExtra([]);

        if (clienteNuevo) localStorage.removeItem("clienteNuevo");
      }
    };

    obtenerDatos();
  }, [user]);

  const cargarClientes = async (negocio: string) => {
    const snapshot = await getDocs(collection(db, `negocios/${negocio}/clientes`));
    const lista: Cliente[] = snapshot.docs.map((doc) => doc.data() as Cliente);
    setClientesGuardados(lista);
  };

  const obtenerConfiguracion = async (negocio: string) => {
    const ref = doc(db, `negocios/${negocio}/configuracion/datos`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data.imprimirEtiquetaAutomatica !== undefined) {
        setConfigImpresion(data.imprimirEtiquetaAutomatica);
      }
    }
  };

  // ✅ FUNCIÓN AUXILIAR: Limpiar formulario
  const limpiarFormulario = () => {
    const hoy = new Date();
    const nroOrdenGenerado = "ORD-" + hoy.getTime().toString().slice(-6);
    setNroOrden(nroOrdenGenerado);
    const nuevoId = `${nroOrdenGenerado}-01`;
    
    setForm({ ...inicialForm, id: nuevoId });
    setEquiposExtra([]);
    setCheckData(inicialCheckData);
    setMostrarCheckIn(false);
    setMostrandoOpcionesImpresion(false);
    setTrabajosParaImprimir(null);
    setTrabajoParaImprimir(null);
    setModoImpresionMultiple(null);
    setTrabajoSeleccionadoImpresion(null);
    setMostrarModalConfirmacion(false); // ✨ NUEVO
  };

  // ✅ FUNCIÓN ACTUALIZADA: Ticket con modal nativo
  const imprimirTicket = async (datos: any) => {
    console.log("🧾 Generando ticket normal...", datos);
    
    const contenidoTicket = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${datos.id}</title>
          <meta charset="UTF-8">
          <style>
            @page { size: 80mm auto; margin: 5mm; }
            body { 
              margin: 0; 
              padding: 10px; 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              line-height: 1.4; 
              width: 70mm;
            }
            @media print {
              body { margin: 0; padding: 5mm; }
            }
            .header {
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 10px;
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
            }
            .content {
              margin-bottom: 15px;
            }
            .footer {
              text-align: center;
              margin-top: 15px;
              border-top: 2px solid #000;
              padding-top: 10px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">TICKET DE SERVICIO TÉCNICO</div>
          
          <div class="content">
            <strong>ID:</strong> ${datos.id}<br>
            <strong>Fecha:</strong> ${datos.fecha}<br>
            <strong>Cliente:</strong> ${datos.cliente}<br>
            <strong>Modelo:</strong> ${datos.modelo || 'No especificado'}<br>
            <strong>Trabajo:</strong> ${datos.trabajo || 'No especificado'}<br>
            ${datos.clave ? `<strong>Clave:</strong> ${datos.clave}<br>` : ''}
            ${datos.imei ? `<strong>IMEI:</strong> ${datos.imei}<br>` : ''}
            <strong>Precio:</strong> $${datos.precio || '0.00'}
          </div>
          
          ${datos.observaciones ? `
            <div style="margin-bottom: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
              <strong>Observaciones:</strong><br>${datos.observaciones}
            </div>
          ` : ''}
          
          ${datos.checkIn ? `
            <div style="margin-bottom: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
              <strong>CHECK IN DEL EQUIPO:</strong><br>
              ${datos.checkIn.color ? `Color: ${datos.checkIn.color}<br>` : ''}
              ${datos.checkIn.pantalla ? `Pantalla: ${datos.checkIn.pantalla}<br>` : ''}
              ${datos.checkIn.camaras ? `Cámaras: ${datos.checkIn.camaras}<br>` : ''}
              ${datos.checkIn.microfonos ? `Micrófonos: ${datos.checkIn.microfonos}<br>` : ''}
              ${datos.checkIn.cargaCable ? `Carga Cable: ${datos.checkIn.cargaCable}<br>` : ''}
              ${datos.checkIn.cargaInalambrica ? `Carga Inalámbrica: ${datos.checkIn.cargaInalambrica}<br>` : ''}
              ${datos.checkIn.tapaTrasera ? `Tapa Trasera: ${datos.checkIn.tapaTrasera}<br>` : ''}
            </div>
          ` : ''}
          
          <div class="footer">
            Ticket generado el ${new Date().toLocaleString('es-AR')}<br>
            Gracias por confiar en nosotros
          </div>

          <script>
            window.addEventListener('load', function() {
              setTimeout(() => window.print(), 500);
            });
            window.addEventListener('afterprint', function() {
              window.close();
            });
          </script>
        </body>
      </html>
    `;
    
    const ventana = window.open('', '_blank', 'width=400,height=600');
    if (ventana) {
      ventana.document.write(contenidoTicket);
      ventana.document.close();
      ventana.focus();
    }
  };

  // ✅ FUNCIÓN ACTUALIZADA: Etiqueta con modal nativo
  const imprimirEtiqueta = async (datos: any) => {
    console.log("🏷️ Generando etiqueta...", datos);
    
    const contenidoEtiqueta = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta - ${datos.id}</title>
          <meta charset="UTF-8">
          <style>
            @page { size: 62mm 29mm; margin: 2mm; }
            body { 
              margin: 0; 
              padding: 2mm; 
              font-family: Arial, sans-serif; 
              font-size: 8px; 
              line-height: 1.2; 
              width: 58mm;
              height: 25mm;
              border: 1px solid #000;
              box-sizing: border-box;
            }
            .id {
              text-align: center;
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 1mm;
            }
            .content {
              font-size: 7px;
            }
          </style>
        </head>
        <body>
          <div class="id">${datos.id}</div>
          <div class="content">
            <strong>Cliente:</strong> ${(datos.cliente || 'N/A').substring(0, 18)}<br>
            <strong>Modelo:</strong> ${(datos.modelo || 'N/A').substring(0, 15)}<br>
            <strong>Fecha:</strong> ${datos.fecha}<br>
            ${datos.trabajo ? `<strong>Trabajo:</strong> ${datos.trabajo.substring(0, 16)}<br>` : ''}
          </div>

          <script>
            window.addEventListener('load', function() {
              setTimeout(() => window.print(), 500);
            });
            window.addEventListener('afterprint', function() {
              window.close();
            });
          </script>
        </body>
      </html>
    `;
    
    const ventana = window.open('', '_blank', 'width=300,height=200');
    if (ventana) {
      ventana.document.write(contenidoEtiqueta);
      ventana.document.close();
      ventana.focus();
    }
  };

  // ✅ FUNCIÓN ACTUALIZADA: A4 con modal nativo
  const imprimirTicketA4 = async (datos: any, impresoraPersonalizada?: string) => {
    console.log("📄 Generando ticket A4...", datos);
    
    // Obtener configuración y garantías desde Firestore
    let logoUrl = '';
    let garantiaServicio = '';
    let garantiaTelefonos = '';
    
    try {
      const configRef = doc(db, `negocios/${negocioID}/configuracion/datos`);
      const configSnap = await getDoc(configRef);
      if (configSnap.exists()) {
        const configData = configSnap.data();
        logoUrl = configData.logoUrl || '';
        garantiaServicio = configData.textoGarantia || '';
        garantiaTelefonos = configData.textoGarantiaTelefonos || '';
      }
    } catch (error) {
      console.error("Error obteniendo configuración:", error);
    }
    
    const contenidoA4 = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden de Servicio - ${datos.id}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            
            body { 
              margin: 0; 
              padding: 0; 
              font-family: Arial, sans-serif; 
              font-size: 12px; 
              line-height: 1.5; 
              color: #333;
            }
            
            @media print {
              body { margin: 0; padding: 0; }
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            
            .logo {
              max-width: 150px;
              max-height: 80px;
              margin-bottom: 20px;
            }
            
            .title {
              font-weight: bold;
              font-size: 24px;
              margin-bottom: 30px;
              border-bottom: 3px solid #3498db;
              padding-bottom: 10px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            
            .info-box {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #3498db;
            }
            
            .info-box.client {
              border-left-color: #27ae60;
            }
            
            .info-box h3 {
              margin: 0 0 10px 0;
              color: #2c3e50;
            }
            
            .info-box p {
              margin: 5px 0;
            }
            
            .observations {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
              margin-bottom: 30px;
            }
            
            .checkin {
              background: #e7f3ff;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #007bff;
              margin-bottom: 30px;
            }
            
            .checkin-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            
            .signatures {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #ecf0f1;
            }
            
            .signature-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
            }
            
            .signature-box {
              text-align: center;
            }
            
            .signature-line {
              border-bottom: 1px solid #000;
              margin-bottom: 5px;
              height: 50px;
            }
            
            .warranty {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-top: 30px;
              border: 1px solid #dee2e6;
            }
            
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ecf0f1;
              font-size: 10px;
              color: #7f8c8d;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="logo">` : ''}
            <div class="title">ORDEN DE SERVICIO TÉCNICO</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>📋 Información del Trabajo</h3>
              <p><strong>ID del Equipo:</strong> ${datos.id}</p>
              <p><strong>Fecha de Ingreso:</strong> ${datos.fecha}</p>
              <p><strong>Modelo:</strong> ${datos.modelo || 'No especificado'}</p>
              <p><strong>Trabajo a Realizar:</strong> ${datos.trabajo || 'No especificado'}</p>
              ${datos.precio ? `<p><strong>Precio Estimado:</strong> $${datos.precio}</p>` : ''}
            </div>
            
            <div class="info-box client">
              <h3>👤 Datos del Cliente</h3>
              <p><strong>Nombre:</strong> ${datos.cliente}</p>
              ${datos.clave ? `<p><strong>Clave del Dispositivo:</strong> ${datos.clave}</p>` : ''}
              ${datos.imei ? `<p><strong>IMEI:</strong> ${datos.imei}</p>` : ''}
            </div>
          </div>
          
          ${datos.observaciones ? `
            <div class="observations">
              <h3 style="margin: 0 0 10px 0; color: #2c3e50;">📝 Observaciones</h3>
              <p style="margin: 0;">${datos.observaciones}</p>
            </div>
          ` : ''}
          
          ${datos.checkIn ? `
            <div class="checkin">
              <h3 style="margin: 0 0 15px 0; color: #2c3e50;">🔍 Check-In del Equipo</h3>
              <div class="checkin-grid">
                ${datos.checkIn.color ? `<p><strong>Color:</strong> ${datos.checkIn.color}</p>` : ''}
                ${datos.checkIn.pantalla ? `<p><strong>Estado Pantalla:</strong> ${datos.checkIn.pantalla}</p>` : ''}
                ${datos.checkIn.camaras ? `<p><strong>Cámaras:</strong> ${datos.checkIn.camaras}</p>` : ''}
                ${datos.checkIn.microfonos ? `<p><strong>Micrófonos:</strong> ${datos.checkIn.microfonos}</p>` : ''}
                ${datos.checkIn.cargaCable ? `<p><strong>Carga por Cable:</strong> ${datos.checkIn.cargaCable}</p>` : ''}
                ${datos.checkIn.cargaInalambrica ? `<p><strong>Carga Inalámbrica:</strong> ${datos.checkIn.cargaInalambrica}</p>` : ''}
                ${datos.checkIn.tapaTrasera ? `<p><strong>Tapa Trasera:</strong> ${datos.checkIn.tapaTrasera}</p>` : ''}
              </div>
            </div>
          ` : ''}
          
          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line"></div>
                <p style="margin: 0; font-weight: bold;">Firma del Cliente</p>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <p style="margin: 0; font-weight: bold;">Firma del Técnico</p>
              </div>
            </div>
          </div>
          
          ${garantiaServicio ? `
            <div class="warranty">
              <h3 style="margin: 0 0 10px 0; color: #2c3e50;">🛡️ Términos de Garantía</h3>
              <p style="font-size: 10px; line-height: 1.4; margin: 0;">${garantiaServicio}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            Documento generado el ${new Date().toLocaleString('es-AR')}<br>
            Este documento es un comprobante de recepción del equipo para servicio técnico
            ${impresoraPersonalizada ? `<br><small>Impresora seleccionada: ${impresoraPersonalizada}</small>` : ''}
          </div>

          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 500);
            });

            window.addEventListener('afterprint', function() {
              window.close();
            });
          </script>
        </body>
      </html>
    `;
    
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(contenidoA4);
      ventanaImpresion.document.close();
      ventanaImpresion.focus();
    } else {
      alert("⚠️ El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.");
    }
  };

  // ✅ FUNCIÓN SIMPLIFICADA: Manejar impresión sin modal personalizado
  const manejarImpresion = async (opciones: {
    ticket: boolean;
    etiqueta: boolean;
    ticketA4: boolean;
  }) => {
    if (!negocioID) {
      alert("No se encontró un negocio asociado a este usuario");
      return;
    }

    const precioNumerico = obtenerValorNumerico(form.precio || "0");
    const anticipoNumerico = obtenerValorNumerico(form.anticipo || "0");
    const saldoNumerico = (parseFloat(precioNumerico) - parseFloat(anticipoNumerico)).toString();

    const datos = {
      ...form,
      precio: precioNumerico,
      anticipo: anticipoNumerico,
      saldo: saldoNumerico,
      fecha: form.fecha,
      checkIn: mostrarCheckIn ? checkData : null,
    };

    const resultado = await guardarTrabajo(negocioID, datos, false);

    if (resultado) {
      setMensajeExito(resultado);
      
      if (opciones.ticket) {
        await imprimirTicket(datos);
      }
      
      if (opciones.etiqueta) {
        await imprimirEtiqueta(datos);
      }
      
      if (opciones.ticketA4) {
        await imprimirTicketA4(datos);
      }
      
      limpiarFormulario();
    }
  };

  // ✅ FUNCIÓN ACTUALIZADA: Guardar con modal elegante
  const handleGuardarSolo = async () => {
    if (!negocioID) {
      alert("No se encontró un negocio asociado a este usuario");
      return;
    }

    // ✨ VALIDAR CAMPOS OBLIGATORIOS
    if (!form.cliente || form.cliente.trim() === "") {
      alert("⚠️ El campo Cliente es obligatorio");
      return;
    }

    const equipos = [form, ...equiposExtra];
    const faltaModelo = equipos.some((e) => !e.modelo || String(e.modelo).trim() === "");
    if (faltaModelo) {
      alert("⚠️ Todos los equipos deben tener Modelo");
      return;
    }

    // 1) Armar payload de trabajos (cada uno con id único) y nroOrden compartido
    const trabajosPayload = equipos.map((e, idx) => {
      const precioNumerico = obtenerValorNumerico(e.precio || "0");
      const anticipoNumerico = obtenerValorNumerico(e.anticipo || "0");
      const saldoNumerico = (parseFloat(precioNumerico || "0") - parseFloat(anticipoNumerico || "0")).toString();
      return {
        id: e.id || `${nroOrden}-${String(idx + 1).padStart(2, "0")}`,
        modelo: e.modelo || "",
        color: e.color || "",
        trabajo: e.trabajo || "",
        clave: e.clave || "",
        patronDesbloqueo: Array.isArray((e as any).patronDesbloqueo) ? (e as any).patronDesbloqueo : [],
        observaciones: e.observaciones || "",
        imei: e.imei || "",
        accesorios: e.accesorios || "",
        precio: precioNumerico,
        anticipo: anticipoNumerico,
        saldo: saldoNumerico,
        estado: "PENDIENTE",
        checkIn: mostrarCheckIn ? checkData : null,
      };
    });

    // 2) Guardar en batch (una sola operación)
    const res = await guardarTrabajosBatch(negocioID, {
      nroOrden,
      fecha: form.fecha,
      cliente: form.cliente,
      trabajos: trabajosPayload as any,
    });

    if (res) {
      setMensajeExito(res.mensaje);
      setTrabajosParaImprimir(res.trabajosGuardados);
      // Importante: no usar trabajosPayload[0] acá — no trae `cliente` (solo va en el batch).
      // BotonesImpresionTrabajo valida trabajo.cliente para ticket/etiqueta.
      const primeroGuardado = res.trabajosGuardados[0];
      setTrabajoParaImprimir(primeroGuardado || null);
      setTrabajoSeleccionadoImpresion(primeroGuardado || null);

      const totalAnticipo = (res.trabajosGuardados || []).reduce(
        (s: number, t: any) => s + Number(t.anticipo || 0),
        0
      );
      if (totalAnticipo > 0) {
        setTrabajosGuardadosConAnticipo(res.trabajosGuardados);
        setTotalAnticipoPendiente(totalAnticipo);
        setFormaPagoAnticipo("");
        setMostrarModalMetodoPagoAnticipo(true);
      } else {
        setMostrarModalConfirmacion(true);
      }
    }
  };

  const handleConfirmarMetodoPagoAnticipo = async () => {
    if (!formaPagoAnticipo || !negocioID || trabajosGuardadosConAnticipo.length === 0) {
      alert("Seleccioná un método de pago");
      return;
    }
    const clienteNombre = trabajosGuardadosConAnticipo[0]?.cliente || form.cliente;
    try {
      for (const t of trabajosGuardadosConAnticipo) {
        const monto = Number(t.anticipo || 0);
        if (monto <= 0) continue;
        const pagoData = {
          monto,
          montoUSD: null,
          moneda: "ARS",
          forma: formaPagoAnticipo,
          destino: "Anticipo",
          tipoDestino: "cliente",
          observaciones: `Anticipo ingreso - ${t.trabajo || ""} - ${t.modelo || ""}`,
          fecha: new Date().toLocaleDateString("es-AR"),
          fechaCompleta: new Date(),
          cliente: t.cliente,
          trabajoId: (t as any).firebaseId || t.id,
          tipo: "ingreso",
          negocioID,
          trabajoDetalle: t.trabajo,
          modeloDetalle: t.modelo,
        };
        await addDoc(collection(db, `negocios/${negocioID}/pagos`), pagoData);
      }
      await actualizarSaldoCliente(clienteNombre, -totalAnticipoPendiente, 0);
      setMostrarModalMetodoPagoAnticipo(false);
      setFormaPagoAnticipo("");
      setTrabajosGuardadosConAnticipo([]);
      setTotalAnticipoPendiente(0);
      setMostrarModalConfirmacion(true);
    } catch (e) {
      console.error(e);
      alert("Error al registrar el pago. Reintentá.");
    }
  };

  const handleConfirmarImpresion = () => {
    setMostrarModalConfirmacion(false);
    setMostrandoOpcionesImpresion(true);
  };

  // ✨ NUEVA FUNCIÓN: Cancelar impresión desde modal
  const handleCancelarImpresion = () => {
    setMostrarModalConfirmacion(false);
    setMensajeExito("✅ Trabajo(s) guardado(s) exitosamente");
    limpiarFormulario();
  };

  const imprimirEtiquetasTodas = async (trabajos: any[]) => {
    const etiquetas = trabajos.map((t) => ({
      id: t.id,
      cliente: t.cliente,
      modelo: t.modelo,
      trabajo: t.trabajo,
      clave: t.clave,
      observaciones: t.observaciones,
      imei: t.imei,
      nroOrden: t.nroOrden || nroOrden,
    }));

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Etiquetas ${nroOrden}</title>
  <style>
    @page { size: 62mm 29mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .label { width: 62mm; height: 29mm; padding: 2mm 2.5mm; border: 1px solid #000; display: flex; flex-direction: column; justify-content: space-between; page-break-inside: avoid; }
    .row { font-size: 9px; font-weight: 700; line-height: 1.15; }
    .muted { font-weight: 500; }
    .mono { font-family: 'Courier New', monospace; font-size: 8px; }
    .stack { display: flex; flex-direction: column; gap: 1mm; padding: 1mm; }
  </style>
</head>
<body>
  <div class="stack">
    ${etiquetas
      .map(
        (e) => `
      <div class="label">
        <div class="row">ORD: ${e.nroOrden || ""} · ID: ${e.id}</div>
        <div class="row">CLI: <span class="muted">${(e.cliente || "").toString().slice(0, 26)}</span></div>
        <div class="row">MOD: <span class="muted">${(e.modelo || "").toString().slice(0, 28)}</span></div>
        <div class="row">FAL: <span class="muted">${(e.trabajo || "").toString().slice(0, 30)}</span></div>
        ${e.clave ? `<div class="row">CLV: <span class="muted">${(e.clave || "").toString().slice(0, 26)}</span></div>` : ``}
        ${e.imei ? `<div class="row mono">IMEI: ${(e.imei || "").toString().slice(0, 18)}</div>` : ``}
      </div>`
      )
      .join("")}
  </div>
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
    window.addEventListener('afterprint', () => window.close());
  </script>
</body>
</html>`;

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      alert("⚠️ El navegador bloqueó la ventana emergente.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  return (
    <RequireAuth>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1200px] mx-auto">
          
          {/* Header de la página */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-2xl p-3 mb-2 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  Ingreso de Trabajo
                </h2>
                <p className="text-blue-100 text-xm">
                  Registra un nuevo trabajo técnico en el sistema
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] mb-8">
  
            {/* Header del formulario con botón */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#f39c12] rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#2c3e50]">Información del Trabajo</h3>
                  <p className="text-[#7f8c8d] mt-1">Completa todos los datos del equipo y trabajo a realizar</p>
                </div>
              </div>
              
              <button
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
                onClick={() => router.push("/clientes/agregar?origen=ingreso")}
              >
                ➕ Agregar Cliente
              </button>
            </div>

            {/* Grid del formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Fecha con checkbox */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📅 Fecha
                </label>
                <div className="flex items-center gap-3">
                  {fechaManual ? (
                    <input
                      type="date"
                      value={form.fecha}
                      onChange={(e) => setForm((prev) => ({ ...prev, fecha: e.target.value }))}
                      className="flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form.fecha}
                      readOnly
                      className="flex-1 px-4 py-3 border-2 border-[#ecf0f1] rounded-lg bg-[#f8f9fa] text-[#7f8c8d]"
                    />
                  )}
                  <label className="flex items-center gap-2 text-sm font-medium text-[#2c3e50]">
                    <input
                      type="checkbox"
                      checked={fechaManual}
                      onChange={() => setFechaManual(!fechaManual)}
                      className="w-4 h-4 text-[#3498db] bg-white border-2 border-[#bdc3c7] rounded focus:ring-[#3498db] focus:ring-2"
                    />
                    Editar
                  </label>
                </div>
              </div>

              {/* ID */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🏷️ ID del Equipo
                </label>
                <input
                  type="text"
                  value={form.id}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-[#ecf0f1] rounded-lg bg-[#f8f9fa] text-[#7f8c8d] font-mono"
                />
              </div>

              {/* Cliente - Combobox */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  👤 Cliente
                </label>
                <Combobox
                  value={form.cliente}
                  onChange={(val) => setForm((prev) => ({ ...prev, cliente: val }))}
                >
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                      onChange={(e) => setQueryCliente(e.target.value)}
                      displayValue={() => form.cliente}
                      placeholder="Seleccionar cliente"
                      autoComplete="off"
                      spellCheck={false}
                      autoCorrect="off"
                    />
                    <Combobox.Options className="absolute z-10 w-full bg-white border-2 border-[#bdc3c7] rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                      {clientesGuardados
                        .filter((c) =>
                          c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
                        )
                        .map((c, i) => (
                          <Combobox.Option
                            key={i}
                            value={c.nombre}
                            className={({ active }) =>
                              `px-4 py-3 cursor-pointer transition-colors duration-200 ${
                                active ? "bg-[#3498db] text-white" : "text-[#2c3e50] hover:bg-[#ecf0f1]"
                              }`
                            }
                          >
                            {c.nombre}
                          </Combobox.Option>
                        ))}
                      {clientesGuardados.filter((c) =>
                        c.nombre.toLowerCase().includes(queryCliente.toLowerCase())
                      ).length === 0 && (
                        <div className="px-4 py-3 text-[#7f8c8d] text-center">Sin coincidencias</div>
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
              </div>

              {/* Modelo */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📱 Modelo
                </label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm((prev) => ({ ...prev, modelo: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Modelo del dispositivo"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🎨 Color
                </label>
                <input
                  type="text"
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Color del equipo"
                />
              </div>

              {/* Falla / Trabajo a realizar (reparación) */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🔧 Falla / Trabajo a realizar
                </label>
                <input
                  type="text"
                  value={form.trabajo}
                  onChange={(e) => setForm((prev) => ({ ...prev, trabajo: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Descripción de la falla o trabajo"
                />
              </div>

              {/* Clave */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🔑 Clave
                </label>
                <div className="flex gap-2 items-stretch">
                  <input
                    type="text"
                    value={(form as any).clave}
                    onChange={(e) => setForm((prev: any) => ({ ...prev, clave: e.target.value }))}
                    className="flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                    placeholder="Clave del dispositivo"
                  />
                  <button
                    type="button"
                    onClick={() => abrirPatronPara({ tipo: "principal" })}
                    className="px-4 py-3 rounded-lg border-2 border-[#bdc3c7] bg-white hover:bg-[#f8f9fa] text-[#2c3e50] font-semibold whitespace-nowrap"
                    title="Dibujar patrón de desbloqueo (Android)"
                  >
                    {(form as any).patronDesbloqueo?.length ? "🔒 Ver patrón" : "🔒 Patrón"}
                  </button>
                </div>
              </div>

              {/* IMEI */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📲 IMEI
                </label>
                <input
                  type="text"
                  value={form.imei}
                  onChange={(e) => setForm((prev) => ({ ...prev, imei: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Número IMEI"
                />
              </div>

              {/* Accesorios */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📦 Accesorios Incluidos
                </label>
                <input
                  type="text"
                  value={form.accesorios}
                  onChange={(e) => setForm((prev) => ({ ...prev, accesorios: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Ej: Cargador, cable, funda..."
                />
              </div>

              {/* Precio */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💰 Precio Total
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f8c8d] font-semibold">$</span>
                  <input
                    type="text"
                    value={form.precio}
                    onChange={(e) => {
                      const valorFormateado = formatearNumero(e.target.value);
                      setForm((prev) => ({ ...prev, precio: valorFormateado }));
                    }}
                    className="w-full pl-8 pr-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Anticipo */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💵 Adelanto/Anticipo
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f8c8d] font-semibold">$</span>
                  <input
                    type="text"
                    value={form.anticipo}
                    onChange={(e) => {
                      const valorFormateado = formatearNumero(e.target.value);
                      setForm((prev) => ({ ...prev, anticipo: valorFormateado }));
                    }}
                    className="w-full pl-8 pr-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-[#7f8c8d] mt-1">
                  💡 Dinero que deja el cliente al ingresar
                </p>
              </div>

              {/* Saldo Pendiente */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  💳 Saldo Pendiente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f8c8d] font-semibold">$</span>
                  <input
                    type="text"
                    value={calcularSaldo()}
                    readOnly
                    className="w-full pl-8 pr-4 py-3 border-2 border-[#ecf0f1] rounded-lg bg-[#f8f9fa] text-[#e74c3c] font-bold"
                  />
                </div>
                <p className="text-xs text-[#7f8c8d] mt-1">
                  ✅ Calculado automáticamente (Precio - Anticipo)
                </p>
              </div>

              {/* Observaciones */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  📝 Observaciones
                </label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] resize-none"
                  placeholder="Observaciones adicionales sobre el trabajo..."
                />
              </div>
            </div>

            {/* ➕ Carga múltiple de equipos */}
            <div className="mt-6">
              <div>
                <p className="text-sm font-semibold text-[#2c3e50]">📦 Equipos en esta orden</p>
                <p className="text-xs text-[#7f8c8d]">Todos se guardan como trabajos separados con estado PENDIENTE y el mismo nroOrden.</p>
              </div>

              {equiposExtra.length > 0 && (
                <div className="mt-4 space-y-4">
                  {equiposExtra.map((eq, idx) => (
                    <div key={eq.id || idx} className="border border-[#ecf0f1] rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="bg-gradient-to-r from-[#ecf0f1] to-[#dfe6e9] px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#2c3e50] truncate">Equipo #{idx + 2} · ID: {eq.id}</p>
                          <p className="text-xs text-[#7f8c8d] truncate">Orden: {nroOrden}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarEquipoExtra(idx)}
                          className="px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold text-sm"
                        >
                          🗑️ Quitar
                        </button>
                      </div>

                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">📱 Modelo</label>
                          <input
                            type="text"
                            value={eq.modelo}
                            onChange={(e) => actualizarEquipoExtra(idx, { modelo: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                            placeholder="Modelo del dispositivo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">🎨 Color</label>
                          <input
                            type="text"
                            value={eq.color}
                            onChange={(e) => actualizarEquipoExtra(idx, { color: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                            placeholder="Color del equipo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">🔧 Falla / Trabajo</label>
                          <input
                            type="text"
                            value={eq.trabajo}
                            onChange={(e) => actualizarEquipoExtra(idx, { trabajo: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                            placeholder="Descripción de la falla o trabajo"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">🔑 Clave</label>
                          <div className="flex gap-2 items-stretch">
                            <input
                              type="text"
                              value={eq.clave}
                              onChange={(e) => actualizarEquipoExtra(idx, { clave: e.target.value })}
                              className="flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                              placeholder="Clave del dispositivo"
                            />
                            <button
                              type="button"
                              onClick={() => abrirPatronPara({ tipo: "extra", idx })}
                              className="px-3 py-3 rounded-lg border-2 border-[#bdc3c7] bg-white hover:bg-[#f8f9fa] text-[#2c3e50] font-semibold whitespace-nowrap"
                              title="Dibujar patrón de desbloqueo (Android)"
                            >
                              {(eq as any).patronDesbloqueo?.length ? "🔒 Ver" : "🔒"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">📲 IMEI</label>
                          <input
                            type="text"
                            value={eq.imei}
                            onChange={(e) => actualizarEquipoExtra(idx, { imei: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                            placeholder="Número IMEI"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">📦 Accesorios</label>
                          <input
                            type="text"
                            value={eq.accesorios}
                            onChange={(e) => actualizarEquipoExtra(idx, { accesorios: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                            placeholder="Ej: Cargador, cable..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">💰 Precio</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f8c8d] font-semibold">$</span>
                            <input
                              type="text"
                              value={eq.precio}
                              onChange={(e) => actualizarEquipoExtra(idx, { precio: formatearNumero(e.target.value) })}
                              className="w-full pl-8 pr-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">💵 Anticipo</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f8c8d] font-semibold">$</span>
                            <input
                              type="text"
                              value={eq.anticipo}
                              onChange={(e) => actualizarEquipoExtra(idx, { anticipo: formatearNumero(e.target.value) })}
                              className="w-full pl-8 pr-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50]"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">💳 Saldo</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7f8c8d] font-semibold">$</span>
                            <input
                              type="text"
                              value={calcularSaldoEquipo(eq)}
                              readOnly
                              className="w-full pl-8 pr-4 py-3 border-2 border-[#ecf0f1] rounded-lg bg-[#f8f9fa] text-[#e74c3c] font-bold"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-[#2c3e50] mb-1">📝 Observaciones</label>
                          <textarea
                            value={eq.observaciones}
                            onChange={(e) => actualizarEquipoExtra(idx, { observaciones: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] resize-none"
                            placeholder="Observaciones adicionales..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={agregarEquipoExtra}
                  className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                >
                  ➕ Agregar otro equipo
                </button>
              </div>
            </div>

            {/* Botón CHECK IN */}
            <div className="flex justify-center mt-8 pt-6 border-t border-[#ecf0f1]">
              <button
                onClick={() => setMostrarCheckIn(!mostrarCheckIn)}
                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  mostrarCheckIn
                    ? "bg-gradient-to-r from-[#e67e22] to-[#d35400] hover:from-[#d35400] hover:to-[#c0392b] text-white"
                    : "bg-gradient-to-r from-[#f39c12] to-[#e67e22] hover:from-[#e67e22] hover:to-[#d35400] text-white"
                }`}
              >
                {mostrarCheckIn ? "📋 Ocultar CHECK IN" : "📋 Agregar CHECK IN"}
              </button>
            </div>
          </div>

          {/* CheckIn Form */}
          {mostrarCheckIn && (
            <CheckInForm checkData={checkData} setCheckData={setCheckData} />
          )}

          {/* ✨ MODAL MÉTODO DE PAGO ANTICIPO */}
          {mostrarModalMetodoPagoAnticipo && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-lg font-bold text-[#2c3e50] mb-2">💳 Método de pago del anticipo</h3>
                <p className="text-sm text-[#7f8c8d] mb-4">
                  Total anticipo: <span className="font-semibold text-[#2c3e50]">$ {totalAnticipoPendiente.toLocaleString("es-AR")}</span>
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Efectivo", "Transferencia", "Tarjeta", "MercadoPago"].map((forma) => (
                    <button
                      key={forma}
                      type="button"
                      onClick={() => setFormaPagoAnticipo(forma)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        formaPagoAnticipo === forma
                          ? "bg-[#3498db] text-white"
                          : "bg-[#ecf0f1] text-[#2c3e50] hover:bg-[#d5dbdb]"
                      }`}
                    >
                      {forma}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmarMetodoPagoAnticipo}
                    className="flex-1 py-2 rounded-lg font-semibold bg-[#27ae60] text-white hover:bg-[#229954]"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalMetodoPagoAnticipo(false);
                      setFormaPagoAnticipo("");
                      setMostrarModalConfirmacion(true);
                    }}
                    className="flex-1 py-2 rounded-lg font-semibold bg-[#95a5a6] text-white hover:bg-[#7f8c8d]"
                  >
                    Omitir pago
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ✨ MODAL ELEGANTE DE CONFIRMACIÓN */}
          <ModalConfirmarImpresion
            isOpen={mostrarModalConfirmacion}
            onConfirm={handleConfirmarImpresion}
            onCancel={handleCancelarImpresion}
            nombreCliente={form.cliente || ""}
            numeroOrden={nroOrden || trabajoParaImprimir?.id || ""}
          />

          {/* ✨ SECCIÓN SIMPLIFICADA - UN SOLO BOTÓN */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1] mb-8">
            <div className="flex flex-col items-center gap-4">
              
              {/* BOTÓN ÚNICO */}
              <button
                onClick={handleGuardarSolo}
                className="w-full max-w-md bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
              >
                💾 Guardar Trabajo
              </button>

              {/* INFO */}
              <p className="text-xs text-center text-gray-500 max-w-md">
                💡 Al guardar, podrás elegir si deseas imprimir inmediatamente
              </p>
            </div>
          </div>

          {/* ✨ MODAL DE OPCIONES DE IMPRESIÓN */}
          {mostrandoOpcionesImpresion && (trabajosParaImprimir?.length || trabajoParaImprimir) && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🖨️</span>
                      <div>
                        <h3 className="text-2xl font-bold">Opciones de Impresión</h3>
                        <p className="text-sm opacity-90">Selecciona qué documentos imprimir</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMostrandoOpcionesImpresion(false);
                        setMensajeExito("✅ Trabajo guardado exitosamente");
                        limpiarFormulario();
                      }}
                      className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                    >
                      <span className="text-2xl">×</span>
                    </button>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  {Array.isArray(trabajosParaImprimir) && trabajosParaImprimir.length > 1 ? (
                    <div className="space-y-4">
                      <div className="bg-[#ecf0f1] rounded-xl p-4 border border-[#d5dbdb]">
                        <p className="font-bold text-[#2c3e50]">🖨️ Impresión de etiquetas</p>
                        <p className="text-sm text-[#7f8c8d]">Elegí cómo imprimir las etiquetas para la orden {nroOrden}.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <button
                          onClick={async () => {
                            setModoImpresionMultiple("todas");
                            await imprimirEtiquetasTodas(trabajosParaImprimir);
                          }}
                          className="px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white hover:from-[#229954] hover:to-[#27ae60] shadow-lg"
                        >
                          🏷️ Imprimir todas juntas
                        </button>
                        <button
                          onClick={() => setModoImpresionMultiple("una")}
                          className="px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white hover:from-[#2980b9] hover:to-[#21618c] shadow-lg"
                        >
                          🧾 Imprimir una por una
                        </button>
                        <button
                          onClick={() => {
                            setModoImpresionMultiple("no");
                            setMostrandoOpcionesImpresion(false);
                            limpiarFormulario();
                          }}
                          className="px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[#95a5a6] to-[#7f8c8d] text-white hover:from-[#7f8c8d] hover:to-[#6c7b7d] shadow-md"
                        >
                          ✓ No imprimir
                        </button>
                      </div>

                      {modoImpresionMultiple === "una" && (
                        <div className="bg-white border border-[#ecf0f1] rounded-2xl p-4 space-y-3">
                          <label className="block text-sm font-semibold text-[#2c3e50]">
                            Seleccioná un equipo para imprimir
                          </label>
                          <select
                            value={trabajoSeleccionadoImpresion?.firebaseId || ""}
                            onChange={(e) => {
                              const t = trabajosParaImprimir.find((x) => x.firebaseId === e.target.value);
                              setTrabajoSeleccionadoImpresion(t || null);
                            }}
                            className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white"
                          >
                            {trabajosParaImprimir.map((t) => (
                              <option key={t.firebaseId} value={t.firebaseId}>
                                {t.id} · {t.modelo}
                              </option>
                            ))}
                          </select>

                          {trabajoSeleccionadoImpresion && (
                            <BotonesImpresionTrabajo
                              trabajo={trabajoSeleccionadoImpresion}
                              negocioId={negocioID}
                              ocultarEtiquetasA4={true}
                            />
                          )}

                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setMostrandoOpcionesImpresion(false);
                                limpiarFormulario();
                              }}
                              className="px-4 py-2 rounded-lg bg-[#ecf0f1] hover:bg-[#dfe6e9] text-[#2c3e50] font-semibold"
                            >
                              Cerrar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <BotonesImpresionTrabajo
                      trabajo={trabajoParaImprimir}
                      negocioId={negocioID}
                      ocultarEtiquetasA4={true}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Modal patrón de desbloqueo */}
          {mostrarModalPatron && (
            <div className="fixed inset-0 z-[999999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">🔒 Patrón de desbloqueo</h3>
                    <p className="text-xs text-white/80">Dibujá el patrón tipo Android (3×3).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarModalPatron(false);
                      setPatronTarget(null);
                    }}
                    className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-2xl leading-none"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="p-5 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-bold text-slate-800 mb-3">Dibujar</p>
                      <PatronDrawer initial={patronBorrador} onChange={setPatronBorrador} />
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-bold text-slate-800 mb-3">Vista previa</p>
                      <PatronViewer patron={patronBorrador} />
                      <p className="mt-3 text-xs text-slate-600">
                        Consejo: si el patrón está vacío, se guardará como “sin patrón”.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarModalPatron(false);
                        setPatronTarget(null);
                      }}
                      className="px-4 py-2.5 rounded-xl font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={guardarPatronActual}
                      className="px-4 py-2.5 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Guardar patrón
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de éxito */}
          {mensajeExito && (
            <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] rounded-xl p-6 shadow-lg mb-8">
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 bg-[#27ae60] rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">✓</span>
                </div>
                <span className="text-[#27ae60] font-bold text-xl">{mensajeExito}</span>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 border border-[#bdc3c7]">
            <div className="flex items-center gap-3 text-[#2c3e50]">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💡</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <strong>Tip:</strong> El ID del equipo se genera automáticamente. 
                  Después de guardar, podrás elegir qué documentos imprimir con las opciones disponibles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}