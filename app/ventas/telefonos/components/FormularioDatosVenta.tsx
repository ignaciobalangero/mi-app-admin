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
  const [mostrarModalTelefono, setMostrarModalTelefono] = useState(false);
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
    tipoPrecio: "venta",
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
        // Determinar precio según el tipo seleccionado
        const precioSeleccionado = form.tipoPrecio === "mayorista" 
          ? telefono.precioMayorista 
          : telefono.precioVenta;
          
        setForm((prev) => ({
          ...prev,
          modelo: telefono.modelo,
          color: telefono.color,
          bateria: telefono.bateria,
          imei: telefono.imei,
          serie: telefono.serial,
          estado: (telefono.estado || "nuevo").toLowerCase(),
          precioCosto: telefono.precioCompra,
          precioVenta: precioSeleccionado || 0,
          proveedor: telefono.proveedor || "",
          moneda: telefono.moneda || "USD",
          gb: telefono.gb || "",
          stockID: telefono.id,
        }));
      }
    }
    
    // Si cambia el tipo de precio, actualizar precio
    if (name === "tipoPrecio" && form.stockID) {
      const telefono = stock.find((t) => t.id === form.stockID);
      if (telefono) {
        const nuevoPrecio = value === "mayorista" 
          ? telefono.precioMayorista 
          : telefono.precioVenta;
        setForm((prev) => ({ ...prev, precioVenta: nuevoPrecio || 0 }));
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
      tipoPrecio: form.tipoPrecio,
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
      tipoPrecio: "venta",
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
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
      
      {/* Header del formulario - Estilo GestiOne */}
      <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-2xl">📱</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {editandoId ? "Editar Venta de Teléfono" : "Nueva Venta de Teléfono"}
            </h2>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 bg-[#f8f9fa]">
        
        {/* Formulario principal - Estilo GestiOne */}
        <div className="bg-white rounded-xl border border-[#ecf0f1] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">📋</span>
            </div>
            Datos del Teléfono
          </h3>
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

        {/* Selector de tipo de precio y moneda - Estilo GestiOne */}
        <div className="bg-white rounded-xl border-2 border-[#f39c12] p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-[#f39c12] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">💰</span>
            </div>
            Configuración de Precios y Moneda
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selector de tipo de precio */}
            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                Tipo de precio:
              </label>
              <select
                name="tipoPrecio"
                value={form.tipoPrecio}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50]"
              >
                <option value="venta">💰 Precio de venta</option>
                <option value="mayorista">🏪 Precio mayorista</option>
              </select>
              {form.stockID && (
                <p className="text-xs text-[#7f8c8d] mt-1">
                  El precio se actualiza automáticamente según el stock seleccionado
                </p>
              )}
            </div>

            {/* Selector de moneda */}
            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                Moneda de venta:
              </label>
              <select
                name="moneda"
                value={form.moneda}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#f39c12] focus:border-[#f39c12] transition-all text-[#2c3e50]"
                disabled={!!form.stockID}
              >
                <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                <option value="USD">🇺🇸 Dólares (USD)</option>
              </select>
              {form.stockID && (
                <span className="text-xs text-[#f39c12] bg-yellow-100 px-2 py-1 rounded-lg font-medium">
                  Moneda fijada por stock seleccionado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Resumen de pagos - Estilo GestiOne */}
        {hayPagos && (
          <div className="bg-white rounded-xl border-2 border-[#27ae60] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-[#2c3e50] mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-[#27ae60] rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">💳</span>
              </div>
              Resumen de Pagos
            </h3>
            <div className="space-y-3">
              {telefonoRecibido?.precioCompra && (
                <div className="flex items-center justify-between bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#27ae60] rounded-full"></div>
                    <span className="font-medium text-[#2c3e50]">
                      📱 Equipo recibido: {telefonoRecibido.modelo}
                    </span>
                  </div>
                  <span className="font-bold text-[#27ae60]">
                    ${Number(telefonoRecibido.precioCompra).toLocaleString("es-AR")}
                  </span>
                </div>
              )}
              
              {pago.monto && !isNaN(Number(pago.monto)) && (
                <div className="flex items-center justify-between bg-[#f8f9fa] rounded-lg p-4 border border-[#ecf0f1]">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#3498db] rounded-full"></div>
                    <span className="font-medium text-[#2c3e50]">
                      💰 Monto abonado ({pago.formaPago || "Efectivo"})
                    </span>
                  </div>
                  <span className="font-bold text-[#3498db]">
                    {pago.moneda} ${Number(pago.monto).toLocaleString("es-AR")}
                  </span>
                </div>
              )}

              {form.precioVenta > 0 && (
                <div className="border-t border-[#ecf0f1] pt-4">
                  <div className="flex items-center justify-between bg-red-50 rounded-lg p-4 border-2 border-[#e74c3c]">
                    <span className="font-semibold text-[#e74c3c]">
                      📊 Resta pagar:
                    </span>
                    <span className="text-xl font-bold text-[#e74c3c]">
                      ${calcularRestaPagar().toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botones de acción - Estilo GestiOne */}
        <div className="bg-white rounded-xl border border-[#ecf0f1] p-6 shadow-sm">
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setMostrarModalTelefono(true)}
                className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                📦 Teléfono como parte de pago
              </button>
              
              <button
                onClick={() => setMostrarPagoModal(true)}
                className="bg-[#27ae60] hover:bg-[#229954] text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-md flex items-center gap-2"
              >
                💳 Agregar Pago
              </button>
            </div>

            <button
              onClick={guardar}
              disabled={!form.cliente?.trim()}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-lg flex items-center gap-2 ${
                !form.cliente?.trim()
                  ? "bg-[#bdc3c7] cursor-not-allowed"
                  : "bg-[#3498db] hover:bg-[#2980b9] hover:scale-105"
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

      {/* Modal para FormularioStock - Estilo GestiOne */}
      {mostrarModalTelefono && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[#ecf0f1]">
            
            {/* Header del modal - Estilo GestiOne */}
            <div className="bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white rounded-t-2xl p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">📦</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      Agregar Teléfono al Stock
                    </h3>
                    <p className="text-purple-100 text-sm mt-1">
                      Registra el equipo que el cliente entrega como parte de pago
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMostrarModalTelefono(false)}
                  className="text-purple-100 hover:text-white text-2xl font-bold transition-colors duration-200 hover:bg-white/20 rounded-xl w-10 h-10 flex items-center justify-center hover:scale-110"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Contenido del modal */}
            <div className="p-6 bg-[#f8f9fa]">
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