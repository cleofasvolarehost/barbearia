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
  try {
    const res = await apiFetch('/api/iugu/checkout/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        amount_cents: Math.round(params.appointment_data.price * 100),
        email: params.appointment_data.client_email || 'no-reply@example.com',
        items: [
          {
            description: params.appointment_data.service_name || 'Assinatura',
            quantity: 1,
            price_cents: Math.round(params.appointment_data.price * 100),
          },
        ],
      }),
    });
    const ct = res.headers.get('content-type') || '';
    const payload = ct.includes('application/json') ? await res.json() : { error: await res.text() };
    if (!res.ok || (payload as any).error) {
      try {
        console.error('Iugu Pix error details:', payload);
      } catch {}
      const details = (payload as any)?.details;
      const detailMsg = details?.errors ? JSON.stringify(details.errors) : undefined;
      throw new Error(detailMsg || (payload as any).mensagem || (payload as any).error || `Erro (${res.status}) ao gerar Pix`);
    }
    const data = (payload as any).data || payload || {};
    const qrCode = data?.pix?.qrcode || data?.pix_qrcode || data?.qr_code || '';
    const qrBase64 = data?.pix?.qr_code_base64 || data?.qr_code_base64 || '';
    return { qr_code: qrCode, qr_code_base64: qrBase64, payment_id: Date.now(), status: data?.status || 'pending' };
  } catch (err) {
    const { data, error } = await supabase.functions.invoke('create-pix', {
      body: {
        appointment_data: params.appointment_data,
        establishment_id: params.establishment_id,
      },
    });
    if (error) throw new Error(error.message || 'Erro ao gerar Pix (fallback)');
    return {
      qr_code: (data as any)?.qr_code || '',
      qr_code_base64: (data as any)?.qr_code_base64 || '',
      payment_id: (data as any)?.payment_id || Date.now(),
      status: (data as any)?.status || 'pending',
    };
  }
}
