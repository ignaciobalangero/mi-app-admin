"use client";

import { useEffect, useState } from "react";
import { useRol } from "@/lib/useRol";
import TablaProductosVenta from "./TablaProductosVenta";
import ModalPago from "./ModalPago";
import { obtenerUltimoNumeroVenta } from "@/lib/ventas/contadorVentas";
import BotonGuardarVenta from "./BotonGuardarVenta";
import SelectorProductoVentaGeneral from "./SelectorProductoVentaGeneral";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Combobox } from "@headlessui/react";

export default function ModalVenta({
  clienteInicial = "",
  productosIniciales = [],
  pagoInicial = null,
  onClose,
  onGuardar,
}: {
  clienteInicial?: string;
  productosIniciales?: any[];
  pagoInicial?: any;
  onClose?: () => void;
  onGuardar?: () => void;
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
// Aseguramos que pagoInicial tenga un valor por defecto
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
    if (!rol?.negocioID) return;
    const cargarNumero = async () => {
      const nro = await obtenerUltimoNumeroVenta(rol.negocioID);
      setNumeroVenta(nro);
    };
    cargarNumero();
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

  return (
    <div className="fixed inset-0 z-[9998] bg-white/30 flex items-center justify-center">
      <div className="w-full max-w-6xl bg-white text-black p-8 rounded-xl shadow-lg border max-h-[95vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Venta N° {numeroVenta}</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black text-2xl font-bold"
          >
            ×
          </button>
        </div>

    {/* Cliente */}
<div className="mb-4">
  <Combobox value={cliente} onChange={setCliente}>
    <div className="relative">
      <Combobox.Input
        className="w-full p-3 border rounded text-lg"
        onChange={(e) => setQueryCliente(e.target.value)}
        displayValue={() => cliente}
        placeholder="Nombre del cliente"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <Combobox.Options className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto text-sm shadow-lg">
        {listaClientes
          .filter((c) => c.toLowerCase().includes(queryCliente.toLowerCase()))
          .map((c, i) => (
            <Combobox.Option
              key={i}
              value={c}
              className={({ active }) =>
                `px-4 py-2 cursor-pointer ${active ? "bg-blue-600 text-white" : "text-black"}`
              }
            >
              {c}
            </Combobox.Option>
          ))}
      </Combobox.Options>
    </div>
  </Combobox>
</div>


        {/* Buscador de productos */}
        <div className="mb-4">
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
/>

          <TablaProductosVenta
            productos={productos}
            onEliminar={(index) => {
              const nuevos = [...productos];
              nuevos.splice(index, 1);
              setProductos(nuevos);
            }}
          />
        </div>

     {/* Tabla estilo factura */}
<div className="border rounded-md overflow-y-auto mb-6 min-h-[260px]">
  <table className="w-full text-sm border-collapse table-fixed">
    <thead className="bg-gray-200 text-gray-800">
      <tr className="text-left">
        <th className="p-2 border w-[10%]">Categoría</th>
        <th className="p-2 border w-[20%]">Producto</th>
        <th className="p-2 border w-[15%]">Marca</th>
        <th className="p-2 border w-[15%]">Modelo</th>
        <th className="p-2 border w-[10%]">Color</th>
        <th className="p-2 border w-[10%] text-right">Precio</th>
        <th className="p-2 border w-[10%] text-right">Cantidad</th>
        <th className="p-2 border w-[10%] text-right">Total</th>
        <th className="p-2 border w-[5%] text-center">🗑</th>
      </tr>
    </thead>
    <tbody className="text-gray-700 min-h-[200px]">
      {productos.length > 0 ? (
        productos.map((p, i) => (
          <tr key={i} className="border-b hover:bg-gray-50">
            <td className="p-2 border">{p.categoria}</td>
            <td className="p-2 border">{p.producto}</td>
            <td className="p-2 border">{p.marca}</td>
            <td className="p-2 border">{p.modelo}</td>
            <td className="p-2 border">{p.color}</td>
            <td className="p-2 border text-right">
              {p.moneda === "USD" ? "USD $" : "$"}{" "}
              {Number(p.precioUnitario).toLocaleString("es-AR")}
            </td>
            <td className="p-2 border text-right">{p.cantidad}</td>
            <td className="p-2 border text-right">
              {(p.precioUnitario * p.cantidad).toLocaleString("es-AR")}
            </td>
            <td className="p-2 border text-center">
              <button
                onClick={() => {
                  const copia = [...productos];
                  copia.splice(i, 1);
                  setProductos(copia);
                }}
                className="text-red-500 hover:text-red-700"
              >
                🗑
              </button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={9} className="p-4 text-center text-gray-400 border">
            No hay productos cargados.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>


        {/* Pago */}
        {pago && (
          <div className="mb-4 text-base text-green-700 font-medium">
            Pago registrado: {pago.monto} {pago.moneda} - {pago.forma}
          </div>
        )}

        {/* Total y acciones */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-2xl font-bold text-gray-900">
            Total: $
            {productos
              .reduce((acc, p) => acc + p.precioUnitario * p.cantidad, 0)
              .toLocaleString("es-AR")}
          </div>

          <div className="flex gap-4">
          <button
            onClick={() => {
            console.log("COBRAR PRESIONADO");
            setModalPagoAbierto(true);
              }}
             className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                COBRAR
            </button>

            <BotonGuardarVenta
              cliente={cliente}
              productos={productos}
              fecha={new Date().toLocaleDateString("es-AR")}
              observaciones=""
              pago={pago}
              onGuardar={onClose}
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
    onGuardarPago={(nuevoPago) => {
      console.log("GUARDAR PAGO:", nuevoPago);
      setPago(nuevoPago);
      setGuardadoConExito(true);
      setTimeout(() => setGuardadoConExito(false), 2000);
      setModalPagoAbierto(false);
    }}
    
    guardadoConExito={guardadoConExito}
  />
)}

      </div>
    </div>
  );
}
