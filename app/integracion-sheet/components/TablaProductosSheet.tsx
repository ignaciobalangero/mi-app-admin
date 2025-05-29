"use client";

interface ExtraData {
  codigo: string;
  proveedor?: string;
  precioCosto?: number;
  hoja?: string;
  precio1?: number;
  precio2?: number;
  precio3?: number;
  precio1Pesos?: number;
  precio2Pesos?: number;
  precio3Pesos?: number;
}

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";
import AccionesProducto from "./AccionesProducto";
import PedidosSugeridos from "./PedidosSugeridos";


export default function TablaProductosSheet({
  sheetID,
  hoja,
  recarga,
  setRecarga,
  setProductosAPedir,
}: {
  sheetID: string;
  hoja: string;
  recarga: number;
  setRecarga: React.Dispatch<React.SetStateAction<number>>;
  setProductosAPedir: React.Dispatch<React.SetStateAction<any[]>>; 
}) {
  const [user] = useAuthState(auth);
  const [datos, setDatos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cotizacion, setCotizacion] = useState<number | null>(null);
  const [usarDolarManual, setUsarDolarManual] = useState(false);
  const [dolarManual, setDolarManual] = useState<number | null>(null);
  const { rol } = useRol();
  const [filtroTexto, setFiltroTexto] = useState("");

  const cotizacionFinal = usarDolarManual && dolarManual ? dolarManual : cotizacion || 0;

  useEffect(() => {
    const obtenerConfiguracion = async () => {
      if (!rol?.negocioID) return;
      try {
        const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/moneda`);
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          const data = snap.data();
          setUsarDolarManual(data.usarDolarManual ?? false);
          setDolarManual(data.dolarManual ?? null);
        }
      } catch (err) {
        console.error("❌ Error leyendo configuración de moneda:", err);
      }
    };
    obtenerConfiguracion();
  }, [rol?.negocioID]);

  useEffect(() => {
    if (!usarDolarManual) {
      setCotizacion(1000);
    }
  }, [usarDolarManual]);

  const guardarConfiguracion = async (nuevoValor: boolean, nuevoDolar: number | null) => {
    if (!rol?.negocioID) return;
    try {
      const configRef = doc(db, `negocios/${rol.negocioID}/configuracion/moneda`);
      await setDoc(configRef, {
        usarDolarManual: nuevoValor,
        dolarManual: nuevoDolar,
      });
    } catch (err) {
      console.error("❌ Error guardando configuración de moneda:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!sheetID || !rol?.negocioID) return;
      setCargando(true);
      try {
        const res = await fetch("/api/leer-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sheetID, hoja, negocioID: rol.negocioID }),
        });
        const sheetRes = await res.json();
        const sheetData = sheetRes.datos || [];

        const extraSnap = await getDocs(collection(db, `negocios/${rol.negocioID}/stockExtra`));
        const firestoreData: ExtraData[] = extraSnap.docs
         .map((doc) => {
       const data = doc.data() as ExtraData;
       return { codigo: doc.id, ...data };
       })
        .filter((prod) => prod.hoja === hoja); // ✅ ahora sí reconoce hoja



        const codigosSheet = sheetData.map((p: any) => p.codigo);
        const combinados = sheetData.map((producto: any) => {
          const extra = firestoreData.find((e: any) => e.codigo === producto.codigo);

          const precioUSD = Number(extra?.precio1) || Number(producto.precio1) || 0;
          const precioARS = Number(extra?.precio1Pesos) || 0;
          const precioCosto = Number(extra?.precioCosto) || 0;
          const ganancia = precioUSD - precioCosto;          

          return {
            ...producto,
            ...extra,
            precioARS,
            ganancia,
          };
        });

        const soloFirestore = firestoreData
          .filter((p: any) => !codigosSheet.includes(p.codigo))
          .map((p: any) => {
            const precioUSD = Number(p.precioUSD) || 0;
            const precioCosto = Number(p.precioCosto) || 0;
            const ganancia = precioUSD - precioCosto;
            const precioARSCalculado = Math.round(precioUSD * cotizacionFinal);

            return {
              
              ...p,
              precioARS: precioARSCalculado,
              ganancia,
            };
          });

          const resultadoFinal = [...combinados, ...soloFirestore];
          // 🔠 Ordenar por código (alfabéticamente)
          resultadoFinal.sort((a, b) => a.codigo.localeCompare(b.codigo));
           setDatos(resultadoFinal);
           // 🔍 Generar pedidos sugeridos
const sugerencias = resultadoFinal.filter((p) => {
  return typeof p.stockIdeal === "number" &&
         typeof p.cantidad === "number" &&
         p.stockIdeal > p.cantidad;
});
setProductosAPedir(sugerencias);

          
      } catch (err) {
        console.error("❌ Error cargando datos:", err);
      } finally {
        setCargando(false);
      }
    };

    fetchData();
  }, [sheetID, hoja, recarga, rol?.negocioID, cotizacionFinal, dolarManual]);
  const totalCosto = datos.reduce((acc, fila) => {
    if (typeof fila.precioCosto === "number" && typeof fila.cantidad === "number") {
      return acc + fila.precioCosto * fila.cantidad;
    }
    return acc;
  }, 0);
  
  return (
    <div className="overflow-x-auto mt-8">
      <div className="flex items-center gap-4 mb-4">
        
        <label className="text-sm font-medium text-gray-700">
          Valor del dólar
        </label>

        <input
          type="number"
          value={dolarManual ?? ""}
          onChange={(e) => {
            const nuevoValor = Number(e.target.value);
            setDolarManual(nuevoValor);
            guardarConfiguracion(true, nuevoValor);
          }}
          placeholder="Ej: 1100"
          className="p-1 border rounded w-24"
        />
        
         <input
  type="text"
  value={filtroTexto}
  onChange={(e) => setFiltroTexto(e.target.value)}
  placeholder="🔍 Buscar por producto..."
  className="w-full max-w-sm p-2 border rounded"
/>
<div className="px-3 py-2 bg-yellow-100 text-yellow-900 rounded shadow font-bold text-sm border border-yellow-300">
  💰 Total costo: ${totalCosto.toLocaleString("es-AR")}
</div>


      </div>

      {cargando ? (
        <p className="text-center text-blue-600">Cargando datos desde Google Sheet...</p>
      ) : (
       
       <table className="min-w-full bg-white text-sm border rounded shadow">
          <thead className="bg-gray-300">
            <tr>
              <th className="p-2 border">Código</th>
              <th className="p-2 border">Categoría</th>
              <th className="p-2 border">Producto</th>
              <th className="p-2 border">Cantidad</th>
              <th className="p-2 border">Precio ARS</th>
              <th className="p-2 border">Precio USD</th>
              <th className="p-2 border">Precio Costo</th>
              <th className="p-2 border">Proveedor</th>
              <th className="p-2 border">Ganancia</th>
              <th className="p-2 border">Total costo</th>

              <th className="p-2 border">Acciones</th>
                </tr>
                    </thead>
                      <tbody>
                    {datos
                .filter((fila) =>
                fila.producto?.toLowerCase().includes(filtroTexto.toLowerCase())
                )
                .map((fila, i) => (

              <tr key={i} className="hover:bg-gray-100">
                <td className="p-2 border">{fila.codigo}</td>
                <td className="p-2 border">{fila.categoria}</td>
                <td className="p-2 border">{fila.producto}</td>
                <td className="p-2 border">{fila.cantidad}</td>
                <td className="p-2 border">
                  ${typeof fila.precioARS === "number" ? fila.precioARS.toLocaleString("es-AR") : "-"}
                </td>
                <td className="p-2 border">
                    ${typeof fila.precio1 === "number" ? fila.precio1.toLocaleString("es-AR") : "-"}
                </td>
                <td className="p-2 border">
                     ${typeof fila.precioCosto === "number" ? fila.precioCosto.toLocaleString("es-AR") : "-"}
                </td>
                <td className="p-2 border">{fila.proveedor}</td>
                <td className="p-2 border">
                  ${typeof fila.ganancia === "number" ? fila.ganancia.toFixed(2) : "-"}
                </td>
                <td className="p-2 border">
                ${typeof fila.precioCosto === "number" && typeof fila.cantidad === "number"
                  ? (fila.precioCosto * fila.cantidad).toLocaleString("es-AR")
                  : "-"}
                </td>

                <td className="p-2 border">
                  
                  <AccionesProducto
                    producto={fila}
                    sheetID={sheetID}
                    hoja={hoja}
                    onRecargar={() => setRecarga((prev) => prev + 1)}
                  />
                </td>
              </tr>
            ))}
          </tbody>

        </table>
      )}
    </div>
  );
}
