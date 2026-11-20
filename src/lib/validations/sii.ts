import { z } from 'zod'

/**
 * Esquemas del motor DTE/SII, wizard y Blumi.
 * Se usan con `parseBody`/`parseFormData`/`parseParams`. Los objetos del DTE
 * conservan campos extra (`.passthrough`) porque el motor los reenvía tal cual
 * al XML; el `store_id` NUNCA se toma del body.
 */

const nonEmpty = z.string().trim().min(1)
const finiteNumber = z.coerce.number().finite()
const dteType = z.coerce.number().int().min(1).max(999)
const environment = z.enum(['certification', 'production'])
const MAX_XML_BYTES = 10 * 1024 * 1024
const MAX_PFX_BYTES = 10 * 1024 * 1024

export const siiEmitSchema = z.object({
  items: z
    .array(
      z
        .object({
          name: nonEmpty.max(300),
          price: finiteNumber.nonnegative(),
          quantity: z.coerce.number().int().positive(),
          isExempt: z.boolean().optional(),
        })
        .passthrough()
    )
    .min(1),
  totals: z
    .object({
      total: finiteNumber.nonnegative(),
    })
    .passthrough(),
  type: dteType.optional(),
})

const dteHeaderSchema = z
  .object({
    Folio: z.coerce.number().int().nonnegative().optional(),
    TipoDTE: dteType.optional(),
    FchEmis: z.string().max(10).optional(),
  })
  .passthrough()

export const dtePayloadSchema = z
  .object({
    Encabezado: dteHeaderSchema,
    Detalles: z.array(z.object({}).passthrough()).min(1),
  })
  .passthrough()

export const siiSyncSchema = z.object({
  id: z.union([nonEmpty.max(100), z.number().int()]),
  storeId: z.string().uuid(),
  payload: dtePayloadSchema,
  folio: z.coerce.number().int().nonnegative().optional(),
})

export const siiFoliosOfflineSchema = z.object({
  tipoDte: dteType,
  count: z.coerce.number().int().min(1).max(100).default(50),
})

export const siiConfigSchema = z
  .object({
    rut_emisor: nonEmpty.max(20).optional(),
    razon_social: z.string().max(200).optional(),
    giro: z.string().max(200).optional(),
    direccion: z.string().max(300).optional(),
    comuna: z.string().max(100).optional(),
    ciudad: z.string().max(100).optional(),
    environment: environment.optional(),
    acteco: z.coerce.number().int().min(0).max(999999).nullable().optional(),
    fch_resol: z.string().max(10).nullable().optional(),
    nro_resol: z.coerce.number().int().nonnegative().nullable().optional(),
    pfx_base64: z.string().max(MAX_PFX_BYTES).optional(),
    password: z.string().max(500).optional(),
  })
  .passthrough()

export const siiDocumentIdSchema = z.object({
  id: nonEmpty.max(100),
})

export const siiEnviarSchema = z.object({
  documentId: nonEmpty.max(100),
})

export const siiCafXmlSchema = z.object({
  xmlContent: nonEmpty.max(MAX_XML_BYTES),
})

export const siiCertificationSchema = z.object({
  caseId: z.union([nonEmpty.max(100), z.number().int()]),
})

export const blumiTestSchema = z.object({
  tipo_dte: dteType.optional(),
  monto: finiteNumber.nonnegative().optional(),
})

export const wizardCertificadoSchema = z.object({
  pfx: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
      message: 'No se recibió certificado PFX',
    })
    .refine((file) => /\.(pfx|p12)$/i.test(file.name), {
      message: 'El certificado debe tener extensión .pfx o .p12',
    })
    .refine((file) => file.size <= MAX_PFX_BYTES, {
      message: 'El certificado no puede superar los 10MB',
    }),
  password: z.string().max(500).default(''),
})

/** Tipos MIME con los que el SII/navegadores entregan un CAF (.xml, .dat, sin extensión). */
const CAF_MIME_TYPES = new Set([
  '',
  'application/xml',
  'text/xml',
  'application/x-xml',
  'application/octet-stream',
  'text/plain',
]);

/**
 * Filtro rápido del archivo CAF: se basa en el tipo de contenido declarado y el
 * tamaño, NO en la extensión. El análisis real del XML lo hace SiiCafParser.
 */
export function esPosibleCaf(file: unknown): file is File {
  const candidato = file as Partial<File> | null | undefined;
  if (!candidato || typeof candidato !== 'object') return false;
  if (typeof File !== 'undefined' && !(candidato instanceof File)) return false;
  if (typeof candidato.size !== 'number' || candidato.size <= 0 || candidato.size > MAX_XML_BYTES) return false;
  const mime = typeof candidato.type === 'string' ? candidato.type.trim().toLowerCase() : '';
  return CAF_MIME_TYPES.has(mime);
}

export const wizardCafSchema = z.object({
  caf: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
      message: 'No se recibió archivo CAF',
    })
    .refine((file) => file.size <= MAX_XML_BYTES, {
      message: 'El archivo CAF no puede superar los 10MB',
    })
    .refine((file) => esPosibleCaf(file), {
      message: 'No se reconoció el CAF: se aceptan archivos XML/DAT (o sin extensión)',
    }),
  tipoDte: dteType.optional(),
})

export const wizardCafSolicitarSchema = z
  .object({
    tipoDte: dteType,
    folioDesde: z.coerce.number().int().nonnegative(),
    folioHasta: z.coerce.number().int().nonnegative(),
  })
  .refine((data) => data.folioHasta >= data.folioDesde, {
    message: 'folioHasta debe ser mayor o igual que folioDesde',
    path: ['folioHasta'],
  })

export const wizardConfiguracionSchema = z.object({
  acteco: z.coerce.number().int().min(1000).max(999999).optional(),
  nroResol: z.coerce.number().int().nonnegative(),
  fchResol: nonEmpty.max(10),
  rutEmisor: nonEmpty.max(20),
  razonSocial: z.string().max(200).optional(),
  environment: environment.optional(),
})

export const wizardResolucionSchema = z.object({
  nroResol: z.coerce.number().int().nonnegative(),
  fchResol: nonEmpty.max(10),
  acteco: z.coerce.number().int().min(1000).max(999999).optional(),
})
