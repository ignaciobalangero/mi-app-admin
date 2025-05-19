"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import ModalTelefono from "./ModalTelefono";
import ModalAccesorio from "./ModalAccesorio";
import ModalRepuesto from "./ModalRepuestos";
import ModalPago from "./ModalPago";
import { descontarAccesorioDelStock } from "./descontarAccesorioDelStock"; // ajustá la ruta si hace falta
import { useRouter } from "next/navigation";
import { descontarRepuestoDelStock } from "./descontarRepuestoDelStock";



interface ProductoVenta {
  categoria: "Teléfono" | "Accesorio" | "Repuesto";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  codigo?: string; // ← ✅ agregamos esto
  producto?: string;
  marca?: string;
  modelo?: string;
  hoja?: string;
}

interface Props {
  onVentaGuardada: () => void;
}

export default function FormularioVenta({ onVentaGuardada }: Props) {
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split("T")[0]);
  const [cliente, setCliente] = useState("");
  const [listaClientes, setListaClientes] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState<string>("");
  const [productos, setProductos] = useState<ProductoVenta[]>([]);
  const [modalTelefono, setModalTelefono] = useState(false);
  const [modalAccesorio, setModalAccesorio] = useState(false);
  const [modalRepuesto, setModalRepuesto] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [guardadoConExito, setGuardadoConExito] = useState(false);
  const router = useRouter();
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);
  


  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: "",
  });

  const { rol } = useRol();

  useEffect(() => {
    const cargarClientes = async () => {
      if (!rol?.negocioID) return;
      const snap = await getDocs(collection(db, `negocios/${rol.negocioID}/clientes`));
      const nombres = snap.docs.map((doc) => doc.data().nombre);
      setListaClientes(nombres);
    };
    cargarClientes();
  }, [rol?.negocioID]);

  const agregarProducto = (producto: ProductoVenta) => {
    setProductos([...productos, producto]);
  };

  const handlePagoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setPago((prev) => ({ ...prev, [name]: value }));
  };

  const guardarVenta = async () => {
    if (!rol?.negocioID || !cliente || productos.length === 0) {
      alert("Faltan datos para guardar la venta.");
      return;
    }

    const total = productos.reduce((acc, p) => acc + p.precioUnitario * p.cantidad, 0);

    const venta = {
      fecha,
      cliente,
      observaciones,
      productos,
      total,
      tipo: "general",
      timestamp: serverTimestamp(),
    };

    try {
      const ventaRef = await addDoc(
        collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
        venta
      );
      // Descontar del stock si hay accesorios con código
      await descontarAccesorioDelStock({
        productos: productos.filter((p) => p.categoria === "Accesorio" && p.codigo),
        negocioID: rol.negocioID,
      });

      await descontarRepuestoDelStock({
        productos: productos
  .filter((p) => p.categoria === "Repuesto" && p.codigo)
  .map((p) => ({ codigo: p.codigo!, cantidad: p.cantidad })),
        negocioID: rol.negocioID,
      });
      

      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
      
      localStorage.setItem("actualizarVentas", "1");
      router.push("/ventas-general");
            

      if (pago.monto && Number(pago.monto) > 0) {
        const pagoData = {
          fecha,
          cliente,
          monto: Number(pago.monto),
          moneda: pago.moneda,
          forma: pago.formaPago,
          destino: pago.destino,
          observaciones: pago.observaciones,
          origen: "ventasGeneral",
          idVenta: ventaRef.id,
          timestamp: serverTimestamp(),
        };
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), pagoData);
      }


      setCliente("");
      setProductos([]);
      setObservaciones("");
      setFecha(new Date().toISOString().split("T")[0]);
      setPago({ monto: "", moneda: "ARS", formaPago: "", destino: "", observaciones: "" });
      setMostrarModalPago(false);
      setGuardadoConExito(false);
      onVentaGuardada(); // ✅ actualiza la tabla
      
    } catch (error) {
      console.error("Error al guardar venta:", error);
      alert("Hubo un error al guardar la venta.");
    }
    
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-4">
  <div className="flex-1">
    <label>Fecha</label>
    <input
      type="date"
      value={fecha}
      onChange={(e) => setFecha(e.target.value)}
      className="border px-2 py-1 w-full"
    />
  </div>
  <div className="flex-1">
    <label>Cliente</label>
    <input
      type="text"
      value={cliente}
      onChange={(e) => setCliente(e.target.value)}
      placeholder="Escribí el nombre del cliente"
      list="sugerencias-clientes"
      className="border px-2 py-1 w-full"
    />
    <datalist id="sugerencias-clientes">
      {listaClientes.map((c, i) => (
        <option key={i} value={c} />
      ))}
    </datalist>
  </div>
</div>



        <label>Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="border px-2 py-1 w-full"
        />
      </div>

      <div className="flex gap-4">
        <button onClick={() => setModalTelefono(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
          Agregar Teléfono
        </button>
        <button onClick={() => setModalAccesorio(true)} className="bg-green-600 text-white px-4 py-2 rounded">
          Agregar Accesorio
        </button>
        <button onClick={() => setModalRepuesto(true)} className="bg-yellow-500 text-white px-4 py-2 rounded">
          Agregar Repuesto
        </button>
      </div>

      <h2 className="text-xl font-semibold">Productos agregados</h2>
      <ul className="border p-2 rounded">
        {productos.map((p, idx) => (
          <li key={idx} className="flex justify-between border-b py-1">
            <span>
             {p.categoria} - {p.producto}
            {p.marca && ` - ${p.marca}`}
             {p.modelo && ` - ${p.modelo}`}
             {p.hoja && ` - ${p.hoja}`}
              </span>

            <span>{p.cantidad} x ${p.precioUnitario}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setMostrarModalPago(true)}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Agregar Pago
        </button>
        <button
          onClick={guardarVenta}
          className="bg-indigo-600 text-white px-6 py-2 rounded"
        >
          Guardar Venta
        </button>
         {guardadoExitoso && (
        <p className="text-green-600 text-sm mt-2">✅ Venta guardada con éxito</p>
      )}

      </div>

      <ModalTelefono
        isOpen={modalTelefono}
        onClose={() => setModalTelefono(false)}
        onAgregar={agregarProducto}
      />
      <ModalAccesorio
        isOpen={modalAccesorio}
        onClose={() => setModalAccesorio(false)}
        onAgregar={agregarProducto}
      />
      <ModalRepuesto
        isOpen={modalRepuesto}
        onClose={() => setModalRepuesto(false)}
        onAgregar={agregarProducto}
      />

      <ModalPago
        mostrar={mostrarModalPago}
        pago={pago}
        onClose={() => setMostrarModalPago(false)}
        handlePagoChange={handlePagoChange}
        onGuardar={() => {
          setGuardadoConExito(true);
          setTimeout(() => setGuardadoConExito(false), 1500);
        }}
        guardadoConExito={guardadoConExito}
      />
    </div>
  );
}
