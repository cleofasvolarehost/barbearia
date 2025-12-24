const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IuguCheckoutController = require('../controllers/IuguCheckoutController');

const ALLOWED_ORIGINS = [
  'https://www.crdev.app',
];

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}

router.use(corsMiddleware);

router.get('/account', IuguCheckoutController.account);
router.options('/checkout/card', corsMiddleware);
router.post('/checkout/card', auth, IuguCheckoutController.card);
router.options('/checkout/pix', corsMiddleware);
router.post('/checkout/pix', auth, IuguCheckoutController.pix);

module.exports = router;
