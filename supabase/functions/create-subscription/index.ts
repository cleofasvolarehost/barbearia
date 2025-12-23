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
    const { token, payer_email, establishment_id, plan_id, issuer_id, payment_method_id, identification } = await req.json()

    if (!plan_id) throw new Error('Missing plan_id');
    if (!establishment_id) throw new Error('Missing establishment_id');

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch Plan
    const { data: plan, error: planError } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

    if (planError || !plan) throw new Error('Plan not found');

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

    if (!mpAccessToken) throw new Error('Server Config Error: Missing MP Access Token');

    // Create Payment (Standard for all methods: Credit Card, Pix, Boleto)
    const paymentBody = {
        transaction_amount: Number(plan.price),
        token: token, // Optional (only for cards)
        description: `Assinatura ${plan.name} (${plan.interval_days} dias)`,
        payment_method_id: payment_method_id,
        issuer_id: issuer_id,
        payer: {
            email: payer_email,
            identification: identification
        },
        metadata: {
            type: 'saas_renewal',
            establishment_id: establishment_id,
            plan_id: plan_id,
            plan_duration_days: plan.interval_days
        },
        notification_url: 'https://vkobtnufnijptgvvxrhq.supabase.co/functions/v1/mp-webhook'
    };

    console.log('Creating Payment:', JSON.stringify(paymentBody));

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpAccessToken}`,
            'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(paymentBody)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('MP Error:', data);
        throw new Error(data.message || 'Failed to create payment');
    }

    return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Function Error:', error);
    return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
