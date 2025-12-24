const IuguProvider = require('../providers/IuguProvider');
const iugu = new IuguProvider();

class IuguAdminController {
  static async registerTriggers(req, res) {
    try {
      const { baseUrl } = req.body; // e.g. https://api.seuservidor.com
      if (!baseUrl) return res.status(400).json({ error: 'baseUrl obrigatório' });

      const events = [
        'invoice.payment_failed',
        'invoice.payment_succeeded',
        'invoice.created',
        'invoice.status_changed'
      ];

      const results = [];
      for (const ev of events) {
        const url = `${baseUrl}/api/webhooks/iugu`;
        const r = await iugu.createTrigger(ev, url);
        results.push({ event: ev, result: r });
      }

      return res.json({ ok: true, results });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = IuguAdminController;

