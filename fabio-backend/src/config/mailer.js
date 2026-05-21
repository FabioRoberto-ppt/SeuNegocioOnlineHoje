const nodemailer = require('nodemailer');

// Configuração atualizada para usar o Mailtrap em ambiente de desenvolvimento
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─── Templates ───────────────────────────────────────────────────────────────

function templateClienteConfirmacao(pedido) {
  return {
    from:     process.env.EMAIL_FROM,
    to:       process.env.EMAIL_USER, // por enquanto vai pro Fabio (cliente não tem email)
    subject: `🎉 Novo pedido recebido — ${pedido.marca}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0f1a;color:#eef0f8;padding:32px;border-radius:12px">
        <h1 style="color:#06ffa5;font-size:28px;margin-bottom:4px">Novo Pedido! 🚀</h1>
        <p style="color:#888;margin-top:0">Recebido em ${new Date().toLocaleString('pt-BR')}</p>

        <hr style="border:1px solid #1e2233;margin:24px 0"/>

        <table style="width:100%;border-collapse:collapse">
          ${row('ID do Pedido', pedido.id)}
          ${row('Nome',         pedido.nome)}
          ${row('WhatsApp',     pedido.whatsapp)}
          ${row('Marca',        pedido.marca)}
          ${row('O que vende',  pedido.o_que_vende)}
          ${row('Cores',        pedido.cores        || '—')}
          ${row('Tem logo',     pedido.tem_logo)}
          ${row('Tem fotos',    pedido.tem_fotos)}
          ${row('Referência',   pedido.referencia   || '—')}
          ${row('Info extra',   pedido.info_extra    || '—')}
          ${row('Comprovante',  pedido.comprovante_nome || 'Ainda não enviado')}
        </table>

        <hr style="border:1px solid #1e2233;margin:24px 0"/>

        <a href="${process.env.ADMIN_URL || 'http://localhost:3000'}/admin"
           style="display:inline-block;background:#06ffa5;color:#000;font-weight:700;padding:12px 28px;border-radius:50px;text-decoration:none">
          Ver painel de pedidos →
        </a>
      </div>
    `,
  };
}

function templateStatusAtualizado(pedido, novoStatus) {
  const labels = {
    pix_confirmado:        'Pix Confirmado ✅',
    em_desenvolvimento:    'Em Desenvolvimento 🛠️',
    aguardando_aprovacao:  'Aguardando Aprovação 👀',
    concluido:             'Site Entregue! 🎉',
    cancelado:             'Pedido Cancelado',
  };

  return {
    from:     process.env.EMAIL_FROM,
    to:       process.env.EMAIL_USER,
    subject: `📋 Pedido ${pedido.marca} — ${labels[novoStatus] || novoStatus}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0f1a;color:#eef0f8;padding:32px;border-radius:12px">
        <h2 style="color:#06ffa5">Status atualizado</h2>
        <p>O pedido de <strong>${pedido.marca}</strong> (${pedido.nome}) foi atualizado para:</p>
        <p style="font-size:22px;font-weight:700;color:#ffd166">${labels[novoStatus] || novoStatus}</p>
        <p style="color:#888;font-size:13px">ID: ${pedido.id}</p>
      </div>
    `,
  };
}

// helper de linha de tabela
function row(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;color:#888;font-size:13px;width:140px;vertical-align:top">${label}</td>
      <td style="padding:8px 0;font-size:13px;color:#eef0f8">${value}</td>
    </tr>
  `;
}

// ─── Funções exportadas ───────────────────────────────────────────────────────

async function enviarEmailNovoPedido(pedido) {
  try {
    await transporter.sendMail(templateClienteConfirmacao(pedido));
    console.log(`📧 E-mail de novo pedido enviado — ${pedido.marca}`);
  } catch (err) {
    // Não deixa falha de e-mail derrubar a requisição
    console.error('⚠️ Falha ao enviar e-mail:', err.message);
  }
}

async function enviarEmailStatusAtualizado(pedido, novoStatus) {
  try {
    await transporter.sendMail(templateStatusAtualizado(pedido, novoStatus));
    console.log(`📧 E-mail de status atualizado enviado — ${pedido.marca}`);
  } catch (err) {
    console.error('⚠️ Falha ao enviar e-mail de status:', err.message);
  }
}

module.exports = { enviarEmailNovoPedido, enviarEmailStatusAtualizado };