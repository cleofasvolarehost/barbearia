
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
    // NOTE: We need to create a client with the anon key to verify the user's JWT properly 
    // because getUser() with service_role key will ALWAYS return the user if the token is valid, ignoring RLS.
    // However, for this admin function, we manually check the 'usuarios' table, so service_role is fine
    // BUT we must pass the user's JWT to context if we wanted RLS.
    // Here we just extract the user from the JWT to check their ID against the 'usuarios' table.
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    // ATENÇÃO: Se o cabeçalho já vier "Bearer ...", o replace remove. Se vier só o token, mantém.
    // Mas o mais seguro é pegar o user direto.
    const token = authHeader.replace('Bearer ', '')
    
    // IMPORTANTE: getUser(token) com o supabaseClient (que usa SERVICE_ROLE_KEY) não valida se o token é realmente válido/expirado da mesma forma que o Anon Client.
    // Mas aqui estamos confiando que o supabaseClient vai decodificar corretamente.
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
        console.error('Auth Error (getUser):', userError);
        throw new Error('Invalid Token or User not found: ' + (userError?.message || 'No user'))
    }

    console.log('Requester User ID:', user.id); // DEBUG

    // Check role in public.usuarios
    const { data: profile, error: profileError } = await supabaseClient
      .from('usuarios')
      .select('tipo')
      .eq('id', user.id)
      .maybeSingle() 

    // DEBUG: Log do perfil encontrado
    console.log('Profile Check Result:', { profile, error: profileError, userId: user.id });

    // SE O PERFIL NÃO EXISTE, VAMOS TENTAR CRIAR OU IGNORAR SE FOR O PRIMEIRO ACESSO (Opcional, mas aqui vamos ser estritos)
    // Se profile for null, significa que o usuário não tem registro na tabela 'usuarios', logo não é super_admin.
    
    if (profileError || !profile || profile.tipo !== 'super_admin') {
      console.error('Permission Denied. User Role:', profile?.tipo);
      
      // DEBUG EXTRA: Se for o admin-71499786 (admin original), vamos deixar passar SOMENTE PARA TESTE (Remover em produção se quiser estrito)
      // MAS CUIDADO: Isso é uma backdoor temporária se o banco estiver inconsistente.
      // Melhor não fazer isso. Vamos confiar no banco.
      
      return new Response(JSON.stringify({ 
        error: 'Unauthorized: Super Admin access required', 
        debug_role: profile?.tipo,
        debug_user_id: user.id,
        debug_error: profileError
      }), {
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
