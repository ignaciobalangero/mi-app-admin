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
        // ✅ CORREGIDO: Leer desde la colección plana "usuarios"
        const userRef = doc(db, `usuarios/${user.uid}`);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.warn("⛔ No se encontró el usuario en /usuarios/");
          return;
        }

        const userData = userSnap.data();
        const { negocioID, rol: tipoRol } = userData;

        if (!negocioID) {
          console.warn("⛔ El usuario no tiene negocioID");
          return;
        }

        if (!tipoRol) {
          console.warn("⛔ El usuario no tiene rol definido");
          return;
        }

        setRol({
          tipo: tipoRol,
          negocioID,
        });

        console.log("✅ Rol obtenido:", tipoRol, "| Negocio:", negocioID);

        // 🆕 CORREGIDO: Calcular suscripción según rol usando misma lógica que verificarEstadoCuenta
        if (tipoRol === "admin") {
          await calcularSuscripcionPropia(userData);
        } else {
          // Si es empleado, buscar admin del negocio y usar su suscripción
          await buscarSuscripcionDelAdmin(negocioID);
        }

      } catch (error) {
        console.error("❌ Error al obtener rol:", error);
      }
    };

    const calcularSuscripcionPropia = async (userData: any) => {
      try {
        console.log("🔍 Calculando suscripción propia para:", userData.email);
        
        // ✅ VERIFICAR SI ES EXENTO
        if (userData.esExento === true) {
          console.log("✅ Usuario exento - acceso total");
          setSuscripcion({
            diasRestantes: 999,
            planActual: "exento",
            suscripcionActiva: true,
            fechaVencimiento: "Sin vencimiento"
          });
          return;
        }
        
        const planActivo = userData.planActivo;
        const fechaVencimiento = userData.fechaVencimiento?.toDate();
        const estado = userData.estado;
        
        if (!planActivo || estado === "suspendida") {
          console.warn("⛔ No hay plan activo o cuenta suspendida");
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

        console.log("✅ Suscripción propia:", {
          activa: suscripcionActiva,
          días: diasRestantes,
          plan: planActivo
        });

      } catch (error) {
        console.error("❌ Error al calcular suscripción propia:", error);
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
        
        // ✅ CORREGIDO: Buscar admin usando misma query que verificarEstadoCuenta
        const adminQuery = query(
          collection(db, "usuarios"),
          where("negocioID", "==", negocioID),
          where("rol", "==", "admin")
        );

        const adminSnap = await getDocs(adminQuery);
        
        if (adminSnap.empty) {
          console.warn("⛔ No se encontró admin del negocio");
          setSuscripcion({
            diasRestantes: null,
            planActual: "sin_admin",
            suscripcionActiva: false,
            fechaVencimiento: null
          });
          return;
        }

        const adminDoc = adminSnap.docs[0];
        const adminData = adminDoc.data();
        
        console.log("👑 Admin encontrado:", adminData.email);

        // ✅ VERIFICAR SI EL ADMIN ES EXENTO
        if (adminData.esExento === true) {
          console.log("🎉 Admin es exento - empleado hereda acceso");
          setSuscripcion({
            diasRestantes: 999,
            planActual: "exento_admin",
            suscripcionActiva: true,
            fechaVencimiento: "Sin vencimiento (hereda de admin)"
          });
          return;
        }
        
        // Si admin no es exento, usar su suscripción
        await calcularSuscripcionPropia(adminData);

      } catch (error) {
        console.error("❌ Error al buscar suscripción del admin:", error);
        setSuscripcion({
          diasRestantes: null,
          planActual: "error",
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