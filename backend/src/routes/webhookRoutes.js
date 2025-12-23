const express = require('express');
const WebhookController = require('../controllers/WebhookController');
const router = express.Router();

router.post('/mercadopago', WebhookController.handleWebhook);

module.exports = router;
