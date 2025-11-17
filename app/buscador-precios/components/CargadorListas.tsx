"use client";

import { useState } from "react";

interface Proveedor {
  id: string;
  nombre: string;
  lista: string;
  fechaActualizacion: string;
}

interface Props {
  proveedores: Proveedor[];
  setProveedores: (proveedores: Proveedor[]) => void;
}

export default function CargadorListas({ proveedores, setProveedores }: Props) {
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState("");
  const [listaTexto, setListaTexto] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cargarLista = () => {
    if (!proveedorSeleccionado) {
      alert("Seleccioná un proveedor");
      return;
    }

    if (!listaTexto.trim()) {
      alert("Pegá la lista de precios");
      return;
    }

    const fecha = new Date().toLocaleDateString("es-AR");
    const hora = new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const proveedoresActualizados = proveedores.map((p) =>
      p.id === proveedorSeleccionado
        ? {
            ...p,
            lista: listaTexto.trim(),
            fechaActualizacion: `${fecha} ${hora}`,
          }
        : p
    );

    setProveedores(proveedoresActualizados);
    setListaTexto("");
    setMensaje("✅ Lista cargada correctamente");
    setTimeout(() => setMensaje(""), 3000);
  };

  const limpiarLista = () => {
    if (!proveedorSeleccionado) {
      alert("Seleccioná un proveedor");
      return;
    }

    if (
      confirm(
        "¿Seguro que querés limpiar la lista de este proveedor? Esta acción no se puede deshacer."
      )
    ) {
      const proveedoresActualizados = proveedores.map((p) =>
        p.id === proveedorSeleccionado
          ? { ...p, lista: "", fechaActualizacion: "" }
          : p
      );

      setProveedores(proveedoresActualizados);
      setListaTexto("");
      setMensaje("🗑️ Lista limpiada correctamente");
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const limpiarTodasLasListas = () => {
    if (
      confirm(
        "¿Seguro que querés limpiar TODAS las listas? Esta acción no se puede deshacer."
      )
    ) {
      const proveedoresLimpiados = proveedores.map((p) => ({
        ...p,
        lista: "",
        fechaActualizacion: "",
      }));

      setProveedores(proveedoresLimpiados);
      setProveedorSeleccionado("");
      setListaTexto("");
      setMensaje("🗑️ Todas las listas fueron limpiadas");
      setTimeout(() => setMensaje(""), 3000);
    }
  };

  const cargarListaExistente = () => {
    if (!proveedorSeleccionado) return;

    const proveedor = proveedores.find((p) => p.id === proveedorSeleccionado);
    if (proveedor && proveedor.lista) {
      setListaTexto(proveedor.lista);
    }
  };

  const proveedorActual = proveedores.find((p) => p.id === proveedorSeleccionado);

  return (
    <div className="space-y-6">
      {mensaje && (
        <div className="bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-green-800 font-semibold">{mensaje}</span>
          </div>
        </div>
      )}

      {proveedores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-[#ecf0f1]">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
              <span className="text-4xl">🏪</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-[#2c3e50] mb-2">
                No hay proveedores registrados
              </h3>
              <p className="text-[#7f8c8d] mb-6">
                Primero tenés que agregar proveedores en la sección "Gestionar
                Proveedores"
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Selector de proveedor */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#9b59b6] rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🏪</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#2c3e50]">
                  Seleccionar Proveedor
                </h2>
                <p className="text-[#7f8c8d] mt-1">
                  Elegí el proveedor del cual vas a cargar la lista
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <select
                value={proveedorSeleccionado}
                onChange={(e) => {
                  setProveedorSeleccionado(e.target.value);
                  setListaTexto("");
                }}
                className="flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#9b59b6] focus:border-[#9b59b6] transition-all text-[#2c3e50] font-medium"
              >
                <option value="">-- Seleccioná un proveedor --</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                    {p.fechaActualizacion
                      ? ` (Última actualización: ${p.fechaActualizacion})`
                      : " (Sin lista cargada)"}
                  </option>
                ))}
              </select>

              {proveedorSeleccionado && proveedorActual?.lista && (
                <button
                  onClick={cargarListaExistente}
                  className="bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  📋 Ver Lista Actual
                </button>
              )}
            </div>
          </div>

          {/* Área para pegar la lista */}
          {proveedorSeleccionado && (
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-[#3498db] rounded-xl flex items-center justify-center">
                  <span className="text-white text-2xl">📋</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#2c3e50]">
                    Cargar Lista de Precios
                  </h2>
                  <p className="text-[#7f8c8d] mt-1">
                    Pegá aquí la lista completa (Excel, WhatsApp, texto plano,
                    etc.)
                  </p>
                </div>
              </div>

              <textarea
                value={listaTexto}
                onChange={(e) => setListaTexto(e.target.value)}
                placeholder="Pegá aquí la lista de precios del proveedor...

Ejemplo:
iPhone 11 64GB Negro - $350.000
iPhone 12 128GB Blanco - $480.000
Samsung S21 256GB Azul - $420.000
..."
                className="w-full h-96 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] font-mono text-sm resize-none"
              />

              <div className="flex gap-4 mt-6 justify-between">
                <button
                  onClick={limpiarLista}
                  className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  🗑️ Limpiar Esta Lista
                </button>

                <div className="flex gap-4">
                  <button
                    onClick={() => setListaTexto("")}
                    className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
                  >
                    ❌ Cancelar
                  </button>
                  <button
                    onClick={cargarLista}
                    disabled={!listaTexto.trim()}
                    className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg ${
                      listaTexto.trim()
                        ? "bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#2ecc71] hover:to-[#27ae60] text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    💾 Guardar Lista
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Botón para limpiar todas las listas */}
          <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 shadow-lg border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-red-600 text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-800">
                    Zona de Peligro
                  </h3>
                  <p className="text-red-600 text-sm">
                    Esta acción eliminará todas las listas cargadas
                  </p>
                </div>
              </div>
              <button
                onClick={limpiarTodasLasListas}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🗑️ Limpiar Todas las Listas
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}