// archivo: app/api/registrar-pago/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    console.log("📥 POST recibido en /api/registrar-pago");

    const rawBody = await req.text();
    console.log("📦 RAW Body:", rawBody);

    const body = JSON.parse(rawBody);
    console.log("✅ JSON Parseado:", body);

    const { negocioID, clienteID, pago } = body;

    if (!negocioID || !clienteID || !pago) {
      console.error("❌ Faltan datos:", { negocioID, clienteID, pago });
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    console.log("🧾 Pago recibido:", pago);

    // Verificar si el cliente existe
    const clienteRef = doc(db, `negocios/${negocioID}/clientes/${clienteID}`);
    const clienteSnap = await getDoc(clienteRef);

    if (!clienteSnap.exists()) {
      console.error("❌ Cliente no encontrado:", clienteID);
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Registrar el pago
    await addDoc(collection(db, `negocios/${negocioID}/pagos`), pago);
    console.log("✅ Pago guardado correctamente");

    // Recalcular saldo
    let nuevoSaldo = 0;
    try {
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("❌ ERROR GENERAL EN /api/registrar-pago:", error);
      return NextResponse.json({ error: "Error interno al registrar pago" }, { status: 500 });
    }    

    return NextResponse.json({ ok: true, saldo: nuevoSaldo });

  } catch (error) {
    console.error("❌ ERROR GENERAL EN /api/registrar-pago:", error);
    return NextResponse.json({ error: "Error interno al registrar pago" }, { status: 500 });
  }
}

