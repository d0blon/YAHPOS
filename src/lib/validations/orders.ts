import { z } from 'zod';
import { validateRut } from '@/lib/utils';

export const orderItemSchema = z.object({
  productId: z.string().min(1, 'ID de producto inválido'),
  quantity: z.number().int().positive('La cantidad debe ser al menos 1'),
  price: z.number().positive('El precio debe ser positivo').optional(),
  unitPrice: z.number().positive('El precio unitario debe ser positivo').optional(),
});

export const orderSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido').optional(),
  total: z.number().nonnegative('El total no puede ser negativo'),
  subtotal: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  serviceFee: z.number().nonnegative().optional(),
  shippingType: z.string().optional(),
  shippingAddress: z.union([
    z.string(),
    z.object({
      fullName: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      street: z.string().optional(),
      number: z.string().optional(),
      apartment: z.string().optional(),
      commune: z.string().optional(),
      city: z.string().optional(),
    })
  ]).optional(),
  paymentMethod: z.string().min(1, 'El método de pago es obligatorio'),
  status: z.string().optional().default('pending'),
  customerRut: z.string().optional().refine((val) => !val || validateRut(val), {
    message: 'RUT inválido (Dígito verificador incorrecto)'
  }),
  pointsToEarn: z.number().nonnegative().optional(),
  pointsRedeemed: z.number().nonnegative().optional(),
  items: z.array(orderItemSchema).min(1, 'La orden debe tener al menos un producto'),
  branchId: z.string().uuid('ID de sucursal inválido').optional(),
  source: z.enum(['pos', 'ecommerce']).default('pos'),
  registerId: z.string().optional(),
  offlineId: z.string().optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;
