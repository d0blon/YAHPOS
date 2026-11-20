import { z } from 'zod'

/**
 * Esquemas compartidos por las API routes que antes hacían `await req.json()`
 * y usaban los campos sin validar (TypeError 500 / mass assignment).
 * Las rutas del motor DTE/SII y del wizard se validan en la tanda final.
 */

const uuid = z.string().uuid()
const nonEmpty = z.string().trim().min(1)

export const registerSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(6).max(200),
    rut: nonEmpty.max(20),
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    acceptMarketing: z.boolean().optional(),
  })
  .strict()

export const cashMovementQuerySchema = z.object({ session_id: z.string().min(1).optional() })

export const cashMovementSchema = z
  .object({
    sessionId: uuid,
    type: nonEmpty.max(50),
    category: nonEmpty.max(100),
    amount: z.coerce.number().finite(),
    reason: z.string().max(500).optional(),
    cashier: nonEmpty.max(100),
  })
  .strict()

export const cashSessionQuerySchema = z.object({
  terminal_id: z.string().min(1).optional(),
  cashier: z.string().trim().max(100).optional(),
})

export const cashSessionOpenSchema = z
  .object({
    terminal_id: uuid,
    cashier_name: z.string().trim().max(100).optional(),
    opening_amount: z.coerce.number().finite().optional(),
  })
  .strict()

export const cashSessionCloseSchema = z
  .object({
    // El modal de cierre Z envía opening_amount aunque el update no lo persiste.
    opening_amount: z.coerce.number().finite().optional(),
    closing_amount: z.coerce.number().finite().nullable().optional(),
    total_cash_sales: z.coerce.number().finite().optional(),
    total_card_sales: z.coerce.number().finite().optional(),
    total_transfer_sales: z.coerce.number().finite().optional(),
    total_incomes: z.coerce.number().finite().optional(),
    total_expenses: z.coerce.number().finite().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .strict()

export const customerVerifySchema = z
  .object({
    userId: uuid.optional(),
    rut: z.string().trim().min(8).max(20).optional(),
  })
  .refine((value) => Boolean(value.userId || value.rut), {
    message: 'userId o rut es requerido',
  })

export const customerSearchQuerySchema = z.object({
  rut: z.string().trim().min(8).max(20).optional(),
})

export const customerDeleteSchema = z.object({ id: uuid })

export const posDraftQuerySchema = z.object({ sessionId: nonEmpty })

export const posDraftSchema = z
  .object({
    sessionId: nonEmpty,
    cartData: z.unknown().optional(),
    suspendedOrdersData: z.unknown().optional(),
  })
  .strict()

// El panel envía `tier_id`; el servidor históricamente esperaba `tierId`.
// Se aceptan ambos para no romper el cambio de plan.
export const subscriptionSchema = z
  .object({
    tierId: nonEmpty.max(50).optional(),
    tier_id: nonEmpty.max(50).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.tierId || data.tier_id), { message: 'Falta tierId' })

export const webpayCreateSchema = z
  .object({
    orderId: nonEmpty.max(100),
    amount: z.coerce.number().positive().finite(),
    returnUrl: z.string().min(1).max(2000),
  })
  .strict()

export const tokenWsSchema = z
  .object({ token_ws: nonEmpty.max(200) })
  .strict()

export const amountSchema = z
  .object({ amount: z.coerce.number().positive().finite() })
  .strict()

export const paymentStatusQuerySchema = z.object({
  token: nonEmpty.max(200).optional(),
  requestId: nonEmpty.max(200).optional(),
})

export const dashboardQuerySchema = z.object({
  branchId: z.union([uuid, z.literal('all')]).optional(),
})

export const productsQuerySchema = z.object({
  slug: z.string().trim().max(200).optional(),
  category: z.string().trim().max(200).optional(),
  search: z.string().trim().max(200).optional(),
  branch_id: uuid.optional(),
})

export const productLookupQuerySchema = z.object({
  code: z.string().trim().min(8).max(100),
})

export const productSubmissionSchema = z
  .object({
    sku: nonEmpty.max(100),
    name: nonEmpty.max(300),
    brand: z.string().trim().max(200).optional(),
    category: z.string().trim().max(200).optional(),
    image_url: z.string().trim().max(2000).optional(),
  })
  .strict()

export const terminalCreateSchema = z
  .object({
    name: nonEmpty.max(150),
    description: z.string().max(500).optional(),
  })
  .strict()

export const terminalUpdateSchema = z
  .object({
    name: nonEmpty.max(150).optional(),
    description: z.string().max(500).optional(),
    is_active: z.boolean().optional(),
  })
  .strict()

export const botInventoryUpdateSchema = z
  .object({
    updates: z
      .array(
        z
          .object({ sku: nonEmpty.max(100), quantity: z.number().finite() })
          .strict()
      )
      .min(1)
      .max(500),
  })
  .strict()

export const botInventoryPendingSchema = z
  .object({
    invoice_number: z.string().trim().max(100).optional(),
    supplier_name: z.string().trim().max(200).optional(),
    invoice_url: z.string().trim().max(2000).optional(),
    supplier_metadata: z.unknown().optional(),
    items: z
      .array(
        z
          .object({
            barcode: z.string().trim().max(100).optional(),
            sku: z.string().trim().max(100).optional(),
            name: z.string().trim().max(300).optional(),
            quantity: z.number().finite().optional(),
          })
          .passthrough()
      )
      .min(1)
      .max(1000),
  })
  .strict()

export const inventoryApproveSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            barcode: nonEmpty.max(100),
            quantity: z.number().positive().finite(),
            name: z.string().trim().max(300).optional(),
          })
          .strict()
      )
      .min(1)
      .max(1000),
  })
  .strict()

/**
 * Settings es un mapa clave→valor primitivo. Se rechazan claves con caracteres
 * raros para evitar upserts accidentales de columnas/configs internas.
 */
export const settingsSchema = z.record(
  z.string().regex(/^[a-z][a-z0-9_]{0,79}$/),
  z.union([z.string().max(5000), z.number().finite(), z.boolean()])
)

export const verifyDnsQuerySchema = z.object({
  domain: z
    .string()
    .trim()
    .min(3)
    .max(253)
    .regex(/^[a-z0-9.-]+$/i),
})

export const botProductsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
})

/** PATCH de orden: solo se permiten campos de estado, nunca totales ni store_id. */
export const orderPatchSchema = z
  .object({
    id: nonEmpty.max(100),
    status: nonEmpty.max(50).optional(),
    payment_status: nonEmpty.max(50).optional(),
    fulfillment_status: nonEmpty.max(50).optional(),
  })
  .strict()
  .refine(
    (data) => data.status !== undefined || data.payment_status !== undefined || data.fulfillment_status !== undefined,
    { message: 'Debe enviar status, payment_status o fulfillment_status' }
  )

/**
 * PATCH de producto. Esquema propio (no productSchema.partial()) para no aplicar
 * los `.default()` de creación en una actualización parcial.
 */
export const productPatchSchema = z
  .object({
    name: z.string().min(2).max(300).optional(),
    description: z.string().max(5000).nullable().optional(),
    price: z.coerce.number().positive().optional(),
    image: z.string().max(2000).optional(),
    category: z.string().min(1).max(200).optional(),
    stock: z.coerce.number().int().min(0).optional(),
    unit: z.string().max(50).optional(),
    isExempt: z.boolean().optional(),
    sku: z.string().max(100).optional(),
    barcode: z.string().max(100).optional(),
    nutritionalSeals: z.coerce.number().int().min(0).max(4).optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
    discount: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isRealtimeTracked: z.boolean().optional(),
    brand: z.string().max(200).optional(),
    volume: z.string().max(100).optional(),
    supplierName: z.string().max(200).optional(),
    supplierMetadata: z.unknown().optional(),
    branchStocks: z
      .array(z.object({ branchId: uuid, stock: z.coerce.number().int().min(0) }).strict())
      .optional(),
  })
  .strict()

export const logoUploadSchema = z.object({
  file: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
      message: 'No se recibió ningún archivo',
    })
    .refine((file) => ['image/png', 'image/webp'].includes(file.type), {
      message: 'Solo se permiten archivos PNG o WebP (SVG no permitido: puede ejecutar scripts)',
    })
    .refine((file) => file.size <= 2 * 1024 * 1024, {
      message: 'El archivo no puede superar los 2MB',
    }),
})

const INVOICE_ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

export const invoiceUploadSchema = z.object({
  file: z
    .custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
      message: 'No se recibió ningún archivo',
    })
    .refine((file) => INVOICE_ALLOWED_TYPES.includes(file.type), {
      message: 'Solo se permiten archivos PDF o imágenes (PNG, JPEG, WebP)',
    })
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'El archivo no puede superar los 5MB',
    }),
})
