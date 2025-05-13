interface FiltroProps {
  filtroTexto: string;
  setFiltroTexto: (valor: string) => void;
  filtroTrabajo: string;
  setFiltroTrabajo: (valor: string) => void;
}

export default function FiltroTrabajos({
  filtroTexto,
  setFiltroTexto,
  filtroTrabajo,
  setFiltroTrabajo,
}: FiltroProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      <div className="relative max-w-xs">
        <input
          type="text"
          placeholder="Filtrar por cliente o modelo"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="w-full p-2 pl-10 border border-gray-400 rounded"
        />
        <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
      </div>

      <div className="relative max-w-xs">
        <input
          type="text"
          placeholder="Filtrar por trabajo"
          value={filtroTrabajo}
          onChange={(e) => setFiltroTrabajo(e.target.value)}
          className="w-full p-2 pl-10 border border-gray-400 rounded"
        />
        <span className="absolute left-3 top-2.5 text-gray-500">🛠️</span>
      </div>
    </div>
  );
}
