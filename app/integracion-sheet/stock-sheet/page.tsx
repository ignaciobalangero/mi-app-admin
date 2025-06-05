"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import FormularioAgregarProducto from "../components/FormularioAgregarProducto";
import TablaProductosSheet from "../components/TablaProductosSheet";
import BotonImportarStock from "../components/BotonImportarStock";
import BotonActualizarPreciosSheet from "../components/BotonActualizarPreciosSheet";
import { useRol } from "@/lib/useRol";
import PedidosSugeridos from "../components/PedidosSugeridos";
import { exportarPedidosAExcel } from "../components/exportarPedidos";

export default function StockSheetPage() {
  const [user] = useAuthState(auth);
  const { rol } = useRol();
  const [sheetID, setSheetID] = useState<string | null>(null);
  const [nombreHoja, setNombreHoja] = useState<string>("");
  const [hojasVinculadas, setHojasVinculadas] = useState<{ hoja: string; id: string }[]>([]);
  const [recarga, setRecarga] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarPedidos, setMostrarPedidos] = useState(false);
  const [productosAPedir, setProductosAPedir] = useState<any[]>([]);

  useEffect(() => {
    const obtenerDatos = async () => {
      if (!user) return;

      const snap = await getDoc(doc(db, "usuarios", user.uid));
      const negocioID = snap.exists() ? snap.data().negocioID : null;
      if (!negocioID) return;

      const configSnap = await getDoc(doc(db, `negocios/${negocioID}/configuracion/datos`));
      const configData = configSnap.exists() ? configSnap.data() : {};
      const hojas = configData.googleSheets || [];

      setHojasVinculadas(hojas);
      if (hojas.length > 0) {
        setSheetID(hojas[0].id);
        setNombreHoja(hojas[0].hoja);
      }
    };

    obtenerDatos();
  }, [user]);

  return (
    <main className="pt-24 px-2 sm:px-4 lg:px-6 bg-gradient-to-br from-[#f8f9fa] to-[#ecf0f1] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Principal */}
        <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl lg:text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-[#2c3e50]">Stock desde Google Sheets</h1>
                <p className="text-sm lg:text-base text-[#7f8c8d]">Gestión integrada de inventario</p>
              </div>
            </div>

            {/* Botones de acción principales */}
            <div className="flex flex-wrap gap-2 lg:gap-3">
              <button
                className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white py-2 px-3 lg:px-4 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2"
                onClick={() => exportarPedidosAExcel(productosAPedir)}
              >
                <span className="text-sm lg:text-base">📤</span>
                <span className="hidden sm:inline">Exportar pedidos</span>
                <span className="sm:hidden">Export</span>
              </button>
              
              <button
                className={`py-2 px-3 lg:px-4 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 ${
                  mostrarPedidos 
                    ? "bg-gradient-to-r from-[#f39c12] to-[#e67e22] hover:from-[#e67e22] hover:to-[#d35400] text-white"
                    : "bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#1f618d] text-white"
                }`}
                onClick={() => setMostrarPedidos((prev) => !prev)}
              >
                <span className="text-sm lg:text-base">{mostrarPedidos ? "📋" : "👁️"}</span>
                <span className="hidden sm:inline">{mostrarPedidos ? "Ocultar pedidos" : "Mostrar pedidos"}</span>
                <span className="sm:hidden">{mostrarPedidos ? "Ocultar" : "Ver"}</span>
              </button>
              
              <button
                className={`py-2 px-3 lg:px-4 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 ${
                  mostrarFormulario 
                    ? "bg-gradient-to-r from-[#e74c3c] to-[#c0392b] hover:from-[#c0392b] hover:to-[#a93226] text-white"
                    : "bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#1f618d] text-white"
                }`}
                onClick={() => setMostrarFormulario((prev) => !prev)}
              >
                <span className="text-sm lg:text-base">{mostrarFormulario ? "📝" : "➕"}</span>
                <span className="hidden sm:inline">{mostrarFormulario ? "Ocultar formulario" : "Mostrar formulario"}</span>
                <span className="sm:hidden">{mostrarFormulario ? "Form" : "Add"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Estado de conexión */}
        {hojasVinculadas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-6 lg:p-8">
            <div className="text-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl lg:text-4xl">⚠️</span>
              </div>
              <h3 className="text-lg lg:text-xl font-bold text-[#e74c3c] mb-2">Sin hojas vinculadas</h3>
              <p className="text-[#7f8c8d] text-sm lg:text-base mb-4">
                Para comenzar a gestionar tu stock, necesitas vincular una hoja de Google Sheets
              </p>
              <div className="bg-red-50 border-2 border-[#e74c3c] rounded-lg p-4 max-w-md mx-auto">
                <p className="text-[#e74c3c] font-medium text-sm">
                  💡 Ve a "Configuraciones" para agregar tus hojas de Google Sheets
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Selector de hoja y estado de conexión */}
            <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
                
                {/* Selector de hoja */}
                <div className="flex-1 w-full lg:w-auto">
                  <label className="block mb-2 text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                    <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📋</span>
                    Hoja activa:
                  </label>
                  <select
                    value={nombreHoja}
                    onChange={(e) => {
                      const seleccionada = hojasVinculadas.find((h) => h.hoja === e.target.value);
                      if (seleccionada) {
                        setSheetID(seleccionada.id);
                        setNombreHoja(seleccionada.hoja);
                      }
                    }}
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] font-medium"
                  >
                    {hojasVinculadas.map((h, i) => (
                      <option key={i} value={h.hoja}>
                        {h.hoja}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado de conexión */}
                <div className="flex-1 w-full lg:w-auto">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-[#27ae60] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-[#27ae60] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✅</span>
                      </div>
                      <div>
                        <p className="text-[#27ae60] font-bold text-sm">Conectado exitosamente</p>
                        <p className="text-[#2c3e50] font-semibold text-sm">Hoja: {nombreHoja}</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-[#27ae60]/20">
                      <p className="text-xs text-[#7f8c8d] break-all font-mono">
                        ID: {sheetID}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón completar códigos */}
                <div className="w-full lg:w-auto">
                  <button
                    onClick={async () => {
                      const confirmar = confirm(`¿Completar códigos faltantes en la hoja "${nombreHoja}"?`);
                      if (!confirmar) return;
                      try {
                        const res = await fetch("/api/completar-codigos", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sheetID, hoja: nombreHoja, negocioID: rol?.negocioID }),
                        });

                        const json = await res.json();
                        if (json.ok) {
                          alert("✅ Códigos completados correctamente.");
                          setRecarga((prev) => prev + 1);
                        } else {
                          throw new Error(json.error);
                        }
                      } catch (err) {
                        console.error("Error al completar códigos:", err);
                        alert("❌ Error al completar códigos.");
                      }
                    }}
                    className="w-full bg-gradient-to-r from-[#f39c12] to-[#e67e22] hover:from-[#e67e22] hover:to-[#d35400] text-white py-3 px-4 lg:px-6 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">🧩</span>
                    <span className="text-sm lg:text-base">Completar códigos</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Formulario de agregar producto */}
            {mostrarFormulario && (
              <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] overflow-hidden">
                <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white p-4 lg:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">➕</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Agregar Producto</h3>
                      <p className="text-blue-100 text-sm">Añadir nuevo producto al inventario</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 lg:p-6">
                  <FormularioAgregarProducto
                    sheetID={sheetID!}
                    hoja={nombreHoja}
                    onProductoAgregado={() => setRecarga((prev) => prev + 1)}
                  />
                </div>
              </div>
            )}

            {/* Pedidos sugeridos */}
            {mostrarPedidos && (
              <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] overflow-hidden">
                <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white p-4 lg:p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-xl">📋</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Pedidos Sugeridos</h3>
                      <p className="text-orange-100 text-sm">Productos recomendados para reposición</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 lg:p-6">
                  <PedidosSugeridos productosAPedir={productosAPedir} />
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* Tabla de productos - ANCHO TOTAL DE PANTALLA */}
      {hojasVinculadas.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-[#ecf0f1] overflow-hidden mx-2 sm:mx-4 lg:mx-6">
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#34495e] text-white p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Inventario Completo</h3>
                <p className="text-gray-200 text-sm">Gestión y control de productos</p>
              </div>
            </div>
          </div>
          <div className="p-0">
            <TablaProductosSheet
              sheetID={sheetID!}
              hoja={nombreHoja}
              recarga={recarga}
              setRecarga={setRecarga}
              setProductosAPedir={setProductosAPedir}
            />
          </div>
        </div>
      )}
    </main>
  );
}