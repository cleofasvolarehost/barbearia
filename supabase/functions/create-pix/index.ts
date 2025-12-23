import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appointment_data, establishment_id } = await req.json()

    // 1. Init Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Fetch Establishment Credentials
    const { data: establishment, error: estError } = await supabaseAdmin
      .from('establishments')
      .select('mp_access_token')
      .eq('id', establishment_id)
      .single()

    if (estError || !establishment?.mp_access_token) {
      throw new Error('Establishment not configured for payments')
    }

    // 3. Create Pix Payment via Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${establishment.mp_access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify({
        transaction_amount: appointment_data.price,
        description: `Agendamento - ${appointment_data.service_name}`,
        payment_method_id: 'pix',
        payer: {
          email: appointment_data.client_email || 'cliente@barberpro.com', // Fallback if not provided
          first_name: appointment_data.client_name,
        },
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`, // We need to create this later
      })
    })

    const paymentData = await mpResponse.json()

    if (!mpResponse.ok) {
        console.error('MP Error:', paymentData)
        throw new Error('Failed to create payment at Mercado Pago')
    }

    const pointOfInteraction = paymentData.point_of_interaction?.transaction_data

    return new Response(
      JSON.stringify({
        qr_code: pointOfInteraction?.qr_code,
        qr_code_base64: pointOfInteraction?.qr_code_base64,
        payment_id: paymentData.id,
        status: paymentData.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
