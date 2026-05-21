/* ============================================
   FABIO ROBERTO — LANDING PAGE
   script.js — COMPLETO (noise + cursor + nav +
   reveals + carrinho + briefing + pix AUTOMÁTICO)
============================================ */

/* ── NOISE CANVAS ── */
(function initNoise() {
  const canvas = document.getElementById('noiseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function drawNoise() {
    const w = canvas.width, h = canvas.height;
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      data[i] = data[i+1] = data[i+2] = v;
      data[i+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  resize();
  window.addEventListener('resize', resize);
  setInterval(drawNoise, 80);
  drawNoise();
})();


/* ── CUSTOM CURSOR ── */
(function initCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const cursor   = document.getElementById('cursor');
  const follower = document.getElementById('cursorFollower');
  if (!cursor || !follower) return;

  let fx = 0, fy = 0, mx = 0, my = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  (function animateFollower() {
    fx += (mx - fx) * 0.14;
    fy += (my - fy) * 0.14;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(animateFollower);
  })();

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.classList.add('hovered');
      follower.classList.add('hovered');
    });
    el.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovered');
      follower.classList.remove('hovered');
    });
  });
})();


/* ── NAVBAR SCROLL ── */
(function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ── HERO REVEALS (staggered on load) ── */
(function initHeroReveal() {
  const elements = document.querySelectorAll('.reveal');
  function revealEl(el) {
    const delay = parseInt(el.dataset.delay || 0);
    setTimeout(() => el.classList.add('visible'), delay);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => elements.forEach(revealEl));
  } else {
    elements.forEach(revealEl);
  }
})();


/* ── SCROLL REVEAL ── */
(function initScrollReveal() {
  const elements = document.querySelectorAll('.scroll-reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el    = entry.target;
      const delay = parseInt(el.dataset.delay || 0);
      setTimeout(() => el.classList.add('visible'), delay);
      observer.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  elements.forEach(el => observer.observe(el));
})();


/* ── SMOOTH ANCHOR SCROLL ── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();


/* ── FEAT CARDS — Tilt effect ── */
(function initTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll('.feat-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -6;
      const rotY = ((x - cx) / cx) * 6;
      card.style.transform = `translateY(-6px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
})();


/* ── PRICE COUNTER ANIMATION ── */
(function initPriceCounter() {
  const priceNum = document.querySelector('.price-num');
  if (!priceNum) return;

  const target = 75;
  let animated = false;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || animated) return;
      animated = true;

      let start = 200;
      const duration = 900;
      const startTime = performance.now();

      function tick(now) {
        const elapsed  = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = Math.round(start + (target - start) * eased);
        priceNum.textContent = current;
        if (progress < 1) requestAnimationFrame(tick);
        else priceNum.textContent = target;
      }
      requestAnimationFrame(tick);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  observer.observe(priceNum);
})();


/* ════════════════════════════════════════════
   CARRINHO + BRIEFING + PIX AUTOMÁTICO
============================================ */

/* ── DADOS DO PACOTE ── */
const PACOTE = {
  id:        'site-basico',
  name:      'Site Profissional Completo',
  descricao: 'Página única · Mobile First · Pix Direto · 5 Revisões',
  preco:     75.00,
  entrada:   37.50,
};

/* ── CONSTANTES ── */
const WHATSAPP_NUM = '5511964676886';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://SEU-APP.onrender.com'; 

/* ── ESTADO ── */
let cartItems       = [];
let briefingData    = {};
let comprovanteFile = null;
let mpCopiaECola    = ''; // Armazena a chave copia e cola do MP

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
const btnFinalizar      = document.getElementById('btnFinalizar');
const btnWhatsappFinal  = document.getElementById('btnWhatsappFinal');
const btnCopyPix        = document.getElementById('btnCopyPix');
const heroCta           = document.getElementById('heroCta');
const finalCta          = document.getElementById('finalCta');

const comprovanteInput  = document.getElementById('comprovanteFile');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const uploadPreview     = document.getElementById('uploadPreview');
const previewFileName   = document.getElementById('previewFileName');


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

// Step 2 → 3 (Gera o Pix Dinâmico no Mercado Pago)
btnProsseguirPix && btnProsseguirPix.addEventListener('click', async () => {
  if (!validateBriefing()) return;
  collectBriefing();
  
  // Chama a API do Mercado Pago antes de exibir a tela do Pix
  const sucessoPix = await carregarPixMercadoPago();
  if (sucessoPix) {
    showStep(stepPix);
  }
});

// Step 3 → 2
btnVoltarBriefing && btnVoltarBriefing.addEventListener('click', () => showStep(stepBriefing));

// Step 3 → 4
btnFinalizar && btnFinalizar.addEventListener('click', () => {
  if (!comprovanteFile) {
    showToast('⚠️ Anexe o comprovante do Pix para finalizar!', 'warn');
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.style.borderColor = 'var(--red)';
      setTimeout(() => uploadArea.style.borderColor = '', 2200);
    }
    return;
  }
  finalizarPedido();
});


/* ── FUNÇÃO EXTRA: INTEGRAR AO MERCADO PAGO ── */
/* ── FUNÇÃO EXTRA: INTEGRAR AO MERCADO PAGO ── */
async function carregarPixMercadoPago() {
  if (btnProsseguirPix) {
    btnProsseguirPix.disabled = true;
    btnProsseguirPix.textContent = '⏳ Gerando Pix...';
  }

  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer APP_USR-SEU-TOKEN-DE-PRODUCAO-AQUI',
        'X-Idempotency-Key': Date.now().toString()
      },
      body: JSON.stringify({
        transaction_amount: 37.50,
        description: 'Site Profissional - Entrada',
        payment_method_id: 'pix',
        payer: {
          email: briefingData.email,
          first_name: briefingData.nome.split(' ')[0],
          last_name:  briefingData.nome.split(' ').slice(1).join(' ') || 'Cliente'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Falha ao gerar o Pix.');
    }

    const pixInfo = data.point_of_interaction?.transaction_data;
    if (!pixInfo) throw new Error('QR Code não retornado pelo Mercado Pago.');

    mpCopiaECola = pixInfo.qr_code; // string copia e cola

    // Exibe o QR Code
    const pixBox = document.querySelector('.pix-box');
    if (pixBox) {
      // Esconde elementos estáticos
      ['#pixTextsEstaticos', '.pix-divider'].forEach(sel => {
        const el = pixBox.querySelector(sel);
        if (el) el.style.display = 'none';
      });

      // Cria container do QR
      let qrContainer = document.getElementById('qrContainer');
      if (!qrContainer) {
        qrContainer = document.createElement('div');
        qrContainer.id = 'qrContainer';
        qrContainer.style.cssText = `
          background:#fff;
          border-radius:12px;
          padding:12px;
          margin:8px auto;
          width:220px;
          display:flex;
          justify-content:center;
        `;
        const qrImg = document.createElement('img');
        qrImg.id = 'imgQrCodeMercadoPago';
        qrImg.alt = 'QR Code Pix';
        qrImg.style.cssText = 'width:196px;height:196px;display:block;';
        qrContainer.appendChild(qrImg);
        btnCopyPix.parentNode.insertBefore(qrContainer, btnCopyPix);
      }

      document.getElementById('imgQrCodeMercadoPago').src =
        `data:image/png;base64,${pixInfo.qr_code_base64}`;
    }

    // Garante botão copiar visível
    if (btnCopyPix) {
      btnCopyPix.style.cssText = 'display:inline-block!important;margin:8px auto!important;';
    }

    showToast('⚡ Pix gerado com sucesso!', 'success');
    return true;

  } catch (err) {
    showToast(`❌ Erro: ${err.message}`, 'error');
    console.error(err);
    return false;
  } finally {
    if (btnProsseguirPix) {
      btnProsseguirPix.disabled = false;
      btnProsseguirPix.textContent = 'Ir para o Pix →';
    }
  }
}


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

  // Como o mercado pago precisa de um email válido, criamos um fallback baseado no nome se não houver campo de email no seu form
  const emailInput = document.getElementById('emailCliente');
  const emailVal = emailInput ? emailInput.value.trim() : `${document.getElementById('nomeCliente').value.trim().toLowerCase().replace(/\s+/g, '')}@teste.com`;

  briefingData = {
    nome:       document.getElementById('nomeCliente').value.trim(),
    whatsapp:   document.getElementById('whatsappCliente').value.trim(),
    email:      emailVal,
    marca:      document.getElementById('nomeMarca').value.trim(),
    oQueVende:  document.getElementById('oQueVende').value.trim(),
    cores:      document.getElementById('cores').value.trim()      || 'Não informado',
    logo:       logoVal  === 'sim' ? 'Sim, tem logo'               : 'Não tem logo',
    fotos:      fotosVal === 'sim' ? 'Sim, tem fotos'              : 'Não tem fotos / precisa de ajuda',
    referencia: document.getElementById('referencia').value.trim() || 'Nenhuma',
    infoExtra:  document.getElementById('infoExtra').value.trim()  || 'Nenhuma',
  };
}


/* ── UPLOAD DE COMPROVANTE ── */
comprovanteInput && comprovanteInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!tiposPermitidos.includes(file.type)) {
    showToast('⚠️ Formato inválido! Use JPG, PNG ou PDF.', 'error');
    comprovanteInput.value = '';
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️ Arquivo muito grande! Máximo 10MB.', 'error');
    comprovanteInput.value = '';
    return;
  }

  comprovanteFile = file;

  if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
  if (uploadPreview)     uploadPreview.classList.remove('hidden');
  if (previewFileName)   previewFileName.textContent = file.name;

  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.style.borderColor = 'var(--green)';
    uploadArea.style.borderStyle = 'solid';
    uploadArea.style.background  = 'rgba(6,255,165,0.04)';
  }

  showToast('✅ Comprovante anexado com sucesso!', 'success');
});

// Drag & drop
(function initDragDrop() {
  const uploadArea = document.getElementById('uploadArea');
  if (!uploadArea) return;

  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.style.borderColor = 'var(--green)';
    uploadArea.style.background  = 'rgba(6,255,165,0.06)';
  });

  uploadArea.addEventListener('dragleave', () => {
    if (!comprovanteFile) {
      uploadArea.style.borderColor = '';
      uploadArea.style.background  = '';
    }
  });

  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    comprovanteInput.files = dt.files;
    comprovanteInput.dispatchEvent(new Event('change'));
  });
})();


/* ── COPIAR CHAVE PIX (Modificado para usar o Copia e Cola do Mercado Pago) ── */
btnCopyPix && btnCopyPix.addEventListener('click', () => {
  // Se o mercado pago gerou o copia e cola usa ele, se não usa o seu email padrão como plano B
  const chaveParaCopiar = mpCopiaECola || 'fabio123201436@gmail.com';
  
  navigator.clipboard.writeText(chaveParaCopiar)
    .then(() => {
      btnCopyPix.textContent      = '✓ Copiado!';
      btnCopyPix.style.background = 'var(--green)';
      btnCopyPix.style.color      = '#000';
      showToast('✅ Código Copia e Cola copiado!', 'success');
      setTimeout(() => {
        btnCopyPix.textContent      = 'Copiar';
        btnCopyPix.style.background = '';
        btnCopyPix.style.color      = '';
      }, 2500);
    })
    .catch(() => {
      showToast('Erro ao copiar automaticamente.', 'warn');
    });
});


/* ── FINALIZAR PEDIDO (com API backend) ── */
async function finalizarPedido() {
  const formData = new FormData();

  formData.append('nome',       briefingData.nome);
  formData.append('whatsapp',   briefingData.whatsapp);
  formData.append('marca',      briefingData.marca);
  formData.append('oQueVende',  briefingData.oQueVende);
  formData.append('cores',      briefingData.cores      || '');
  formData.append('referencia', briefingData.referencia || '');
  formData.append('infoExtra',  briefingData.infoExtra  || '');
  formData.append('logo',  briefingData.logo.includes('Sim')  ? 'sim' : 'nao');
  formData.append('fotos', briefingData.fotos.includes('Sim') ? 'sim' : 'nao');

  if (comprovanteFile) {
    formData.append('comprovante', comprovanteFile);
  }

  if (btnFinalizar) {
    btnFinalizar.disabled    = true;
    btnFinalizar.textContent = '⏳ Enviando...';
  }

  try {
    const response = await fetch(`${API_URL}/api/pedidos`, {
      method: 'POST',
      body:    formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.erro || 'Erro ao enviar pedido.');
    }

    const resumoEl = document.getElementById('sucessoResumo');
    if (resumoEl) {
      resumoEl.innerHTML = `
        <strong style="color:var(--text);display:block;margin-bottom:8px;">📋 Resumo do pedido</strong>
        <b>ID:</b> ${data.pedidoId}<br>
        <b>Nome:</b> ${briefingData.nome}<br>
        <b>WhatsApp:</b> ${briefingData.whatsapp}<br>
        <b>Marca:</b> ${briefingData.marca}<br>
        <b>Produto/Serviço:</b> ${briefingData.oQueVende}<br>
        <b>Cores:</b> ${briefingData.cores}<br>
        <b>Logo:</b> ${briefingData.logo}<br>
        <b>Fotos:</b> ${briefingData.fotos}<br>
        <b>Comprovante:</b> ${comprovanteFile?.name || 'Não enviado'}
      `;
    }

    const msg = buildWhatsappMsg(data.pedidoId);
    if (btnWhatsappFinal) {
      btnWhatsappFinal.href = `https://wa.me/${WHATSAPP_NUM}?text=${msg}`;
      btnWhatsappFinal.setAttribute('target', '_blank');
    }

    showStep(stepSucesso);

    cartItems       = [];
    comprovanteFile = null;
    mpCopiaECola    = '';
    updateCartCount();

    showToast('🎉 Pedido enviado com sucesso!', 'success');

  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    console.error('Erro ao finalizar pedido:', err);
  } finally {
    if (btnFinalizar) {
      btnFinalizar.disabled    = false;
      btnFinalizar.textContent = '✅ Finalizar pedido';
    }
  }
}


/* ── MONTAR MENSAGEM WHATSAPP ── */
function buildWhatsappMsg(pedidoId) {
  const linhas = [
    `Olá Fabio! Acabei de fechar meu pedido pelo site. 🎉`,
    ``,
    `*📋 Dados do pedido:*`,
    `• ID: ${pedidoId}`,
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
    `• Já realizei o Pix de entrada (R$ 37,50) processado automaticamente!`,
    ``,
    `⚠️ *Vou enviar o comprovante aqui agora!*`,
    ``,
    `Aguardo o início do desenvolvimento! 🚀`,
  ];
  return encodeURIComponent(linhas.join('\n'));
}


/* ── SCROLL REVEAL EXTRA (feature-card, step, ni-item) ── */
(function initExtraReveal() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `.anim-visible { opacity: 1 !important; transform: translateY(0) !important; }`;
  document.head.appendChild(styleEl);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('anim-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .step, .ni-item').forEach((el, i) => {
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(24px)';
    el.style.transition = `opacity 0.55s ease ${i * 55}ms, transform 0.55s ease ${i * 55}ms`;
    observer.observe(el);
  });
})();