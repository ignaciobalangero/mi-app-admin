/** Compresión en el navegador antes de subir a Storage (solo client-side). */

export type ResultadoCompresionImagen = {
  blob: Blob;
  mimeType: string;
  extension: string;
  ancho: number;
  alto: number;
  bytesOriginales: number;
  bytesComprimidos: number;
};

type OpcionesCompresion = {
  /** Lado máximo en px (mantiene proporción). */
  maxLado?: number;
  /** Peso objetivo máximo en bytes. */
  maxBytes?: number;
  calidadInicial?: number;
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function cargarImagen(file: File): Promise<{
  source: CanvasImageSource;
  ancho: number;
  alto: number;
  liberar: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      ancho: bitmap.width,
      alto: bitmap.height,
      liberar: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen"));
      el.src = url;
    });
    return {
      source: img,
      ancho: img.naturalWidth,
      alto: img.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function tieneTransparencia(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
  const { data } = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4 + 3;
      if (data[i] < 250) return true;
    }
  }
  return false;
}

function escalaDimensiones(ancho: number, alto: number, maxLado: number) {
  const lado = Math.max(ancho, alto);
  if (lado <= maxLado) return { ancho, alto };
  const factor = maxLado / lado;
  return {
    ancho: Math.max(1, Math.round(ancho * factor)),
    alto: Math.max(1, Math.round(alto * factor)),
  };
}

function formatearKB(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} KB`;
}

/**
 * Redimensiona y comprime para catálogo web (~400 KB, max 1200px).
 * Si el archivo ya es liviano y chico, lo devuelve sin tocar.
 */
export async function comprimirImagenParaCatalogo(
  file: File,
  opts: OpcionesCompresion = {}
): Promise<ResultadoCompresionImagen> {
  const maxLado = opts.maxLado ?? 1200;
  const maxBytes = opts.maxBytes ?? 400 * 1024;
  const calidadInicial = opts.calidadInicial ?? 0.85;
  const bytesOriginales = file.size;

  if (!file.type.startsWith("image/") && !file.name.match(/\.(jpe?g|png|webp|gif|heic|heif)$/i)) {
    throw new Error("El archivo no es una imagen");
  }

  const { source, ancho: w0, alto: h0, liberar } = await cargarImagen(file);
  try {
    let { ancho, alto } = escalaDimensiones(w0, h0, maxLado);

    const dibujar = (w: number, h: number, fondoBlanco: boolean) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      if (fondoBlanco) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(source, 0, 0, w, h);
      return { canvas, ctx };
    };

    let { canvas, ctx } = dibujar(ancho, alto, false);
    const transparente = tieneTransparencia(ctx, ancho, alto);

    if (transparente) {
      ({ canvas, ctx } = dibujar(ancho, alto, false));
    } else {
      ({ canvas, ctx } = dibujar(ancho, alto, true));
    }

    const mimePreferido = "image/webp";
    let mimeType: "image/webp" | "image/jpeg" = mimePreferido;
    let extension: "webp" | "jpg" = "webp";
    let quality = calidadInicial;
    let blob = await canvasToBlob(canvas, mimeType, quality);

    if (!blob) {
      mimeType = "image/jpeg";
      extension = "jpg";
      ({ canvas, ctx } = dibujar(ancho, alto, true));
      blob = await canvasToBlob(canvas, mimeType, quality);
    }

    if (!blob) throw new Error("No se pudo comprimir la imagen");

    while (blob.size > maxBytes && quality > 0.45) {
      quality -= 0.07;
      blob = (await canvasToBlob(canvas, mimeType, quality)) ?? blob;
    }

    while (blob.size > maxBytes && Math.max(ancho, alto) > 640) {
      ancho = Math.max(1, Math.round(ancho * 0.85));
      alto = Math.max(1, Math.round(alto * 0.85));
      ({ canvas, ctx } = dibujar(ancho, alto, !transparente));
      quality = calidadInicial;
      blob = (await canvasToBlob(canvas, mimeType, quality)) ?? blob;
      while (blob.size > maxBytes && quality > 0.45) {
        quality -= 0.07;
        blob = (await canvasToBlob(canvas, mimeType, quality)) ?? blob;
      }
    }

    // Ya optimizada: evitar recomprimir innecesariamente
    if (
      bytesOriginales <= maxBytes &&
      w0 <= maxLado &&
      h0 <= maxLado &&
      blob.size >= bytesOriginales * 0.92
    ) {
      const extOrig = file.name.split(".").pop()?.toLowerCase() || "jpg";
      return {
        blob: file,
        mimeType: file.type || mimeType,
        extension: extOrig,
        ancho: w0,
        alto: h0,
        bytesOriginales,
        bytesComprimidos: bytesOriginales,
      };
    }

    return {
      blob,
      mimeType,
      extension,
      ancho,
      alto,
      bytesOriginales,
      bytesComprimidos: blob.size,
    };
  } finally {
    liberar();
  }
}

export { formatearKB as formatearPesoImagen };
