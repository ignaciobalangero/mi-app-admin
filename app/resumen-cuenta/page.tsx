"use client";

import { useEffect, useState } from "react";
import Header from "../Header";
import { useRol } from "../../lib/useRol";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const botonesAdmin = [
  { label: "Ingreso de trabajo", href: "/ingreso" },
  { label: "Trabajos pendientes", href: "/pendientes" },
  { label: "Trabajos entregados", href: "/entregados" },
  { label: "Resumen de clientes", href: "/resumen" },
  { label: "Cuenta corriente", href: "/cuenta" },
  { label: "Pago de clientes", href: "/pagos" },
  { label: "Resumen de cuenta", href: "/resumen-cuenta" }
];

const botonesEmpleado = [
  { label: "Ingreso de trabajo", href: "/ingreso" },
  { label: "Trabajos pendientes", href: "/pendientes" },
  { label: "Trabajos entregados", href: "/entregados" }
];

export default function Home() {
  const rol = useRol();
  const botones = rol === "admin" ? botonesAdmin : botonesEmpleado;

  const [gananciasPorMes, setGananciasPorMes] = useState([]);

  useEffect(() => {
    const fetchGanancias = async () => {
      const querySnapshot = await getDocs(collection(db, "trabajos"));
      const resumen: Record<string, number> = {};

      querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.estado === "ENTREGADO" && data.precio && data.costo && data.fecha) {
          const [dia, mes, anio] = data.fecha.split("/");
          const key = `${mes}/${anio}`;
          const ganancia = Number(data.precio) - Number(data.costo);

          if (!resumen[key]) resumen[key] = 0;
          resumen[key] += ganancia;
        }
      });

      const resultado = Object.entries(resumen).map(([mes, total]) => ({ mes, total }));
      setGananciasPorMes(resultado);
    };

    if (rol === "admin") fetchGanancias();
  }, [rol]);

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-black">
        <h1 className="text-3xl font-bold mb-6">Director del panel</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {botones.map((boton, i) => (
            <Link
              key={i}
              href={boton.href}
              className="bg-white shadow-lg rounded-xl p-6 text-center hover:bg-gray-200 transition"
            >
              {boton.label}
            </Link>
          ))}
        </div>

        {rol === "admin" && gananciasPorMes.length > 0 && (
          <div className="w-full max-w-4xl bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-center">Ganancias por mes</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gananciasPorMes}>
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#4CAF50" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </>
  );
}
