"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { useRol } from "../../lib/useRol";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import * as XLSX from "xlsx";

interface ResumenMensual {
  mes: string;
  trabajos: number;
  accesorios: number;
  telefonos: number;
}

export default function ResumenCuenta() {
  const { rol } = useRol();
  const [resumenMensual, setResumenMensual] = useState<ResumenMensual[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState<string>("");
  const [user] = useAuthState(auth);
  const [negocioID, setNegocioID] = useState<string>("");

  // ✅ Agregamos esta función arriba de todo
  const obtenerMesAnio = (fecha: any): string | null => {
    if (!fecha) return null;

    let fechaObj: Date;

    if (typeof fecha === "object" && "seconds" in fecha) {
      fechaObj = new Date(fecha.seconds * 1000);
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else if (typeof fecha === "string") {
      const partes = fecha.split("/");
      if (partes.length === 3) {
        const [dia, mes, anio] = partes;
        fechaObj = new Date(`${anio}-${mes}-${dia}`);
      } else {
        fechaObj = new Date(fecha);
      }
    } else {
      return null;
    }

    if (isNaN(fechaObj.getTime())) return null;

    const mes = fechaObj.getMonth() + 1;
    const anio = fechaObj.getFullYear();
    return `${mes < 10 ? "0" + mes : mes}/${anio}`;
  };

  useEffect(() => {
    if (rol?.negocioID) {
      setNegocioID(rol.negocioID);
    }
  }, [rol]);  

  useEffect(() => {
    const fetchDatos = async () => {
      if (!negocioID || rol?.tipo !== "admin") return;

      const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
      const accesoriosSnap = await getDocs(collection(db, `negocios/${negocioID}/ventaAccesorios`));
      const telefonosSnap = await getDocs(collection(db, `negocios/${negocioID}/ventaTelefonos`));

      const resumen: Record<string, ResumenMensual> = {};

      trabajosSnap.forEach((doc) => {
        const d = doc.data();
        const key = obtenerMesAnio(d.fecha);
      
        if (d.estado === "ENTREGADO" && d.precio != null && key) {
          if (!resumen[key]) resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
          
          // 🔥 CORREGIDO: Si d.costo no existe, se toma como 0
          resumen[key].trabajos += Number(d.precio) - Number(d.costo || 0);
        }
      });
      

      accesoriosSnap.forEach((doc) => {
        const d = doc.data();
        const key = obtenerMesAnio(d.fecha);
        if (d.total && d.precioUnitario && d.cantidad && d.cotizacion && key) {
          if (!resumen[key]) resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
          const costoTotal = d.precioUnitario * d.cantidad * (d.moneda === "USD" ? d.cotizacion : 1);
          resumen[key].accesorios += d.total - costoTotal;
        }
      });

      telefonosSnap.forEach((doc) => {
        const d = doc.data();
        const key = obtenerMesAnio(d.fecha);
        if (d.precioVenta && d.precioCosto && key) {
          if (!resumen[key]) resumen[key] = { mes: key, trabajos: 0, accesorios: 0, telefonos: 0 };
          resumen[key].telefonos += Number(d.precioVenta) - Number(d.precioCosto);
        }
      });

      const resultado = Object.values(resumen).sort((a, b) => a.mes.localeCompare(b.mes));
      setResumenMensual(resultado);
      if (!mesSeleccionado && resultado.length) setMesSeleccionado(resultado[resultado.length - 1].mes);
    };

    fetchDatos();
  }, [negocioID, rol]);

  const exportarExcel = () => {
    const datos = resumenMensual.map((r) => ({
      Mes: r.mes,
      "Ganancia Trabajos": r.trabajos,
      "Ganancia Accesorios": r.accesorios,
      "Ganancia Teléfonos": r.telefonos,
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ganancias");
    XLSX.writeFile(wb, "resumen_ganancias.xlsx");
  };

  const seleccionado = resumenMensual.find((r) => r.mes === mesSeleccionado);
  const totalMes = seleccionado ? seleccionado.trabajos + seleccionado.accesorios + seleccionado.telefonos : 0;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-black">
        <h1 className="text-3xl font-bold mb-6">Resumen de Cuenta</h1>

        {rol?.tipo === "admin" && resumenMensual.length > 0 && (
          <div className="w-full max-w-3xl bg-white p-4 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Ganancias por mes</h2>
              <button onClick={exportarExcel} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">
                Exportar Excel
              </button>
            </div>

            <div className="mb-4">
              <label className="block mb-1 font-medium text-sm">Seleccionar mes</label>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="border p-2 rounded w-full max-w-xs text-sm"
              >
                {resumenMensual.map((r) => (
                  <option key={r.mes} value={r.mes}>{r.mes}</option>
                ))}
              </select>
            </div>

            {seleccionado && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
                <div className="bg-green-100 text-green-800 rounded p-3 text-center">
                  <p className="font-bold text-xs">Trabajos</p>
                  <p className="text-base">${seleccionado.trabajos.toLocaleString("es-AR")}</p>
                </div>
                <div className="bg-blue-100 text-blue-800 rounded p-3 text-center">
                  <p className="font-bold text-xs">Accesorios</p>
                  <p className="text-base">${seleccionado.accesorios.toLocaleString("es-AR")}</p>
                </div>
                <div className="bg-orange-100 text-orange-800 rounded p-3 text-center">
                  <p className="font-bold text-xs">Teléfonos</p>
                  <p className="text-base">${seleccionado.telefonos.toLocaleString("es-AR")}</p>
                </div>
                <div className="bg-gray-100 text-gray-800 rounded p-3 text-center">
                  <p className="font-bold text-xs">TOTAL</p>
                  <p className="text-base">${totalMes.toLocaleString("es-AR")}</p>
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resumenMensual.filter((r) => r.mes === mesSeleccionado)}>
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="trabajos" name="Trabajos" fill="#4CAF50" />
                <Bar dataKey="accesorios" name="Accesorios" fill="#2196F3" />
                <Bar dataKey="telefonos" name="Teléfonos" fill="#FF9800" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </>
  );
}
