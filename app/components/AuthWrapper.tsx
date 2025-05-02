"use client";

import { useAuthState } from "react-firebase-hooks/auth";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { LogoProvider } from "./LogoProvider";
import SidebarWrapper from "./SidebarWrapper";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [user, loading] = useAuthState(getAuth(app));

  if (loading) return null;

  // ✅ Si hay usuario, mostrar app completa
  if (user) {
    return (
      <LogoProvider>
        <SidebarWrapper>{children}</SidebarWrapper>
      </LogoProvider>
    );
  }

  // ✅ Si NO hay usuario, mostrar contenido directamente (por ejemplo, Login)
  return <>{children}</>;
}
