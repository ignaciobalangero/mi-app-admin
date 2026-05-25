/**
 * Rutas Firestore de la tienda web — colección raíz por negocio (ej. `iphonetec/`),
 * separada de `negocios/` que usa Gestione para el panel admin.
 *
 * Estructura:
 *   iphonetec/web                    → documento raíz (config tienda)
 *   iphonetec/web/clientes/{uid}     → clientes de la tienda
 *   iphonetec/web/pedidos/{id}       → pedidos web
 *
 * El stock y ventas del panel siguen en `negocios/{negocioGestioneId}/...`
 */
export function idColeccionTienda(negocioId: string): string {
  return negocioId.trim();
}

export function docRaizTienda(negocioId: string): string {
  return `${idColeccionTienda(negocioId)}/web`;
}

export function refClienteTienda(negocioId: string, uid: string): string {
  return `${docRaizTienda(negocioId)}/clientes/${uid}`;
}

export function colPedidosTienda(negocioId: string): string {
  return `${docRaizTienda(negocioId)}/pedidos`;
}

/** Negocio en `negocios/` del que se lee stock y config admin (mismo id por defecto). */
export function negocioGestioneParaStock(negocioId: string): string {
  return negocioId.trim();
}
