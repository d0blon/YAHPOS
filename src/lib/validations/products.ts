import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  price: z.number().positive('El precio debe ser mayor a 0'),
  stock: z.number().int().min(0, 'El stock no puede ser negativo'),
  category: z.string().min(1, 'La categoría es obligatoria'),
  image: z.string().optional().or(z.literal('')),
  unit: z.string().optional().default('unidad'),
  isExempt: z.boolean().optional().default(false),
  slug: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  nutritionalSeals: z.number().int().min(0).max(4).optional().default(0),
  brand: z.string().optional().default(''),
  volume: z.string().optional().default(''),
  supplierName: z.string().optional().default(''),
  supplierMetadata: z.any().optional(),
  isRealtimeTracked: z.boolean().optional().default(false),
  branchStocks: z.array(z.object({
    branchId: z.string().uuid(),
    stock: z.number().int().min(0)
  })).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
