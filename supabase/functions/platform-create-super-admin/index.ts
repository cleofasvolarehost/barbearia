import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing SUPABASE envs')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { email, password, name } = await req.json()
    if (!email || !name) throw new Error('Missing fields: email, name')

    // Bootstrap rule: if no platform_super_admin exists, allow creation without auth
    const { data: existingAdmins, error: countErr } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('platform_role', 'platform_super_admin')
      .limit(1)
    if (countErr) throw countErr

    if ((existingAdmins?.length || 0) > 0) {
      // Require an Authorization token and verify role
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) throw new Error('Missing Authorization header')
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (authError || !user) throw new Error('Unauthorized')
      const { data: requester } = await supabaseAdmin
        .from('usuarios')
        .select('platform_role,tipo')
        .eq('id', user.id)
        .single()
      const isPlatformAdmin = requester?.platform_role === 'platform_super_admin' || requester?.tipo === 'super_admin'
      if (!isPlatformAdmin) throw new Error('Forbidden')
    }

    // Create auth user
    const userPassword = password || crypto.randomUUID().slice(0, 12)
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: userPassword,
      email_confirm: true,
      user_metadata: { full_name: name, platform_role: 'platform_super_admin' }
    })
    if (createErr) throw createErr
    if (!created.user) throw new Error('Failed to create user')

    // Upsert to usuarios with platform_role and tipo
    const { error: upsertErr } = await supabaseAdmin
      .from('usuarios')
      .upsert({
        id: created.user.id,
        email,
        nome: name,
        tipo: 'super_admin',
        platform_role: 'platform_super_admin',
        created_at: new Date().toISOString(),
      })
    if (upsertErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      throw upsertErr
    }

    return new Response(JSON.stringify({ success: true, user: created.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

