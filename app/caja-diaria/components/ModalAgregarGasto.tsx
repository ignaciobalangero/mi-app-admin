"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Props {
  negocioID: string;
  onClose: () => void;
  onGuardado: () => void;
}

export default function ModalAgregarGasto({ negocioID, onClose, onGuardado }: Props) {
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"ARS" | "USD">("ARS");
  const [categoria, setCategoria] = useState("");
  const [guardando, setGuardando] = useState(false);

  const categorias = [
    "Sueldos",
    "Servicios",
    "Alquiler",
    "Impuestos",
    "Compras",
    "Mantenimiento",
    "Otro"
  ];

  const guardarGasto = async () => {
    if (!concepto.trim() || !monto || Number(monto) <= 0) {
      alert("⚠️ Completá todos los campos obligatorios");
      return;
    }

    setGuardando(true);

    try {
      const hoy = new Date().toLocaleDateString("es-AR");
      
      await addDoc(collection(db, `negocios/${negocioID}/gastos`), {
        concepto: concepto.trim(),
        monto: Number(monto),
        moneda,
        categoria: categoria || "Otro",
        fecha: hoy,
        timestamp: new Date(),
        usuario: "Sistema" // Podés agregar el nombre del usuario actual
      });

      // Toast de éxito
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        color: white;
        padding: 24px 32px;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 18px;
        font-weight: 600;
      `;
      toast.innerHTML = `
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
          ✓
        </div>
        <span>Gasto registrado correctamente</span>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 1000);

      onGuardado();
    } catch (error) {
      console.error("Error guardando gasto:", error);
      alert("❌ Error al guardar el gasto");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#e74c3c] to-[#c0392b] text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">➕</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Agregar Gasto</h3>
                <p className="text-sm text-red-100">Registrar egreso del día</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg w-8 h-8 flex items-center justify-center transition-all"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Concepto */}
          <div>
            <label className="block text-sm font-medium text-[#2c3e50] mb-2">
              Concepto *
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Pago de alquiler"
               className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50]"
            />
          </div>

          {/* Monto y Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                Monto *
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2c3e50] mb-2">
                Moneda
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as "ARS" | "USD")}
                className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50]"
                >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-[#2c3e50] mb-2">
              Categoría
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full px-4 py-3 border-2 border-[#bdc3c7] rounded-lg focus:ring-2 focus:ring-[#e74c3c] focus:border-[#e74c3c] transition-all text-[#2c3e50]"
              >
              <option value="">Seleccionar...</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-[#f8f9fa] rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-[#95a5a6] hover:bg-[#7f8c8d] text-white rounded-lg font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={guardarGasto}
            disabled={guardando}
            className={`flex-1 px-6 py-3 rounded-lg font-medium text-white transition-all ${
              guardando
                ? "bg-[#bdc3c7] cursor-not-allowed"
                : "bg-[#e74c3c] hover:bg-[#c0392b]"
            }`}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>

      </div>
    </div>
  );
}