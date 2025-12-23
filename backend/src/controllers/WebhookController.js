const MercadoPagoProvider = require('../providers/MercadoPagoProvider');
const supabase = require('../config/supabase');

const mpProvider = new MercadoPagoProvider();

class WebhookController {
  
  static async handleWebhook(req, res) {
    const { action, type, data } = req.body;
    // MP Webhooks usually send: { action: 'payment.created', type: 'payment', data: { id: '...' } }
    
    // Quick validation
    if (!data || !data.id) {
       // Not a payment event we care about or malformed
       return res.status(200).send('OK');
    }

    try {
      // 1. Verify Payment status with MP (Double Check Pattern)
      // This confirms the webhook is legitimate because we ask MP directly about this ID.
      const payment = await mpProvider.getPayment(data.id);
      
      if (!payment) {
        return res.status(404).send('Payment not found');
      }

      const { status, external_reference, metadata } = payment;
      const planId = metadata.plan_id;
      const userId = external_reference;

      if (status === 'approved') {
        await WebhookController.handleApprovedPayment(userId, planId, payment);
      }

      return res.status(200).send('OK');

    } catch (error) {
      console.error('Webhook Error:', error);
      // Return 200 even on error to prevent MP from retrying endlessly if it's a logic error
      return res.status(200).send('Error processed');
    }
  }

  static async handleApprovedPayment(userId, planId, payment) {
    // 1. Fetch Plan to know interval (default 30 days)
    const { data: plan } = await supabase
      .from('saas_plans') // Try saas_plans first
      .select('*')
      .eq('id', planId)
      .single();
    
    // Fallback if using 'plans' table
    let intervalDays = 30;
    if (plan && plan.interval_days) {
        intervalDays = plan.interval_days;
    }

    // 2. Get current subscription to calculate new end date
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('plan_id', planId)
      .single();

    let newEndsAt = new Date();
    // If active and not expired, add to existing date
    if (currentSub && currentSub.current_period_end) {
        const currentEnd = new Date(currentSub.current_period_end);
        if (currentEnd > new Date()) {
            newEndsAt = currentEnd;
        }
    }
    
    // Add interval
    newEndsAt.setDate(newEndsAt.getDate() + intervalDays);

    // 3. Update or Insert Subscription
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_end: newEndsAt.toISOString(),
        mp_payment_id: payment.id.toString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, plan_id' }); // Assuming composite key or logic

    if (upsertError) {
        console.error('Failed to update subscription:', upsertError);
    }

    // 4. Log Transaction
    await supabase.from('saas_payment_history').insert({
        user_id: userId,
        amount: payment.transaction_amount,
        status: payment.status,
        provider: 'mercadopago',
        provider_transaction_id: payment.id.toString(),
        created_at: new Date().toISOString()
    });

    // 5. Sync to Establishments (Optional but requested for redundancy)
    await supabase
        .from('establishments')
        .update({ 
            subscription_status: 'active',
            subscription_ends_at: newEndsAt.toISOString()
        })
        .eq('owner_id', userId);
        
    console.log(`Subscription updated for User ${userId}. New End Date: ${newEndsAt.toISOString()}`);
  }
}

module.exports = WebhookController;
