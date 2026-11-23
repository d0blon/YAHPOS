/**
 * Hook de arranque de Next.js. Se ejecuta una vez cuando el servidor se
 * inicializa (dev y `next start`), no durante `next build` — el build se
 * valida en `next.config.ts`.
 *
 * Objetivo: que un deploy con variables de entorno incompletas falle al
 * arrancar con un mensaje explícito, en lugar de degradarse en silencio.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { assertEnv } = await import('./lib/env')
  assertEnv({ phase: 'runtime' })
}
