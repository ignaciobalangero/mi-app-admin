"use client";

interface Producto {
  id: string;
  producto: string;
  color: string;
  cantidad: number;
  stockIdeal: number;
}

interface Props {
  productosAPedir: Producto[];
}

export default function PedidosSugeridos({ productosAPedir }: Props) {
  if (productosAPedir.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#fcf3cf] to-[#f7dc6f] border-2 border-[#f39c12] rounded-2xl p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#f39c12] rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">📦</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#e67e22]">Pedidos Sugeridos</h3>
          <p className="text-[#d68910] text-xs">{productosAPedir.length} productos necesitan reposición</p>
        </div>
      </div>
      
      <div className="space-y-2">
        {productosAPedir.map((p) => (
          <div key={p.id} className="bg-white/60 rounded-lg p-3 border border-[#f39c12]/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#e67e22]">{p.producto} {p.color}</p>
                <p className="text-xs text-[#d68910]">
                  Stock actual: {p.cantidad} • Stock ideal: {p.stockIdeal}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#e74c3c] text-white">
                  Faltan {p.stockIdeal - p.cantidad}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}