"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc, getDocs, collection, getDoc, runTransaction, query, where, limit, serverTimestamp, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Combobox } from "@headlessui/react";

interface Trabajo {
  firebaseId: string;
  fecha: string;
  cliente: string;
  modelo: string;
  imei?: string;
  trabajo: string;
  clave?: string;
  observaciones?: string;
  precio?: number;
  moneda?: string;
  estado: string;
  repuestosUsados?: any[]; 
  fechaModificacion?: string;
  estadoCuentaCorriente?: string;
}

interface TrabajoFormulario {
  fecha: string;
  cliente: string;
  modelo: string;
  trabajo: string;
  clave: string;
  observaciones: string;
  precio: string;
  imei: string;
}

interface Props {
  trabajo: Trabajo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  negocioID: string;
}

function roundSaldo(n: number): number {
  return Number(Math.round(n * 100) / 100);
}

function montoPorMoneda(moneda: string, monto: number): { ars: number; usd: number } {
  return moneda === "USD" ? { ars: 0, usd: monto } : { ars: monto, usd: 0 };
}

async function buscarClienteDoc(
  negocioID: string,
  nombre: string
): Promise<QueryDocumentSnapshot | null> {
  const nombreBuscado = nombre.trim();
  if (!nombreBuscado) return null;

  const clientesRef = collection(db, `negocios/${negocioID}/clientes`);
  const exactSnap = await getDocs(
    query(clientesRef, where("nombre", "==", nombreBuscado), limit(1))
  );
  if (!exactSnap.empty) return exactSnap.docs[0];

  const todosSnap = await getDocs(query(clientesRef, limit(500)));
  const nombreLower = nombreBuscado.toLowerCase();
  return (
    todosSnap.docs.find((d) => {
      const data = d.data();
      const n = (data.nombre ?? data.cliente ?? "").trim();
      return n.toLowerCase() === nombreLower;
    }) ?? null
  );
}

export default function ModalEditar({ trabajo, isOpen, onClose, onSave, negocioID }: Props) {
  const [formulario, setFormulario] = useState<TrabajoFormulario>({
    fecha: "",
    cliente: "",
    modelo: "",
    trabajo: "",
    clave: "",
    observaciones: "",
    precio: "",
    imei: "",
  });
  
  const [guardando, setGuardando] = useState(false);
  const [clientes, setClientes] = useState<string[]>([]);
  const [clienteInput, setClienteInput] = useState("");

  // Cargar clientes al montar el componente
  useEffect(() => {
    const cargarClientes = async () => {
      if (!negocioID) return;
      try {
        const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
        const lista = snap.docs.map((doc) => doc.data().nombre || "");
        setClientes(lista);
      } catch (error) {
        console.error("Error cargando clientes:", error);
      }
    };

    cargarClientes();
  }, [negocioID]);

  // Cargar datos del trabajo cuando se abre el modal
  useEffect(() => {
    const cargarDatosTrabajo = async () => {
      if (!trabajo || !isOpen) return;
      
      try {
        // Cargar datos completos del trabajo desde Firebase
        const snap = await getDoc(doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`));
        
        if (snap.exists()) {
          const data = snap.data();
          
          // Formatear fecha si es necesario
          let fechaFormateada = "";
          if (data.fecha?.seconds) {
            const f = data.fecha.toDate();
            const dia = String(f.getDate()).padStart(2, "0");
            const mes = String(f.getMonth() + 1).padStart(2, "0");
            const anio = f.getFullYear();
            fechaFormateada = `${dia}/${mes}/${anio}`;
          } else if (typeof data.fecha === "string") {
            fechaFormateada = data.fecha;
          }

          setFormulario({
            fecha: fechaFormateada,
            cliente: data.cliente || "",
            modelo: data.modelo || "",
            trabajo: data.trabajo || "",
            clave: data.clave || "",
            observaciones: data.observaciones || "",
            precio: data.precio?.toString() || "",
            imei: data.imei || "",
          });
          setClienteInput(data.cliente || "");
        }
      } catch (error) {
        console.error("Error cargando trabajo:", error);
        alert("Error al cargar los datos del trabajo");
      }
    };

    cargarDatosTrabajo();
  }, [trabajo, isOpen, negocioID]);

  // Filtrar clientes para el combobox
  const clientesFiltrados = clientes.filter((c) =>
    c.toLowerCase().includes(clienteInput.toLowerCase())
  );

  // Manejar cambios en el formulario
  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  // Guardar cambios (ajusta cuenta corriente si el trabajo está ENTREGADO/PAGADO)
  const guardarCambios = async () => {
    if (!trabajo || !negocioID) return;

    const precioAnterior = Number(trabajo.precio ?? 0);
    const nuevoPrecio = Number(formulario.precio) || 0;
    const estadoNormalizado = trabajo.estado?.toString().trim().toUpperCase();
    const estadoValido = estadoNormalizado === "ENTREGADO" || estadoNormalizado === "PAGADO";
    const moneda = (trabajo.moneda ?? "ARS").toString().trim().toUpperCase() || "ARS";
    const nombreAnterior = String(trabajo.cliente ?? "").trim();
    const nombreNuevo = String(formulario.cliente ?? "").trim();
    const clienteCambio = nombreAnterior.toLowerCase() !== nombreNuevo.toLowerCase();
    const precioCambio = precioAnterior !== nuevoPrecio;

    const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
    const updatesTrabajo = {
      ...formulario,
      precio: nuevoPrecio,
      fechaModificacion: new Date().toLocaleDateString("es-AR"),
    };

    setGuardando(true);
    try {
      if (!estadoValido || (!clienteCambio && !precioCambio)) {
        await updateDoc(trabajoRef, updatesTrabajo);
        await onSave();
        handleClose();
        console.log("✅ Trabajo actualizado correctamente");
        return;
      }

      const clienteAnteriorDoc = clienteCambio
        ? await buscarClienteDoc(negocioID, nombreAnterior)
        : null;
      const clienteNuevoDoc = await buscarClienteDoc(negocioID, nombreNuevo);

      if (clienteCambio && !clienteNuevoDoc) {
        await updateDoc(trabajoRef, updatesTrabajo);
        await onSave();
        handleClose();
        alert(
          `⚠️ Cliente "${nombreNuevo}" no encontrado en la agenda. Se actualizó el trabajo pero no se movió la deuda en cuenta corriente.`
        );
        return;
      }

      const refSaldo =
        clienteCambio && clienteAnteriorDoc?.id === clienteNuevoDoc?.id
          ? clienteNuevoDoc
          : clienteCambio
            ? null
            : clienteNuevoDoc;

      await runTransaction(db, async (transaction) => {
        transaction.update(trabajoRef, updatesTrabajo);

        if (clienteCambio && clienteAnteriorDoc && clienteNuevoDoc) {
          if (clienteAnteriorDoc.id !== clienteNuevoDoc.id) {
            const snapAnterior = await transaction.get(clienteAnteriorDoc.ref);
            const datosAnterior = (snapAnterior.data() || {}) as {
              saldoARS?: number;
              saldoUSD?: number;
            };
            const { ars: restarARS, usd: restarUSD } = montoPorMoneda(
              moneda,
              precioAnterior
            );
            transaction.update(clienteAnteriorDoc.ref, {
              saldoARS: roundSaldo(Number(datosAnterior.saldoARS ?? 0) - restarARS),
              saldoUSD: roundSaldo(Number(datosAnterior.saldoUSD ?? 0) - restarUSD),
              ultimaActualizacion: serverTimestamp(),
            });

            const snapNuevo = await transaction.get(clienteNuevoDoc.ref);
            const datosNuevo = (snapNuevo.data() || {}) as {
              saldoARS?: number;
              saldoUSD?: number;
            };
            const { ars: sumarARS, usd: sumarUSD } = montoPorMoneda(moneda, nuevoPrecio);
            transaction.update(clienteNuevoDoc.ref, {
              saldoARS: roundSaldo(Number(datosNuevo.saldoARS ?? 0) + sumarARS),
              saldoUSD: roundSaldo(Number(datosNuevo.saldoUSD ?? 0) + sumarUSD),
              ultimaActualizacion: serverTimestamp(),
            });
            return;
          }
        }

        if (!refSaldo) {
          if (clienteCambio && !clienteAnteriorDoc && clienteNuevoDoc) {
            const snapNuevo = await transaction.get(clienteNuevoDoc.ref);
            const datosNuevo = (snapNuevo.data() || {}) as {
              saldoARS?: number;
              saldoUSD?: number;
            };
            const { ars: sumarARS, usd: sumarUSD } = montoPorMoneda(moneda, nuevoPrecio);
            transaction.update(clienteNuevoDoc.ref, {
              saldoARS: roundSaldo(Number(datosNuevo.saldoARS ?? 0) + sumarARS),
              saldoUSD: roundSaldo(Number(datosNuevo.saldoUSD ?? 0) + sumarUSD),
              ultimaActualizacion: serverTimestamp(),
            });
          }
          return;
        }

        if (precioCambio) {
          const snap = await transaction.get(refSaldo.ref);
          const datosCliente = (snap.data() || {}) as {
            saldoARS?: number;
            saldoUSD?: number;
          };
          const delta = nuevoPrecio - precioAnterior;
          const { ars: sumarARS, usd: sumarUSD } = montoPorMoneda(moneda, delta);
          transaction.update(refSaldo.ref, {
            saldoARS: roundSaldo(Number(datosCliente.saldoARS ?? 0) + sumarARS),
            saldoUSD: roundSaldo(Number(datosCliente.saldoUSD ?? 0) + sumarUSD),
            ultimaActualizacion: serverTimestamp(),
          });
        }
      });

      if (clienteCambio && !clienteAnteriorDoc) {
        console.warn(
          `⚠️ Cliente anterior "${nombreAnterior}" no encontrado. La deuda se cargó solo al cliente nuevo.`
        );
      }

      await onSave();
      handleClose();
      console.log("✅ Trabajo y saldos de cuenta corriente actualizados");
    } catch (error) {
      console.error("%c[ModalEditar] FALLO AL GUARDAR", "color: red; font-weight: bold;");
      console.error("[ModalEditar] Error:", error);
      alert("❌ Error al guardar los cambios. Intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  // Cerrar modal y limpiar estado
  const handleClose = () => {
    setFormulario({
      fecha: "",
      cliente: "",
      modelo: "",
      trabajo: "",
      clave: "",
      observaciones: "",
      precio: "",
      imei: "",
    });
    setClienteInput("");
    setGuardando(false);
    onClose();
  };

  if (!isOpen || !trabajo) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl w-full border-2 border-[#ecf0f1] transform transition-all duration-300 max-h-[95vh] overflow-y-auto">
        
        {/* Header del modal */}
        <div className="bg-gradient-to-r from-[#f39c12] to-[#e67e22] text-white rounded-t-2xl p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl">✏️</span>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Editar Trabajo</h2>
                <p className="text-orange-100 text-sm sm:text-base">
                  Modifica la información del trabajo seleccionado
                </p>
                <p className="text-orange-200 text-xs mt-1">
                  Cliente: {trabajo.cliente} • {trabajo.modelo}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={guardando}
              className="text-orange-100 hover:text-white text-xl sm:text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa]">
          
          {/* Header del formulario */}
          <div className="bg-white rounded-xl border-2 border-[#f39c12] p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
                <span className="text-white text-lg sm:text-xl">📝</span>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[#2c3e50]">Información del Trabajo</h3>
                <p className="text-[#7f8c8d] text-sm">Completa todos los campos necesarios</p>
              </div>
            </div>
          </div>

          {/* Grid del formulario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Fecha */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📅</span>
                Fecha
              </label>
              <input
                type="text"
                name="fecha"
                value={formulario.fecha}
                onChange={manejarCambio}
                placeholder="DD/MM/AAAA"
                disabled={guardando}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#3498db]/20 focus:border-[#3498db] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
              />
            </div>

            {/* Cliente - Combobox */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">👤</span>
                Cliente
              </label>
              <Combobox
                value={formulario.cliente}
                onChange={(value) => setFormulario((prev) => ({ ...prev, cliente: value }))}
                disabled={guardando}
              >
                <div className="relative">
                  <Combobox.Input
                    className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#27ae60]/20 focus:border-[#27ae60] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
                    placeholder="Seleccionar cliente"
                    displayValue={(value: string) => value}
                    onChange={(e) => setClienteInput(e.target.value)}
                  />
                  <Combobox.Options className="absolute z-10 w-full bg-white border-2 border-[#bdc3c7] rounded-xl mt-1 max-h-60 overflow-y-auto shadow-xl">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-4 py-3 text-[#7f8c8d] text-center text-sm">Sin resultados</div>
                    ) : (
                      clientesFiltrados.map((cli, i) => (
                        <Combobox.Option
                          key={i}
                          value={cli}
                          className={({ active }) =>
                            `px-4 py-3 cursor-pointer transition-colors duration-200 text-sm ${
                              active ? "bg-[#27ae60] text-white" : "text-[#2c3e50] hover:bg-[#ecf0f1]"
                            }`
                          }
                        >
                          {cli}
                        </Combobox.Option>
                      ))
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#9b59b6] rounded-full flex items-center justify-center text-white text-xs">📱</span>
                Modelo
              </label>
              <input
                name="modelo"
                value={formulario.modelo}
                onChange={manejarCambio}
                placeholder="Modelo del dispositivo"
                disabled={guardando}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#9b59b6]/20 focus:border-[#9b59b6] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
              />
            </div>

            {/* IMEI */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#34495e] rounded-full flex items-center justify-center text-white text-xs">📲</span>
                IMEI
              </label>
              <input
                name="imei"
                value={formulario.imei}
                onChange={manejarCambio}
                placeholder="Número IMEI"
                disabled={guardando}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#34495e]/20 focus:border-[#34495e] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
              />
            </div>

            {/* Trabajo */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#e74c3c] rounded-full flex items-center justify-center text-white text-xs">🔧</span>
                Trabajo / Descripción
              </label>
              <input
                name="trabajo"
                value={formulario.trabajo}
                onChange={manejarCambio}
                placeholder="Descripción detallada del trabajo a realizar"
                disabled={guardando}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#e74c3c]/20 focus:border-[#e74c3c] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
              />
            </div>

            {/* Clave */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#f39c12] rounded-full flex items-center justify-center text-white text-xs">🔑</span>
                Clave
              </label>
              <input
                name="clave"
                value={formulario.clave}
                onChange={manejarCambio}
                placeholder="Clave del dispositivo"
                disabled={guardando}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
              />
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">💰</span>
                Precio
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#27ae60] font-bold text-sm">$</span>
                <input
                  type="number"
                  name="precio"
                  value={formulario.precio}
                  onChange={manejarCambio}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  disabled={guardando}
                  className="w-full pl-8 pr-4 py-2 sm:py-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#27ae60]/20 focus:border-[#27ae60] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] bg-white shadow-sm text-sm disabled:opacity-50"
                />
              </div>
              {formulario.precio && parseFloat(formulario.precio) > 0 && (
                <div className="text-xs text-[#27ae60] bg-green-50 p-2 rounded-lg">
                  💵 Precio formateado: <strong>${parseFloat(formulario.precio).toLocaleString("es-AR")}</strong>
                </div>
              )}
            </div>

            {/* Observaciones - Span completo */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-semibold text-[#2c3e50] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#95a5a6] rounded-full flex items-center justify-center text-white text-xs">📝</span>
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formulario.observaciones}
                onChange={manejarCambio}
                rows={4}
                placeholder="Observaciones adicionales sobre el trabajo, estado del dispositivo, etc..."
                disabled={guardando}
                className="w-full p-2 sm:p-3 border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-[#95a5a6]/20 focus:border-[#95a5a6] transition-all duration-300 text-[#2c3e50] placeholder-[#7f8c8d] resize-none bg-white shadow-sm text-sm disabled:opacity-50"
              />
            </div>
          </div>

          {/* Estado actual del trabajo */}
          <div className="bg-white border-2 border-[#3498db] rounded-xl p-3 sm:p-4">
            <h4 className="font-bold text-[#2c3e50] flex items-center gap-2 text-sm sm:text-base mb-3">
              <span>📊</span> Estado Actual del Trabajo
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-[#ecf0f1] p-3 rounded-lg">
                <span className="text-[#7f8c8d] text-xs">Estado:</span>
                <div className={`font-bold text-sm mt-1 px-2 py-1 rounded text-center ${
                  trabajo.estado === "PAGADO" ? "bg-[#1565C0] text-white" :
                  trabajo.estado === "ENTREGADO" ? "bg-[#1B5E20] text-white" :
                  trabajo.estado === "REPARADO" ? "bg-[#D84315] text-white" :
                  "bg-[#B71C1C] text-white"
                }`}>
                  {trabajo.estado}
                </div>
              </div>
              <div className="bg-[#ecf0f1] p-3 rounded-lg">
                <span className="text-[#7f8c8d] text-xs">Fecha Ingreso:</span>
                <div className="font-bold text-[#2c3e50] text-sm mt-1">
                  {trabajo.fecha}
                </div>
              </div>
              <div className="bg-[#ecf0f1] p-3 rounded-lg">
                <span className="text-[#7f8c8d] text-xs">Última Modificación:</span>
                <div className="font-bold text-[#2c3e50] text-sm mt-1">
                  {trabajo.fechaModificacion || "No modificado"}
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje de guardado exitoso */}
          {guardando && (
            <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] border-2 border-[#3498db] rounded-xl p-3 sm:p-4 animate-pulse">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-[#3498db] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span className="text-white font-semibold text-sm sm:text-lg">
                  Guardando cambios...
                </span>
              </div>
            </div>
          )}
          
          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end pt-4 border-t border-[#ecf0f1]">
            <button
              onClick={handleClose}
              disabled={guardando}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              ❌ Cancelar
            </button>
            <button
              onClick={guardarCambios}
              disabled={guardando || !formulario.cliente}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] text-white rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Guardando...
                </>
              ) : (
                <>💾 Guardar Cambios</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}