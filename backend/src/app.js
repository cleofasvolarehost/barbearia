const express = require('express');
const cors = require('cors');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const iuguRoutes = require('./routes/iuguRoutes');
const assinaturaRoutes = require('./routes/assinaturas');
const adminGatewayRoutes = require('./routes/adminGatewayRoutes');

const app = express();

app.use(cors());
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

module.exports = app;
