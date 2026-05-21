// src/routes/pagamentos.js
const express     = require('express');
const router      = express.Router();
const { Payment } = require('mercadopago');
const client      = require('../config/mercadopago');

/* ────────────────────────────────────────────
   POST /api/pagamentos/gerar-pix
   Body: { nome, email, valor }
   Retorna: { sucesso, paymentId, status, qrCode, qrCodeBase64 }
──────────────────────────────────────────── */
router.post('/gerar-pix', async (req, res) => {
  const { nome, email, valor } = req.body;

  // Validação básica
  if (!nome || !email || !valor) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Os campos nome, email e valor são obrigatórios.',
    });
  }

  const valorNum = parseFloat(valor);
  if (isNaN(valorNum) || valorNum <= 0) {
    return res.status(400).json({
      sucesso: false,
      erro: 'Valor inválido.',
    });
  }

  try {
    const payment   = new Payment(client);
    const resultado = await payment.create({
      body: {
        transaction_amount: valorNum,
        description:        'Site Profissional Completo — Fabio Roberto',
        payment_method_id:  'pix',
        payer: {
          email:      email,
          first_name: nome,
        },
      },
    });

    const pix = resultado.point_of_interaction?.transaction_data;

    if (!pix) {
      throw new Error('Resposta inválida do Mercado Pago: dados Pix ausentes.');
    }

    console.log(`✅ Pix gerado | ID: ${resultado.id} | Valor: R$${valorNum} | Pagador: ${nome}`);

    return res.json({
      sucesso:      true,
      paymentId:    resultado.id,
      status:       resultado.status,        // 'pending'
      qrCode:       pix.qr_code,            // string copia-e-cola
      qrCodeBase64: pix.qr_code_base64,     // imagem PNG em base64
    });

  } catch (err) {
    console.error('❌ Erro ao gerar Pix:', err?.cause ?? err);
    return res.status(500).json({
      sucesso: false,
      erro:    err.message || 'Erro interno ao gerar Pix.',
    });
  }
});


/* ────────────────────────────────────────────
   GET /api/pagamentos/status/:paymentId
   Retorna: { status, statusDetalhe }
   status possíveis: pending | approved | rejected | cancelled
──────────────────────────────────────────── */
router.get('/status/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  if (!paymentId || isNaN(paymentId)) {
    return res.status(400).json({ erro: 'paymentId inválido.' });
  }

  try {
    const payment   = new Payment(client);
    const resultado = await payment.get({ id: paymentId });

    return res.json({
      status:        resultado.status,        // pending | approved | rejected
      statusDetalhe: resultado.status_detail,
    });

  } catch (err) {
    console.error('❌ Erro ao checar status do Pix:', err?.cause ?? err);
    return res.status(500).json({ erro: err.message || 'Erro ao consultar pagamento.' });
  }
});

module.exports = router;