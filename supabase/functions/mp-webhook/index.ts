import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const url = new URL(req.url);
    // MP Webhook sends topic/id in query params for some events, or body for others.
    // Usually for "payment", it's ?topic=payment&id=123
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    console.log(`Webhook received: topic=${topic}, id=${id}`);

    // Some notifications come as body, but standard MP webhook for payments uses query params or body.
    // If query params are empty, try parsing body
    let bodyId = id;
    let bodyTopic = topic;
    
    if (!id && req.body) {
        try {
            const body = await req.json();
            bodyId = body.data?.id || body.id;
            bodyTopic = body.type || body.topic;
            console.log('Webhook Body:', body);
        } catch (e) {
            // ignore
        }
    }

    // Handle Preapproval (Subscriptions) Notifications
    if (bodyTopic === 'preapproval' || bodyTopic === 'subscription_preapproval') {
        if (!bodyId) return new Response('Missing Preapproval ID', { status: 400 });

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let mpAccessToken = '';
        const { data: saasSettings } = await supabase
            .from('saas_settings')
            .select('setting_value')
            .eq('setting_key', 'mp_access_token')
            .single();
        if (saasSettings?.setting_value) mpAccessToken = saasSettings.setting_value;
        else mpAccessToken = Deno.env.get('SAAS_MP_ACCESS_TOKEN') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
        if (!mpAccessToken) return new Response('Config Error', { status: 500 });

        const preRes = await fetch(`https://api.mercadopago.com/preapproval/${bodyId}`, {
            headers: { 'Authorization': `Bearer ${mpAccessToken}` }
        });
        if (!preRes.ok) return new Response('MP Preapproval Fetch Error', { status: 500 });
        const pre = await preRes.json();

        const externalReference: string | undefined = pre.external_reference;
        let establishment_id: string | undefined;
        let plan_id: string | undefined;
        if (externalReference && externalReference.includes('-')) {
            const parts = externalReference.split('-');
            establishment_id = parts[0];
            plan_id = parts[1];
        }

        // Update subscription status based on preapproval
        const status = pre.status; // authorized, paused, cancelled
        if (status === 'authorized' || status === 'active') {
            await supabase
                .from('subscriptions')
                .update({ status: 'active', updated_at: new Date().toISOString() })
                .eq('mp_payment_id', String(bodyId));

            if (establishment_id && plan_id) {
                const { data: plan } = await supabase
                    .from('saas_plans')
                    .select('*')
                    .eq('id', plan_id)
                    .single();
                const daysToAdd = plan?.days_valid || 30;
                const finalPlanName = plan?.name || 'Pro';
                const { data: establishment } = await supabase
                    .from('establishments')
                    .select('subscription_end_date')
                    .eq('id', establishment_id)
                    .single();
                let newEndDate = new Date();
                const currentEndDate = establishment?.subscription_end_date ? new Date(establishment.subscription_end_date) : null;
                if (currentEndDate && currentEndDate > new Date()) {
                    newEndDate = new Date(currentEndDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                } else {
                    newEndDate = new Date(new Date().getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                }
                await supabase
                    .from('establishments')
                    .update({ subscription_status: 'active', subscription_plan: finalPlanName, subscription_end_date: newEndDate.toISOString() })
                    .eq('id', establishment_id);
            }
        } else if (status === 'paused' || status === 'cancelled') {
            await supabase
                .from('subscriptions')
                .update({ status: 'failed', updated_at: new Date().toISOString() })
                .eq('mp_payment_id', String(bodyId));
        }

        return new Response('OK', { status: 200 });
    }

    if (bodyTopic !== 'payment' && bodyTopic !== 'payment.created' && bodyTopic !== 'payment.updated') {
        return new Response('Ignored', { status: 200 });
    }

    if (!bodyId) {
        return new Response('Missing ID', { status: 400 });
    }

    // Initialize Supabase with Service Role for Admin Actions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get MP Access Token
    let mpAccessToken = '';
    const { data: saasSettings } = await supabase
        .from('saas_settings')
        .select('setting_value')
        .eq('setting_key', 'mp_access_token')
        .single();
    
    if (saasSettings?.setting_value) {
        mpAccessToken = saasSettings.setting_value;
    } else {
        mpAccessToken = Deno.env.get('SAAS_MP_ACCESS_TOKEN') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    }

    if (!mpAccessToken) {
        console.error('Missing MP Access Token');
        return new Response('Config Error', { status: 500 });
    }

    // Fetch Payment Data from MP
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${bodyId}`, {
        headers: {
            'Authorization': `Bearer ${mpAccessToken}`
        }
    });

    if (!response.ok) {
        console.error('Failed to fetch payment', await response.text());
        return new Response('MP API Error', { status: 500 });
    }

    const payment = await response.json();
    console.log('Payment Status:', payment.status, 'ID:', payment.id);

    // Try using metadata first
    const type = payment.metadata?.type;
    const validTypes = ['saas_renewal', 'saas_subscription'];
    let establishment_id = payment.metadata?.establishment_id;
    let plan_id = payment.metadata?.plan_id;
    let plan_name = payment.metadata?.plan_name;

    // Fallback: use external_reference from payments created by subscriptions
    if ((!establishment_id || !plan_id) && payment.external_reference) {
        const ref = String(payment.external_reference);
        if (ref.includes('-')) {
            const parts = ref.split('-');
            establishment_id = parts[0];
            plan_id = parts[1];
        }
    }

    if ((validTypes.includes(type)) || (establishment_id && plan_id)) {
        console.log(`Processing payment for Establishment: ${establishment_id}`);

        if (payment.status === 'approved') {
            // 0. Idempotency Check
            // Check if this payment was already processed (subscription status is already active)
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('mp_payment_id', String(bodyId))
                .single();

            if (existingSub?.status === 'active') {
                console.log('Payment already processed (Subscription is active). Skipping.');
                return new Response('Already Processed', { status: 200 });
            }

            // 1. Get Plan Details (for duration)
            const { data: plan } = await supabase
                .from('saas_plans')
                .select('*')
                .eq('id', plan_id)
                .single();
            
            const daysToAdd = plan?.days_valid || 30;
            const finalPlanName = plan_name || plan?.name || 'Pro';

            // 2. Calculate New End Date
            // Get current establishment subscription info
            const { data: establishment } = await supabase
                .from('establishments')
                .select('subscription_end_date')
                .eq('id', establishment_id)
                .single();

            let newEndDate = new Date();
            const currentEndDate = establishment?.subscription_end_date ? new Date(establishment.subscription_end_date) : null;

            if (currentEndDate && currentEndDate > new Date()) {
                // Extend from current end date
                newEndDate = new Date(currentEndDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
            } else {
                // Extend from now
                newEndDate = new Date(new Date().getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
            }

            // 3. Update Establishment
            await supabase
                .from('establishments')
                .update({
                    subscription_status: 'active',
                    subscription_plan: finalPlanName,
                    subscription_end_date: newEndDate.toISOString()
                })
                .eq('id', establishment_id);

            // 4. Update Subscriptions Table (Status -> Active)
            // Use mp_payment_id to find the record
            const { error: subUpdateError } = await supabase
                .from('subscriptions')
                .update({ 
                    status: 'active', 
                    updated_at: new Date().toISOString() 
                })
                .eq('mp_payment_id', String(bodyId));

            if (subUpdateError) console.error('Subscription Update Error:', subUpdateError);

            // 5. Insert into saas_payments (History)
            // Check if already exists to avoid dupes (idempotency)
            const { data: existingPayment } = await supabase
                .from('saas_payments')
                .select('id')
                .eq('id', payment.id) // Assuming we might use MP ID as ID? No, saas_payments has uuid id.
                // We don't have a unique constraint on mp_id in saas_payments?
                // Let's check establishment_id + created_at similarity or just insert.
                // Better: Add a column `mp_payment_id` to `saas_payments` later.
                // For now, just insert.
                .limit(1);

            await supabase.from('saas_payments').insert({
                establishment_id,
                amount: payment.transaction_amount,
                status: 'paid', // our internal status
                payment_method: payment.payment_method_id,
                invoice_url: payment.transaction_details?.external_resource_url 
            });

            console.log('Subscription Activated/Extended successfully');

        } else if (payment.status === 'cancelled' || payment.status === 'rejected') {
            // Update Subscription to Failed
             await supabase
                .from('subscriptions')
                .update({ 
                    status: 'failed', 
                    updated_at: new Date().toISOString() 
                })
                .eq('mp_payment_id', String(bodyId));
            
            console.log('Subscription Payment Failed/Cancelled');
        }
    }

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
