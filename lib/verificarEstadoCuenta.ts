// lib/verificarEstadoCuenta.ts
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect, useState } from 'react';
import { cuentaAccesoSuspendido } from '@/lib/pagosSuscripcionAdmin';

// ✅ USUARIOS SUPER ADMIN (siempre exentos)
const SUPER_ADMINS = [
  'ignaciobalangero@gmail.com',  // ✅ Tu usuario principal
];

export interface EstadoCuenta {
  activa: boolean;
  diasRestantes: number;
  fechaVencimiento: Date | null;
  planActivo: string;
  razonBloqueo: 'trial_vencido' | 'pago_pendiente' | 'cuenta_suspendida' | 'negocio_vencido' | null;
  esUsuarioExento?: boolean;
  esSuperAdmin?: boolean;
  dependeDeNegocio?: boolean;
  adminDelNegocio?: string;
}

export const useVerificarEstadoCuenta = () => {
  const [user] = useAuthState(auth);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuenta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarCuenta = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Verificando estado de cuenta para:', user.email);

        // ✅ VERIFICAR SI ES SUPER ADMIN
        if (user.email && SUPER_ADMINS.includes(user.email)) {
          console.log('👑 Super Admin detectado:', user.email);
          setEstadoCuenta({
            activa: true,
            diasRestantes: 999,
            fechaVencimiento: null,
            planActivo: 'super_admin',
            razonBloqueo: null,
            esSuperAdmin: true,
            esUsuarioExento: true
          });
          setLoading(false);
          return;
        }

        // Obtener datos del usuario
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        
        if (!userDoc.exists()) {
          console.log('❌ Usuario no encontrado en la base de datos');
          setEstadoCuenta({
            activa: false,
            diasRestantes: 0,
            fechaVencimiento: null,
            planActivo: 'ninguno',
            razonBloqueo: 'cuenta_suspendida'
          });
          setLoading(false);
          return;
        }

        const userData = userDoc.data();
        console.log('📋 Datos de usuario:', userData);

        // ✅ VERIFICAR SI ES USUARIO EXENTO (campo en Firebase)
        if (userData.esExento === true) {
          console.log('✅ Usuario exento detectado:', user.email);
          setEstadoCuenta({
            activa: true,
            diasRestantes: 999,
            fechaVencimiento: null,
            planActivo: userData.planActivo || 'exento',
            razonBloqueo: null,
            esUsuarioExento: true
          });
          setLoading(false);
          return;
        }

        // 🏢 VERIFICACIÓN POR TIPO DE USUARIO Y NEGOCIO
        const rol = userData.rol;
        const negocioID = userData.negocioID;

        console.log(`👤 Rol: ${rol}, NegocioID: ${negocioID}`);

        // ✅ SI ES ADMIN (quien paga la suscripción)
        if (rol === 'admin') {
          console.log('👨‍💼 Usuario ADMIN - verificando su propia suscripción');
          const resultado = await verificarSuscripcionPropia(userData);
          setEstadoCuenta(resultado);
          setLoading(false);
          return;
        }

        // ✅ SI ES EMPLEADO O CLIENTE (depende del admin del negocio)
        if ((rol === 'empleado' || rol === 'cliente') && negocioID) {
          console.log(`👷 Usuario ${rol.toUpperCase()} - verificando suscripción del negocio: ${negocioID}`);
          const resultado = await verificarSuscripcionPorNegocio(negocioID, userData);
          setEstadoCuenta(resultado);
          setLoading(false);
          return;
        }

        // ✅ USUARIO INDEPENDIENTE (sin negocioID o sin rol definido)
        console.log('🔍 Usuario independiente - verificando suscripción individual');
        const resultado = await verificarSuscripcionPropia(userData);
        setEstadoCuenta(resultado);

      } catch (error) {
        console.error('❌ Error verificando estado de cuenta:', error);
        setEstadoCuenta({
          activa: false,
          diasRestantes: 0,
          fechaVencimiento: null,
          planActivo: 'error',
          razonBloqueo: 'cuenta_suspendida'
        });
      } finally {
        setLoading(false);
      }
    };

    verificarCuenta();
  }, [user]);

  return { estadoCuenta, loading };
};

function fechaUsuarioADate(valor: unknown): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (
    typeof valor === "object" &&
    valor !== null &&
    "toDate" in valor &&
    typeof (valor as { toDate: () => Date }).toDate === "function"
  ) {
    return (valor as { toDate: () => Date }).toDate();
  }
  return null;
}

// 🔧 FUNCIÓN: Verificar suscripción propia (para admins y usuarios independientes)
const verificarSuscripcionPropia = async (userData: any): Promise<EstadoCuenta> => {
  const fechaVencimiento = fechaUsuarioADate(userData.fechaVencimiento);
  const planActivo = userData.planActivo;
  const ahora = new Date();
  const diasRestantes = fechaVencimiento
    ? Math.ceil((fechaVencimiento.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (cuentaAccesoSuspendido(userData)) {
    return {
      activa: false,
      diasRestantes: Math.max(0, diasRestantes),
      fechaVencimiento,
      planActivo: planActivo || "ninguno",
      razonBloqueo: "cuenta_suspendida",
    };
  }

  let activa = true;
  let razonBloqueo: EstadoCuenta["razonBloqueo"] = null;

  if (planActivo === "trial" && diasRestantes <= 0) {
    activa = false;
    razonBloqueo = "trial_vencido";
  } else if (planActivo !== "trial" && diasRestantes <= 0) {
    activa = false;
    razonBloqueo = "pago_pendiente";
  }

  console.log(
    `📊 Suscripción propia: activa=${activa}, días=${diasRestantes}, plan=${planActivo}`
  );

  return {
    activa,
    diasRestantes: Math.max(0, diasRestantes),
    fechaVencimiento,
    planActivo: planActivo || "ninguno",
    razonBloqueo,
  };
};

// 🏢 FUNCIÓN: Verificar suscripción por negocio (CORREGIDA - verifica exento Y suscripción)
const verificarSuscripcionPorNegocio = async (negocioID: string, userData: any): Promise<EstadoCuenta> => {
  try {
    console.log(`🔍 Buscando admin del negocio: ${negocioID}`);

    // Buscar el admin del negocio
    const q = query(
      collection(db, 'usuarios'),
      where('negocioID', '==', negocioID),
      where('rol', '==', 'admin')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No se encontró admin para este negocio');
      return {
        activa: false,
        diasRestantes: 0,
        fechaVencimiento: null,
        planActivo: 'sin_admin',
        razonBloqueo: 'cuenta_suspendida',
        dependeDeNegocio: true
      };
    }

    // Obtener datos del admin (debería ser único)
    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();
    
    console.log(`👨‍💼 Admin encontrado: ${adminData.email || adminDoc.id}`);
    console.log(`📋 Datos del admin:`, {
      esExento: adminData.esExento,
      planActivo: adminData.planActivo,
      fechaVencimiento: adminData.fechaVencimiento
    });

    // ✅ PRIMERO: Verificar si el admin es exento
    if (adminData.esExento === true) {
      console.log('🎉 ADMIN ES EXENTO - Empleado hereda acceso total');
      return {
        activa: true,
        diasRestantes: 999,
        fechaVencimiento: null,
        planActivo: 'exento_admin',
        razonBloqueo: null,
        dependeDeNegocio: true,
        adminDelNegocio: adminData.email || adminDoc.id
      };
    }

    // ✅ SEGUNDO: Si no es exento, verificar su suscripción normal
    console.log('🔍 Admin no es exento, verificando su suscripción...');
    const estadoAdmin = await verificarSuscripcionPropia(adminData);

    // El empleado/cliente hereda el estado del admin
    const resultado: EstadoCuenta = {
      ...estadoAdmin,
      dependeDeNegocio: true,
      adminDelNegocio: adminData.email || adminDoc.id
    };

    if (!estadoAdmin.activa) {
      resultado.razonBloqueo = "negocio_vencido";
    }

    console.log(
      `🏢 Estado del negocio aplicado: activa=${resultado.activa}, razón=${resultado.razonBloqueo}`
    );

    return resultado;

  } catch (error) {
    console.error('❌ Error verificando negocio:', error);
    return {
      activa: false,
      diasRestantes: 0,
      fechaVencimiento: null,
      planActivo: 'error',
      razonBloqueo: 'cuenta_suspendida',
      dependeDeNegocio: true
    };
  }
};

// Hook para verificar si puede acceder a una funcionalidad
export const usePuedeAcceder = (funcionalidad?: string) => {
  const { estadoCuenta } = useVerificarEstadoCuenta();
  
  if (!estadoCuenta) return false;
  
  // Super admin y usuarios exentos pueden acceder a todo
  if (estadoCuenta.esSuperAdmin || estadoCuenta.esUsuarioExento) return true;
  
  // Si la cuenta está activa, puede acceder a todo
  if (estadoCuenta.activa) return true;
  
  // Si está vencida, solo puede acceder a ver datos (solo lectura)
  const funcionesPermitidas = ['ver', 'dashboard', 'configuraciones', 'perfil'];
  
  return funcionalidad ? funcionesPermitidas.includes(funcionalidad) : false;
};

// ✅ FUNCIÓN PARA VERIFICAR SI ES SUPER ADMIN (para usar en componentes)
export const esSuperAdmin = (email: string | null): boolean => {
  if (!email) return false;
  return SUPER_ADMINS.includes(email);
};