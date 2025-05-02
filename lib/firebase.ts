import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; // ✅ Importar auth

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
const auth = getAuth(app); // ✅ Inicializar auth

export { db, app, storage, auth }; // ✅ Exportar auth también
