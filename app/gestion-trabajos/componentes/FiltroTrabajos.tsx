"use client";

interface FiltroProps {
  filtro: string;
  setFiltro: (valor: string) => void;
}

export default function FiltroTrabajos({ filtro, setFiltro }: FiltroProps) {
  return (
    <div className="relative max-w-2xl ml-12 mb-4"> {/* ← Ajustá el número de ml- aquí */}
      <input
        type="text"
        placeholder="Filtrar por cliente o modelo"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full p-2 pl-10 border border-gray-400 rounded"
      />
      <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
    </div>
  );
}
