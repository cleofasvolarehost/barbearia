export interface PaymentGateway {
  name: string;
  createPayment(data: PaymentRequest): Promise<PaymentResponse>;
}

export interface PaymentRequest {
  amount: number;
  description: string;
  customer: {
    name: string;
    email: string;
    taxId?: string; // CPF/CNPJ
  };
}

export interface PaymentResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  gateway_provider: string;
}
