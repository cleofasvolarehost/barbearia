const supabase = require('../config/supabase');

async function sendDunningMessage(establishmentId, phone, message) {
  if (!phone) return;
  await supabase.from('whatsapp_logs').insert({
    establishment_id: establishmentId || null,
    client_id: null,
    booking_id: null,
    phone_number: phone,
    message_type: 'billing_dunning',
    message_body: message,
    status: 'pending',
    api_response: null
  });
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

class IuguWebhookController {
  static async handleWebhook(req, res) {
    const payload = req.body || {};
    const event = payload.event || payload.type || payload?.data?.event;
    const data = payload.data || payload.invoice || payload;

    try {
      if (!event) return res.status(200).send('OK');

      if (event === 'invoice.payment_failed') {
        await IuguWebhookController.onPaymentFailed(data);
        return res.status(200).send('OK');
      }

      if (event === 'invoice.payment_succeeded') {
        await IuguWebhookController.onPaymentSucceeded(data);
        return res.status(200).send('OK');
      }

      return res.status(200).send('IGNORED');
    } catch (err) {
      console.error('Iugu Webhook Error:', err);
      return res.status(200).send('ERROR');
    }
  }

  static async resolveSubscriptionRecord({ subscription_id, customer_id, establishment_id }) {
    let sub = null;
    if (subscription_id) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('iugu_subscription_id', String(subscription_id))
        .maybeSingle();
      sub = data || null;
    }

    if (!sub && establishment_id) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('establishment_id', establishment_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      sub = data || null;
    }

    if (!sub && customer_id) {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', customer_id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      sub = data || null;
    }

    return sub;
  }

  static async onPaymentFailed(data) {
    const subscription_id = data.subscription_id || data.subscription?.id || data?.id;
    const customer_id = data.customer_id || data.customer?.id;
    const establishment_id = data.establishment_id || null;

    const sub = await IuguWebhookController.resolveSubscriptionRecord({ subscription_id, customer_id, establishment_id });
    if (!sub) return;

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        last_payment_status: 'failed',
        retry_count: (sub.retry_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id);

    if (error) console.error('Update past_due error:', error);

    let phone = null;
    if (sub.establishment_id) {
      const { data: est } = await supabase
        .from('establishments')
        .select('phone')
        .eq('id', sub.establishment_id)
        .maybeSingle();
      phone = est?.phone || null;
    } else if (sub.user_id) {
      const { data: user } = await supabase
        .from('usuarios')
        .select('telefone, establishment_id')
        .eq('id', sub.user_id)
        .maybeSingle();
      phone = user?.telefone || null;
      establishment_id = user?.establishment_id || establishment_id;
    }

    await sendDunningMessage(establishment_id || sub.establishment_id, phone, 'Seu pagamento não foi aprovado. Vamos tentar novamente. Evite bloqueio do acesso.');
  }

  static async onPaymentSucceeded(data) {
    const subscription_id = data.subscription_id || data.subscription?.id || data?.id;
    const customer_id = data.customer_id || data.customer?.id;
    const establishment_id = data.establishment_id || null;

    const sub = await IuguWebhookController.resolveSubscriptionRecord({ subscription_id, customer_id, establishment_id });
    if (!sub) return;

    const baseDate = sub.current_period_end && new Date(sub.current_period_end) > new Date()
      ? new Date(sub.current_period_end)
      : new Date();
    const newEnd = addDays(baseDate, 30);

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_payment_status: 'paid',
        retry_count: 0,
        current_period_end: newEnd.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sub.id);

    if (error) console.error('Update active error:', error);

    if (sub.establishment_id) {
      await supabase
        .from('establishments')
        .update({
          subscription_status: 'active',
          subscription_end_date: newEnd.toISOString()
        })
        .eq('id', sub.establishment_id);
    }

    let phone = null;
    if (sub.establishment_id) {
      const { data: est } = await supabase
        .from('establishments')
        .select('phone')
        .eq('id', sub.establishment_id)
        .maybeSingle();
      phone = est?.phone || null;
    }

    await sendDunningMessage(sub.establishment_id, phone, 'Pagamento confirmado! Sua assinatura foi renovada.');
  }
}

module.exports = IuguWebhookController;

