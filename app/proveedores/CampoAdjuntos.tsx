"use client";

import { useEffect, useRef, useState } from "react";
import { getDownloadURL, ref as refStorage, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { comprimirImagenParaCatalogo } from "@/lib/comprimirImagenCliente";

export type AdjuntoProveedor = {
  url: string;
  nombre: string;
  tipo: "imagen" | "pdf";
};

const MAX_ARCHIVOS = 8;
const MAX_BYTES = 15 * 1024 * 1024;

function esPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function esImagen(file: File) {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

function archivosDesdePortapapeles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const crudos: File[] = [];
  for (const item of Array.from(data.items || [])) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) crudos.push(file);
    }
  }
  if (crudos.length === 0) crudos.push(...Array.from(data.files || []));
  return crudos.map((file, indice) => {
    const tipo = file.type || "image/png";
    const nombre =
      file.name && file.name !== "image.png" ? file.name : `captura-${Date.now()}-${indice}.png`;
    return new File([file], nombre, { type: tipo });
  });
}

export function normalizarAdjuntos(valor: unknown): AdjuntoProveedor[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const dato = item as { url?: unknown; nombre?: unknown; tipo?: unknown };
    const url = typeof dato.url === "string" ? dato.url : "";
    if (!url.startsWith("http")) return [];
    const tipo = dato.tipo === "pdf" || url.toLowerCase().includes(".pdf") ? "pdf" : "imagen";
    return [{ url, nombre: typeof dato.nombre === "string" && dato.nombre ? dato.nombre : "Archivo", tipo }];
  });
}

export function ListaAdjuntos({ adjuntos }: { adjuntos?: AdjuntoProveedor[] }) {
  const lista = adjuntos || [];
  if (lista.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {lista.map((adjunto) =>
        adjunto.tipo === "imagen" ? (
          <a key={adjunto.url} href={adjunto.url} target="_blank" rel="noreferrer" title={adjunto.nombre}>
            <img src={adjunto.url} alt={adjunto.nombre} className="h-16 w-16 rounded-lg border border-gray-300 object-cover" />
          </a>
        ) : (
          <a
            key={adjunto.url}
            href={adjunto.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-[180px] items-center rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800"
          >
            <span className="truncate">PDF · {adjunto.nombre}</span>
          </a>
        )
      )}
    </div>
  );
}

type Props = {
  negocioID: string;
  proveedorId: string;
  carpeta: "pedidos" | "pagos";
  adjuntos: AdjuntoProveedor[];
  onChange: (adjuntos: AdjuntoProveedor[]) => void;
  onSubiendo?: (subiendo: boolean) => void;
  titulo: string;
  ayuda: string;
};

export default function CampoAdjuntos({
  negocioID,
  proveedorId,
  carpeta,
  adjuntos,
  onChange,
  onSubiendo,
  titulo,
  ayuda,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zonaId = useRef(`adj-${Math.random().toString(36).slice(2)}`);
  const adjuntosRef = useRef(adjuntos);
  adjuntosRef.current = adjuntos;
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [sobre, setSobre] = useState(false);

  const marcarSubiendo = (valor: boolean) => {
    setSubiendo(valor);
    onSubiendo?.(valor);
  };

  const subir = async (file: File): Promise<AdjuntoProveedor | null> => {
    if (esPdf(file)) {
      if (file.size > MAX_BYTES) {
        throw new Error(`"${file.name}" supera los 15 MB.`);
      }
      const path = `negocios/${negocioID}/proveedores/${proveedorId}/${carpeta}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const destino = refStorage(storage, path);
      await uploadBytes(destino, file, { contentType: "application/pdf" });
      return { url: await getDownloadURL(destino), nombre: file.name, tipo: "pdf" };
    }
    if (!esImagen(file)) {
      throw new Error(`"${file.name}" tiene que ser una imagen o un PDF.`);
    }
    const optimizada = await comprimirImagenParaCatalogo(file);
    const path = `negocios/${negocioID}/proveedores/${proveedorId}/${carpeta}/${Date.now()}.${optimizada.extension}`;
    const destino = refStorage(storage, path);
    await uploadBytes(destino, optimizada.blob, { contentType: optimizada.mimeType });
    return { url: await getDownloadURL(destino), nombre: file.name, tipo: "imagen" };
  };

  const elegir = async (lista: FileList | File[] | null) => {
    const archivos = Array.from(lista || []);
    if (inputRef.current) inputRef.current.value = "";
    if (!archivos.length) return;
    if (!negocioID || !proveedorId) {
      setError("No se detectó el proveedor. Recargá la página.");
      return;
    }
    const lugar = MAX_ARCHIVOS - adjuntosRef.current.length;
    if (lugar <= 0) {
      setError(`Podés adjuntar hasta ${MAX_ARCHIVOS} archivos.`);
      return;
    }
    setError("");
    marcarSubiendo(true);
    const nuevos: AdjuntoProveedor[] = [];
    try {
      for (const file of archivos.slice(0, lugar)) {
        const adjunto = await subir(file);
        if (adjunto) nuevos.push(adjunto);
      }
      if (nuevos.length) onChange([...adjuntosRef.current, ...nuevos]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      marcarSubiendo(false);
    }
  };

  const elegirRef = useRef(elegir);
  elegirRef.current = elegir;

  useEffect(() => {
    const alPegar = (e: ClipboardEvent) => {
      const archivos = archivosDesdePortapapeles(e.clipboardData);
      if (!archivos.length) return;
      const zonas = document.querySelectorAll("[data-adjuntos-pegar]");
      const mia = document.querySelector(`[data-adjuntos-id="${zonaId.current}"]`);
      const enfocada = document.activeElement?.closest("[data-adjuntos-pegar]");
      if (!mia || (enfocada || zonas[zonas.length - 1]) !== mia) return;
      e.preventDefault();
      void elegirRef.current(archivos);
    };
    window.addEventListener("paste", alPegar);
    return () => window.removeEventListener("paste", alPegar);
  }, []);

  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-700">{titulo}</label>
      <p className="mb-2 text-xs text-gray-500">{ayuda}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => void elegir(e.target.files)}
      />
      <div
        data-adjuntos-pegar=""
        data-adjuntos-id={zonaId.current}
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          void elegir(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-3 py-3 outline-none focus:border-[#6c3483] ${
          sobre ? "border-[#6c3483] bg-[#f5eef8]" : "border-[#d2b4de] bg-[#fbf8fc]"
        }`}
      >
        <p className="text-sm font-semibold text-[#6c3483]">Pegá la captura acá</p>
        <p className="mt-1 text-xs text-gray-500">Ctrl+V o Cmd+V. También podés arrastrar la imagen o el PDF.</p>
        <button
          type="button"
          disabled={subiendo || adjuntos.length >= MAX_ARCHIVOS}
          onClick={() => inputRef.current?.click()}
          className="mt-2 rounded-lg border border-[#8e44ad] bg-white px-3 py-2 text-sm font-semibold text-[#6c3483] disabled:opacity-50"
        >
          {subiendo ? "Subiendo…" : "Elegir imagen o PDF"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-red-700">{error}</p> : null}
      {adjuntos.length > 0 ? (
        <div className="mt-3 space-y-2">
          <ListaAdjuntos adjuntos={adjuntos} />
          <div className="flex flex-wrap gap-2">
            {adjuntos.map((adjunto) => (
              <button
                key={adjunto.url}
                type="button"
                onClick={() => onChange(adjuntos.filter((item) => item.url !== adjunto.url))}
                className="text-xs font-semibold text-red-700"
              >
                Quitar {adjunto.nombre}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
