import { PaymentGateway, PaymentRequest, PaymentResponse } from '../types';

export class MercadoPagoService implements PaymentGateway {
  name = 'Mercado Pago';
  private accessToken: string;

  constructor(token: string) {
    this.accessToken = token;
  }

  async createPayment(data: PaymentRequest): Promise<PaymentResponse> {
    // Note: Calling MP API directly from client is not recommended for production due to CORS and Security.
    // This should ideally run in an Edge Function.
    
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: 'pix',
        payer: {
          email: data.customer.email,
          first_name: data.customer.name.split(' ')[0],
          last_name: data.customer.name.split(' ').slice(1).join(' '),
          identification: data.customer.taxId ? {
             type: 'CPF',
             number: data.customer.taxId.replace(/\D/g, '')
          } : undefined
        }
      })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`MP Error: ${errorData.message || JSON.stringify(errorData)}`);
    }

    const mpData = await response.json();
    const poi = mpData.point_of_interaction?.transaction_data;

    return {
      id: mpData.id.toString(),
      status: mpData.status === 'approved' ? 'approved' : 'pending',
      qr_code: poi?.qr_code,
      qr_code_base64: poi?.qr_code_base64,
      ticket_url: poi?.ticket_url,
      gateway_provider: 'mercadopago'
    };
  }
}
