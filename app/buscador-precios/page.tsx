"use client";

import { useState, useEffect } from "react";
import Header from "@/app/Header";
import GestorProveedores from "./components/GestorProveedores";
import CargadorListas from "./components/CargadorListas";
import BuscadorComparativo from "./components/BuscadorComparativo";

interface Proveedor {
  id: string;
  nombre: string;
  lista: string;
  fechaActualizacion: string;
}

export default function BuscadorPrecios() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [vistaActual, setVistaActual] = useState<"proveedores" | "cargar" | "buscar">("buscar");

  // Cargar proveedores desde localStorage
  useEffect(() => {
    const guardados = localStorage.getItem("proveedores-listas");
    if (guardados) {
      setProveedores(JSON.parse(guardados));
    }
  }, []);

  // Guardar proveedores en localStorage
  const guardarProveedores = (nuevosProveedores: Proveedor[]) => {
    setProveedores(nuevosProveedores);
    localStorage.setItem("proveedores-listas", JSON.stringify(nuevosProveedores));
  };

  return (
    <>
      <Header />
      <main className="pt-20 bg-[#f8f9fa] min-h-screen text-black w-full">
        <div className="w-full px-6 max-w-[1600px] mx-auto">
          
          {/* Header de la página */}
          <div className="bg-gradient-to-r from-[#3498db] to-[#2980b9] rounded-2xl p-8 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🔍</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Buscador de Precios
                </h1>
                <p className="text-blue-100 text-lg">
                  Compará precios de todos tus proveedores en un solo lugar
                </p>
              </div>
            </div>
          </div>

          {/* Navegación entre secciones */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setVistaActual("buscar")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  vistaActual === "buscar"
                    ? "bg-gradient-to-r from-[#3498db] to-[#2980b9] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                🔍 Buscar Precios
              </button>

              <button
                onClick={() => setVistaActual("cargar")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  vistaActual === "cargar"
                    ? "bg-gradient-to-r from-[#9b59b6] to-[#8e44ad] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                📋 Cargar Listas
              </button>

              <button
                onClick={() => setVistaActual("proveedores")}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 ${
                  vistaActual === "proveedores"
                    ? "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                🏪 Gestionar Proveedores
              </button>
            </div>
          </div>

          {/* Contenido según vista actual */}
          {vistaActual === "proveedores" && (
            <GestorProveedores 
              proveedores={proveedores}
              setProveedores={guardarProveedores}
            />
          )}

          {vistaActual === "cargar" && (
            <CargadorListas 
              proveedores={proveedores}
              setProveedores={guardarProveedores}
            />
          )}

          {vistaActual === "buscar" && (
            <BuscadorComparativo proveedores={proveedores} />
          )}
        </div>
      </main>
    </>
  );
}