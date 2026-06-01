export function puedeVerCajaDiaria(rolTipo: string | undefined): boolean {
  return rolTipo === "admin" || rolTipo === "empleado";
}

export function puedeOperarCajaDiaria(rolTipo: string | undefined): boolean {
  return puedeVerCajaDiaria(rolTipo);
}

export function puedeVerCajaMayor(rolTipo: string | undefined): boolean {
  return rolTipo === "admin";
}

export function puedeOperarCajaMayor(rolTipo: string | undefined): boolean {
  return puedeVerCajaMayor(rolTipo);
}

export function puedeRetiroDueno(rolTipo: string | undefined): boolean {
  return rolTipo === "admin";
}
