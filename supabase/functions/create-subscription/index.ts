import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, payer_email, plan_type } = await req.json()

    // Map plan_type to frequency/amount
    let transaction_amount = 0;
    let frequency = 1;
    let frequency_type = 'months';
    let reason = 'Assinatura BarberPro';

    // Prices matching the UI
    switch(plan_type) {
        case 'monthly':
            transaction_amount = 97.00;
            frequency = 1;
            break;
        case 'quarterly':
            transaction_amount = 267.00; // 89 * 3
            frequency = 3;
            break;
        case 'annual':
            transaction_amount = 948.00; // 79 * 12
            frequency = 12;
            break;
        default:
            throw new Error('Invalid plan type');
    }

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
        throw new Error('Server Config Error: Missing MP Access Token');
    }

    // 1. Create Subscription (Preapproval)
    // Documentation: https://www.mercadopago.com.br/developers/en/reference/subscriptions/_preapproval/post
    
    const body = {
      payer_email: payer_email,
      back_url: 'https://www.crdev.app/admin/subscription',
      reason: reason,
      external_reference: plan_type,
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
