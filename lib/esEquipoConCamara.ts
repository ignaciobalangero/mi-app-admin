/** iPhone, iPad o Android: la cámara de atrás sirve para leer códigos. */
export function esEquipoConCamara(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  const nav = navigator as Navigator & { platform?: string };
  return nav.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}
