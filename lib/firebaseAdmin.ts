// lib/firebaseAdmin.ts - REEMPLAZA tu contenido con esto:

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth as adminGetAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore"; // ✅ AGREGAR ESTA LÍNEA

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const auth = adminGetAuth(); // ✅ CAMBIAR NOMBRE
export const db = getFirestore();   // ✅ AGREGAR ESTA LÍNEA