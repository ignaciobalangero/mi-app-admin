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
  themeColor: "#f5f5f5",
  colorScheme: "light",
};

export default function ConsultaStockLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-tienda-publica
      className="min-h-screen bg-neutral-100 text-neutral-900 antialiased [color-scheme:light]"
    >
      <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
      <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
      {children}
    </div>
  );
}
