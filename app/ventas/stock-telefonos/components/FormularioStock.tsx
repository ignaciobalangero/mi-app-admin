"use client";

import { useEffect, useState } from "react";
import { Timestamp, addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRol } from "@/lib/useRol";

interface Props {
  negocioID: string;
  onGuardado?: (datos: any) => void;
  placeholderProveedor?: string;
  clienteRecibido?: string;
  datosIniciales?: any; // ✅ nueva prop para edición
}

interface Telefono {
  fechaIngreso: string;
  proveedor: string;
  modelo: string; 
  marca: string;
  estado: "nuevo" | "usado";
  bateria: string;
  gb: string;
  color: string;
  imei: string;
  serial: string;
  precioCompra: string;
  precioVenta: string;
  precioMayorista: string;
  moneda: "USD" | "ARS";
  observaciones: string;
}

const inicial: Telefono = {
  fechaIngreso: new Date().toISOString().split("T")[0],
  proveedor: "",
  modelo: "",
  marca: "",
  estado: "nuevo",
  bateria: "",
  gb: "",
  color: "",
  imei: "",
  serial: "",
  precioCompra: "",
  precioVenta: "",
  precioMayorista: "",
  moneda: "USD",
  observaciones: "",
};

export default function FormularioStock({
  negocioID,
  onGuardado,
  placeholderProveedor,
  clienteRecibido,
  datosIniciales,
}: Props) {
  const [form, setForm] = useState<Telefono>(inicial);
  const [editandoID, setEditandoID] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const { rol } = useRol();

  // Si se pasan datos para editar, los cargamos automáticamente
  useEffect(() => {
    if (!datosIniciales) return;
  
    const fechaCruda = datosIniciales.fechaIngreso;
    let fechaIngresoFormateada = "";
  
    if (fechaCruda?.seconds && typeof fechaCruda.toDate === "function") {
      const d = fechaCruda.toDate();
      if (!isNaN(d.getTime())) {
        fechaIngresoFormateada = d.toISOString().split("T")[0];
      }
    } else if (typeof fechaCruda === "string") {
      // Detectamos si viene en formato DD/MM/AAAA
      const partes = fechaCruda.split("/");
      if (partes.length === 3) {
        const [dd, mm, yyyy] = partes;
        fechaIngresoFormateada = `${yyyy}-${mm}-${dd}`; // Formato válido para el input
      }
    }    
  
    setForm({
      ...datosIniciales,
      fechaIngreso: fechaIngresoFormateada,
    });
  
    setEditandoID(datosIniciales.id || null);
    setMostrarFormulario(true);
  }, [datosIniciales]);
  
  // Si se oculta el formulario, se resetea
  useEffect(() => {
    if (!mostrarFormulario) {
      setForm(inicial);
      setEditandoID(null);
    }
  }, [mostrarFormulario]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const guardar = async () => {
    let fechaFormateada: Date;

    if (typeof form.fechaIngreso === "string") {
      if (form.fechaIngreso.includes("/")) {
        // viene en formato DD/MM/YYYY
        const [dd, mm, yyyy] = form.fechaIngreso.split("/");
        fechaFormateada = new Date(`${yyyy}-${mm}-${dd}`);
      } else {
        // viene como YYYY-MM-DD
        fechaFormateada = new Date(form.fechaIngreso);
      }
    } else {
      fechaFormateada = new Date();
    }
    
    const data = {
      ...form,
      estado: form.estado.toLowerCase(),
      fechaIngreso: Timestamp.fromDate(fechaFormateada),
      creadoEn: Timestamp.now(),
      proveedor: form.proveedor || (clienteRecibido ? `Recibido de ${clienteRecibido}` : ""),
    };
    

    if (editandoID) {
      await updateDoc(doc(db, `negocios/${negocioID}/stockTelefonos/${editandoID}`), data);
      onGuardado?.({ ...data, id: editandoID });
    } else {
      const ref = await addDoc(collection(db, `negocios/${negocioID}/stockTelefonos`), data);
      const nuevoTelefono = { ...data, id: ref.id };
      onGuardado?.(nuevoTelefono);
    }

    setForm(inicial);
    setEditandoID(null);
    setMostrarFormulario(false);
  };

  return (
    <div className="mb-6">
      <div className="text-right mb-4">
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {mostrarFormulario ? "Ocultar" : "Agregar Teléfono"}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
          <input
            type="date"
            name="fechaIngreso"
            value={form.fechaIngreso}
            onChange={handleChange}
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="proveedor"
            value={form.proveedor}
            onChange={handleChange}
            placeholder={placeholderProveedor || "Proveedor"}
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="modelo"
            value={form.modelo}
            onChange={handleChange}
            placeholder="Modelo"
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="marca"
            value={form.marca}
            onChange={handleChange}
            placeholder="Marca"
            className="p-2 border rounded"
          />
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="p-2 border rounded"
          >
            <option value="nuevo">Nuevo</option>
            <option value="usado">Usado</option>
          </select>
          {form.estado === "usado" && (
            <input
              type="number"
              name="bateria"
              value={form.bateria}
              onChange={handleChange}
              placeholder="% Batería"
              className="p-2 border rounded"
            />
          )}
          
          <input
            type="number"
            name="gb"
            value={form.gb}
            onChange={(e) => setForm(prev => ({ ...prev, gb: e.target.value }))}
            placeholder="Almacenamiento (GB)"
            className="p-2 border rounded"
          />

        
          <input
            type="text"
            name="color"
            value={form.color}
            onChange={handleChange}
            placeholder="Color"
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="imei"
            value={form.imei}
            onChange={handleChange}
            placeholder="IMEI (opcional)"
            className="p-2 border rounded"
          />
          <input
            type="text"
            name="serial"
            value={form.serial}
            onChange={handleChange}
            placeholder="Serial"
            className="p-2 border rounded"
          />
          <div className="flex gap-2">
          {rol?.tipo === "admin" && (
         <input
           type="number"
           name="precioCompra"
           value={form.precioCompra}
           onChange={handleChange}
           placeholder="Precio $"
           className="p-2 border rounded w-full"
            />
          )}
             
            <select
              name="moneda"
              value={form.moneda}
              onChange={handleChange}
              className="p-2 border rounded"
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          </div>
          
          <input
            type="number"
            name="precioVenta"
            value={form.precioVenta}
            onChange={handleChange}
            placeholder="Precio venta"
            className="p-2 border rounded"
          />
        
         {rol?.tipo === "admin" && (
              <input
            type="number"
            name="precioMayorista"
            value={form.precioMayorista}
            onChange={handleChange}
            placeholder="Precio mayorista"
            className="p-2 border rounded"
          />
        )}
          <textarea
            name="observaciones"
            value={form.observaciones}
            onChange={handleChange}
            placeholder="Observaciones (opcional)"
            className="p-2 border rounded col-span-1 md:col-span-2"
          />
          <div className="text-center col-span-1 md:col-span-2">
            <button
              onClick={guardar}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
            >
              {editandoID ? "Actualizar" : "Guardar Teléfono"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
