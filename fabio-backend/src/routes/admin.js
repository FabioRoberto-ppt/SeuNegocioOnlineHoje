// src/routes/admin.js
const express  = require('express');
const router   = express.Router();
const { requireAuth } = require('../middleware/auth');

// ─── GET /admin/login ──────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session?.admin) return res.redirect('/admin');
  res.send(loginHTML());
});

// ─── POST /admin/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { usuario, senha } = req.body;

  const usuarioCorreto = usuario === process.env.ADMIN_USER;
  const senhaCorreta   = senha   === process.env.ADMIN_PASS;

  if (!usuarioCorreto || !senhaCorreta) {
    return res.status(401).send(loginHTML('Usuário ou senha incorretos.'));
  }

  req.session.admin = true;
  req.session.save(() => res.redirect('/admin'));
});

// ─── GET /admin/logout ─────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ─── GET /admin ────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  res.send(painelHTML());
});

module.exports = router;


// ═══════════════════════════════════════════════════════════════════════════
// HTML DO LOGIN
// ═══════════════════════════════════════════════════════════════════════════
function loginHTML(erro = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Admin — Login</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#060810;color:#eef0f8;font-family:'Segoe UI',sans-serif;
         display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#111420;border:1px solid rgba(255,255,255,.07);
          border-radius:16px;padding:2.5rem;width:360px}
    h1{font-size:1.6rem;margin-bottom:1.5rem;color:#06ffa5}
    label{font-size:.75rem;letter-spacing:.08em;text-transform:uppercase;
          color:rgba(238,240,248,.5);display:block;margin-bottom:.4rem}
    input{width:100%;background:#181d2e;border:1px solid rgba(255,255,255,.07);
          border-radius:8px;padding:.75rem 1rem;color:#eef0f8;
          font-size:.95rem;margin-bottom:1.2rem}
    input:focus{outline:none;border-color:rgba(6,255,165,.4)}
    button{width:100%;background:#06ffa5;color:#000;font-weight:700;
           border:none;padding:1rem;border-radius:50px;cursor:pointer;font-size:1rem}
    .erro{background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.3);
          color:#ff4d6d;padding:.75rem 1rem;border-radius:8px;
          font-size:.88rem;margin-bottom:1.2rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>FR. Admin</h1>
    ${erro ? `<div class="erro">${erro}</div>` : ''}
    <form method="POST" action="/admin/login">
      <label>Usuário</label>
      <input type="text" name="usuario" required autofocus/>
      <label>Senha</label>
      <input type="password" name="senha" required/>
      <button type="submit">Entrar →</button>
    </form>
  </div>
</body>
</html>`;
}


// ═══════════════════════════════════════════════════════════════════════════
// HTML DO PAINEL
// ═══════════════════════════════════════════════════════════════════════════
function painelHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>FR. Painel de Pedidos</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#060810;color:#eef0f8;font-family:'Segoe UI',sans-serif;min-height:100vh}

    /* ── NAV ── */
    nav{background:#111420;border-bottom:1px solid rgba(255,255,255,.07);
        padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center}
    nav h1{color:#06ffa5;font-size:1.4rem}
    nav a{color:rgba(238,240,248,.5);font-size:.85rem;text-decoration:none}
    nav a:hover{color:#ff4d6d}

    /* ── STATS ── */
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
           gap:1rem;padding:2rem;max-width:1200px;margin:0 auto}
    .stat{background:#111420;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:1.2rem}
    .stat-label{font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;
                color:rgba(238,240,248,.4);margin-bottom:.4rem}
    .stat-val{font-size:2rem;font-weight:700;color:#06ffa5}

    /* ── FILTROS ── */
    .filtros{padding:0 2rem 1rem;max-width:1200px;margin:0 auto;
             display:flex;gap:.5rem;flex-wrap:wrap}
    .filtro-btn{background:#111420;border:1px solid rgba(255,255,255,.07);color:rgba(238,240,248,.6);
                padding:.4rem 1rem;border-radius:50px;cursor:pointer;font-size:.82rem;transition:.2s}
    .filtro-btn:hover,.filtro-btn.ativo{background:#06ffa5;color:#000;border-color:#06ffa5;font-weight:700}

    /* ── TABELA ── */
    .tabela-wrap{padding:0 2rem 4rem;max-width:1200px;margin:0 auto;overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;
       color:rgba(238,240,248,.4);padding:.75rem 1rem;border-bottom:1px solid rgba(255,255,255,.07)}
    td{padding:.85rem 1rem;font-size:.88rem;border-bottom:1px solid rgba(255,255,255,.04);
       vertical-align:top}
    tr:hover td{background:rgba(255,255,255,.02)}

    /* ── STATUS BADGES ── */
    .badge{display:inline-block;padding:.2rem .7rem;border-radius:50px;font-size:.72rem;font-weight:700}
    .badge-aguardando_confirmacao{background:rgba(255,209,102,.12);color:#ffd166}
    .badge-pix_confirmado{background:rgba(6,255,165,.12);color:#06ffa5}
    .badge-em_desenvolvimento{background:rgba(99,102,241,.15);color:#818cf8}
    .badge-aguardando_aprovacao{background:rgba(251,146,60,.12);color:#fb923c}
    .badge-concluido{background:rgba(6,255,165,.2);color:#06ffa5}
    .badge-cancelado{background:rgba(255,77,109,.12);color:#ff4d6d}

    /* ── STATUS SELECT ── */
    select.status-sel{background:#181d2e;border:1px solid rgba(255,255,255,.1);
                      color:#eef0f8;padding:.3rem .6rem;border-radius:6px;font-size:.8rem;cursor:pointer}

    /* ── COMPROVANTE LINK ── */
    a.comp-link{color:#06ffa5;font-size:.8rem}
    a.comp-link:hover{text-decoration:underline}

    /* ── LOADING ── */
    #loading{text-align:center;padding:3rem;color:rgba(238,240,248,.3)}
  </style>
</head>
<body>

<nav>
  <h1>FR. Pedidos</h1>
  <a href="/admin/logout">Sair →</a>
</nav>

<!-- Stats -->
<div class="stats" id="statsGrid">
  <div class="stat"><div class="stat-label">Total pedidos</div><div class="stat-val" id="sTotal">—</div></div>
  <div class="stat"><div class="stat-label">Pix confirmado</div><div class="stat-val" id="sConf">—</div></div>
  <div class="stat"><div class="stat-label">Em desenvolvimento</div><div class="stat-val" id="sDev">—</div></div>
  <div class="stat"><div class="stat-label">Concluídos</div><div class="stat-val" id="sConc">—</div></div>
  <div class="stat"><div class="stat-label">Entradas recebidas</div><div class="stat-val" id="sReceita">—</div></div>
</div>

<!-- Filtros -->
<div class="filtros">
  <button class="filtro-btn ativo" onclick="filtrar('')">Todos</button>
  <button class="filtro-btn" onclick="filtrar('aguardando_confirmacao')">Aguardando</button>
  <button class="filtro-btn" onclick="filtrar('pix_confirmado')">Pix OK</button>
  <button class="filtro-btn" onclick="filtrar('em_desenvolvimento')">Em Dev</button>
  <button class="filtro-btn" onclick="filtrar('aguardando_aprovacao')">Aprovação</button>
  <button class="filtro-btn" onclick="filtrar('concluido')">Concluídos</button>
  <button class="filtro-btn" onclick="filtrar('cancelado')">Cancelados</button>
</div>

<!-- Tabela -->
<div class="tabela-wrap">
  <div id="loading">Carregando pedidos...</div>
  <table id="tabelaPedidos" style="display:none">
    <thead>
      <tr>
        <th>Data</th>
        <th>Nome</th>
        <th>WhatsApp</th>
        <th>Marca</th>
        <th>O que vende</th>
        <th>Comprovante</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody id="tbodyPedidos"></tbody>
  </table>
</div>

<script>
  const STATUS_LABELS = {
    aguardando_confirmacao: 'Aguardando confirmação',
    pix_confirmado:         'Pix confirmado',
    em_desenvolvimento:     'Em desenvolvimento',
    aguardando_aprovacao:   'Aguardando aprovação',
    concluido:              'Concluído',
    cancelado:              'Cancelado',
  };

  let filtroAtual = '';

  async function carregarStats() {
    const r = await fetch('/api/pedidos/stats');
    const d = await r.json();
    document.getElementById('sTotal').textContent   = d.total;
    document.getElementById('sConf').textContent    = d.confirmados;
    document.getElementById('sDev').textContent     = d.em_dev;
    document.getElementById('sConc').textContent    = d.concluidos;
    document.getElementById('sReceita').textContent =
      'R$ ' + parseFloat(d.receita_entradas).toFixed(2).replace('.',',');
  }

  async function carregarPedidos(status = '') {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('tabelaPedidos').style.display = 'none';

    const url = '/api/pedidos' + (status ? '?status=' + status : '');
    const r   = await fetch(url);
    const d   = await r.json();

    const tbody = document.getElementById('tbodyPedidos');
    tbody.innerHTML = '';

    if (!d.pedidos?.length) {
      document.getElementById('loading').textContent = 'Nenhum pedido encontrado.';
      return;
    }

    d.pedidos.forEach(p => {
      const tr = document.createElement('tr');
      const data = new Date(p.criado_em).toLocaleString('pt-BR');
      const comp = p.comprovante_url
        ? '<a class="comp-link" href="'+p.comprovante_url+'" target="_blank">Ver arquivo</a>'
        : '<span style="color:rgba(238,240,248,.3)">—</span>';

      // Select de status inline
      const opts = Object.entries(STATUS_LABELS).map(([val, lbl]) =>
        '<option value="'+val+'"'+(val===p.status?' selected':'')+'>'+lbl+'</option>'
      ).join('');

      tr.innerHTML = \`
        <td style="color:rgba(238,240,248,.5);font-size:.78rem">\${data}</td>
        <td>\${p.nome}</td>
        <td><a href="https://wa.me/55\${p.whatsapp}" target="_blank"
               style="color:#06ffa5">\${p.whatsapp}</a></td>
        <td><strong>\${p.marca}</strong></td>
        <td style="max-width:200px;color:rgba(238,240,248,.7)">\${p.o_que_vende}</td>
        <td>\${comp}</td>
        <td>
          <select class="status-sel" onchange="atualizarStatus('\${p.id}', this.value)">
            \${opts}
          </select>
        </td>
      \`;
      tbody.appendChild(tr);
    });

    document.getElementById('loading').style.display = 'none';
    document.getElementById('tabelaPedidos').style.display = 'table';
  }

  async function atualizarStatus(id, status) {
    await fetch('/api/pedidos/'+id+'/status', {
      method:  'PATCH',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify({ status }),
    });
    carregarStats();
  }

  function filtrar(status) {
    filtroAtual = status;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('ativo'));
    event.target.classList.add('ativo');
    carregarPedidos(status);
  }

  // Init
  carregarStats();
  carregarPedidos();
  setInterval(() => { carregarStats(); carregarPedidos(filtroAtual); }, 30000);
</script>
</body>
</html>`;
}