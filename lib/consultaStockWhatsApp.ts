/** Helpers compartidos para WhatsApp en la tienda pública. */
export function soloDigitosWa(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function construirUrlWhatsApp(telefonoDigitos: string, cuerpo: string): string {
  const t = cuerpo.trim();
  return `https://wa.me/${soloDigitosWa(telefonoDigitos)}?text=${encodeURIComponent(t)}`;
}
