// app/api/stock-extra/route.ts

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "@/lib/firebaseAdmin"; // ✅ import correcto
import { headers } from "next/headers";

// ✅ Función auxiliar para obtener el negocioID desde Firestore
async function obtenerNegocioID(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? snap.data().negocioID : null;
}

export async function POST(req: Request) {
  try {
    const { codigo, precioCosto, ganancia, proveedor } = await req.json();

    if (!codigo) {
      return NextResponse.json({ error: "Falta el código" }, { status: 400 });
    }

    const headersList = await headers(); // ✅ corregido
    const authorization = headersList.get("authorization"); // ✅ funciona ahora


    if (!authorization) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authorization.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const negocioID = await obtenerNegocioID(uid);

    if (!negocioID) {
      return NextResponse.json({ error: "No se encontró negocioID" }, { status: 403 });
    }

    await setDoc(doc(db, `negocios/${negocioID}/stockExtra/${codigo}`), {
      proveedor,
      precioCosto,
      ganancia,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("❌ Error en stock-extra:", error);
    return NextResponse.json({ error: "Error al guardar datos extra" }, { status: 500 });
  }
}
