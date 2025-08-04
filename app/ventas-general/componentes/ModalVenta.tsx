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

  // ✅ ESTADO DE COTIZACIÓN EDITABLE
  const [cotizacionManual, setCotizacionManual] = useState(cotizacion || 1000);

  // Estado para el teléfono como parte de pago
  const [telefonoComoPago, setTelefonoComoPago] = useState<any>(null);

  // ✅ SINCRONIZAR CON COTIZACIÓN AUTOMÁTICA
  useEffect(() => {
    if (cotizacion && cotizacion > 0) {
      setCotizacionManual(cotizacion);
    }
  }, [cotizacion]);

  // 🔥 useEffect para detectar cliente recién agregado
  useEffect(() => {
    const clienteNuevo = localStorage.getItem("clienteNuevo");
    const ventaModalTemporal = localStorage.getItem("ventaModalTemporal");
    
    if (clienteNuevo && ventaModalTemporal) {
      try {
        const datosTemporales = JSON.parse(ventaModalTemporal);
        
        // Solo restaurar si venía del modal de venta específicamente
        if (datosTemporales.origen === "modal-venta") {
          console.log('🔄 Restaurando datos del modal y cargando cliente nuevo:', clienteNuevo);
          
          // Cargar el cliente nuevo
          setCliente(clienteNuevo);
          
          // Restaurar datos temporales
          if (datosTemporales.productos?.length > 0) {
            setProductos(datosTemporales.productos);
          }
          if (datosTemporales.pago) {
            setPago(datosTemporales.pago);
          }
          if (datosTemporales.telefonoComoPago) {
            setTelefonoComoPago(datosTemporales.telefonoComoPago);
          }
          
          // Limpiar localStorage
          localStorage.removeItem("clienteNuevo");
          localStorage.removeItem("ventaModalTemporal");
          
          // Recargar lista de clientes
          if (rol?.negocioID) {
            const recargarClientes = async () => {
              const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/clientes`));
              const nombres = snap.docs.map((doc) => doc.data().nombre);
              setListaClientes(nombres);
            };
            recargarClientes();
          }
        }
      } catch (error) {
        console.error('Error restaurando datos temporales:', error);
        localStorage.removeItem("ventaModalTemporal");
      }
    }
  }, [rol?.negocioID]);

  const pagoInicialCompleto = pagoInicial || {
    monto: "",
    montoUSD: "",
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
    localStorage.removeItem("ventaModalTemporal");
    localStorage.removeItem("clienteNuevo");
    
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
      
      console.log('📱 Cargando teléfono desde localStorage:', productoTelefono);
      setProductos([productoTelefono]);
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

  // ✅ CÁLCULOS SEPARADOS POR MONEDA
  const calcularTotales = () => {
    let totalARS = 0;
    let totalUSD = 0;
    
    // 🔍 Detectar si hay teléfonos para determinar el tipo de venta
    const hayTelefono = productos.some(p => p.categoria === "Teléfono");
    
    productos.forEach((p) => {
      const cantidad = Number(p.cantidad || 1);
      
      if (hayTelefono) {
        // 🔥 VENTA MIXTA (con teléfono): Sistema dual puro
        if (p.moneda === "USD" || p.categoria === "Teléfono") {
          const precioUSD = Number(p.precioUSD || p.precioUnitario || 0);
          totalUSD += precioUSD * cantidad;
        } else {
          const precioARS = Number(p.precioARS || p.precioUnitario || 0);
          totalARS += precioARS * cantidad;
        }
      } else {
        // 🛍️ VENTA SOLO ACCESORIOS: Convertir USD a ARS
        if (p.moneda === "USD") {
          const precioUSD = Number(p.precioUSD || p.precioUnitario || 0);
          const precioConvertidoARS = precioUSD * cotizacionManual;
          totalARS += precioConvertidoARS * cantidad;
        } else {
          const precioARS = Number(p.precioARS || p.precioUnitario || 0);
          totalARS += precioARS * cantidad;
        }
      }
    });
    
    return { totalARS, totalUSD };
  };
  const { totalARS, totalUSD } = calcularTotales();

  // ✅ CÁLCULO DE PAGOS DUALES
  const pagoARS = Number(pago.monto || 0);
  const pagoUSD = Number(pago.montoUSD || 0);

  // ✅ TELÉFONO COMO PAGO (mantener lógica existente)
  const descuentoTelefonoPago = telefonoComoPago ? Number(telefonoComoPago.valorPago || 0) : 0;
  const monedaTelefonoPago = telefonoComoPago?.moneda || "ARS";

  // ✅ APLICAR DESCUENTOS POR MONEDA
  let saldoARS = totalARS - pagoARS;
  let saldoUSD = totalUSD - pagoUSD;

  // Aplicar teléfono como pago según su moneda
  if (telefonoComoPago) {
    if (monedaTelefonoPago === "USD") {
      saldoUSD -= descuentoTelefonoPago;
    } else {
      saldoARS -= descuentoTelefonoPago;
    }
  }

  // ✅ TOTAL APROXIMADO EN ARS (para referencia)
  const totalAproximadoARS = totalARS + (totalUSD * cotizacionManual);
  const pagosAproximadosARS = pagoARS + (pagoUSD * cotizacionManual) + 
    (telefonoComoPago ? (monedaTelefonoPago === "USD" ? descuentoTelefonoPago * cotizacionManual : descuentoTelefonoPago) : 0);
  const saldoAproximadoARS = totalAproximadoARS - pagosAproximadosARS;

  console.log('💰 DEBUG CÁLCULOS DUALES:', {
    totalARS,
    totalUSD,
    pagoARS,
    pagoUSD,
    saldoARS,
    saldoUSD,
    cotizacionManual,
    totalAproximadoARS,
    productos: productos.map(p => ({
      producto: p.producto,
      moneda: p.moneda || (p.categoria === "Teléfono" ? "USD" : "ARS"),
      precio: p.precioUnitario
    }))
  });

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
        {/* 🔧 CORRECCIÓN: Tamaño más proporcionado del modal */}
        <div className="w-full h-full sm:w-[95%] md:w-[85%] lg:w-[75%] xl:w-[65%] 2xl:w-[55%] sm:h-[95vh] bg-white rounded-none sm:rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col" style={{ isolation: 'isolate' }}>
          
          {/* Header del Remito - Con cotización editable */}
          <div className="bg-gradient-to-r from-[#2c3e50] to-[#3498db] text-white p-2 sm:p-3 flex justify-between items-center flex-shrink-0">
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
            
            {/* Centro: Cotización editable */}
            <div className="hidden sm:flex items-center gap-3 bg-white/20 rounded-lg px-3 py-2">
              <span className="text-blue-100 text-xs font-medium">💱 USD:</span>
              <div className="flex items-center gap-1">
                <span className="text-white text-sm">$</span>
                <input
                  type="number"
                  value={cotizacionManual}
                  onChange={(e) => setCotizacionManual(Number(e.target.value) || 1000)}
                  className="w-16 bg-transparent text-white text-sm font-bold border-b border-white/30 focus:border-white outline-none text-center"
                  min="1"
                  step="1"
                  title="Cotización USD a ARS"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-blue-100">Fecha</p>
                <p className="font-medium text-sm">{new Date().toLocaleDateString("es-AR")}</p>
              </div>
              <button
                onClick={() => {
                  limpiarDatosTemporales();
                  onClose?.();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold transition-all duration-200 hover:scale-105"
              >
                ×
              </button>
            </div>
          </div>

          {/* Cotización móvil - Solo visible en pantallas pequeñas */}
          <div className="sm:hidden bg-[#34495e] text-white p-2 flex justify-center items-center gap-2">
            <span className="text-xs font-medium">💱 Cotización USD:</span>
            <div className="flex items-center gap-1">
              <span className="text-sm">$</span>
              <input
                type="number"
                value={cotizacionManual}
                onChange={(e) => setCotizacionManual(Number(e.target.value) || 1000)}
                className="w-16 bg-transparent text-white text-sm font-bold border-b border-white/30 focus:border-white outline-none text-center"
                min="1"
                step="1"
              />
            </div>
          </div>

          {/* Contenido scrolleable - Con padding extra para dropdowns */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 sm:space-y-3 bg-[#f8f9fa] min-h-0 pb-[200px]">
            
            {/* Información del Cliente - CON BOTÓN AGREGAR */}
            <div className="bg-white rounded-lg border border-[#ecf0f1] p-3 sm:p-4 shadow-sm"
                 style={{ 
                   zIndex: queryCliente ? 50000 : 'auto', 
                   position: queryCliente ? 'relative' : 'static' 
                 }}>
              <h3 className="text-sm sm:text-base font-semibold text-[#2c3e50] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#3498db] rounded-md flex items-center justify-center text-white text-xs">👤</span>
                <span className="text-sm sm:text-base">Datos del Cliente</span>
              </h3>
              
              {/* 🔥 CONTENEDOR CON COMBOBOX + BOTÓN */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox value={cliente} onChange={setCliente}>
                    <div className="relative" 
                         style={{ 
                           zIndex: queryCliente ? 50001 : 'auto' 
                         }}>
                      <Combobox.Input
                        className="w-full p-2 sm:p-3 border border-[#bdc3c7] rounded-lg text-sm sm:text-base bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
                        onChange={(e) => setQueryCliente(e.target.value)}
                        displayValue={() => cliente}
                        placeholder="🔍 Ingrese o seleccione el nombre del cliente..."
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      <Combobox.Options 
                        className="absolute w-full bg-white border border-[#bdc3c7] rounded-lg mt-1 max-h-48 overflow-y-auto shadow-xl"
                        style={{ zIndex: 50002 }}
                      >
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
                
                {/* 🔥 BOTÓN AGREGAR CLIENTE */}
                <button
                  onClick={() => {
                    // Guardar datos temporales antes de navegar
                    localStorage.setItem("ventaModalTemporal", JSON.stringify({
                      cliente,
                      productos,
                      pago,
                      telefonoComoPago,
                      origen: "modal-venta"
                    }));
                    
                    // Navegar a agregar cliente
                    window.location.href = "/clientes/agregar?origen=modal-venta";
                  }}
                  type="button"
                  className="bg-[#27ae60] hover:bg-[#229954] text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-1 text-sm sm:text-base min-w-[44px]"
                  title="Agregar nuevo cliente"
                >
                  <span className="text-lg">+</span>
                  <span className="hidden sm:inline">Cliente</span>
                </button>
              </div>
            </div>

            {/* Selector de Productos - Con z-index corregido */}
            <div className="bg-white rounded-lg border border-[#ecf0f1] p-3 sm:p-4 shadow-sm">
              <h3 className="text-sm sm:text-base font-semibold text-[#2c3e50] mb-2 sm:mb-3 flex items-center gap-2">
                <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#27ae60] rounded-md flex items-center justify-center text-white text-xs">🛍️</span>
                <span className="text-sm sm:text-base">Agregar Productos</span>
              </h3>
              <div className="relative" style={{ zIndex: 100000 }}>
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
                  hayTelefono={false}
                />
              </div>
            </div>

            {/* Tabla de Productos - Con precios duales */}
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
                            {/* PRECIO - Mostrar en moneda nativa */}
                            <td className="p-2 border border-[#bdc3c7] text-right font-medium">
                              <div className="space-y-1">
                                {/* Precio principal en moneda nativa */}
                                <div className="text-[#27ae60] font-semibold text-xs">
                                  {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                    <>
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mr-1">USD</span>
                                      ${Number(p.precioUSD || p.precioUnitario).toLocaleString("es-AR")}
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-green-100 text-green-800 mr-1">ARS</span>
                                      ${Number(p.precioARS || p.precioUnitario).toLocaleString("es-AR")}
                                    </>
                                  )}
                                </div>
                                
                                {/* Precio convertido (más pequeño, para referencia) */}
                                <div className="text-[#7f8c8d] text-xs">
                                  {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                    `≈ ${(Number(p.precioUSD || p.precioUnitario) * cotizacionManual).toLocaleString("es-AR")} ARS`
                                  ) : (
                                    `≈ USD ${(Number(p.precioARS || p.precioUnitario) / cotizacionManual).toFixed(2)}`
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2 border border-[#bdc3c7] text-right">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-[#3498db] text-white">
                                {p.cantidad}
                              </span>
                            </td>
                            {/* TOTAL - Mostrar en moneda nativa */}
                            <td className="p-2 border border-[#bdc3c7] text-right font-bold text-xs">
                              <div className="space-y-1">
                                {/* Total principal en moneda nativa */}
                                <div className="text-[#27ae60]">
                                  {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                    <>
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mr-1">USD</span>
                                      ${((p.precioUSD || p.precioUnitario) * p.cantidad).toLocaleString("es-AR")}
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-green-100 text-green-800 mr-1">ARS</span>
                                      ${((p.precioARS || p.precioUnitario) * p.cantidad).toLocaleString("es-AR")}
                                    </>
                                  )}
                                </div>
                                
                                {/* Total convertido (más pequeño) */}
                                <div className="text-[#7f8c8d] text-xs">
                                  {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                    `≈ ${((p.precioUSD || p.precioUnitario) * p.cantidad * cotizacionManual).toLocaleString("es-AR")}`
                                  ) : (
                                    `≈ USD ${(((p.precioARS || p.precioUnitario) * p.cantidad) / cotizacionManual).toFixed(2)}`
                                  )}
                                </div>
                              </div>
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
                            {/* Vista móvil - PRECIO */}
                            <div className="text-right">
                              <div className="text-[#27ae60] font-semibold text-sm">
                                {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                  <>
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mr-1">USD</span>
                                    ${Number(p.precioUSD || p.precioUnitario).toLocaleString("es-AR")}
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-green-100 text-green-800 mr-1">ARS</span>
                                    ${Number(p.precioARS || p.precioUnitario).toLocaleString("es-AR")}
                                  </>
                                )}
                              </div>
                              <div className="text-[#7f8c8d] text-xs">
                                {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                  `≈ ${(Number(p.precioUSD || p.precioUnitario) * cotizacionManual).toLocaleString("es-AR")} ARS`
                                ) : (
                                  `≈ USD ${(Number(p.precioARS || p.precioUnitario) / cotizacionManual).toFixed(2)}`
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-[#2c3e50] text-sm">Total:</span>
                            {/* Vista móvil - TOTAL */}
                            <div className="text-right">
                              <div className="text-[#27ae60] text-base">
                                {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                  <>
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800 mr-1">USD</span>
                                    ${((p.precioUSD || p.precioUnitario) * p.cantidad).toLocaleString("es-AR")}
                                  </>
                                ) : (
                                  <>
                                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-green-100 text-green-800 mr-1">ARS</span>
                                    ${((p.precioARS || p.precioUnitario) * p.cantidad).toLocaleString("es-AR")}
                                  </>
                                )}
                              </div>
                              <div className="text-[#7f8c8d] text-xs">
                                {(p.moneda === "USD" || p.categoria === "Teléfono") ? (
                                  `≈ ${((p.precioUSD || p.precioUnitario) * p.cantidad * cotizacionManual).toLocaleString("es-AR")}`
                                ) : (
                                  `≈ USD ${(((p.precioARS || p.precioUnitario) * p.cantidad) / cotizacionManual).toFixed(2)}`
                                )}
                              </div>
                            </div>
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
                  {pago.monto && pago.monto > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-[#ecf0f1] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#27ae60] rounded-full flex items-center justify-center text-white text-xs">💰</span>
                          <div>
                            <p className="font-medium text-[#2c3e50] text-sm">Pago ARS en {pago.formaPago}</p>
                            <p className="text-xs text-[#7f8c8d]">{pago.observaciones}</p>
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#27ae60]">
                          ${Number(pago.monto).toLocaleString("es-AR")} ARS
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {pago.montoUSD && pago.montoUSD > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-[#ecf0f1] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#3498db] rounded-full flex items-center justify-center text-white text-xs">💵</span>
                          <div>
                            <p className="font-medium text-[#2c3e50] text-sm">Pago USD en {pago.formaPago}</p>
                            <p className="text-xs text-[#7f8c8d]">{pago.observaciones}</p>
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#3498db]">
                          USD ${Number(pago.montoUSD).toLocaleString("es-AR")}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {telefonoComoPago && (
                    <div className="bg-white rounded-lg p-3 border border-[#ecf0f1] shadow-sm">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 sm:w-6 sm:h-6 bg-[#9b59b6] rounded-full flex items-center justify-center text-white text-xs">📱</span>
                          <div>
                            <p className="font-medium text-[#2c3e50] text-sm">Teléfono como parte de pago</p>
                            <p className="text-xs text-[#7f8c8d]">{telefonoComoPago.marca} {telefonoComoPago.modelo}</p>
                          </div>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-[#9b59b6]">
                          {telefonoComoPago.moneda === "USD" ? "USD $" : "$"}
                          {Number(telefonoComoPago.valorPago).toLocaleString("es-AR")}
                          {telefonoComoPago.moneda === "ARS" ? " ARS" : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer con Totales Duales */}
          <div className="bg-[#ecf0f1] border-t border-[#bdc3c7] p-3 flex-shrink-0">
            {/* Resumen de Totales Duales */}
            <div className="bg-white rounded-lg border border-[#bdc3c7] p-3 mb-3 shadow-sm">
              
              {/* Subtotales por moneda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                
                {/* Columna ARS */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                  <h4 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-xs">$</span>
                    Pesos Argentinos (ARS)
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    
                    {pagoARS > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Pagado:</span>
                        <span className="font-medium">-${pagoARS.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                    
                    {telefonoComoPago && monedaTelefonoPago === "ARS" && (
                      <div className="flex justify-between text-green-600">
                        <span>Teléfono pago:</span>
                        <span className="font-medium">-${descuentoTelefonoPago.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-green-300 pt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-green-800">Saldo ARS:</span>
                        <span className={`font-bold text-lg ${saldoARS > 0 ? 'text-red-600' : saldoARS < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          ${Math.abs(saldoARS).toLocaleString("es-AR")}
                          {saldoARS < 0 && <span className="text-xs ml-1">(favor)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Columna USD */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                  <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">$</span>
                    Dólares Estadounidenses (USD)
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    
                    {pagoUSD > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Pagado:</span>
                        <span className="font-medium">-USD ${pagoUSD.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                    
                    {telefonoComoPago && monedaTelefonoPago === "USD" && (
                      <div className="flex justify-between text-blue-600">
                        <span>Teléfono pago:</span>
                        <span className="font-medium">-USD ${descuentoTelefonoPago.toLocaleString("es-AR")}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-blue-300 pt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-blue-800">Saldo USD:</span>
                        <span className={`font-bold text-lg ${saldoUSD > 0 ? 'text-red-600' : saldoUSD < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          USD ${Math.abs(saldoUSD).toLocaleString("es-AR")}
                          {saldoUSD < 0 && <span className="text-xs ml-1">(favor)</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Total aproximado en ARS para referencia */}
              {/* Total - Condicional según tipo de venta */}
<div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
  {totalUSD > 0 && totalARS > 0 ? (
    // 🔥 VENTA MIXTA: Mostrar ambos totales
    <div className="space-y-3">
      <div className="text-center">
        <span className="text-gray-600 text-sm font-semibold">Total de la Venta (Dual)</span>
        <div className="text-xs text-gray-500">Cotización: $1 USD = ${cotizacionManual.toLocaleString("es-AR")} ARS</div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-lg font-bold text-blue-700">
          USD ${totalUSD.toLocaleString("es-AR")}
        </div>
        <div className="text-gray-400 mx-4">+</div>
        <div className="text-lg font-bold text-green-700">
          ARS ${totalARS.toLocaleString("es-AR")}
        </div>
      </div>
      
      <div className="text-center border-t pt-2">
        {pagosAproximadosARS > 0 && (
          <div className="text-sm text-gray-600">
            Saldo: ${Math.abs(saldoAproximadoARS).toLocaleString("es-AR")}
            {saldoAproximadoARS < 0 && " (favor)"}
          </div>
        )}
      </div>
    </div>
  ) : (
    // 🛍️ VENTA SIMPLE: Mostrar total único
    <div className="flex justify-between items-center">
      <div>
        <span className="text-gray-600 text-sm">Total de la Venta:</span>
        <div className="text-xs text-gray-500">
          {totalUSD > 0 ? "Venta en dólares" : "Venta en pesos"}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-gray-800">
          {totalUSD > 0 
            ? `USD $${totalUSD.toLocaleString("es-AR")}` 
            : `$${totalARS.toLocaleString("es-AR")} ARS`
          }
        </div>
        {totalUSD > 0 && (
          <div className="text-sm text-gray-600">
            ≈ ${(totalUSD * cotizacionManual).toLocaleString("es-AR")} ARS
          </div>
        )}
      </div>
    </div>
  )}
</div>
            </div>

            {/* Botones de Acción */}
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
                  console.log("COBRAR PRESIONADO - Sistema Dual", {
                    totalARS,
                    totalUSD,
                    cotizacionManual
                  });
                  setModalPagoAbierto(true);
                }}
                className="w-full sm:w-auto bg-[#27ae60] hover:bg-[#229954] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                💳 COBRAR (Dual)
              </button>

              <BotonGuardarVenta
                cliente={cliente}
                productos={productos}
                fecha={new Date().toLocaleDateString("es-AR")}
                observaciones=""
                pago={pago}
                moneda={totalUSD > 0 ? "USD" : "ARS"}
                cotizacion={cotizacionManual}
                onGuardar={() => {
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
  totalesVenta={{          // ✅ AGREGAR ESTA LÍNEA
    totalARS,
    totalUSD,
    cotizacion: cotizacionManual
  }}
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
      monto: nuevoPago.monto || "",
      montoUSD: nuevoPago.montoUSD || "",
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