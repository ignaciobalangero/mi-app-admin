// archivo: scripts/verificarEstructuraFirestore.ts

import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function verificarEstructuraFirestore(negocioID: string) {
  console.log("🔍 Verificando estructura de Firestore...");

  // 1. Trabajos
  const trabajosSnap = await getDocs(collection(db, `negocios/${negocioID}/trabajos`));
  let erroresTrabajos = 0;
  trabajosSnap.forEach((doc) => {
    const t = doc.data();
    if (!t.cliente || typeof t.precio === "undefined" || !t.estado) {
      console.warn("⚠️ Trabajo con datos incompletos:", doc.id);
      erroresTrabajos++;
    }
  });

  // 2. Pagos
  const pagosSnap = await getDocs(collection(db, `negocios/${negocioID}/pagos`));
  let erroresPagos = 0;
  pagosSnap.forEach((doc) => {
    const p = doc.data();
    if (!p.cliente || (!p.monto && !p.montoUSD)) {
      console.warn("⚠️ Pago con datos incompletos:", doc.id);
      erroresPagos++;
    }
  });

  // 3. Clientes
  const clientesSnap = await getDocs(collection(db, "clientes"));
  let erroresClientes = 0;
  clientesSnap.forEach((doc) => {
    const c = doc.data();
    if (typeof c.cuenta?.saldo === "undefined") {
      console.warn("⚠️ Cliente sin campo cuenta.saldo:", doc.id);
      erroresClientes++;
    }
  });

  console.log("✅ Verificación finalizada.");
  console.log(`Trabajos con errores: ${erroresTrabajos}`);
  console.log(`Pagos con errores: ${erroresPagos}`);
  console.log(`Clientes sin saldo: ${erroresClientes}`);
}
