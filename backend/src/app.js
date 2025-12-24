const express = require('express');
const cors = require('cors');
const { ALLOWED_ORIGINS, BACKEND_BASE_URL } = require('./config/env');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const iuguRoutes = require('./routes/iuguRoutes');
const assinaturaRoutes = require('./routes/assinaturas');
const adminGatewayRoutes = require('./routes/adminGatewayRoutes');

const app = express();
app.set('trust proxy', 1);

const origins = (ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
if (origins.length > 0) {
  app.use(cors({ origin: origins, credentials: true }));
} else {
  app.use(cors());
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/iugu', iuguRoutes);
app.use('/api/assinaturas', assinaturaRoutes);
app.use('/api/admin/gateways', adminGatewayRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'barbearia-backend' });
});

app.get('/', (req, res) => {
  res.send('API online');
});

module.exports = app;
