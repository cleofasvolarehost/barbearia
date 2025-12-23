import { supabase } from '../lib/supabase';

interface CreatePixPaymentParams {
  appointment_data: {
    price: number;
    service_name: string;
    client_name: string;
    client_email?: string;
  };
  establishment_id: string;
}

interface CreatePixPaymentResponse {
  qr_code: string;
  qr_code_base64: string;
  payment_id: number;
  status: string;
}

export async function createPixPayment(params: CreatePixPaymentParams): Promise<CreatePixPaymentResponse> {
  const { data, error } = await supabase.functions.invoke('create-pix', {
    body: params
  });

  if (error) {
    throw new Error(error.message || 'Erro ao conectar com servidor de pagamento');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}
