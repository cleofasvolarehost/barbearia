import { PaymentGateway, PaymentRequest, PaymentResponse } from '../types';

export class AsaasService implements PaymentGateway {
  name = 'Asaas';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createPayment(data: PaymentRequest): Promise<PaymentResponse> {
    // Asaas API (Sandbox or Prod based on env, here assumed Prod URL or we check key prefix)
    const baseUrl = this.apiKey.includes('$aact') ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

    // 1. Create Customer (Simplified - normally check if exists first)
    // For this MVP, we skip customer creation optimization and just create payment directly if allowed or create customer first.
    // Asaas usually requires a customer ID for payments.

    // Step A: Create/Get Customer
    const customerRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'access_token': this.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: data.customer.name,
            email: data.customer.email,
            cpfCnpj: data.customer.taxId
        })
    });
    
    const customerData = await customerRes.json();
    const customerId = customerData.id; // Or handle error

    if (!customerId) throw new Error('Failed to create Asaas Customer');

    // Step B: Create Payment
    const response = await fetch(`${baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'PIX',
        value: data.amount,
        dueDate: new Date().toISOString().split('T')[0],
        description: data.description
      })
    });

    if (!response.ok) {
        throw new Error('Asaas Payment Failed');
    }

    const paymentData = await response.json();

    // Step C: Get Pix QR Code (Asaas requires a separate call for QR Code sometimes, or it returns in paymentData depending on version)
    // For v3, we usually call /payments/{id}/pixQrCode
    
    const qrRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
        headers: { 'access_token': this.apiKey }
    });
    const qrData = await qrRes.json();

    return {
      id: paymentData.id,
      status: 'pending',
      qr_code: qrData.payload,
      qr_code_base64: qrData.encodedImage,
      gateway_provider: 'asaas'
    };
  }
}
