
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Environment Setup & Validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    // Tenta pegar a chave do sistema ou a chave manual que acabamos de setar
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Environment Variables: SUPABASE_URL or SERVICE_ROLE_KEY');
      throw new Error('Server Configuration Error');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Verify Authorization (Super Admin Only)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
        console.error('Auth Error:', userError);
        throw new Error('Invalid Token')
    }

    // Check role in public.usuarios
    const { data: profile, error: profileError } = await supabaseClient
      .from('usuarios')
      .select('tipo')
      .eq('id', user.id)
      .single()

    // DEBUG: Log do perfil encontrado
    console.log('Profile Check:', { profile, error: profileError, userId: user.id });

    if (profileError || profile?.tipo !== 'super_admin') {
      console.error('Permission Denied. User Role:', profile?.tipo);
      return new Response(JSON.stringify({ error: 'Unauthorized: Super Admin access required', debug_role: profile?.tipo }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Perform Password Reset
    const body = await req.json()
    const { userId, newPassword } = body
    
    if (!userId || !newPassword) {
        throw new Error('Missing userId or newPassword in request body')
    }

    console.log(`Attempting password reset for User ID: ${userId} by Admin: ${user.email}`);

    const { data, error } = await supabaseClient.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
        console.error('Update User Error:', error);
        throw error
    }

    console.log('Password updated successfully');

    return new Response(
      JSON.stringify({ message: 'Password updated successfully', user: data.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Function Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
