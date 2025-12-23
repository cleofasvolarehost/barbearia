import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'welcome_manual' | 'welcome_self';
  email: string;
  name: string;
  password?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const { type, email, name, password } = await req.json() as EmailRequest;

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Email and name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subject = "";
    let htmlContent = "";

    if (type === 'welcome_manual') {
      subject = "Bem-vindo à NextLevel - Suas Credenciais";
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7C3AED;">Bem-vindo à NextLevel! 🚀</h1>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Sua conta foi criada manualmente por nossa equipe. Aqui estão seus dados de acesso:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login:</strong> ${email}</p>
            ${password ? `<p style="margin: 5px 0;"><strong>Senha:</strong> ${password}</p>` : ''}
          </div>
          <p>Acesse sua barbearia agora mesmo:</p>
          <a href="https://www.crdev.app/login" style="background-color: #7C3AED; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Acessar Painel</a>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">Se você não solicitou este acesso, ignore este email.</p>
        </div>
      `;
    } else if (type === 'welcome_self') {
      subject = "Bem-vindo à NextLevel - Configure sua Barbearia";
      htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2DD4BF;">Bem-vindo à NextLevel! 🎉</h1>
          <p>Olá <strong>${name}</strong>,</p>
          <p>Sua conta foi criada com sucesso! Estamos muito felizes em ter você conosco.</p>
          <p>O próximo passo é configurar os detalhes da sua barbearia para começar a receber agendamentos.</p>
          <a href="https://www.crdev.app/admin/setup" style="background-color: #2DD4BF; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Configurar Barbearia</a>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">Se precisar de ajuda, entre em contato com nosso suporte.</p>
        </div>
      `;
    } else {
        return new Response(
            JSON.stringify({ error: "Invalid email type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Barber APP <nao-responder@crdev.app>", // Updated to verified domain
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
