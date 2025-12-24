const { IUGU_API_TOKEN } = require('../config/env');
const { supabase } = require('../config/supabase');

async function createCharge(body) {
  const res = await fetch('https://api.iugu.com/v1/charge', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${IUGU_API_TOKEN}:`).toString('base64')}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`);
  return json;
}

class IuguCheckoutController {
  static async account(req, res) {
    try {
      const { data } = await supabase
        .from('system_gateways')
        .select('provider, account_id, is_active')
        .eq('provider', 'iugu')
        .maybeSingle();
      return res.json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  }

  static async card(req, res) {
    try {
      const { payment_token, amount_cents, email, items } = req.body || {};
      if (!payment_token || !amount_cents || !email) return res.status(400).json({ success: false, mensagem: 'Dados inválidos' });
      const charge = await createCharge({ token: payment_token, email, items: items || [{ description: 'Assinatura', quantity: 1, price_cents: amount_cents }] });
      return res.json({ success: true, data: charge });
    } catch (e) {
      return res.status(500).json({ success: false, mensagem: e.message });
    }
  }

  static async pix(req, res) {
    try {
      const { amount_cents, email, items } = req.body || {};
      if (!amount_cents || !email) return res.status(400).json({ success: false, mensagem: 'Dados inválidos' });
      const charge = await createCharge({ email, payable_with: 'pix', items: items || [{ description: 'Assinatura', quantity: 1, price_cents: amount_cents }] });
      return res.json({ success: true, data: charge });
    } catch (e) {
      return res.status(500).json({ success: false, mensagem: e.message });
    }
  }
}

module.exports = IuguCheckoutController;
