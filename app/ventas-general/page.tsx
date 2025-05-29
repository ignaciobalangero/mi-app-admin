"use client";

import { useState } from "react";
import Header from "../Header";
import TablaVentas from "./componentes/TablaVentas";
import ModalVenta from "./componentes/ModalVenta"; // ✅ nombre original

export default function VentasPage() {
  const [refrescar, setRefrescar] = useState(false);
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-100 text-black p-7">
        <div className="bg-white p-4 rounded-xl shadow-lg max-w-9xl mx-auto space-y-6">
          {/* Botón para abrir el modal */}
          <div className="flex justify-between">
            <button
              onClick={() => setMostrarModalVenta(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Nueva venta
            </button>
          </div>

          {/* Tabla de ventas */}
          <TablaVentas refrescar={refrescar} />
        </div>
      </main>

      {/* Modal de carga de venta */}
      {mostrarModalVenta && (
        <ModalVenta
          refrescar={refrescar}
          setRefrescar={setRefrescar}
          onClose={() => setMostrarModalVenta(false)}
        />
      )}
    </>
  );
}
