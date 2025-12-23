const express = require('express');
const SubscriptionController = require('../controllers/SubscriptionController');
const router = express.Router();

router.post('/checkout', SubscriptionController.checkout);
router.post('/renew', SubscriptionController.renew);

module.exports = router;
