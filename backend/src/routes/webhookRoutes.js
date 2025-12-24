const express = require('express');
const WebhookController = require('../controllers/WebhookController');
const IuguWebhookController = require('../controllers/IuguWebhookController');
const router = express.Router();

router.post('/mercadopago', WebhookController.handleWebhook);
router.post('/iugu', IuguWebhookController.handleWebhook);

module.exports = router;
