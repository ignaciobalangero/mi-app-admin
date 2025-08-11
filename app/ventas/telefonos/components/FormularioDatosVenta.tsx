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
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [tipoProveedor, setTipoProveedor] = useState<"manual" | "lista">("manual");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [proveedorManual, setProveedorManual] = useState("");
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

  // Cargar proveedores
  useEffect(() => {
    const cargarProveedores = async () => {
      try {
        const snap = await getDocs(collection(db, `negocios/${negocioID}/proveedores`));
        const proveedoresData = snap.docs.map(doc => ({
          id: doc.id,
          nombre: doc.data().nombre,
          categoria: doc.data().categoria || "",
        }));
        setProveedores(proveedoresData);
      } catch (error) {
        console.error("Error cargando proveedores:", error);
      }
    };
    
    if (negocioID) {
      cargarProveedores();
    }
  }, [negocioID]);

  // Función para manejar cambio de proveedor
  const manejarCambioProveedor = () => {
    let valorFinal = "";
    
    if (tipoProveedor === "lista" && proveedorSeleccionado) {
      const proveedor = proveedores.find(p => p.nombre === proveedorSeleccionado);
      valorFinal = `${proveedorSeleccionado}${proveedor?.categoria ? ` (${proveedor.categoria})` : ''}`;
    } else if (tipoProveedor === "manual") {
      valorFinal = proveedorManual;
    }
    
    // Actualizar el form.proveedor
    setForm(prev => ({ ...prev, proveedor: valorFinal }));
  };

  // Detectar cambios y actualizar
  useEffect(() => {
    manejarCambioProveedor();
  }, [tipoProveedor, proveedorSeleccionado, proveedorManual]);

  // Inicializar con valor existente si viene del stock
  useEffect(() => {
    if (form.proveedor && !proveedorManual && !proveedorSeleccionado) {
      // Verificar si el proveedor existe en la lista
      const proveedorEnLista = proveedores.find(p => 
        form.proveedor.includes(p.nombre)
      );
      
      if (proveedorEnLista) {
        setTipoProveedor("lista");
        setProveedorSeleccionado(proveedorEnLista.nombre);
      } else {
        setTipoProveedor("manual");
        setProveedorManual(form.proveedor);
      }
    }
  }, [form.proveedor, proveedores]);

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
      tipoProveedor: tipoProveedor, // Nuevo campo
      proveedorId: tipoProveedor === "lista" && proveedorSeleccionado ? 
        proveedores.find(p => p.nombre === proveedorSeleccionado)?.id : null, // Nuevo campo
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
    
    // ✅ SI HAY TELÉFONO COMO PARTE DE PAGO, GUARDARLO EN LOCALSTORAGE
    if (telefonoRecibido) {
      const telefonoComoPago = {
        marca: telefonoRecibido.marca || '',
        modelo: telefonoRecibido.modelo || '',
        valorPago: telefonoRecibido.precioCompra || telefonoRecibido.precioEstimado || 0,
        moneda: telefonoRecibido.moneda || 'ARS',
        color: telefonoRecibido.color || '',
        estado: telefonoRecibido.estado || '',
        imei: telefonoRecibido.imei || '',
        observaciones: `Teléfono recibido: ${telefonoRecibido.marca} ${telefonoRecibido.modelo}`
      };
      
      localStorage.setItem("telefonoComoPago", JSON.stringify(telefonoComoPago));
      console.log('📱 Teléfono guardado para ModalVenta:', telefonoComoPago);
    }
    
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
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-[#ecf0f1] to-[#dfe6e9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 🎨 HEADER PRINCIPAL - Colores GestiOne */}
        <div className="relative mb-8">
          {/* Decoración de fondo */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#3498db] to-[#2c3e50] rounded-3xl transform rotate-1 opacity-20 blur-sm"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#27ae60] to-[#3498db] rounded-3xl transform -rotate-1 opacity-10 blur-lg"></div>
          
          {/* Contenido del header */}
          <div className="relative bg-gradient-to-r from-[#2c3e50] to-[#3498db] rounded-3xl shadow-2xl border border-white/20 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-3xl"></div>
            <div className="relative p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {/* Logo animado */}
                  <div className="relative">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/30 transform hover:scale-110 transition-all duration-300">
                      <span className="text-3xl animate-pulse">📱</span>
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-[#f39c12] to-[#e67e22] rounded-full animate-bounce shadow-lg flex items-center justify-center">
                      <span className="text-xs">✨</span>
                    </div>
                  </div>
                  
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                      {editandoId ? "✏️ Editar Venta" : "🚀 Nueva Venta"}
                    </h1>
                    <p className="text-blue-100 text-lg font-medium">
                      Gestión profesional de ventas de teléfonos
                    </p>
                    <div className="flex items-center mt-3 space-x-4">
                      <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
                        <div className="w-2 h-2 bg-[#27ae60] rounded-full animate-pulse"></div>
                        <span className="text-white/90 text-sm font-medium">Sistema activo</span>
                      </div>
                      <div className="text-white/70 text-sm">
                        📅 {new Date().toLocaleDateString("es-AR", { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Indicadores de estado */}
                <div className="hidden sm:flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/20 backdrop-blur-xl rounded-xl p-3 border border-white/30">
                      <div className="text-white/90 text-sm font-medium">Clientes</div>
                      <div className="text-white text-2xl font-bold">{clientes.length}</div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-xl rounded-xl p-3 border border-white/30">
                      <div className="text-white/90 text-sm font-medium">Stock</div>
                      <div className="text-white text-2xl font-bold">{stock.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* 📋 COLUMNA PRINCIPAL - FORMULARIO */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Datos del Teléfono */}
            <div className="group bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-[#ecf0f1]/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:bg-white/90">
              <div className="relative bg-gradient-to-r from-[#3498db] to-[#2980b9] p-6">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                <div className="relative flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xl">📋</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Información del Dispositivo</h3>
                    <p className="text-white/80 text-sm">Complete los datos técnicos del teléfono</p>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
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
                
                {/* Campo Proveedor Mejorado - Integrado directamente */}
                <div className="space-y-3 mt-6">
                  <label className="block text-sm font-bold text-[#2c3e50] mb-2">
                    🏢 Proveedor
                  </label>
                  
                  {/* Selector de tipo */}
                  <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setTipoProveedor("manual")}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                        tipoProveedor === "manual"
                          ? "bg-white text-blue-600 shadow-md"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      ✏️ Escribir
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoProveedor("lista")}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                        tipoProveedor === "lista"
                          ? "bg-white text-purple-600 shadow-md"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      🏢 Seleccionar
                    </button>
                  </div>

                  {/* Campo dinámico según el tipo */}
                  {tipoProveedor === "manual" ? (
                    <div>
                      <input
                        type="text"
                        value={proveedorManual}
                        onChange={(e) => setProveedorManual(e.target.value)}
                        placeholder="Ej: Cliente final, Proveedor único, etc."
                        className="w-full px-4 py-3 bg-gradient-to-r from-white to-[#f8f9fa] border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-[#2c3e50] font-medium shadow-sm hover:shadow-md"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        💡 Para proveedores únicos o clientes finales
                      </p>
                    </div>
                  ) : (
                    <div>
                      <select
                        value={proveedorSeleccionado}
                        onChange={(e) => setProveedorSeleccionado(e.target.value)}
                        className="w-full px-4 py-3 bg-gradient-to-r from-white to-[#f8f9fa] border-2 border-[#bdc3c7] rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-300 text-[#2c3e50] font-medium shadow-sm hover:shadow-md appearance-none"
                      >
                        <option value="">Seleccionar proveedor del sistema</option>
                        {proveedores.map((proveedor) => (
                          <option key={proveedor.id} value={proveedor.nombre}>
                            {proveedor.nombre} {proveedor.categoria && `(${proveedor.categoria})`}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-600">
                          🏢 Proveedores registrados en el sistema
                        </p>
                        {proveedores.length === 0 && (
                          <a 
                            href="/proveedores" 
                            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                          >
                            Crear proveedores
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vista previa del valor final */}
                  {form.proveedor && (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm font-medium">Proveedor registrado:</span>
                        <span className="text-green-800 font-semibold text-sm">{form.proveedor}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Configuración de Precios */}
            <div className="group bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-[#ecf0f1]/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:bg-white/90">
              <div className="relative bg-gradient-to-r from-[#f39c12] to-[#e67e22] p-6">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-xl">💰</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Configuración Comercial</h3>
                      <p className="text-white/80 text-sm">Defina precios y moneda de la operación</p>
                    </div>
                  </div>
                  
                  {/* Badge de moneda */}
                  <div className="bg-white/20 backdrop-blur-xl rounded-full px-4 py-2 border border-white/30">
                    <span className="text-white font-bold">
                      {form.moneda === "USD" ? "🇺🇸 USD" : "🇦🇷 ARS"}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Tipo de precio */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-[#2c3e50] mb-2">
                      🏷️ Tipo de precio
                    </label>
                    <div className="relative">
                      <select
                        name="tipoPrecio"
                        value={form.tipoPrecio}
                        onChange={handleChange}
                        className="w-full px-4 py-4 bg-gradient-to-r from-white to-[#f8f9fa] border-2 border-[#bdc3c7] rounded-2xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] transition-all duration-300 text-[#2c3e50] font-medium shadow-lg hover:shadow-xl appearance-none"
                      >
                        <option value="venta">💰 Precio de venta público</option>
                        <option value="mayorista">🏪 Precio mayorista</option>
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-[#7f8c8d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {form.stockID && (
                      <div className="bg-[#fff3cd] border border-[#ffeaa7] rounded-xl p-3">
                        <p className="text-xs text-[#6c5700] font-medium">
                          ℹ️ El precio se actualiza automáticamente según el stock seleccionado
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Moneda */}
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-[#2c3e50] mb-2">
                      💱 Moneda de operación
                    </label>
                    <div className="relative">
                      <select
                        name="moneda"
                        value={form.moneda}
                        onChange={handleChange}
                        className={`w-full px-4 py-4 bg-gradient-to-r from-white to-[#f8f9fa] border-2 rounded-2xl transition-all duration-300 font-medium shadow-lg appearance-none ${
                          form.stockID 
                            ? 'border-[#bdc3c7] bg-[#ecf0f1] cursor-not-allowed text-[#7f8c8d]' 
                            : 'border-[#bdc3c7] hover:shadow-xl focus:ring-4 focus:ring-[#f39c12]/20 focus:border-[#f39c12] text-[#2c3e50]'
                        }`}
                        disabled={false}
                      >
                        <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
                        <option value="USD">🇺🇸 Dólares Estadounidenses (USD)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-[#7f8c8d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {form.stockID && (
                      <div className="bg-[#d1ecf1] border border-[#bee5eb] rounded-xl p-3">
                        <span className="text-xs text-[#0c5460] font-bold bg-[#b8daff] px-2 py-1 rounded-lg">
                          🔒 Moneda fijada por el stock seleccionado
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mostrar precio actual si hay */}
                {form.precioVenta > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-[#d4edda] to-[#c3e6cb] border-2 border-[#27ae60] rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#27ae60] rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold">💵</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-[#155724]">Precio establecido</h4>
                          <p className="text-[#27ae60] text-sm">Precio {form.tipoPrecio === "mayorista" ? "mayorista" : "de venta"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-[#155724]">
                          {form.moneda} ${Number(form.precioVenta).toLocaleString("es-AR")}
                        </div>
                        {rol?.tipo === "admin" && form.precioCosto > 0 && (
                          <div className="text-sm text-[#27ae60] font-medium">
                            Ganancia: ${(form.precioVenta - form.precioCosto).toLocaleString("es-AR")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 📊 COLUMNA LATERAL - RESUMEN Y ACCIONES */}
          <div className="space-y-6">
            
            {/* Resumen de Pagos */}
            {hayPagos && (
              <div className="group bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-[#ecf0f1]/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:bg-white/90">
                <div className="relative bg-gradient-to-r from-[#27ae60] to-[#229954] p-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                  <div className="relative flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-xl">💳</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Resumen de Pagos</h3>
                      <p className="text-white/80 text-sm">Montos registrados</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  {telefonoRecibido?.precioCompra && (
                    <div className="bg-gradient-to-r from-[#d1ecf1] to-[#bee5eb] border-2 border-[#3498db] rounded-2xl p-4 transform hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#3498db] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white">📱</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#2c3e50]">Equipo recibido</div>
                            <div className="text-[#3498db] text-sm font-medium">{telefonoRecibido.modelo}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-[#2c3e50]">
                            ${Number(telefonoRecibido.precioCompra).toLocaleString("es-AR")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {pago.monto && !isNaN(Number(pago.monto)) && (
                    <div className="bg-gradient-to-r from-[#d4edda] to-[#c3e6cb] border-2 border-[#27ae60] rounded-2xl p-4 transform hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#27ae60] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white">💰</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#155724]">Pago recibido</div>
                            <div className="text-[#27ae60] text-sm font-medium">{pago.formaPago || "Efectivo"}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-[#155724]">
                            {pago.moneda} ${Number(pago.monto).toLocaleString("es-AR")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total pendiente */}
                  {form.precioVenta > 0 && (
                    <div className="bg-gradient-to-r from-[#f8d7da] to-[#f5c6cb] border-2 border-[#e74c3c] rounded-2xl p-4 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-[#e74c3c] rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white">⏳</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#721c24]">Resta pagar</div>
                            <div className="text-[#e74c3c] text-sm font-medium">Saldo pendiente</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-[#721c24]">
                            ${calcularRestaPagar().toLocaleString("es-AR")}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel de Acciones */}
            <div className="group bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-[#ecf0f1]/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:bg-white/90">
              <div className="relative bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-6">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                <div className="relative flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Acciones Rápidas</h3>
                    <p className="text-white/80 text-sm">Gestione la venta</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                
                {/* Botón Teléfono como parte de pago */}
                <button
                  onClick={() => setMostrarModalTelefono(true)}
                  className="w-full group/btn bg-gradient-to-r from-[#f39c12] to-[#e67e22] hover:from-[#e67e22] hover:to-[#d35400] text-white p-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl border border-[#f39c12]/30"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover/btn:scale-110 transition-transform duration-300">
                      <span className="text-lg">📦</span>
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Agregar Dispositivo</div>
                      <div className="text-white/90 text-sm">Como parte de pago</div>
                    </div>
                  </div>
                </button>

                {/* Separador */}
                <div className="flex items-center my-6">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#bdc3c7] to-transparent"></div>
                  <span className="px-4 text-[#7f8c8d] text-sm font-medium">Finalizar</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#bdc3c7] to-transparent"></div>
                </div>

                {/* Botón Principal - Continuar/Guardar */}
                <button
                  onClick={guardar}
                  disabled={!form.cliente?.trim()}
                  className={`w-full p-6 rounded-2xl font-black text-lg transition-all duration-300 transform shadow-xl border-2 ${
                    !form.cliente?.trim()
                      ? "bg-[#ecf0f1] text-[#7f8c8d] cursor-not-allowed border-[#bdc3c7]"
                      : "bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#1f4e79] text-white hover:scale-105 hover:shadow-2xl border-[#3498db]/30 hover:border-[#2980b9]/50"
                  }`}
                >
                  <div className="flex items-center justify-center space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      !form.cliente?.trim() 
                        ? "bg-[#bdc3c7]" 
                        : "bg-white/20 group-hover:scale-110"
                    }`}>
                      <span className="text-2xl">
                        {editandoId ? "✏️" : "🚀"}
                      </span>
                    </div>
                    <div className="text-center">
                      <div>{editandoId ? "Actualizar Venta" : "Continuar con la Venta"}</div>
                      <div className={`text-sm font-medium ${
                        !form.cliente?.trim() ? "text-[#7f8c8d]" : "text-white/90"
                      }`}>
                        {!form.cliente?.trim() ? "Complete los campos requeridos" : "Proceder al registro final"}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Indicador de progreso */}
                <div className="bg-[#f8f9fa] rounded-2xl p-4 border border-[#ecf0f1]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2c3e50]">Progreso del formulario</span>
                    <span className="text-sm font-bold text-[#2c3e50]">
                      {Math.round(((form.cliente ? 1 : 0) + (form.modelo ? 1 : 0) + (form.precioVenta > 0 ? 1 : 0)) / 3 * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#ecf0f1] rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#3498db] to-[#2980b9] h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.round(((form.cliente ? 1 : 0) + (form.modelo ? 1 : 0) + (form.precioVenta > 0 ? 1 : 0)) / 3 * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#7f8c8d] mt-1">
                    <span className={form.cliente ? "text-[#27ae60] font-medium" : ""}>Cliente</span>
                    <span className={form.modelo ? "text-[#27ae60] font-medium" : ""}>Dispositivo</span>
                    <span className={form.precioVenta > 0 ? "text-[#27ae60] font-medium" : ""}>Precio</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Información Rápida */}
            <div className="bg-gradient-to-br from-[#e8f4fd] to-[#d1ecf1] rounded-3xl p-6 border-2 border-[#3498db] shadow-lg">
              <h4 className="font-bold text-[#2c3e50] mb-4 flex items-center space-x-2">
                <span className="text-lg">💡</span>
                <span>Consejos Rápidos</span>
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-[#27ae60] font-bold">✓</span>
                  <span className="text-[#2c3e50]">Complete todos los campos del cliente para un mejor seguimiento</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#3498db] font-bold">ℹ️</span>
                  <span className="text-[#2c3e50]">Los precios mayoristas se aplican automáticamente desde el stock</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#9b59b6] font-bold">⭐</span>
                  <span className="text-[#2c3e50]">Registre pagos parciales para mejor control financiero</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎭 MODAL DE PAGO - Mejorado */}
      <ModalPago
        mostrar={mostrarPagoModal}
        pago={pago}
        onClose={() => setMostrarPagoModal(false)}
        handlePagoChange={handlePagoChange}
        onGuardar={handleGuardarPago}
        guardadoConExito={guardadoConExito}
      />

      {/* 🎭 MODAL TELÉFONO - Completamente rediseñado */}
      {mostrarModalTelefono && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-white/50 transform animate-slideUp">
            
            {/* Header del modal mejorado */}
            <div className="relative bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] p-8">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div className="relative flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                    <span className="text-3xl">📦</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white mb-2">
                      Registrar Dispositivo
                    </h3>
                    <p className="text-white/80 font-medium">
                      Complete los datos del equipo que recibe como parte de pago
                    </p>
                    <div className="flex items-center mt-3 space-x-2">
                      <div className="w-2 h-2 bg-[#27ae60] rounded-full animate-pulse"></div>
                      <span className="text-white/90 text-sm font-medium">Sistema de valoración automática</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setMostrarModalTelefono(false)}
                  className="text-white/80 hover:text-white text-3xl font-bold transition-all duration-200 hover:bg-white/20 rounded-2xl w-12 h-12 flex items-center justify-center hover:scale-110 transform"
                >
                  ×
                </button>
              </div>
            </div>
            
            {/* Contenido del modal con scroll mejorado */}
            <div className="p-8 bg-gradient-to-br from-[#f8f9fa] to-white max-h-[60vh] overflow-y-auto">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
                <FormularioStock
                  negocioID={negocioID}
                  placeholderProveedor="Cliente que entregó el teléfono"
                  onGuardado={(datos) => {
                    console.log('📱 Teléfono registrado como parte de pago:', datos);
                    
                    // ✅ GUARDAR EN STATE LOCAL
                    setTelefonoRecibido(datos);
                    
                    // ✅ TAMBIÉN GUARDAR EN LOCALSTORAGE PARA EL MODALVENTA
                    const telefonoComoPago = {
                      marca: datos.marca || '',
                      modelo: datos.modelo || '',
                      valorPago: datos.precioCompra || datos.precioEstimado || 0,
                      moneda: datos.moneda || 'ARS',
                      color: datos.color || '',
                      estado: datos.estado || '',
                      imei: datos.imei || '',
                      observaciones: `Teléfono recibido como parte de pago: ${datos.marca} ${datos.modelo}`
                    };
                    
                    console.log('💾 Guardando en localStorage:', telefonoComoPago);
                    localStorage.setItem("telefonoComoPago", JSON.stringify(telefonoComoPago));
                    
                    setMostrarModalTelefono(false);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS adicionales */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}