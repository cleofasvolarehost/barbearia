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
  const res = await apiFetch('/api/iugu/checkout/pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ amount_cents: Math.round(params.appointment_data.price * 100), email: params.appointment_data.client_email || 'no-reply@example.com' }),
  });
  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await res.json() : { error: await res.text() };
  if (!res.ok || (payload as any).error) {
    throw new Error((payload as any).error || `Erro (${res.status}) ao gerar Pix`);
  }
  const data = (payload as any).data || {};
  return { qr_code: data?.pix?.qrcode || data?.pix_qrcode || '', qr_code_base64: data?.pix?.qr_code_base64 || '', payment_id: Date.now(), status: 'pending' };
}
