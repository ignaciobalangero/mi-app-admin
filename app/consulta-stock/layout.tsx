import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function ConsultaStockLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
      <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      {children}
    </>
  );
}
