const express = require('express');
const AssinaturaController = require('../controllers/AssinaturaController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const assinaturaController = new AssinaturaController();

// Rotas de assinaturas
router.post('/criar', authMiddleware, assinaturaController.criarAssinatura);
router.get('/listar', authMiddleware, assinaturaController.listarAssinaturas);
router.delete('/cancelar/:assinaturaId', authMiddleware, assinaturaController.cancelarAssinatura);

module.exports = router;