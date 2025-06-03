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
    <>
      {/* Filtro por cliente/modelo */}
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Filtrar por cliente o modelo"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] w-full"
        />
        {filtroTexto && (
          <button
            onClick={() => setFiltroTexto("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7f8c8d] hover:text-[#e74c3c] transition-colors text-sm"
          >
            ❌
          </button>
        )}
      </div>

      {/* Filtro por trabajo */}
      <div className="relative">
        <input
          type="text"
          placeholder="🛠️ Filtrar por trabajo"
          value={filtroTrabajo}
          onChange={(e) => setFiltroTrabajo(e.target.value)}
          className="px-4 py-3 border-2 border-[#bdc3c7] rounded-lg bg-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-all text-[#2c3e50] placeholder-[#7f8c8d] w-full"
        />
        {filtroTrabajo && (
          <button
            onClick={() => setFiltroTrabajo("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7f8c8d] hover:text-[#e74c3c] transition-colors text-sm"
          >
            ❌
          </button>
        )}
      </div>
    </>
  );
}