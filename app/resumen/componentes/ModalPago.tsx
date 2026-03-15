"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, getDocs, query, where, limit, serverTimestamp } from "firebase/firestore";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave?: string;
  observaciones?: string;
  estado: string;
  estadoCuentaCorriente?: string;
  precio?: number;
  costo?: number;
  moneda?: "ARS" | "USD"; // ⭐ AGREGADO
  repuestosUsados?: any[];
  fechaModificacion?: string;
}

interface Props {
  mostrar: boolean;
  trabajo: Trabajo | null;
  negocioID: string;
  onClose: () => void;
  onPagoGuardado: () => void;
}

export default function ModalPago({
  mostrar,
  trabajo,
  negocioID,
  onClose,
  onPagoGuardado,
}: Props) {
  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: "",
    tipoDestino: "libre",
    proveedorSeleccionado: "",
    destinoLibre: "",
  });

  const [proveedores, setProveedores] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardadoConExito, setGuardadoConExito] = useState(false);

  // ⭐ Función para actualizar saldo del cliente
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

    const nuevoSaldoARS = Number(datosCliente.saldoARS ?? 0) + Number(sumarARS);
    const nuevoSaldoUSD = Number(datosCliente.saldoUSD ?? 0) + Number(sumarUSD);

    await updateDoc(clienteDoc.ref, {
      saldoARS: Number(Math.round(nuevoSaldoARS * 100) / 100),
      saldoUSD: Number(Math.round(nuevoSaldoUSD * 100) / 100),
      ultimaActualizacion: serverTimestamp()
    });

      console.log(`✅ Saldo actualizado: ${nombreCliente} | ARS ${sumarARS > 0 ? '+' : ''}${sumarARS} | USD ${sumarUSD > 0 ? '+' : ''}${sumarUSD}`);
    } catch (error) {
      console.error(`❌ Error actualizando saldo de ${nombreCliente}:`, error);
    }
  };

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

  useEffect(() => {
    if (trabajo && mostrar) {
      setPago(prev => ({
        ...prev,
        monto: trabajo.precio?.toString() || ""
      }));
    }
  }, [trabajo, mostrar]);

  if (!mostrar || !trabajo) return null;

  const handlePagoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPago(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const obtenerDestino = () => {
    if (pago.tipoDestino === "proveedor" && pago.proveedorSeleccionado) {
      const proveedor = proveedores.find(p => p.nombre === pago.proveedorSeleccionado);
      return `Proveedor: ${pago.proveedorSeleccionado}${proveedor?.categoria ? ` (${proveedor.categoria})` : ''}`;
    }
    return pago.destinoLibre;
  };

  const handleGuardarPago = async () => {
    if (!pago.monto || !pago.formaPago || guardando) return;
    
    if (pago.tipoDestino === "proveedor" && !pago.proveedorSeleccionado) return;
    if (pago.tipoDestino === "libre" && !pago.destinoLibre) return;

    setGuardando(true);
    
    try {
      const montoNumerico = parseFloat(pago.monto);
      const destino = obtenerDestino();
      
      // 1. Crear el pago en la colección pagos
      const pagoData = {
        monto: pago.moneda === "USD" ? null : montoNumerico,
        montoUSD: pago.moneda === "USD" ? montoNumerico : null,
        moneda: pago.moneda,
        forma: pago.formaPago,
        destino: destino,
        tipoDestino: pago.tipoDestino,
        proveedorDestino: pago.tipoDestino === "proveedor" ? pago.proveedorSeleccionado : null,
        observaciones: pago.observaciones,
        fecha: new Date().toLocaleDateString('es-AR'),
        fechaCompleta: new Date(),
        cliente: trabajo.cliente,
        trabajoId: trabajo.firebaseId,
        tipo: 'ingreso',
        negocioID: negocioID,
        trabajoDetalle: trabajo.trabajo,
        modeloDetalle: trabajo.modelo
      };

      await addDoc(collection(db, `negocios/${negocioID}/pagos`), pagoData);

      // 2. SI ES PAGO A PROVEEDOR, guardarlo en pagosProveedores
      if (pago.tipoDestino === "proveedor" && pago.proveedorSeleccionado) {
        const proveedor = proveedores.find(p => p.nombre === pago.proveedorSeleccionado);
        if (proveedor) {
          const pagoProveedor = {
            proveedorId: proveedor.id,
            proveedorNombre: proveedor.nombre,
            fecha: new Date().toLocaleDateString("es-AR"),
            monto: pago.moneda === "ARS" ? montoNumerico : 0,
            montoUSD: pago.moneda === "USD" ? montoNumerico : 0,
            forma: pago.formaPago,
            referencia: `Pago desde trabajo: ${trabajo.trabajo}`,
            notas: `Cliente: ${trabajo.cliente} - Modelo: ${trabajo.modelo}${pago.observaciones ? ` - ${pago.observaciones}` : ''}`,
            fechaCreacion: new Date().toISOString(),
          };
          
          await addDoc(collection(db, `negocios/${negocioID}/pagosProveedores`), pagoProveedor);
          console.log("✅ Pago también guardado en pagosProveedores para:", proveedor.nombre);
        }
      }

      // 3. ⭐ NUEVA LÓGICA: Actualizar saldos según estado anterior
      const estadoAnterior = trabajo.estado;
      const estadosValidos = ["ENTREGADO", "PAGADO"];
      
      // Si el trabajo NO estaba en ENTREGADO/PAGADO, SUMAR la deuda primero
      const precioNum = Number(trabajo.precio ?? 0);
      if (!estadosValidos.includes(estadoAnterior) && precioNum > 0) {
        const monedaTrabajo = trabajo.moneda || "ARS";
        await actualizarSaldoCliente(
          trabajo.cliente,
          monedaTrabajo === "ARS" ? precioNum : 0,
          monedaTrabajo === "USD" ? precioNum : 0
        );
        console.log(`✅ Deuda sumada porque estaba en ${estadoAnterior}`);
      }
      
      // Ahora restar el pago
      const montoNum = Number(montoNumerico);
      await actualizarSaldoCliente(
        trabajo.cliente,
        pago.moneda === "ARS" ? -montoNum : 0,
        pago.moneda === "USD" ? -montoNum : 0
      );
      console.log('💳 Pago restado del saldo');

      // 4. Actualizar el trabajo a PAGADO
      const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
      await updateDoc(trabajoRef, {
        estado: "PAGADO",
        estadoCuentaCorriente: "PAGADO",
        fechaModificacion: new Date().toLocaleDateString('es-AR')
      });

      // 5. Mostrar éxito
      setGuardadoConExito(true);
      
      console.log(`✅ Pago registrado para ${trabajo.cliente} - ${trabajo.trabajo} - $${montoNumerico}`);
      
      // 6. Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        onPagoGuardado();
        onClose();
        
        setGuardadoConExito(false);
        setPago({
          monto: "",
          moneda: "ARS",
          formaPago: "",
          destino: "",
          observaciones: "",
          tipoDestino: "libre",
          proveedorSeleccionado: "",
          destinoLibre: "",
        });
      }, 1500);

    } catch (error) {
      console.error("Error al guardar pago:", error);
      alert("Error al guardar el pago. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-2xl lg:max-w-4xl bg-white rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border-2 border-[#ecf0f1] overflow-hidden transform transition-all duration-300 flex flex-col sm:max-h-[95vh]">
        
        {/* Header del Modal */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-4 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <span className="text-lg sm:text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg sm:text-2xl font-bold">Registrar Pago</h3>
              <p className="text-green-100 text-xs sm:text-sm">
                {trabajo.cliente} • {trabajo.modelo} • ${trabajo.precio?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-lg sm:rounded-xl flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Contenido del Modal - Scrolleable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Información del Trabajo */}
          <div className="bg-white rounded-xl border-2 border-[#3498db] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🔧</span>
              </div>
              <span className="text-sm sm:text-base">Detalle del Trabajo</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><strong>Cliente:</strong> {trabajo.cliente}</div>
              <div><strong>Fecha:</strong> {trabajo.fecha}</div>
              <div><strong>Modelo:</strong> {trabajo.modelo}</div>
              <div><strong>Trabajo:</strong> {trabajo.trabajo}</div>
              {trabajo.clave && (
                <div><strong>Clave:</strong> {trabajo.clave}</div>
              )}
              <div className="sm:col-span-2">
                <strong>Precio Total:</strong> 
                <span className="text-[#27ae60] font-bold text-lg ml-2">
                  ${trabajo.precio?.toLocaleString() || 0}
                </span>
              </div>
              {trabajo.observaciones && (
                <div className="sm:col-span-2">
                  <strong>Observaciones:</strong> {trabajo.observaciones}
                </div>
              )}
            </div>
          </div>

          {/* Sección de Monto y Moneda */}
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
                  Monto recibido:
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="monto"
                  value={pago.monto}
                  onChange={handlePagoChange}
                  placeholder={pago.moneda === "USD" ? "0.00" : "0"}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-base sm:text-lg font-medium text-[#2c3e50] placeholder-[#7f8c8d]"
                />
                {pago.monto && parseFloat(pago.monto) > 0 && (
                  <div className="text-xs text-[#7f8c8d] mt-1">
                    {pago.moneda === "USD" 
                      ? `💵 USD $${parseFloat(pago.monto).toFixed(2)}`
                      : `💰 ARS $${parseFloat(pago.monto).toLocaleString()}`
                    }
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Moneda:
                </label>
                <select
                  name="moneda"
                  value={pago.moneda}
                  onChange={handlePagoChange}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setPago(prev => ({
                  ...prev,
                  monto: trabajo.precio?.toString() || ""
                }))}
                className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                💡 Usar precio total: ${trabajo.precio?.toLocaleString() || 0}
              </button>
            </div>
          </div>

          {/* Sección de Método de Pago */}
          <div className="bg-white rounded-xl border-2 border-[#9b59b6] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#9b59b6] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🏦</span>
              </div>
              <span className="text-sm sm:text-base">Método de Pago</span>
            </h4>
            <div className="space-y-3 sm:space-y-4">
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
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-[#7f8c8d] w-full mb-1">Opciones rápidas:</span>
                {["Efectivo", "Transferencia", "Tarjeta", "MercadoPago"].map((forma) => (
                  <button
                    key={forma}
                    onClick={() => setPago(prev => ({ ...prev, formaPago: forma }))}
                    className="bg-[#ecf0f1] hover:bg-[#bdc3c7] text-[#2c3e50] px-3 py-1 rounded-lg text-xs font-medium transition-all"
                  >
                    {forma}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sección de Destino del Pago */}
          <div className="bg-white rounded-xl border-2 border-[#e74c3c] p-4 sm:p-6 shadow-sm">
            <h4 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-[#e74c3c] rounded-lg flex items-center justify-center">
                <span className="text-white text-xs sm:text-sm">🎯</span>
              </div>
              <span className="text-sm sm:text-base">Destino del Pago</span>
            </h4>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#2c3e50]">
                  Tipo de destino: *
                </label>
                <select
                  name="tipoDestino"
                  value={pago.tipoDestino}
                  onChange={(e) => {
                    setPago(prev => ({
                      ...prev,
                      tipoDestino: e.target.value,
                      proveedorSeleccionado: "",
                      destinoLibre: "",
                    }));
                  }}
                  className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-sm sm:text-base text-[#2c3e50]"
                >
                  <option value="libre">✏️ Escribir destino</option>
                  <option value="proveedor">🏢 Pagar a proveedor</option>
                </select>
              </div>

              {pago.tipoDestino === "proveedor" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#2c3e50]">
                    🏢 Seleccionar Proveedor: *
                  </label>
                  <select
                    name="proveedorSeleccionado"
                    value={pago.proveedorSeleccionado}
                    onChange={handlePagoChange}
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
                    value={pago.destinoLibre}
                    onChange={handlePagoChange}
                    placeholder="🏪 Ej: Caja chica, Cuenta bancaria, etc."
                    className="w-full p-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-sm sm:text-base text-[#2c3e50] placeholder-[#7f8c8d]"
                  />
                </div>
              )}

              {((pago.tipoDestino === "proveedor" && pago.proveedorSeleccionado) || 
                (pago.tipoDestino === "libre" && pago.destinoLibre)) && (
                <div className="p-3 bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] rounded-lg border border-[#dee2e6]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#6c757d] text-sm font-medium">Destino seleccionado:</span>
                    <span className="text-[#2c3e50] font-semibold text-sm">{obtenerDestino()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Observaciones */}
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
                  ¡Pago registrado con éxito! 
                  {pago.tipoDestino === "proveedor" && " (También registrado para el proveedor)"}
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
              disabled={guardando}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-[#7f8c8d] hover:bg-[#6c7b7f] text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm sm:text-base disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardarPago}
              disabled={
                !pago.monto || 
                !pago.formaPago || 
                guardando || 
                guardadoConExito ||
                (pago.tipoDestino === "proveedor" && !pago.proveedorSeleccionado) ||
                (pago.tipoDestino === "libre" && !pago.destinoLibre)
              }
              className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 transform shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base ${
                !pago.monto || 
                !pago.formaPago || 
                guardando || 
                guardadoConExito ||
                (pago.tipoDestino === "proveedor" && !pago.proveedorSeleccionado) ||
                (pago.tipoDestino === "libre" && !pago.destinoLibre)
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#27ae60] hover:bg-[#229954] hover:scale-105"
              }`}
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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