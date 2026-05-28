"use client";

import { useRef, useState } from "react";
import { ref as refStorage, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  comprimirImagenParaCatalogo,
  formatearPesoImagen,
} from "@/lib/comprimirImagenCliente";
import { esUrlFotoValida } from "@/lib/fotosRepuestoHelpers";
import { ImagePlus, Package, Star, Trash2 } from "lucide-react";

type Props = {
  negocioID: string;
  productoId?: string;
  fotosURLs: string[];
  onChange: (urls: string[]) => void;
  compact?: boolean;
};

const EXT_VALIDAS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];

export default function CampoFotoRepuesto({
  negocioID,
  productoId,
  fotosURLs,
  onChange,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [infoOptimizacion, setInfoOptimizacion] = useState("");
  const [urlManual, setUrlManual] = useState("");

  const subirArchivo = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    if (!EXT_VALIDAS.includes(ext)) {
      alert(`"${file.name}": usá JPG, PNG, WEBP, GIF o HEIC.`);
      return null;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert(`"${file.name}" es demasiado grande (máx. 15 MB).`);
      return null;
    }
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
    return getDownloadURL(r);
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!archivos.length || !negocioID) {
      if (!negocioID) {
        alert("No se detectó el negocio. Recargá la página e intentá de nuevo.");
      }
      return;
    }

    setSubiendo(true);
    setInfoOptimizacion("");
    const nuevas: string[] = [];
    try {
      for (const file of archivos) {
        const url = await subirArchivo(file);
        if (url) nuevas.push(url);
      }
      if (nuevas.length > 0) {
        onChange([...fotosURLs, ...nuevas]);
      } else {
        alert("No se pudo procesar ninguna imagen. Revisá el formato (JPG, PNG, WEBP, GIF o HEIC).");
      }
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`No se pudo subir la imagen: ${msg}`);
    } finally {
      setSubiendo(false);
    }
  };

  const agregarUrlManual = () => {
    const url = urlManual.trim();
    if (!url) return;
    if (!esUrlFotoValida(url)) {
      alert("La URL debe empezar con http:// o https://");
      return;
    }
    onChange([...fotosURLs, url]);
    setUrlManual("");
  };

  const quitar = (idx: number) => {
    onChange(fotosURLs.filter((_, i) => i !== idx));
  };

  const hacerPrincipal = (idx: number) => {
    if (idx <= 0) return;
    const copy = [...fotosURLs];
    const [item] = copy.splice(idx, 1);
    onChange([item, ...copy]);
  };

  const wrap = compact
    ? "space-y-2"
    : "space-y-3 rounded-xl border-2 border-[#9b59b6]/25 bg-white p-3 sm:p-4";

  return (
    <div className={wrap}>
      <label className="block text-xs font-semibold text-[#2c3e50]">
        Fotos del producto (se ven en la tienda web)
      </label>
      <p className="text-[10px] text-[#7f8c8d]">
        La primera foto es la portada del catálogo. Podés subir varias.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={urlManual}
          onChange={(e) => setUrlManual(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregarUrlManual();
            }
          }}
          placeholder="https://… pegar URL"
          className="min-w-[180px] flex-1 rounded-lg border-2 border-[#bdc3c7] bg-white p-2 text-xs text-[#2c3e50] focus:border-[#9b59b6] focus:ring-2 focus:ring-[#9b59b6]/15"
        />
        <button
          type="button"
          onClick={agregarUrlManual}
          disabled={!urlManual.trim()}
          className="rounded-lg border-2 border-[#9b59b6] px-3 py-2 text-xs font-semibold text-[#9b59b6] hover:bg-[#f5eef8] disabled:opacity-40"
        >
          Agregar URL
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={subiendo || !negocioID}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#9b59b6] px-3 py-2 text-xs font-semibold text-white shadow hover:bg-[#8e44ad] disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" />
          {subiendo ? "Optimizando y subiendo…" : "Subir imágenes"}
        </button>
        {!compact && (
          <span className="text-[10px] text-[#95a5a6]">
            Se optimizan solas (máx. 1200 px, ~400 KB). Elegí varias a la vez.
          </span>
        )}
      </div>
      {infoOptimizacion ? (
        <p className="text-[10px] font-medium text-[#27ae60]">{infoOptimizacion}</p>
      ) : null}

      {fotosURLs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fotosURLs.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className={`relative rounded-lg border-2 bg-white p-1 ${
                idx === 0 ? "border-[#27ae60]" : "border-[#ecf0f1]"
              }`}
            >
              {idx === 0 && (
                <span className="absolute left-1 top-1 z-10 flex items-center gap-0.5 rounded bg-[#27ae60] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Portada
                </span>
              )}
              <img
                src={url}
                alt=""
                className={`rounded-md object-contain ${compact ? "h-16 w-16" : "h-20 w-20"}`}
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {idx > 0 && (
                  <button
                    type="button"
                    onClick={() => hacerPrincipal(idx)}
                    className="rounded bg-[#ebf5fb] px-1.5 py-0.5 text-[9px] font-semibold text-[#3498db] hover:bg-[#d6eaf8]"
                    title="Usar como portada"
                  >
                    Portada
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => quitar(idx)}
                  className="inline-flex items-center gap-0.5 rounded bg-[#fdecea] px-1.5 py-0.5 text-[9px] font-semibold text-[#e74c3c] hover:bg-[#fadbd8]"
                  title="Quitar imagen"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-[#dcdfe2] bg-[#f4f6f7]">
          <Package className="h-6 w-6 text-[#bdc3c7]" />
        </div>
      )}
    </div>
  );
}
