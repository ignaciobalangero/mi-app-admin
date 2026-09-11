import type { Metadata, Viewport } from "next";
import { ZingueriaAuthProvider } from "@/lib/zingueria/auth";

export const metadata: Metadata = {
  title: "Zinguería",
  description: "Gestión de trabajos de zinguería",
  manifest: "/zingueria/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Zinguería",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/zingueria/icon.svg",
    apple: "/zingueria/icon.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
  viewportFit: "cover",
};

export default function ZingueriaRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-zingueria-root
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f1f5f9",
      }}
    >
      <ZingueriaAuthProvider>{children}</ZingueriaAuthProvider>
    </div>
  );
}
