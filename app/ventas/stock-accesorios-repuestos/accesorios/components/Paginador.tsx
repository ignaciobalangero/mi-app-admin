"use client";

interface Props {
  paginaActual: number;
  setPaginaActual: (val: number) => void;
  total: number;
  productosPorPagina: number;
}

export default function Paginador({ paginaActual, setPaginaActual, total, productosPorPagina }: Props) {
  const totalPaginas = Math.ceil(total / productosPorPagina);

  if (totalPaginas <= 1) return null;

  return (
    <div className="flex justify-center gap-4 mt-6">
      {paginaActual > 1 && (
        <button
          onClick={() => setPaginaActual(paginaActual - 1)}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          ← Anterior
        </button>
      )}
      <span className="text-sm text-gray-700 mt-2">
        Página {paginaActual} de {totalPaginas}
      </span>
      {paginaActual < totalPaginas && (
        <button
          onClick={() => setPaginaActual(paginaActual + 1)}
          className="bg-gray-300 px-4 py-2 rounded"
        >
          Siguiente →
        </button>
      )}
    </div>
  );
}
