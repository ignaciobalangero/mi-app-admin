"use client";

interface ExtraData {
  codigo: string;
  proveedor?: string;
  precioCosto?: number;
  hoja?: string;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  precio1Pesos?: number;
  precio2Pesos?: number;
  precio3Pesos?: number;
}

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import AccionesProducto from "./AccionesProducto";
import PedidosSugeridos from "./PedidosSugeridos";

export default function TablaProductosSheet({
  sheetID,
  hoja,
  recarga,
  setRecarga,
  setProductosAPedir,
}: {
  sheetID: string;
  hoja: string;
  recarga: number;
  setRecarga: React.Dispatch<React.SetStateAction<number>>;
  setProductosAPedir: React.Dispatch<React.SetStateAction<any[]>>; 
}) {
  const [user] = useAuthState(auth);
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);
  const { rol } = useRol();
  const [filtroTexto, setFiltroTexto] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargandoActualizar, setCargandoActualizar] = useState(false);

  const actualizarPrecios = async () => {
    if (!rol?.negocioID || !sheetID || !hoja) return;
    setCargandoActualizar(true);
    setMensaje(null);

    try {
      let cotizacion = 1000;

      // Obtener cotización desde configuración manual
      const configSnap = await getDoc(
        doc(db, `negocios/${rol.negocioID}/configuracion/moneda`)
      );
      if (configSnap.exists()) {
        const data = configSnap.data();
        cotizacion = Number(data.dolarManual) || 1000;
      }

      // Obtener productos desde Firebase
      const snap = await getDocs(
        collection(db, `negocios/${rol.negocioID}/stockExtra`)
      );
      const productos = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Formar filas solo con los datos disponibles
      const filas = productos.map((p: any) => {
        const precioUSD = Number(p.precioUSD) || 0;
        const precioARS = Number((precioUSD * cotizacion).toFixed(2));

        return {
          codigo: p.id,
          categoria: p.categoria || "",
          producto: p.producto || "",
          cantidad: p.cantidad || "",
          precioARS,
          precioUSD,
        };
      });

      // Enviar a la API
      const res = await fetch("/api/actualizar-precios-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetID, hoja, filas }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");

      setMensaje("✅ Precios actualizados en el Sheet correctamente");
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      console.error("❌ Error actualizando precios en el Sheet:", err);
      setMensaje("❌ Hubo un problema al actualizar los precios en el Sheet");
      
      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => setMensaje(null), 5000);
    } finally {
      setCargandoActualizar(false);
    }
  };

  const cotizacionFinal = usarDolarManual && dolarManual ? dolarManual : cotizacion || 0;

  useEffect(() => {
    const obtenerConfiguracion = async () => {
      if (!rol?.negocioID) return;
      try {
        const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/moneda`);
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          const data = snap.data();
          setUsarDolarManual(data.usarDolarManual ?? false);
          setDolarManual(data.dolarManual ?? null);
        }
      } catch (err) {
        console.error("❌ Error leyendo configuración de moneda:", err);
      }
    };
    obtenerConfiguracion();
  }, [rol?.negocioID]);

  useEffect(() => {
    if (!usarDolarManual) {
      setCotizacion(1000);
    }
  }, [usarDolarManual]);

  const guardarConfiguracion = async (nuevoValor: boolean, nuevoDolar: number | null) => {
    if (!rol?.negocioID) return;
    try {
      const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/moneda`);
      await setDoc(configRef, {
        usarDolarManual: nuevoValor,
        dolarManual: nuevoDolar,
      });
    } catch (err) {
      console.error("❌ Error guardando configuración de moneda:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!sheetID || !rol?.negocioID) return;
      setCargando(true);
      try {
        const res = await fetch("/api/leer-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheetID, hoja, negocioID: rol.negocioID }),
        });
        const sheetRes = await res.json();
        const sheetData = sheetRes.datos || [];

        const extraSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));
        const firestoreData: ExtraData[] = extraSnap.docs
         .map((doc) => {
       const data = doc.data() as ExtraData;
       return { codigo: doc.id, ...data };
       })
        .filter((prod) => prod.hoja === hoja);

        const codigosSheet = sheetData.map((p: any) => p.codigo);
        const combinados = sheetData.map((producto: any) => {
          const extra = firestoreData.find((e: any) => e.codigo === producto.codigo);

          const precioUSD = Number(extra?.precio1) || Number(producto.precio1) || 0;
          const precioARS = Number(extra?.precio1Pesos) || 0;
          const precioCosto = Number(extra?.precioCosto) || 0;
          const ganancia = precioUSD - precioCosto;          

          return {
            ...producto,
            ...extra,
            precioARS,
            ganancia,
          };
        });

        const soloFirestore = firestoreData
          .filter((p: any) => !codigosSheet.includes(p.codigo))
          .map((p: any) => {
            const precioUSD = Number(p.precioUSD) || 0;
            const precioCosto = Number(p.precioCosto) || 0;
            const ganancia = precioUSD - precioCosto;
            const precioARSCalculado = Math.round(precioUSD * cotizacionFinal);

            return {
              ...p,
              precioARS: precioARSCalculado,
              ganancia,
            };
          });

          const resultadoFinal = [...combinados, ...soloFirestore];
          resultadoFinal.sort((a, b) => a.codigo.localeCompare(b.codigo));
           setDatos(resultadoFinal);
           
const sugerencias = resultadoFinal.filter((p) => {
  return typeof p.stockIdeal === "number" &&
         typeof p.cantidad === "number" &&
         p.stockIdeal > p.cantidad;
});
setProductosAPedir(sugerencias);
          
      } catch (err) {
        console.error("❌ Error cargando datos:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchData();
  }, [sheetID, hoja, recarga, rol?.negocioID, cotizacionFinal, dolarManual]);

  const totalCosto = datos.reduce((acc, fila) => {
    if (typeof fila.precioCosto === "number" && typeof fila.cantidad === "number") {
      return acc + fila.precioCosto * fila.cantidad;
    }
    return acc;
  }, 0);

  const datosFiltrados = datos.filter((fila) =>
    fila.producto?.toLowerCase().includes(filtroTexto.toLowerCase())
  );
  
  return (
    <div className="space-y-4 lg:space-y-6">
      
      {/* Header de controles */}
      <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          
          {/* Cotización USD */}
          <div className="w-full lg:w-auto lg:min-w-[200px]">
            <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
              Cotización USD:
            </label>
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#f8f9fa] to-[#ecf0f1] px-3 py-2 rounded-lg border-2 border-[#f39c12]">
              <span className="text-sm font-medium text-[#2c3e50]">$</span>
              <input
                type="number"
                value={dolarManual ?? ""}
                onChange={(e) => {
                  const nuevoValor = Number(e.target.value);
                  setDolarManual(nuevoValor);
                  guardarConfiguracion(true, nuevoValor);
                }}
                placeholder="Ej: 1100"
                className="flex-1 px-2 py-1 border-2 border-[#f39c12] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] text-center font-medium text-sm text-[#2c3e50] min-w-0"
              />
              <div className="text-xs text-[#f39c12] whitespace-nowrap">
                <div className="font-medium">ARS</div>
              </div>
            </div>
          </div>

          {/* Botón Actualizar Precios */}
          <div className="w-full lg:w-auto">
            <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#9b59b6] rounded-full flex items-center justify-center text-white text-xs">🔄</span>
              Sincronizar:
            </label>
            <button
              onClick={actualizarPrecios}
              disabled={cargandoActualizar}
              className={`w-full bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] hover:from-[#8e44ad] hover:to-[#7d3c98] text-white py-2 sm:py-3 px-3 lg:px-4 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2 text-xs lg:text-sm ${
                cargandoActualizar ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {cargandoActualizar ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Actualizando...</span>
                </>
              ) : (
                <>
                  <span className="text-sm lg:text-base">🔄</span>
                  <span>Actualizar Sheet</span>
                </>
              )}
            </button>
          </div>
          {/* Buscador */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">🔍</span>
              Buscar producto:
            </label>
            <input
              type="text"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="🔍 Filtrar por producto..."
              className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
            />
          </div>

          {/* Total de costo */}
          <div className="w-full lg:w-auto lg:min-w-[200px]">
            <label className="text-xs font-semibold text-[#2c3e50] block mb-2 flex items-center gap-2">
              <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">💎</span>
              Total invertido:
            </label>
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white px-3 py-2 sm:py-3 rounded-lg shadow-md">
              <div className="text-center">
                <p className="text-xs font-medium opacity-90">Costo total</p>
                <p className="text-sm sm:text-lg font-bold">${totalCosto.toLocaleString("es-AR")}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mensaje de estado del botón actualizar */}
        {mensaje && (
          <div className={`mt-4 p-3 rounded-lg border-2 text-center font-medium text-sm transform transition-all duration-300 ${
            mensaje.includes("✅") 
              ? "bg-green-50 border-[#27ae60] text-[#27ae60] animate-pulse"
              : "bg-red-50 border-[#e74c3c] text-[#e74c3c]"
          }`}>
            <div className="flex items-center justify-center gap-2">
              {mensaje.includes("✅") ? (
                <div className="w-5 h-5 bg-[#27ae60] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              ) : (
                <div className="w-5 h-5 bg-[#e74c3c] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">!</span>
                </div>
              )}
              <span>{mensaje}</span>
            </div>
          </div>
        )}
      </div>

      {/* Estado de carga */}
      {cargando ? (
        <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-8 lg:p-12">
          <div className="text-center">
            <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#3498db] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-3xl lg:text-4xl text-white">📊</span>
            </div>
            <h3 className="text-lg lg:text-xl font-bold text-[#2c3e50] mb-2">Sincronizando inventario...</h3>
            <p className="text-[#7f8c8d] text-sm lg:text-base">
              Obteniendo datos desde Google Sheets
            </p>
            <div className="mt-4 w-32 h-2 bg-[#ecf0f1] rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : (
        /* Tabla responsive */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#ecf0f1]">
          
          {/* Header de la tabla */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-lg sm:text-2xl">📋</span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold">Productos del Inventario</h3>
                <p className="text-gray-200 text-xs sm:text-sm">
                  {datosFiltrados.length} {datosFiltrados.length === 1 ? 'producto' : 'productos'} encontrados
                </p>
              </div>
            </div>
          </div>

          {/* Tabla sin scroll horizontal - Responsive */}
          <div className="border border-[#bdc3c7]">
            <table className="w-full border-collapse">
              <thead className="bg-[#ecf0f1]">
                <tr>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[10%]">
                    <span className="hidden sm:inline">🏷️ </span>Código
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[8%]">
                    <span className="hidden sm:inline">📂 </span>Cat.
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-left text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    <span className="hidden sm:inline">📱 </span>Producto
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[6%]">
                    <span className="hidden sm:inline">📦 </span>Cant.
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[9%]">
                    <span className="hidden sm:inline">💰 </span>ARS
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[8%]">
                    <span className="hidden sm:inline">💵 </span>USD
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[10%] hidden lg:table-cell">
                    💸 Costo
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] hidden lg:table-cell">
                    🏭 Proveedor
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[10%] hidden lg:table-cell">
                    📈 Ganancia
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[12%] hidden lg:table-cell">
                    💎 Total costo
                  </th>
                  <th className="p-1 sm:p-2 lg:p-3 text-center text-xs sm:text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7] w-[10%]">
                    <span className="hidden sm:inline">⚙️ </span>Acc.
                  </th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 sm:p-12 text-center text-[#7f8c8d] border border-[#bdc3c7]">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                          <span className="text-2xl sm:text-3xl">📋</span>
                        </div>
                        <div>
                          <p className="text-sm sm:text-lg font-medium text-[#7f8c8d]">
                            {datos.length === 0 ? "No hay productos registrados" : "No se encontraron resultados"}
                          </p>
                          <p className="text-xs sm:text-sm text-[#bdc3c7]">
                            {datos.length === 0 
                              ? "Los productos aparecerán aquí una vez sincronizados"
                              : "Intenta ajustar el filtro de búsqueda"
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  datosFiltrados.map((fila, i) => {
                    const stockBajo = fila.cantidad <= 5;
                    const sinStock = fila.cantidad <= 0;
                    const gananciaPositiva = fila.ganancia > 0;
                    
                    return (
                      <tr
                        key={i}
                        className={`transition-colors duration-200 hover:bg-[#ecf0f1] border border-[#bdc3c7] ${
                          sinStock 
                            ? "bg-red-50" 
                            : stockBajo 
                            ? "bg-yellow-50" 
                            : "bg-white"
                        }`}
                      >
                        {/* Código */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                          <span className="inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                            {fila.codigo || "—"}
                          </span>
                        </td>
                        
                        {/* Categoría */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                          <span className="text-xs text-[#7f8c8d] truncate block">
                            {fila.categoria || "—"}
                          </span>
                        </td>
                        
                        {/* Producto */}
                        <td className="p-1 sm:p-2 lg:p-3 border border-[#bdc3c7]">
                          <div className="text-xs sm:text-sm text-[#2c3e50]">
                            <div className="font-semibold truncate">
                              {fila.producto || "Sin nombre"}
                            </div>
                            <div className="text-xs text-[#7f8c8d] lg:hidden mt-1">
                              Costo: ${typeof fila.precioCosto === "number" ? fila.precioCosto.toLocaleString("es-AR") : "—"} | 
                              Prov: {fila.proveedor || "—"}
                            </div>
                          </div>
                        </td>
                        
                        {/* Cantidad */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                          <span className={`inline-flex items-center px-1 sm:px-2 py-1 rounded-full text-xs font-bold ${
                            sinStock 
                              ? "bg-[#e74c3c] text-white"
                              : stockBajo
                              ? "bg-[#f39c12] text-white" 
                              : "bg-[#27ae60] text-white"
                          }`}>
                            {fila.cantidad || 0}
                          </span>
                        </td>
                        
                        {/* Precio ARS */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                          <span className="text-xs sm:text-sm font-bold text-[#27ae60]">
                            ${typeof fila.precioARS === "number" ? fila.precioARS.toLocaleString("es-AR") : "—"}
                          </span>
                        </td>
                        
                        {/* Precio USD */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                          <span className="text-xs sm:text-sm font-bold text-[#3498db]">
                            ${typeof fila.precio1 === "number" ? fila.precio1.toLocaleString("es-AR") : "—"}
                          </span>
                        </td>
                        
                        {/* Precio Costo - Solo desktop */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                          <span className="text-sm font-medium text-[#e74c3c]">
                            ${typeof fila.precioCosto === "number" ? fila.precioCosto.toLocaleString("es-AR") : "—"}
                          </span>
                        </td>
                        
                        {/* Proveedor - Solo desktop */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                          <span className="text-sm text-[#7f8c8d] truncate block">
                            {fila.proveedor || "—"}
                          </span>
                        </td>
                        
                        {/* Ganancia - Solo desktop */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                          <span className={`text-sm font-bold ${gananciaPositiva ? "text-[#27ae60]" : "text-[#e74c3c]"}`}>
                            ${typeof fila.ganancia === "number" ? fila.ganancia.toFixed(2) : "—"}
                          </span>
                        </td>
                        
                        {/* Total costo - Solo desktop */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7] hidden lg:table-cell">
                          <span className="text-sm font-bold text-[#f39c12]">
                            ${typeof fila.precioCosto === "number" && typeof fila.cantidad === "number"
                              ? (fila.precioCosto * fila.cantidad).toLocaleString("es-AR")
                              : "—"}
                          </span>
                        </td>
                        
                        {/* Acciones */}
                        <td className="p-1 sm:p-2 lg:p-3 text-center border border-[#bdc3c7]">
                          <AccionesProducto
                            producto={fila}
                            sheetID={sheetID}
                            hoja={hoja}
                            onRecargar={() => setRecarga((prev) => prev + 1)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer de la tabla */}
          {datosFiltrados.length > 0 && (
            <div className="bg-[#f8f9fa] px-3 sm:px-6 py-3 sm:py-4 border-t border-[#bdc3c7]">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4 text-xs sm:text-sm text-[#7f8c8d]">
                <span>
                  Mostrando {datosFiltrados.length} de {datos.length} {datos.length === 1 ? 'producto' : 'productos'}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
                  <span>
                    Con stock: <strong className="text-[#27ae60]">
                      {datosFiltrados.filter(item => item.cantidad > 0).length}
                    </strong>
                  </span>
                  <span>
                    Valor inventario: <strong className="text-[#3498db]">
                      ${datosFiltrados.reduce((sum, item) => {
                        const precio = item.precioARS || 0;
                        const cantidad = item.cantidad || 0;
                        return sum + (precio * cantidad);
                      }, 0).toLocaleString("es-AR")}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}