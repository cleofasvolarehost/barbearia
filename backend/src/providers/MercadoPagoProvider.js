const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const PaymentProvider = require('../interfaces/PaymentProvider');
const { MERCADO_PAGO_ACCESS_TOKEN } = require('../config/env');

class MercadoPagoProvider extends PaymentProvider {
  constructor() {
    super();
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Mercado Pago Access Token is missing');
    }
    this.client = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_ACCESS_TOKEN });
    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  /**
   * Creates a checkout preference (for Card/Boleto/Redirect flow)
   */
  async createPreference({ title, price, userId, email, planId }) {
    try {
      const result = await this.preference.create({
        body: {
          items: [
            {
              id: planId,
              title: title,
              quantity: 1,
              unit_price: parseFloat(price),
              currency_id: 'BRL',
            },
          ],
          payer: {
            email: email,
          },
          external_reference: userId,
          back_urls: {
            success: 'http://localhost:5173/admin/subscription/success', // Update with real domain in prod
            failure: 'http://localhost:5173/admin/subscription/failure',
            pending: 'http://localhost:5173/admin/subscription/pending',
          },
          auto_return: 'approved',
          notification_url: 'https://your-domain.com/api/webhooks/mercadopago', // Must be HTTPS and public
          metadata: {
            plan_id: planId,
            user_id: userId
          }
        },
      });

      return {
        init_point: result.init_point, // URL for the checkout
        id: result.id,
      };
    } catch (error) {
      console.error('Error creating MP Preference:', error);
      throw error;
    }
  }

  /**
   * Creates a direct Pix payment
   */
  async createPixPayment({ amount, userId, email, description, planId }) {
    try {
      const result = await this.payment.create({
        body: {
          transaction_amount: parseFloat(amount),
          description: description,
          payment_method_id: 'pix',
          payer: {
            email: email,
          },
          external_reference: userId,
          notification_url: 'https://your-domain.com/api/webhooks/mercadopago',
          metadata: {
            plan_id: planId,
            user_id: userId
          }
        },
      });

      return {
        id: result.id,
        status: result.status,
        qr_code: result.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url,
      };
    } catch (error) {
      console.error('Error creating MP Pix:', error);
      throw error;
    }
  }

  async getPayment(id) {
    return await this.payment.get({ id });
  }
}

module.exports = MercadoPagoProvider;
