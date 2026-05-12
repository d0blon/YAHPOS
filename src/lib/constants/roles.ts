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
