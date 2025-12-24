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
    // Initialize Supabase with Service Role Key (Bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      token, 
      payer_email, 
      establishment_id, 
      plan_id, 
      issuer_id, 
      payment_method_id, 
      identification,
      card_holder_name,
      installments,
      custom_amount,
      days_to_add,
      type, // 'upgrade', 'renewal', 'new'
      description,
      recurring
    } = await req.json()

    // 1. Strict Validation
    if (!plan_id) throw new Error('Missing plan_id');
    // Resolve establishment when not provided (logged-in user without shop yet)
    let resolvedEstablishmentId = establishment_id;
    if (!resolvedEstablishmentId && payer_email) {
        const { data: userRow } = await supabase
            .from('usuarios')
            .select('id, nome')
            .eq('email', payer_email)
            .maybeSingle();

        const userId = userRow?.id;
        if (userId) {
            const { data: estRow } = await supabase
                .from('establishments')
                .select('id')
                .eq('owner_id', userId)
                .maybeSingle();
            if (estRow?.id) {
                resolvedEstablishmentId = estRow.id;
            } else {
                // create minimal establishment to attach subscription later
                const slugBase = (userRow?.nome || 'shop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                const tempSlug = `${slugBase}-${String(userId).substring(0,6)}`;
                const { data: newEst, error: estCreateError } = await supabase
                    .from('establishments')
                    .insert({
                        owner_id: userId,
                        name: userRow?.nome ? `${userRow.nome}'s Shop` : 'Minha Barbearia',
                        slug: tempSlug,
                        open_hour: '09:00',
                        close_hour: '18:00',
                        work_days: [1,2,3,4,5,6],
                        primary_color: '#000000',
                        secondary_color: '#ffffff'
                    })
                    .select('id')
                    .single();
                if (!estCreateError && newEst?.id) {
                    resolvedEstablishmentId = newEst.id;
                }
            }
        }
    }
    if (!resolvedEstablishmentId) {
        throw new Error('Missing establishment_id');
    }

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
    // Prefer establishment-level credential
    const { data: estCreds } = await supabase
        .from('establishments')
        .select('mp_access_token')
        .eq('id', resolvedEstablishmentId)
        .maybeSingle();

    if (estCreds?.mp_access_token && estCreds.mp_access_token.length > 20) {
        mpAccessToken = estCreds.mp_access_token;
    } else {
        // Fallback to global setting
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
    }

    if (!mpAccessToken) {
        throw new Error('Server Config Error: Missing MP Access Token (establishment or global)');
    }

    // 4. Create Payment Body
    // USE CUSTOM AMOUNT IF PROVIDED (for Upgrades/Renewals)
    const transactionAmount = custom_amount ? Number(custom_amount) : Number(plan.price);
    
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
    }

    const paymentBody: any = {
        transaction_amount: transactionAmount,
        description: description || `Assinatura ${plan.name}`,
        payment_method_id: payment_method_id,
        payer: payer,
        installments: installments || 1, // Default to 1 if missing
        metadata: {
            type: type || 'saas_subscription', 
            establishment_id: resolvedEstablishmentId,
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

    let data: any = null;
    let response: Response | null = null;

    if (recurring && token && payment_method_id !== 'pix') {
        // Create Preapproval for recurring card payments
        const preapprovalBody = {
            back_url: `${supabaseUrl}/checkout/success`,
            reason: description || `Assinatura ${plan.name}`,
            external_reference: `${establishment_id}-${plan_id}`,
            payer_email: payer_email,
            card_token_id: token,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: transactionAmount,
                currency_id: 'BRL'
            }
        };

        console.log('Creating Preapproval via MP API:', JSON.stringify(preapprovalBody));

        response = await fetch('https://api.mercadopago.com/preapproval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mpAccessToken}`,
                'X-Idempotency-Key': crypto.randomUUID()
            },
            body: JSON.stringify(preapprovalBody)
        });
        data = await response.json();
    } else {
        console.log('Creating Payment via MP API:', JSON.stringify(paymentBody));
        response = await fetch('https://api.mercadopago.com/v1/payments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mpAccessToken}`,
                'X-Idempotency-Key': crypto.randomUUID()
            },
            body: JSON.stringify(paymentBody)
        });
        data = await response.json();
    }
    
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
        .eq('id', resolvedEstablishmentId)
        .single();

    if (estError) console.error('Error fetching establishment owner:', estError);

    const userId = establishment?.owner_id;
    let subStatus = 'pending';

    // NEW: Handle Immediate Approval (e.g. Credit Card) or Preapproval 'authorized'
    if (data.status === 'approved' || data.status === 'authorized' || data.status === 'active') {
        subStatus = 'active';
        
        console.log('Payment Approved Immediately. Updating Establishment...');

        // 1. Calculate Date
        // Use custom days if provided (e.g. for +3 months renewal), otherwise use plan default
        const daysToAddVal = days_to_add ? Number(days_to_add) : (plan.days_valid || 30);
        
        let newEndDate = new Date();
        const currentEndDate = establishment?.subscription_end_date ? new Date(establishment.subscription_end_date) : null;

        if (currentEndDate && currentEndDate > new Date()) {
             // Extend from current end date
             newEndDate = new Date(currentEndDate.getTime() + (daysToAddVal * 24 * 60 * 60 * 1000));
        } else {
             // Start from now
             newEndDate = new Date(new Date().getTime() + (daysToAddVal * 24 * 60 * 60 * 1000));
        }

        // 2. Update Establishment
        await supabase
            .from('establishments')
            .update({
                subscription_status: 'active',
                subscription_plan: plan.name,
                subscription_end_date: newEndDate.toISOString()
            })
            .eq('id', resolvedEstablishmentId);

        // 3. Log Payment or Preapproval
        await supabase.from('saas_payments').insert({
            establishment_id: resolvedEstablishmentId,
            amount: transactionAmount,
            status: 'paid',
            payment_method: payment_method_id,
            invoice_url: data.transaction_details?.external_resource_url || data.init_point || null 
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
            mp_payment_id: String(data.id),
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
