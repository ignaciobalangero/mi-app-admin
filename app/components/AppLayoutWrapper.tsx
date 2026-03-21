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
    "/register", // Por si usas /register en algún lado
    "/registro",
    "/crear-cuenta",
    "/recuperar",
    "/recuperar-password",
    "/suscripciones",
    "/terminos",
    "/privacidad",
    "/cliente", // solo coincide exacto; /clientes/* NO va acá
  ];

  // Ojo: NO usar startsWith("/cliente") porque ocultaría el sidebar en /clientes/... (detalle admin).
  const esPortalClienteFinal =
    pathname === "/cliente" || pathname.startsWith("/cliente/");

  const esRutaPublica = esPortalClienteFinal || rutasSinSidebar.includes(pathname);

  return esRutaPublica ? <>{children}</> : <SidebarWrapper>{children}</SidebarWrapper>;
}