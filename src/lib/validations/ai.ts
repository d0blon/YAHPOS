import { z } from 'zod';

export const aiDescriptionSchema = z.object({
  productName: z.string().min(2, 'El nombre del producto es obligatorio'),
  productCategory: z.string().optional(),
  attributes: z.string().optional(),
  tone: z.enum(['profesional', 'divertido', 'elegante', 'minimalista']).default('profesional'),
});

export type AIDescriptionInput = z.infer<typeof aiDescriptionSchema>;
