import { getDoc, getDocs, collection, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function verificarEstructuraFirestore(negocioID: string) {
  console.log("\u{1F50D} Verificando estructura para negocio:", negocioID);

  const rutas = [
    `negocios/${negocioID}/trabajos`,
    `negocios/${negocioID}/pagos`,
    `negocios/${negocioID}/clientes`,
  ];

  for (const ruta of rutas) {
    try {
      const snap = await getDocs(collection(db, ruta));
      console.log(
        `\u2705 Colección "${ruta}" tiene ${snap.size} documento${snap.size !== 1 ? "s" : ""}.`
      );
    } catch (err) {
      console.error(`\u274C Error al acceder a la colección "${ruta}":`, err);
    }
  }

  // Verificar configuración
  try {
    const configRef = doc(db, "configuracion", negocioID);
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) {
      console.warn("⚠️ No se encontró la configuración de este negocio.");
    } else {
      const data = configSnap.data();
      console.log("\u2705 Configuración encontrada:", data);

      const clavesEsperadas = ["imprimirTicket", "imprimirEtiqueta", "logoUrl", "textoGarantia"];
      clavesEsperadas.forEach((clave) => {
        if (!(clave in data)) {
          console.warn(`⚠️ Falta la clave '${clave}' en configuración`);
        }
      });
    }
  } catch (err) {
    console.error("\u274C Error al verificar configuración:", err);
  }
}
