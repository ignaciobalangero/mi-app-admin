"use client";

import { useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import TablaProductosVenta from "./TablaProductosVenta";
import ModalPago from "./ModalPago";
import { obtenerUltimoNumeroVenta } from "@/lib/ventas/contadorVentas";
import BotonGuardarVenta from "./BotonGuardarVenta";
import SelectorProductoVentaGeneral from "./SelectorProductoVentaGeneral";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { Combobox } from "@headlessui/react";
import useCotizacion from "@/lib/hooks/useCotizacion";

export default function ModalVenta({
  clienteInicial = "",
  productosIniciales = [],
  pagoInicial = null,
  onClose,
  onGuardar,
  refrescar,
  setRefrescar,
  desdeTelefono = false,
}: {
  clienteInicial?: string;
  productosIniciales?: any[];
  pagoInicial?: any;
  onClose?: () => void;
  onGuardar?: () => void;
  refrescar: boolean;
  setRefrescar: React.Dispatch<React.SetStateAction<boolean>>;
  desdeTelefono?: boolean;
}) {

  const { rol } = useRol();
  const [cliente, setCliente] = useState(clienteInicial);
  const [numeroVenta, setNumeroVenta] = useState("");
  const [productos, setProductos] = useState<any[]>(productosIniciales);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [color, setColor] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState(0);
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const { cotizacion } = useCotizacion(rol?.negocioID || "");

  // Estado para el teléfono como parte de pago
  const [telefonoComoPago, setTelefonoComoPago] = useState<any>(null);

  const pagoInicialCompleto = pagoInicial || {
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: "",
  };

  const [pago, setPago] = useState(pagoInicialCompleto);
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false);
  const [guardadoConExito, setGuardadoConExito] = useState(false);
  const [listaClientes, setListaClientes] = useState<string[]>([]);
  const [queryCliente, setQueryCliente] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");

  // ✅ FUNCIÓN PARA LIMPIAR DATOS TEMPORALES
  const limpiarDatosTemporales = () => {
    console.log('🧹 Limpiando datos temporales...');
    
    // Limpiar todos los datos temporales de ventas
    localStorage.removeItem("ventaTelefonoPendiente");
    localStorage.removeItem("pagoTelefonoPendiente");
    localStorage.removeItem("clienteDesdeTelefono");
    localStorage.removeItem("telefonoComoPago");
    localStorage.removeItem("productoDesdeTelefono");
    localStorage.removeItem("pagoDesdeTelefono");
    
    console.log('✅ Datos temporales limpiados');
  };

  // 🔥 CORRECCIÓN PRINCIPAL: useEffect para detectar teléfono y cambiar moneda automáticamente
  useEffect(() => {
    const hayTelefono = productos.some((p) => p.categoria === "Teléfono");
    
    console.log('🔍 Detectando teléfono en productos:', hayTelefono);
    console.log('📱 Productos actuales:', productos);
    
    if (hayTelefono) {
      console.log('📱 TELÉFONO DETECTADO - Cambiando moneda a USD');
      setMoneda("USD");
    } else {
      console.log('🛍️ SIN TELÉFONO - Cambiando moneda a ARS');
      setMoneda("ARS");
    }
  }, [productos]); // 🔥 CRÍTICO: Se ejecuta cada vez que cambian los productos

  useEffect(() => {
    const clienteDesdeTelefono = localStorage.getItem("clienteDesdeTelefono");
    if (clienteDesdeTelefono) {
      setCliente(clienteDesdeTelefono);
      localStorage.removeItem("clienteDesdeTelefono");
    }
  }, []);

  useEffect(() => {
    // Cargar datos del teléfono si vienen desde ventas/telefonos
    const ventaTelefonoPendiente = localStorage.getItem("ventaTelefonoPendiente");
    const pagoTelefonoPendiente = localStorage.getItem("pagoTelefonoPendiente");
    const clienteDesdeTelefono = localStorage.getItem("clienteDesdeTelefono");
    
    // Verificar si hay teléfono como parte de pago
    const telefonoComoPagoLS = localStorage.getItem("telefonoComoPago");
    if (telefonoComoPagoLS) {
      const telefonoData = JSON.parse(telefonoComoPagoLS);
      setTelefonoComoPago(telefonoData);
      localStorage.removeItem("telefonoComoPago");
    }
    
    if (ventaTelefonoPendiente && desdeTelefono) {
      const telefono = JSON.parse(ventaTelefonoPendiente);
      
      const productoTelefono = {
        categoria: "Teléfono",
        producto: `${telefono.marca} ${telefono.modelo}`,
        descripcion: telefono.estado,
        marca: telefono.marca || "—",
        modelo: telefono.modelo,
        color: telefono.color || "—",
        cantidad: 1,
        precioUnitario: telefono.precioVenta,
        precioARS: telefono.moneda === "ARS" ? telefono.precioVenta : null,
        precioUSD: telefono.moneda === "USD" ? telefono.precioVenta : null,
        moneda: telefono.moneda,
        codigo: telefono.stockID || telefono.modelo,
        tipo: "telefono",
        gb: telefono.gb || "",
        datosTelefonoCompletos: telefono
      };
      
      console.log('📱 Cargando teléfono desde localStorage:', productoTelefono);
      setProductos([productoTelefono]);
      // 🔥 NOTA: No establecer moneda aquí, se hará automáticamente en el useEffect de arriba
    }
    
    if (clienteDesdeTelefono) {
      setCliente(clienteDesdeTelefono);
    }
    
    if (pagoTelefonoPendiente) {
      const pagoData = JSON.parse(pagoTelefonoPendiente);
      setPago(pagoData);
    }
  }, [desdeTelefono]);

  useEffect(() => {
    const productoLS = localStorage.getItem("productoDesdeTelefono");
    const pagoLS = localStorage.getItem("pagoDesdeTelefono");

    if (productoLS) {
      const producto = JSON.parse(productoLS);
      setProductos((prev) => [...prev, producto]);
      localStorage.removeItem("productoDesdeTelefono");
    }

    if (pagoLS) {
      const datosPago = JSON.parse(pagoLS);
      setPago(datosPago);
      localStorage.removeItem("pagoDesdeTelefono");
    }
  }, []);

  const handlePagoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPago((prevPago) => ({
      ...prevPago,
      [name]: value,
    }));
  };
  
  useEffect(() => {
    const cargarNumeroVisual = async () => {
      if (!rol?.negocioID) return;
      const estimado = await obtenerUltimoNumeroVenta(rol.negocioID);
      setNumeroVenta(estimado);
    };
    cargarNumeroVisual();
  }, [rol?.negocioID]);

  useEffect(() => {
    if (!rol?.negocioID) return;
    const cargarClientes = async () => {
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/clientes`));
      const nombres = snap.docs.map((doc) => doc.data().nombre);
      setListaClientes(nombres);
    };
    cargarClientes();
  }, [rol?.negocioID]);

  if (!rol || !rol.negocioID || numeroVenta === "") return null;
  
  const hayTelefono = productos.some((p) => p.categoria === "Teléfono");

  // 🔧 CORRECCIÓN 3: Cálculo del subtotal
  const subtotal = productos.reduce((acc, p) => {
    if (hayTelefono) {
      // 📱 CON TELÉFONO: Usar precio USD
      const precioUSD = p.categoria === "Teléfono" 
        ? p.precioUnitario 
        : (p.precioUSD || p.precioUnitario);
      return acc + (precioUSD * p.cantidad);
    } else {
      // 🛍️ SIN TELÉFONO: Usar precio ARS
      return acc + (p.precioUnitario * p.cantidad);
    }
  }, 0);

  // Calcular descuentos
  const descuentoPago = pago.moneda === "USD" 
    ? Number(pago.montoUSD || 0) 
    : Number(pago.monto || 0);
  const descuentoTelefono = telefonoComoPago ? Number(telefonoComoPago.valorPago || 0) : 0;
  const totalDescuentos = descuentoPago + descuentoTelefono;

  // Total final
  const totalFinal = subtotal - totalDescuentos;

  console.log('🔍 DEBUG EN MODALVENTA:');
  console.log('📱 hayTelefono:', hayTelefono);
  console.log('💰 moneda que se pasa:', hayTelefono ? "USD" : "ARS");
  console.log('📦 productos actuales:', productos);

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        {/* 🔧 CORRECCIÓN: Tamaño más proporcionado del modal */}
        <div className="w-full h-full sm:w-[95%] md:w-[85%] lg:w-[75%] xl:w-[65%] 2xl:w-[55%] sm:h-[90vh] bg-white rounded-none sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
          
          {/* Header del Remito - Más compacto */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Logo mini de GestiOne */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex overflow-hidden shadow-lg">
                <div className="w-1/2 h-full bg-[#2c3e50] flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">G</span>
                </div>
                <div className="w-1/2 h-full bg-[#3498db] flex items-center justify-center">
                  <span className="text-white font-bold text-xs sm:text-sm">1</span>
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">Remito de Venta</h2>
                <p className="text-blue-100 text-sm">N° {numeroVenta}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-blue-100">Fecha</p>
                <p className="font-medium text-sm">{new Date().toLocaleDateString("es-AR")}</p>
              </div>
              <button
                onClick={() => {
                  // ✅ LIMPIAR DATOS ANTES DE CERRAR
                  limpiarDatosTemporales();
                  onClose?.();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-105"
              >
                ×
              </button>
            </div>
          </div>

          {/* Contenido scrolleable - Más compacto */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[#f8f9fa] min-h-0">
            
            {/* Información del Cliente - Más compacto */}
            <div className="bg-white rounded-lg border border-[#ecf0f1] p-3 sm:p-4 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[#2c3e50] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#3498db] rounded-md flex items-center justify-center text-white text-xs">👤</span>
                <span className="text-sm sm:text-base">Datos del Cliente</span>
              </h3>
              <Combobox value={cliente} onChange={setCliente}>
                <div className="relative z-[10000]">
                  <Combobox.Input
                    className="w-full p-2 sm:p-3 border border-[#bdc3c7] rounded-lg text-sm sm:text-base bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                    onChange={(e) => setQueryCliente(e.target.value)}
                    displayValue={() => cliente}
                    placeholder="🔍 Ingrese o seleccione el nombre del cliente..."
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <Combobox.Options className="absolute z-[10001] w-full bg-white border border-[#bdc3c7] rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl">
                    {listaClientes
                      .filter((c) => c.toLowerCase().includes(queryCliente.toLowerCase()))
                      .map((c, i) => (
                        <Combobox.Option
                          key={i}
                          value={c}
                          className={({ active }) =>
                            `px-3 py-2 cursor-pointer transition-colors text-[#2c3e50] text-sm ${
                              active ? "bg-[#3498db] text-white" : "hover:bg-[#ecf0f1]"
                            }`
                          }
                        >
                          {c}
                        </Combobox.Option>
                      ))}
                  </Combobox.Options>
                </div>
              </Combobox>
            </div>

            {/* Selector de Productos - Con z-index corregido */}
            <div className="bg-white rounded-lg border border-[#ecf0f1] p-3 sm:p-4 shadow-sm relative z-[9999]">
              <h3 className="text-sm sm:text-base font-semibold text-[#2c3e50] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#27ae60] rounded-md flex items-center justify-center text-white text-xs">🛍️</span>
                <span className="text-sm sm:text-base">Agregar Productos</span>
              </h3>
              <SelectorProductoVentaGeneral
                productos={productos}
                setProductos={setProductos}
                setPrecio={setPrecio}
                setMarca={setMarca}
                setModelo={setModelo}
                setCategoria={setCategoria}
                setColor={setColor}
                setCodigo={setCodigo}
                setMoneda={setMoneda}
                filtroTexto={filtroTexto}
                setFiltroTexto={setFiltroTexto}
                hayTelefono={hayTelefono}
              />
            </div>

            {/* Tabla de Productos - Más compacta */}
            <div className="bg-white rounded-lg border border-[#ecf0f1] shadow-sm overflow-hidden">
              <div className="bg-[#2c3e50] p-2 sm:p-3 text-white">
                <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <span className="text-sm sm:text-base">📋 Detalle de Productos</span>
                </h3>
              </div>
              
              {/* Vista de escritorio - tabla más compacta */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-[#ecf0f1]">
                    <tr>
                      <th className="p-2 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">📦 Categoría</th>
                      <th className="p-2 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">🏷️ Producto</th>
                      <th className="p-2 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">🏭 Marca</th>
                      <th className="p-2 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">📱 Modelo</th>
                      <th className="p-2 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">🎨 Color</th>
                      <th className="p-2 text-right font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">💰 Precio</th>
                      <th className="p-2 text-right font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">📊 Cant.</th>
                      <th className="p-2 text-right font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs">💵 Total</th>
                      <th className="p-2 text-center font-semibold text-[#2c3e50] border border-[#bdc3c7] w-10 text-xs">🗑️</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.length > 0 ? (
                      productos.map((p, i) => {
                        const isEven = i % 2 === 0;

                        return (
                          <tr key={i} className={`transition-colors duration-200 hover:bg-[#ecf0f1] ${isEven ? "bg-white" : "bg-[#f8f9fa]"}`}>
                            <td className="p-2 border border-[#bdc3c7]">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                p.categoria === "Teléfono" 
                                  ? 'bg-[#27ae60] text-white'
                                  : p.categoria === "Accesorio"
                                  ? 'bg-[#3498db] text-white'
                                  : p.categoria === "Repuesto"
                                  ? 'bg-[#f39c12] text-white'
                                  : 'bg-[#7f8c8d] text-white'
                              }`}>
                                {p.categoria}
                              </span>
                            </td>
                            <td className="p-2 border border-[#bdc3c7] font-medium text-[#2c3e50] text-xs">{p.producto}</td>
                            <td className="p-2 border border-[#bdc3c7] text-[#7f8c8d] text-xs">{p.marca}</td>
                            <td className="p-2 border border-[#bdc3c7] text-[#7f8c8d] text-xs">{p.modelo}</td>
                            <td className="p-2 border border-[#bdc3c7]">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50]">
                                {p.color}
                              </span>
                            </td>
                            {/* 🔧 CORRECCIÓN 1: Mostrar precios correctos - PRECIO */}
                            <td className="p-2 border border-[#bdc3c7] text-right font-medium">
                              <span className="text-[#27ae60] font-semibold text-xs">
                                {hayTelefono ? (
                                  // 📱 CON TELÉFONO: Todo en USD
                                  p.categoria === "Teléfono" 
                                    ? `USD $${Number(p.precioUnitario).toLocaleString("es-AR")}`
                                    : `USD $${Number(p.precioUSD || p.precioUnitario).toLocaleString("es-AR")}`
                                ) : (
                                  // 🛍️ SIN TELÉFONO: Todo en ARS
                                  `$${Number(p.precioUnitario).toLocaleString("es-AR")}`
                                )}
                              </span>
                            </td>
                            <td className="p-2 border border-[#bdc3c7] text-right">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-[#3498db] text-white">
                                {p.cantidad}
                              </span>
                            </td>
                            {/* 🔧 CORRECCIÓN 1: Mostrar precios correctos - TOTAL */}
                            <td className="p-2 border border-[#bdc3c7] text-right font-bold text-[#27ae60] text-xs">
                              {hayTelefono ? (
                                // 📱 CON TELÉFONO: Todo en USD
                                p.categoria === "Teléfono"
                                  ? `USD $${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                                  : `USD $${((p.precioUSD || p.precioUnitario) * p.cantidad).toLocaleString("es-AR")}`  
                              ) : (
                                // 🛍️ SIN TELÉFONO: Todo en ARS
                                `$${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                              )}
                            </td>
                            <td className="p-2 border border-[#bdc3c7] text-center">
                              <button
                                onClick={() => {
                                  const copia = [...productos];
                                  copia.splice(i, 1);
                                  setProductos(copia);
                                }}
                                className="w-6 h-6 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 text-xs"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="p-6 text-center border border-[#bdc3c7]">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                              <span className="text-2xl">📦</span>
                            </div>
                            <div>
                              <p className="text-base font-medium text-[#7f8c8d]">No hay productos cargados</p>
                              <p className="text-sm text-[#bdc3c7]">Use el selector arriba para agregar productos</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Vista móvil/tablet - cards más compactas */}
              <div className="lg:hidden p-3 space-y-3">
                {productos.length > 0 ? (
                  productos.map((p, i) => {
                    return (
                      <div key={i} className="bg-[#f8f9fa] rounded-lg border border-[#ecf0f1] p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              p.categoria === "Teléfono" 
                                ? 'bg-[#27ae60] text-white'
                                : p.categoria === "Accesorio"
                                ? 'bg-[#3498db] text-white'
                                : p.categoria === "Repuesto"
                                ? 'bg-[#f39c12] text-white'
                                : 'bg-[#7f8c8d] text-white'
                            }`}>
                              {p.categoria}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              const copia = [...productos];
                              copia.splice(i, 1);
                              setProductos(copia);
                            }}
                            className="w-6 h-6 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 text-sm"
                          >
                            ×
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="font-bold text-[#2c3e50] text-sm">{p.producto}</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[#7f8c8d]">Marca:</span>
                              <span className="ml-1 text-[#2c3e50]">{p.marca}</span>
                            </div>
                            <div>
                              <span className="text-[#7f8c8d]">Modelo:</span>
                              <span className="ml-1 text-[#2c3e50]">{p.modelo}</span>
                            </div>
                            <div>
                              <span className="text-[#7f8c8d]">Color:</span>
                              <span className="ml-1 text-[#2c3e50]">{p.color}</span>
                            </div>
                            <div>
                              <span className="text-[#7f8c8d]">Cantidad:</span>
                              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-[#3498db] text-white">
                                {p.cantidad}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-[#ecf0f1]">
                            <span className="text-[#7f8c8d] text-xs">Precio unitario:</span>
                            {/* 🔧 CORRECCIÓN 2: Vista móvil - PRECIO */}
                            <span className="text-[#27ae60] font-semibold text-sm">
                              {hayTelefono ? (
                                // 📱 CON TELÉFONO: Todo en USD
                                p.categoria === "Teléfono"
                                  ? `USD ${Number(p.precioUnitario).toLocaleString("es-AR")}`
                                  : `USD ${Number(p.precioUSD || p.precioUnitario).toLocaleString("es-AR")}`
                              ) : (
                                // 🛍️ SIN TELÉFONO: Todo en ARS
                                `${Number(p.precioUnitario).toLocaleString("es-AR")}`
                              )}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-[#2c3e50] text-sm">Total:</span>
                            {/* 🔧 CORRECCIÓN 2: Vista móvil - TOTAL */}
                            <span className="text-[#27ae60] text-base">
                              {hayTelefono ? (
                                // 📱 CON TELÉFONO: Todo en USD
                                p.categoria === "Teléfono"
                                  ? `USD ${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                                  : `USD ${((p.precioUSD || p.precioUnitario) * p.cantidad).toLocaleString("es-AR")}`
                              ) : (
                                // 🛍️ SIN TELÉFONO: Todo en ARS
                                `${(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-12 h-12 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-medium text-[#7f8c8d]">No hay productos cargados</p>
                      <p className="text-sm text-[#bdc3c7]">Use el selector arriba para agregar productos</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sección de Pagos y Descuentos - Más compacta */}
            {((pago.monto && pago.monto > 0) || (pago.montoUSD && pago.montoUSD > 0) || telefonoComoPago) && (
              <div className="bg-gradient-to-r from-[#ecf0f1] to-white rounded-lg border border-[#3498db] p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-semibold text-[#2c3e50] mb-2 sm:mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#3498db] rounded-md flex items-center justify-center text-white text-xs">💳</span>
                  <span className="text-sm sm:text-base">Pagos Registrados</span>
                </h3>
                <div className="space-y-2">
                  {((pago.monto && pago.monto > 0) || (pago.montoUSD && pago.montoUSD > 0)) && (
                    <div className="bg-white rounded-lg p-3 border border-[#ecf0f1] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">💰</span>
                          <div>
                            <p className="font-medium text-[#2c3e50] text-sm">Pago en {pago.formaPago}</p>
                            <p className="text-xs text-[#7f8c8d]">{pago.observaciones}</p>
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#27ae60]">
                          {pago.moneda === "USD" 
                            ? `USD ${Number(pago.montoUSD || 0).toLocaleString("es-AR")}`
                            : `${Number(pago.monto || 0).toLocaleString("es-AR")} ARS`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {telefonoComoPago && (
                    <div className="bg-white rounded-lg p-3 border border-[#ecf0f1] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">📱</span>
                          <div>
                            <p className="font-medium text-[#2c3e50] text-sm">Teléfono como parte de pago</p>
                            <p className="text-xs text-[#7f8c8d]">{telefonoComoPago.marca} {telefonoComoPago.modelo}</p>
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#3498db]">
                          {telefonoComoPago.moneda === "USD" ? "USD $" : "$"}
                          {Number(telefonoComoPago.valorPago).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer con Totales y Acciones - Más compacto */}
          <div className="bg-[#ecf0f1] border-t border-[#bdc3c7] p-3 flex-shrink-0">
            {/* Resumen de Totales */}
            <div className="bg-white rounded-lg border border-[#bdc3c7] p-3 mb-3 shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="font-medium text-[#2c3e50]">Subtotal:</span>
                  <span className="font-bold text-[#2c3e50]">
                    {hayTelefono ? "USD $" : "$"}{subtotal.toLocaleString("es-AR")}
                  </span>
                </div>
                
                {totalDescuentos > 0 && (
                  <>
                    <div className="border-t border-[#ecf0f1] pt-2">
                      <div className="flex justify-between items-center text-xs sm:text-sm text-[#27ae60]">
                        <span>Descuentos aplicados:</span>
                        <span className="font-medium">-${totalDescuentos.toLocaleString("es-AR")}</span>
                      </div>
                    </div>
                    <div className="border-t border-[#bdc3c7] pt-2">
                      <div className="flex justify-between items-center text-base sm:text-lg">
                        <span className="font-bold text-[#2c3e50]">TOTAL A PAGAR:</span>
                        <span className="font-bold text-[#3498db] text-lg sm:text-xl">
                          {hayTelefono ? "USD $" : "$"}{Math.max(0, totalFinal).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  </>
                )}
                
                {totalDescuentos === 0 && (
                  <div className="border-t border-[#bdc3c7] pt-2">
                    <div className="flex justify-between items-center text-base sm:text-lg">
                      <span className="font-bold text-[#2c3e50]">TOTAL:</span>
                      <span className="font-bold text-[#3498db] text-lg sm:text-xl">
                        {hayTelefono ? "USD $" : "$"}{subtotal.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Botones de Acción - Más compactos */}
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={() => {
                  const confirmar = window.confirm('¿Estás seguro de cancelar esta venta? Se perderán todos los datos.');
                  if (confirmar) {
                    limpiarDatosTemporales();
                    onClose?.();
                  }
                }}
                className="w-full sm:w-auto bg-[#e74c3c] hover:bg-[#c0392b] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                ❌ Cancelar Venta
              </button>

              <button
                onClick={() => {
                  console.log("COBRAR PRESIONADO");
                  setModalPagoAbierto(true);
                }}
                className="w-full sm:w-auto bg-[#27ae60] hover:bg-[#229954] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm"
             >
                💳 COBRAR
              </button>

              <BotonGuardarVenta
                cliente={cliente}
                productos={productos}
                fecha={new Date().toLocaleDateString("es-AR")}
                observaciones=""
                pago={pago}
                moneda={hayTelefono ? "USD" : "ARS"}
                cotizacion={cotizacion} 
                onGuardar={() => {
                  // ✅ LIMPIAR DATOS DESPUÉS DE GUARDAR EXITOSAMENTE
                  limpiarDatosTemporales();
                  setRefrescar(prev => !prev);
                  onClose?.();
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de pago - Con z-index superior */}
      {modalPagoAbierto && (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <ModalPago
            mostrar={modalPagoAbierto}
            pago={pago}
            onClose={() => setModalPagoAbierto(false)}
            handlePagoChange={(e) => {
              const { name, value } = e.target;
              setPago((prev) => ({
                ...prev,
                [name]: value,
              }));
            }}
            onGuardarPago={(nuevoPago) => {
              console.log('💰 Pago recibido del ModalPago:', nuevoPago);
              
              const pagoConvertido = {
                monto: nuevoPago.moneda === "ARS" ? (nuevoPago.monto || "") : "",
                montoUSD: nuevoPago.moneda === "USD" ? (nuevoPago.montoUSD || "") : "",
                moneda: nuevoPago.moneda || "ARS",
                formaPago: nuevoPago.formaPago || "",
                destino: nuevoPago.destino || "",
                observaciones: nuevoPago.observaciones || "",
              };
              console.log('🔄 Pago convertido para ModalVenta:', pagoConvertido);
              
              // ✅ ACTUALIZAR ESTADO LOCAL
              setPago(pagoConvertido);
              
              // ✅ MOSTRAR FEEDBACK VISUAL
              setGuardadoConExito(true);
              setTimeout(() => setGuardadoConExito(false), 2000);
              
              // ✅ CERRAR MODAL
              setModalPagoAbierto(false);
              
              console.log('✅ Pago actualizado en ModalVenta. Nuevo estado:', pagoConvertido);
            }}
            guardadoConExito={guardadoConExito}
          />
        </div>
      )}
    </>
  );
}