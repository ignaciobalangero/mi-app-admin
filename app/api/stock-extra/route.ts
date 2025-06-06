// app/api/stock-extra/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase-admin/auth";
import "@/lib/firebaseAdmin";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { codigo, precioCosto, ganancia, proveedor, negocioID } = await req.json();

    if (!codigo || !negocioID) {
      return NextResponse.json({ error: "Faltan datos necesarios" }, { status: 400 });
    }

    const headersList = await headers();
    const authorization = headersList.get("authorization");

    if (!authorization) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    // Log para depurar
    console.log("✅ UID:", uid);
    console.log("✅ NegocioID recibido:", negocioID);
    console.log("✅ Guardando en ruta:", `negocios/${negocioID}/stockExtra/${codigo}`);

    // Guardar los datos en la colección del negocio
    await setDoc(doc(db, `negocios/${negocioID}/stockExtra/${codigo}`), {
        proveedor: proveedor ?? "",
        precioCosto: precioCosto ?? 0,
        ganancia: ganancia ?? 0,
        negocioID: String(negocioID || ""), // 👈 forzado como string
      });      

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ Error en stock-extra:", error);
    return NextResponse.json({ error: "Error al guardar datos extra" }, { status: 500 });
  }
}
