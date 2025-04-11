import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPdyZXe7KV6rkXTHbBg7gp6jMNk6hbMVM",
  authDomain: "ingresos-trabajos.firebaseapp.com",
  projectId: "ingresos-trabajos",
  storageBucket: "ingresos-trabajos.firebasestorage.app",
  messagingSenderId: "179257732965",
  appId: "1:179257732965:web:f4e84f765e961949a07b8c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, app };
