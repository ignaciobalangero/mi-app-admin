/**
 * UID de Firebase Auth del superadmin (panel /admin/super).
 * Podés sobreescribirlo en .env.local:
 * - Servidor (API): SUPER_ADMIN_UID=...
 * - Cliente (comprobación de pantalla): NEXT_PUBLIC_SUPER_ADMIN_UID=...
 */
export const SUPER_ADMIN_UID_DEFAULT = "8LgkhB1ZDIOjGkTGhe6hHDtKhgt1";

export function getSuperAdminUidClient(): string {
  return process.env.NEXT_PUBLIC_SUPER_ADMIN_UID || SUPER_ADMIN_UID_DEFAULT;
}

export function getSuperAdminUidServer(): string {
  return process.env.SUPER_ADMIN_UID || SUPER_ADMIN_UID_DEFAULT;
}

/** Emails con acceso superadmin (plataforma Gestione). */
export const SUPER_ADMIN_EMAILS = ["ignaciobalangero@gmail.com"] as const;

export function esSuperAdminUid(uid: string | null | undefined): boolean {
  if (!uid) return false;
  return uid === getSuperAdminUidClient() || uid === getSuperAdminUidServer();
}

export function esSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase() as (typeof SUPER_ADMIN_EMAILS)[number]);
}

export function esSuperAdminUsuario(
  user: { uid?: string | null; email?: string | null } | null | undefined
): boolean {
  if (!user) return false;
  return esSuperAdminUid(user.uid ?? null) || esSuperAdminEmail(user.email ?? null);
}
