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
 limit,
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
 const [fechaPago, setFechaPago] = useState(() => {
   const d = new Date();
   const y = d.getFullYear();
   const m = String(d.getMonth() + 1).padStart(2, "0");
   const day = String(d.getDate()).padStart(2, "0");
   return `${y}-${m}-${day}`;
 });
 
 // Trabajos pendientes (se usan para marcar PAGADO al guardar, sin mostrar sugerencia)
 const [trabajosPendientes, setTrabajosPendientes] = useState<Trabajo[]>([]);

 const hoyInputDate = () => {
   const d = new Date();
   const y = d.getFullYear();
   const m = String(d.getMonth() + 1).padStart(2, "0");
   const day = String(d.getDate()).padStart(2, "0");
   return `${y}-${m}-${day}`;
 };

 const fechaDesdeInput = (yyyyMmDd: string) => {
   const [y, m, d] = yyyyMmDd.split("-").map(Number);
   if (!y || !m || !d) {
     const ahora = new Date();
     return { fecha: ahora.toLocaleDateString("es-AR"), fechaCompleta: ahora };
   }
   const fechaCompleta = new Date(y, m - 1, d, 12, 0, 0);
   return { fecha: fechaCompleta.toLocaleDateString("es-AR"), fechaCompleta };
 };
// ⭐ NUEVO: Función para actualizar saldo del cliente
const actualizarSaldoCliente = async (nombreCliente: string, sumarARS: number, sumarUSD: number) => {
  if (!negocioID) return;

  try {
    const clientesSnap = await getDocs(
      query(
        collection(db, `negocios/${negocioID}/clientes`),
        where("nombre", "==", nombreCliente),
        limit(1)
      )
    );

    if (clientesSnap.empty) {
      console.log(`⚠️ Cliente no encontrado: ${nombreCliente}`);
      return;
    }

    const clienteDoc = clientesSnap.docs[0];
    const datosCliente = clienteDoc.data();

    const nuevoSaldoARS = Number(datosCliente.saldoARS ?? 0) + Number(sumarARS);
    const nuevoSaldoUSD = Number(datosCliente.saldoUSD ?? 0) + Number(sumarUSD);

    await updateDoc(clienteDoc.ref, {
      saldoARS: Number(Math.round(nuevoSaldoARS * 100) / 100),
      saldoUSD: Number(Math.round(nuevoSaldoUSD * 100) / 100),
      ultimaActualizacion: serverTimestamp()
    });

    console.log(`✅ Saldo actualizado: ${nombreCliente} | ARS ${sumarARS > 0 ? '+' : ''}${sumarARS} | USD ${sumarUSD > 0 ? '+' : ''}${sumarUSD}`);
  } catch (error) {
    console.error(`❌ Error actualizando saldo de ${nombreCliente}:`, error);
  }
};
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
   const destino = obtenerDestino() || "";
   const { fecha, fechaCompleta } = fechaDesdeInput(fechaPago || hoyInputDate());

   const nuevoPago = {
     fecha,
     fechaCompleta,
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
      // Guardar en la colección principal de pagos
      docRef = await addDoc(collection(db, `negocios/${negocioID}/pagos`), nuevoPago);
      
      // 🆕 SI ES PAGO A PROVEEDOR, TAMBIÉN GUARDARLO EN pagosProveedores
      if (tipoDestino === "proveedor" && proveedorSeleccionado) {
        const proveedor = proveedores.find(p => p.nombre === proveedorSeleccionado);
        if (proveedor) {
          const pagoProveedor = {
            proveedorId: proveedor.id,
            proveedorNombre: proveedor.nombre,
            fecha,
            monto: moneda === "ARS" ? monto : 0,
            montoUSD: moneda === "USD" ? monto : 0,
            forma: forma,
            referencia: `Pago desde formulario principal`,
            notas: `Origen: ${cliente || 'Cliente no especificado'}`,
            fechaCreacion: new Date().toISOString(),
          };
          
          await addDoc(collection(db, `negocios/${negocioID}/pagosProveedores`), pagoProveedor);
          console.log("✅ Pago también guardado en pagosProveedores para:", proveedor.nombre);
        }
      }
      
      setMensaje("✅ Pago guardado con éxito");
      
      // 🚀 NUEVA FUNCIONALIDAD: Marcar trabajos como pagados
      await marcarTrabajosComoPagados(monto, moneda);
    }
    // ⭐ NUEVO: Restar pago del saldo del cliente
    await actualizarSaldoCliente(
      cliente,
      moneda === "ARS" ? -monto : 0,
      moneda === "USD" ? -monto : 0
    );
    console.log('💳 Saldo actualizado por pago manual');
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
     setFechaPago(hoyInputDate());
     setTrabajosPendientes([]);

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
    // 1. Obtener el pago antes de eliminarlo para ver si era a un proveedor
    const pagoDoc = await getDocs(
      query(collection(db, `negocios/${negocioID}/pagos`), where("__name__", "==", id))
    );
    
    let pagoData = null;
    if (!pagoDoc.empty) {
      pagoData = pagoDoc.docs[0].data();
    }

    // 2. Eliminar de la colección principal
    const ref1 = doc(db, `negocios/${negocioID}/pagos`, id);
    await deleteDoc(ref1);

    // 3. 🆕 SI ERA PAGO A PROVEEDOR, ELIMINARLO TAMBIÉN DE pagosProveedores
    if (pagoData && pagoData.tipoDestino === "proveedor" && pagoData.proveedorDestino) {
      const proveedor = proveedores.find(p => p.nombre === pagoData.proveedorDestino);
      if (proveedor) {
        // Buscar el pago correspondiente en pagosProveedores
        const pagosProveedorSnap = await getDocs(
          query(
            collection(db, `negocios/${negocioID}/pagosProveedores`),
            where("proveedorId", "==", proveedor.id),
            where("fecha", "==", pagoData.fecha),
            where("monto", "==", pagoData.monto || 0),
            where("montoUSD", "==", pagoData.montoUSD || 0)
          )
        );

        // Eliminar el pago del proveedor
        pagosProveedorSnap.forEach(async (doc) => {
          await deleteDoc(doc.ref);
          console.log("✅ Pago eliminado también de pagosProveedores");
        });
      }
    }

    // 4. Actualizar la lista de pagos
    const snap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
    // ⭐ NUEVO: Devolver el pago al saldo del cliente (porque se eliminó)
    if (pagoData) {
      const montoARS = pagoData.moneda === "ARS" ? Number(pagoData.monto ?? 0) : 0;
      const montoUSD = pagoData.moneda === "USD" ? Number(pagoData.montoUSD ?? pagoData.monto ?? 0) : 0;
      await actualizarSaldoCliente(cliente, montoARS, montoUSD);
      console.log('💳 Saldo actualizado por eliminación de pago');
    }
    const pagosActualizados = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      origen: "pagos",
    }));
    setPagos(pagosActualizados);

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
           Registrá pagos de clientes
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
     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6">
       
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

       {/* Fecha - 2 columnas */}
       <div className="col-span-2">
         <label className="block text-sm font-semibold text-[#2c3e50] mb-2">
           📅 Fecha del pago
         </label>
         <input
           type="date"
           value={fechaPago}
           max={hoyInputDate()}
           onChange={(e) => setFechaPago(e.target.value)}
           className="w-full px-3 py-2.5 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50] text-sm"
         />
         <p className="text-[11px] text-[#7f8c8d] mt-1">
           Por defecto hoy. Podés poner una fecha anterior.
         </p>
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
           🎯 Tipo de Destino <span className="text-[#7f8c8d] font-normal">(opcional)</span>
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
               🏢 Seleccionar Proveedor <span className="text-[#7f8c8d] font-normal">(opcional)</span>
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
               ✏️ Concepto del Pago <span className="text-[#7f8c8d] font-normal">(opcional)</span>
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
         disabled={!cliente || monto <= 0 || !forma}
         className={`px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform shadow-md flex items-center justify-center gap-2 text-sm ${
           !cliente || monto <= 0 || !forma
             ? "bg-[#bdc3c7] cursor-not-allowed"
             : "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#229954] hover:to-[#27ae60] hover:scale-105"
         }`}
       >
         💾 {editandoId ? "Actualizar" : "Guardar Pago"}
       </button>
     </div>
   </div>
 );
}