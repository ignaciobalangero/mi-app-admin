"use client";

import { useState } from "react";
import { collection, addDoc, doc, updateDoc, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Trabajo {
  firebaseId?: string;
  cliente: string;
  precio?: number | string;
  estado: string;
  moneda?: "ARS" | "USD";
  trabajo?: string;
  modelo?: string;
  fecha?: string;
}

interface CuentaCorriente {
  cliente: string;
  saldoPesos: number;
  saldoUSD: number;
  trabajosPendientes?: Trabajo[];
}

interface Props {
  mostrar: boolean;
  clienteSeleccionado: CuentaCorriente | null;
  negocioID: string;
  onClose: () => void;
  onPagoGuardado: () => void;
}

export default function ModalPago({
  mostrar,
  clienteSeleccionado,
  negocioID,
  onClose,
  onPagoGuardado,
}: Props) {
  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: ""
  });
  
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [pagoGuardado, setPagoGuardado] = useState(false);

  if (!mostrar || !clienteSeleccionado) return null;

  // ⭐ NUEVO: Función para actualizar saldo del cliente
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

      if (clientesSnap.empty) {
        console.log(`⚠️ Cliente no encontrado: ${nombreCliente}`);
        return;
      }

      const clienteDoc = clientesSnap.docs[0];
      const datosCliente = clienteDoc.data();

      const nuevoSaldoARS = (datosCliente.saldoARS || 0) + sumarARS;
      const nuevoSaldoUSD = (datosCliente.saldoUSD || 0) + sumarUSD;

      await updateDoc(clienteDoc.ref, {
        saldoARS: Math.round(nuevoSaldoARS * 100) / 100,
        saldoUSD: Math.round(nuevoSaldoUSD * 100) / 100,
        ultimaActualizacion: serverTimestamp()
      });

      console.log(`✅ Saldo actualizado: ${nombreCliente} | ARS ${sumarARS > 0 ? '+' : ''}${sumarARS} | USD ${sumarUSD > 0 ? '+' : ''}${sumarUSD}`);
    } catch (error) {
      console.error(`❌ Error actualizando saldo de ${nombreCliente}:`, error);
    }
  };

  const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPago(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const guardarPago = async () => {
    if (!pago.monto || !pago.formaPago) return;

    setGuardandoPago(true);
    try {
      const montoNumerico = parseFloat(pago.monto);
      
      const pagoData = {
        monto: pago.moneda === "USD" ? null : montoNumerico,
        montoUSD: pago.moneda === "USD" ? montoNumerico : null,
        moneda: pago.moneda,
        forma: pago.formaPago,
        destino: pago.destino,
        observaciones: pago.observaciones,
        cliente: clienteSeleccionado.cliente,
        fecha: new Date().toLocaleDateString('es-AR'),
        fechaCompleta: new Date(),
        tipo: 'ingreso',
        negocioID: negocioID
      };

      await addDoc(collection(db, `negocios/${negocioID}/pagos`), pagoData);

      // ⭐ NUEVO: Restar pago del saldo del cliente
      await actualizarSaldoCliente(
        clienteSeleccionado.cliente,
        pago.moneda === "ARS" ? -montoNumerico : 0,
        pago.moneda === "USD" ? -montoNumerico : 0
      );
      console.log('💳 Saldo actualizado por pago desde cuenta corriente');

      // Marcar trabajos como pagados
      if (clienteSeleccionado.trabajosPendientes && clienteSeleccionado.trabajosPendientes.length > 0) {
        let montoRestante = montoNumerico;
        const trabajosOrdenados = [...clienteSeleccionado.trabajosPendientes].sort((a, b) => {
          const fechaA = new Date(a.fecha || '');
          const fechaB = new Date(b.fecha || '');
          return fechaA.getTime() - fechaB.getTime();
        });

        for (const trabajo of trabajosOrdenados) {
          if (montoRestante <= 0) break;
          
          const precioTrabajo = Number(trabajo.precio || 0);
          const monedaTrabajo = trabajo.moneda || "ARS";
          
          if (monedaTrabajo === pago.moneda && trabajo.firebaseId) {
            if (montoRestante >= precioTrabajo) {
              const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
              await updateDoc(trabajoRef, {
                estado: "PAGADO",
                estadoCuentaCorriente: "PAGADO",
                fechaModificacion: new Date().toLocaleDateString('es-AR')
              });
              montoRestante -= precioTrabajo;
            }
          }
        }
      }

      setPagoGuardado(true);

      setTimeout(() => {
        onPagoGuardado();
        onClose();
        setPago({
          monto: "",
          moneda: "ARS",
          formaPago: "",
          destino: "",
          observaciones: ""
        });
        setPagoGuardado(false);
      }, 1500);

    } catch (error) {
      console.error("Error al guardar pago:", error);
      alert("Error al guardar el pago");
    } finally {
      setGuardandoPago(false);
    }
  };

  const formatPesos = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(num);

  const formatUSD = (num: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(num);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-2xl lg:max-w-3xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Registrar Pago</h3>
              <p className="text-green-100 text-xs sm:text-sm">
                Cliente: {clienteSeleccionado.cliente}
              </p>
              <p className="text-green-200 text-xs">
                Deuda: {formatPesos(clienteSeleccionado.saldoPesos)} | {formatUSD(clienteSeleccionado.saldoUSD)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardandoPago}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Resumen de cuenta */}
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-xl p-4 text-white">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <span>📋</span>
              Resumen de la Cuenta
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-blue-100 text-xs">Saldo en Pesos</p>
                <p className="font-bold text-lg">{formatPesos(clienteSeleccionado.saldoPesos)}</p>
              </div>
              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-blue-100 text-xs">Saldo en USD</p>
                <p className="font-bold text-lg">{formatUSD(clienteSeleccionado.saldoUSD)}</p>
              </div>
            </div>
            
            {clienteSeleccionado.trabajosPendientes && clienteSeleccionado.trabajosPendientes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-blue-100 text-xs mb-2">Trabajos Pendientes:</p>
                <div className="space-y-1">
                  {clienteSeleccionado.trabajosPendientes.slice(0, 3).map((trabajo, idx) => (
                    <div key={idx} className="text-xs bg-white/10 rounded px-2 py-1">
                      {trabajo.modelo} - {trabajo.trabajo} - {trabajo.moneda === "USD" ? "USD $" : "$"}{trabajo.precio}
                    </div>
                  ))}
                  {clienteSeleccionado.trabajosPendientes.length > 3 && (
                    <div className="text-xs text-blue-200">
                      +{clienteSeleccionado.trabajosPendientes.length - 3} más...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Monto del pago */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">💰</span>
              </div>
              <span className="text-sm sm:text-base">Monto del Pago</span>
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Monto recibido: *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder={pago.moneda === "USD" ? "0.00" : "0"}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                  disabled={guardandoPago}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Moneda: *
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>

            {/* Botones rápidos */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-[#7f8c8d] w-full mb-1">Montos sugeridos:</span>
              {clienteSeleccionado.saldoPesos > 0 && (
                <button
                  type="button"
                  onClick={() => setPago(prev => ({
                    ...prev,
                    monto: clienteSeleccionado.saldoPesos.toString(),
                    moneda: "ARS"
                  }))}
                  disabled={guardandoPago}
                  className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  Total ARS: {formatPesos(clienteSeleccionado.saldoPesos)}
                </button>
              )}
              {clienteSeleccionado.saldoUSD > 0 && (
                <button
                  type="button"
                  onClick={() => setPago(prev => ({
                    ...prev,
                    monto: clienteSeleccionado.saldoUSD.toString(),
                    moneda: "USD"
                  }))}
                  disabled={guardandoPago}
                  className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                >
                  Total USD: {formatUSD(clienteSeleccionado.saldoUSD)}
                </button>
              )}
            </div>
          </div>

          {/* Método de pago */}
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
                  Forma de pago: *
                </label>
                <input
                  type="text"
                  name="formaPago"
                  value={pago.formaPago}
                  onChange={handlePagoChange}
                  placeholder="🔍 Ej: Efectivo, Transferencia..."
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Destino (opcional):
                </label>
                <input
                  type="text"
                  name="destino"
                  value={pago.destino}
                  onChange={handlePagoChange}
                  placeholder="🏪 Cuenta bancaria, caja..."
                  disabled={guardandoPago}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
                />
              </div>
            </div>

            {/* Formas comunes */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600 w-full mb-1">Formas comunes:</span>
              {['Efectivo', 'Transferencia', 'Tarjeta', 'MercadoPago'].map((forma) => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => setPago(prev => ({ ...prev, formaPago: forma }))}
                  disabled={guardandoPago}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200 transition-colors disabled:opacity-50"
                >
                  {forma}
                </button>
              ))}
            </div>
          </div>

          {/* Observaciones */}
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
                value={pago.observaciones}
                onChange={handlePagoChange}
                placeholder="💭 Cualquier información adicional sobre el pago..."
                rows={3}
                disabled={guardandoPago}
                className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all resize-none text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Mensaje de éxito */}
          {pagoGuardado && (
            <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] border-2 border-[#27ae60] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <span className="text-[#27ae60] text-xs sm:text-sm font-bold">✓</span>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  ¡Pago registrado con éxito! Actualizando cuenta...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#ecf0f1] border-t-2 border-[#bdc3c7] p-3 sm:p-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
            <button
              onClick={onClose}
              disabled={guardandoPago}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardarPago}
              disabled={!pago.monto || !pago.formaPago || guardandoPago || pagoGuardado}
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                !pago.monto || !pago.formaPago || guardandoPago || pagoGuardado
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
              }`}
            >
              {guardandoPago ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar Pago</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}