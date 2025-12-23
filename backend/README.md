# Barbearia SaaS Backend

This is the Node.js/Express backend for handling SaaS subscriptions via Mercado Pago.

## Setup

1.  **Install Dependencies:**
    ```bash
    cd backend
    npm install
    ```

2.  **Environment Variables:**
    Copy `.env.example` to `.env` and fill in your credentials:
    *   `MERCADO_PAGO_ACCESS_TOKEN`: Get this from your MP Dashboard.
    *   `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: From Supabase Project Settings > API.
    *   `MP_WEBHOOK_SECRET`: Optional, for signature verification (not currently enforced, using Double Check pattern).

3.  **Database Migration:**
    Run the SQL migration file located at `../supabase/migrations/20251223000006_add_subscription_fields.sql` in your Supabase SQL Editor to add necessary columns.

4.  **Run Server:**
    ```bash
    npm run dev
    ```

## Endpoints

*   **POST /api/subscription/checkout**
    *   Body: `{ "planId": "...", "paymentMethod": "pix" | "card", "userId": "..." }`
    *   Returns: `{ "init_point": "..." }` (Card) or `{ "qr_code": "...", "qr_code_base64": "..." }` (Pix).

*   **POST /api/subscription/renew**
    *   Body: `{ "userId": "...", "monthsToAdd": 1 }`
    *   Returns: New Pix payment info (Card renewal placeholder included).

*   **POST /api/webhooks/mercadopago**
    *   Receives notifications from Mercado Pago.
    *   Verifies payment status with MP API.
    *   Updates user subscription and `ends_at` date.
    *   Logs transaction to `saas_payment_history`.

## Deployment

Deploy this as a standalone Node.js service (e.g., Render, Railway, DigitalOcean) or adapt the logic into Supabase Edge Functions if preferred.
Ensure your `notification_url` in `src/providers/MercadoPagoProvider.js` points to your deployed URL.
