/* ════════════════════════════════════════════
   MERCADO PAGO — PIX AUTOMÁTICO
   Adicione este bloco no seu script.js,
   substituindo o bloco "CARRINHO + BRIEFING + PIX"
════════════════════════════════════════════ */

/* ── DADOS DO PACOTE ── */
const PACOTE = {
  id:        'site-basico',
  nome:      'Site Profissional Completo',
  descricao: 'Página única · Mobile First · Pix Direto · 5 Revisões',
  preco:     75.00,
  entrada:   37.50,
};

/* ── CONSTANTES ── */
const WHATSAPP_NUM = '5511964676886';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://SEU-APP.onrender.com'; // ← troque pelo URL real do Render depois

/* ── ESTADO ── */
let cartItems    = [];
let briefingData = {};
let _pixInterval = null;   // referência do setInterval do polling
let _pixPaymentId = null;  // ID do pagamento gerado

/* ── HELPERS ── */
function fmt(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function showToast(msg, type = 'info') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const colors = { success: '#06ffa5', warn: '#ffd166', info: '#64b5f6', error: '#ff4d6d' };
  const toast  = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '32px',
    left:         '50%',
    transform:    'translateX(-50%) translateY(20px)',
    background:   colors[type] || colors.info,
    color:        '#000',
    fontFamily:   "'Plus Jakarta Sans', sans-serif",
    fontWeight:   '700',
    fontSize:     '0.88rem',
    padding:      '12px 24px',
    borderRadius: '50px',
    zIndex:       '99999',
    boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
    opacity:      '0',
    transition:   'all 0.3s cubic-bezier(0.22,1,0.36,1)',
    whiteSpace:   'nowrap',
    maxWidth:     '90vw',
    textAlign:    'center',
    pointerEvents:'none',
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

function focusField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.style.borderColor = 'var(--red)';
  el.style.boxShadow   = '0 0 0 3px rgba(255,77,109,0.15)';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
  }, 2200);
}

/* ── ELEMENTOS DOM ── */
const navCartBtn        = document.getElementById('navCartBtn');
const cartCount         = document.getElementById('cartCount');
const cartSidebar       = document.getElementById('cartSidebar');
const cartOverlay       = document.getElementById('cartOverlay');
const closeCartBtn      = document.getElementById('closeCart');

const stepCart          = document.getElementById('stepCart');
const stepBriefing      = document.getElementById('stepBriefing');
const stepPix           = document.getElementById('stepPix');
const stepSucesso       = document.getElementById('stepSucesso');

const btnProsseguir     = document.getElementById('btnProsseguir');
const btnVoltarCart     = document.getElementById('btnVoltarCart');
const btnProsseguirPix  = document.getElementById('btnProsseguirPix');
const btnVoltarBriefing = document.getElementById('btnVoltarBriefing');
const btnWhatsappFinal  = document.getElementById('btnWhatsappFinal');
const heroCta           = document.getElementById('heroCta');
const finalCta          = document.getElementById('finalCta');


/* ── ABRIR / FECHAR CARRINHO ── */
function openCart() {
  cartSidebar.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeCartFn() {
  cartSidebar.classList.remove('open');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

navCartBtn   && navCartBtn.addEventListener('click', openCart);
closeCartBtn && closeCartBtn.addEventListener('click', closeCartFn);
cartOverlay  && cartOverlay.addEventListener('click', closeCartFn);


/* ── ADICIONAR AO CARRINHO ── */
function addToCart() {
  if (cartItems.find(i => i.id === PACOTE.id)) {
    openCart();
    return;
  }
  cartItems.push({ ...PACOTE });
  updateCartCount();
  openCart();
  if (cartCount) {
    cartCount.style.transform = 'scale(1.5)';
    setTimeout(() => cartCount.style.transform = '', 300);
  }
}

heroCta  && heroCta.addEventListener('click', addToCart);
finalCta && finalCta.addEventListener('click', addToCart);


/* ── ATUALIZAR CONTADOR ── */
function updateCartCount() {
  if (cartCount) cartCount.textContent = cartItems.length;
}


/* ── NAVEGAÇÃO ENTRE STEPS ── */
function showStep(step) {
  [stepCart, stepBriefing, stepPix, stepSucesso].forEach(s => {
    if (s) s.classList.add('hidden');
  });
  if (step) step.classList.remove('hidden');
  if (cartSidebar) cartSidebar.scrollTop = 0;
}

// Step 1 → 2
btnProsseguir && btnProsseguir.addEventListener('click', () => {
  if (cartItems.length === 0) {
    showToast('⚠️ Seu carrinho está vazio!', 'warn');
    return;
  }
  showStep(stepBriefing);
});

// Step 2 → 1
btnVoltarCart && btnVoltarCart.addEventListener('click', () => showStep(stepCart));

// Step 2 → 3 (agora gera o Pix automaticamente!)
btnProsseguirPix && btnProsseguirPix.addEventListener('click', async () => {
  if (!validateBriefing()) return;
  collectBriefing();
  showStep(stepPix);
  await gerarPix(); // ← gera QR Code automaticamente
});

// Step 3 → 2 (cancela polling se voltar)
btnVoltarBriefing && btnVoltarBriefing.addEventListener('click', () => {
  pararPolling();
  showStep(stepBriefing);
});


/* ── VALIDAÇÃO DO BRIEFING ── */
function validateBriefing() {
  const campos = [
    { id: 'nomeCliente',     msg: '⚠️ Preencha seu nome completo!'        },
    { id: 'whatsappCliente', msg: '⚠️ Preencha seu WhatsApp para contato!' },
    { id: 'nomeMarca',       msg: '⚠️ Preencha o nome do seu negócio!'    },
    { id: 'oQueVende',       msg: '⚠️ Descreva o que você vende!'         },
  ];

  for (const campo of campos) {
    const el = document.getElementById(campo.id);
    if (!el || !el.value.trim()) {
      showToast(campo.msg, 'warn');
      focusField(campo.id);
      return false;
    }
  }

  const wa = document.getElementById('whatsappCliente').value.replace(/\D/g, '');
  if (wa.length < 10) {
    showToast('⚠️ WhatsApp inválido! Use DDD + número.', 'warn');
    focusField('whatsappCliente');
    return false;
  }

  const logo = document.querySelector('input[name="logo"]:checked');
  if (!logo) {
    showToast('⚠️ Informe se você possui logo!', 'warn');
    return false;
  }

  return true;
}


/* ── COLETAR BRIEFING ── */
function collectBriefing() {
  const logoVal  = document.querySelector('input[name="logo"]:checked')?.value;
  const fotosVal = document.querySelector('input[name="fotos"]:checked')?.value;

  briefingData = {
    nome:       document.getElementById('nomeCliente').value.trim(),
    whatsapp:   document.getElementById('whatsappCliente').value.trim(),
    email:      document.getElementById('emailCliente')?.value.trim() || 'cliente@email.com',
    marca:      document.getElementById('nomeMarca').value.trim(),
    oQueVende:  document.getElementById('oQueVende').value.trim(),
    cores:      document.getElementById('cores')?.value.trim()      || 'Não informado',
    logo:       logoVal  === 'sim' ? 'Sim, tem logo'               : 'Não tem logo',
    fotos:      fotosVal === 'sim' ? 'Sim, tem fotos'              : 'Não tem fotos / precisa de ajuda',
    referencia: document.getElementById('referencia')?.value.trim() || 'Nenhuma',
    infoExtra:  document.getElementById('infoExtra')?.value.trim()  || 'Nenhuma',
  };
}


/* ════════════════════════════════════════════
   PIX AUTOMÁTICO — MERCADO PAGO
════════════════════════════════════════════ */

/* ── GERAR QR CODE PIX ── */
async function gerarPix() {
  const pixContainer = document.getElementById('pixContainer');
  if (!pixContainer) return;

  // Loading state
  pixContainer.innerHTML = `
    <div style="text-align:center;padding:32px 0;">
      <div style="
        width:48px;height:48px;
        border:3px solid rgba(255,255,255,0.1);
        border-top-color:var(--green);
        border-radius:50%;
        animation:spin 0.8s linear infinite;
        margin:0 auto 16px;
      "></div>
      <p style="color:var(--muted);font-size:0.9rem;">Gerando QR Code...</p>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `;

  try {
    const response = await fetch(`${API_URL}/api/pagamentos/gerar-pix`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:  briefingData.nome,
        email: briefingData.email,
        valor: PACOTE.entrada, // R$ 37,50
      }),
    });

    const data = await response.json();
    if (!data.sucesso) throw new Error(data.erro);

    _pixPaymentId = data.paymentId;

    // Renderiza QR Code + copia-e-cola
    pixContainer.innerHTML = `
      <div style="text-align:center;">

        <p style="
          font-size:0.8rem;
          color:var(--green);
          font-weight:700;
          letter-spacing:0.08em;
          text-transform:uppercase;
          margin-bottom:4px;
        ">Entrada — ${fmt(PACOTE.entrada)}</p>

        <p style="color:var(--muted);font-size:0.82rem;margin-bottom:16px;">
          Escaneie o QR Code pelo app do seu banco
        </p>

        <img
          src="data:image/png;base64,${data.qrCodeBase64}"
          alt="QR Code Pix"
          style="
            width:190px;
            border-radius:12px;
            border:3px solid rgba(255,255,255,0.08);
            margin-bottom:20px;
          "
        />

        <p style="color:var(--muted);font-size:0.78rem;margin-bottom:8px;">
          Ou copie o código Pix abaixo:
        </p>

        <div style="
          background:rgba(255,255,255,0.04);
          border:1px solid rgba(255,255,255,0.08);
          border-radius:8px;
          padding:10px 12px;
          font-size:0.7rem;
          word-break:break-all;
          color:rgba(255,255,255,0.5);
          margin-bottom:14px;
          text-align:left;
          max-height:64px;
          overflow:hidden;
        ">${data.qrCode}</div>

        <button
          id="btnCopiarPix"
          onclick="copiarCodigoPix('${data.qrCode}')"
          style="
            width:100%;
            padding:12px;
            border:none;
            border-radius:10px;
            background:var(--green);
            color:#000;
            font-weight:700;
            font-size:0.9rem;
            cursor:pointer;
            transition:opacity 0.2s;
          "
        >Copiar código Pix</button>

        <div id="pixStatusBadge" style="
          margin-top:20px;
          padding:10px 16px;
          border-radius:8px;
          background:rgba(255,209,70,0.08);
          border:1px solid rgba(255,209,70,0.2);
          color:#ffd166;
          font-size:0.82rem;
          font-weight:600;
          display:flex;
          align-items:center;
          gap:8px;
          justify-content:center;
        ">
          <span id="pixStatusDot" style="
            width:8px;height:8px;
            border-radius:50%;
            background:#ffd166;
            animation:pulse 1.4s ease-in-out infinite;
          "></span>
          <span id="pixStatusText">Aguardando pagamento...</span>
        </div>

        <style>
          @keyframes pulse {
            0%,100% { opacity:1; }
            50%      { opacity:0.3; }
          }
        </style>

      </div>
    `;

    // Inicia polling de status
    iniciarPolling(data.paymentId);

  } catch (err) {
    pixContainer.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--red);">
        <p style="font-size:1.4rem;margin-bottom:8px;">❌</p>
        <p style="font-size:0.9rem;margin-bottom:16px;">${err.message}</p>
        <button
          onclick="gerarPix()"
          style="
            padding:10px 24px;
            border:1px solid var(--red);
            border-radius:8px;
            background:transparent;
            color:var(--red);
            cursor:pointer;
            font-weight:600;
          "
        >Tentar novamente</button>
      </div>
    `;
    showToast('❌ Erro ao gerar Pix: ' + err.message, 'error');
  }
}


/* ── COPIAR CÓDIGO PIX ── */
function copiarCodigoPix(codigo) {
  const btn = document.getElementById('btnCopiarPix');
  navigator.clipboard.writeText(codigo)
    .then(() => {
      showToast('✅ Código Pix copiado!', 'success');
      if (btn) {
        btn.textContent = '✓ Copiado!';
        btn.style.background = '#03d18e';
        setTimeout(() => {
          btn.textContent = 'Copiar código Pix';
          btn.style.background = 'var(--green)';
        }, 2500);
      }
    })
    .catch(() => showToast('Copie manualmente o código acima.', 'info'));
}


/* ── POLLING DE STATUS ── */
function iniciarPolling(paymentId) {
  pararPolling(); // garante que não tenha outro rodando

  _pixInterval = setInterval(async () => {
    try {
      const res  = await fetch(`${API_URL}/api/pagamentos/status/${paymentId}`);
      const data = await res.json();

      atualizarStatusBadge(data.status);

      if (data.status === 'approved') {
        pararPolling();
        showToast('🎉 Pagamento confirmado!', 'success');
        setTimeout(() => finalizarPedido(paymentId), 1200);
      }

      if (data.status === 'rejected' || data.status === 'cancelled') {
        pararPolling();
        showToast('❌ Pagamento recusado. Tente novamente.', 'error');
        atualizarStatusBadge('rejected');
      }

    } catch (e) {
      console.warn('Erro ao checar status:', e);
    }
  }, 5000); // checa a cada 5 segundos

  // Para após 30 minutos (Pix expira)
  setTimeout(() => {
    pararPolling();
    atualizarStatusBadge('expired');
  }, 30 * 60 * 1000);
}

function pararPolling() {
  if (_pixInterval) {
    clearInterval(_pixInterval);
    _pixInterval = null;
  }
}

function atualizarStatusBadge(status) {
  const badge    = document.getElementById('pixStatusBadge');
  const dot      = document.getElementById('pixStatusDot');
  const texto    = document.getElementById('pixStatusText');
  if (!badge || !dot || !texto) return;

  const config = {
    pending:  { cor: '#ffd166', bg: 'rgba(255,209,70,0.08)',  borda: 'rgba(255,209,70,0.2)',  txt: 'Aguardando pagamento...' },
    approved: { cor: '#06ffa5', bg: 'rgba(6,255,165,0.08)',   borda: 'rgba(6,255,165,0.2)',   txt: '✅ Pagamento confirmado!' },
    rejected: { cor: '#ff4d6d', bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.2)',  txt: '❌ Pagamento recusado'    },
    cancelled:{ cor: '#ff4d6d', bg: 'rgba(255,77,109,0.08)',  borda: 'rgba(255,77,109,0.2)',  txt: '❌ Pagamento cancelado'   },
    expired:  { cor: '#aaa',    bg: 'rgba(170,170,170,0.08)', borda: 'rgba(170,170,170,0.2)', txt: '⏰ Pix expirado. Gere um novo.' },
  };

  const c = config[status] || config.pending;
  badge.style.background   = c.bg;
  badge.style.borderColor  = c.borda;
  badge.style.color        = c.cor;
  dot.style.background     = c.cor;
  dot.style.animation      = status === 'pending' ? 'pulse 1.4s ease-in-out infinite' : 'none';
  texto.textContent        = c.txt;
}


/* ── FINALIZAR PEDIDO (após pagamento aprovado) ── */
async function finalizarPedido(paymentId) {
  const formData = new FormData();

  formData.append('nome',       briefingData.nome);
  formData.append('whatsapp',   briefingData.whatsapp);
  formData.append('marca',      briefingData.marca);
  formData.append('oQueVende',  briefingData.oQueVende);
  formData.append('cores',      briefingData.cores      || '');
  formData.append('referencia', briefingData.referencia || '');
  formData.append('infoExtra',  briefingData.infoExtra  || '');
  formData.append('logo',       briefingData.logo.includes('Sim')  ? 'sim' : 'nao');
  formData.append('fotos',      briefingData.fotos.includes('Sim') ? 'sim' : 'nao');
  formData.append('mpPaymentId', paymentId); // ID do pagamento MP

  try {
    const response = await fetch(`${API_URL}/api/pedidos`, {
      method: 'POST',
      body:   formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || 'Erro ao registrar pedido.');

    // Preenche resumo na tela de sucesso
    const resumoEl = document.getElementById('sucessoResumo');
    if (resumoEl) {
      resumoEl.innerHTML = `
        <strong style="color:var(--text);display:block;margin-bottom:8px;">📋 Resumo do pedido</strong>
        <b>ID:</b> ${data.pedidoId}<br>
        <b>Pagamento MP:</b> #${paymentId}<br>
        <b>Nome:</b> ${briefingData.nome}<br>
        <b>WhatsApp:</b> ${briefingData.whatsapp}<br>
        <b>Marca:</b> ${briefingData.marca}<br>
        <b>Produto/Serviço:</b> ${briefingData.oQueVende}<br>
        <b>Cores:</b> ${briefingData.cores}<br>
        <b>Logo:</b> ${briefingData.logo}<br>
        <b>Fotos:</b> ${briefingData.fotos}<br>
        <b>Pagamento:</b> ✅ Confirmado via Pix
      `;
    }

    // Monta link do WhatsApp
    const msg = buildWhatsappMsg(data.pedidoId, paymentId);
    if (btnWhatsappFinal) {
      btnWhatsappFinal.href = `https://wa.me/${WHATSAPP_NUM}?text=${msg}`;
      btnWhatsappFinal.setAttribute('target', '_blank');
    }

    showStep(stepSucesso);
    cartItems = [];
    updateCartCount();

  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    console.error('Erro ao finalizar pedido:', err);
  }
}


/* ── MONTAR MENSAGEM WHATSAPP ── */
function buildWhatsappMsg(pedidoId, paymentId) {
  const linhas = [
    `Olá Fabio! Acabei de finalizar meu pedido. 🎉`,
    ``,
    `*📋 Dados do pedido:*`,
    `• ID: ${pedidoId}`,
    `• Pagamento Mercado Pago: #${paymentId}`,
    `• Nome: ${briefingData.nome}`,
    `• WhatsApp: ${briefingData.whatsapp}`,
    `• Marca: ${briefingData.marca}`,
    `• O que vende: ${briefingData.oQueVende}`,
    `• Cores: ${briefingData.cores}`,
    `• Tem logo: ${briefingData.logo}`,
    `• Tem fotos: ${briefingData.fotos}`,
    `• Referência: ${briefingData.referencia}`,
    `• Info extra: ${briefingData.infoExtra}`,
    ``,
    `*💳 Pagamento:*`,
    `• ✅ Pix confirmado via Mercado Pago (entrada R$ 37,50)`,
    ``,
    `Aguardo o início do desenvolvimento! 🚀`,
  ];
  return encodeURIComponent(linhas.join('\n'));
}