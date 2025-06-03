"use client";

interface Props {
  totalUSD: number;
  totalPesos: number;
}

export default function ResumenCapital({ totalUSD, totalPesos }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-lg border border-[#ecf0f1]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#e67e22] rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">💰</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2c3e50]">Resumen de Capital</h3>
          <p className="text-[#7f8c8d] text-xs">Valor total del inventario de repuestos</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-[#d5f4e6] to-[#c3f0ca] rounded-xl p-4 border-2 border-[#27ae60]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#27ae60]">Capital en USD</p>
              <p className="text-xl font-bold text-[#27ae60]">
                ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-[#27ae60]/20 rounded-full flex items-center justify-center">
              <span className="text-lg">🇺🇸</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#ebf3fd] to-[#d6eaff] rounded-xl p-4 border-2 border-[#3498db]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#3498db]">Capital en Pesos</p>
              <p className="text-xl font-bold text-[#3498db]">
                ${totalPesos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-10 h-10 bg-[#3498db]/20 rounded-full flex items-center justify-center">
              <span className="text-lg">🇦🇷</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}