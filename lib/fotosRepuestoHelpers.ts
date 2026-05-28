/** Normaliza fotos desde documento Firestore (array nuevo o fotoURL legacy). */
export function normalizarFotosURLs(doc: {
  fotoURL?: unknown;
  fotosURLs?: unknown;
}): string[] {
  if (Array.isArray(doc.fotosURLs)) {
    const urls = doc.fotosURLs
      .filter((u): u is string => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));
    if (urls.length > 0) return urls;
  }
  if (typeof doc.fotoURL === "string") {
    const t = doc.fotoURL.trim();
    if (t.startsWith("http://") || t.startsWith("https://")) return [t];
  }
  return [];
}

/** Primera foto = portada del catálogo; mantiene fotoURL legacy sincronizado. */
export function fotosParaFirestore(fotosURLs: string[]): {
  fotoURL: string;
  fotosURLs: string[];
} {
  const limpias = fotosURLs
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http://") || u.startsWith("https://"));
  return {
    fotoURL: limpias[0] ?? "",
    fotosURLs: limpias,
  };
}

export function esUrlFotoValida(url: string): boolean {
  const t = url.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}
