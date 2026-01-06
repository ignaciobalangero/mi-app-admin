"use client";

import { useEffect, useState } from "react";
import html2canvas from 'html2canvas';
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayRemove,
} from "firebase/firestore";
import { useRol } from "@/lib/useRol";

// ✅ IMPORTAR EL HOOK DE COTIZACIÓN CENTRALIZADO (igual que en StockProductosPage)
import useCotizacion from "@/lib/hooks/useCotizacion";

interface Props {
  trabajoID: string;
  onClose: () => void;
  onGuardar?: () => void;
}

export default function ModalAgregarRepuesto({ trabajoID, onClose, onGuardar }: Props) {
  const [repuestos, setRepuestos] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<any[]>([]);
  const [usadosPrevios, setUsadosPrevios] = useState<any[]>([]);
  const [filtro, setFiltro] = useState("");
  const [actualizandoSheet, setActualizandoSheet] = useState(false);
  const { rol } = useRol();

  // ✅ USAR EL HOOK DE COTIZACIÓN CENTRALIZADO (igual que en StockProductosPage)
  const { cotizacion, actualizarCotizacion } = useCotizacion(rol?.negocioID || "");

  // ✅ FUNCIÓN CORREGIDA CON LÓGICA CORRECTA
  const normalizarPrecio = (repuesto: any) => {
    console.log("🔍 Analizando precios del repuesto:", repuesto.id);
    console.log("📊 Datos del repuesto:", {
      precioCosto: repuesto.precioCosto,
      precioCostoPesos: repuesto.precioCostoPesos,
      precioARS: repuesto.precioARS,
      precioUSD: repuesto.precioUSD,
      precio: repuesto.precio,
      moneda: repuesto.moneda
    });
    console.log("💵 Cotización centralizada actual:", cotizacion);

    let precioFinal = 0;
    let metodoPrecio = "Sin precio";
    
    // ✅ LÓGICA CORRECTA SEGÚN TUS ESPECIFICACIONES:
    
    // 1️⃣ PRIMERO: Si tiene precioCostoPesos (ya guardado convertido) - PRIORITARIO
    if (repuesto.precioCostoPesos && repuesto.precioCostoPesos > 0) {
      precioFinal = Number(repuesto.precioCostoPesos);
      metodoPrecio = "precioCostoPesos (ya guardado convertido)";
      console.log("✅ Usando precioCostoPesos ya guardado:", precioFinal);
      
    // 2️⃣ SEGUNDO: Si NO tiene precioCostoPesos pero SÍ tiene precioUSD - CONVERTIR
    } else if (repuesto.precioUSD && repuesto.precioUSD > 0 && cotizacion > 0) {
      precioFinal = Number(repuesto.precioUSD) * cotizacion;
      metodoPrecio = `precioUSD convertido (${repuesto.precioUSD} USD × ${cotizacion} = ${precioFinal.toFixed(2)} ARS)`;
      console.log("🔄 NO tiene precioCostoPesos, convirtiendo precioUSD:", precioFinal);
      
    // 3️⃣ TERCERO: Si NO tiene USD, usar precioARS nativo
    } else if (repuesto.precioARS && repuesto.precioARS > 0) {
      precioFinal = Number(repuesto.precioARS);
      metodoPrecio = "precioARS nativo (sin USD)";
      console.log("✅ NO tiene USD, usando precioARS nativo:", precioFinal);
      
    // 4️⃣ CUARTO: Fallback con precioCosto verificando moneda
    } else if (repuesto.precioCosto && repuesto.precioCosto > 0) {
      if (repuesto.moneda === "USD" && cotizacion > 0) {
        precioFinal = Number(repuesto.precioCosto) * cotizacion;
        metodoPrecio = `precioCosto USD convertido (${repuesto.precioCosto} USD × ${cotizacion} = ${precioFinal.toFixed(2)} ARS)`;
        console.log("🔄 Convirtiendo precioCosto USD a ARS:", precioFinal);
      } else {
        precioFinal = Number(repuesto.precioCosto);
        metodoPrecio = "precioCosto (asumido ARS)";
        console.log("✅ Usando precioCosto como ARS:", precioFinal);
      }
      
    // 5️⃣ ÚLTIMO RECURSO: precio genérico
    } else if (repuesto.precio && repuesto.precio > 0) {
      if (repuesto.moneda === "USD" && cotizacion > 0) {
        precioFinal = Number(repuesto.precio) * cotizacion;
        metodoPrecio = `precio USD convertido (${repuesto.precio} USD × ${cotizacion} = ${precioFinal.toFixed(2)} ARS)`;
        console.log("🔄 Convirtiendo precio genérico USD a ARS:", precioFinal);
      } else {
        precioFinal = Number(repuesto.precio);
        metodoPrecio = "precio genérico (asumido ARS)";
        console.log("✅ Usando precio genérico como ARS:", precioFinal);
      }
    }

    console.log("✅ Método usado:", metodoPrecio);
    console.log("💰 Precio final normalizado:", precioFinal);
    
    return precioFinal;
  };

  // Función para obtener emoji del color
  const obtenerEmojiColor = (color: string): string => {
    if (!color) return "🎨";
    
    const colorLower = color.toLowerCase();
    
    if (colorLower.includes("rojo") || colorLower.includes("red")) return "🔴";
    if (colorLower.includes("azul") || colorLower.includes("blue")) return "🔵";
    if (colorLower.includes("verde") || colorLower.includes("green")) return "🟢";
    if (colorLower.includes("amarillo") || colorLower.includes("yellow")) return "🟡";
    if (colorLower.includes("naranja") || colorLower.includes("orange")) return "🟠";
    if (colorLower.includes("morado") || colorLower.includes("púrpura") || colorLower.includes("violeta") || colorLower.includes("purple")) return "🟣";
    if (colorLower.includes("negro") || colorLower.includes("black")) return "⚫";
    if (colorLower.includes("blanco") || colorLower.includes("white")) return "⚪";
    if (colorLower.includes("gris") || colorLower.includes("gray") || colorLower.includes("grey")) return "🔘";
    if (colorLower.includes("rosa") || colorLower.includes("pink")) return "🌸";
    if (colorLower.includes("dorado") || colorLower.includes("oro") || colorLower.includes("gold")) return "🟡";
    if (colorLower.includes("plateado") || colorLower.includes("plata") || colorLower.includes("silver")) return "🔘";
    if (colorLower.includes("transparente") || colorLower.includes("clear")) return "💎";
    
    return "🎨";
  };

// ✅ AGREGAR ESTA FUNCIÓN COMPLETA AQUÍ
const mostrarToast = (mensaje: string, tipo: "success" | "error") => {
  const toast = document.createElement('div');
  const gradiente = tipo === "success" 
    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    : "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)";
  
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${gradiente};
    color: white;
    padding: 24px 32px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 18px;
    font-weight: 600;
    animation: fadeIn 0.2s ease-in;
  `;
  
  toast.innerHTML = `
    <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
      ${tipo === "success" ? "✓" : "✕"}
    </div>
    <span>${mensaje}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.2s ease-out';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 200);
  }, 1000);
};

  useEffect(() => {
    const cargar = async () => {
      // Cargar de stockRepuestos (stock local)
      const snapRepuestos = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockRepuestos`)
      );
      const dataRepuestos = snapRepuestos.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        fuente: 'stockRepuestos',
        icono: '📦',
        descripcionFuente: 'Stock Local'
      }));

      // Cargar de stockExtra (Google Sheets)
      const snapExtra = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );
      const dataExtra = snapExtra.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        fuente: 'stockExtra',
        icono: '📊',
        descripcionFuente: 'Google Sheet'
      }));

      // Combinar ambas fuentes
      const dataCombinada = [...dataRepuestos, ...dataExtra];
      console.log("📦 Repuestos cargados:", dataCombinada.length);
      setRepuestos(dataCombinada);
    };

    const cargarUsadosPrevios = async () => {
      const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
      const trabajoDoc = await getDoc(trabajoRef);
      const usados = (trabajoDoc.data()?.repuestosUsados || []).map((d: any) => ({
        ...d,
        timestamp: d.timestamp || Date.now() + Math.random(),
      }));
      console.log("📋 Repuestos usados previos:", usados);
      setUsadosPrevios(usados);
    };

    if (rol?.negocioID) {
      cargar();
      cargarUsadosPrevios();
    }
  }, [rol, trabajoID]);

  // 🆕 Función para actualizar el Google Sheet por hoja específica
  const actualizarGoogleSheet = async () => {
    if (!rol?.negocioID) return;

    try {
      setActualizandoSheet(true);
      
      // Obtener todas las configuraciones de hojas
      const sheetConfigSnap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/configuracion/datos/googleSheets`)
      );
      
      if (sheetConfigSnap.empty) {
        console.log("⚠️ No hay configuración de Sheet configurada");
        return;
      }

      // Crear un mapa de configuraciones por nombre de hoja (normalizado)
      const configPorHoja: { [key: string]: { sheetID: string; hoja: string } } = {};
      sheetConfigSnap.docs.forEach((doc: any) => {
        const config = doc.data();
        const nombreHoja = config.hoja;
        if (nombreHoja) {
          // Normalizar el nombre (primera letra mayúscula, resto minúscula)
          const nombreNormalizado = nombreHoja.toLowerCase();
          configPorHoja[nombreNormalizado] = {
            sheetID: config.id,
            hoja: config.hoja
          };
        }
      });

      console.log("📋 Configuraciones disponibles:", Object.keys(configPorHoja));

      // ✅ USAR COTIZACIÓN CENTRALIZADA PARA ACTUALIZAR SHEETS
      console.log("💵 Usando cotización centralizada para Google Sheets:", cotizacion);

      // Obtener productos actualizados desde Firebase
      const snap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );
      const productos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Agrupar productos por hoja (usando categoría)
      const productosPorHoja: { [key: string]: any[] } = {};
      productos.forEach((p: any) => {
        if (p.categoria) {
          // Normalizar la categoría para coincidir con las hojas
          const categoriaNormalizada = p.categoria.toLowerCase();
          
          if (!productosPorHoja[categoriaNormalizada]) {
            productosPorHoja[categoriaNormalizada] = [];
          }
          
          const precioUSD = Number(p.precioUSD) || 0;
          const precioARS = Number((precioUSD * cotizacion).toFixed(2));

          productosPorHoja[categoriaNormalizada].push({
            codigo: p.id,
            categoria: p.categoria || "",
            producto: p.producto || "",
            cantidad: Number(p.cantidad) || 0,
            precioARS: precioARS,
            precioUSD: precioUSD,
          });
        }
      });

      console.log("📊 Productos agrupados por hoja:", Object.keys(productosPorHoja));

      // Actualizar cada hoja que tenga productos
      for (const [nombreHoja, filas] of Object.entries(productosPorHoja)) {
        const config = configPorHoja[nombreHoja];
        
        if (!config) {
          console.log(`⚠️ No hay configuración para la hoja: ${nombreHoja}`);
          continue;
        }

        const { sheetID, hoja } = config;
        
        console.log(`🔧 Actualizando hoja: "${hoja}" con ${filas.length} productos`);

        try {
          const res = await fetch("/api/actualizar-precios-sheet", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ 
              sheetID: sheetID, 
              hoja: hoja, 
              filas: filas 
            }),
          });

          const json = await res.json();
          console.log(`🔥 Respuesta de API para "${hoja}":`, json);
          
          if (!res.ok) {
            console.error("❌ Error HTTP:", res.status, res.statusText);
            throw new Error(json.error || `HTTP Error: ${res.status}`);
          }

          console.log(`✅ Hoja "${hoja}" actualizada correctamente`);
        } catch (err) {
          console.error(`❌ Error actualizando hoja "${hoja}":`, err);
        }
      }

      console.log("✅ Todas las hojas han sido actualizadas");
      
    } catch (err) {
      console.error("❌ Error general actualizando Google Sheets:", err);
    } finally {
      setActualizandoSheet(false);
    }
  };

  const agregarASeleccionados = (repuesto: any) => {
    if (repuesto.cantidad <= 0) {
      mostrarToast("⚠️ Este repuesto no tiene stock disponible", "error");
      return;
    }
  
    console.log("🔧 Agregando repuesto a seleccionados:", repuesto.id);
    
    const precioNormalizado = normalizarPrecio(repuesto);
    
    if (precioNormalizado <= 0) {
      console.error("❌ Error: Precio no válido para el repuesto:", repuesto.id);
      mostrarToast(`⚠️ Precio no válido: ${repuesto.producto}`, "error");
      return;
    }
  
    const repuestoUsado = {
      ...repuesto,
      precio: precioNormalizado,
      precioCosto: precioNormalizado,
      precioCostoPesos: precioNormalizado,
      costoPesos: precioNormalizado,
      timestamp: Date.now() + Math.random(),
    };
  
    console.log("✅ Repuesto preparado para agregar:", {
      id: repuestoUsado.id,
      producto: repuestoUsado.producto,
      precio: repuestoUsado.precio,
      precioCosto: repuestoUsado.precioCosto,
      precioCostoPesos: repuestoUsado.precioCostoPesos,
      costoPesos: repuestoUsado.costoPesos
    });
  
    setSeleccionados((prev) => [...prev, repuestoUsado]);
   
  };
  
  const eliminarDeSeleccionados = (timestamp: number) => {
    setSeleccionados((prev) => prev.filter((r) => r.timestamp !== timestamp));
  };

  const eliminarPrevio = async (repuesto: any) => {
    console.log("🗑️ Eliminando repuesto previo:", repuesto.id);
    
    const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
    const docSnap = await getDoc(trabajoRef);
    const data = docSnap.data();
    const repuestosActuales = data?.repuestosUsados || [];
    const costoActual = Number(data?.costo) || 0;
  
    const repuestoAEliminar = repuestosActuales.find(
      (r: any) => r.timestamp === repuesto.timestamp
    );
  
    if (!repuestoAEliminar) {
      console.error("❌ No se encontró el repuesto a eliminar");
      return;
    }
  
    const costoARestar = normalizarPrecio(repuestoAEliminar);
    console.log("💰 Costo a restar:", costoARestar);
  
    const actualizados = repuestosActuales.filter(
      (r: any) => r.timestamp !== repuesto.timestamp
    );
  
    const nuevoCosto = Math.max(0, costoActual - costoARestar);
    console.log("💰 Nuevo costo total:", nuevoCosto);
  
    await updateDoc(trabajoRef, {
      repuestosUsados: actualizados,
      costo: nuevoCosto,
    });
  
    const coleccionStock = repuesto.fuente || 'stockRepuestos';
    const repuestoRef = doc(db, `negocios/${rol.negocioID}/${coleccionStock}/${repuesto.id}`);
    await updateDoc(repuestoRef, {
      cantidad: increment(1),
    });
  
    if (repuesto.fuente === 'stockExtra') {
      await actualizarGoogleSheet();
    }
  
    // ✅ Actualizar estado local sin recargar
setUsadosPrevios((prev) => prev.filter((r) => r.timestamp !== repuesto.timestamp));

// ✅ Mostrar toast y cerrar modal
mostrarToast("✅ Repuesto eliminado correctamente", "success");

setTimeout(() => {
  // ✅ Llamar onGuardar para actualizar el componente padre
  if (onGuardar) {
    onGuardar();
  }
  
  // ✅ Cerrar modal
  onClose();
}, 1000);
  };

  // ✅ FUNCIÓN CORREGIDA PARA GUARDAR Y ACTUALIZAR ESTADO LOCAL
  const guardarTodos = async () => {
    if (seleccionados.length === 0) {
      alert("⚠️ No hay repuestos seleccionados para guardar.");
      return;
    }

    console.log("🟢 Iniciando guardarTodos...");
    console.log("🟢 Repuestos seleccionados:", seleccionados);

    const trabajoRef = doc(db, `negocios/${rol.negocioID}/trabajos/${trabajoID}`);
    const trabajoSnap = await getDoc(trabajoRef);
    const trabajoData = trabajoSnap.data();

    const previos = trabajoData?.repuestosUsados || [];
    const repuestosActualizados = [...previos, ...seleccionados];
    
    // ✅ CALCULAR COSTO TOTAL CON PRECIOS NORMALIZADOS
    let costoTotal = 0;
    
    // Sumar costos de repuestos previos
    previos.forEach((r: any) => {
      const costo = normalizarPrecio(r);
      costoTotal += costo;
      console.log(`💰 Costo previo - ${r.producto}: ${costo}`);
    });
    
    // Sumar costos de repuestos nuevos
    seleccionados.forEach((r: any) => {
      const costo = normalizarPrecio(r);
      costoTotal += costo;
      console.log(`💰 Costo nuevo - ${r.producto}: ${costo}`);
    });

    console.log("🟢 Costo total calculado:", costoTotal);

    // ✅ GUARDAR CON COSTO CORRECTO EN FIREBASE
    await updateDoc(trabajoRef, {
      repuestosUsados: repuestosActualizados,
      costo: Number(costoTotal.toFixed(2)), // Redondear a 2 decimales
    });

    console.log("🟢 Trabajo actualizado en Firebase");

    // Descontar del stock correcto según la fuente
    let hayStockExtra = false;
    for (const r of seleccionados) {
      console.log("🟢 Procesando repuesto:", r.id, "fuente:", r.fuente);
      
      const coleccionStock = r.fuente || 'stockRepuestos';
      const ref = doc(db, `negocios/${rol.negocioID}/${coleccionStock}/${r.id}`);
      await updateDoc(ref, {
        cantidad: r.cantidad - 1,
      });

      console.log("🟢 Stock actualizado para:", r.id);

      // Marcar si hay productos de stockExtra
      if (r.fuente === 'stockExtra') {
        hayStockExtra = true;
        console.log("🟢 Repuesto de stockExtra detectado");
      }
    }

    // 🆕 Si se usaron productos de stockExtra, actualizar el Google Sheet
    if (hayStockExtra) {
      console.log("🟢 Iniciando actualización de Google Sheet...");
      await actualizarGoogleSheet();
      console.log("🟢 Actualización de Google Sheet completada");
    }

// ✅ LLAMAR A onGuardar PRIMERO PARA ACTUALIZAR EL COMPONENTE PADRE
if (onGuardar) {
  console.log("🔄 Notificando al componente padre para actualizar...");
  await onGuardar();
}

// ✅ Mostrar toast DESPUÉS de actualizar
mostrarToast(`✅ ${seleccionados.length} repuestos guardados correctamente`, "success");

setTimeout(() => {
  console.log("🟢 Cerrando modal...");
  onClose();
}, 1000);
  };

  // Filtro mejorado que incluye color
  const resultados = repuestos.filter((r) => {
    const texto = `${r.categoria} ${r.producto} ${r.modelo || ''} ${r.marca || ''} ${r.color || ''}`.toLowerCase();
    return filtro
      .toLowerCase()
      .split(" ")
      .every((palabra) => texto.includes(palabra));
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden border-2 border-[#ecf0f1]">
        
        {/* Header del modal - Estilo GestiOne */}
        <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Gestión de Repuestos</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Cotización sincronizada con Ventas General: ${cotizacion > 0 ? cotizacion.toFixed(0) : 'N/A'} ARS/USD
                  {actualizandoSheet && (
                    <span className="block text-yellow-200 font-medium mt-1">
                      🔄 Actualizando Google Sheet...
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-purple-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center hover:scale-110"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 bg-[#f8f9fa] max-h-[calc(90vh-120px)] overflow-y-auto">
          
          {/* ✅ COMPONENTE PARA MOSTRAR COTIZACIÓN CENTRALIZADA */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-[#27ae60] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💵</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[#2c3e50]">Cotización del Dólar (Sistema Centralizado)</h4>
                <p className="text-xs text-[#7f8c8d]">
                  Los precios en USD se convertirán automáticamente usando la cotización de Ventas General
                </p>
              </div>
              <div className="text-right">
                <div>
                  <span className="text-lg font-bold text-[#27ae60]">${cotizacion > 0 ? cotizacion.toFixed(0) : 'N/A'}</span>
                  <span className="text-xs text-[#7f8c8d] block">ARS por USD</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Buscador - Estilo GestiOne */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-[#2c3e50]">Buscar Repuestos</h3>
              <div className="flex gap-2 ml-auto">
                <span className="text-xs bg-[#3498db] text-white px-2 py-1 rounded-full flex items-center gap-1">
                  📦 Stock Local
                </span>
                <span className="text-xs bg-[#9b59b6] text-white px-2 py-1 rounded-full flex items-center gap-1">
                  📊 Google Sheet
                </span>
              </div>
            </div>
            <input
              type="text"
              placeholder="🔍 Buscar por categoría, producto, modelo, marca o color (ej: tapa iphone 13 roja)"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
            />
          </div>

          {/* Información de sincronización automática */}
          {actualizandoSheet && (
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-[#f39c12] rounded-xl p-4 mb-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center animate-pulse">
                  <span className="text-white text-sm">🔄</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#2c3e50]">Sincronizando con Google Sheets</h3>
                  <p className="text-xs text-[#7f8c8d]">
                    Actualizando las cantidades en el archivo de Google Sheets automáticamente...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de resultados - Estilo GestiOne */}
          {filtro.trim() !== "" && resultados.length > 0 && (
            <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 mb-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">📦</span>
                </div>
                Repuestos Disponibles ({resultados.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Fuente</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Código</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Categoría</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Producto</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Modelo</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Marca</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">🎨 Color</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Precio</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Stock</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultados.map((r, index) => {
                      const yaSeleccionado = seleccionados.some((s) => s.id === r.id && s.fuente === r.fuente);
                      const isEven = index % 2 === 0;
                      const precioNormalizado = normalizarPrecio(r);

                      return (
                        <tr key={`${r.fuente}-${r.id}`} className={`transition-all duration-200 hover:bg-[#ebf3fd] ${isEven ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                          <td className="p-3 border border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{r.icono}</span>
                              <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${
                                r.fuente === 'stockExtra' ? 'bg-[#9b59b6]' : 'bg-[#3498db]'
                              }`}>
                                {r.descripcionFuente}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                              {r.codigo}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.categoria}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50]">{r.producto}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.modelo || '—'}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.marca || '—'}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{obtenerEmojiColor(r.color)}</span>
                              <span className="text-sm text-[#2c3e50]">{r.color || '—'}</span>
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <div className="flex flex-col">
                              <span className={`text-sm font-semibold ${precioNormalizado > 0 ? 'text-[#27ae60]' : 'text-[#e74c3c]'}`}>
                                ARS ${precioNormalizado > 0 ? precioNormalizado.toFixed(2) : "Sin precio"}
                              </span>
                              {precioNormalizado <= 0 && (
                                <span className="text-xs text-[#e74c3c]">⚠️ Precio no válido</span>
                              )}
                              {r.precioUSD && r.precioUSD > 0 && cotizacion > 0 && (
                                <span className="text-xs text-[#7f8c8d]">USD ${r.precioUSD}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                              r.cantidad > 0 ? 'bg-green-100 text-[#27ae60]' : 'bg-red-100 text-[#e74c3c]'
                            }`}>
                              {r.cantidad}
                            </span>
                          </td>
                          <td className="p-3 border border-black text-center">
                            {!yaSeleccionado ? (
                              <button
                                onClick={() => agregarASeleccionados(r)}
                                disabled={r.cantidad <= 0 || precioNormalizado <= 0}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md ${
                                  r.cantidad > 0 && precioNormalizado > 0
                                    ? "bg-[#3498db] hover:bg-[#2980b9] text-white"
                                    : "bg-[#bdc3c7] text-[#7f8c8d] cursor-not-allowed"
                                }`}
                                title={
                                  r.cantidad <= 0 ? "Sin stock disponible" :
                                  precioNormalizado <= 0 ? "Precio no válido" :
                                  "Agregar al trabajo"
                                }
                              >
                                ➕ Agregar
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  eliminarDeSeleccionados(
                                    seleccionados.find((s) => s.id === r.id && s.fuente === r.fuente)?.timestamp
                                  )
                                }
                                className="text-[#e74c3c] hover:text-[#c0392b] font-medium transition-colors duration-200"
                              >
                                ❌ Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Repuestos seleccionados - Estilo GestiOne */}
          {seleccionados.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-[#27ae60] p-4 mb-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">✅</span>
                </div>
                Repuestos Seleccionados ({seleccionados.length})
                <div className="ml-auto bg-[#27ae60] text-white px-3 py-1 rounded-lg text-sm font-bold">
                  💰 Total: ${seleccionados.reduce((sum, r) => sum + normalizarPrecio(r), 0).toFixed(2)}
                </div>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Fuente</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Código</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Categoría</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Producto</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Modelo</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Marca</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">🎨 Color</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Precio</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seleccionados.map((r, index) => {
                      const isEven = index % 2 === 0;
                      const precioNormalizado = normalizarPrecio(r);
                      return (
                        <tr key={r.timestamp} className={`transition-all duration-200 ${isEven ? 'bg-white' : 'bg-green-50'}`}>
                          <td className="p-3 border border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{r.icono}</span>
                              <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${
                                r.fuente === 'stockExtra' ? 'bg-[#9b59b6]' : 'bg-[#3498db]'
                              }`}>
                                {r.descripcionFuente}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                              {r.codigo}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.categoria}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50]">{r.producto}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.modelo || '—'}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.marca || '—'}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{obtenerEmojiColor(r.color)}</span>
                              <span className="text-sm text-[#2c3e50]">{r.color || '—'}</span>
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#27ae60]">
                                ARS ${precioNormalizado.toFixed(2)}
                              </span>
                              {r.precioUSD && r.precioUSD > 0 && (
                                <span className="text-xs text-[#7f8c8d]">USD ${r.precioUSD}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border border-black text-center">
                            <button
                              onClick={() => eliminarDeSeleccionados(r.timestamp)}
                              className="text-[#e74c3c] hover:text-[#c0392b] font-medium transition-colors duration-200"
                            >
                              ❌ Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Repuestos ya usados - Estilo GestiOne */}
          {usadosPrevios.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 mb-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🔧</span>
                </div>
                Repuestos Ya Usados ({usadosPrevios.length})
                <div className="ml-auto bg-[#f39c12] text-white px-3 py-1 rounded-lg text-sm font-bold">
                  💰 Costo actual: ${usadosPrevios.reduce((sum, r) => sum + normalizarPrecio(r), 0).toFixed(2)}
                </div>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black">
                  <thead className="bg-gradient-to-r from-[#fdeaa7] to-[#f6d55c]">
                    <tr>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Fuente</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Código</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Categoría</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Producto</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Modelo</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Marca</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">🎨 Color</th>
                      <th className="p-3 text-left text-sm font-semibold text-[#2c3e50] border border-black">Precio</th>
                      <th className="p-3 text-center text-sm font-semibold text-[#2c3e50] border border-black">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usadosPrevios.map((r, index) => {
                      const isEven = index % 2 === 0;
                      const precioNormalizado = normalizarPrecio(r);
                      return (
                        <tr key={r.timestamp} className={`transition-all duration-200 ${isEven ? 'bg-white' : 'bg-orange-50'}`}>
                          <td className="p-3 border border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{r.icono || '📦'}</span>
                              <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${
                                r.fuente === 'stockExtra' ? 'bg-[#9b59b6]' : 'bg-[#3498db]'
                              }`}>
                                {r.descripcionFuente || 'Stock Local'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-mono text-[#7f8c8d] bg-[#ecf0f1] px-2 py-1 rounded">
                              {r.codigo}
                            </span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.categoria}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm font-medium text-[#2c3e50]">{r.producto}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.modelo || '—'}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <span className="text-sm text-[#2c3e50]">{r.marca || '—'}</span>
                          </td>
                          <td className="p-3 border border-black">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{obtenerEmojiColor(r.color)}</span>
                              <span className="text-sm text-[#2c3e50]">{r.color || '—'}</span>
                            </div>
                          </td>
                          <td className="p-3 border border-black">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#27ae60]">
                                ARS ${precioNormalizado.toFixed(2)}
                              </span>
                              {r.precioUSD && r.precioUSD > 0 && (
                                <span className="text-xs text-[#7f8c8d]">USD ${r.precioUSD}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 border border-black text-center">
                            <button
                              onClick={() => eliminarPrevio(r)}
                              className="text-[#e74c3c] hover:text-[#c0392b] font-medium transition-colors duration-200"
                            >
                              ❌ Eliminar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de acción - Estilo GestiOne */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-6 shadow-sm">
            <div className="flex justify-between items-center">
              <button 
                onClick={onClose} 
                className="px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={guardarTodos}
                disabled={seleccionados.length === 0 || actualizandoSheet}
                className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
                  seleccionados.length === 0 || actualizandoSheet
                    ? "bg-[#bdc3c7] cursor-not-allowed"
                    : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105"
                }`}
              >
                {actualizandoSheet ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>
                      Guardar {seleccionados.length > 0 && `(${seleccionados.length})`}
                      {seleccionados.length > 0 && ` - ${seleccionados.reduce((sum, r) => sum + normalizarPrecio(r), 0).toFixed(2)}`}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Información adicional sobre la sincronización */}
            {seleccionados.some(r => r.fuente === 'stockExtra') && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-[#9b59b6] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <p className="text-sm text-[#2c3e50]">
                    <strong>Sincronización automática:</strong> Al guardar, el Google Sheet se actualizará automáticamente con las nuevas cantidades.
                  </p>
                </div>
              </div>
            )}

            {/* Resumen de costos */}
            {(seleccionados.length > 0 || usadosPrevios.length > 0) && (
              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-[#27ae60] rounded-lg">
                <h4 className="font-bold text-[#2c3e50] mb-2">💰 Resumen de Costos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <span className="block text-xs text-[#7f8c8d]">Costo Actual</span>
                    <span className="block text-lg font-bold text-[#f39c12]">
                      ${usadosPrevios.reduce((sum, r) => sum + normalizarPrecio(r), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs text-[#7f8c8d]">Nuevos Repuestos</span>
                    <span className="block text-lg font-bold text-[#27ae60]">
                      ${seleccionados.reduce((sum, r) => sum + normalizarPrecio(r), 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xs text-[#7f8c8d]">Total Final</span>
                    <span className="block text-lg font-bold text-[#2c3e50]">
                      ${(
                        usadosPrevios.reduce((sum, r) => sum + normalizarPrecio(r), 0) +
                        seleccionados.reduce((sum, r) => sum + normalizarPrecio(r), 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                {cotizacion > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#27ae60] text-center">
                    <span className="text-xs text-[#7f8c8d]">
                      Cotización utilizada: <strong>${cotizacion.toFixed(0)} ARS/USD</strong> (sincronizada con Ventas General)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}