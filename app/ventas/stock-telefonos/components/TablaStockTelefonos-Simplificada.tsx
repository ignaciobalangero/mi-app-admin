"use client";

import { useState, useEffect } from "react";
import { collection, deleteDoc, doc, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as XLSX from "xlsx";
import { useRol } from "@/lib/useRol";
import ModalEditarTelefono from "./ModalEditarTelefono"; // ✅ IMPORTADO
import { ImpresionGestione } from "../../../configuraciones/impresion/utils/impresionEspecifica"; // 🆕 IMPORT IMPRESIÓN

// Importar los componentes fraccionados
import { useServicios } from "./servicios/useServicios";
import ModalEnviarServicio from "./servicios/ModalEnviarServicio";
import ModalRetornarServicio from "./servicios/ModalRetornarServicio";
import ModalVerServicioActual from "./servicios/ModalVerServicioActual";
import ModalHistorialServicios from "./servicios/ModalHistorialServicio";

interface Props {
  negocioID: string;
  filtroProveedor?: boolean;
  telefonos: any[];
  setTelefonos: React.Dispatch<React.SetStateAction<any[]>>;
  onEditar?: (telefono: any) => void;
}

export default function TablaStockTelefonos({ 
  negocioID, 
  filtroProveedor = false, 
  telefonos, 
  setTelefonos, 
  onEditar 
}: Props) {
  // Estados básicos de la tabla
  const [filtro, setFiltro] = useState("");
  const [filtroProveedorTexto, setFiltroProveedorTexto] = useState("");
  const [telefonoAEliminar, setTelefonoAEliminar] = useState<any | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [ordenarPorModelo, setOrdenarPorModelo] = useState(true);
  const { rol } = useRol();
  
  // 🆕 ESTADOS PARA EL MODAL DE EDICIÓN - CORREGIDOS
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [telefonoAEditar, setTelefonoAEditar] = useState<any | null>(null);

  // Hook de servicios técnicos
  const servicios = useServicios({ 
    negocioID, 
    setTelefonos, 
    setMensaje 
  });

  // 🆕 FUNCIÓN PARA IMPRIMIR ETIQUETA
  const imprimirEtiquetaTelefono = async (telefono: any) => {
    try {
      setMensaje("🏷️ Preparando etiqueta...");

      // Leer nombre del negocio y plantilla desde Firestore
      const [configDatosSnap, plantillasSnap] = await Promise.all([
        getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`)),
        getDoc(doc(db, `negocios/${negocioID}/configuracion/plantillasImpresion`)),
      ]);

      const nombreNegocio = configDatosSnap.exists()
        ? configDatosSnap.data().nombreNegocio || ""
        : "";

      const plantilla = plantillasSnap.exists()
        ? plantillasSnap.data().etiquetaTelefono || null
        : null;

      const campos = plantilla?.campos || ['modelo', 'marca', 'gb', 'color', 'precioVenta'];
      const configuracion = plantilla?.configuracion || {
        tamaño: '62x29',
        mostrarBorde: true,
        tamañoTexto: 'mediano',
        mostrarGarantia: false,
      };

      const html = generarHTMLEtiquetaTelefono(telefono, nombreNegocio, campos, configuracion);

      const ventana = window.open('', '_blank', 'width=800,height=600');
      if (ventana) {
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();
        setMensaje("✅ Etiqueta lista");
      } else {
        alert("⚠️ El navegador bloqueó la ventana emergente.");
      }
    } catch (error) {
      console.error("Error al imprimir etiqueta:", error);
      setMensaje("❌ Error al imprimir etiqueta");
    } finally {
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  // 🆕 FUNCIONES PARA EL MODAL DE EDICIÓN
  const abrirModalEditar = (telefono: any) => {
    setTelefonoAEditar(telefono);
    setMostrarModalEditar(true);
  };

  const cerrarModalEditar = () => {
    setMostrarModalEditar(false);
    setTelefonoAEditar(null);
  };

  // 🆕 FUNCIÓN PARA RECARGAR DATOS DESPUÉS DE EDITAR
  const recargarTelefonos = async () => {
    try {
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const nuevosDatos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sinDuplicados = nuevosDatos.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setTelefonos(sinDuplicados);
      setMensaje("✅ Teléfono actualizado correctamente");
      setTimeout(() => setMensaje(""), 2000);
    } catch (error) {
      console.error("❌ Error al recargar teléfonos:", error);
      setMensaje("❌ Error al recargar los datos");
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  useEffect(() => {
    const keys = telefonos.map(t => t.id);
    const duplicados = keys.filter((id, i, arr) => arr.indexOf(id) !== i);
    if (duplicados.length) console.warn("🚨 IDs duplicados en stock:", duplicados);

    const vacios = telefonos.filter(t => !t.id);
    if (vacios.length) console.warn("🚨 Elementos sin ID:", vacios);
  }, [telefonos]);

  const confirmarEliminacion = async () => {
    if (!telefonoAEliminar) return;
    try {
      await deleteDoc(doc(db, `negocios/${negocioID}/stockTelefonos/${telefonoAEliminar.id}`));
      const snapshot = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const nuevosDatos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sinDuplicados = nuevosDatos.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setTelefonos(sinDuplicados);
      setMensaje("✅ Teléfono eliminado correctamente");
    } catch (error) {
      console.error("❌ Error al borrar el teléfono:", error);
      alert("Ocurrió un error al intentar borrar el teléfono. Revisá la consola.");
    } finally {
      setTelefonoAEliminar(null);
      setTimeout(() => setMensaje(""), 2000);
    }
  };

  const exportarExcel = () => {
    const hoja = filtrados.map((t) => ({
      Fecha: typeof t.fechaIngreso === "string"
        ? t.fechaIngreso
        : t.fechaIngreso?.toDate?.().toLocaleDateString("es-AR") || "-",
      Proveedor: t.proveedor,
      Modelo: t.modelo,
      Marca: t.marca,
      Estado: t.estado,
      Bateria: t.estado?.toLowerCase() === "usado" ? `${t.bateria || 0}%` : "-",
      Almacenamiento: t.gb,
      Color: t.color,
      IMEI: t.imei,
      Serial: t.serial,
      Compra: t.precioCompra,
      Venta: t.precioVenta,
      PrecioMayorista: t.precioMayorista,
      Moneda: t.moneda,
      Observaciones: t.observaciones,
    }));
    
    const ws = XLSX.utils.json_to_sheet(hoja);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "StockTelefonos");
    
    const nombreArchivo = ordenarPorModelo 
      ? "stock_telefonos_por_modelo.xlsx" 
      : "stock_telefonos_por_fecha.xlsx";
      
    XLSX.writeFile(wb, nombreArchivo);
  };
  
  const copiarAlPortapapeles = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setMensaje("📋 Copiado al portapapeles");
      setTimeout(() => setMensaje(""), 1500);
    } catch (error) {
      console.error("Error al copiar:", error);
    }
  };

  // Función para extraer el número del modelo
  const extraerNumeroModelo = (modelo: string) => {
    if (!modelo) return 999;
    const modeloLower = modelo.toLowerCase();
    const patterns = [
      /iphone\s*(\d+)/,
      /galaxy\s*s(\d+)/,
      /\b(\d+)\b/
    ];
    
    for (const pattern of patterns) {
      const match = modeloLower.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return 999;
  };

  // Función para ordenar por modelo inteligentemente
  const ordenarPorModeloInteligente = (a: any, b: any) => {
    const marcaA = (a.marca || '').toLowerCase();
    const marcaB = (b.marca || '').toLowerCase();
    
    if (marcaA !== marcaB) {
      return marcaA.localeCompare(marcaB);
    }
    
    const numeroA = extraerNumeroModelo(a.modelo);
    const numeroB = extraerNumeroModelo(b.modelo);
    
    if (numeroA !== numeroB) {
      return numeroA - numeroB;
    }
    
    const modeloA = (a.modelo || '').toLowerCase();
    const modeloB = (b.modelo || '').toLowerCase();
    return modeloA.localeCompare(modeloB);
  };

  // Función para ordenar por fecha
  const ordenarPorFecha = (a: any, b: any) => {
    const fechaA = typeof a.fechaIngreso === "string" 
      ? new Date(a.fechaIngreso.split('/').reverse().join('-'))
      : a.fechaIngreso?.toDate?.() || new Date(0);
    
    const fechaB = typeof b.fechaIngreso === "string"
      ? new Date(b.fechaIngreso.split('/').reverse().join('-'))
      : b.fechaIngreso?.toDate?.() || new Date(0);
    
    return fechaB.getTime() - fechaA.getTime();
  };

  const filtrados = telefonos.filter((t) => {
    const textoFiltro = filtro.toLowerCase().trim();
    
    if (!textoFiltro) {
      const coincideProveedor = !filtroProveedor || 
        !filtroProveedorTexto || 
        t.proveedor?.toLowerCase().includes(filtroProveedorTexto.toLowerCase());
      return coincideProveedor;
    }
    
    const palabras = textoFiltro.split(' ').filter(p => p.length > 0);
    const textoCombinado = [
      t.modelo || '',
      t.marca || '',
      t.color || '',
      t.imei || '',
      t.serial || '',
      t.estado || '',
      t.gb ? `${t.gb}gb` : '',
      t.observaciones || ''
    ].join(' ').toLowerCase();
    
    const todasLasPalabrasCoinciden = palabras.every(palabra => 
      textoCombinado.includes(palabra)
    );
    
    const coincideProveedor = !filtroProveedor || 
      !filtroProveedorTexto || 
      t.proveedor?.toLowerCase().includes(filtroProveedorTexto.toLowerCase());
    
    return todasLasPalabrasCoinciden && coincideProveedor;
  }).sort((a, b) => {
    return ordenarPorModelo ? ordenarPorModeloInteligente(a, b) : ordenarPorFecha(a, b);
  });

  const formatearPrecio = (precio: number) => {
    return precio ? `$${Number(precio).toLocaleString("es-AR")}` : "-";
  };

  const obtenerEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'nuevo':
        return 'bg-green-100 text-green-700';
      case 'usado':
        return 'bg-blue-100 text-blue-700';
      case 'reparacion':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {mensaje && (
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-green-800 font-semibold">{mensaje}</span>
          </div>
        </div>
      )}

      {/* 🆕 MODAL DE EDICIÓN DE TELÉFONO */}
      {mostrarModalEditar && telefonoAEditar && (
        <ModalEditarTelefono
          telefono={telefonoAEditar}
          negocioID={negocioID}
          onClose={cerrarModalEditar}
          onTelefonoActualizado={recargarTelefonos}
        />
      )}

      {/* Modales de servicios técnicos */}
      <ModalEnviarServicio
        mostrar={servicios.mostrarModalServicio}
        telefono={servicios.telefonoServicio}
        datosServicio={servicios.datosServicio}
        setDatosServicio={servicios.setDatosServicio}
        onEnviar={servicios.enviarAServicio}
        onCerrar={servicios.cerrarModalServicio}
      />

      <ModalRetornarServicio
        mostrar={servicios.mostrarModalCosto}
        telefono={servicios.telefonoRetorno}
        costoRetorno={servicios.costoRetorno}
        setCostoRetorno={servicios.setCostoRetorno}
        onRetornar={servicios.handleRetornoServicio}
        onCerrar={servicios.cerrarModalCosto}
      />

      <ModalVerServicioActual
        mostrar={servicios.mostrarModalServicioActual}
        telefono={servicios.telefonoServicioActual}
        onCerrar={servicios.cerrarModalServicioActual}
        onRetornarAhora={servicios.irARetornoDesdeServicioActual}
      />

      <ModalHistorialServicios
        mostrar={servicios.mostrarModalHistorial}
        telefono={servicios.telefonoHistorial}
        onCerrar={servicios.cerrarModalHistorial}
      />

      {/* Modal de confirmación de eliminación */}
      {telefonoAEliminar && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300">
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
                  <p className="text-red-100 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  ¿Estás seguro que querés eliminar este teléfono del stock?
                </p>
                <div className="mt-2 text-sm text-red-600">
                  <strong>Modelo:</strong> {telefonoAEliminar.modelo}<br/>
                  <strong>IMEI:</strong> {telefonoAEliminar.imei}
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setTelefonoAEliminar(null)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminacion}
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controles de la tabla */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl border border-gray-200 p-3 sm:p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1">
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="🔍 Buscar: modelo, marca, color, estado, GB... (ej: 'iphone 11 rojo')"
                className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pl-4"
              />
            </div>

            {filtroProveedor && (
              <div className="relative flex-1">
                <input
                  type="text"
                  value={filtroProveedorTexto}
                  onChange={(e) => setFiltroProveedorTexto(e.target.value)}
                  placeholder="🏪 Filtrar por proveedor"
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pl-4"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setOrdenarPorModelo(!ordenarPorModelo)}
              className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                ordenarPorModelo 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {ordenarPorModelo ? '📱 Por Modelo ✓' : '📅 Por Fecha'}
            </button>

            <button
            onClick={exportarExcel}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
            >
            📊 <span className="hidden sm:inline">Descargar</span> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 sm:p-4 md:p-6">
      <h3 className="text-sm sm:text-lg md:text-xl font-bold flex items-center gap-2 sm:gap-3">
            📱 Stock de Teléfonos
            <span className="text-lg font-normal">
              {ordenarPorModelo ? '(Ordenado por Modelo)' : '(Ordenado por Fecha)'}
            </span>
          </h3>
          <p className="text-purple-100 mt-1">
            {filtrados.length} de {telefonos.length} {telefonos.length === 1 ? 'teléfono' : 'teléfonos'} en stock
          </p>
        </div>

        <div className="overflow-x-auto border border-gray-300">
          <table className="w-full border-collapse">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
              <tr>
              <th className="p-1 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 min-w-[60px] sm:min-w-[70px] md:min-w-[80px] max-w-[85px]">
                  📅 Fecha
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-32">
                  🏪 Proveedor
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-40">
                  📱 Modelo
                </th>
                <th className="p-1 sm:p-2 md:p-3 text-left text-xs sm:text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 min-w-[60px] sm:min-w-[70px] md:min-w-[80px] max-w-[85px]">
                  🏷️ Marca
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-24">
                  ⚡ Estado
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-20">
                  🔋 Bat.
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-20">
                  💾 GB
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-20">
                  🎨 Color
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-32">
                  🔢 IMEI
                </th>
                <th className="p-3 text-left text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-32">
                  🏷️ Serial
                </th>
                {rol?.tipo === "admin" && (
                  <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-24">
                    💸 Compra
                  </th>
                )}
                <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-24">
                  💰 Venta
                </th>
                <th className="p-3 text-right text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-24">
                  🏪 Mayor.
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-20">
                  💱 Mon.
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-28">
                  Observaciones
                </th>
                <th className="p-3 text-center text-sm font-semibold text-gray-700 border border-gray-400 bg-gray-200 w-32">
                  ⚙️ Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td 
                    colSpan={rol?.tipo === "admin" ? 16 : 15}
                    className="p-12 text-center text-gray-500 border border-gray-300"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">📱</span>
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-600">
                          {telefonos.length === 0 ? "No hay teléfonos en stock" : "No se encontraron resultados"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {telefonos.length === 0 
                            ? "Los teléfonos aparecerán aquí una vez que agregues algunos al stock"
                            : "Intenta ajustar los filtros de búsqueda"
                          }
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map((t, index) => {
                  const isEven = index % 2 === 0;
                  
                  return (
                    <tr 
                      key={`stock-${t.id || ""}-${t.imei || Math.random()}`} 
                      className={`transition-colors duration-200 ${
                        t.enServicio 
                          ? 'bg-gray-200 opacity-75' 
                          : isEven ? 'bg-white hover:bg-purple-50' : 'bg-gray-50 hover:bg-purple-50'
                      }`}
                    >
                      <td className="p-1 sm:p-2 border border-gray-300 text-xs" style={{minWidth: '60px', maxWidth: '80px'}}>
                        <span className="font-medium text-gray-800">
                          {typeof t.fechaIngreso === "string"
                            ? t.fechaIngreso
                            : t.fechaIngreso?.toDate?.().toLocaleDateString?.("es-AR") || "-"}
                        </span>
                      </td>
                      <td className="p-2 border border-gray-300 text-xs" style={{minWidth: '100px'}}>
                        <span className="text-gray-700 truncate block">{t.proveedor || "-"}</span>
                      </td>
                      <td className="p-2 border border-gray-300" style={{minWidth: '120px'}}>
                        <div className="font-medium text-gray-800 text-xs truncate">{t.modelo}</div>
                      </td>
                      <td className="p-1 sm:p-2 border border-gray-300 text-xs" style={{minWidth: '60px', maxWidth: '80px'}}>
                        <span className="text-gray-700 truncate block">{t.marca || "-"}</span>
                      </td>
                      <td className="p-2 border border-gray-300 text-center" style={{minWidth: '100px'}}>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          t.enServicio 
                            ? 'bg-orange-100 text-orange-700' 
                            : obtenerEstadoColor(t.estado)
                        }`}>
                          {t.enServicio ? '🔧 En Servicio' : (t.estado || "-")}
                        </span>
                      </td>
                      <td className="p-2 border border-gray-300 text-center" style={{minWidth: '60px'}}>
                        {t.estado?.toLowerCase() === "usado" ? (
                          <span className="text-xs font-medium text-yellow-700">
                            {t.bateria}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 border border-gray-300 text-center" style={{minWidth: '60px'}}>
                        {t.gb ? (
                          <span className="text-xs font-medium text-blue-700">
                            {t.gb}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 border border-gray-300 text-center text-xs" style={{minWidth: '80px'}}>
                        <span className="text-gray-700">{t.color || "-"}</span>
                        </td>
                      <td className="p-2 border border-gray-300" style={{minWidth: '140px'}}>
                        {t.imei ? (
                          <button
                            onClick={() => copiarAlPortapapeles(t.imei)}
                            className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline cursor-pointer w-full text-left truncate"
                            title={`Click para copiar: ${t.imei}`}
                          >
                            {t.imei}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-1 sm:p-2 border border-gray-300" style={{minWidth: '80px', maxWidth: '100px'}}>
                        {t.serial ? (
                            <button
                            onClick={() => copiarAlPortapapeles(t.serial)}
                            className="text-xs font-mono bg-[#ecf0f1] hover:bg-[#3498db] hover:text-white px-1 py-1 rounded truncate block w-full text-left transition-colors duration-200 cursor-pointer"
                            title={`Serial completo: ${t.serial} (Click para copiar)`}
                            onMouseEnter={(e) => {
                                // Mostrar serial completo en hover
                                e.currentTarget.textContent = t.serial;
                            }}
                            onMouseLeave={(e) => {
                                // Volver a mostrar solo los últimos 4
                                e.currentTarget.textContent = `...${t.serial.slice(-4)}`;
                            }}
                            >
                            ...{t.serial.slice(-4)}
                            </button>
                        ) : (
                            <span className="text-xs font-mono bg-[#ecf0f1] px-1 py-1 rounded block text-center">-</span>
                        )}
                      </td>
                      {rol?.tipo === "admin" && (
                        <td className="p-2 border border-gray-300 text-right text-xs" style={{minWidth: '80px'}}>
                          <span className="font-medium text-gray-700 whitespace-nowrap">
                            {formatearPrecio(t.precioCompra)}
                          </span>
                        </td>
                      )}
                      <td className="p-2 border border-gray-300 text-right text-xs" style={{minWidth: '80px'}}>
                        <span className="font-semibold text-green-700 whitespace-nowrap">
                          {formatearPrecio(t.precioVenta)}
                        </span>
                      </td>
                      <td className="p-2 border border-gray-300 text-right text-xs" style={{minWidth: '80px'}}>
                        <span className="font-semibold text-blue-700 whitespace-nowrap">
                          {formatearPrecio(t.precioMayorista)}
                        </span>
                      </td>
                      <td className="p-2 border border-gray-300 text-center" style={{minWidth: '60px'}}>
                        <span className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          t.moneda === 'USD' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {t.moneda === "USD" ? "USD" : "ARS"}
                        </span>
                      </td>
                      <td className="p-2 border border-gray-300 text-xs" style={{minWidth: '150px'}}>
                        <span className="text-gray-700 break-words" title={t.observaciones}>
                          {t.observaciones || "-"}
                        </span>
                      </td>
                      <td className="p-2 border border-gray-300 text-center" style={{minWidth: '140px'}}>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {!t.enServicio ? (
                            <>
                              <button
                                onClick={() => setTelefonoAEliminar(t)}
                                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors duration-200 whitespace-nowrap"
                              >
                                🗑️
                              </button>
                              {/* 🆕 BOTÓN EDITAR ACTUALIZADO - AHORA ABRE MODAL */}
                              <button
                                onClick={() => abrirModalEditar(t)}
                                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors duration-200 whitespace-nowrap"
                              >
                                ✏️
                              </button>
                              {/* 🆕 BOTÓN IMPRIMIR ETIQUETA */}
                              <button
                                onClick={() => imprimirEtiquetaTelefono(t)}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-200 whitespace-nowrap"
                                title="Imprimir etiqueta"
                              >
                                🏷️
                              </button>
                              <button
                                onClick={() => servicios.abrirModalServicio(t)}
                                className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-200 whitespace-nowrap"
                              >
                                🔧
                              </button>
                              {(t.historialServicios && t.historialServicios.length > 0) && (
                                <button
                                  onClick={() => servicios.abrirModalHistorial(t)}
                                  className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors duration-200 whitespace-nowrap"
                                  title="Ver historial de servicios"
                                >
                                  📋
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => servicios.abrirModalRetorno(t)}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-200 whitespace-nowrap"
                              >
                                ✅ Retornar
                              </button>
                              <button
                                onClick={() => servicios.abrirModalServicioActual(t)}
                                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                              >
                                👁️ Ver
                              </button>
                              {/* 🆕 BOTÓN IMPRIMIR ETIQUETA (también disponible cuando está en servicio) */}
                              <button
                                onClick={() => imprimirEtiquetaTelefono(t)}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-200 whitespace-nowrap"
                                title="Imprimir etiqueta"
                              >
                                🏷️
                              </button>
                              {(t.historialServicios && t.historialServicios.length > 0) && (
                                <button
                                  onClick={() => servicios.abrirModalHistorial(t)}
                                  className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors duration-200 whitespace-nowrap"
                                  title="Ver historial completo de servicios"
                                >
                                  📋
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtrados.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                Mostrando {filtrados.length} de {telefonos.length} {telefonos.length === 1 ? 'teléfono' : 'teléfonos'}
              </span>
              {rol?.tipo === "admin" && (
                <div className="flex gap-6">
                 
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function generarHTMLEtiquetaTelefono(
  datos: any,
  nombreNegocio: string,
  camposSeleccionados: string[],
  configuracion: any
) {
  const mapaCampos: any = {
    'marca':        { label: 'MARCA',   valor: datos.marca },
    'modelo':       { label: 'MODELO',  valor: datos.modelo },
    'gb':           { label: 'GB',      valor: datos.gb ? `${datos.gb} GB` : null },
    'color':        { label: 'COLOR',   valor: datos.color },
    'estado':       { label: 'ESTADO',  valor: datos.estado?.toUpperCase() },
    'bateria':      { label: 'BAT',     valor: datos.bateria ? `${datos.bateria}%` : null },
    'imei':         { label: 'IMEI',    valor: datos.imei, monospace: true },
    'precioVenta':  { label: 'PRECIO',  valor: datos.precioVenta ? `$${Number(datos.precioVenta).toLocaleString('es-AR')}` : null },
    'fechaIngreso': { label: 'INGRESO', valor: datos.fechaIngreso },
  };

  const mitad = Math.ceil(camposSeleccionados.length / 2);
  const columnaIzq = camposSeleccionados.slice(0, mitad);
  const columnaDer = camposSeleccionados.slice(mitad);

  const obtenerTamañoFuente = () => {
    switch (configuracion.tamañoTexto) {
      case 'muy-pequeño': return { label: '6px', value: '7px', valueLarge: '8px' };
      case 'pequeño':     return { label: '6.5px', value: '7.5px', valueLarge: '8.5px' };
      default:            return { label: '7px', value: '8px', valueLarge: '9px' };
    }
  };

  const t = obtenerTamañoFuente();
  const mostrarBorde = configuracion.mostrarBorde !== false;

  const generarCampos = (campos: string[]) =>
    campos.map(id => {
      const campo = mapaCampos[id];
      if (!campo || !campo.valor) return '';
      return `
        <div class="field">
          <span class="label">${campo.label}:</span>
          <span class="value${campo.monospace ? ' mono' : ''}">${campo.valor}</span>
        </div>`;
    }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: 62mm 29mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 62mm; height: 29mm; overflow: hidden; font-family: Arial, sans-serif; }
    body { ${mostrarBorde ? 'border: 4px solid #000;' : ''} display: flex; flex-direction: column; }
    .header { text-align: center; padding: 2mm 0; margin-top: 1mm; font-size: 11px; font-weight: 900; letter-spacing: 1.5mm; border-bottom: 3px solid #000; flex-shrink: 0; }
    .content { display: flex; flex: 1; padding: 2.5mm 3mm; gap: 3mm; overflow: hidden; }
    .column { flex: 1; display: flex; flex-direction: column; justify-content: space-evenly; }
    .field { display: flex; flex-direction: row; align-items: baseline; gap: 1mm; margin-bottom: 1mm; }
    .label { font-weight: 900; font-size: ${t.label}; text-transform: uppercase; }
    .value { font-size: ${t.value}; font-weight: 900; word-wrap: break-word; }
    .mono { font-family: 'Courier New', monospace; font-size: ${t.label}; letter-spacing: 0.2mm; }
    .garantia { font-size: 6px; text-align: center; border-top: 1px solid #ccc; padding-top: 1mm; }
  </style>
</head>
<body>
  <div class="header">${nombreNegocio || 'MI NEGOCIO'}</div>
  <div class="content">
    <div class="column">${generarCampos(columnaIzq)}</div>
    <div class="column">${generarCampos(columnaDer)}</div>
  </div>
  ${configuracion.mostrarGarantia ? '<div class="garantia">GARANTÍA: 30 DÍAS</div>' : ''}
  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 500));
    window.addEventListener('afterprint', () => window.close());
  </script>
</body>
</html>`;
}