"use client";
import { usePathname } from "next/navigation";
import { esRutaSinSidebar } from "@/lib/rutasPublicas";
import SidebarWrapper from "./SidebarWrapper";

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return esRutaSinSidebar(pathname) ? <>{children}</> : <SidebarWrapper>{children}</SidebarWrapper>;
}
