import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { storageFotoPath } from "./paths";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Comprime a JPEG max 1800px lado largo, quality 0.85 */
export async function compressImage(
  file: File,
  maxSide = 1800,
  quality = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Error al comprimir imagen"));
        else resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

export async function uploadFotoTrabajo(
  uid: string,
  trabajoId: string,
  file: File
): Promise<{ url: string; storagePath: string }> {
  const blob = await compressImage(file);
  const id = uuid();
  const storagePath = storageFotoPath(uid, trabajoId, id);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  return { url, storagePath };
}

export async function borrarFotoStorage(storagePath: string): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    // si ya no existe en Storage, seguimos borrando el doc
  }
}
