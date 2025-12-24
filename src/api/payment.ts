import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const res = await apiFetch('/api/payment/pix/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(params),
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok || (payload as any).error) {
    throw new Error((payload as any).error || `Erro (${res.status}) ao gerar Pix`);
  }
  return payload as CreatePixPaymentResponse;
}
