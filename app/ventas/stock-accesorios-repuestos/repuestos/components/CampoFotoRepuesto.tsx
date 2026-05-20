"use client";

import { useRef, useState } from "react";
import { ref as refStorage, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  comprimirImagenParaCatalogo,
  formatearPesoImagen,
} from "@/lib/comprimirImagenCliente";
import { ImagePlus, Package } from "lucide-react";

type Props = {
  negocioID: string;
  productoId?: string;
  fotoURL: string;
  onChange: (url: string) => void;
  compact?: boolean;
};

export default function CampoFotoRepuesto({
  negocioID,
  productoId,
  fotoURL,
  onChange,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [infoOptimizacion, setInfoOptimizacion] = useState("");

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !negocioID) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      alert("Usá JPG, PNG, WEBP o GIF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("La imagen es demasiado grande (máx. 15 MB).");
      return;
    }
    setSubiendo(true);
    setInfoOptimizacion("");
    try {
      const optimizada = await comprimirImagenParaCatalogo(file);
      if (optimizada.bytesComprimidos < optimizada.bytesOriginales) {
        setInfoOptimizacion(
          `Optimizada: ${formatearPesoImagen(optimizada.bytesOriginales)} → ${formatearPesoImagen(optimizada.bytesComprimidos)}`
        );
      }
      const carpeta = productoId || `temp-${Date.now()}`;
      const path = `negocios/${negocioID}/repuestos/${carpeta}/${Date.now()}.${optimizada.extension}`;
      const r = refStorage(storage, path);
      await uploadBytes(r, optimizada.blob, {
        contentType: optimizada.mimeType,
      });
      onChange(await getDownloadURL(r));
    } catch (err) {
      console.error(err);
      alert("No se pudo subir la imagen. Revisá las reglas de Firebase Storage.");
    } finally {
      setSubiendo(false);
    }
  };

  const wrap = compact
    ? "space-y-2"
    : "space-y-2 rounded-xl border-2 border-[#9b59b6]/25 bg-white p-3 sm:p-4";

  return (
    <div className={wrap}>
      <label className="block text-xs font-semibold text-[#2c3e50]">
        Foto del producto (se ve en la tienda web)
      </label>
      <input
        type="text"
        value={fotoURL}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… o subí una imagen"
        className="w-full rounded-lg border-2 border-[#bdc3c7] bg-white p-2 text-xs text-[#2c3e50] focus:border-[#9b59b6] focus:ring-2 focus:ring-[#9b59b6]/15"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleFile(e)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={subiendo || !negocioID}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#9b59b6] px-3 py-2 text-xs font-semibold text-white shadow hover:bg-[#8e44ad] disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" />
          {subiendo ? "Optimizando y subiendo…" : "Subir imagen"}
        </button>
        {!compact && (
          <span className="text-[10px] text-[#95a5a6]">
            Se optimiza sola al subir (máx. 1200 px, ~400 KB). Podés elegir fotos grandes del celular.
          </span>
        )}
      </div>
      {infoOptimizacion ? (
        <p className="text-[10px] font-medium text-[#27ae60]">{infoOptimizacion}</p>
      ) : null}
      {fotoURL.startsWith("http") ? (
        <img
          src={fotoURL}
          alt=""
          className={`rounded-lg border border-[#ecf0f1] bg-white object-contain ${compact ? "h-16 w-16" : "h-24 w-24"}`}
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[#dcdfe2] bg-[#f4f6f7]">
          <Package className="h-6 w-6 text-[#bdc3c7]" />
        </div>
      )}
    </div>
  );
}
