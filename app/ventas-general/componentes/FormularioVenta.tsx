"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import ModalAccesorio from "./ModalAccesorio";
import ModalRepuesto from "./ModalRepuestos";
import ModalPago from "./ModalPago";
import { descontarAccesorioDelStock } from "./descontarAccesorioDelStock"; // ajustá la ruta si hace falta
import { useRouter } from "next/navigation";
import { descontarRepuestoDelStock } from "./descontarRepuestoDelStock";
import { Combobox } from "@headlessui/react";

interface ProductoVenta {
  categoria: "Teléfono" | "Accesorio" | "Repuesto";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  moneda?: "ARS" | "USD"; 
  codigo?: string; // ← ✅ agregamos esto
  producto?: string;
  marca?: string;
  modelo?: string;
  hoja?: string;
}

interface Props {
  cerrarModal?: () => void;
  onVentaGuardada: () => void;
}

export default function FormularioVenta({ onVentaGuardada, cerrarModal }: Props) {
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
  const [cotizacion, setCotizacion] = useState(1000); // valor inicial de respaldo
  const [queryCliente, setQueryCliente] = useState("");


  const [pago, setPago] = useState({
    monto: "",
    moneda: "ARS",
    formaPago: "",
    destino: "",
    observaciones: "",
    montoUSD: "", 
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

  useEffect(() => {
    const obtenerCotizacion = async () => {
      if (!rol?.negocioID) return;
  
      const docRef = doc(db, `negocios/${rol.negocioID}/configuracion/moneda`);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data() as {
          usarDolarManual?: boolean;
          dolarManual?: number;
        };
  
        if (data.usarDolarManual && data.dolarManual) {
          setCotizacion(data.dolarManual);
        }
      }
    };
  
    obtenerCotizacion();
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
  
    // ✅ Cotización actual desde Firebase (ya la tenés en tu useState)
    const cotiz = cotizacion;
  
    // Mapear productos y calcular total individual
    const productosFinal = productos.map((p) => {
      const total = p.moneda === "USD"
        ? p.precioUnitario * p.cantidad * cotiz
        : p.precioUnitario * p.cantidad;
  
      return {
        ...p,
        moneda: p.moneda || "ARS",
        total,
      };
    });
  
    const totalVenta = productosFinal.reduce((acc, p) => acc + p.total, 0);
  
    const venta = {
      fecha: new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      cliente,
      observaciones,
      productos: productosFinal,
      total: totalVenta,
      tipo: "general",
      timestamp: serverTimestamp(),
    };    
  
    try {
      const ventaRef = await addDoc(
        collection(db, `negocios/${rol.negocioID}/ventasGeneral`),
        venta
      );
  
      for (const p of productos.filter((p) => p.categoria === "Accesorio" && p.codigo)) {
        await descontarAccesorioDelStock(rol.negocioID, p.codigo, p.cantidad);
      }      
  
      for (const p of productos.filter((p) => p.categoria === "Repuesto" && p.codigo)) {
        await descontarRepuestoDelStock(rol.negocioID, p.codigo, p.cantidad);
      }      
  
      // Guardar pago si lo hay
      if (pago.monto && Number(pago.monto) > 0) {
        await addDoc(collection(db, `negocios/${rol.negocioID}/pagos`), {
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
        });
      }
  
      // Reset
      setCliente("");
      setProductos([]);
      setObservaciones("");
      setFecha(new Date().toISOString().split("T")[0]);
      setPago({ monto: "", moneda: "ARS", formaPago: "", destino: "", observaciones: "", montoUSD: ""  });
      setMostrarModalPago(false);
      setGuardadoConExito(false);
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 3000);
      localStorage.setItem("actualizarVentas", "1");
      if (onVentaGuardada) onVentaGuardada();
      if (cerrarModal) cerrarModal();
      
    } catch (error) {
      console.error("Error al guardar venta:", error);
      alert("Hubo un error al guardar la venta.");
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-4">
  <div className="w-40">
    <label>Fecha</label>
    <input
      type="date"
      value={fecha}
      onChange={(e) => setFecha(e.target.value)}
      className="border px-4 text-center py-1 w-full"
    />
  </div>
  <div className="w-56">
  <label>Cliente</label>
  <Combobox value={cliente} onChange={setCliente}>
    <div className="relative">
      <Combobox.Input
        className="border px-2 py-1 w-full"
        onChange={(e) => setQueryCliente(e.target.value)}
        displayValue={() => cliente}
        placeholder="Escribí el nombre del cliente"
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
  <div className="w56">
  <label>Observaciones</label>
        <input
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
         className="border px-2 py-1 w-full"
        />
</div>        
</div>

      </div>

      <div className="flex gap-4">
  <button
    onClick={() => router.push(`/ventas/telefonos?cliente=${encodeURIComponent(cliente)}`)}
    disabled={!cliente}
    className={`px-4 py-2 rounded ${
      !cliente ? "bg-gray-300 cursor-not-allowed text-gray-600" : "bg-blue-600 text-white"
    }`}
  >
    Agregar Teléfono
  </button>

  <button
    onClick={() => setModalAccesorio(true)}
    disabled={!cliente}
    className={`px-4 py-2 rounded ${
      !cliente ? "bg-gray-300 cursor-not-allowed text-gray-600" : "bg-green-600 text-white"
    }`}
  >
    Agregar Accesorio
  </button>

  <button
    onClick={() => setModalRepuesto(true)}
    disabled={!cliente}
    className={`px-4 py-2 rounded ${
      !cliente ? "bg-gray-300 cursor-not-allowed text-gray-600" : "bg-yellow-500 text-white"
    }`}
  >
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


    </div>
  );
}
