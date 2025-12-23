import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
        token, 
        issuer_id, 
        payment_method_id, 
        card_holder_name, 
        identification, 
        payer_email, 
        plan_id, 
        user_data, // { name, email, phone, password } (If new user)
        type 
    } = await req.json();

    let userId = null;
    let tempPassword = null;

    // 1. ATOMIC STEP: Create User if user_data is provided (New User)
    if (user_data) {
        // Check if user already exists
        const { data: existingUser } = await supabaseClient
            .from('usuarios') // or check auth.users via admin api
            .select('id')
            .eq('email', user_data.email)
            .maybeSingle();

        if (existingUser) {
            // User exists, maybe just proceed with that ID or throw error
            // For fast track, we might want to attach subscription to existing email
            userId = existingUser.id;
        } else {
            // Create Auth User
            const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
                email: user_data.email,
                password: user_data.password,
                email_confirm: true,
                user_metadata: {
                    name: user_data.name,
                    phone: user_data.phone
                }
            });

            if (authError) throw authError;
            userId = authData.user.id;
            tempPassword = user_data.password; // Return this so frontend can auto-login or inform user

            // Create Profile Record (Trigger might handle this, but ensuring safely)
             // The trigger 'handle_new_user' usually creates the public.usuarios record.
             // We can update it with specific details if needed.
        }
    } else {
        // Logged in user calling
        const authHeader = req.headers.get('Authorization')!;
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
        
        if (userError || !user) throw new Error('User not identified');
        userId = user.id;
    }

    // 2. ATOMIC STEP: Get Plan Details
    const { data: plan, error: planError } = await supabaseClient
        .from('saas_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

    if (planError || !plan) throw new Error('Plan not found');

    // 3. ATOMIC STEP: Process Payment (Mercado Pago)
    // We can reuse the existing create-subscription logic or call MP directly here
    // For DRY, let's call the create-subscription logic internally or replicate it.
    // Replicating essential parts for speed and control.

    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mpAccessToken) throw new Error('MP Config missing');

    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mpAccessToken}`,
            'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
            transaction_amount: Number(plan.price),
            token,
            description: `Assinatura ${plan.name} (Fast Track)`,
            installments: 1,
            payment_method_id,
            issuer_id,
            payer: {
                email: payer_email,
                identification
            },
            metadata: {
                user_id: userId,
                plan_id: plan.id,
                type: 'new_subscription'
            }
        })
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
        // 4. FALLBACK: Save Lead if payment fails (and user was created)
        // If user was created just now, they exist but have no active sub.
        // We can tag them in a 'leads' table or just leave them as inactive user.
        console.error('Payment Failed', paymentData);
        throw new Error('Payment rejected by Mercado Pago');
    }

    if (paymentData.status === 'approved') {
        // 5. SUCCESS: Create Subscription Record
        // Calculate dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.interval_days);

        // Update/Create Establishment Subscription
        // First find establishment for user
        const { data: establishment } = await supabaseClient
            .from('establishments')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle();

        let establishmentId = establishment?.id;

        if (!establishmentId) {
             // Create Establishment if not exists (First time setup)
             const { data: newEst, error: estError } = await supabaseClient
                .from('establishments')
                .insert({
                    owner_id: userId,
                    name: user_data?.name ? `${user_data.name}'s Shop` : 'Minha Barbearia', // Temp name
                    slug: `shop-${userId.substring(0,6)}`, // Temp slug
                    subscription_status: 'active',
                    subscription_plan: plan.name,
                    subscription_end_date: endDate.toISOString(),
                    open_hour: '09:00',
                    close_hour: '18:00',
                    work_days: [1,2,3,4,5,6],
                    primary_color: '#000000',
                    secondary_color: '#ffffff'
                })
                .select('id')
                .single();
            
            if (estError) throw estError;
            establishmentId = newEst.id;
        } else {
            // Update existing
             await supabaseClient
                .from('establishments')
                .update({
                    subscription_status: 'active',
                    subscription_plan: plan.name,
                    subscription_end_date: endDate.toISOString()
                })
                .eq('id', establishmentId);
        }

        // Record Transaction
        await supabaseClient.from('saas_payments').insert({
            establishment_id: establishmentId,
            amount: plan.price,
            status: 'paid',
            mp_payment_id: paymentData.id.toString(),
            plan_id: plan.id
        });

        // 6. TRIGGER WELCOME (Optional - e.g. Send Email/WhatsApp)
        // await sendWelcomeMessage(payer_email);

        return new Response(
            JSON.stringify({ 
                success: true, 
                userId, 
                temp_password: tempPassword,
                status: 'approved' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } else {
        throw new Error(`Payment status: ${paymentData.status}`);
    }

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
