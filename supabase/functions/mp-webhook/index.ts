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
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    console.log(`Webhook received: topic=${topic}, id=${id}`);

    if (topic !== 'payment') {
        return new Response('Ignored', { status: 200 });
    }

    if (!id) {
        return new Response('Missing ID', { status: 400 });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
            'Authorization': `Bearer ${mpAccessToken}`
        }
    });

    if (!response.ok) {
        console.error('Failed to fetch payment', await response.text());
        return new Response('MP API Error', { status: 500 });
    }

    const payment = await response.json();
    console.log('Payment Status:', payment.status);

    if (payment.status === 'approved' && payment.metadata && payment.metadata.type === 'saas_renewal') {
        const { establishment_id, plan_id, plan_duration_days } = payment.metadata;
        
        console.log(`Processing Renewal for Establishment: ${establishment_id}, Days: ${plan_duration_days}`);

        // Get current establishment subscription info
        const { data: establishment, error: fetchError } = await supabase
            .from('establishments')
            .select('subscription_end_date')
            .eq('id', establishment_id)
            .single();

        if (fetchError) {
             console.error('Establishment fetch error:', fetchError);
             return new Response('DB Error', { status: 500 });
        }

        let newEndDate = new Date();
        const currentEndDate = establishment?.subscription_end_date ? new Date(establishment.subscription_end_date) : null;

        if (currentEndDate && currentEndDate > new Date()) {
            // Extend from current end date
            newEndDate = new Date(currentEndDate.getTime() + (plan_duration_days * 24 * 60 * 60 * 1000));
        } else {
            // Extend from now
            newEndDate = new Date(new Date().getTime() + (plan_duration_days * 24 * 60 * 60 * 1000));
        }

        // Fetch Plan Name
        const { data: plan } = await supabase.from('saas_plans').select('name').eq('id', plan_id).single();
        const planName = plan?.name || 'Pro';

        // Update Establishment
        const { error: updateError } = await supabase
            .from('establishments')
            .update({
                subscription_status: 'active',
                subscription_plan: planName,
                subscription_end_date: newEndDate.toISOString()
            })
            .eq('id', establishment_id);

        if (updateError) {
            console.error('Update Error:', updateError);
            return new Response('Update Failed', { status: 500 });
        }

        console.log('Subscription extended successfully');
    }

    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
})
