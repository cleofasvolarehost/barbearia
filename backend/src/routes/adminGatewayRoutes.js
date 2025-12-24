const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AdminGatewayController = require('../controllers/AdminGatewayController');

router.get('/iugu', auth, AdminGatewayController.getIugu);
router.post('/iugu', auth, AdminGatewayController.saveIugu);
router.post('/activate', auth, AdminGatewayController.activateProvider);

module.exports = router;
