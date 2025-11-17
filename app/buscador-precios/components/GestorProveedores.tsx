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

export default function GestorProveedores({ proveedores, setProveedores }: Props) {
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

  const agregarProveedor = () => {
    if (!nuevoNombre.trim()) {
      alert("Por favor ingresa un nombre");
      return;
    }

    const existe = proveedores.find(
      (p) => p.nombre.toLowerCase() === nuevoNombre.toLowerCase()
    );

    if (existe) {
      alert("Ya existe un proveedor con ese nombre");
      return;
    }

    const nuevo: Proveedor = {
      id: Date.now().toString(),
      nombre: nuevoNombre.trim(),
      lista: "",
      fechaActualizacion: "",
    };

    setProveedores([...proveedores, nuevo]);
    setNuevoNombre("");
  };

  const eliminarProveedor = (id: string) => {
    if (confirm("¿Seguro que querés eliminar este proveedor?")) {
      setProveedores(proveedores.filter((p) => p.id !== id));
    }
  };

  const iniciarEdicion = (proveedor: Proveedor) => {
    setEditando(proveedor.id);
    setNombreEditado(proveedor.nombre);
  };

  const guardarEdicion = (id: string) => {
    if (!nombreEditado.trim()) {
      alert("El nombre no puede estar vacío");
      return;
    }

    setProveedores(
      proveedores.map((p) =>
        p.id === id ? { ...p, nombre: nombreEditado.trim() } : p
      )
    );
    setEditando(null);
    setNombreEditado("");
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setNombreEditado("");
  };

  return (
    <div className="space-y-6">
      {/* Formulario para agregar proveedor */}
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#ecf0f1]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#27ae60] rounded-xl flex items-center justify-center">
            <span className="text-white text-2xl">➕</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#2c3e50]">Agregar Proveedor</h2>
            <p className="text-[#7f8c8d] mt-1">Añadí los proveedores de los que recibís listas</p>
          </div>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && agregarProveedor()}
            placeholder="Nombre del proveedor (ej: TecnoMax, MovilShop...)"
            className="flex-1 px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#27ae60] focus:border-[#27ae60] transition-all text-[#2c3e50]"
          />
          <button
            onClick={agregarProveedor}
            className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] hover:from-[#2ecc71] hover:to-[#27ae60] text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            ➕ Agregar
          </button>
        </div>
      </div>

      {/* Lista de proveedores */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-[#ecf0f1]">
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] text-white p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🏪</span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">Proveedores Registrados</h3>
              <p className="text-green-100 mt-1">
                {proveedores.length} {proveedores.length === 1 ? "proveedor" : "proveedores"}
              </p>
            </div>
          </div>
        </div>

        {proveedores.length === 0 ? (
          <div className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-[#ecf0f1] rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🏪</span>
              </div>
              <div>
                <p className="text-xl font-semibold text-[#2c3e50] mb-2">
                  No hay proveedores registrados
                </p>
                <p className="text-sm text-[#7f8c8d]">
                  Agregá tu primer proveedor para comenzar
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb]">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏪</span>
                      Nombre del Proveedor
                    </div>
                  </th>
                  <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">📅</span>
                      Última Actualización
                    </div>
                  </th>
                  <th className="p-4 text-center text-sm font-semibold text-[#2c3e50] border border-[#bdc3c7]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-base">⚙️</span>
                      Acciones
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((proveedor, index) => {
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={proveedor.id}
                      className={`transition-all duration-200 hover:bg-[#ebf3fd] ${
                        isEven ? "bg-white" : "bg-[#f8f9fa]"
                      }`}
                    >
                      <td className="p-4 border border-[#bdc3c7]">
                        {editando === proveedor.id ? (
                          <input
                            type="text"
                            value={nombreEditado}
                            onChange={(e) => setNombreEditado(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") guardarEdicion(proveedor.id);
                              if (e.key === "Escape") cancelarEdicion();
                            }}
                            className="w-full px-3 py-2 border-2 border-[#3498db] rounded-lg focus:ring-2 focus:ring-[#3498db]"
                            autoFocus
                          />
                        ) : (
                          <span className="text-[#2c3e50] font-semibold">
                            {proveedor.nombre}
                          </span>
                        )}
                      </td>
                      <td className="p-4 border border-[#bdc3c7] text-center">
                        {proveedor.fechaActualizacion ? (
                          <span className="text-sm text-[#7f8c8d] bg-[#ecf0f1] px-3 py-1 rounded-lg">
                            {proveedor.fechaActualizacion}
                          </span>
                        ) : (
                          <span className="text-sm text-[#95a5a6] italic">
                            Sin lista cargada
                          </span>
                        )}
                      </td>
                      <td className="p-4 border border-[#bdc3c7]">
                        <div className="flex justify-center gap-2">
                          {editando === proveedor.id ? (
                            <>
                              <button
                                onClick={() => guardarEdicion(proveedor.id)}
                                className="bg-[#27ae60] hover:bg-[#2ecc71] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                              >
                                ✅ Guardar
                              </button>
                              <button
                                onClick={cancelarEdicion}
                                className="bg-[#95a5a6] hover:bg-[#7f8c8d] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                              >
                                ❌ Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => iniciarEdicion(proveedor)}
                                className="bg-[#f39c12] hover:bg-[#e67e22] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => eliminarProveedor(proveedor.id)}
                                className="bg-[#e74c3c] hover:bg-[#c0392b] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105"
                              >
                                🗑️ Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}