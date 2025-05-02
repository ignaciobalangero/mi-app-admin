import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import VerificaNegocioID from "@/lib/VerificarNegocioID";
import SidebarWrapper from "./components/SidebarWrapper";
import { LogoProvider } from "./components/LogoProvider"; // ✅ Importamos el LogoProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Gestión",
  description: "Panel de administración y ventas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Script de QZ Tray */}
        <script src="https://cdn.jsdelivr.net/npm/qz-tray@2.1.0/qz-tray.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ✅ Envolvemos todo con el proveedor del logo */}
        <LogoProvider>
          <SidebarWrapper>
            {children}
          </SidebarWrapper>
        </LogoProvider>
      </body>
    </html>
  );
}
