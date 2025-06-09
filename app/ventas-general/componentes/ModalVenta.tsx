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
      
      setProductos([productoTelefono]);
      setMoneda(telefono.moneda === "USD" ? "USD" : "ARS");
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

  // Calcular subtotal
  const subtotal = productos.reduce((acc, p) => {
    const precio = hayTelefono
      ? p.precioUSD || p.precioUnitario
      : p.precioARS || p.precioUnitario;
    return acc + (precio * p.cantidad);
  }, 0);

  // Calcular descuentos
  const descuentoPago = pago.moneda === "USD" 
    ? Number(pago.montoUSD || 0) 
    : Number(pago.monto || 0);
  const descuentoTelefono = telefonoComoPago ? Number(telefonoComoPago.valorPago || 0) : 0;
  const totalDescuentos = descuentoPago + descuentoTelefono;

  // Total final
  const totalFinal = subtotal - totalDescuentos;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-w-7xl bg-white rounded-none sm:rounded-2xl shadow-2xl border border-gray-200 sm:max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header del Remito - Responsive */}
        <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-3 sm:p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Logo mini de GestiOne */}
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex overflow-hidden shadow-lg">
              <div className="w-1/2 h-full bg-[#2c3e50] flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">G</span>
              </div>
              <div className="w-1/2 h-full bg-[#3498db] flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">1</span>
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Remito de Venta</h2>
              <p className="text-blue-100 text-sm">N° {numeroVenta}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-blue-100">Fecha</p>
              <p className="font-medium">{new Date().toLocaleDateString("es-AR")}</p>
            </div>
            <button
              onClick={() => {
                // ✅ LIMPIAR DATOS ANTES DE CERRAR
                limpiarDatosTemporales();
                onClose?.();
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-105"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido scrolleable - Responsive */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-[#f8f9fa] min-h-0">
          
          {/* Información del Cliente - Responsive */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 sm:p-6 shadow-md">
            <h3 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center text-white text-sm">👤</span>
              <span className="text-sm sm:text-base">Datos del Cliente</span>
            </h3>
            <Combobox value={cliente} onChange={setCliente}>
              <div className="relative">
                <Combobox.Input
                  className="w-full p-3 sm:p-4 border border-[#bdc3c7] rounded-lg text-base sm:text-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                  onChange={(e) => setQueryCliente(e.target.value)}
                  displayValue={() => cliente}
                  placeholder="🔍 Ingrese o seleccione el nombre del cliente..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <Combobox.Options className="absolute z-10 w-full bg-white border border-[#bdc3c7] rounded-lg mt-1 max-h-48 sm:max-h-60 overflow-y-auto shadow-xl">
                  {listaClientes
                    .filter((c) => c.toLowerCase().includes(queryCliente.toLowerCase()))
                    .map((c, i) => (
                      <Combobox.Option
                        key={i}
                        value={c}
                        className={({ active }) =>
                          `px-3 sm:px-4 py-2 sm:py-3 cursor-pointer transition-colors text-[#2c3e50] text-sm sm:text-base ${
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

          {/* Selector de Productos - Responsive */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] p-4 sm:p-6 shadow-md">
            <h3 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-6 h-6 sm:w-8 sm:h-8 bg-[#27ae60] rounded-lg flex items-center justify-center text-white text-sm">🛍️</span>
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

          {/* Tabla de Productos - Completamente Responsive */}
          <div className="bg-white rounded-xl border border-[#ecf0f1] shadow-md overflow-hidden">
            <div className="bg-[#2c3e50] p-3 sm:p-4 text-white">
              <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <span className="text-sm sm:text-base">📋 Detalle de Productos</span>
              </h3>
            </div>
            
            {/* Vista de escritorio - tabla completa */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-[#ecf0f1]">
                  <tr>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">📦 Categoría</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">🏷️ Producto</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">🏭 Marca</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">📱 Modelo</th>
                    <th className="p-2 sm:p-3 text-left font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">🎨 Color</th>
                    <th className="p-2 sm:p-3 text-right font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">💰 Precio</th>
                    <th className="p-2 sm:p-3 text-right font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">📊 Cant.</th>
                    <th className="p-2 sm:p-3 text-right font-semibold text-[#2c3e50] border border-[#bdc3c7] text-xs sm:text-sm">💵 Total</th>
                    <th className="p-2 sm:p-3 text-center font-semibold text-[#2c3e50] border border-[#bdc3c7] w-12 sm:w-16 text-xs sm:text-sm">🗑️</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.length > 0 ? (
                    productos.map((p, i) => {
                      const precioMostrar = hayTelefono ? p.precioUSD || p.precioUnitario : p.precioARS || p.precioUnitario;
                      const monedaProducto = hayTelefono ? "USD" : "ARS";
                      const isEven = i % 2 === 0;

                      return (
                        <tr key={i} className={`transition-colors duration-200 hover:bg-[#ecf0f1] ${isEven ? "bg-white" : "bg-[#f8f9fa]"}`}>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7]">
                            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
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
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] font-medium text-[#2c3e50] text-xs sm:text-sm">{p.producto}</td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] text-[#7f8c8d] text-xs sm:text-sm">{p.marca}</td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] text-[#7f8c8d] text-xs sm:text-sm">{p.modelo}</td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7]">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-[#ecf0f1] text-[#2c3e50]">
                              {p.color}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] text-right font-medium">
                            <span className="text-[#27ae60] font-semibold text-xs sm:text-sm">
                              {monedaProducto === "USD" ? "USD $" : "$"}{" "}
                              {Number(precioMostrar).toLocaleString("es-AR")}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] text-right">
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold bg-[#3498db] text-white">
                              {p.cantidad}
                            </span>
                          </td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] text-right font-bold text-[#27ae60] text-xs sm:text-sm">
                            ${(precioMostrar * p.cantidad).toLocaleString("es-AR")}
                          </td>
                          <td className="p-2 sm:p-3 border border-[#bdc3c7] text-center">
                            <button
                              onClick={() => {
                                const copia = [...productos];
                                copia.splice(i, 1);
                                setProductos(copia);
                              }}
                              className="w-6 h-6 sm:w-8 sm:h-8 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105 text-xs sm:text-sm"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-8 sm:p-12 text-center border border-[#bdc3c7]">
                        <div className="flex flex-col items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                            <span className="text-2xl sm:text-3xl">📦</span>
                          </div>
                          <div>
                            <p className="text-base sm:text-lg font-medium text-[#7f8c8d]">No hay productos cargados</p>
                            <p className="text-xs sm:text-sm text-[#bdc3c7]">Use el selector arriba para agregar productos</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Vista móvil/tablet - cards apiladas */}
            <div className="lg:hidden p-3 sm:p-4 space-y-3">
              {productos.length > 0 ? (
                productos.map((p, i) => {
                  const precioMostrar = hayTelefono ? p.precioUSD || p.precioUnitario : p.precioARS || p.precioUnitario;
                  const monedaProducto = hayTelefono ? "USD" : "ARS";

                  return (
                    <div key={i} className="bg-[#f8f9fa] rounded-lg border border-[#ecf0f1] p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
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
                        <h4 className="font-bold text-[#2c3e50] text-sm sm:text-base">{p.producto}</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
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
                            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[#3498db] text-white">
                              {p.cantidad}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-[#ecf0f1]">
                          <span className="text-[#7f8c8d] text-xs sm:text-sm">Precio unitario:</span>
                          <span className="text-[#27ae60] font-semibold text-sm sm:text-base">
                            {monedaProducto === "USD" ? "USD $" : "$"}{Number(precioMostrar).toLocaleString("es-AR")}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#2c3e50] text-sm sm:text-base">Total:</span>
                          <span className="text-[#27ae60] text-base sm:text-lg">
                            ${(precioMostrar * p.cantidad).toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-16 h-16 bg-[#ecf0f1] rounded-full flex items-center justify-center">
                    <span className="text-3xl">📦</span>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium text-[#7f8c8d]">No hay productos cargados</p>
                    <p className="text-sm text-[#bdc3c7]">Use el selector arriba para agregar productos</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Pagos y Descuentos - Responsive */}
          {((pago.monto && pago.monto > 0) || (pago.montoUSD && pago.montoUSD > 0) || telefonoComoPago) && (
            <div className="bg-gradient-to-r from-[#ecf0f1] to-white rounded-xl border border-[#3498db] p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-[#2c3e50] mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-lg flex items-center justify-center text-white text-sm">💳</span>
                <span className="text-sm sm:text-base">Pagos Registrados</span>
              </h3>
              <div className="space-y-3">
                {((pago.monto && pago.monto > 0) || (pago.montoUSD && pago.montoUSD > 0)) && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-[#ecf0f1] shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="w-6 h-6 sm:w-8 sm:h-8 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-sm">💰</span>
                        <div>
                          <p className="font-medium text-[#2c3e50] text-sm sm:text-base">Pago en {pago.formaPago}</p>
                          <p className="text-xs sm:text-sm text-[#7f8c8d]">{pago.observaciones}</p>
                        </div>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-[#27ae60]">
                        {pago.moneda === "USD" 
                          ? `USD ${Number(pago.montoUSD || 0).toLocaleString("es-AR")}`
                          : `${Number(pago.monto || 0).toLocaleString("es-AR")} ARS`
                        }
                      </span>
                    </div>
                  </div>
                )}
                
                {telefonoComoPago && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 border border-[#ecf0f1] shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="w-6 h-6 sm:w-8 sm:h-8 bg-[#3498db] rounded-full flex items-center justify-center text-white text-sm">📱</span>
                        <div>
                          <p className="font-medium text-[#2c3e50] text-sm sm:text-base">Teléfono como parte de pago</p>
                          <p className="text-xs sm:text-sm text-[#7f8c8d]">{telefonoComoPago.marca} {telefonoComoPago.modelo}</p>
                        </div>
                      </div>
                      <span className="text-base sm:text-lg font-bold text-[#3498db]">
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

        {/* Footer con Totales y Acciones - Responsive */}
        <div className="bg-[#ecf0f1] border-t border-[#bdc3c7] p-3 sm:p-4 flex-shrink-0">
          {/* Resumen de Totales */}
          <div className="bg-white rounded-xl border border-[#bdc3c7] p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center text-base sm:text-lg">
                <span className="font-medium text-[#2c3e50]">Subtotal:</span>
                <span className="font-bold text-[#2c3e50]">
                  {hayTelefono ? "USD $" : "$"}{subtotal.toLocaleString("es-AR")}
                </span>
              </div>
              
              {totalDescuentos > 0 && (
                <>
                  <div className="border-t border-[#ecf0f1] pt-2 sm:pt-3">
                    <div className="flex justify-between items-center text-xs sm:text-sm text-[#27ae60]">
                      <span>Descuentos aplicados:</span>
                      <span className="font-medium">-${totalDescuentos.toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                  <div className="border-t border-[#bdc3c7] pt-2 sm:pt-3">
                    <div className="flex justify-between items-center text-lg sm:text-xl">
                      <span className="font-bold text-[#2c3e50]">TOTAL A PAGAR:</span>
                      <span className="font-bold text-[#3498db] text-xl sm:text-2xl">
                        {hayTelefono ? "USD $" : "$"}{Math.max(0, totalFinal).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {totalDescuentos === 0 && (
                <div className="border-t border-[#bdc3c7] pt-2 sm:pt-3">
                  <div className="flex justify-between items-center text-lg sm:text-xl">
                    <span className="font-bold text-[#2c3e50]">TOTAL:</span>
                    <span className="font-bold text-[#3498db] text-xl sm:text-2xl">
                      {hayTelefono ? "USD $" : "$"}{subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción - Responsive */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              onClick={() => {
                const confirmar = window.confirm('¿Estás seguro de cancelar esta venta? Se perderán todos los datos.');
                if (confirmar) {
                  limpiarDatosTemporales();
                  onClose?.();
                }
              }}
              className="w-full sm:w-auto bg-[#e74c3c] hover:bg-[#c0392b] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              ❌ Cancelar Venta
            </button>

            <button
              onClick={() => {
                console.log("COBRAR PRESIONADO");
                setModalPagoAbierto(true);
              }}
              className="w-full sm:w-auto bg-[#27ae60] hover:bg-[#229954] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
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
              onGuardar={() => {
                // ✅ LIMPIAR DATOS DESPUÉS DE GUARDAR EXITOSAMENTE
                limpiarDatosTemporales();
                setRefrescar(prev => !prev);
                onClose?.();
              }}
            />
          </div>
        </div>

        // 🔧 REEMPLAZAR la sección del ModalPago en ModalVenta (líneas 675-690 aprox):

{/* Modal de pago */}
{modalPagoAbierto && (
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
)}
      </div>
    </div>
  );
}