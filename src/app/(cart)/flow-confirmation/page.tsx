"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, AlertCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getFlowPaymentStatus } from '@/lib/flow';
import { apiFetch } from '@/lib/api';

function FlowConfirmationContent() {
  const navigate = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Validando pago...');
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const validatePayment = async () => {
      try {
        // Soporta Flow (token) y Webpay (token_ws)
        const webpayToken = searchParams.get('token_ws');
        const flowOrder = searchParams.get('token');

        // Obtener el order ID del localStorage
        const storedOrderId = localStorage.getItem('pendingOrderId');
        if (!storedOrderId) {
          if (isMounted) {
            setStatus('error');
            setMessage('No se encontró el ID del pedido');
          }
          return;
        }

        if (isMounted) setOrderId(Number(storedOrderId));

        if (webpayToken) {
          const commitData = await apiFetch('/payments/webpay/commit', {
            method: 'POST',
            body: JSON.stringify({ token_ws: webpayToken }),
          });

          if (commitData?.success) {
            localStorage.removeItem('pendingOrderId');
            if (isMounted) {
              setStatus('success');
              setMessage('¡Pago confirmado exitosamente (Webpay)!');
              setTimeout(() => {
                if (isMounted) navigate.push('/');
              }, 3000);
            }
            return;
          } else {
            if (isMounted) {
              setStatus('error');
              setMessage(`Pago rechazado: ${commitData?.error || 'No autorizado'}`);
            }
            return;
          }
        }

        if (flowOrder) {
          const paymentStatus = await getFlowPaymentStatus(flowOrder || '');
          if (paymentStatus === 'success') {
            await apiFetch(`/orders/${storedOrderId}/confirm-payment`, {
              method: 'POST',
            });
            localStorage.removeItem('pendingOrderId');
            localStorage.removeItem('pendingFlowOrder');
            if (isMounted) {
              setStatus('success');
              setMessage('¡Pago confirmado exitosamente!');
              setTimeout(() => {
                if (isMounted) navigate.push('/');
              }, 3000);
            }
            return;
          }
          if (isMounted) {
            setStatus('error');
            setMessage(`Pago rechazado: ${paymentStatus}`);
          }
          return;
        }

        if (isMounted) {
          setStatus('error');
          setMessage('No se encontró token de pago (Webpay o Flow)');
        }
      } catch (error) {
        console.error('Error validando pago:', error);
        if (isMounted) {
          setStatus('error');
          setMessage(
            error instanceof Error
                ? error.message
                : 'Error al validar el pago. Por favor, contáctanos.'
          );
        }
      }
    };

    validatePayment();
    return () => { isMounted = false; };
  }, [searchParams, navigate]);

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            {status === 'loading' && (
                <>
                  <div className="flex justify-center mb-6">
                    <Loader className="h-12 w-12 text-blue-600 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Validando pago...
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{message}</p>
                </>
            )}

            {status === 'success' && (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    ¡Pedido Confirmado!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
                  {orderId && (
                      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-500">Número de pedido</p>
                        <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                          #{orderId}
                        </p>
                      </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Serás redirigido a la tienda en 3 segundos...
                  </p>
                  <Button
                      onClick={() => navigate.push('/')}
                      className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Ir a la Tienda
                  </Button>
                </>
            )}

            {status === 'error' && (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Error en el Pago
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
                  <Button
                      onClick={() => navigate.push('/carrito')}
                      className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Volver al Carrito
                  </Button>
                </>
            )}
          </CardContent>
        </Card>
      </div>
  );
}

export default function FlowConfirmation() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="h-12 w-12 text-blue-600 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900">Validando parámetros...</h2>
        </div>
      </div>
    }>
      <FlowConfirmationContent />
    </Suspense>
  );
}
