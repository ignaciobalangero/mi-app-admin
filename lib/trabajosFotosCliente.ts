"use client";

import { ref as refStorage, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { comprimirImagenParaCatalogo } from "@/lib/comprimirImagenCliente";
import type { FotoTrabajo, TipoFotoTrabajo } from "@/lib/trabajosFotos";

const EXT_VALIDAS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"];

export async function subirFotoTrabajo(params: {
  negocioID: string;
  trabajoId: string;
  tipo: TipoFotoTrabajo;
  file: File;
  usuario?: string;
}): Promise<FotoTrabajo> {
  const { negocioID, trabajoId, tipo, file, usuario } = params;
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!EXT_VALIDAS.includes(ext)) {
    throw new Error("Usá JPG, PNG, WEBP, GIF o HEIC.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("La imagen supera 15 MB.");
  }

  const optimizada = await comprimirImagenParaCatalogo(file, {
    maxLado: 1600,
    maxBytes: 500 * 1024,
  });

  const path = `negocios/${negocioID}/trabajos/${trabajoId}/${tipo}/${Date.now()}.${optimizada.extension}`;
  const r = refStorage(storage, path);
  await uploadBytes(r, optimizada.blob, { contentType: optimizada.mimeType });
  const url = await getDownloadURL(r);

  return {
    url,
    tipo,
    creadoEn: new Date().toISOString(),
    usuario: usuario || undefined,
  };
}

/** Sube varias fotos a una carpeta temporal (antes de tener firebaseId). */
export async function subirFotosTrabajoTemp(params: {
  negocioID: string;
  tipo: TipoFotoTrabajo;
  files: File[];
  usuario?: string;
}): Promise<FotoTrabajo[]> {
  const tempId = `temp-${Date.now()}`;
  const out: FotoTrabajo[] = [];
  for (const file of params.files) {
    out.push(
      await subirFotoTrabajo({
        negocioID: params.negocioID,
        trabajoId: tempId,
        tipo: params.tipo,
        file,
        usuario: params.usuario,
      })
    );
  }
  return out;
}
