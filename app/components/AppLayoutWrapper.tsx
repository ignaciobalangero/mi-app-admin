"use client";
import { usePathname } from "next/navigation";
import SidebarWrapper from "./SidebarWrapper";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // ✅ AGREGAR TODAS LAS RUTAS SIN SIDEBAR (incluyendo /registro)
  const rutasSinSidebar = [
    "/login", 
    "/register",      // Por si usas /register en algún lado
    "/registro",      // ✅ AGREGAR ESTA LÍNEA
    "/crear-cuenta",  // ✅ Por si tienes esta ruta también
    "/recuperar",
    "/recuperar-password",
    "/suscripciones", // ✅ Agregar suscripciones también
    "/terminos",
    "/privacidad"
  ];
  
  const esRutaPublica = rutasSinSidebar.includes(pathname);

  return esRutaPublica ? <>{children}</> : <SidebarWrapper>{children}</SidebarWrapper>;
}