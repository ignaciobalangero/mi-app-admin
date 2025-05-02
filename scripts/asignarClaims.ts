import admin from "firebase-admin";
import fs from "fs";

// Leé tu clave de servicio
const serviceAccount = JSON.parse(fs.readFileSync("./clave-firebase.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 👇 Reemplazá este UID con el del usuario logueado
const uid = "RnUNCvn39hHTAqsBWdJLgAvVyf02";

admin.auth().setCustomUserClaims(uid, {
  admin: true,
  negocioID: "iphonetec",
  rol: "admin",          // ✅ este campo lo necesita useRol
  nombre: "Ignacio",     // ✅ opcional, útil si lo usás
})
.then(() => {
  console.log("✅ Claims asignados correctamente.");
  process.exit(0);
})
.catch((error) => {
  console.error("❌ Error al asignar claims:", error);
  process.exit(1);
});
