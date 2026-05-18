/* ============================================
   FABIO ROBERTO — LANDING PAGE
   script.js
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
    const w = canvas.width;
    const h = canvas.height;
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

  let fx = 0, fy = 0;
  let mx = 0, my = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  function animateFollower() {
    fx += (mx - fx) * 0.14;
    fy += (my - fy) * 0.14;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

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


/* ── SCROLL REVEAL (IntersectionObserver) ── */
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
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
})();


/* ── FLOATING WA — hide on mobile when CTA is visible ── */
(function initFloatWa() {
  const floatWa    = document.getElementById('floatWa');
  const ctaSection = document.querySelector('.cta-final');
  if (!floatWa || !ctaSection) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      floatWa.style.opacity    = entry.isIntersecting ? '0' : '1';
      floatWa.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
    });
  }, { threshold: 0.3 });

  observer.observe(ctaSection);
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


/* ── FEAT CARDS — Tilt effect on desktop ── */
(function initTilt() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  document.querySelectorAll('.feat-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect   = card.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const cx     = rect.width  / 2;
      const cy     = rect.height / 2;
      const rotX   = ((y - cy) / cy) * -6;
      const rotY   = ((x - cx) / cx) *  6;
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