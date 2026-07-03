/**
 * CHANDRU LG — CINEMATIC SYSTEM v4
 * GSAP 3.12 · Lenis smooth scroll · magnetic buttons
 * scroll progress · counters · canvas mesh · cursor
 * All sections: hero portrait parallax · experience photo tilt
 * gallery wipe · credential clip-path reveals
 */

const HAS_GSAP  = typeof gsap !== 'undefined';
const REDUCED   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH     = window.matchMedia('(hover: none)').matches;

if (HAS_GSAP) {
  gsap.registerPlugin(ScrollTrigger);
  // ignoreMobileResize stops ScrollTrigger from recalculating every pin/trigger
  // when the mobile address bar shows/hides — that recalculation storm is a
  // very common cause of scroll "hitching" on phones.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initMeshCanvas();
  initOverlayNav();
  initTypewriter();
  initContactForm();
  initSmoothAnchors();

  if (HAS_GSAP && !REDUCED) {
    initLenis();
    initPreloader();      // preloader first — it calls revealHero() internally
    initCustomCursor();
    initMissionReveal();
    initCounters();
    initProjectHorizontalScroll();
    initGalleryReveals();
    initCredentialReveals();
    initExpPhotoTilt();
    initCardHovers();
    initMagneticButtons();
    initTextScramble();
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  } else {
    // No GSAP / reduced motion — instant show
    document.getElementById('preloader')?.style && (document.getElementById('preloader').style.display = 'none');
    document.body.style.overflow = '';
    document.querySelectorAll('.eyebrow,.hero-title .line,.hero-role,.hero-bio,.hero-actions,.hero-portrait,.scroll-cue').forEach(el => {
      el.style.opacity = '1'; el.style.transform = 'none';
    });
    document.querySelector('.hud-chrome')?.style && (document.querySelector('.hud-chrome').style.opacity = '1');
    initSimpleReveals();
  }
});

/* =========================================================
   LENIS MOMENTUM SCROLL
   ========================================================= */
function initLenis() {
  if (typeof Lenis === 'undefined') return;
  const lenis = new Lenis({
    duration: TOUCH ? 0.7 : 1.0,           // shorter glide on touch — long durations are what feel "stuck" on phones
    easing: t => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    syncTouch: false,                      // let touch devices use native momentum — fighting it is the #1 cause of mobile scroll jank
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.fps(60);
  // Force GSAP to use 3D transforms everywhere by default — keeps every
  // animated element on its own GPU layer instead of falling back to
  // layout-triggering 2D transforms mid-scroll.
  gsap.defaults({ force3D: true });
  window.__lenis = lenis;
}

/* =========================================================
   SCROLL PROGRESS BAR
   ========================================================= */
function initScrollProgress() {
  const fill = document.getElementById('scrollProg');
  if (!fill) return;
  if (HAS_GSAP && !REDUCED) {
    ScrollTrigger.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: s => fill.style.width = (s.progress * 100) + '%',
    });
  } else {
    window.addEventListener('scroll', () => {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      fill.style.width = (pct * 100) + '%';
    }, { passive: true });
  }
}

/* =========================================================
   PRELOADER — kinetic name assembly then punch-zoom
   ========================================================= */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const nameEl    = document.getElementById('preloaderName');
  const counter   = document.getElementById('preloaderCounter');
  const status    = document.getElementById('preloaderStatus');
  const barFill   = document.getElementById('preloaderBarFill');
  if (!preloader || !nameEl) return;

  // Split name into letters
  const raw = nameEl.textContent;
  nameEl.innerHTML = raw.split('').map(ch => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  const letters = nameEl.querySelectorAll('span');
  document.body.style.overflow = 'hidden';

  const statuses = ['INITIALIZING','COMPILING MODULES','DECRYPTING IDENTITY','SYSTEM READY'];
  const prog = { val: 0 };
  const tl = gsap.timeline();

  // Letters stagger in
  tl.to(letters, { opacity: 1, y: 0, duration: .85, stagger: .045, ease: 'power3.out' });

  // Counter + bar fills simultaneously
  tl.to(prog, {
    val: 100, duration: 1.55, ease: 'power1.inOut',
    onUpdate: () => {
      const v = Math.round(prog.val);
      counter.textContent = String(v).padStart(2,'0') + '%';
      barFill.style.width = v + '%';
      status.textContent  = statuses[Math.min(statuses.length - 1, Math.floor(v / 25))];
    },
  }, 0);

  // Hold a beat
  tl.to({}, { duration: .3 });

  // Punch-zoom out — wordmark surges toward viewer and dissolves
  tl.to(nameEl, { scale: 7, opacity: 0, duration: .85, ease: 'power4.in' });
  tl.to(preloader, {
    opacity: 0, duration: .55, ease: 'power2.in',
    onComplete: () => { preloader.style.display = 'none'; document.body.style.overflow = ''; ScrollTrigger.refresh(); },
  }, '<.2');

  // Hero entrance fires while preloader fades
  tl.call(revealHero, [], '<.1');
}

function revealHero() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.eyebrow',             { opacity: 1, y: 0, duration: .65 }, 0)
    .to('.hero-title .line',    { opacity: 1, y: 0, duration: .9, stagger: .1 }, .1)
    .to('.hero-role',           { opacity: 1, y: 0, duration: .65 }, .42)
    .to('.hero-bio',            { opacity: 1, y: 0, duration: .65 }, .52)
    .to('.hero-actions',        { opacity: 1, y: 0, duration: .65 }, .62)
    .to('.hero-portrait',       { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power4.out' }, .38)
    .to('.scroll-cue',          { opacity: 1, duration: .55 }, .85)
    .to('.hud-chrome',          { opacity: 1, duration: .7 }, .5);

  // Portrait 3D parallax on mousemove
  if (!TOUCH) {
    const portrait = document.getElementById('heroPortrait');
    if (portrait) {
      const rX = gsap.quickTo(portrait, 'rotationX', { duration: .7, ease: 'power3.out' });
      const rY = gsap.quickTo(portrait, 'rotationY', { duration: .7, ease: 'power3.out' });
      gsap.set(portrait, { transformPerspective: 900 });
      window.addEventListener('mousemove', e => {
        const nx = e.clientX / window.innerWidth  - .5;
        const ny = e.clientY / window.innerHeight - .5;
        rY(nx * 12); rX(-ny * 12);
      });
    }
  }
}

/* =========================================================
   CUSTOM CURSOR
   ========================================================= */
function initCustomCursor() {
  if (TOUCH) return;
  const dot   = document.getElementById('cursorDot');
  const ring  = document.getElementById('cursorRing');
  const label = document.getElementById('cursorLabel');
  if (!dot || !ring) return;
  const dX = gsap.quickTo(dot,  'x', { duration: .12, ease: 'power3.out' });
  const dY = gsap.quickTo(dot,  'y', { duration: .12, ease: 'power3.out' });
  const rX = gsap.quickTo(ring, 'x', { duration: .38, ease: 'power3.out' });
  const rY = gsap.quickTo(ring, 'y', { duration: .38, ease: 'power3.out' });
  window.addEventListener('mousemove', e => { dX(e.clientX); dY(e.clientY); rX(e.clientX); rY(e.clientY); });
  document.querySelectorAll('[data-cursor]').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.classList.add('is-active'); label.textContent = el.dataset.cursorText || ''; });
    el.addEventListener('mouseleave', () => { ring.classList.remove('is-active'); label.textContent = ''; });
  });
}

/* =========================================================
   ANIMATED MESH CANVAS — hero background
   ========================================================= */
function initMeshCanvas() {
  const canvas = document.getElementById('meshCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  // Cap internal resolution — the blobs are soft gradients, they don't need
  // full device-pixel sharpness. This cuts fill-rate cost by 60-75% on
  // high-DPI phones without any visible quality loss.
  const RENDER_SCALE = 0.55;
  const dpr = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALE;
  let w, h, running = false, rafId = null;

  const resize = () => { w = canvas.width = canvas.offsetWidth * dpr; h = canvas.height = canvas.offsetHeight * dpr; };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const blobs = [
    { x: .22, y: .32, r: .38, color: '139,92,246', sp: .00016, ph: 0 },
    { x: .78, y: .22, r: .32, color: '0,229,200',  sp: .0002,  ph: 2.1 },
    { x: .6,  y: .78, r: .34, color: '255,176,32', sp: .00014, ph: 4.4 },
  ];

  if (REDUCED) {
    blobs.forEach(b => {
      const grd = ctx.createRadialGradient(b.x*w,b.y*h,0,b.x*w,b.y*h,b.r*Math.max(w,h));
      grd.addColorStop(0, `rgba(${b.color},.14)`); grd.addColorStop(1, `rgba(${b.color},0)`);
      ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
    });
    return;
  }

  const draw = t => {
    if (!running) return;
    ctx.clearRect(0,0,w,h);
    blobs.forEach(b => {
      const x = (b.x + Math.sin(t * b.sp + b.ph) * .07) * w;
      const y = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * .07) * h;
      const r = b.r * Math.max(w, h);
      const grd = ctx.createRadialGradient(x,y,0,x,y,r);
      grd.addColorStop(0, `rgba(${b.color},.17)`); grd.addColorStop(1, `rgba(${b.color},0)`);
      ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
    });
    rafId = requestAnimationFrame(draw);
  };

  const start = () => { if (running) return; running = true; rafId = requestAnimationFrame(draw); };
  const stop  = () => { running = false; if (rafId) cancelAnimationFrame(rafId); };

  // Only burn CPU/GPU on this while the hero is actually visible.
  // Scrolling past it — the rest of the site — now costs zero.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop(), { threshold: 0 });
    io.observe(canvas.closest('.hero') || canvas);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (canvas.closest('.hero')?.getBoundingClientRect().bottom > 0) start();
  });
}

/* =========================================================
   OVERLAY NAV
   ========================================================= */
function initOverlayNav() {
  const toggle  = document.getElementById('menuToggle');
  const close   = document.getElementById('menuClose');
  const overlay = document.getElementById('overlayNav');
  if (!toggle || !overlay) return;
  const links = overlay.querySelectorAll('.overlay-link');
  const open = () => {
    overlay.classList.add('is-open');
    document.body.classList.add('nav-open');
    if (HAS_GSAP) {
      gsap.to(overlay, { clipPath: 'inset(0 0 0% 0)', duration: .7, ease: 'power4.inOut' });
      gsap.fromTo(links, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: .55, stagger: .055, delay: .2, ease: 'power3.out' });
    } else {
      overlay.style.clipPath = 'inset(0 0 0% 0)';
    }
  };
  const closeNav = () => {
    if (HAS_GSAP) {
      gsap.to(overlay, { clipPath: 'inset(0 0 100% 0)', duration: .6, ease: 'power4.inOut',
        onComplete: () => { overlay.classList.remove('is-open'); document.body.classList.remove('nav-open'); } });
    } else {
      overlay.style.clipPath = 'inset(0 0 100% 0)'; overlay.classList.remove('is-open'); document.body.classList.remove('nav-open');
    }
  };
  toggle.addEventListener('click', open);
  close?.addEventListener('click', closeNav);
  links.forEach(l => l.addEventListener('click', closeNav));
}

/* =========================================================
   TYPEWRITER ROLE LINE
   ========================================================= */
function initTypewriter() {
  const target = document.getElementById('typewriter');
  if (!target) return;
  const phrases = ['Engineers AI Architecture','Audits Cryptographic Primitives','Deploys Multilingual Gen-AI','Optimizes MLOps Pipelines','Crafts Contextual Interfaces','Web Developer @ Codynex Technology'];
  let pI = 0, cI = 0, del = false, speed = 70;
  const tick = () => {
    const p = phrases[pI];
    del ? cI-- : cI++;
    target.innerHTML = p.substring(0, cI) + '<span class="cursor-blink">_</span>';
    speed = del ? 35 : 68;
    if (!del && cI === p.length)  { del = true;  speed = 1900; }
    if  (del && cI === 0)         { del = false; pI = (pI + 1) % phrases.length; speed = 380; }
    setTimeout(tick, speed);
  };
  tick();
}

/* =========================================================
   MISSION — scroll-scrubbed word reveal
   ========================================================= */
function initMissionReveal() {
  const el = document.getElementById('missionText');
  if (!el) return;
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => `<span class="word">${w}</span>`).join(' ');
  const wordEls = el.querySelectorAll('.word');
  ScrollTrigger.create({
    trigger: el, start: 'top 75%', end: 'bottom 45%', scrub: true,
    onUpdate: s => {
      const lit = Math.floor(s.progress * wordEls.length);
      wordEls.forEach((w, i) => w.classList.toggle('is-lit', i <= lit));
    },
  });

  // Meta blocks stagger in
  gsap.from('.meta-block', {
    opacity: 0, y: 30, stagger: .15, duration: .8, ease: 'power3.out',
    scrollTrigger: { trigger: '.mission-meta', start: 'top 85%', once: true },
  });
}

/* =========================================================
   EXPERIENCE PHOTO — parallax tilt on scroll
   ========================================================= */
function initExpPhotoTilt() {
  const wrap = document.getElementById('expPhoto');
  if (!wrap) return;
  gsap.from(wrap, { clipPath: 'inset(0 0 100% 0)', opacity: 0, duration: 1.1, ease: 'power4.out',
    scrollTrigger: { trigger: wrap, start: 'top 85%', once: true } });
  gsap.from('.exp-cert-mini', { opacity: 0, x: 30, duration: .8, delay: .3, ease: 'power3.out',
    scrollTrigger: { trigger: '.exp-cert-mini', start: 'top 88%', once: true } });
  gsap.from('.es', { opacity: 0, x: -24, stagger: .1, duration: .7, ease: 'power3.out',
    scrollTrigger: { trigger: '.exp-specs', start: 'top 85%', once: true } });
  // Parallax scroll effect on the photo
  const expImg = wrap.querySelector('img');
  gsap.set(expImg, { willChange: 'transform' });
  gsap.to(expImg, {
    yPercent: -8, ease: 'none',
    scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: 0.6 },
  });
}

/* =========================================================
   STAT COUNTERS
   ========================================================= */
function initCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseFloat(el.getAttribute('data-count'));
    const suffix = el.getAttribute('data-suffix') || '';
    const obj    = { val: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(obj, { val: target, duration: 1.5, ease: 'power2.out',
        onUpdate: () => el.textContent = Math.round(obj.val) + suffix }),
    });
  });
}

/* =========================================================
   HORIZONTAL PINNED PROJECT SCROLL
   ========================================================= */
function initProjectHorizontalScroll() {
  const track  = document.getElementById('projectsTrack');
  const pinSec = document.querySelector('.projects-pin');
  if (!track || !pinSec) return;
  gsap.set(track, { willChange: 'transform' });
  ScrollTrigger.matchMedia({
    '(min-width: 900px)': () => {
      gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: pinSec, start: 'top top',
          end: () => '+=' + (track.scrollWidth - window.innerWidth),
          scrub: 1, pin: true, invalidateOnRefresh: true,
          anticipatePin: 1,   // pre-arms the pin a frame early — removes the visible "catch" jump
        },
      });
    },
  });
}

/* =========================================================
   GALLERY — clip-path wipe reveals + colour tint on hover
   ========================================================= */
function initGalleryReveals() {
  const cards = gsap.utils.toArray('.gallery-card');
  cards.forEach((card, i) => {
    gsap.fromTo(card,
      { clipPath: 'inset(0 0 100% 0)', opacity: 0 },
      { clipPath: 'inset(0 0 0% 0)', opacity: 1, duration: 1, ease: 'power4.out', delay: (i % 3) * .12,
        scrollTrigger: { trigger: card, start: 'top 90%', once: true } }
    );
  });
}

/* =========================================================
   CREDENTIALS — staggered clip-path wipes per row
   ========================================================= */
function initCredentialReveals() {
  const cards = gsap.utils.toArray('.cred-card');
  gsap.set(cards, { opacity: 0, y: 40 });
  ScrollTrigger.batch(cards, {
    start: 'top 90%', once: true, interval: .08,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: .8, stagger: .1, ease: 'power3.out' }),
  });
}

/* =========================================================
   CARD HOVER INTERACTIONS
   ========================================================= */
function initCardHovers() {
  if (TOUCH) return;
  document.querySelectorAll('.cred-card,.stat,.gallery-card').forEach(card => {
    let rect = null;
    // Measure once on enter instead of forcing a layout read on every
    // single pixel of mouse movement — this was the biggest source of
    // scroll-adjacent jank on pages with many cards.
    card.addEventListener('mouseenter', () => { rect = card.getBoundingClientRect(); });
    card.addEventListener('mousemove', e => {
      if (!rect) rect = card.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width  - .5) * 12;
      const ny = ((e.clientY - rect.top)  / rect.height - .5) * 12;
      gsap.to(card, { rotationX: -ny, rotationY: nx, transformPerspective: 800, duration: .4, ease: 'power2.out', overwrite: 'auto' });
    });
    card.addEventListener('mouseleave', () => { rect = null; gsap.to(card, { rotationX: 0, rotationY: 0, duration: .6, ease: 'power3.out', overwrite: 'auto' }); });
  });
}

/* =========================================================
   MAGNETIC BUTTONS
   ========================================================= */
function initMagneticButtons() {
  if (TOUCH) return;
  document.querySelectorAll('.btn,.menu-toggle').forEach(el => {
    const toX = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3.out' });
    const toY = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3.out' });
    let r = null;
    el.addEventListener('mouseenter', () => { r = el.getBoundingClientRect(); });
    el.addEventListener('mousemove', e => {
      if (!r) r = el.getBoundingClientRect();
      toX((e.clientX - (r.left + r.width  / 2)) * .3);
      toY((e.clientY - (r.top  + r.height / 2)) * .3);
    });
    el.addEventListener('mouseleave', () => { r = null; toX(0); toY(0); });
  });
}

/* =========================================================
   TEXT SCRAMBLE — section headings decode in
   ========================================================= */
function initTextScramble() {
  if (REDUCED) return;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!';
  const scramble = el => {
    const final = el.textContent;
    let frame = 0; const total = 20;
    const iv = setInterval(() => {
      let out = '';
      for (let i = 0; i < final.length; i++) {
        if (final[i] === ' ' || final[i] === '\n') { out += final[i]; continue; }
        out += i < (frame / total) * final.length ? final[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      el.textContent = out; frame++;
      if (frame > total) { el.textContent = final; clearInterval(iv); }
    }, 30);
  };
  document.querySelectorAll('.section-eyebrow span,.credentials-title,.gallery-title,.exp-title').forEach(el => {
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true, onEnter: () => scramble(el),
    });
  });
}

/* =========================================================
   SIMPLE FALLBACK REVEALS (no GSAP)
   ========================================================= */
function initSimpleReveals() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.cred-card,.gallery-card,.stat,.es').forEach(el => el.style.opacity = '1');
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; obs.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.cred-card,.gallery-card,.stat,.es').forEach(el => {
    el.style.opacity = '0'; el.style.transition = 'opacity .6s ease, transform .6s ease'; obs.observe(el);
  });
}

/* =========================================================
   CONTACT FORM
   ========================================================= */
function initContactForm() {
  const form = document.getElementById('contactForm');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  if (!form || !toast) return;
  let timer;
  const showToast = msg => {
    toastText.textContent = msg; toast.classList.add('is-visible');
    clearTimeout(timer); timer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = document.getElementById('cf-name').value.trim();
    const email   = document.getElementById('cf-email').value.trim();
    const message = document.getElementById('cf-message').value.trim();
    if (name.length < 2)      return showToast('Please enter your name.');
    if (!email.includes('@')) return showToast('Please enter a valid email.');
    if (message.length < 5)   return showToast('Add more detail to your message.');
    showToast(`Thanks, ${name}! Message received. I'll reply soon.`);
    form.reset();
  });
}

/* =========================================================
   SMOOTH ANCHOR SCROLL
   ========================================================= */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.3 });
      else target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
    });
  });
}
