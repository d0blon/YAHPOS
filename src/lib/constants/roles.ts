/**
 * Roles unificados para YAHPOS!
 * Evita la duplicidad de nomenclatura (ej. 'cajero' vs 'cashier')
 */
export enum AppRole {
  OWNER = 'owner',           // Dueño del negocio (Merchant)
  ADMIN = 'admin',           // Administrador de tienda
  MANAGER = 'manager',       // Encargado de turno
  CASHIER = 'cashier',       // Cajero/Operador
  DEVELOPER = 'developer',   // Acceso total sistema (SaaS Admin)
  CUSTOMER = 'customer'      // Cliente final
}

/**
 * Roles que puede asignar el panel de personal. Nunca incluir owner/developer/
 * superadmin: esos se otorgan solo desde el developer console.
 * Debe coincidir con la lista de roles del formulario de /admin/personal.
 */
export const ASSIGNABLE_STAFF_ROLES = ['admin', 'manager', 'cashier', 'warehouse'] as const

/** Roles con permiso para gestionar personal. */
export const STAFF_MANAGEMENT_ROLES = ['owner', 'admin', 'developer'] as const

/** Roles que pueden operar el motor DTE desde el POS (emitir, sincronizar, consultar folios). */
export const SII_OPERATION_ROLES = ['owner', 'admin', 'manager', 'cashier', 'developer'] as const

/** Roles que pueden cambiar configuración SII, certificados, CAF o modo de emisión. */
export const SII_MANAGEMENT_ROLES = ['owner', 'admin', 'developer'] as const

/** Chequeo de rol en servidor. Nunca confiar en `user_metadata.role`. */
export function roleIn(role: string | null | undefined, allowed: readonly string[]): boolean {
  if (!role) return false
  const normalized = role.toLowerCase()
  return allowed.some((candidate) => candidate.toLowerCase() === normalized)
}

export const ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.OWNER]: 'Dueño',
  [AppRole.ADMIN]: 'Administrador',
  [AppRole.MANAGER]: 'Encargado',
  [AppRole.CASHIER]: 'Cajero',
  [AppRole.DEVELOPER]: 'Desarrollador',
  [AppRole.CUSTOMER]: 'Cliente'
};

/**
 * Helper para normalizar roles antiguos o inconsistentes
 */
export function normalizeRole(role: string): AppRole {
  const r = role.toLowerCase();
  if (r === 'cajero' || r === 'cashier') return AppRole.CASHIER;
  if (r === 'owner' || r === 'merchant') return AppRole.OWNER;
  if (r === 'admin') return AppRole.ADMIN;
  if (r === 'developer' || r === 'dev') return AppRole.DEVELOPER;
  return AppRole.CUSTOMER;
}
