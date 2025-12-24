const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IuguCheckoutController = require('../controllers/IuguCheckoutController');

router.get('/account', IuguCheckoutController.account);
router.post('/checkout/card', auth, IuguCheckoutController.card);
router.post('/checkout/pix', auth, IuguCheckoutController.pix);

module.exports = router;
