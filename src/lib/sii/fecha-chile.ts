/**
 * Fechas en hora local de Chile (America/Santiago) para el SII.
 *
 * El SII exige marcas de tiempo y fechas en hora local chilena, sin indicador de zona.
 * `new Date().toISOString()` devuelve UTC, lo que hace que un DTE emitido después de las
 * 21:00 hora local quede fechado "mañana" para el SII, y el TED con TSTED en UTC invalida
 * la firma porque el SII compara contra hora local. Estos helpers resuelven ambos casos.
 */

/** Timestamp ISO-like sin zona en hora de Chile: `AAAA-MM-DDTHH:MM:SS`. */
export function timestampChile(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(' ', 'T');
}

/** Fecha en formato `AAAA-MM-DD` en hora de Chile. */
export function fechaChile(): string {
  return new Date().toLocaleString('en-CA', { timeZone: 'America/Santiago' }).split(/[\s,]+/)[0];
}

/**
 * Convierte fecha `AAAA-MM-DD` al formato `DDMMYYYY` que exige el SII en consultas
 * SOAP como `getEstDte` (`FechaEmisionDte`). Pasa la entrada tal cual si no calza.
 */
export function formatFechaDDMMYYYY(fecha: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!match) return fecha;
  return `${match[3]}${match[2]}${match[1]}`;
}
