// components/AppWrapper.tsx
"use client";
import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useVerificarEstadoCuenta } from "@/lib/verificarEstadoCuenta";
import { esConsultaStockPublico, esInicioDominioTienda, esRutaPublica } from "@/lib/rutasPublicas";
import CuentaVencida from "@/app/components/CuentaVencida";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const [user, userLoading] = useAuthState(auth);
  const { estadoCuenta, loading } = useVerificarEstadoCuenta();
  const router = useRouter();
  const pathname = usePathname() ?? "";

  const host =
    typeof window !== "undefined" ? window.location.host : null;
  const esPublica = esRutaPublica(pathname, host);
  const esTiendaStock =
    esConsultaStockPublico(pathname) || esInicioDominioTienda(pathname, host);

  useEffect(() => {
    if (esPublica) return;
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [user, userLoading, esPublica, router]);

  // Tienda /consulta-stock/[negocioID]: acceso libre, sin login ni bloqueo de cuenta
  if (esTiendaStock || esPublica) {
    return <>{children}</>;
  }

  if (userLoading || loading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (estadoCuenta && !estadoCuenta.activa) {
    return (
      <CuentaVencida
        estadoCuenta={estadoCuenta}
        onPagarAhora={() => router.push("/suscripciones")}
      />
    );
  }

  return <>{children}</>;
}
