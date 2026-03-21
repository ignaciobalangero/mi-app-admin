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
