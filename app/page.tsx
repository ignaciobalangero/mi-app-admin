"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../lib/auth";
import Header from "./Header";
import { useRol } from "../lib/useRol";
import Link from "next/link";

const botonesAdmin = [
  { label: "Ingreso de trabajo", href: "/ingreso" },
  { label: "Trabajos pendientes", href: "/pendientes" },
  { label: "Trabajos entregados", href: "/entregados" },
  { label: "Resumen de clientes", href: "/resumen" },
  { label: "Cuenta corriente", href: "/cuenta" },
  { label: "Pago de clientes", href: "/pagos" },
  { label: "Resumen de cuenta", href: "/resumen-cuenta" },
  { label: "Ventas", href: "/ventas" },
];

const botonesEmpleado = [
  { label: "Ingreso de trabajo", href: "/ingreso" },
  { label: "Trabajos pendientes", href: "/pendientes" },
  { label: "Trabajos entregados", href: "/entregados" },
];

function Home() {
  const { rol } = useRol();
  const router = useRouter();

  useEffect(() => {
    if (rol === "cliente") {
      router.push("/cliente");
    }
  }, [rol]);

  if (rol === null) {
    return <p className="text-center text-black mt-10">Cargando panel...</p>;
  }

  if (rol !== "admin" && rol !== "empleado") {
    return null;
  }

  const botones = rol === "admin" ? botonesAdmin : botonesEmpleado;

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen flex flex-col items-center justify-start bg-gray-100 p-8 text-black">
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

export default function HomeWrapper() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading]);

  if (loading || !user) return null;

  return <Home />;
}
