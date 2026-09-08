/** Helpers compartidos para WhatsApp en la tienda pública. */
export function soloDigitosWa(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Normaliza a formato internacional AR (549…) para wa.me. */
export function normalizarTelefonoWa(raw: string): string | null {
  let d = soloDigitosWa(raw);
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length < 10) return null;
  if (d.startsWith("54")) return d;
  if (d.length === 10) return `549${d}`;
  if (d.startsWith("9") && d.length === 11) return `54${d}`;
  if (d.startsWith("15") && d.length === 12) return `54${d}`;
  return d;
}

export function construirUrlWhatsApp(telefonoDigitos: string, cuerpo: string): string {
  const t = cuerpo.trim();
  const tel = normalizarTelefonoWa(telefonoDigitos) || soloDigitosWa(telefonoDigitos);
  return `https://wa.me/${tel}?text=${encodeURIComponent(t)}`;
}
