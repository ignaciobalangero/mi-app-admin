"use client";

import React from "react";

export default function ModalAdvertencia({
  mensaje,
  onClose,
}: {
  mensaje: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
        <h2 className="text-lg font-bold text-yellow-600 mb-3">⚠️ Atención</h2>
        <p className="text-gray-800 mb-4">{mensaje}</p>
        <button
          onClick={onClose}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
