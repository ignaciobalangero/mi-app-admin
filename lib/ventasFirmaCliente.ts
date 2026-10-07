import { doc, updateDoc, getDocs, collection, query, where } from "firebase/firestore";
import { ref as refStorage, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

/** Sube firma del cliente (PNG data URL) a Storage para una venta. */
export async function subirFirmaClienteVenta(params: {
  negocioID: string;
  ventaId: string;
  dataUrl: string;
}): Promise<string> {
  const { negocioID, ventaId, dataUrl } = params;
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Firma inválida");
  }

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error("La firma es demasiado pesada");
  }

  const path = `negocios/${negocioID}/ventas/${ventaId}/firma/firma-cliente-${Date.now()}.png`;
  const r = refStorage(storage, path);
  await uploadBytes(r, blob, { contentType: "image/png" });
  return getDownloadURL(r);
}

/**
 * Guarda la firma en ventasGeneral y, si hay nroVenta, también en ventaTelefonos
 * del mismo número (para que el recibo la encuentre desde cualquier lado).
 */
export async function guardarFirmaReciboEnVenta(params: {
  negocioID: string;
  ventaId: string;
  nroVenta?: string;
  firmaClienteUrl: string;
}): Promise<void> {
  const { negocioID, ventaId, nroVenta, firmaClienteUrl } = params;
  if (!negocioID || !ventaId || !firmaClienteUrl) {
    throw new Error("Faltan datos para guardar la firma");
  }

  const patch = {
    firmaClienteUrl,
    firmaClienteEn: new Date().toISOString(),
    firmaClienteOrigen: "recibo-tablet",
  };

  await updateDoc(
    doc(db, `negocios/${negocioID}/ventasGeneral/${ventaId}`),
    patch
  ).catch(async () => {
    // Puede ser doc de ventaTelefonos como id principal
    await updateDoc(
      doc(db, `negocios/${negocioID}/ventaTelefonos/${ventaId}`),
      patch
    );
  });

  const nro = String(nroVenta || "").trim();
  if (!nro) return;

  try {
    const snap = await getDocs(
      query(
        collection(db, `negocios/${negocioID}/ventaTelefonos`),
        where("nroVenta", "==", nro)
      )
    );
    await Promise.all(
      snap.docs.map((d) =>
        updateDoc(d.ref, patch).catch((e) =>
          console.warn("No se pudo guardar firma en ventaTelefonos:", d.id, e)
        )
      )
    );
  } catch (e) {
    console.warn("No se pudo propagar firma a ventaTelefonos:", e);
  }

  // Si el id era de ventaTelefonos, asegurar ventasGeneral por nro
  try {
    const gSnap = await getDocs(
      query(
        collection(db, `negocios/${negocioID}/ventasGeneral`),
        where("nroVenta", "==", nro)
      )
    );
    await Promise.all(
      gSnap.docs
        .filter((d) => d.id !== ventaId)
        .map((d) =>
          updateDoc(d.ref, patch).catch((e) =>
            console.warn("No se pudo guardar firma en ventasGeneral:", d.id, e)
          )
        )
    );
  } catch (e) {
    console.warn("No se pudo propagar firma a ventasGeneral:", e);
  }
}
