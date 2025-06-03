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
  const descuentoPago = pago && pago.monto ? Number(pago.monto) : 0;
  const descuentoTelefono = telefonoComoPago ? Number(telefonoComoPago.valorPago || 0) : 0;
  const totalDescuentos = descuentoPago + descuentoTelefono;

  // Total final
  const totalFinal = subtotal - totalDescuentos;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header del Remito */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🧾</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Remito de Venta</h2>
              <p className="text-purple-100">N° {numeroVenta}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-purple-100">Fecha</p>
              <p className="font-medium">{new Date().toLocaleDateString("es-AR")}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition-all duration-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Información del Cliente */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              👤 Datos del Cliente
            </h3>
            <Combobox value={cliente} onChange={setCliente}>
              <div className="relative">
                <Combobox.Input
                  className="w-full p-4 border border-gray-300 rounded-lg text-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-500"
                  onChange={(e) => setQueryCliente(e.target.value)}
                  displayValue={() => cliente}
                  placeholder="🔍 Ingrese o seleccione el nombre del cliente..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <Combobox.Options className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl">
                  {listaClientes
                    .filter((c) => c.toLowerCase().includes(queryCliente.toLowerCase()))
                    .map((c, i) => (
                      <Combobox.Option
                        key={i}
                        value={c}
                        className={({ active }) =>
                          `px-4 py-3 cursor-pointer transition-colors text-gray-900 ${
                            active ? "bg-purple-600 text-white" : "hover:bg-gray-100"
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

          {/* Selector de Productos */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🛍️ Agregar Productos
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

          {/* Tabla de Productos - Estilo Remito */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 border-b border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                📋 Detalle de Productos
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gradient-to-r from-purple-100 to-pink-100">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700 border border-gray-300">📦 Categoría</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border border-gray-300">🏷️ Producto</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border border-gray-300">🏭 Marca</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border border-gray-300">📱 Modelo</th>
                    <th className="p-3 text-left font-semibold text-gray-700 border border-gray-300">🎨 Color</th>
                    <th className="p-3 text-right font-semibold text-gray-700 border border-gray-300">💰 Precio</th>
                    <th className="p-3 text-right font-semibold text-gray-700 border border-gray-300">📊 Cant.</th>
                    <th className="p-3 text-right font-semibold text-gray-700 border border-gray-300">💵 Total</th>
                    <th className="p-3 text-center font-semibold text-gray-700 border border-gray-300 w-16">🗑️</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.length > 0 ? (
                    productos.map((p, i) => {
                      const precioMostrar = hayTelefono ? p.precioUSD || p.precioUnitario : p.precioARS || p.precioUnitario;
                      const monedaProducto = hayTelefono ? "USD" : "ARS";
                      const isEven = i % 2 === 0;

                      return (
                        <tr key={i} className={`transition-colors duration-200 hover:bg-purple-50 ${isEven ? "bg-white" : "bg-gray-50"}`}>
                          <td className="p-3 border border-gray-300">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              p.categoria === "Teléfono" 
                                ? 'bg-green-100 text-green-700'
                                : p.categoria === "Accesorio"
                                ? 'bg-blue-100 text-blue-700'
                                : p.categoria === "Repuesto"
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {p.categoria}
                            </span>
                          </td>
                          <td className="p-3 border border-gray-300 font-medium text-gray-800">{p.producto}</td>
                          <td className="p-3 border border-gray-300 text-gray-700">{p.marca}</td>
                          <td className="p-3 border border-gray-300 text-gray-700">{p.modelo}</td>
                          <td className="p-3 border border-gray-300">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {p.color}
                            </span>
                          </td>
                          <td className="p-3 border border-gray-300 text-right font-medium">
                            <span className="text-green-700">
                              {monedaProducto === "USD" ? "USD $" : "$"}{" "}
                              {Number(precioMostrar).toLocaleString("es-AR")}
                            </span>
                          </td>
                          <td className="p-3 border border-gray-300 text-right">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                              {p.cantidad}
                            </span>
                          </td>
                          <td className="p-3 border border-gray-300 text-right font-bold text-green-700">
                            ${(precioMostrar * p.cantidad).toLocaleString("es-AR")}
                          </td>
                          <td className="p-3 border border-gray-300 text-center">
                            <button
                              onClick={() => {
                                const copia = [...productos];
                                copia.splice(i, 1);
                                setProductos(copia);
                              }}
                              className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-12 text-center border border-gray-300">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-3xl">📦</span>
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-600">No hay productos cargados</p>
                            <p className="text-sm text-gray-400">Use el selector arriba para agregar productos</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sección de Pagos y Descuentos */}
          {(pago.monto || telefonoComoPago) && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                💳 Pagos Registrados
              </h3>
              <div className="space-y-3">
                {pago.monto && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">💰</span>
                        <div>
                          <p className="font-medium text-gray-800">Pago en {pago.formaPago}</p>
                          <p className="text-sm text-gray-600">{pago.observaciones}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-green-700">
                        ${Number(pago.monto).toLocaleString("es-AR")} {pago.moneda}
                      </span>
                    </div>
                  </div>
                )}
                
                {telefonoComoPago && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">📱</span>
                        <div>
                          <p className="font-medium text-gray-800">Teléfono como parte de pago</p>
                          <p className="text-sm text-gray-600">{telefonoComoPago.marca} {telefonoComoPago.modelo}</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-blue-700">
                        ${Number(telefonoComoPago.valorPago).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer con Totales y Acciones */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 p-4">
          {/* Resumen de Totales */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-medium text-gray-700">Subtotal:</span>
                <span className="font-bold text-gray-900">
                  {hayTelefono ? "USD $" : "$"}{subtotal.toLocaleString("es-AR")}
                </span>
              </div>
              
              {totalDescuentos > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center text-sm text-green-700">
                      <span>Descuentos aplicados:</span>
                      <span className="font-medium">-${totalDescuentos.toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 pt-3">
                    <div className="flex justify-between items-center text-xl">
                      <span className="font-bold text-gray-800">TOTAL A PAGAR:</span>
                      <span className="font-bold text-purple-700 text-2xl">
                        {hayTelefono ? "USD $" : "$"}{Math.max(0, totalFinal).toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>
                </>
              )}
              
              {totalDescuentos === 0 && (
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center text-xl">
                    <span className="font-bold text-gray-800">TOTAL:</span>
                    <span className="font-bold text-purple-700 text-2xl">
                      {hayTelefono ? "USD $" : "$"}{subtotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2">
          <button
  onClick={() => {
    console.log("COBRAR PRESIONADO");
    setModalPagoAbierto(true);
  }}
  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
  style={{ 
    height: "40px", 
    padding: "0 24px",
    minHeight: "40px",
    maxHeight: "20px",
   transform: "translateY(24px)",
  }}
>
  💰 COBRAR
</button>

            <BotonGuardarVenta
              cliente={cliente}
              productos={productos}
              fecha={new Date().toLocaleDateString("es-AR")}
              observaciones=""
              pago={pago}
              moneda={hayTelefono ? "USD" : "ARS"}
              onGuardar={() => {
                setRefrescar(prev => !prev);
                onClose?.();
              }}
            />
          </div>
        </div>

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
            onGuardarPago={async (nuevoPago) => {
              if (!rol?.negocioID) return;

              const nuevoPagoFirebase = {
                ...nuevoPago,
                cliente,
                fecha: new Date().toLocaleDateString("es-AR"),
                moneda: nuevoPago.moneda || "ARS",
                forma: nuevoPago.formaPago || "",
                observaciones: nuevoPago.observaciones || "",
              };

              try {
                await addDoc(
                  collection(db, `negocios/${rol.negocioID}/pagos`),
                  nuevoPagoFirebase
                );

                setPago(nuevoPago);
                setGuardadoConExito(true);
                setTimeout(() => setGuardadoConExito(false), 2000);
                setModalPagoAbierto(false);
              } catch (err) {
                console.error("Error al guardar pago:", err);
              }
            }}
            guardadoConExito={guardadoConExito}
          />
        )}
      </div>
    </div>
  );
}