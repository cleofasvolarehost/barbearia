/**
 * Interface for Payment Providers
 * This class should be extended by specific providers (MercadoPago, Stripe, etc.)
 */
class PaymentProvider {
  constructor() {
    if (this.constructor === PaymentProvider) {
      throw new Error("Abstract class 'PaymentProvider' cannot be instantiated directly.");
    }
  }

  /**
   * Creates a payment preference or checkout session
   * @param {Object} data - { planId, price, userId, email, title }
   * @returns {Promise<Object>} - { init_point, id }
   */
  async createPreference(data) {
    throw new Error("Method 'createPreference' must be implemented.");
  }

  /**
   * Gets a payment by ID
   * @param {string} id 
   * @returns {Promise<Object>}
   */
  async getPayment(id) {
    throw new Error("Method 'getPayment' must be implemented.");
  }
}

module.exports = PaymentProvider;
