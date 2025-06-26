"use client";

import { useEffect, useState } from "react";
import { Combobox } from "@headlessui/react";
import { db } from "@/lib/firebase";
import {
 collection,
 getDocs,
 addDoc,
 updateDoc,
 doc,
 deleteDoc,
 serverTimestamp,
 query,
 where,
} from "firebase/firestore";

interface Props {
 negocioID: string;
 setPagos: React.Dispatch<React.SetStateAction<any[]>>;
}

export default function FormularioPago({ negocioID, setPagos }: Props) {
 const [cliente, setCliente] = useState("");
 const [clientes, setClientes] = useState<string[]>([]);
 const [proveedores, setProveedores] = useState<any[]>([]);
 const [monto, setMonto] = useState(0);
 const [forma, setForma] = useState("");
 const [tipoDestino, setTipoDestino] = useState("libre"); // libre, proveedor
 const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
 const [destinoLibre, setDestinoLibre] = useState("");
 const [moneda, setMoneda] = useState("ARS");
 const [cotizacion, setCotizacion] = useState(1000);
 const [editandoId, setEditandoId] = useState<string | null>(null);
 const [mensaje, setMensaje] = useState("");
 const [queryCliente, setQueryCliente] = useState("");

 // Opciones predefinidas para forma de pago
 const formasPago = [
   { valor: "Efectivo", icono: "💵" },
   { valor: "Tarjeta", icono: "💳" },
   { valor: "Transferencia", icono: "🏦" },
   { valor: "USD", icono: "💵" },
   { valor: "Crypto", icono: "₿" },
 ];

 useEffect(() => {
   if (!negocioID) return;

   const fetchClientes = async () => {
     const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
     const nombres = snap.docs.map(doc => doc.data().nombre);
     setClientes(nombres);
   };

   const fetchProveedores = async () => {
     const snap = await getDocs(collection(db, `negocios/${negocioID}/proveedores`));
     const proveedoresData = snap.docs.map(doc => ({
       id: doc.id,
       nombre: doc.data().nombre,
       categoria: doc.data().categoria || "",
     }));
     setProveedores(proveedoresData);
   };

   const fetchCotizacion = async () => {
     try {
       const res = await fetch("https://dolarapi.com/v1/dolares/blue");
       const data = await res.json();
       if (data && data.venta) setCotizacion(Number(data.venta));
     } catch (error) {
       console.error("Error al obtener cotización:", error);
     }
   };

   fetchClientes();
   fetchProveedores();
   fetchCotizacion();
 }, [negocioID]);

 const obtenerDestino = () => {
   if (tipoDestino === "proveedor" && proveedorSeleccionado) {
     const proveedor = proveedores.find(p => p.nombre === proveedorSeleccionado);
     return `Proveedor: ${proveedorSeleccionado}${proveedor?.categoria ? ` (${proveedor.categoria})` : ''}`;
   }
   return destinoLibre;
 };

 const guardarPago = async () => {
   if (!cliente || monto <= 0 || !forma) return;

   const clientesSnap = await getDocs(
     query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", cliente))
   );
   const clienteDoc = clientesSnap.docs[0];

   if (!clienteDoc) {
     console.error("❌ No se encontró el cliente en la base de datos.");
     setMensaje("❌ Cliente no encontrado. Verificá el nombre.");
     return;
   }

   const clienteID = clienteDoc.id;
   const destino = obtenerDestino();

   const nuevoPago = {
     fecha: new Date().toLocaleDateString("es-AR"),
     cliente,
     monto: moneda === "USD" ? null : monto,
     montoUSD: moneda === "USD" ? monto : null,
     forma,
     destino,
     tipoDestino,
     proveedorDestino: tipoDestino === "proveedor" ? proveedorSeleccionado : null,
     moneda,
     cotizacion,
   };

   try {
     let docRef;
     if (editandoId) {
       docRef = doc(db, `negocios/${negocioID}/pagos`, editandoId);
       await updateDoc(docRef, nuevoPago);
       setEditandoId(null);
       setMensaje("✅ Pago actualizado con éxito");
     } else {
       docRef = await addDoc(collection(db, `negocios/${negocioID}/pagos`), nuevoPago);
       setMensaje("✅ Pago guardado con éxito");
     }

     const snap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
     const pagosActualizados = snap.docs.map((doc) => ({
       id: doc.id,
       ...doc.data(),
       origen: "pagos",
     }));
     setPagos(pagosActualizados);

     setCliente("");
     setMonto(0);
     setForma("");
     setTipoDestino("libre");
     setProveedorSeleccionado("");
     setDestinoLibre("");
     setMoneda("ARS");

     setTimeout(() => setMensaje(""), 2000);
   } catch (error) {
     console.error("Error al guardar el pago:", error);
     setMensaje("❌ Error inesperado al guardar el pago");
   }
 };

 const eliminarPago = async (id: string, cliente: string) => {
   const confirmado = window.confirm(`¿Eliminar el pago de ${cliente}?`);
   if (!confirmado) return;

   try {
     const ref1 = doc(db, `negocios/${negocioID}/pagos`, id);
     const ref2 = doc(db, `negocios/${negocioID}/pagos`, id);

     try {
       await deleteDoc(ref1);
     } catch {
       await deleteDoc(ref2);
     }

     const snap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
     const pagosActualizados = snap.docs.map((doc) => ({
       id: doc.id,
       ...doc.data(),
       origen: "pagos",
     }));
     setPagos(pagosActualizados);

     const clientesSnap = await getDocs(
       query(collection(db, `negocios/${negocioID}/clientes`), where("nombre", "==", cliente))
     );
     const clienteDoc = clientesSnap.docs[0];
     if (clienteDoc) {
       const clienteID = clienteDoc.id;
     }

     setMensaje("✅ Pago eliminado");
     setTimeout(() => setMensaje(""), 2000);
   } catch (error) {
     console.error("❌ Error eliminando pago:", error);
     setMensaje("❌ Error inesperado al eliminar");
   }
 };

 return (
   <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
     
     <div className="flex items-center gap-3 mb-4">
       <div className="w-10 h-10 bg-[#27ae60] rounded-xl flex items-center justify-center">
         <span className="text-white text-lg">💰</span>
       </div>
       <div>
         <h2 className="text-lg font-bold text-[#2c3e50]">
           {editandoId ? "Editar Pago" : "Nuevo Pago"}
         </h2>
         <p className="text-[#7f8c8d] text-xs">
           Registra los pagos de tus clientes
         </p>
       </div>
     </div>

     {mensaje && (
       <div className={`rounded-xl p-3 mb-4 text-center font-semibold text-sm ${
         mensaje.includes("✅") 
           ? "bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] text-[#27ae60]"
           : "bg-gradient-to-r from-[#fadbd8] to-[#f5b7b1] border-2 border-[#e74c3c] text-[#e74c3c]"
       }`}>
         {mensaje}
       </div>
     )}

     {/* Grid con todos los campos de 2 columnas */}
     <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
       
       {/* Cliente - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           👤 Cliente
         </label>
         <Combobox value={cliente} onChange={setCliente}>
           <div className="relative">
             <Combobox.Input
               className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
               onChange={(e) => setQueryCliente(e.target.value)}
               displayValue={() => cliente}
               placeholder="Seleccionar cliente"
               autoComplete="off"
               spellCheck={false}
               autoCorrect="off"
             />
             <Combobox.Options className="absolute z-10 w-full bg-white border-2 border-[#bdc3c7] rounded-lg mt-1 max-h-60 overflow-y-auto text-sm shadow-lg">
               {clientes
                 .filter((nombre) =>
                   nombre.toLowerCase().includes(queryCliente.toLowerCase())
                 )
                 .map((nombre, i) => (
                   <Combobox.Option
                     key={i}
                     value={nombre}
                     className={({ active }) =>
                       `px-3 py-2.5 cursor-pointer transition-colors duration-200 ${
                         active ? "bg-[#27ae60] text-white" : "text-[#2c3e50] hover:bg-[#ecf0f1]"
                       }`
                     }
                   >
                     {nombre}
                   </Combobox.Option>
                 ))}
               {clientes.filter((nombre) =>
                 nombre.toLowerCase().includes(queryCliente.toLowerCase())
               ).length === 0 && (
                 <div className="px-3 py-2.5 text-[#7f8c8d] text-center">Sin coincidencias</div>
               )}
             </Combobox.Options>
           </div>
         </Combobox>
       </div>

       {/* Monto - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           💵 Monto
         </label>
         <input
           type="number"
           value={isNaN(monto) ? "" : monto}
           onChange={(e) => setMonto(Number(e.target.value))}
           onFocus={() => {
             if (monto === 0) setMonto(NaN);
           }}
           onBlur={() => {
             if (isNaN(monto)) setMonto(0);
           }}
           placeholder="0.00"
           className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
         />
       </div>

       {/* Moneda - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           💱 Moneda
         </label>
         <select
           value={moneda}
           onChange={(e) => setMoneda(e.target.value)}
           className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
         >
           <option value="ARS">🇦🇷 Pesos</option>
           <option value="USD">🇺🇸 Dólares</option>
         </select>
       </div>

       {/* Cotización - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           📈 Cotización
         </label>
         <input
           type="number"
           value={cotizacion}
           onChange={(e) => setCotizacion(Number(e.target.value))}
           placeholder="1000"
           className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
         />
       </div>

       {/* Forma de pago - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           💳 Forma de Pago
         </label>
         <select
           value={forma}
           onChange={(e) => setForma(e.target.value)}
           className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
         >
           <option value="">Seleccionar forma de pago</option>
           {formasPago.map((formaPago) => (
             <option key={formaPago.valor} value={formaPago.valor}>
               {formaPago.icono} {formaPago.valor}
             </option>
           ))}
         </select>
       </div>

       {/* Tipo de destino - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           🎯 Tipo de Destino
         </label>
         <select
           value={tipoDestino}
           onChange={(e) => {
             setTipoDestino(e.target.value);
             setProveedorSeleccionado("");
             setDestinoLibre("");
           }}
           className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
         >
           <option value="libre">✏️ Escribir destino</option>
           <option value="proveedor">🏢 Pagar a proveedor</option>
         </select>
       </div>

       {/* Destino dinámico - 4 columnas */}
       <div className="col-span-4">
         {tipoDestino === "proveedor" ? (
           <div>
             <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
               🏢 Seleccionar Proveedor
             </label>
             <select
               value={proveedorSeleccionado}
               onChange={(e) => setProveedorSeleccionado(e.target.value)}
               className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#8e44ad] focus:border-[#8e44ad] transition-all text-[#2c3e50] text-sm"
             >
               <option value="">Seleccionar proveedor</option>
               {proveedores.map((proveedor) => (
                 <option key={proveedor.id} value={proveedor.nombre}>
                   {proveedor.nombre} {proveedor.categoria && `(${proveedor.categoria})`}
                 </option>
               ))}
             </select>
             {proveedores.length === 0 && (
               <p className="text-xs text-[#7f8c8d] mt-1">
                 No hay proveedores. <a href="/proveedores" className="text-[#8e44ad] font-medium">Crear uno</a>
               </p>
             )}
           </div>
         ) : (
           <div>
             <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
               ✏️ Concepto del Pago
             </label>
             <input
               value={destinoLibre}
               onChange={(e) => setDestinoLibre(e.target.value)}
               placeholder="Describe el concepto del pago"
               className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d] text-sm"
             />
           </div>
         )}
       </div>
     </div>

     {/* Vista previa del destino */}
     {(tipoDestino === "proveedor" && proveedorSeleccionado) || (tipoDestino === "libre" && destinoLibre) ? (
       <div className="mt-4 p-3 bg-gradient-to-r from-[#f8f9fa] to-[#e9ecef] rounded-lg border border-[#dee2e6]">
         <div className="flex items-center gap-2">
           <span className="text-[#6c757d] text-sm font-medium">Destino:</span>
           <span className="text-[#2c3e50] font-semibold text-sm">{obtenerDestino()}</span>
         </div>
       </div>
     ) : null}

     {/* Botón guardar centrado */}
     <div className="flex justify-center mt-4">
       <button
         onClick={guardarPago}
         disabled={!cliente || monto <= 0 || !forma || (tipoDestino === "proveedor" && !proveedorSeleccionado) || (tipoDestino === "libre" && !destinoLibre)}
         className={`px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-md flex items-center justify-center gap-2 text-sm ${
           (!cliente || monto <= 0 || !forma || (tipoDestino === "proveedor" && !proveedorSeleccionado) || (tipoDestino === "libre" && !destinoLibre))
             ? "bg-[#bdc3c7] cursor-not-allowed"
             : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105"
         }`}
       >
         💾 {editandoId ? "Actualizar" : "Guardar Pago"}
       </button>
     </div>

     <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-3 mt-4 border border-[#bdc3c7]">
       <div className="flex items-center gap-3 text-[#2c3e50]">
         <div className="w-6 h-6 bg-[#3498db] rounded-lg flex items-center justify-center">
           <span className="text-white text-xs">💡</span>
         </div>
         <div className="flex-1">
           <p className="text-sm font-medium">
             <strong>Tip:</strong> Ahora puedes pagar directamente a proveedores seleccionándolos de la lista. La cotización del USD se actualiza automáticamente.
           </p>
         </div>
       </div>
     </div>
   </div>
 );
}