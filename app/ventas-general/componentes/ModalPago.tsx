"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Props {
  mostrar: boolean;
  pago: {
    monto: string;      // ARS
    montoUSD: string;   // USD - NUEVO
    moneda: string;     // Mantener para compatibilidad
    formaPago: string;
    destino: string;
    observaciones: string;
    tipoDestino?: string;         // 🆕 libre, proveedor
    proveedorSeleccionado?: string; // 🆕
    destinoLibre?: string;        // 🆕
  } | null;
  totalesVenta?: {      // NUEVO - Props opcionales para mostrar totales
    totalARS: number;
    totalUSD: number;
    cotizacion: number;
  };
  telefonoComoPago?: {  // ✅ NUEVO - Teléfono como parte de pago
    marca: string;
    modelo: string;
    valorPago: number;
    moneda: string;
  } | null;
  negocioID: string;     // 🆕 Para cargar proveedores
  onClose: () => void;
  handlePagoChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onGuardarPago: (nuevoPago: any) => void;
  guardadoConExito: boolean;
}

export default function ModalPago({
  mostrar,
  pago,
  totalesVenta,
  telefonoComoPago,  // ✅ NUEVO
  negocioID,         // 🆕
  onClose,
  handlePagoChange,
  onGuardarPago,
  guardadoConExito,
}: Props) {
  // 🆕 Estado para proveedores
  const [proveedores, setProveedores] = useState<any[]>([]);

  // 🆕 Cargar proveedores al abrir el modal
  useEffect(() => {
    if (!negocioID || !mostrar) return;

    const fetchProveedores = async () => {
      try {
        const snap = await getDocs(collection(db, `negocios/${negocioID}/proveedores`));
        const proveedoresData = snap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre,
          categoria: doc.data().categoria || "",
        }));
        setProveedores(proveedoresData);
      } catch (error) {
        console.error("Error al cargar proveedores:", error);
      }
    };

    fetchProveedores();
  }, [negocioID, mostrar]);

  if (!mostrar || !pago) return null;

  // ✅ ASEGURAR QUE TODOS LOS CAMPOS TENGAN VALORES POR DEFECTO (incluidos los nuevos)
  const pagoSeguro = {
    monto: pago.monto || "",
    montoUSD: pago.montoUSD || "",
    moneda: pago.moneda || "ARS",
    formaPago: pago.formaPago || "",
    destino: pago.destino || "",
    observaciones: pago.observaciones || "",
    tipoDestino: pago.tipoDestino || "libre",           // 🆕
    proveedorSeleccionado: pago.proveedorSeleccionado || "", // 🆕
    destinoLibre: pago.destinoLibre || "",              // 🆕
  };

  // ✅ CÁLCULOS DE SALDOS DUALES (incluyendo teléfono como parte de pago)
  const pagoARS = parseFloat(pagoSeguro.monto) || 0;
  const pagoUSD = parseFloat(pagoSeguro.montoUSD) || 0;
  
  // ✅ TELÉFONO COMO PARTE DE PAGO
  const valorTelefonoPago = telefonoComoPago ? telefonoComoPago.valorPago : 0;
  const monedaTelefonoPago = telefonoComoPago ? telefonoComoPago.moneda : "ARS";
  
  // ✅ APLICAR DESCUENTO DEL TELÉFONO SEGÚN SU MONEDA
  let saldoARS = totalesVenta ? totalesVenta.totalARS - pagoARS : 0;
  let saldoUSD = totalesVenta ? totalesVenta.totalUSD - pagoUSD : 0;
  
  // Descontar teléfono según su moneda
  if (telefonoComoPago) {
    if (monedaTelefonoPago === "USD") {
      saldoUSD -= valorTelefonoPago;
    } else {
      saldoARS -= valorTelefonoPago;
    }
  }
  
  const totalAproximado = totalesVenta ? 
    totalesVenta.totalARS + (totalesVenta.totalUSD * totalesVenta.cotizacion) : 0;
  const pagoAproximado = pagoARS + (pagoUSD * (totalesVenta?.cotizacion || 1000));
  const telefonoAproximado = telefonoComoPago ? 
    (monedaTelefonoPago === "USD" ? valorTelefonoPago * (totalesVenta?.cotizacion || 1000) : valorTelefonoPago) : 0;
  const saldoAproximado = totalAproximado - pagoAproximado - telefonoAproximado;

  // 🆕 FUNCIÓN PARA OBTENER DESTINO FORMATEADO
  const obtenerDestino = () => {
    if (pagoSeguro.tipoDestino === "proveedor" && pagoSeguro.proveedorSeleccionado) {
      const proveedor = proveedores.find(p => p.nombre === pagoSeguro.proveedorSeleccionado);
      return `Proveedor: ${pagoSeguro.proveedorSeleccionado}${proveedor?.categoria ? ` (${proveedor.categoria})` : ''}`;
    }
    return pagoSeguro.destinoLibre;
  };

  // ✅ FUNCIÓN PARA FORMATEAR PAGO DUAL (actualizada con proveedores)
  const handleGuardarPago = () => {
    const pagoFormateado = {
      // ✅ AMBAS MONEDAS SIMULTÁNEAMENTE
      monto: pagoSeguro.monto || "0",        // ARS
      montoUSD: pagoSeguro.montoUSD || "0",  // USD
      moneda: pagoUSD > 0 ? "USD" : "ARS", // Moneda principal para compatibilidad
      formaPago: pagoSeguro.formaPago,
      destino: obtenerDestino(),                    // 🆕 Usar destino formateado
      tipoDestino: pagoSeguro.tipoDestino,          // 🆕
      proveedorDestino: pagoSeguro.tipoDestino === "proveedor" ? pagoSeguro.proveedorSeleccionado : null, // 🆕
      observaciones: pagoSeguro.observaciones,
    };

    console.log('🎯 Pago dual con proveedores enviado al ModalVenta:', pagoFormateado);
    onGuardarPago(pagoFormateado);
  };

  // ✅ MANEJAR CAMBIOS EN CAMPOS DUALES (actualizado)
  const handleDualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    handlePagoChange(e);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-4xl lg:max-w-5xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
        
        {/* Header del Modal - Responsive */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Pago Dual (ARS + USD)</h3>
              <p className="text-green-100 text-xs sm:text-sm">Registra pagos en pesos y dólares simultáneamente</p>
            </div>
          </div>
          
          {/* Cotización en header */}
          {totalesVenta && (
            <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span className="text-green-100 text-xs">💱</span>
              <span className="text-white text-sm font-medium">
                $1 USD = ${totalesVenta.cotizacion.toLocaleString()} ARS
              </span>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110"
          >
            ×
          </button>
        </div>

        {/* Contenido del Modal - Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Resumen de Totales - ACTUALIZADO con teléfono */}
          {totalesVenta && (
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border-2 border-blue-200 p-4 sm:p-6 shadow-sm">
              <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 flex items-center gap-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm">📊</span>
                </div>
                <span>Resumen de Totales</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Columna ARS */}
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">$</span>
                    <span className="font-semibold text-green-800">Pesos Argentinos</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total venta:</span>
                      <span className="font-bold text-green-700">${totalesVenta.totalARS.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagando efectivo:</span>
                      <span className="font-medium text-blue-600">${pagoARS.toLocaleString()}</span>
                    </div>
                    {telefonoComoPago && monedaTelefonoPago === "ARS" && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Teléfono entregado:</span>
                        <span className="font-medium text-purple-600">${valorTelefonoPago.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Saldo ARS:</span>
                        <span className={`font-bold ${saldoARS > 0 ? 'text-red-600' : saldoARS < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          ${Math.abs(saldoARS).toLocaleString()}
                          {saldoARS < 0 && <span className="text-xs ml-1">(favor)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Columna USD */}
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">$</span>
                    <span className="font-semibold text-blue-800">Dólares USD</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total venta:</span>
                      <span className="font-bold text-blue-700">USD ${totalesVenta.totalUSD.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagando efectivo:</span>
                      <span className="font-medium text-green-600">USD ${pagoUSD.toLocaleString()}</span>
                    </div>
                    {telefonoComoPago && monedaTelefonoPago === "USD" && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Teléfono entregado:</span>
                        <span className="font-medium text-purple-600">USD ${valorTelefonoPago.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">Saldo USD:</span>
                        <span className={`font-bold ${saldoUSD > 0 ? 'text-red-600' : saldoUSD < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          USD ${Math.abs(saldoUSD).toLocaleString()}
                          {saldoUSD < 0 && <span className="text-xs ml-1">(favor)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Teléfono como parte de pago - Sección destacada */}
              {telefonoComoPago && (
                <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs">📱</span>
                    <span className="font-semibold text-purple-800">Teléfono como Parte de Pago</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Equipo:</span>
                      <div className="font-medium text-purple-700">{telefonoComoPago.marca} {telefonoComoPago.modelo}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor:</span>
                      <div className="font-bold text-purple-800">
                        {monedaTelefonoPago === "USD" ? "USD $" : "$"}{valorTelefonoPago.toLocaleString()}
                        {monedaTelefonoPago === "ARS" ? " ARS" : ""}
                      </div>
                      {monedaTelefonoPago === "USD" && totalesVenta && (
                        <div className="text-xs text-gray-500">
                          ≈ ${(valorTelefonoPago * totalesVenta.cotizacion).toLocaleString()} ARS
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Total aproximado */}
              <div className="mt-4 bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Total aproximado en ARS:</span>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">${totalAproximado.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">
                      Saldo: ${Math.abs(saldoAproximado).toLocaleString()}
                      {saldoAproximado < 0 && " (favor)"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sección de Pagos Duales - ACTUALIZADA */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">💰</span>
              </div>
              <span className="text-sm sm:text-base">Montos de Pago</span>
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Pago en ARS */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">$</span>
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    Pago en Pesos Argentinos (ARS)
                  </label>
                </div>
                <input
                  type="number"
                  step="0.01"
                  name="monto"
                  value={pagoSeguro.monto}
                  onChange={handleDualChange}
                  placeholder="0"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                />
                {pagoSeguro.monto && parseFloat(pagoSeguro.monto) > 0 && (
                  <div className="text-xs text-green-600 font-medium">
                    💰 ARS ${parseFloat(pagoSeguro.monto).toLocaleString()}
                  </div>
                )}
              </div>
              
              {/* Pago en USD */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">$</span>
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    Pago en Dólares (USD)
                  </label>
                </div>
                <input
                  type="number"
                  step="0.01"
                  name="montoUSD"
                  value={pagoSeguro.montoUSD}
                  onChange={handleDualChange}
                  placeholder="0.00"
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                />
                {pagoSeguro.montoUSD && parseFloat(pagoSeguro.montoUSD) > 0 && (
                  <div className="text-xs text-blue-600 font-medium">
                    💵 USD ${parseFloat(pagoSeguro.montoUSD).toFixed(2)}
                    {totalesVenta && (
                      <span className="text-gray-500 ml-2">
                        (≈ ${(parseFloat(pagoSeguro.montoUSD) * totalesVenta.cotizacion).toLocaleString()} ARS)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Botones rápidos para pagos comunes */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600 w-full mb-1">Montos rápidos:</span>
              {totalesVenta && totalesVenta.totalARS > 0 && (
                <button
                  type="button"
                  onClick={() => handleDualChange({
                    target: { name: 'monto', value: totalesVenta.totalARS.toString() }
                  } as any)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors"
                >
                  Total ARS (${totalesVenta.totalARS.toLocaleString()})
                </button>
              )}
              {totalesVenta && totalesVenta.totalUSD > 0 && (
                <button
                  type="button"
                  onClick={() => handleDualChange({
                    target: { name: 'montoUSD', value: totalesVenta.totalUSD.toString() }
                  } as any)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors"
                >
                  Total USD (${totalesVenta.totalUSD.toLocaleString()})
                </button>
              )}
            </div>
          </div>

          {/* Sección de Método de Pago - Sin cambios */}
          <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🏦</span>
              </div>
              <span className="text-sm sm:text-base">Método de Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Forma de pago:
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pagoSeguro.formaPago}
                  onChange={handleDualChange}
                  placeholder="🔍 Ej: Efectivo, Transferencia..."
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>
            </div>
            
            {/* Botones rápidos para formas de pago */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600 w-full mb-1">Formas comunes:</span>
              {['Efectivo', 'Transferencia', 'Tarjeta', 'MercadoPago'].map((forma) => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => handleDualChange({
                    target: { name: 'formaPago', value: forma }
                  } as any)}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors"
                >
                  {forma}
                </button>
              ))}
            </div>
          </div>

          {/* 🆕 Sección de Destino del Pago */}
          <div className="bg-white rounded-xl border-2 border-[#e74c3c] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#e74c3c] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🎯</span>
              </div>
              <span className="text-sm sm:text-base">Destino del Pago</span>
            </h4>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Selector de tipo de destino */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Tipo de destino: *
                </label>
                <select
                  name="tipoDestino"
                  value={pagoSeguro.tipoDestino}
                  onChange={(e) => {
                    handleDualChange(e);
                    // Limpiar campos específicos al cambiar tipo
                    if (e.target.value === "proveedor") {
                      handleDualChange({ target: { name: 'destinoLibre', value: '' } } as any);
                    } else {
                      handleDualChange({ target: { name: 'proveedorSeleccionado', value: '' } } as any);
                    }
                  }}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="libre">✏️ Escribir destino</option>
                  <option value="proveedor">🏢 Pagar a proveedor</option>
                </select>
              </div>

              {/* Campo dinámico según tipo */}
              {pagoSeguro.tipoDestino === "proveedor" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    🏢 Seleccionar Proveedor: *
                  </label>
                  <select
                    name="proveedorSeleccionado"
                    value={pagoSeguro.proveedorSeleccionado}
                    onChange={handleDualChange}
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#8e44ad] focus:border-[#8e44ad] transition-all text-sm sm:text-base text-[#2c3e50]"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map((proveedor) => (
                      <option key={proveedor.id} value={proveedor.nombre}>
                        {proveedor.nombre} {proveedor.categoria && `(${proveedor.categoria})`}
                      </option>
                    ))}
                  </select>
                  {proveedores.length === 0 && (
                    <p className="text-xs text-[#7f8c8d] mt-1">
                      No hay proveedores. <span className="text-[#8e44ad] font-medium">Crea uno en la sección Proveedores</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    ✏️ Concepto del Pago: *
                  </label>
                  <input
                    type="text"
                    name="destinoLibre"
                    value={pagoSeguro.destinoLibre}
                    onChange={handleDualChange}
                    placeholder="🏪 Ej: Caja chica, Cuenta bancaria, etc."
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>
              )}

              {/* Vista previa del destino */}
              {((pagoSeguro.tipoDestino === "proveedor" && pagoSeguro.proveedorSeleccionado) || 
                (pagoSeguro.tipoDestino === "libre" && pagoSeguro.destinoLibre)) && (
                <div className="p-3 bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] rounded-lg border border-[#dee2e6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6c757d] text-sm font-medium">Destino seleccionado:</span>
                    <span className="text-[#2c3e50] font-semibold text-sm">{obtenerDestino()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Observaciones - Sin cambios */}
          <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">📝</span>
              </div>
              <span className="text-sm sm:text-base">Observaciones</span>
            </h4>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50]">
                Notas adicionales (opcional):
              </label>
              <textarea
                name="observaciones"
                value={pagoSeguro.observaciones}
                onChange={handleDualChange}
                placeholder="💭 Cualquier información adicional sobre el pago..."
                rows={3}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
              />
            </div>
          </div>

          {/* Mensaje de Éxito */}
          {guardadoConExito && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  ¡Pago dual registrado con éxito!
                  {pagoSeguro.tipoDestino === "proveedor" && " (También registrado para el proveedor)"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones */}
        <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarPago}
              disabled={
                ((!pagoSeguro.monto || parseFloat(pagoSeguro.monto) === 0) && 
                 (!pagoSeguro.montoUSD || parseFloat(pagoSeguro.montoUSD) === 0)) || 
                guardadoConExito ||
                (pagoSeguro.tipoDestino === "proveedor" && !pagoSeguro.proveedorSeleccionado) ||
                (pagoSeguro.tipoDestino === "libre" && !pagoSeguro.destinoLibre)
              }
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                ((!pagoSeguro.monto || parseFloat(pagoSeguro.monto) === 0) && 
                 (!pagoSeguro.montoUSD || parseFloat(pagoSeguro.montoUSD) === 0)) || 
                guardadoConExito ||
                (pagoSeguro.tipoDestino === "proveedor" && !pagoSeguro.proveedorSeleccionado) ||
                (pagoSeguro.tipoDestino === "libre" && !pagoSeguro.destinoLibre)
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
              }`}
            >
              💾 Guardar Pago Dual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}