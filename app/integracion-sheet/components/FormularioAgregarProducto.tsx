"use client";

import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { useRol } from "@/lib/useRol";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function FormularioAgregarProducto({
  sheetID,
  hoja,
  onProductoAgregado,
}: {
  sheetID: string;
  hoja: string;
  onProductoAgregado?: () => void;
}) {
  const [categoria, setCategoria] = useState("");
  const [modelo, setModelo] = useState("");
  const [stock, setStock] = useState("");
  const [precioUSD, setPrecioUSD] = useState("");
  const [costo, setCosto] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [mostrar, setMostrar] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [stockMinimo, setStockMinimo] = useState<number>(0);
  const [stockIdeal, setStockIdeal] = useState<number>(0);
  const { rol } = useRol();
  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);
  const [cotizacion, setCotizacion] = useState<number>(1000);
  const [precio1, setPrecio1] = useState("");
  const [precio2, setPrecio2] = useState("");
  const [precio3, setPrecio3] = useState("");
  const [cargando, setCargando] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    if (!sheetID || !modelo.trim() || !categoria.trim()) {
      setMensaje("⚠️ Completá categoría y modelo.");
      setCargando(false);
      return;
    }

    const cantidad = Number(stock);
    const precioUSDNum = Number(precioUSD);
    const costoNum = Number(costo);

    if (isNaN(cantidad) || cantidad < 0) {
      setMensaje("⚠️ El stock debe ser un número válido.");
      setCargando(false);
      return;
    }

    const letra = categoria.trim().charAt(0).toUpperCase();
    const numero = Math.floor(1000 + Math.random() * 9000);
    const codigo = `${letra}-${numero}`;
    const cotizacionFinal = usarDolarManual && dolarManual ? dolarManual : cotizacion || 0;
  
    const precio1Num = Number(precio1);
    const precio2Num = Number(precio2);
    const precio3Num = Number(precio3);
  
    const precio1Pesos = Math.round(precio1Num * cotizacionFinal);
    const precio2Pesos = Math.round(precio2Num * cotizacionFinal);
    const precio3Pesos = Math.round(precio3Num * cotizacionFinal);
    const precioCostoPesos = Math.round(costoNum * cotizacionFinal);
    
    const nuevoProducto = {
      codigo,
      categoria,
      modelo,
      cantidad,
      precio: Number(precio1) * cotizacionFinal,
      precioUSD: Number(precio1),
      cotizacion: cotizacionFinal,
      precioCosto: costoNum,
      precioCostoPesos,
      proveedor: proveedor.trim(),
      negocioID: String(rol?.negocioID || ""),
      mostrar: mostrar ? "si" : "no",
      stockMinimo,
      stockIdeal,
      precio1: precio1Num,
      precio2: precio2Num,
      precio3: precio3Num,
      precio1Pesos,
      precio2Pesos,
      precio3Pesos,
    };    

    try {
      const res = await fetch("/api/agregar-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetID,
          hoja,
          producto: nuevoProducto,
          negocioID: rol?.negocioID,
        }),
      });      

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error desconocido");

      const extraData = {
        codigo,
        precioCosto: costoNum,
        precioCostoPesos,
        proveedor: proveedor.trim(),
        negocioID: String(rol?.negocioID || ""),
        precio1: precio1Num,
        precio2: precio2Num,
        precio3: precio3Num,
        precio1Pesos,
        precio2Pesos,
        precio3Pesos,
      };      

      console.log("📦 Enviando a /api/stock-extra:", extraData);

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken();
        await setDoc(doc(db, `negocios/${rol.negocioID}/stockExtra/${codigo}`), {
          codigo,
          categoria,
          modelo,
          cantidad,
          precioUSD: Number(precio1),
          cotizacion: cotizacionFinal,
          precioCosto: costoNum,
          precioCostoPesos,
          proveedor: proveedor.trim(),
          negocioID: rol.negocioID,
          hoja,
          precio1: precio1Num,
          precio2: precio2Num,
          precio3: precio3Num,
          precio1Pesos,
          precio2Pesos,
          precio3Pesos,
        });        
      }

      setMensaje("✅ Modelo agregado correctamente");
      if (onProductoAgregado) onProductoAgregado();

      // Limpiar formulario
      setCategoria("");
      setModelo("");
      setStock("");
      setPrecioUSD("");
      setCosto("");
      setProveedor("");
      setPrecio1("");
      setPrecio2("");
      setPrecio3("");
      setStockMinimo(0);
      setStockIdeal(0);
      setMostrar(true);
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      setMensaje("❌ Error inesperado al guardar. Revisá consola.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-white max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
        
        {/* Información básica del modelo */}
        <div className="space-y-4">
          <h3 className="text-sm lg:text-base font-semibold text-[#2c3e50] flex items-center gap-2 border-b border-[#ecf0f1] pb-2">
            <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📦</span>
            Información del Modelo
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                Categoría *
              </label>
              <input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej: Módulos, Baterías, Cables..."
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                Nombre del Modelo *
              </label>
              <input
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Descripción detallada del modelo"
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                Stock Inicial
              </label>
              <input
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                type="number"
                min="0"
                placeholder="0"
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                Stock Mínimo
              </label>
              <input
                type="number"
                min="0"
                value={stockMinimo === 0 ? "" : stockMinimo}
                onChange={(e) => setStockMinimo(Number(e.target.value))}
                placeholder="0"
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                Stock Ideal
              </label>
              <input
                type="number"
                min="0"
                value={stockIdeal === 0 ? "" : stockIdeal}
                onChange={(e) => setStockIdeal(Number(e.target.value))}
                placeholder="0"
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Precios */}
        <div className="space-y-4">
          <h3 className="text-sm lg:text-base font-semibold text-[#2c3e50] flex items-center gap-2 border-b border-[#ecf0f1] pb-2">
            <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">💰</span>
            Precios y Costos
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#e74c3c] block mb-2">
                💸 Precio de Costo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e74c3c] font-medium text-sm">$</span>
                <input
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#e74c3c] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3498db] block mb-2">
                💵 Precio 1 (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3498db] font-medium text-sm">$</span>
                <input
                  value={precio1}
                  onChange={(e) => setPrecio1(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#3498db] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#9b59b6] block mb-2">
                💎 Precio 2 (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9b59b6] font-medium text-sm">$</span>
                <input
                  value={precio2}
                  onChange={(e) => setPrecio2(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#9b59b6] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#e67e22] block mb-2">
                🏆 Precio 3 (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#e67e22] font-medium text-sm">$</span>
                <input
                  value={precio3}
                  onChange={(e) => setPrecio3(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-6 pr-3 py-2 sm:py-3 border-2 border-[#e67e22] rounded-lg bg-white focus:ring-2 focus:ring-[#e67e22] focus:border-[#e67e22] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="space-y-4">
          <h3 className="text-sm lg:text-base font-semibold text-[#2c3e50] flex items-center gap-2 border-b border-[#ecf0f1] pb-2">
            <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">🏭</span>
            Información Adicional
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#2c3e50] block mb-2">
                Proveedor
              </label>
              <input
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                placeholder="Nombre del proveedor o distribuidor"
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 bg-gradient-to-r from-[#ecf0f1] to-[#f8f9fa] p-3 rounded-lg border-2 border-[#bdc3c7] cursor-pointer hover:from-[#d5dbdb] hover:to-[#ecf0f1] transition-all">
                <input
                  type="checkbox"
                  checked={mostrar}
                  onChange={() => setMostrar(!mostrar)}
                  className="w-4 h-4 text-[#27ae60] bg-white border-2 border-[#bdc3c7] rounded focus:ring-[#27ae60] focus:ring-2"
                />
                <div>
                  <span className="text-sm font-semibold text-[#2c3e50]">👁️ Mostrar al cliente</span>
                  <p className="text-xs text-[#7f8c8d]">El modelo será visible en catálogos</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div className={`p-3 rounded-lg border-2 text-center font-medium text-sm ${
            mensaje.includes("✅") 
              ? "bg-green-50 border-[#27ae60] text-[#27ae60]"
              : "bg-red-50 border-[#e74c3c] text-[#e74c3c]"
          }`}>
            {mensaje}
          </div>
        )}

        {/* Botón de envío */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={cargando}
            className={`bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white py-3 px-6 lg:px-8 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 text-sm lg:text-base ${
              cargando ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {cargando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span className="text-lg">💾</span>
                <span>Guardar Modelo</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}