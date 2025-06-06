import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LogoProvider } from "./components/LogoProvider";
import AppLayoutWrapper from "./components/AppLayoutWrapper";
import AppWrapper from "./components/AppWrapper"; // ✅ AGREGAR ESTA LÍNEA

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
        <script src="https://cdn.jsdelivr.net/npm/qz-tray@2.1.0/qz-tray.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LogoProvider>
          {/* ✅ ENVOLVER CON AppWrapper PARA VERIFICACIÓN DE CUENTA */}
          <AppWrapper>
            <AppLayoutWrapper>{children}</AppLayoutWrapper>
          </AppWrapper>
        </LogoProvider>
      </body>
    </html>
  );
}