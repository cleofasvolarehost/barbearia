import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password?: string;
  name: string;
  establishment_id: string;
  tipo: 'barber' | 'manager' | 'receptionist';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Environment Variables: SUPABASE_URL or SERVICE_ROLE_KEY');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify Request Authorization (Must be authenticated)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestUser }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !requestUser) {
        throw new Error('Unauthorized: ' + (userError?.message || 'No user'))
    }

    // Optional: Verify if requestUser is Owner/Admin of the establishment
    // For now we assume the RLS or UI handles this, but ideally we check here too.

    const { email, password, name, establishment_id, tipo } = await req.json() as CreateUserRequest;

    if (!email || !name || !establishment_id) {
        throw new Error('Missing required fields: email, name, establishment_id');
    }

    // 2. Create Auth User (Auto-confirmed)
    // If password is provided, use it. If not, generate one or leave it to be set later (but we usually need one).
    const userPassword = password || Math.random().toString(36).slice(-8);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: userPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
            nome: name,
            tipo: tipo || 'barber',
            establishment_id: establishment_id
        }
    });

    if (createError) throw createError;
    if (!userData.user) throw new Error('Failed to create user object');

    const newUserId = userData.user.id;

    // 3. Create Public Profile (usuarios)
    // We use upsert to ensure it exists
    const { error: profileError } = await supabaseAdmin
        .from('usuarios')
        .upsert({
            id: newUserId,
            email: email,
            nome: name,
            tipo: tipo || 'barber',
            created_at: new Date().toISOString()
        });

    if (profileError) throw profileError;

    // 4. Create Barber Profile (barbeiros)
    const { error: barberError } = await supabaseAdmin
        .from('barbeiros')
        .insert({
            user_id: newUserId,
            establishment_id: establishment_id,
            nome: name,
            ativo: true,
            // Default config if needed, but DB defaults handle it
        });

    if (barberError) throw barberError;

    // 5. Send Welcome Email (Optional - Fire and forget or await)
    // We will use Resend directly here to avoid another function call overhead
    if (resendApiKey) {
        try {
            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${resendApiKey}`,
                },
                body: JSON.stringify({
                    from: "Barber APP <nao-responder@crdev.app>",
                    to: [email],
                    subject: "Bem-vindo à Equipe - Suas Credenciais",
                    html: `
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #7C3AED;">Bem-vindo! 🚀</h1>
                        <p>Olá <strong>${name}</strong>,</p>
                        <p>Sua conta foi criada. Aqui estão seus dados de acesso:</p>
                        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <p style="margin: 5px 0;"><strong>Login:</strong> ${email}</p>
                          <p style="margin: 5px 0;"><strong>Senha:</strong> ${userPassword}</p>
                        </div>
                        <p>Acesse o sistema:</p>
                        <a href="https://www.crdev.app/login" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Acessar Painel</a>
                      </div>
                    `
                }),
            });
        } catch (emailErr) {
            console.error('Error sending welcome email:', emailErr);
            // Don't fail the request if email fails, but log it
        }
    }

    return new Response(
      JSON.stringify({ 
          success: true, 
          user: userData.user,
          message: 'User created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Create User Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
