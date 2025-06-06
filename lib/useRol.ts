// lib/useRol.ts
import { useEffect, useState } from "react";
import { auth } from "./auth";
import { db } from "./firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

interface RolInfo {
  tipo: string;
  negocioID: string;
}

interface SuscripcionInfo {
  diasRestantes: number | null;
  planActual: string | null;
  suscripcionActiva: boolean;
  fechaVencimiento: string | null;
}

export function useRol() {
  const [user, loading] = useAuthState(auth);
  const [rol, setRol] = useState<RolInfo | null>(null);
  const [suscripcion, setSuscripcion] = useState<SuscripcionInfo>({
    diasRestantes: null,
    planActual: null,
    suscripcionActiva: false,
    fechaVencimiento: null
  });

  useEffect(() => {
    const obtenerRolYSuscripcion = async () => {
      if (loading || !user) return;
      console.log("🔍 Buscando usuario con UID:", user.uid);

      try {
        // ✅ Leer primero desde la colección global "usuarios" para obtener el negocioID
        const globalRef = doc(db, `usuarios/${user.uid}`);
        const globalSnap = await getDoc(globalRef);

        if (!globalSnap.exists()) {
          console.warn("⛔ No se encontró el usuario en /usuarios/");
          return;
        }

        const { negocioID } = globalSnap.data();

        if (!negocioID) {
          console.warn("⛔ El documento global no tiene negocioID");
          return;
        }

        // ✅ Luego buscamos el documento dentro del negocio para saber el rol
        const negocioRef = doc(db, `negocios/${negocioID}/usuarios/${user.uid}`);
        const snap = await getDoc(negocioRef);

        if (!snap.exists()) {
          console.warn("⛔ No se encontró el usuario dentro del negocio");
          return;
        }

        const data = snap.data();
        const tipoRol = data.rol || "sin rol";

        setRol({
          tipo: tipoRol,
          negocioID,
        });

        console.log("✅ Rol obtenido:", tipoRol, "| Negocio:", negocioID);

        // 🆕 NUEVO: Calcular suscripción según rol
        if (tipoRol === "admin") {
          await calcularSuscripcion(user.uid);
        } else {
          // Si es empleado, buscar admin del negocio y usar su suscripción
          await buscarSuscripcionDelAdmin(negocioID);
        }

      } catch (error) {
        console.error("❌ Error al obtener rol:", error);
      }
    };

    const calcularSuscripcion = async (userId: string) => {
      try {
        console.log("🔍 Buscando suscripción para usuario:", userId);
        
        // 🔧 CORREGIDO: Leer del documento principal del usuario
        const userRef = doc(db, `usuarios/${userId}`);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          console.warn("⛔ No se encontró usuario");
          setSuscripcion({
            diasRestantes: null,
            planActual: "gratuito",
            suscripcionActiva: false,
            fechaVencimiento: null
          });
          return;
        }

        const userData = userSnap.data();
        
        // 🔧 CORREGIDO: Leer campos del documento principal
        const planActivo = userData.planActivo;
        const fechaVencimiento = userData.fechaVencimiento?.toDate();
        const estado = userData.estado;
        
        if (!planActivo || estado !== "activo") {
          console.warn("⛔ No hay plan activo o estado no es activo");
          setSuscripcion({
            diasRestantes: null,
            planActual: "gratuito",
            suscripcionActiva: false,
            fechaVencimiento: null
          });
          return;
        }
        
        // Calcular días restantes
        const ahora = new Date();
        const diasRestantes = fechaVencimiento 
          ? Math.ceil((fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const suscripcionActiva = diasRestantes ? diasRestantes > 0 : false;

        setSuscripcion({
          diasRestantes,
          planActual: planActivo,
          suscripcionActiva,
          fechaVencimiento: fechaVencimiento?.toLocaleDateString() || null
        });

        console.log("✅ Suscripción encontrada:", {
          activa: suscripcionActiva,
          días: diasRestantes,
          plan: planActivo,
          vencimiento: fechaVencimiento?.toLocaleDateString()
        });

      } catch (error) {
        console.error("❌ Error al calcular suscripción:", error);
        // En caso de error, usar datos por defecto
        setSuscripcion({
          diasRestantes: null,
          planActual: "gratuito",
          suscripcionActiva: false,
          fechaVencimiento: null
        });
      }
    };

    const buscarSuscripcionDelAdmin = async (negocioID: string) => {
      try {
        console.log("🔍 Buscando admin del negocio:", negocioID);
        
        // Buscar admin del negocio
        const usuariosQuery = query(
          collection(db, "usuarios"),
          where("negocioID", "==", negocioID)
        );

        const usuariosSnap = await getDocs(usuariosQuery);
        
        if (usuariosSnap.empty) {
          console.warn("⛔ No se encontraron usuarios del negocio");
          return;
        }

        // Buscar el admin entre los usuarios
        let adminUID = null;
        for (const userDoc of usuariosSnap.docs) {
          const userData = userDoc.data();
          if (userData.rol === "admin") {
            adminUID = userDoc.id;
            console.log("👑 Admin encontrado:", userData.email);
            break;
          }
        }

        if (!adminUID) {
          console.warn("⛔ No se encontró admin del negocio");
          return;
        }
        
        // Obtener suscripción del admin
        await calcularSuscripcion(adminUID);

      } catch (error) {
        console.error("❌ Error al buscar suscripción del admin:", error);
        setSuscripcion({
          diasRestantes: null,
          planActual: "gratuito",
          suscripcionActiva: false,
          fechaVencimiento: null
        });
      }
    };

    obtenerRolYSuscripcion();
  }, [user, loading]);

  return { 
    rol, 
    suscripcion,
    loading: loading || rol === null 
  };
}