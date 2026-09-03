/** Extrae un IMEI de 15 dígitos de texto o código de barras. */

function luhnImei(digits: string): boolean {
  if (!/^\d{15}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(digits[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(digits[14]);
}

export function extraerImei(raw: string): string | null {
  const compacto = String(raw || "").replace(/\D/g, "");
  if (compacto.length === 15) return compacto;
  if (compacto.length === 14) return compacto; // algunos equipos muestran 14

  const candidatos: string[] = [];
  for (let i = 0; i + 15 <= compacto.length; i++) {
    candidatos.push(compacto.slice(i, i + 15));
  }

  const conLuhn = candidatos.find(luhnImei);
  if (conLuhn) return conLuhn;
  if (candidatos.length > 0) return candidatos[0];

  const m = String(raw || "").match(/(?:\d[\s\-.]*){14,16}/g);
  if (m) {
    for (const g of m) {
      const d = g.replace(/\D/g, "");
      if (d.length === 15) return d;
      if (d.length === 14) return d;
    }
  }
  return null;
}
