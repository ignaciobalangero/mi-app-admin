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
 const [monto, setMonto] = useState(0);
 const [forma, setForma] = useState("");
 const [destino, setDestino] = useState("");
 const [moneda, setMoneda] = useState("ARS");
 const [cotizacion, setCotizacion] = useState(1000);
 const [editandoId, setEditandoId] = useState<string | null>(null);
 const [mensaje, setMensaje] = useState("");
 const [queryCliente, setQueryCliente] = useState("");

 useEffect(() => {
   if (!negocioID) return;

   const fetchClientes = async () => {
     const snap = await getDocs(collection(db, `negocios/${negocioID}/clientes`));
     const nombres = snap.docs.map(doc => doc.data().nombre);
     setClientes(nombres);
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
   fetchCotizacion();
 }, [negocioID]);

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

   const nuevoPago = {
     fecha: new Date().toLocaleDateString("es-AR"),
     cliente,
     monto: moneda === "USD" ? null : monto,
     montoUSD: moneda === "USD" ? monto : null,
     forma,
     destino,
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
     setDestino("");
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
   <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1] mb-8">
     
     {/* Header del formulario - Estilo GestiOne */}
     <div className="flex items-center gap-4 mb-6">
       <div className="w-12 h-12 bg-[#27ae60] rounded-xl flex items-center justify-center">
         <span className="text-white text-2xl">💰</span>
       </div>
       <div>
         <h2 className="text-2xl font-bold text-[#2c3e50]">
           {editandoId ? "Editar Pago" : "Nuevo Pago"}
         </h2>
         <p className="text-[#7f8c8d] mt-1">
           Registra los pagos de tus clientes
         </p>
       </div>
     </div>

     {/* Mensaje de estado */}
     {mensaje && (
       <div className={`rounded-xl p-4 mb-6 text-center font-semibold ${
         mensaje.includes("✅") 
           ? "bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] border-2 border-[#27ae60] text-[#27ae60]"
           : "bg-gradient-to-r from-[#fadbd8] to-[#f5b7b1] border-2 border-[#e74c3c] text-[#e74c3c]"
       }`}>
         {mensaje}
       </div>
     )}

     {/* Formulario - Estilo GestiOne */}
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
       
       {/* Combobox de cliente */}
       <div className="lg:col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           👤 Cliente
         </label>
         <Combobox value={cliente} onChange={setCliente}>
           <div className="relative">
             <Combobox.Input
               className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
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
                       `px-4 py-3 cursor-pointer transition-colors duration-200 ${
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
                 <div className="px-4 py-3 text-[#7f8c8d] text-center">Sin coincidencias</div>
               )}
             </Combobox.Options>
           </div>
         </Combobox>
       </div>

       {/* Monto */}
       <div>
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
           className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
         />
       </div>

       {/* Moneda */}
       <div>
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           💱 Moneda
         </label>
         <select
           value={moneda}
           onChange={(e) => setMoneda(e.target.value)}
           className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50]"
         >
           <option value="ARS">🇦🇷 Pesos Argentinos</option>
           <option value="USD">🇺🇸 Dólares</option>
         </select>
       </div>

       {/* Cotización */}
       <div>
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           📈 Cotización USD
         </label>
         <input
           type="number"
           value={cotizacion}
           onChange={(e) => setCotizacion(Number(e.target.value))}
           placeholder="Cotización del dólar"
           className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
         />
       </div>

       {/* Forma de pago */}
       <div>
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           💳 Forma de Pago
         </label>
         <input
           value={forma}
           onChange={(e) => setForma(e.target.value)}
           placeholder="Efectivo, Tarjeta, etc."
           className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
         />
       </div>

       {/* Destino */}
       <div className="lg:col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           🎯 Destino
         </label>
         <input
           value={destino}
           onChange={(e) => setDestino(e.target.value)}
           placeholder="Concepto o destino del pago"
           className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] placeholder-[#7f8c8d]"
         />
       </div>

       {/* Botón guardar */}
       <div className="flex items-end">
         <button
           onClick={guardarPago}
           disabled={!cliente || monto <= 0 || !forma}
           className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-md flex items-center justify-center gap-2 ${
             (!cliente || monto <= 0 || !forma)
               ? "bg-[#bdc3c7] cursor-not-allowed"
               : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105"
           }`}
         >
           💾 {editandoId ? "Actualizar" : "Guardar Pago"}
         </button>
       </div>
     </div>

     {/* Información adicional - Estilo GestiOne */}
     <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 mt-6 border border-[#bdc3c7]">
       <div className="flex items-center gap-3 text-[#2c3e50]">
         <div className="w-8 h-8 bg-[#3498db] rounded-lg flex items-center justify-center">
           <span className="text-white text-sm">💡</span>
         </div>
         <div className="flex-1">
           <p className="text-sm font-medium">
             <strong>Tip:</strong> La cotización del USD se actualiza automáticamente desde la API del dólar blue.
           </p>
         </div>
       </div>
     </div>
   </div>
 );
}