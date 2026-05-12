import { z } from 'zod';
import { validateRut } from '../utils';

export const customerSchema = z.object({
  rut: z.string().refine((val) => validateRut(val), {
    message: 'RUT inválido (Dígito verificador incorrecto)',
  }),
  name: z.string().min(2, 'El nombre es obligatorio'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  points: z.number().nonnegative().optional().default(0),
});

export type CustomerInput = z.infer<typeof customerSchema>;
