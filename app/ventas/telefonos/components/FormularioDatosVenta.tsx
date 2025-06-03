"use client";

import { useEffect, useState } from "react";
import { Timestamp, collection, getDocs, addDoc, setDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import FormularioCamposVenta from "./FormularioCamposVenta";
import ModalPago from "./ModalPago";
import FormularioStock from "@/app/ventas/stock-telefonos/components/FormularioStock";
import { useRouter } from "next/navigation";
import { useRol } from "@/lib/useRol";
import { useSearchParams } from "next/navigation";

interface Props {
  negocioID: string;
  stock: any[];
  setStock: React.Dispatch<React.SetStateAction<any[]>>;
  onGuardado: (venta: any) => void;
  editandoId?: string | null;
  datosEdicion?: any;
}

export default function FormularioDatosVenta({ negocioID, onGuardado, editandoId, datosEdicion }: Props) {
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [mostrarPagoModal, setMostrarPagoModal] = useState(false);
  const [mostrarModalTelefono, setMostrarModalTelefono] = useState(false); // 🔥 CAMBIO: Estado específico para modal de teléfono
  const [guardadoConExito, setGuardadoConExito] = useState(false);
  const [cliente, setCliente] = useState("");
  const [form, setForm] = useState({
    fecha: new Date().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    
    proveedor: "",
    cliente: "",
    modelo: "",
    marca: "",
    color: "",
    estado: "nuevo",
    bateria: "",
    gb: "",
    imei: "",
    serie: "",
    precioCosto: 0,
    precioVenta: 0,
    moneda: "ARS",
    stockID: "",
  });
  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    observaciones: "",
    destino: "",
  });
  const [telefonoRecibido, setTelefonoRecibido] = useState<any | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const clienteParam = searchParams.get("cliente");
    if (clienteParam) {
      setForm((prev) => ({ ...prev, cliente: clienteParam }));
    }
  }, []);
  
  const { rol } = useRol();

  useEffect(() => {
    const cargarDatos = async () => {
      const clientesSnap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
      const clientesData = clientesSnap.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre,
      }));
      setClientes(clientesData);
      const stockSnap = await getDocs(collection(db, `negocios/${negocioID}/stockTelefonos`));
      const stockData = stockSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStock(stockData);
    };
    cargarDatos();
    const clienteNuevo = localStorage.getItem("clienteNuevo");
    if (clienteNuevo) {
      setForm((prev) => ({ ...prev, cliente: clienteNuevo }));
      localStorage.removeItem("clienteNuevo");
    }
  }, [negocioID]);

  useEffect(() => {
    if (datosEdicion) {
      setForm({ ...datosEdicion });
    }
  }, [datosEdicion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "modelo") {
      const telefono = stock.find((t) => t.modelo === value);
      if (telefono) {
        setForm((prev) => ({
          ...prev,
          modelo: telefono.modelo,
          color: telefono.color,
          bateria: telefono.bateria,
          imei: telefono.imei,
          serie: telefono.serial,
          estado: (telefono.estado || "nuevo").toLowerCase(),
          precioCosto: telefono.precioCompra,
          proveedor: telefono.proveedor || "",
          moneda: telefono.moneda || "USD",
          gb: telefono.gb || "",
        }));
      }
    }    
  };

  const handlePagoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPago((prev) => ({ ...prev, [name]: value }));
  };

  const handleGuardarPago = () => {
    setGuardadoConExito(true);
    setTimeout(() => {
      setGuardadoConExito(false);
      setMostrarPagoModal(false);
    }, 1500);
  };

  const guardar = async () => {
    const precioFinal = telefonoRecibido?.precioEstimado
      ? form.precioVenta - telefonoRecibido.precioEstimado
      : form.precioVenta;
  
    const ventaTelefono = {
      fecha: form.fecha,
      fechaIngreso: form.fecha,
      proveedor: form.proveedor || "",
      cliente: form.cliente,
      modelo: form.modelo,
      marca: form.marca || "",
      color: form.color || "",
      estado: form.estado || "nuevo",
      bateria: form.bateria || "",
      gb: form.gb || "",
      imei: form.imei || "",
      serie: form.serie || "",
      precioCosto: form.precioCosto || 0,
      precioVenta: precioFinal,
      ganancia: precioFinal - (form.precioCosto || 0),
      moneda: form.moneda || "ARS",
      stockID: form.stockID || "",
      observaciones: pago.observaciones || "",
      telefonoRecibido: telefonoRecibido ? {
        modelo: telefonoRecibido.modelo,
        precioCompra: telefonoRecibido.precioCompra,
        precioEstimado: telefonoRecibido.precioEstimado,
        ...telefonoRecibido
      } : null,
    };
  
    const pagoTelefono = {
      monto: pago.monto || "",
      moneda: form.moneda || "ARS",
      formaPago: pago.formaPago || "",
      observaciones: pago.observaciones || "",
      destino: "ventaTelefonos",
    };
  
    localStorage.setItem("ventaTelefonoPendiente", JSON.stringify(ventaTelefono));
    localStorage.setItem("pagoTelefonoPendiente", JSON.stringify(pagoTelefono));
    localStorage.setItem("clienteDesdeTelefono", form.cliente);
    
    router.push("/ventas-general?desdeTelefono=1");
  
    setForm({
      fecha: new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      proveedor: "",
      cliente: "",
      modelo: "",
      marca: "",
      color: "", 
      estado: "nuevo",
      bateria: "",
      gb: "",
      imei: "",
      serie: "",
      precioCosto: 0,
      precioVenta: 0,
      moneda: "ARS",
      stockID: "",
    });
  
    setPago({ monto: "", moneda: "ARS", formaPago: "", observaciones: "", destino: "" });
    setTelefonoRecibido(null);
    setMostrarPagoModal(false);
  };

  const calcularRestaPagar = () => {
    return Number(form.precioVenta || 0) - 
           Number(pago.monto || 0) - 
           Number(telefonoRecibido?.precioCompra || 0);
  };

  const hayPagos = pago.monto || telefonoRecibido?.precioCompra;

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header del formulario */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          📱 {editandoId ? "Editar Venta de Teléfono" : "Nueva Venta de Teléfono"}
        </h2>
        <p className="text-blue-100 mt-2">
          Completa todos los datos para registrar la venta
        </p>
      </div>

      <div className="p-8 space-y-8">
        {/* Formulario principal */}
        <div className="bg-gray-50 rounded-xl p-6">
          <FormularioCamposVenta
            form={form}
            setForm={setForm}
            clientes={clientes}
            stock={stock}
            setStock={setStock}
            handleChange={handleChange}
            rol={rol}
            onAgregarCliente={() => router.push("/clientes/agregar?origen=ventas-telefonos")}
          />
        </div>

        {/* Selector de moneda */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
            💰 Configuración de Moneda
          </h3>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-amber-700">Moneda de venta:</label>
            <select
              name="moneda"
              value={form.moneda}
              onChange={handleChange}
              className="px-4 py-2 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              disabled={!!form.stockID}
            >
              <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
              <option value="USD">🇺🇸 Dólares (USD)</option>
            </select>
            {form.stockID && (
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                Moneda fijada por stock seleccionado
              </span>
            )}
          </div>
        </div>

        {/* Resumen de pagos */}
        {hayPagos && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              💳 Resumen de Pagos
            </h3>
            <div className="space-y-3">
              {telefonoRecibido?.precioCompra && (
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-700">
                      📱 Equipo recibido: {telefonoRecibido.modelo}
                    </span>
                  </div>
                  <span className="font-bold text-green-800">
                    ${Number(telefonoRecibido.precioCompra).toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              
              {pago.monto && !isNaN(Number(pago.monto)) && (
                <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-700">
                      💰 Monto abonado ({pago.formaPago || "Efectivo"})
                    </span>
                  </div>
                  <span className="font-bold text-blue-800">
                    {pago.moneda} ${Number(pago.monto).toLocaleString("es-AR")}
                  </span>
                </div>
              )}

              {form.precioVenta > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between bg-red-50 rounded-lg p-4 border border-red-200">
                    <span className="font-semibold text-red-700">
                      📊 Resta pagar:
                    </span>
                    <span className="text-xl font-bold text-red-800">
                      ${calcularRestaPagar().toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setMostrarModalTelefono(true)}
                className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                📦 Teléfono como parte de pago
              </button>
              
              <button
                onClick={() => setMostrarPagoModal(true)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                💳 Agregar Pago
              </button>
            </div>

            <button
              onClick={guardar}
              disabled={!form.cliente?.trim()}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
                !form.cliente?.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105"
              }`}
            >
              {editandoId ? "✏️ Actualizar Venta" : "💾 Guardar Venta"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de pago */}
      <ModalPago
        mostrar={mostrarPagoModal}
        pago={pago}
        onClose={() => setMostrarPagoModal(false)}
        handlePagoChange={handlePagoChange}
        onGuardar={handleGuardarPago}
        guardadoConExito={guardadoConExito}
      />

      {/* Modal directo para FormularioStock con fondo transparente */}
      {mostrarModalTelefono && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    📦 Agregar Teléfono al Stock
                  </h3>
                  <p className="text-purple-100 mt-2">
                    Registra el equipo que el cliente entrega como parte de pago
                  </p>
                </div>
                <button
                  onClick={() => setMostrarModalTelefono(false)}
                  className="text-purple-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-8 bg-gradient-to-br from-gray-50 to-purple-50">
              <FormularioStock
                negocioID={negocioID}
                placeholderProveedor="Cliente que entregó el teléfono"
                onGuardado={(datos) => {
                  setTelefonoRecibido(datos);
                  setMostrarModalTelefono(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}