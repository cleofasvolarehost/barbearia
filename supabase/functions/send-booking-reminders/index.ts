import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ReminderBooking = {
  booking_id: string;
  establishment_id: string;
  client_name: string | null;
  client_phone: string | null;
  data: string;
  horario: string;
  barber_name: string | null;
  service_name: string | null;
  usuario_id: string | null;
};

const normalizePhone = (phone?: string | null): string | null => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error('Supabase environment not configured.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: bookings, error: bookingsError } = await supabase.rpc('fetch_bookings_for_reminder', {
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    });

    if (bookingsError) throw bookingsError;

    let processed = 0;

    for (const booking of (bookings as ReminderBooking[]) || []) {
      const normalizedPhone = normalizePhone(booking.client_phone);
      if (!normalizedPhone) {
        console.log(`[Reminder-Skip] Booking: #${booking.booking_id} | Missing phone`);
        continue;
      }

      const { data: config, error: configError } = await supabase
        .from('whatsapp_config')
        .select('instance_id, api_token, api_url, is_active, templates, triggers')
        .eq('establishment_id', booking.establishment_id)
        .maybeSingle();

      if (configError || !config || !config.is_active) {
        console.log(`[Reminder-Skip] Shop: #${booking.establishment_id} | No API config`);
        continue;
      }

      if (config.triggers && config.triggers.reminder_1h === false) {
        console.log(`[Reminder-Skip] Shop: #${booking.establishment_id} | Auto-reminder disabled`);
        continue;
      }

      const apiUrl = config.api_url || Deno.env.get('WORDNET_API_URL') || 'https://myhs.app';
      const instanceId = config.instance_id;
      const apiToken = config.api_token;

      if (!instanceId || !apiToken) {
        console.log(`[Reminder-Skip] Shop: #${booking.establishment_id} | Missing credentials`);
        continue;
      }

      const template = config.templates?.reminder_1h
        || 'Olá {nome_cliente}, seu corte é daqui a 1 hora às {hora}!';

      const messageBody = template
        .replace('{nome_cliente}', booking.client_name || 'Cliente')
        .replace('{data}', formatDate(booking.data))
        .replace('{hora}', booking.horario?.slice(0, 5) || booking.horario)
        .replace('{barbeiro}', booking.barber_name || 'Barbeiro')
        .replace('{servico}', booking.service_name || 'Serviço');

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
          p_establishment_id: booking.establishment_id,
          p_phone: normalizedPhone,
          p_type: 'reminder_1h',
          p_body: messageBody,
          p_status: success ? 'sent' : 'failed',
          p_response: apiResult,
        });

        if (success) {
          await supabase
            .from('agendamentos')
            .update({ reminder_sent: true })
            .eq('id', booking.booking_id);

          processed += 1;
        } else {
          const reason = apiResult?.error || response.statusText || 'Unknown';
          console.error(`[WhatsApp-Error] Shop: #${booking.establishment_id} | Reason: "${reason}"`);
        }
      } catch (error: any) {
        console.error(`[WhatsApp-Error] Shop: #${booking.establishment_id} | Reason: "${error.message}"`);
        await supabase.rpc('log_whatsapp_attempt', {
          p_establishment_id: booking.establishment_id,
          p_phone: normalizedPhone,
          p_type: 'reminder_1h',
          p_body: messageBody,
          p_status: 'failed',
          p_response: { error: error.message },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Reminder Worker Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
