import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const { token, payer_email, plan_id, plan_type } = await req.json()
    const targetPlanId = plan_id || plan_type; // Support both for backward compatibility or transition

    if (!targetPlanId) {
        throw new Error('Missing plan_id');
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch Plan from DB
    const { data: plan, error: planError } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('id', targetPlanId)
        .single();

    if (planError || !plan) {
        throw new Error('Invalid plan or plan not found');
    }

    // Calculate Frequency
    let frequency = 1;
    let frequency_type = 'months';

    if (plan.interval_days % 30 === 0) {
        frequency = plan.interval_days / 30;
        frequency_type = 'months';
    } else {
        frequency = plan.interval_days;
        frequency_type = 'days';
    }

    const transaction_amount = Number(plan.price);
    const reason = `Assinatura ${plan.name}`;

    // 1. Try to fetch credentials from SaaS Settings (Dynamic)
    let mpAccessToken = '';
    
    const { data: saasSettings } = await supabase
        .from('saas_settings')
        .select('setting_value')
        .eq('setting_key', 'mp_access_token')
        .single();
    
    if (saasSettings?.setting_value) {
        mpAccessToken = saasSettings.setting_value;
    } else {
        // 2. Fallback to Environment Variables
        mpAccessToken = Deno.env.get('SAAS_MP_ACCESS_TOKEN') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    }

    if (!mpAccessToken) {
        throw new Error('Server Config Error: Missing MP Access Token (SaaS)');
    }

    // 1. Create Subscription (Preapproval)
    // Documentation: https://www.mercadopago.com.br/developers/en/reference/subscriptions/_preapproval/post
    
    const body = {
      payer_email: payer_email,
      back_url: 'https://www.crdev.app/admin/subscription',
      reason: reason,
      external_reference: targetPlanId,
      auto_recurring: {
        frequency: frequency,
        frequency_type: frequency_type,
        transaction_amount: transaction_amount,
        currency_id: 'BRL'
      },
      card_token_id: token,
      status: 'authorized'
    };

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('MP Error:', data);
        throw new Error(data.message || 'Failed to create subscription at Mercado Pago');
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
