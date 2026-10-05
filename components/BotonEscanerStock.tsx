"use client";

import { useCallback, useState } from "react";
import EscanerCodigoBarras from "@/components/EscanerCodigoBarras";
import ModalIngresoStock from "@/app/ventas/stock-accesorios-repuestos/components/ModalIngresoStock";
import { useRol } from "@/lib/useRol";
import useCotizacion from "@/lib/hooks/useCotizacion";
import {
  buscarProductoPorCodigoBarras,
  type ProductoCodigoBarras,
} from "@/lib/buscarProductoPorCodigoBarras";

type Props = {
  /** Clase extra del botón */
  className?: string;
  /** Variante visual */
  variante?: "inicio" | "stock";
  label?: string;
};

export default function BotonEscanerStock({
  className = "",
  variante = "inicio",
  label = "Leer código",
}: Props) {
  const { rol } = useRol();
  const negocioID = rol?.negocioID || "";
  const { cotizacion } = useCotizacion(negocioID);

  const [escannerAbierto, setEscannerAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [producto, setProducto] = useState<ProductoCodigoBarras | null>(null);

  const onDetectado = useCallback(
    async (codigo: string) => {
      if (!negocioID) {
        alert("No hay negocio activo.");
        return;
      }
      setBuscando(true);
      try {
        const encontrado = await buscarProductoPorCodigoBarras(negocioID, codigo);
        if (!encontrado) {
          alert(`No se encontró un accesorio o repuesto con el código:\n${codigo}`);
          return;
        }
        setProducto(encontrado);
      } catch (e) {
        console.error(e);
        alert("Error al buscar el producto.");
      } finally {
        setBuscando(false);
      }
    },
    [negocioID]
  );

  const baseBtn =
    variante === "inicio"
      ? "inline-flex items-center gap-2 bg-white/25 hover:bg-white/40 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl shadow-lg border border-white/30 transition-all duration-200 hover:scale-105"
      : "inline-flex items-center gap-2 bg-gradient-to-r from-[#16a085] to-[#1abc9c] hover:from-[#138d75] hover:to-[#16a085] text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all duration-200 hover:scale-[1.02]";

  return (
    <>
      <button
        type="button"
        onClick={() => setEscannerAbierto(true)}
        disabled={!negocioID || buscando}
        className={`${baseBtn} ${className} disabled:opacity-50`}
        title="Escanear código de barras o QR de accesorio/repuesto"
      >
        <span>📷</span>
        <span>{buscando ? "Buscando…" : label}</span>
      </button>

      <EscanerCodigoBarras
        abierto={escannerAbierto}
        titulo="Escanear producto"
        modo="codigo"
        onDetectado={(c) => void onDetectado(c)}
        onCerrar={() => setEscannerAbierto(false)}
      />

      {producto && negocioID ? (
        <ModalIngresoStock
          producto={producto}
          negocioID={negocioID}
          coleccion={producto.coleccion}
          cotizacion={cotizacion}
          onClose={() => setProducto(null)}
          onActualizado={() => setProducto(null)}
        />
      ) : null}
    </>
  );
}
