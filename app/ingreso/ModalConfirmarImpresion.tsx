"use client";

interface ModalConfirmarImpresionProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  nombreCliente?: string;
  numeroOrden?: string;
}

export default function ModalConfirmarImpresion({ 
  isOpen, 
  onConfirm, 
  onCancel,
  nombreCliente,
  numeroOrden 
}: ModalConfirmarImpresionProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-scaleIn">
        
        {/* HEADER CON DEGRADADO */}
        <div className="bg-gradient-to-r from-[#27ae60] to-[#2ecc71] p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-4xl">✅</span>
          </div>
          <h3 className="text-2xl font-bold text-white drop-shadow-lg">
            ¡Trabajo Guardado!
          </h3>
        </div>

        {/* CONTENIDO */}
        <div className="p-6">
          {/* Información del trabajo */}
          <div className="bg-gradient-to-r from-[#ecf0f1] to-[#d5dbdb] rounded-xl p-4 mb-6 border border-[#bdc3c7]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3498db] rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white text-xl">📋</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#2c3e50]">Orden: {numeroOrden}</p>
                <p className="text-sm text-[#7f8c8d] truncate">Cliente: {nombreCliente}</p>
              </div>
            </div>
          </div>

          {/* Mensaje */}
          <div className="text-center mb-6">
            <p className="text-[#2c3e50] text-lg font-semibold mb-2">
              El trabajo se guardó correctamente en el sistema.
            </p>
            <p className="text-[#7f8c8d] text-sm">
              ¿Deseas imprimir documentos ahora?
            </p>
          </div>

          {/* BOTONES */}
          <div className="space-y-3">
            {/* SÍ - IMPRIMIR */}
            <button
              onClick={onConfirm}
              className="w-full bg-gradient-to-r from-[#3498db] to-[#2980b9] hover:from-[#2980b9] hover:to-[#21618c] text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🖨️</span>
              Sí, Abrir Opciones de Impresión
            </button>

            {/* NO - SOLO GUARDAR */}
            <button
              onClick={onCancel}
              className="w-full bg-gradient-to-r from-[#95a5a6] to-[#7f8c8d] hover:from-[#7f8c8d] hover:to-[#6c7b7d] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-md flex items-center justify-center gap-2"
            >
              <span className="text-xl">✓</span>
              No, Solo Guardar
            </button>
          </div>

          {/* TIP */}
          <div className="mt-4 text-xs text-center text-[#7f8c8d] bg-[#ecf0f1] rounded-lg p-3 border border-[#d5dbdb]">
            💡 <strong>Tip:</strong> Siempre podrás imprimir después desde el detalle del trabajo
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { 
            transform: scale(0.9);
            opacity: 0;
          }
          to { 
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}