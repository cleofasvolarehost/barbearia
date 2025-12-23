import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify User
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized')

    // 2. Get Request Body
    const { action, establishment_id } = await req.json()

    // 3. Verify Ownership
    const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('*')
        .eq('id', establishment_id)
        .eq('owner_id', user.id)
        .single();

    if (estError || !establishment) {
        throw new Error('Establishment not found or unauthorized');
    }

    let result = {};

    if (action === 'cancel') {
        // Update status to cancelled
        // This stops auto-renewal logic (if implemented) and indicates user intent
        // The user retains access until subscription_end_date
        const { error: updateError } = await supabase
            .from('establishments')
            .update({ 
                subscription_status: 'cancelled',
                // We keep subscription_end_date as is
            })
            .eq('id', establishment_id);

        if (updateError) throw updateError;
        
        result = { 
            success: true, 
            message: 'Assinatura cancelada com sucesso.',
            new_status: 'cancelled'
        };
    } else {
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
