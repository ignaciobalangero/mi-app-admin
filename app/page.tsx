"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "./Header";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/auth";
import { useRol } from "@/lib/useRol";

export default function Home() {
  const [user, loadingUser] = useAuthState(auth);
  const rol = useRol();

  const botonesEmpleado = [
    { label: "Ingreso de trabajo", href: "/ingreso" },
    { label: "Trabajos pendientes", href: "/pendientes" },
    { label: "Trabajos entregados", href: "/entregados" },
  ];

  const botonesAdmin = [
    ...botonesEmpleado,
    { label: "Resumen de clientes", href: "/resumen" },
    { label: "Cuenta corriente", href: "/cuenta" },
    { label: "Pago de Clientes", href: "/pagos" },
  ];

  const botones = rol === "admin" ? botonesAdmin : botonesEmpleado;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-black">
        <h1 className="text-3xl font-bold mb-6">Director del panel</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
      </main>
    </>
  );
}
