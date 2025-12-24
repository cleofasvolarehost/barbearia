const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IuguCheckoutController = require('../controllers/IuguCheckoutController');

const RAW_ALLOWED_ORIGINS = process.env.CORS_ALLOWED_ORIGINS || '';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.crdev.app',
  'https://crdev.app',
  'http://localhost:5173',
  'http://localhost:3000',
];
const ALLOWED_ORIGINS = RAW_ALLOWED_ORIGINS
  ? RAW_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

function originMatches(pattern, origin) {
  if (pattern === '*') return true;
  if (pattern === origin) return true;
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // '.dominio.com'
    return origin.endsWith(suffix);
  }
  return false;
}

function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.some((p) => originMatches(p, origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
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
