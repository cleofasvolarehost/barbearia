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
    const {
      token,
      payer_email,
      establishment_id,
      plan_id,
      issuer_id,
      payment_method_id,
      identification,
      card_holder_name
    } = await req.json()

    // 1. Strict Validation
    if (!plan_id) throw new Error('Missing plan_id');
    if (!establishment_id) throw new Error('Missing establishment_id');
    if (!payer_email) throw new Error('Missing payer_email');

    // Initialize Supabase with Service Role Key (Bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Fetching Plan:', plan_id);

    // 2. Fetch Plan from Database (Single Source of Truth)
    const { data: plan, error: planError } = await supabase
        .from('saas_plans') 
        .select('*')
        .eq('id', plan_id)
        .single();

    if (planError || !plan) {
        console.error('Plan Fetch Error (DB):', planError);
        throw new Error(`Plan not found: ${plan_id}`);
    }

    console.log('Plan Found:', plan.name, 'Price:', plan.price);

    // 3. Get MP Access Token (Securely)
    let mpAccessToken = '';
    const { data: saasSettings } = await supabase
        .from('saas_settings')
        .select('setting_value')
        .eq('setting_key', 'mp_access_token')
        .single();
    
    if (saasSettings?.setting_value && saasSettings.setting_value.length > 20) {
        mpAccessToken = saasSettings.setting_value;
    } else {
        mpAccessToken = Deno.env.get('SAAS_MP_ACCESS_TOKEN') || Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    }

    if (!mpAccessToken) {
        throw new Error('Server Config Error: Missing MP Access Token');
    }
    if (mpAccessToken.toLowerCase().includes('public')) {
        throw new Error('Server Config Error: MP access token appears to be a public key');
    }

    // 4. Create Payment Body
    const transactionAmount = Number(plan.price);
    if (!Number.isFinite(transactionAmount)) {
        throw new Error('Invalid transaction amount');
    }
    
    // Construct payer object
    const payer: any = {
        email: payer_email,
    };

    // Add identification if present (required for Pix)
    if (identification) {
        payer.identification = {
            ...identification,
            number: identification.number ? String(identification.number).replace(/\D/g, '') : undefined
        };
    }

    // Add name if present (from card holder or split from email/other source if needed)
    if (card_holder_name) {
         // Mercado Pago expects first_name and last_name
         const names = card_holder_name.split(' ');
         payer.first_name = names[0];
         payer.last_name = names.slice(1).join(' ');
    } else {
        // Fallback or use dummy for Pix if name not strictly required by MP but recommended
        // For Pix, often email is enough, but identification (CPF) is key.
        // Brick usually provides identification.
    }

    const resolvedPaymentMethodId = payment_method_id || 'pix';

    const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('owner_id')
        .eq('id', establishment_id)
        .single();

    if (estError) console.error('Error fetching establishment owner:', estError);

    const userId = establishment?.owner_id;
    const externalReference = userId ? `${userId}:${plan_id}` : `${establishment_id}:${plan_id}`;

    const paymentBody: any = {
        transaction_amount: transactionAmount,
        description: `Assinatura - ${plan.name}`,
        payment_method_id: resolvedPaymentMethodId,
        external_reference: externalReference,
        payer: payer,
        metadata: {
            type: 'saas_subscription', // Updated from 'saas_renewal' to be more generic or specific
            establishment_id: establishment_id,
            plan_id: plan_id,
            plan_name: plan.name
        },
        notification_url: `${supabaseUrl}/functions/v1/mp-webhook`
    };

    // If Card (has token)
    if (token) {
        paymentBody.token = token;
        paymentBody.issuer_id = issuer_id;
    }

    console.log('Creating Payment via MP API:', JSON.stringify(paymentBody));

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
    
    // LOG MP RESPONSE
    console.log('MP Response Status:', response.status);
    console.log('MP Response Data:', JSON.stringify(data));

    if (!response.ok) {
        console.error('MP Error:', data);
        throw new Error(data.message || 'Failed to create payment');
    }

    // 5. Insert into Subscriptions Table

    // Check if subscription already exists (maybe update it?) or insert new.
    // Ideally we might want to upsert or check for pending ones. 
    // For now, let's insert a new one to track this payment attempt.
    // Or, if we want to follow the requirements: "Inserir subscriptions com status pending"

    const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
            user_id: userId, // Can be null if not found, but schema says NOT NULL?
            plan_id: plan_id,
            status: 'pending',
            mp_payment_id: data.id.toString(),
            // mp_subscription_id? This is a one-off payment for subscription or recurring?
            // The user says "subscriptions no SaaS". Usually implies recurring. 
            // But MP "payments" API is for single payments. 
            // If they want recurring, they should use /preapproval. 
            // BUT the user specifically asked for "/v1/payments" (single payment) and "QR Code".
            // So this is likely a manual monthly payment via Pix.
        })
        .select()
        .single();

    if (subError) {
        console.error('Subscription Insert Error:', subError);
        // Continue anyway to return the QR code, but log critical error
    }

    // 6. Return Response
    const pointOfInteraction = data.point_of_interaction?.transaction_data;
    
    // STRICT CHECK FOR PIX
    if (resolvedPaymentMethodId === 'pix') {
        if (!pointOfInteraction || !pointOfInteraction.qr_code || !pointOfInteraction.qr_code_base64) {
            console.error('CRITICAL: Mercado Pago did not return PIX data.', JSON.stringify(data));
            return new Response(
                JSON.stringify({
                    error: 'PIX created but QR data missing',
                    mp_response: data,
                    sent_payload: paymentBody
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }
    }
    
    console.log('Returning Response. QR Code present?', !!pointOfInteraction?.qr_code);

    return new Response(
        JSON.stringify({
            payment_id: data.id,
            status: data.status,
            qr_code: pointOfInteraction?.qr_code,
            qr_code_base64: pointOfInteraction?.qr_code_base64,
            ticket_url: pointOfInteraction?.ticket_url,
            expires_at: data.date_of_expiration
        }),
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
