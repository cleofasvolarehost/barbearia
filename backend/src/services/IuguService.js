const fetch = require('node-fetch');
const { IUGU_API_TOKEN } = require('../config/env');

function getAuthHeader() {
  if (!IUGU_API_TOKEN) throw new Error('Missing IUGU_API_TOKEN');
  const base64 = Buffer.from(`${IUGU_API_TOKEN}:`).toString('base64');
  return `Basic ${base64}`;
}

function mapIuguError(err, fallbackMessage) {
  if (!err) return fallbackMessage || 'Erro desconhecido no Iugu';
  if (typeof err === 'string') return err;
  if (err.errors && typeof err.errors === 'object') {
    const parts = [];
    for (const k of Object.keys(err.errors)) {
      const v = err.errors[k];
      const msg = Array.isArray(v) ? v.join(', ') : String(v);
      parts.push(`${k}: ${msg}`);
    }
    if (parts.length) return parts.join(' | ');
  }
  if (err.code && /^LR-\d+/.test(err.code)) return `Iugu: código ${err.code}`;
  if (err.message) return err.message;
  return fallbackMessage || 'Falha na operação com Iugu';
}

class IuguService {
  constructor() {
    this.baseUrl = 'https://api.iugu.com/v1';
  }

  async createCustomer(email, name, cpf) {
    const body = { email, name, cpf }; 
    const res = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = mapIuguError(json, `Falha ao criar cliente (${res.status})`);
      const error = new Error(message);
      error.status = res.status;
      error.details = json;
      throw error;
    }
    return json;
  }

  async createSubscription(customerId, planId) {
    const body = { customer_id: customerId, plan_id: planId, plan_identifier: planId };
    const res = await fetch(`${this.baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = mapIuguError(json, `Falha ao criar assinatura (${res.status})`);
      const error = new Error(message);
      error.status = res.status;
      error.details = json;
      throw error;
    }
    return json;
  }

  async getSubscriptionDetails(subscriptionId) {
    const res = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = mapIuguError(json, `Falha ao obter assinatura (${res.status})`);
      const error = new Error(message);
      error.status = res.status;
      error.details = json;
      throw error;
    }
    return json;
  }
}

module.exports = IuguService;
