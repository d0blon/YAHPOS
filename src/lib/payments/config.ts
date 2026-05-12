export type PaymentProvider = 'transbank' | 'flow' | 'manual';

export interface PaymentConfig {
  provider: PaymentProvider;
  isProduction: boolean;
}

export function getPaymentConfig(): PaymentConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Lógica para elegir proveedor (puedes ajustar según tus vars)
  const provider: PaymentProvider = process.env.PAYMENT_PROVIDER === 'flow' 
    ? 'flow' 
    : 'transbank';

  return {
    provider,
    isProduction,
  };
}
