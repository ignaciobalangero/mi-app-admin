// FormularioVentaAccesorios.tsx
"use client";

import { useState } from "react";
import SeccionDatosVenta from "./SeccionDatosVenta";
import SeccionPagoCliente from "./SeccionPagoCliente";

interface Props {
  fecha: string;
  cliente: string;
  setCliente: (valor: string) => void;
  producto: string;
  setProducto: (valor: string) => void;
  cantidad: number;
  setCantidad: (valor: number) => void;
  precio: number;
  setPrecio: (valor: number) => void;
  moneda: "ARS" | "USD";
  setMoneda: (valor: "ARS" | "USD") => void;
  cotizacion: number;
  setCotizacion: (valor: number) => void;
  onGuardar: (pago?: {
    montoAbonado: number;
    monedaPago: string;
    formaPago: string;
    observacionesPago: string;
  }) => void;
  editandoId: string | null;
  codigo: string;
  setCodigo: (valor: string) => void;
  marca: string;
  setMarca: (valor: string) => void;
  categoria: string;
  setCategoria: (valor: string) => void;
  color: string;
  setColor: (valor: string) => void;
}

export default function FormularioVentaAccesorios(props: Props) {
  const [mostrarPago, setMostrarPago] = useState(false);
  const [montoAbonado, setMontoAbonado] = useState(0);
  const [monedaPago, setMonedaPago] = useState("ARS");
  const [formaPago, setFormaPago] = useState("");
  const [observacionesPago, setObservacionesPago] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
const [cliente, setCliente] = useState("");
const [producto, setProducto] = useState("");
const [cantidad, setCantidad] = useState(1);
const [precio, setPrecio] = useState(0);
const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
const [cotizacion, setCotizacion] = useState(1000);
const [codigo, setCodigo] = useState("");
const [marca, setMarca] = useState("");
const [modelo, setModelo] = useState("");
const [categoria, setCategoria] = useState("");
const [color, setColor] = useState("");


  const total =
    Number(props.precio) * Number(props.cantidad) *
    (props.moneda === "USD" ? Number(props.cotizacion) : 1);

  const saldo = total - montoAbonado;

  const handleGuardar = () => {
    if (montoAbonado > 0) {
      props.onGuardar({
        montoAbonado,
        monedaPago,
        formaPago,
        observacionesPago,
      });
    } else {
      props.onGuardar();
    }
  };

  return (
    <div className="flex flex-wrap gap-3 justify-center mb-6 items-start">
      
      <SeccionDatosVenta
  fecha={fecha}
  cliente={cliente}
  setCliente={setCliente}
  producto={producto}
  setProducto={setProducto}
  cantidad={cantidad}
  setCantidad={setCantidad}
  precio={precio}
  setPrecio={setPrecio}
  moneda={moneda}
  setMoneda={setMoneda}
  cotizacion={cotizacion}
  setCotizacion={setCotizacion}
  codigo={codigo}
  setCodigo={setCodigo}
  marca={marca}
  setMarca={setMarca}
  modelo={modelo}
  setModelo={setModelo}
  categoria={categoria}
  setCategoria={setCategoria}
  color={color}
  setColor={setColor}
  total={total}
/>


      <div className="flex items-end gap-2">
        <button
          onClick={() => setMostrarPago(!mostrarPago)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Agregar Pago
        </button>

        <button
          onClick={handleGuardar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {props.editandoId ? "Actualizar" : "Guardar Venta"}
        </button>
      </div>

      {mostrarPago && (
        <SeccionPagoCliente
          montoAbonado={montoAbonado}
          setMontoAbonado={setMontoAbonado}
          monedaPago={monedaPago}
          setMonedaPago={setMonedaPago}
          formaPago={formaPago}
          setFormaPago={setFormaPago}
          observacionesPago={observacionesPago}
          setObservacionesPago={setObservacionesPago}
          saldo={saldo}
        />
      )}
    </div>
  );
}
