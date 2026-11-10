import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPdyZXe7KV6rkXTHbBg7gp6jMNk6hbMVM",
  authDomain: "ingresos-trabajos.firebaseapp.com",
  projectId: "ingresos-trabajos",
  storageBucket: "ingresos-trabajos.appspot.com",
  messagingSenderId: "179257732965",
  appId: "1:179257732965:web:f4e84f765e961949a07b8c",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app, "gs://ingresos-trabajos.firebasestorage.app");

function esIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function crearAuth(firebaseApp: FirebaseApp): Auth {
  // Safari en iPhone/iPad borra IndexedDB al cerrar la página y la sesión se pierde.
  // localStorage queda guardado. En el resto se mantiene IndexedDB, que sincroniza pestañas.
  const persistence: Persistence[] = esIos()
    ? [browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence];
  try {
    return initializeAuth(firebaseApp, {
      persistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

const auth = crearAuth(app);

export { db, app, storage, auth };
