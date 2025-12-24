import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function getBody(req: Request): Promise<Record<string, any>> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function authHeader(token: string) {
  return 'Basic ' + btoa(`${token}:`);
}

async function createTrigger(token: string, event: string, url: string) {
  const res = await fetch('https://api.iugu.com/v1/web_hooks', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(token)
    },
    body: JSON.stringify({ event, url })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`);
  return json;
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const iuguToken = Deno.env.get('IUGU_API_TOKEN')!;
  const supabase = createClient(url, key);

  const body = await getBody(req);
  const targetUrl = body.target_url || `${url}/functions/v1/iugu-webhook`;
  const events = body.events || [
    'invoice.payment_failed',
    'invoice.payment_succeeded',
    'invoice.created',
    'invoice.status_changed'
  ];

  const results: any[] = [];
  try {
    for (const ev of events) {
      const r = await createTrigger(iuguToken, ev, targetUrl);
      results.push({ event: ev, result: r });
    }
    await supabase.from('whatsapp_logs').insert({
      establishment_id: null,
      message_type: 'iugu_triggers_registered',
      message_body: `Triggers registrados para ${events.length} eventos`,
      status: 'sent'
    });
    return new Response(JSON.stringify({ ok: true, targetUrl, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

