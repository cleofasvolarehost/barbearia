const RAW_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || '';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.crdev.app',
  'https://crdev.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
const ALLOWED_ORIGINS = RAW_ALLOWED_ORIGINS
  ? RAW_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

function originMatches(pattern, origin) {
  if (pattern === '*') return true;
  if (pattern === origin) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1);
    return origin.endsWith(suffix);
  }
  return false;
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some((p) => originMatches(p, origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  try {
    const { amount_cents, email, items } = req.body || {};
    if (!amount_cents || !email) {
      res.status(400).json({ success: false, mensagem: 'Dados inválidos' });
      return;
    }
    const r = await fetch('https://api.iugu.com/v1/charge', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.IUGU_API_TOKEN}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        email,
        payable_with: 'pix',
        items: items || [{ description: 'Assinatura', quantity: 1, price_cents: amount_cents }],
      }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.status(500).json({ success: false, mensagem: json?.errors || 'Erro' });
      return;
    }
    res.status(200).json({ success: true, data: json });
  } catch (e) {
    res.status(500).json({ success: false, mensagem: e.message });
  }
};

