import type { Metadata, Viewport } from "next";

/** Catálogo público: sin login. El negocioID va en la URL. */
export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default" },
  robots: { index: false, follow: false },
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
