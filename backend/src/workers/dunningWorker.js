const supabase = require('../config/supabase');
const IuguProvider = require('../providers/IuguProvider');
const iugu = new IuguProvider();

function daysBetween(a, b) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

async function processDunning() {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, establishment_id, status, current_period_end, retry_count, iugu_subscription_id')
    .eq('status', 'past_due');

  if (!subs || subs.length === 0) return;

  for (const s of subs) {
    const dueDate = s.current_period_end ? new Date(s.current_period_end) : new Date();
    const days = daysBetween(new Date(), dueDate);

    if (days > 3 && days <= 7) {
      await supabase.from('whatsapp_logs').insert({
        establishment_id: s.establishment_id,
        message_type: 'billing_warning',
        message_body: 'Sua assinatura está em atraso há mais de 3 dias. Regularize para evitar bloqueio.',
        status: 'pending'
      });
    }

    if (days > 7) {
      await supabase
        .from('establishments')
        .update({ subscription_status: 'suspended' })
        .eq('id', s.establishment_id);

      await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('id', s.id);

      if (s.iugu_subscription_id) {
        try {
          await iugu.suspendSubscription(s.iugu_subscription_id);
        } catch (err) {
          console.error('Failed to suspend Iugu subscription', s.iugu_subscription_id, err.message);
        }
      }
    }
  }
}

function startDunningWorker() {
  setInterval(processDunning, 24 * 60 * 60 * 1000);
}

module.exports = { startDunningWorker };
