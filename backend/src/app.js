const express = require('express');
const cors = require('cors');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'barbearia-backend' });
});

module.exports = app;
