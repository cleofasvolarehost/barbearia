import { PaymentGateway, PaymentRequest, PaymentResponse } from '../types';

export class EfiService implements PaymentGateway {
  name = 'Efi';
  private credentials: string; // Typically JSON with client_id/secret

  constructor(credentials: string) {
    this.credentials = credentials;
  }

  async createPayment(data: PaymentRequest): Promise<PaymentResponse> {
    // Efi implementation requires certificate (p12) for mTLS usually, which is hard in browser.
    // This is definitely a server-side only gateway.
    // We will throw error for client-side attempt or return a mock for now.
    
    console.warn('Efi requires mTLS certificate. This adapter is a placeholder.');
    
    return {
        id: 'mock_efi_' + Date.now(),
        status: 'pending',
        qr_code: '000201...mock...efi',
        gateway_provider: 'efi'
    };
  }
}
