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
    const { establishment_id, phone, message_type, message_body, test_mode } = await req.json()

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Fetch WhatsApp Config
    const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('establishment_id', establishment_id)
        .single();

    if (configError || !config) {
        throw new Error('WhatsApp Config not found');
    }

    // 2. Resolve Credentials
    const instanceId = config.instance_id || Deno.env.get('WORDNET_INSTANCE_ID');
    const apiToken = config.api_token || Deno.env.get('WORDNET_API_TOKEN');
    const apiUrl = Deno.env.get('WORDNET_API_URL') || 'https://myhs.app';

    if (!instanceId || !apiToken) {
        throw new Error('Missing WhatsApp Credentials');
    }

    // 3. Prepare Message
    // If it's a test, we assume phone is raw. If it's real, we might need DDI logic (handled in frontend usually)
    // Basic sanitization
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.length <= 11 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;

    console.log(`Sending WhatsApp to ${finalPhone} (${message_type})...`);

    // 4. Send via Wordnet API
    const response = await fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            u: instanceId,
            p: apiToken,
            to: finalPhone,
            msg: message_body,
        }),
    });

    const apiResult = await response.json();
    const success = response.ok && !apiResult.error;

    // 5. Log to Database
    await supabase.rpc('log_whatsapp_attempt', {
        p_establishment_id: establishment_id,
        p_phone: finalPhone,
        p_type: message_type || 'manual',
        p_body: message_body,
        p_status: success ? 'sent' : 'failed',
        p_response: apiResult
    });

    return new Response(
        JSON.stringify({ success, api_response: apiResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('WhatsApp Function Error:', error);
    return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
