"use client";

interface Props {
  exportarExcel: () => void;
  mostrarSugerencias: boolean;
  setMostrarSugerencias: (val: boolean) => void;
  mostrarFormulario: boolean;
  setMostrarFormulario: (val: boolean) => void;
}

export default function Acciones({
  exportarExcel,
  mostrarSugerencias,
  setMostrarSugerencias,
  mostrarFormulario,
  setMostrarFormulario,
}: Props) {
  return (
    <div className="flex gap-4 items-center mb-4">
      <button
        onClick={exportarExcel}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
      >
        📤 Exportar pedidos sugeridos
      </button>
      <button
        onClick={() => setMostrarSugerencias(!mostrarSugerencias)}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
      >
        {mostrarSugerencias ? "Ocultar pedidos" : "Mostrar pedidos"}
      </button>
      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        {mostrarFormulario ? "Ocultar formulario" : "Agregar productos"}
      </button>
    </div>
  );
}