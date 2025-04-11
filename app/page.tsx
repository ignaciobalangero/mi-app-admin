"use client";
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
    { label: "Pago de clientes", href: "/pagos" },
  ];

  const botones = rol === "admin" ? botonesAdmin : botonesEmpleado;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col items-center justify-center bg-gray-900 p-8 text-white">
        <h1 className="text-3xl font-bold mb-10 text-center">
          Director del panel
        </h1>

        {loadingUser || !rol ? (
          <p className="text-gray-400 text-lg mt-10">Cargando rol...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-xl">
            {botones.map(({ label, href }) => (
              <Link key={href} href={href}>
                <div className="bg-blue-600 text-white rounded-2xl shadow-md p-6 text-center text-xl font-medium hover:bg-blue-700 transition cursor-pointer">
                  {label}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
