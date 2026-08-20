"use client";

import { useRef, useState } from "react";
import { auth } from "@/lib/auth";
import { subirFotoTrabajo } from "@/lib/trabajosFotosCliente";
import type { FotoTrabajo, TipoFotoTrabajo } from "@/lib/trabajosFotos";

type Props = {
  negocioID: string;
  /** firebaseId del trabajo; si falta, solo permite files pendientes en memoria vía onChange local */
  trabajoId?: string;
  tipo: TipoFotoTrabajo;
  fotos: FotoTrabajo[];
  onChange: (fotos: FotoTrabajo[]) => void;
  /** Si true, sube al instante a Storage. Si false, solo acumula File preview (ingreso antes de guardar). */
  subirInmediato?: boolean;
  titulo?: string;
  maxFotos?: number;
};

export default function CampoFotosTrabajo({
  negocioID,
  trabajoId,
  tipo,
  fotos,
  onChange,
  subirInmediato = true,
  titulo,
  maxFotos = 8,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);

  const label =
    titulo ||
    (tipo === "ingreso" ? "Fotos de ingreso del equipo" : "Fotos del proceso / reparación");

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!archivos.length || !negocioID) return;
    if (fotos.length + archivos.length > maxFotos) {
      alert(`Máximo ${maxFotos} fotos.`);
      return;
    }

    if (!subirInmediato || !trabajoId) {
      // Preview local: convertimos a object URLs temporales marcados
      const nuevas: FotoTrabajo[] = [];
      for (const file of archivos) {
        const url = URL.createObjectURL(file);
        nuevas.push({
          url,
          tipo,
          creadoEn: new Date().toISOString(),
          usuario: `pending:${file.name}`,
        });
        // Guardamos el File en (window as any) map keyed by url — mejor pasar files aparte
        (window as unknown as { __fotosTrabajoPending?: Record<string, File> }).__fotosTrabajoPending =
          {
            ...((window as unknown as { __fotosTrabajoPending?: Record<string, File> })
              .__fotosTrabajoPending || {}),
            [url]: file,
          };
      }
      onChange([...fotos, ...nuevas]);
      return;
    }

    setSubiendo(true);
    try {
      const usuario = auth.currentUser?.email || auth.currentUser?.uid || "";
      const subidas: FotoTrabajo[] = [];
      for (const file of archivos) {
        subidas.push(
          await subirFotoTrabajo({
            negocioID,
            trabajoId,
            tipo,
            file,
            usuario,
          })
        );
      }
      onChange([...fotos, ...subidas]);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = (idx: number) => {
    const copia = [...fotos];
    const [quitada] = copia.splice(idx, 1);
    if (quitada?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(quitada.url);
      const pending = (window as unknown as { __fotosTrabajoPending?: Record<string, File> })
        .__fotosTrabajoPending;
      if (pending) delete pending[quitada.url];
    }
    onChange(copia);
  };

  return (
    <div className="space-y-2 rounded-xl border border-[#dfe6e9] bg-[#f8f9fa] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#2c3e50]">{label}</p>
        <button
          type="button"
          disabled={subiendo || fotos.length >= maxFotos}
          onClick={() => inputRef.current?.click()}
          className="text-xs font-bold bg-[#3498db] text-white px-3 py-1.5 rounded-lg disabled:bg-[#bdc3c7]"
        >
          {subiendo ? "Subiendo…" : "+ Foto"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={handleFiles}
        />
      </div>
      {fotos.length === 0 ? (
        <p className="text-xs text-[#7f8c8d]">Sin fotos. Podés sacar o elegir desde la galería.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {fotos.map((f, i) => (
            <div key={`${f.url}-${i}`} className="relative aspect-square rounded-lg overflow-hidden border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => quitar(i)}
                className="absolute top-1 right-1 bg-black/60 text-white text-xs w-6 h-6 rounded-full"
                title="Quitar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Recupera Files pendientes asociados a blob URLs (ingreso). */
export function filesPendientesDeFotos(fotos: FotoTrabajo[]): File[] {
  const map =
    (typeof window !== "undefined" &&
      (window as unknown as { __fotosTrabajoPending?: Record<string, File> }).__fotosTrabajoPending) ||
    {};
  return fotos.map((f) => map[f.url]).filter((f): f is File => !!f);
}
