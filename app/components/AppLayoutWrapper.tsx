"use client";

import { usePathname } from "next/navigation";
import SidebarWrapper from "./SidebarWrapper";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const rutasSinSidebar = ["/login", "/register", "/recuperar"];
  const esRutaPublica = rutasSinSidebar.includes(pathname);

  return esRutaPublica ? <>{children}</> : <SidebarWrapper>{children}</SidebarWrapper>;
}
