import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  negocioIdDesdeHost,
  rutaConsultaStock,
} from "@/lib/dominiosTienda";

const RUTAS_PERMITIDAS_TIENDA = [
  /^\/api\/stock-publico(?:\/|$)/,
  /^\/api\/tienda(?:\/|$)/,
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/consulta-stock\//,
];

function rutaPermitidaEnDominioTienda(pathname: string): boolean {
  return RUTAS_PERMITIDAS_TIENDA.some((re) => re.test(pathname));
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const negocioId = negocioIdDesdeHost(host);
  if (!negocioId) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const tiendaPath = rutaConsultaStock(negocioId);

  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL(tiendaPath, request.url));
  }

  if (rutaPermitidaEnDominioTienda(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(tiendaPath, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
