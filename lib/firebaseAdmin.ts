import { randomUUID } from "crypto";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth as adminGetAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function ensureAdminApp() {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin no configurado. Faltan FIREBASE_PROJECT_ID, GOOGLE_CLIENT_EMAIL o GOOGLE_PRIVATE_KEY."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || "ingresos-trabajos.appspot.com",
  });
}

export function getAdminAuth(): Auth {
  ensureAdminApp();
  return adminGetAuth();
}

export function getAdminDb(): Firestore {
  ensureAdminApp();
  return getFirestore();
}

/** Sube un PNG y devuelve URL de descarga Firebase Storage. */
export async function subirPngPublicoAdmin(params: {
  path: string;
  buffer: Buffer;
}): Promise<string> {
  ensureAdminApp();
  const bucket = getStorage().bucket();
  const file = bucket.file(params.path);
  const token = randomUUID();
  await file.save(params.buffer, {
    contentType: "image/png",
    metadata: {
      cacheControl: "public,max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });
  const encoded = encodeURIComponent(params.path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

/** Compat: no inicializa hasta el primer uso (evita fallos en `next build` sin env). */
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const a = getAdminAuth() as unknown as Record<string | symbol, unknown>;
    const value = a[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(getAdminAuth()) : value;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const d = getAdminDb() as unknown as Record<string | symbol, unknown>;
    const value = d[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(getAdminDb()) : value;
  },
});
