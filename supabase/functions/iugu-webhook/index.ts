import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

async function getBody(req: Request): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const obj: Record<string, any> = {};
    params.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function resolveSubscription(supabase: any, q: { iugu_subscription_id?: string; establishment_id?: string; customer_id?: string; }) {
  if (q.iugu_subscription_id) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('iugu_subscription_id', String(q.iugu_subscription_id))
      .maybeSingle();
    if (data) return data;
  }
  if (q.establishment_id) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('establishment_id', q.establishment_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  if (q.customer_id) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', q.customer_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(url, key);

  const body = await getBody(req);
  const event = body.event || body.type || body?.data?.event;
  const iugu_subscription_id = body.subscription_id || body.subscription?.id || body?.id;
  const customer_id = body.customer_id || body.customer?.id;
  const establishment_id = body.establishment_id || null;

  if (!event) return new Response('OK', { status: 200 });

  try {
    const sub = await resolveSubscription(supabase, { iugu_subscription_id, establishment_id, customer_id });
    if (!sub) return new Response('OK', { status: 200 });

    if (event === 'invoice.payment_failed') {
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          last_payment_status: 'failed',
          retry_count: (sub.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      let phone: string | null = null;
      if (sub.establishment_id) {
        const { data: est } = await supabase
          .from('establishments')
          .select('phone')
          .eq('id', sub.establishment_id)
          .maybeSingle();
        phone = est?.phone || null;
      }
      await supabase.from('whatsapp_logs').insert({
        establishment_id: sub.establishment_id,
        message_type: 'billing_dunning',
        message_body: 'Seu pagamento não foi aprovado. Regularize para evitar bloqueio.',
        phone_number: phone,
        status: 'pending'
      });
    }

    if (event === 'invoice.payment_succeeded') {
      const base = sub.current_period_end && new Date(sub.current_period_end) > new Date()
        ? new Date(sub.current_period_end)
        : new Date();
      const newEnd = addDays(base, 30);
      await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          last_payment_status: 'paid',
          retry_count: 0,
          current_period_end: newEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      if (sub.establishment_id) {
        await supabase
          .from('establishments')
          .update({ subscription_status: 'active', subscription_end_date: newEnd.toISOString() })
          .eq('id', sub.establishment_id);
        const { data: est } = await supabase
          .from('establishments')
          .select('phone')
          .eq('id', sub.establishment_id)
          .maybeSingle();
        const phone = est?.phone || null;
        await supabase.from('whatsapp_logs').insert({
          establishment_id: sub.establishment_id,
          message_type: 'billing_receipt',
          message_body: 'Pagamento confirmado! Sua assinatura foi renovada.',
          phone_number: phone,
          status: 'pending'
        });
      }
    }
  } catch (e) {
    console.error('iugu-webhook error', e?.message || e);
  }

  return new Response('OK', { status: 200 });
});

