const { IUGU_API_TOKEN } = require('../config/env');

function getAuthHeader() {
  if (!IUGU_API_TOKEN) throw new Error('Missing IUGU_API_TOKEN');
  const base64 = Buffer.from(`${IUGU_API_TOKEN}:`).toString('base64');
  return `Basic ${base64}`;
}

class IuguProvider {
  baseUrl = 'https://api.iugu.com/v1';

  async suspendSubscription(id) {
    const res = await fetch(`${this.baseUrl}/subscriptions/${id}/suspend`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Iugu suspend failed: ${res.status} ${json?.errors ? JSON.stringify(json.errors) : ''}`);
    return json;
  }

  async deleteSubscription(id) {
    const res = await fetch(`${this.baseUrl}/subscriptions/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(`Iugu delete failed: ${res.status} ${json?.errors ? JSON.stringify(json.errors) : ''}`);
    }
    return true;
  }

  async createTrigger(event, url) {
    const body = { event, url };
    const res = await fetch(`${this.baseUrl}/web_hooks`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Iugu create trigger failed: ${res.status} ${json?.errors ? JSON.stringify(json.errors) : ''}`);
    return json;
  }
}

module.exports = IuguProvider;
