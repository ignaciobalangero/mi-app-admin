import { NextResponse } from "next/server";
import "@/lib/firebaseAdmin";
import { auth as adminAuth, db } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/**
 * Crea usuario en Auth + Firestore sin cambiar la sesión del navegador del admin.
 * (createUserWithEmailAndPassword en cliente iniciaba sesión como el usuario nuevo.)
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    let decoded: { uid: string; email?: string };
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Token inválido o vencido" }, { status: 401 });
    }

    const callerSnap = await db.doc(`usuarios/${decoded.uid}`).get();
    if (!callerSnap.exists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 403 });
    }

    const caller = callerSnap.data()!;
    const callerRol = String(caller.rol || "");
    const callerNegocio = String(caller.negocioID || "").trim();
    if (callerRol !== "admin" && callerRol !== "empleado") {
      return NextResponse.json({ error: "Solo administradores o empleados pueden crear usuarios" }, { status: 403 });
    }
    if (!callerNegocio) {
      return NextResponse.json({ error: "Tu cuenta no tiene negocio asignado" }, { status: 403 });
    }

    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rol =
      body.rol === "cliente" ? "cliente" : body.rol === "empleado" ? "empleado" : "";
    const nombreRaw = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const negocioID = typeof body.negocioID === "string" ? body.negocioID.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ingresá un email válido" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    if (!rol) {
      return NextResponse.json({ error: "Rol inválido (empleado o cliente)" }, { status: 400 });
    }
    if (!nombreRaw) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }
    if (!negocioID || negocioID !== callerNegocio) {
      return NextResponse.json({ error: "No podés crear usuarios para otro negocio" }, { status: 403 });
    }

    const nombreGuardado = rol === "cliente" ? nombreRaw : nombreRaw.toLowerCase();

    if (rol === "cliente") {
      const clientesSnap = await db
        .collection(`negocios/${negocioID}/clientes`)
        .where("nombre", "==", nombreGuardado)
        .limit(1)
        .get();
      if (clientesSnap.empty) {
        return NextResponse.json(
          {
            error:
              "Ese nombre de cliente no existe en el negocio. Creá la ficha del cliente o elegilo exactamente de la lista.",
          },
          { status: 400 }
        );
      }
    }

    try {
      await adminAuth.getUserByEmail(email);
      return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code !== "auth/user-not-found") {
        throw e;
      }
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      emailVerified: false,
    });
    const nuevoUID = userRecord.uid;

    const datosUsuario = {
      email,
      negocioID,
      rol,
      nombre: nombreGuardado,
    };

    const creadoPor = decoded.email || String(caller.email || "").trim() || "admin";

    await db.doc(`usuarios/${nuevoUID}`).set(datosUsuario);
    await db.doc(`negocios/${negocioID}/usuarios/${nuevoUID}`).set({
      ...datosUsuario,
      fechaCreacion: new Date().toISOString(),
      creadoPor,
    });

    const configRef = db.doc(`configuracion/${negocioID}`);
    const configSnap = await configRef.get();
    if (!configSnap.exists) {
      await configRef.set({
        logoUrl: "",
        creado: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Usuario creado con éxito",
      uid: nuevoUID,
      email,
      rol,
      nombre: nombreGuardado,
    });
  } catch (e: unknown) {
    console.error("crear-usuario-negocio:", e);
    const msg = e instanceof Error ? e.message : "Error al crear usuario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
