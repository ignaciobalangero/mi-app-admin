"use client";

import { useEffect, useState } from "react";
import Header from "../../Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRol } from "@/lib/useRol";

const FormularioStock = dynamic(() => import("./components/FormularioStock"), { ssr: false });
const TablaStockTelefonos = dynamic(() => import("./components/TablaStockTelefonos"), { ssr: false });

export default function StockTelefonosPage() {
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState("");
  const [telefonos, setTelefonos] = useState<any[]>([]);
  const [telefonoAEditar, setTelefonoAEditar] = useState<any | null>(null);
  const [resumen, setResumen] = useState({ 
    usd: 0, 
    ars: 0,
    mayoristaUSD: 0,
    mayoristaARS: 0
  });
  const { rol } = useRol();

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);
  
  useEffect(() => {
    const cargarStock = async () => {
      if (!negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const lista = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTelefonos(lista);
    };
    cargarStock();
  }, [negocioID]);

  useEffect(() => {
    const calcularResumen = () => {
      let totalUSD = 0;
      let totalARS = 0;
      let mayoristaUSD = 0;
      let mayoristaARS = 0;
      
      telefonos.forEach((d) => {
        const valorCompra = Number(d.precioCompra) || 0;
        const valorMayorista = Number(d.precioMayorista) || 0;
        
        if (d.moneda === "USD") {
          totalUSD += valorCompra;
          mayoristaUSD += valorMayorista;
        } else {
          totalARS += valorCompra;
          mayoristaARS += valorMayorista;
        }
      });
      
      setResumen({ 
        usd: totalUSD, 
        ars: totalARS,
        mayoristaUSD,
        mayoristaARS
      });
    };
    
    calcularResumen();
  }, [telefonos]);

  const formatearPrecio = (precio: number) => {
    return precio ? `$${Number(precio).toLocaleString("es-AR")}` : "$0";
  };

  // Calcular estadísticas adicionales
  const estadisticas = {
    total: telefonos.length,
    nuevos: telefonos.filter(t => t.estado?.toLowerCase() === 'nuevo').length,
    usados: telefonos.filter(t => t.estado?.toLowerCase() === 'usado').length,
    reparacion: telefonos.filter(t => t.estado?.toLowerCase() === 'reparacion').length,
  };

  return (
    <>
      <Header />
      <main className="pt-20 pb-10 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto space-y-8">
          
          {/* Header principal */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-8 py-4 shadow-lg border border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Stock de Teléfonos
                </h1>
                <p className="text-gray-600">Gestión completa de inventario</p>
              </div>
            </div>
          </div>

          {/* Tarjetas de resumen financiero */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {/* Total Dólares */}
            {rol?.tipo === "admin" && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total USD</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatearPrecio(resumen.usd)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🇺🇸</span>
                </div>
              </div>
            </div>
            )}
           
            {/* Total Pesos */}
            {rol?.tipo === "admin" && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total ARS</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatearPrecio(resumen.ars)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🇦🇷</span>
                </div>
              </div>
            </div>
            )}

            {/* Cantidad total */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Equipos</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {estadisticas.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📱</span>
                </div>
              </div>
            </div>

            {/* Estados distribuidos */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transform transition-all duration-300 hover:scale-105">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Por Estado</p>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-600">✓ Nuevos</span>
                    <span className="text-sm font-semibold text-green-700">{estadisticas.nuevos}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600">⚡ Usados</span>
                    <span className="text-sm font-semibold text-blue-700">{estadisticas.usados}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-yellow-600">🔧 Reparación</span>
                    <span className="text-sm font-semibold text-yellow-700">{estadisticas.reparacion}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Mayorista USD */}
            {rol?.tipo === "admin" && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transform transition-all duration-300 hover:scale-105">
           
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mayorista USD</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatearPrecio(resumen.mayoristaUSD)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏪</span>
                </div>
              </div>
            </div>
            )}

            {/* Total Mayorista ARS */}
            {rol?.tipo === "admin" && (
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200 transform transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mayorista ARS</p>
                  <p className="text-2xl font-bold text-cyan-700">
                    {formatearPrecio(resumen.mayoristaARS)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🏪</span>
                </div>
              </div>
            </div>
            )}
          </div>

          {negocioID && (
            <>
              {/* Sección del formulario */}
              <div className="flex justify-center">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-xl w-full">
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      {telefonoAEditar ? "✏️ Editar Teléfono" : "➕ Agregar Nuevo Teléfono"}
                    </h2>
                    <p className="text-indigo-100 mt-1 text-sm">
                      {telefonoAEditar 
                        ? "Modifica los datos del teléfono seleccionado"
                        : ""
                      }
                    </p>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-br from-gray-50 to-indigo-50">
                  <FormularioStock
                    negocioID={negocioID}
                    datosIniciales={telefonoAEditar}
                    onGuardado={(telefonoActualizado) => {
                      setTelefonoAEditar(null);
                      setTelefonos((prev) => {
                        const index = prev.findIndex((t) => t.id === telefonoActualizado.id);
                        if (index !== -1) {
                          const copia = [...prev];
                          copia[index] = telefonoActualizado;
                          return copia;
                        } else {
                          return [telefonoActualizado, ...prev];
                        }
                      });
                    }}
                  />
                    
                    {/* Botón para cancelar edición */}
                    {telefonoAEditar && (
                      <div className="mt-4 flex justify-center">
                        <button
                          onClick={() => setTelefonoAEditar(null)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm"
                        >
                          ❌ Cancelar Edición
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de la tabla */}
              <div>
                <TablaStockTelefonos
                  negocioID={negocioID}
                  filtroProveedor
                  telefonos={telefonos}
                  setTelefonos={setTelefonos}
                  onEditar={(telefono) => setTelefonoAEditar(telefono)}
                />
              </div>
            </>
          )}

          {/* Footer con información adicional */}
          
          {negocioID && telefonos.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              {rol?.tipo === "admin" && (
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">📊 Resumen del Inventario</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
                    <p className="text-green-700 font-medium">Valor total de compra</p>
                    <p className="text-xl font-bold text-green-800">
                      USD {formatearPrecio(resumen.usd)} + ARS {formatearPrecio(resumen.ars)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4">
                    <p className="text-orange-700 font-medium">Valor total mayorista</p>
                    <p className="text-xl font-bold text-orange-800">
                      USD {formatearPrecio(resumen.mayoristaUSD)} + ARS {formatearPrecio(resumen.mayoristaARS)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                    <p className="text-blue-700 font-medium">Promedio por equipo</p>
                    <p className="text-xl font-bold text-blue-800">
                      {estadisticas.total > 0 
                        ? formatearPrecio((resumen.usd + resumen.ars) / estadisticas.total)
                        : "$0"}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                    <p className="text-purple-700 font-medium">Equipos disponibles</p>
                    <p className="text-xl font-bold text-purple-800">
                      {estadisticas.total} unidades
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>          
          )}       
        </div>
      </main>
    </>
  );
}