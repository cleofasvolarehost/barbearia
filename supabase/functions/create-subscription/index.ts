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
      card_holder_name,
      installments
    } = await req.json()

    // 1. Strict Validation
    if (!plan_id) throw new Error('Missing plan_id');
    if (!establishment_id) throw new Error('Missing establishment_id');

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

    // 4. Create Payment Body
    const transactionAmount = Number(plan.price);
    
    // Construct payer object
    const payer: any = {
        email: payer_email,
    };

    // Add identification if present (required for Pix)
    if (identification) {
        payer.identification = identification;
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

    const paymentBody: any = {
        transaction_amount: transactionAmount,
        description: `Assinatura ${plan.name}`,
        payment_method_id: payment_method_id,
        payer: payer,
        installments: installments || 1, // Default to 1 if missing
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
    // We need to fetch the user_id from the establishment owner
    const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('owner_id, subscription_end_date')
        .eq('id', establishment_id)
        .single();

    if (estError) console.error('Error fetching establishment owner:', estError);

    const userId = establishment?.owner_id;
    let subStatus = 'pending';

    // NEW: Handle Immediate Approval (e.g. Credit Card)
    if (data.status === 'approved') {
        subStatus = 'active';
        
        console.log('Payment Approved Immediately. Updating Establishment...');

        // 1. Calculate Date
        const daysToAdd = plan.days_valid || 30;
        let newEndDate = new Date();
        const currentEndDate = establishment?.subscription_end_date ? new Date(establishment.subscription_end_date) : null;

        if (currentEndDate && currentEndDate > new Date()) {
             newEndDate = new Date(currentEndDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        } else {
             newEndDate = new Date(new Date().getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
        }

        // 2. Update Establishment
        await supabase
            .from('establishments')
            .update({
                subscription_status: 'active',
                subscription_plan: plan.name,
                subscription_end_date: newEndDate.toISOString()
            })
            .eq('id', establishment_id);

        // 3. Log Payment
         await supabase.from('saas_payments').insert({
            establishment_id,
            amount: transactionAmount,
            status: 'paid',
            payment_method: payment_method_id,
            invoice_url: data.transaction_details?.external_resource_url 
        });
    }

    // Check if subscription already exists (maybe update it?) or insert new.
    // Ideally we might want to upsert or check for pending ones. 
    // For now, let's insert a new one to track this payment attempt.
    // Or, if we want to follow the requirements: "Inserir subscriptions com status pending"

    const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
            user_id: userId, // Can be null if not found, but schema says NOT NULL?
            plan_id: plan_id,
            status: subStatus,
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
    if (payment_method_id === 'pix') {
        if (!pointOfInteraction || !pointOfInteraction.qr_code || !pointOfInteraction.qr_code_base64) {
            console.error('CRITICAL: Mercado Pago did not return PIX data.', JSON.stringify(data));
            throw new Error('Erro ao gerar QR Code PIX: Dados incompletos do Mercado Pago.');
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
            subscription_id: subData?.id,
            raw_mp_data: data // Send raw data for debugging frontend if needed
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
