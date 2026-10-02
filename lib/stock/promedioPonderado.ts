/** Promedio ponderado de costo al ingresar mercadería. */
export function promedioPonderadoCosto(
  stockActual: number,
  costoActual: number,
  cantidadIngreso: number,
  costoIngreso: number
): { nuevaCantidad: number; nuevoCosto: number } {
  const stock = Math.max(0, Number(stockActual) || 0);
  const costo = Number(costoActual) || 0;
  const ingreso = Math.max(0, Number(cantidadIngreso) || 0);
  const costoNuevo = Number(costoIngreso) || 0;

  if (ingreso <= 0) {
    return { nuevaCantidad: stock, nuevoCosto: redondearDinero(costo) };
  }

  const nuevaCantidad = stock + ingreso;
  if (stock <= 0) {
    return { nuevaCantidad, nuevoCosto: redondearDinero(costoNuevo) };
  }

  const nuevoCosto = (stock * costo + ingreso * costoNuevo) / nuevaCantidad;
  return { nuevaCantidad, nuevoCosto: redondearDinero(nuevoCosto) };
}

function redondearDinero(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}
