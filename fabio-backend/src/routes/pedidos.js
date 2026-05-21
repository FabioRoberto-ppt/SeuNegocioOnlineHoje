// src/routes/pedidos.js
const express = require('express');
const router  = express.Router();
const upload  = require('../config/upload');
const { requireAuth } = require('../middleware/auth');
const {
  criarPedido,
  listarPedidos,
  buscarPedido,
  atualizarStatus,
  estatisticas,
} = require('../controllers/pedidosController');

// Público — recebe pedido do frontend
router.post('/', upload.single('comprovante'), criarPedido);

// Admin — requer login
router.get('/',          requireAuth, listarPedidos);
router.get('/stats',     requireAuth, estatisticas);
router.get('/:id',       requireAuth, buscarPedido);
router.patch('/:id/status', requireAuth, atualizarStatus);

module.exports = router;