// src/lib/flow.ts
export interface FlowPaymentRequest {
  commerceOrder: string;
  subject: string;
  currency?: string;
  amount: number;
  email: string;
  paymentMethod?: number;
  urlConfirmation: string;
  urlReturn: string;
}

export interface FlowPaymentResponse {
  url: string;
  token: string;
  flowOrder: number;
}

export async function createFlowPayment(data: FlowPaymentRequest): Promise<FlowPaymentResponse> {
  console.log("Simulating Flow payment creation...", data);
  // Simulación de respuesta de Flow api
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        url: 'https://sandbox.flow.cl/app/web/pay.php',
        token: `mock_flow_token_${Date.now()}`,
        flowOrder: Math.floor(Math.random() * 1000000)
      });
    }, 500);
  });
}

export async function getFlowPaymentStatus(token: string): Promise<'success' | 'error'> {
  console.log("Verifying token", token);
  return new Promise((resolve) => setTimeout(() => resolve('success'), 1000));
}
