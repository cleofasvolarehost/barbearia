import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CreateBookingPayload = {
  date: string;
  time: string;
  barberId: string;
  serviceId: string;
  userId: string;
  price: number;
  clientName?: string;
  clientPhone?: string;
};

const normalizePhone = (phone?: string): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (!digits.startsWith('55') && digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
};

const formatDate = (date: string) => {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const payload = (await req.json()) as CreateBookingPayload;
    const { date, time, barberId, serviceId, userId, price, clientName, clientPhone } = payload;

    const normalizedPhone = normalizePhone(clientPhone);
    if (!normalizedPhone) {
      throw new Error('Telefone do cliente é obrigatório e deve ser válido.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error('Supabase environment not configured.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const { data: bookingResult, error: bookingError } = await supabase.rpc('create_booking', {
      p_data: date,
      p_horario: `${time}:00`,
      p_barbeiro_id: barberId,
      p_servico_id: serviceId,
      p_usuario_id: userId,
      p_preco: price,
      p_client_name: clientName ?? null,
      p_client_phone: normalizedPhone,
    });

    if (bookingError) throw bookingError;
    if (!bookingResult?.success) {
      throw new Error(bookingResult?.message || 'Erro ao agendar');
    }

    const bookingId = bookingResult.id as string;

    const { data: booking, error: bookingFetchError } = await supabase
      .from('agendamentos')
      .select(
        'id, data, horario, usuario_id, client_name, client_phone, establishment_id, barbeiros(nome), agendamentos_servicos(servicos(nome))'
      )
      .eq('id', bookingId)
      .single();

    if (bookingFetchError || !booking) {
      console.log(`[Booking-Success] ID: #${bookingId} | Shop: #unknown | Phone: ${normalizedPhone}`);
      return new Response(
        JSON.stringify({ success: true, id: bookingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const establishmentId = booking.establishment_id as string | null;

    console.log(`[Booking-Success] ID: #${bookingId} | Shop: #${establishmentId ?? 'unknown'} | Phone: ${normalizedPhone}`);

    if (!establishmentId) {
      return new Response(
        JSON.stringify({ success: true, id: bookingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('instance_id, api_token, api_url, is_active, templates, triggers')
      .eq('establishment_id', establishmentId)
      .maybeSingle();

    if (configError || !config || !config.is_active) {
      console.log(`[WhatsApp-Skip] Shop: #${establishmentId} | No API config`);
      return new Response(
        JSON.stringify({ success: true, id: bookingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (config.triggers && config.triggers.confirmation === false) {
      console.log(`[WhatsApp-Skip] Shop: #${establishmentId} | Confirmation trigger disabled`);
      return new Response(
        JSON.stringify({ success: true, id: bookingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUrl = config.api_url || Deno.env.get('WORDNET_API_URL') || 'https://myhs.app';
    const instanceId = config.instance_id;
    const apiToken = config.api_token;

    if (!instanceId || !apiToken) {
      console.log(`[WhatsApp-Skip] Shop: #${establishmentId} | Missing credentials`);
      return new Response(
        JSON.stringify({ success: true, id: bookingId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const barberName = booking.barbeiros?.nome ?? 'Barbeiro';
    const serviceName = booking.agendamentos_servicos?.[0]?.servicos?.nome ?? 'Serviço';
    const template = config.templates?.confirmation
      || 'Fala, {nome_cliente}! Agendamento confirmado. 🗓 Data: {data} 🕒 Horário: {hora} 💈 Barbeiro: {barbeiro} ✂️ Serviço: {servico}.';

    const messageBody = template
      .replace('{nome_cliente}', booking.client_name || 'Cliente')
      .replace('{data}', formatDate(booking.data))
      .replace('{hora}', booking.horario?.slice(0, 5) || time)
      .replace('{barbeiro}', barberName)
      .replace('{servico}', serviceName);

    try {
      const response = await fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          u: instanceId,
          p: apiToken,
          to: normalizedPhone,
          msg: messageBody,
        }),
      });

      const apiResult = await response.json();
      const success = response.ok && !apiResult.error;

      await supabase.rpc('log_whatsapp_attempt', {
        p_establishment_id: establishmentId,
        p_phone: normalizedPhone,
        p_type: 'confirmation',
        p_body: messageBody,
        p_status: success ? 'sent' : 'failed',
        p_response: apiResult,
      });

      if (!success) {
        const reason = apiResult?.error || response.statusText || 'Unknown';
        console.error(`[WhatsApp-Error] Shop: #${establishmentId} | Reason: "${reason}"`);
      }
    } catch (error: any) {
      console.error(`[WhatsApp-Error] Shop: #${establishmentId} | Reason: "${error.message}"`);
      await supabase.rpc('log_whatsapp_attempt', {
        p_establishment_id: establishmentId,
        p_phone: normalizedPhone,
        p_type: 'confirmation',
        p_body: messageBody,
        p_status: 'failed',
        p_response: { error: error.message },
      });
    }

    return new Response(
      JSON.stringify({ success: true, id: bookingId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Create Booking Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
