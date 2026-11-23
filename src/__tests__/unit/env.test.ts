import { ENV_SPEC, EnvValidationError, assertEnv, validateEnv } from '@/lib/env'

type Source = Record<string, string | undefined>

const PRODUCTION_SOURCE: Source = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-de-prueba',
  NEXT_PUBLIC_ROOT_ORIGIN: 'https://app.yahpos.cl',
  NEXT_PUBLIC_ROOT_DOMAIN: 'root.yahpos.cl',
  NEXT_PUBLIC_SUPPORT_EMAIL: 'soporte@yahpos.cl',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-de-prueba',
  SECURITY_SALT: 'salt-de-prueba-suficientemente-largo',
  SII_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  MASTER_KEY_ENCRYPTED: 'cifrado-de-prueba',
  DEV_TOKEN_SECRET: 'dev-token-secret-de-prueba',
  UPSTASH_REDIS_REST_URL: 'https://redis-de-prueba.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-de-prueba',
  BLUMI_SANDBOX_URL: 'https://dte.blumi.cl/api/v1/sandbox',
}

function validate(
  source: Source,
  overrides: { phase?: 'build' | 'runtime'; target?: 'development' | 'test' | 'production' } = {}
) {
  return validateEnv({ phase: 'runtime', target: 'production', source, ...overrides })
}

describe('validateEnv', () => {
  it('acepta una configuración de producción completa', () => {
    const result = validate(PRODUCTION_SOURCE)

    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('reporta todas las variables faltantes juntas, sin cortar en la primera', () => {
    const result = validate({ NEXT_PUBLIC_ROOT_ORIGIN: 'https://app.yahpos.cl' })

    const names = result.errors.map((issue) => issue.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SII_ENCRYPTION_KEY',
        'UPSTASH_REDIS_REST_TOKEN',
      ])
    )
    expect(result.ok).toBe(false)
    // D-001: estas dos tienen fallback en código, así que se avisan, no bloquean.
    expect(result.warnings.map((issue) => issue.name)).toEqual(
      expect.arrayContaining(['NEXT_PUBLIC_ROOT_DOMAIN', 'NEXT_PUBLIC_SUPPORT_EMAIL', 'MASTER_KEY_ENCRYPTED'])
    )
  })

  it('exige que SII_ENCRYPTION_KEY tenga exactamente 32 caracteres sin filtrar el valor', () => {
    const result = validate({ ...PRODUCTION_SOURCE, SII_ENCRYPTION_KEY: 'corta' })

    const issue = result.errors.find((item) => item.name === 'SII_ENCRYPTION_KEY')
    expect(issue?.message).toContain('exactamente 32 caracteres')
    expect(issue?.message).toContain('actual: 5')
    expect(issue?.message).not.toContain('corta')
  })

  it('rechaza un NEXT_PUBLIC_ROOT_ORIGIN con path, query o hash', () => {
    const result = validate({ ...PRODUCTION_SOURCE, NEXT_PUBLIC_ROOT_ORIGIN: 'https://app.yahpos.cl/admin' })

    const issue = result.errors.find((item) => item.name === 'NEXT_PUBLIC_ROOT_ORIGIN')
    expect(issue?.message).toContain('sin path, query ni hash')
  })

  it('rechaza un NEXT_PUBLIC_ROOT_DOMAIN con scheme o puerto', () => {
    const result = validate({ ...PRODUCTION_SOURCE, NEXT_PUBLIC_ROOT_DOMAIN: 'https://root.yahpos.cl:3000' })

    const issue = result.errors.find((item) => item.name === 'NEXT_PUBLIC_ROOT_DOMAIN')
    expect(issue?.message).toContain('solo un hostname')
  })

  it('rechaza placeholders de .env.example en producción', () => {
    const result = validate({ ...PRODUCTION_SOURCE, SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key' })

    const issue = result.errors.find((item) => item.name === 'SUPABASE_SERVICE_ROLE_KEY')
    expect(issue?.message).toContain('valor de ejemplo')
  })

  it('en build solo exige las variables públicas', () => {
    const result = validate(
      {
        NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-de-prueba',
        NEXT_PUBLIC_ROOT_ORIGIN: 'https://app.yahpos.cl',
      },
      { phase: 'build' }
    )

    expect(result.ok).toBe(true)
  })

  it('en desarrollo no exige secretos de producción pero sí la service role key', () => {
    const result = validate(
      {
        NEXT_PUBLIC_SUPABASE_URL: 'https://proyecto.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-de-prueba',
        NEXT_PUBLIC_ROOT_ORIGIN: 'http://localhost:3000',
      },
      { target: 'development' }
    )

    const names = result.errors.map((issue) => issue.name)
    expect(names).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(names).not.toContain('SII_ENCRYPTION_KEY')
    expect(names).not.toContain('UPSTASH_REDIS_REST_URL')
    expect(names).not.toContain('NEXT_PUBLIC_ROOT_DOMAIN')
    expect(names).not.toContain('NEXT_PUBLIC_SUPPORT_EMAIL')
  })

  it('no valida nada cuando el target es test', () => {
    const result = validate({}, { target: 'test' })
    expect(result.ok).toBe(true)
  })
})

describe('assertEnv', () => {
  it('lanza EnvValidationError con el listado completo y la referencia a la documentación', () => {
    expect(() =>
      assertEnv({ phase: 'runtime', target: 'production', source: { NEXT_PUBLIC_ROOT_ORIGIN: 'https://app.yahpos.cl' } })
    ).toThrow(EnvValidationError)

    try {
      assertEnv({ phase: 'runtime', target: 'production', source: {} })
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain('[env] Configuración inválida (production)')
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(message).toContain('docs/env.md')
    }
  })

  it('SKIP_ENV_VALIDATION no permite saltar la validación en producción', () => {
    const original = process.env.SKIP_ENV_VALIDATION
    process.env.SKIP_ENV_VALIDATION = '1'

    try {
      expect(() => assertEnv({ phase: 'runtime', target: 'production', source: {} })).toThrow(EnvValidationError)
    } finally {
      if (original === undefined) delete process.env.SKIP_ENV_VALIDATION
      else process.env.SKIP_ENV_VALIDATION = original
    }
  })
})

describe('ENV_SPEC', () => {
  it('no marca ninguna variable NEXT_PUBLIC_* como secreta', () => {
    const publicSecrets = ENV_SPEC.filter((spec) => spec.name.startsWith('NEXT_PUBLIC_') && spec.secret)

    expect(publicSecrets).toEqual([])
  })

  it('no contiene nombres duplicados', () => {
    const names = ENV_SPEC.map((spec) => spec.name)

    expect(new Set(names).size).toBe(names.length)
  })
})
