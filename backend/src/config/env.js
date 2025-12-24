const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3000,
  MERCADO_PAGO_ACCESS_TOKEN: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY, // Use Service Role for backend admin tasks
  WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET,
  IUGU_API_TOKEN: process.env.IUGU_API_TOKEN,
  IUGU_WEBHOOK_SECRET: process.env.IUGU_WEBHOOK_SECRET
  ,SYSTEM_GATEWAY_ENCRYPTION_KEY: process.env.SYSTEM_GATEWAY_ENCRYPTION_KEY
};
