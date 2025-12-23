import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://vkobtnufnijptgvvxrhq.supabase.co";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RESEND_API_KEY) {
        console.error("Missing RESEND_API_KEY");
        throw new Error("Server Configuration Error: Missing Resend Key");
    }
    
    // DEBUG: Log key suffix
    const keySuffix = RESEND_API_KEY.slice(-4);
    console.log(`Using Resend Key ending in: ...${keySuffix}`);

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
        throw new Error("Server Configuration Error: Missing Service Role Key");
    }

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting password reset flow for: ${email}`);

    // 3. Initialize Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 4. Generate Link (Supabase Auth)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://www.crdev.app/reset-password' // Updated to production URL
      }
    });

    if (linkError) {
        console.error("Generate Link Error:", linkError);
        // If user not found, we should probably hide it for security, but for debugging we show
        if (linkError.message.includes("User not found")) {
            throw new Error("Usuário não encontrado. Verifique o email ou cadastre-se.");
        }
        throw new Error(`Auth Error: ${linkError.message}`);
    }

    const recoveryLink = linkData.properties?.action_link;
    if (!recoveryLink) throw new Error("Failed to generate recovery link");

    console.log("Recovery Link Generated. Sending via Resend...");

    // 5. Send Email via Resend
    // NOTE: 'onboarding@resend.dev' ONLY works if sending TO the verified account email in Resend Sandbox.
    // Once you verify a domain (e.g., mail.barbearia.com), change 'from' to 'noreply@mail.barbearia.com'.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Barber APP <nao-responder@crdev.app>", 
        to: [email],
        subject: "Recuperação de Senha - Barber APP",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
            <h1 style="color: #7C3AED; text-align: center;">Recuperar Senha</h1>
            <p style="text-align: center; color: #333;">Você solicitou a redefinição de sua senha.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${recoveryLink}" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Minha Senha</a>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">Ou copie este link: ${recoveryLink}</p>
            <p style="text-align: center; color: #999; font-size: 12px;">Se não foi você, ignore este email.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        console.error("Resend API Error:", errorData);
        // Check for Sandbox error
        if (errorData.message?.includes("sandbox")) {
            throw new Error("Resend Sandbox Error: Você só pode enviar para o email da sua conta Resend. Verifique o domínio.");
        }
        throw new Error(`Resend Error: ${errorData.message}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Function Handler Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, // Return 400 so frontend knows it failed logic, not just network
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
