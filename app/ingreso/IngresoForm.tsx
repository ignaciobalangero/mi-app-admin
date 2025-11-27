"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import Header from "../Header";
import RequireAuth from "../../lib/requireAuth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { guardarTrabajo } from "./guardarTrabajo";
import CheckInForm from "./CheckInForm";
import { Combobox } from "@headlessui/react";
import BotonesImpresionTrabajo from "@/app/configuraciones/impresion/components/BotonesImpresionTrabajo";
import ModalConfirmarImpresion from "./ModalConfirmarImpresion";

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
  trabajo: "",
  clave: "",
  observaciones: "",
  imei: "",
  accesorios: "", // ✨ NUEVO CAMPO
  precio: "",
  anticipo: "", // ✨ NUEVO CAMPO
};

const inicialCheckData = {
  imeiEstado: "",
  color: "",
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
  const [fechaManual, setFechaManual] = useState(false);
  const [mostrarCheckIn, setMostrarCheckIn] = useState(false);
  const [clientesGuardados, setClientesGuardados] = useState<Cliente[]>([]);
  const [mensajeExito, setMensajeExito] = useState("");
  const [configImpresion, setConfigImpresion] = useState(true);
  const [checkData, setCheckData] = useState(inicialCheckData);
  const [queryCliente, setQueryCliente] = useState("");
  const [mostrandoOpcionesImpresion, setMostrandoOpcionesImpresion] = useState(false);
  const [trabajoParaImprimir, setTrabajoParaImprimir] = useState<any>(null); // ✨ NUEVO ESTADO
  const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false); // ✨ MODAL ELEGANTE

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
        const idGenerado = "EQ-" + hoy.getTime().toString().slice(-5);
        const clienteNuevo = typeof window !== "undefined" ? localStorage.getItem("clienteNuevo") : null;

        setForm((prev) => ({
          ...prev,
          id: idGenerado,
          cliente: clienteNuevo || "",
        }));

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
    const nuevoId = "EQ-" + hoy.getTime().toString().slice(-5);
    
    setForm({ ...inicialForm, id: nuevoId });
    setCheckData(inicialCheckData);
    setMostrarCheckIn(false);
    setMostrandoOpcionesImpresion(false);
    setTrabajoParaImprimir(null);
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

    if (!form.modelo || form.modelo.trim() === "") {
      alert("⚠️ El campo Modelo es obligatorio");
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

    // 1. Guardar en Firebase (SIN impresión automática)
    const resultado = await guardarTrabajo(negocioID, datos, false);

    if (resultado) {
      // 2. Guardar datos para el modal
      setTrabajoParaImprimir(datos);
      
      // 3. Mostrar modal elegante
      setMostrarModalConfirmacion(true);
    }
  };

  // ✨ NUEVA FUNCIÓN: Confirmar impresión desde modal
  const handleConfirmarImpresion = () => {
    setMostrarModalConfirmacion(false);
    setMostrandoOpcionesImpresion(true);
  };

  // ✨ NUEVA FUNCIÓN: Cancelar impresión desde modal
  const handleCancelarImpresion = () => {
    setMostrarModalConfirmacion(false);
    setMensajeExito("✅ Trabajo guardado exitosamente");
    limpiarFormulario();
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

              {/* Trabajo */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🔧 Trabajo
                </label>
                <input
                  type="text"
                  value={form.trabajo}
                  onChange={(e) => setForm((prev) => ({ ...prev, trabajo: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Descripción del trabajo"
                />
              </div>

              {/* Clave */}
              <div>
                <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
                  🔑 Clave
                </label>
                <input
                  type="text"
                  value={form.clave}
                  onChange={(e) => setForm((prev) => ({ ...prev, clave: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  placeholder="Clave del dispositivo"
                />
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

          {/* ✨ MODAL ELEGANTE DE CONFIRMACIÓN */}
          <ModalConfirmarImpresion
            isOpen={mostrarModalConfirmacion}
            onConfirm={handleConfirmarImpresion}
            onCancel={handleCancelarImpresion}
            nombreCliente={trabajoParaImprimir?.cliente || ""}
            numeroOrden={trabajoParaImprimir?.id || ""}
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
          {mostrandoOpcionesImpresion && trabajoParaImprimir && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                  <BotonesImpresionTrabajo 
                    trabajo={trabajoParaImprimir}
                    negocioId={negocioID}
                    ocultarEtiquetasA4={true}
                  />
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