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

interface Trabajo {
  firebaseId: string;
  cliente: string;
  precio: number;
  estado: string;
  moneda?: "ARS" | "USD";
  trabajo?: string;
  modelo?: string;
  fecha?: string;
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
 
 // Estados para mostrar trabajos pendientes del cliente seleccionado
 const [trabajosPendientes, setTrabajosPendientes] = useState<Trabajo[]>([]);
 const [mostrarTrabajos, setMostrarTrabajos] = useState(false);

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

 // Cargar trabajos pendientes cuando se selecciona un cliente
 useEffect(() => {
   const cargarTrabajosPendientes = async () => {
     if (!cliente || !negocioID) {
       setTrabajosPendientes([]);
       setMostrarTrabajos(false);
       return;
     }

     try {
       const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
       const trabajosDelCliente: Trabajo[] = [];

       trabajosSnap.forEach((doc) => {
         const data = doc.data();
         if (data.cliente === cliente && 
             (data.estado === "ENTREGADO" || data.estado === "REPARADO") && 
             data.estadoCuentaCorriente !== "PAGADO" &&
             data.precio > 0) {
           trabajosDelCliente.push({
             firebaseId: doc.id,
             cliente: data.cliente,
             precio: Number(data.precio || 0),
             estado: data.estado,
             moneda: data.moneda || "ARS",
             trabajo: data.trabajo || "",
             modelo: data.modelo || "",
             fecha: data.fecha || ""
           });
         }
       });

       // Ordenar por fecha (más antiguos primero)
       trabajosDelCliente.sort((a, b) => {
         const fechaA = new Date(a.fecha || '');
         const fechaB = new Date(b.fecha || '');
         return fechaA.getTime() - fechaB.getTime();
       });

       setTrabajosPendientes(trabajosDelCliente);
       setMostrarTrabajos(trabajosDelCliente.length > 0);

       // Pre-llenar monto con el total de la deuda en la moneda seleccionada
       if (trabajosDelCliente.length > 0) {
         const totalARS = trabajosDelCliente
           .filter(t => (t.moneda || "ARS") === "ARS")
           .reduce((sum, t) => sum + t.precio, 0);
         const totalUSD = trabajosDelCliente
           .filter(t => t.moneda === "USD")
           .reduce((sum, t) => sum + t.precio, 0);

         if (moneda === "ARS" && totalARS > 0) {
           setMonto(totalARS);
         } else if (moneda === "USD" && totalUSD > 0) {
           setMonto(totalUSD);
         }
       }

     } catch (error) {
       console.error("Error al cargar trabajos pendientes:", error);
     }
   };

   cargarTrabajosPendientes();
 }, [cliente, negocioID, moneda]);

 const obtenerDestino = () => {
   if (tipoDestino === "proveedor" && proveedorSeleccionado) {
     const proveedor = proveedores.find(p => p.nombre === proveedorSeleccionado);
     return `Proveedor: ${proveedorSeleccionado}${proveedor?.categoria ? ` (${proveedor.categoria})` : ''}`;
   }
   return destinoLibre;
 };

 const marcarTrabajosComoPagados = async (montoPagado: number, monedaPago: string) => {
   if (trabajosPendientes.length === 0) return;

   let montoRestante = montoPagado;
   const trabajosEnMoneda = trabajosPendientes.filter(t => (t.moneda || "ARS") === monedaPago);

   for (const trabajo of trabajosEnMoneda) {
     if (montoRestante <= 0) break;

     if (montoRestante >= trabajo.precio) {
       // Pago completo del trabajo
       const trabajoRef = doc(db, `negocios/${negocioID}/trabajos/${trabajo.firebaseId}`);
       await updateDoc(trabajoRef, {
         estado: "PAGADO",
         estadoCuentaCorriente: "PAGADO",
         fechaModificacion: new Date().toLocaleDateString('es-AR')
       });
       montoRestante -= trabajo.precio;
       console.log(`✅ Trabajo marcado como PAGADO: ${trabajo.trabajo} - $${trabajo.precio}`);
     } else {
       // Pago parcial - no marcar como pagado
       console.log(`⚠️ Pago parcial para: ${trabajo.trabajo} - Faltan $${trabajo.precio - montoRestante} para completar este trabajo`);
       break;
     }
   }

   if (montoRestante > 0) {
     console.log(`📉 Pago aplicado correctamente. Deuda total reducida en $${montoPagado}`);
   }
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
     fechaCompleta: new Date(),
     cliente,
     monto: moneda === "USD" ? null : monto,
     montoUSD: moneda === "USD" ? monto : null,
     forma,
     destino,
     tipoDestino,
     proveedorDestino: tipoDestino === "proveedor" ? proveedorSeleccionado : null,
     moneda,
     cotizacion,
     tipo: 'ingreso',
     negocioID,
     observaciones: ""
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
       
       // 🚀 NUEVA FUNCIONALIDAD: Marcar trabajos como pagados
       await marcarTrabajosComoPagados(monto, moneda);
     }

     const snap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
     const pagosActualizados = snap.docs.map((doc) => ({
       id: doc.id,
       ...doc.data(),
       origen: "pagos",
     }));
     setPagos(pagosActualizados);

     // Limpiar formulario
     setCliente("");
     setMonto(0);
     setForma("");
     setTipoDestino("libre");
     setProveedorSeleccionado("");
     setDestinoLibre("");
     setMoneda("ARS");
     setTrabajosPendientes([]);
     setMostrarTrabajos(false);

     setTimeout(() => setMensaje(""), 3000);
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

 // Calcular totales de deuda por moneda
 const totalDeudaARS = trabajosPendientes
   .filter(t => (t.moneda || "ARS") === "ARS")
   .reduce((sum, t) => sum + t.precio, 0);
 const totalDeudaUSD = trabajosPendientes
   .filter(t => t.moneda === "USD")
   .reduce((sum, t) => sum + t.precio, 0);

 return (
   <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#ecf0f1]">
     
     <div className="flex items-center gap-3 mb-4">
       <div className="w-10 h-10 bg-[#27ae60] rounded-xl flex items-center justify-center">
         <span className="text-white text-lg">💰</span>
       </div>
       <div>
         <h2 className="text-lg font-bold text-[#2c3e50]">
           {editandoId ? "Editar Pago" : "Nuevo Pago Inteligente"}
         </h2>
         <p className="text-[#7f8c8d] text-xs">
           Registra pagos y marca trabajos automáticamente
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

     {/* Información de trabajos pendientes */}
     {mostrarTrabajos && (
       <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eafc] rounded-xl p-4 mb-4 border-2 border-[#3498db]">
         <div className="flex items-center gap-2 mb-3">
           <div className="w-6 h-6 bg-[#3498db] rounded-lg flex items-center justify-center">
             <span className="text-white text-xs">📋</span>
           </div>
           <h3 className="font-bold text-[#2c3e50] text-sm">
             Trabajos Pendientes de {cliente}
           </h3>
         </div>
         
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
           {totalDeudaARS > 0 && (
             <div className="bg-white/60 rounded-lg p-3">
               <p className="text-xs text-[#7f8c8d]">Total en Pesos</p>
               <p className="font-bold text-[#e74c3c]">${totalDeudaARS.toLocaleString()}</p>
             </div>
           )}
           {totalDeudaUSD > 0 && (
             <div className="bg-white/60 rounded-lg p-3">
               <p className="text-xs text-[#7f8c8d]">Total en USD</p>
               <p className="font-bold text-[#e74c3c]">USD ${totalDeudaUSD.toLocaleString()}</p>
             </div>
           )}
         </div>

         <div className="space-y-1 max-h-32 overflow-y-auto">
           {trabajosPendientes.slice(0, 5).map((trabajo, idx) => (
             <div key={trabajo.firebaseId} className="text-xs bg-white/40 rounded px-2 py-1 flex justify-between items-center">
               <span>{trabajo.modelo} - {trabajo.trabajo}</span>
               <span className="font-semibold">
                 {trabajo.moneda === "USD" ? "USD " : "$"}{trabajo.precio}
               </span>
             </div>
           ))}
           {trabajosPendientes.length > 5 && (
             <div className="text-xs text-[#7f8c8d] text-center">
               +{trabajosPendientes.length - 5} trabajos más...
             </div>
           )}
         </div>

         <div className="mt-3 pt-3 border-t border-[#3498db]/30">
           <div className="flex flex-wrap gap-2">
             <span className="text-xs text-[#7f8c8d]">Pagos sugeridos:</span>
             {totalDeudaARS > 0 && (
               <button
                 onClick={() => {
                   setMoneda("ARS");
                   setMonto(totalDeudaARS);
                 }}
                 className="bg-[#27ae60] hover:bg-[#229954] text-white px-2 py-1 rounded text-xs font-medium transition-all"
               >
                 Total ARS: ${totalDeudaARS.toLocaleString()}
               </button>
             )}
             {totalDeudaUSD > 0 && (
               <button
                 onClick={() => {
                   setMoneda("USD");
                   setMonto(totalDeudaUSD);
                 }}
                 className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-2 py-1 rounded text-xs font-medium transition-all"
               >
                 Total USD: ${totalDeudaUSD.toLocaleString()}
               </button>
             )}
           </div>
         </div>
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
         💾 {editandoId ? "Actualizar" : "Guardar Pago Inteligente"}
       </button>
     </div>

     <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-3 mt-4 border border-[#bdc3c7]">
       <div className="flex items-center gap-3 text-[#2c3e50]">
         <div className="w-6 h-6 bg-[#3498db] rounded-lg flex items-center justify-center">
           <span className="text-white text-xs">🚀</span>
         </div>
         <div className="flex-1">
           <p className="text-sm font-medium">
             <strong>Nuevo:</strong> Pago Inteligente activado. Al seleccionar un cliente, verás sus trabajos pendientes y el sistema marcará automáticamente los trabajos como "PAGADO" según el monto recibido.
           </p>
         </div>
       </div>
     </div>
   </div>
 );
}