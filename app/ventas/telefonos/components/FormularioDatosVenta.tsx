"use client";

import { useEffect, useState } from "react";
import { Timestamp, collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
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
  const [mostrarCargaRecibida, setMostrarCargaRecibida] = useState(false);
  const [guardadoConExito, setGuardadoConExito] = useState(false);
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
  
  const baseVenta = {
    ...form,
    precioVenta: precioFinal,
    ganancia: precioFinal - form.precioCosto,
    creadoEn: Timestamp.now(),
  };
  

    const montoPagado = Number(pago.monto || 0);
    const valorTelefono = Number(telefonoRecibido?.precioCompra || 0);
    const totalPagado = montoPagado + valorTelefono;

    let ventaID = editandoId;

    if (editandoId) {
      await updateDoc(doc(db, `negocios/${negocioID}/ventaTelefonos/${editandoId}`), baseVenta);
      ventaID = editandoId;
      onGuardado({ ...baseVenta, id: editandoId });
    } else {
      const ref = await addDoc(collection(db, `negocios/${negocioID}/ventaTelefonos`), {
        ...baseVenta,
        id: "",
      });
      await updateDoc(ref, { id: ref.id });
      ventaID = ref.id;
      onGuardado({ ...baseVenta, id: ref.id });

      const telefonoDelStock = stock.find(
        (t) => t.modelo === form.modelo && t.imei === form.imei
      );
      if (form.stockID) {
        await deleteDoc(doc(db, `negocios/${negocioID}/stockTelefonos/${form.stockID}`));
        
        // 🔄 ACTUALIZAR STOCK LOCAL
        setStock((prevStock) => prevStock.filter((tel) => tel.id !== form.stockID));
      }
    }

    if (totalPagado > 0 && form.cliente) {
      await addDoc(collection(db, `negocios/${negocioID}/pagos`), {
        fecha: new Date().toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),        
        cliente: form.cliente,
        monto: form.moneda === "USD" ? null : totalPagado,
        montoUSD: form.moneda === "USD" ? totalPagado : null,
        forma: `Efectivo + Entrega equipo`,
        destino: "ventaTelefonos",
        moneda: form.moneda,
        cotizacion: 1000,
      });
    }

  
    const saldo = precioFinal - totalPagado;
    if (saldo > 0 && form.cliente) {
      await addDoc(collection(db, `negocios/${negocioID}/cuenta-corriente`), {
        cliente: form.cliente,
        fecha: new Date().toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        
        concepto: `Venta de ${form.modelo}`,
        debe: form.moneda === "USD" ? null : saldo,
        debeUSD: form.moneda === "USD" ? saldo : null,
        haber: 0,
        saldo,
      });
     }
     
    // Guardar resumen en ventasGeneral
      await addDoc(collection(db, `negocios/${negocioID}/ventasGeneral`), {
      fecha: form.fecha,
      cliente: form.cliente,
      productos: [
        {
          categoria: "Teléfono",
          descripcion: form.estado, // Producto = "nuevo" o "usado"
          marca: form.marca || "—",
          modelo: form.modelo,
          color: form.color || "—",
          cantidad: 1,
          precioUnitario: precioFinal,
          moneda: form.moneda, 
        },
      ],
      total: precioFinal,
      tipo: "telefono",
      observaciones: pago.observaciones || "",
      timestamp: Timestamp.now(),
    });
    

    // Redirigir a ventas-general
    router.push("/ventas-general");

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

  return (
    <>
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

      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm font-semibold">Moneda:</label>
        <select
  name="moneda"
  value={form.moneda}
  onChange={handleChange}
  className="p-2 border border-gray-300 rounded"
  disabled={!!form.stockID} // ✅ desactiva si vino del stock
>
  <option value="ARS">ARS</option>
  <option value="USD">USD</option>
</select>

      </div>

      {telefonoRecibido && telefonoRecibido.precioCompra && (
        <p className="text-sm text-green-700 bg-green-100 border border-green-300 px-4 py-2 rounded">
          Equipo recibido: {telefonoRecibido.modelo} - ${Number(telefonoRecibido.precioCompra).toLocaleString("es-AR")} descontado del total
        </p>
      )}

      {pago.monto && !isNaN(Number(pago.monto)) && (
        <p className="text-sm text-blue-700 bg-blue-100 border border-blue-300 px-4 py-2 rounded mt-2">
          Monto abonado: {pago.moneda} ${Number(pago.monto).toLocaleString("es-AR")}
        </p>
      )}

      {form.precioVenta > 0 && !isNaN(Number(form.precioVenta)) && (
        <p className="text-sm text-red-700 bg-red-100 border border-red-300 px-4 py-2 rounded mt-2">
          Resta pagar: ${(
            Number(form.precioVenta || 0) -
            Number(pago.monto || 0) -
            Number(telefonoRecibido?.precioCompra || 0)
          ).toLocaleString("es-AR")}
        </p>
      )}

      <div className="md:col-span-2 flex justify-end gap-2 mt-4">
        <button onClick={() => setMostrarCargaRecibida(true)} className="bg-yellow-100 text-yellow-900 border border-yellow-400 px-6 py-2 rounded">
          + Teléfono como parte de pago
        </button>
        <button onClick={() => setMostrarPagoModal(true)} className="bg-green-600 text-white px-6 py-2 rounded">
          + Agregar Pago
        </button>
        <button onClick={guardar} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded">
          {editandoId ? "Actualizar Venta" : "Guardar Venta"}
        </button>
      </div>

      <ModalPago
        mostrar={mostrarPagoModal}
        pago={pago}
        onClose={() => setMostrarPagoModal(false)}
        handlePagoChange={handlePagoChange}
        onGuardar={handleGuardarPago}
        guardadoConExito={guardadoConExito}
      />

      {mostrarCargaRecibida && (
        <div className="md:col-span-2 bg-gray-100 p-4 rounded mt-4">
          <h3 className="text-lg font-semibold mb-2 text-center">📦 Teléfono entregado por el cliente</h3>
          <FormularioStock
            negocioID={negocioID}
            placeholderProveedor="Cliente que entregó el teléfono"
            onGuardado={(datos) => {
              setTelefonoRecibido(datos);
              setMostrarCargaRecibida(false);
            }}
          />
        </div>
      )}
    </>
  );
}
