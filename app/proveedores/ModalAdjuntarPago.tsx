"use client";

import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CampoAdjuntos, { type AdjuntoProveedor } from "./CampoAdjuntos";

type PagoMinimo = {
  id: string;
  fecha?: string;
  forma?: string;
  adjuntos?: AdjuntoProveedor[];
};

export default function ModalAdjuntarPago({
  negocioID,
  proveedorId,
  pago,
  onClose,
  onGuardado,
  onError,
}: {
  negocioID: string;
  proveedorId: string;
  pago: PagoMinimo;
  onClose: () => void;
  onGuardado: (adjuntos: AdjuntoProveedor[]) => void;
  onError: (mensaje: string) => void;
}) {
  const [adjuntos, setAdjuntos] = useState<AdjuntoProveedor[]>(pago.adjuntos || []);
  const cola = useRef(Promise.resolve());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="mb-1 text-lg font-bold text-gray-900">Anexar comprobante</h3>
        <p className="mb-4 text-sm text-gray-600">
          {pago.fecha || "Pago"} · {pago.forma || "sin forma"}. Se guarda al pegar o subir, aunque el pago ya esté registrado.
        </p>
        <CampoAdjuntos
          negocioID={negocioID}
          proveedorId={proveedorId}
          carpeta="pagos"
          adjuntos={adjuntos}
          onChange={(lista) => {
            setAdjuntos(lista);
            const pagoId = pago.id;
            cola.current = cola.current.then(() =>
              updateDoc(doc(db, `negocios/${negocioID}/pagosProveedores/${pagoId}`), { adjuntos: lista })
                .then(() => onGuardado(lista))
                .catch((error) => {
                  console.error(error);
                  onError("No se pudieron guardar los archivos");
                })
            );
          }}
          titulo="Comprobantes"
          ayuda="Pegá la captura de la transferencia o subí el PDF."
        />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
