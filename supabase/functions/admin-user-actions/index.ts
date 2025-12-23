import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify Requester is Super Admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized')
    
    // Check role in public.usuarios
    const { data: userData } = await supabaseAdmin
        .from('usuarios')
        .select('tipo')
        .eq('id', user.id)
        .single();
    
    if (userData?.tipo !== 'super_admin') {
        throw new Error('Forbidden: Only Super Admin can perform this action')
    }

    // Process Action
    const { action, userId, payload } = await req.json()
    let result;

    switch (action) {
        case 'delete':
            // Delete from Auth
            const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId)
            if (delError) throw delError
            
            // Optionally delete from public.usuarios if not cascaded
            await supabaseAdmin.from('usuarios').delete().eq('id', userId)
            
            result = { message: 'User deleted successfully' }
            break;

        case 'suspend':
            const banDuration = payload?.banned ? '876000h' : '0s'; // ~100 years or 0
            const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                ban_duration: banDuration
            })
            if (banError) throw banError
            result = { message: payload?.banned ? 'User suspended' : 'User activated' }
            break;

        case 'reset_password_email':
            const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(payload.email)
            if (resetError) throw resetError
            result = { message: 'Password reset email sent' }
            break;
        
        case 'update_password':
             const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
                 password: payload.password
             })
             if (pwdError) throw pwdError
             result = { message: 'Password updated' }
             break;

        case 'update_profile':
             const { error: profError } = await supabaseAdmin
                .from('usuarios')
                .update(payload.data)
                .eq('id', userId)
             if (profError) throw profError
             result = { message: 'Profile updated' }
             break;

        case 'create_user':
             const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                 email: payload.email,
                 password: payload.password,
                 email_confirm: true,
                 user_metadata: { full_name: payload.nome }
             })
             if (createError) throw createError
             
             if (newUser.user) {
                 const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
                     id: newUser.user.id,
                     email: payload.email,
                     nome: payload.nome,
                     tipo: payload.tipo,
                     telefone: payload.telefone,
                     establishment_id: payload.establishment_id
                 })
                 if (insertError) {
                     // Rollback auth user creation if public insert fails
                     await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
                     throw insertError
                 }
             }
             result = { user: newUser.user }
             break;

        default:
            throw new Error('Invalid action')
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
