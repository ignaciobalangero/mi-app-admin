export function normalizarMoneda(v: unknown): "ARS" | "USD" {
  const s = String(v ?? "ARS")
    .trim()
    .toUpperCase();
  if (s === "USD" || s === "US$" || s === "DOLAR" || s === "DÓLAR") return "USD";
  return "ARS";
}

export function pesosDesdeMoneda(monto: number, moneda: "ARS" | "USD", cot: number): number {
  const n = Number(monto) || 0;
  return moneda === "USD" ? Math.round(n * cot) : Math.round(n);
}
