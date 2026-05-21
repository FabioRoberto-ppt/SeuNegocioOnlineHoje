// src/controllers/pedidosController.js
const pool   = require('../config/db');
const { enviarEmailNovoPedido, enviarEmailStatusAtualizado } = require('../config/mailer');
const path   = require('path');

// ─── POST /api/pedidos ─────────────────────────────────────────────────────
// Recebe o briefing + dados de pagamento (ou comprovante manual) do frontend
async function criarPedido(req, res) {
  try {
    const {
      nome, whatsapp, marca, oQueVende,
      cores, logo, fotos, referencia, infoExtra,
      paymentId, valor // 👈 CAPTURA OS DADOS DE PAGAMENTO EXECUTADOS PELO MERCADO PAGO
    } = req.body;

    // Validação básica (o frontend já valida, mas nunca confie só nele)
    if (!nome?.trim() || !whatsapp?.trim() || !marca?.trim() || !oQueVende?.trim()) {
      return res.status(400).json({ erro: 'Campos obrigatórios não preenchidos.' });
    }

    const waLimpo = whatsapp.replace(/\D/g, '');
    if (waLimpo.length < 10) {
      return res.status(400).json({ erro: 'WhatsApp inválido.' });
    }

    // Calcula automaticamente o valor da entrada (50%) com base no valor enviado ou assume o padrão de R$ 37,50 (metade de 75)
    const valorTotal = parseFloat(valor) || 75.00;
    const valorEntrada = valorTotal / 2;

    // Dados do comprovante (se foi enviado via upload de arquivo)
    const comprovanteUrl  = req.file ? `/uploads/${req.file.filename}` : null;
    const comprovanteNome = req.file ? req.file.originalname : null;

    // ⚡ QUERY COMPLETA: Salva o valor_entrada (para os gráficos) e o ID do Mercado Pago (para controle)
    const result = await pool.query(
      `INSERT INTO pedidos
        (nome, whatsapp, marca, o_que_vende, cores, tem_logo, tem_fotos,
         referencia, info_extra, comprovante_url, comprovante_nome, 
         valor_entrada, mercadopago_payment_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        nome.trim(),
        waLimpo,
        marca.trim(),
        oQueVende.trim(),
        cores?.trim()      || null,
        logo   === 'sim'   ? 'Sim, tem logo'  : 'Não tem logo',
        fotos  === 'sim'   ? 'Sim, tem fotos' : 'Não tem fotos',
        referencia?.trim() || null,
        infoExtra?.trim()  || null,
        comprovanteUrl,
        comprovanteNome,
        valorEntrada,                            // $12 - Evita salvar nulo e quebrar o SUM() das estatísticas
        paymentId || null,                       // $13 - ID da transação Pix gerada
        paymentId ? 'pix_confirmado' : 'aguardando_confirmacao' // $14 - Status dinâmico
      ]
    );

    const pedido = result.rows[0];

    // Dispara e-mail em segundo plano (não bloqueia a resposta)
    enviarEmailNovoPedido(pedido);

    return res.status(201).json({
      sucesso:  true,
      mensagem: 'Pedido recebido com sucesso!',
      pedidoId: pedido.id,
    });

  } catch (err) {
    console.error('❌ Erro ao criar pedido no banco de dados:', err);
    return res.status(500).json({ erro: 'Erro interno ao salvar pedido. Tente novamente.' });
  }
}


// ─── GET /api/pedidos ──────────────────────────────────────────────────────
// Lista pedidos para o painel (requer auth)
async function listarPedidos(req, res) {
  try {
    const { status, pagina = 1, porPagina = 20 } = req.query;
    const offset = (pagina - 1) * porPagina;
    const params = [];
    let where = '';

    if (status) {
      params.push(status);
      where = `WHERE status = $${params.length}`;
    }

    params.push(porPagina, offset);

    const [rows, total] = await Promise.all([
      pool.query(
        `SELECT * FROM pedidos ${where}
         ORDER BY criado_em DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM pedidos ${where}`,
        status ? [status] : []
      ),
    ]);

    return res.json({
      pedidos:   rows.rows,
      total:     parseInt(total.rows[0].count),
      pagina:    parseInt(pagina),
      porPagina: parseInt(porPagina),
    });

  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}


// ─── GET /api/pedidos/:id ──────────────────────────────────────────────────
async function buscarPedido(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pedidos WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar pedido:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}


// ─── PATCH /api/pedidos/:id/status ────────────────────────────────────────
async function atualizarStatus(req, res) {
  const statusPermitidos = [
    'aguardando_confirmacao',
    'pix_confirmado',
    'em_desenvolvimento',
    'aguardando_aprovacao',
    'concluido',
    'cancelado',
  ];

  try {
    const { status } = req.body;
    if (!statusPermitidos.includes(status)) {
      return res.status(400).json({ erro: 'Status inválido.' });
    }

    const { rows } = await pool.query(
      `UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    enviarEmailStatusAtualizado(rows[0], status);

    return res.json({ sucesso: true, pedido: rows[0] });

  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}


// ─── GET /api/pedidos/stats ────────────────────────────────────────────────
async function estatisticas(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)                                            AS total,
        COUNT(*) FILTER (WHERE status = 'pix_confirmado')  AS confirmados,
        COUNT(*) FILTER (WHERE status = 'em_desenvolvimento') AS em_dev,
        COUNT(*) FILTER (WHERE status = 'concluido')       AS concluidos,
        COALESCE(SUM(valor_entrada)
          FILTER (WHERE status NOT IN ('aguardando_confirmacao','cancelado')), 0)
                                                            AS receita_entradas
      FROM pedidos
    `);
    return res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar stats:', err);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

module.exports = { criarPedido, listarPedidos, buscarPedido, atualizarStatus, estatisticas };