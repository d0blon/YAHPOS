import { z } from 'zod'
import { ASSIGNABLE_STAFF_ROLES } from '@/lib/constants/roles'

export const staffCreateSchema = z
  .object({
    rut: z.string().trim().min(8).max(12),
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().max(100).optional(),
    role: z.enum(ASSIGNABLE_STAFF_ROLES).optional(),
  })
  .strict()

export const staffUpdateSchema = z
  .object({
    id: z.string().uuid(),
    current_area: z.string().trim().max(100).optional(),
    role: z.enum(ASSIGNABLE_STAFF_ROLES).optional(),
  })
  .strict()
  .refine((data) => data.current_area !== undefined || data.role !== undefined, {
    message: 'Debe enviar current_area o role',
  })

export const staffDeleteSchema = z.object({
  id: z.string().uuid(),
}).strict()
