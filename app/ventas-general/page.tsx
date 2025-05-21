"use client";

import { useState } from "react";
import Header from "../Header";
import FormularioVenta from "./componentes/FormularioVenta";
import TablaVentas from "./componentes/TablaVentas";

export default function VentasPage() {
  const [refrescar, setRefrescar] = useState(false);

  const obtenerVentas = () => {
    setRefrescar(prev => !prev); // cambia el booleano, dispara el useEffect en TablaVentas
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-100 text-black p-7">
        <div className="bg-white p-4 rounded-xl shadow-lg max-w-9xl mx-auto space-y-6">
          <FormularioVenta onVentaGuardada={obtenerVentas} />
          <TablaVentas refrescar={refrescar} />
        </div>
      </main>
    </>
  );
}
