import { negocioIdDesdeHost } from "@/lib/dominiosTienda";

/** Rutas accesibles sin login ni verificación de cuenta (catálogo para clientes). */
export function esConsultaStockPublico(pathname: string): boolean {
  return pathname.startsWith("/consulta-stock");
}

/** Inicio de tienda en dominio propio (ej. iphonetec.com.ar → redirige al catálogo). */
export function esInicioDominioTienda(pathname: string, host?: string | null): boolean {
  if (pathname !== "/" && pathname !== "") return false;
  const h =
    host ??
    (typeof window !== "undefined" ? window.location.host : null);
  return negocioIdDesdeHost(h) !== null;
}

const RUTAS_PUBLICAS_EXACTAS_O_PREFIJO = [
  "/login",
  "/registro",
  "/crear-cuenta",
  "/suscripciones",
  "/recuperar-password",
  "/terminos",
  "/privacidad",
  "/cliente",
] as const;

/** true = no pide sesión, no sidebar admin, no pantalla de cuenta vencida. */
export function esRutaPublica(pathname: string, host?: string | null): boolean {
  if (esConsultaStockPublico(pathname)) return true;
  if (esInicioDominioTienda(pathname, host)) return true;
  if (pathname === "/cliente" || pathname.startsWith("/cliente/")) return true;
  return RUTAS_PUBLICAS_EXACTAS_O_PREFIJO.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`)
  );
}

/** Rutas sin sidebar del panel (incluye consulta-stock). */
export function esRutaSinSidebar(pathname: string): boolean {
  if (esRutaPublica(pathname)) return true;
  return (
    pathname === "/register" ||
    pathname === "/recuperar" ||
    RUTAS_PUBLICAS_EXACTAS_O_PREFIJO.includes(pathname as (typeof RUTAS_PUBLICAS_EXACTAS_O_PREFIJO)[number])
  );
}
