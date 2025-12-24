const express = require('express');
const IuguAdminController = require('../controllers/IuguAdminController');
const router = express.Router();

router.post('/triggers/register', IuguAdminController.registerTriggers);

module.exports = router;

