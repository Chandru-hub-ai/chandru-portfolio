/* ==========================================================================
   Chandru LG — portfolio
   One classic script (works from file:// too). Sections:
   1 utilities · 2 motion engine (ticker, springs, text split) · 3 smooth scroll
   4 intro video · 5 navigation · 6 frame loop (stack, seam, marquee speed)
   7 contours · 8 circuit + reticle · 9 sections · 10 lightbox/slider/form
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ 1 */
  const root = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const hasIO = 'IntersectionObserver' in window;

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const phoneMQ = matchMedia('(max-width: 639px)');
  const narrowMQ = matchMedia('(max-width: 700px)');
  const hoverMQ = matchMedia('(hover: hover)');

  const STORE_KEY = 'chandru-lg-motion';
  let stored = null;
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked */ }
  let motionOff = stored ? stored === 'off' : reduceMQ.matches;
  root.classList.toggle('motion-off', motionOff);

  try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
  const initialHash = location.hash;
  window.scrollTo(0, 0);

  /* ------------------------------------------------------------------ 2 */
  // One rAF loop shared by everything that animates.
  const ticker = (() => {
    const subs = new Set();
    let raf = 0;
    let last = 0;
    const loop = (t) => {
      const dt = Math.min(64, t - (last || t));
      last = t;
      for (const fn of [...subs]) fn(t, dt);
      raf = subs.size ? requestAnimationFrame(loop) : 0;
    };
    return {
      add(fn) {
        subs.add(fn);
        if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
        return () => subs.delete(fn);
      },
    };
  })();

  // Damped spring (react-spring style: tension, friction, mass 1), 1ms substeps.
  const makeSpring = (tension, friction, from = 0, to = 1) => ({ v: from, vel: 0, to, t: tension, f: friction });
  function stepSpring(s, dt) {
    let ms = Math.min(64, dt);
    while (ms > 0) {
      const step = Math.min(1, ms);
      const accel = -s.t * (s.v - s.to) - s.f * s.vel;
      s.vel += accel * step / 1000;
      s.v += s.vel * step / 1000;
      ms -= step;
    }
    if (Math.abs(s.vel) < 0.001 && Math.abs(s.to - s.v) < 0.001) { s.v = s.to; s.vel = 0; return true; }
    return false;
  }
  const SPR = {
    REVEAL: [90, 26], SHEET: [190, 26], TYPE: [210, 24], YEAR: [190, 24],
    COPY: [110, 26], SETTLE: [32, 26], VEIL: [70, 24],
  };

  // Run one 0→1 spring per item (each with its own delay) and hand v to apply().
  function runSprings(items, apply, cfg) {
    if (motionOff) { items.forEach((i) => apply(i.el, 1)); return; }
    const t0 = performance.now();
    const list = items.map((i) => ({ el: i.el, delay: i.delay || 0, s: makeSpring(cfg[0], cfg[1]), done: false }));
    const stop = ticker.add((time, dt) => {
      const now = performance.now();
      let live = 0;
      for (const x of list) {
        if (x.done) continue;
        live++;
        if (now - t0 < x.delay) continue;
        const fin = stepSpring(x.s, dt);
        apply(x.el, fin ? 1 : x.s.v);
        if (fin) x.done = true;
      }
      if (!live) stop();
    });
  }

  const applyRise = (el, v) => {
    if (v === 1) { el.style.opacity = ''; el.style.transform = ''; return; }
    el.style.opacity = clamp(v, 0, 1);
    el.style.transform = `translateY(${(1 - v) * 1.25}rem)`;
  };
  const applyWord = (el, v) => { el.style.opacity = clamp(v, 0, 1); el.style.transform = `translateY(${(1 - v) * 0.35}em)`; };
  const applyLetter = (el, v) => { el.style.opacity = clamp(v, 0, 1); el.style.transform = `translateY(${(1 - v) * 0.3}em)`; };

  // Split an element's text into animated units. A hidden plain copy stays for assistive tech.
  function splitText(el, mode) {
    const src = el.cloneNode(true);
    $$('br', src).forEach((br) => br.replaceWith(' '));
    const full = src.textContent.replace(/\s+/g, ' ').trim();
    const clone = el.cloneNode(true);
    const units = [];

    const build = (from, to) => {
      for (const n of [...from.childNodes]) {
        if (n.nodeType === 3) {
          for (const tok of n.textContent.split(/(\s+)/)) {
            if (!tok) continue;
            if (/^\s+$/.test(tok)) { to.append(' '); continue; }
            if (mode === 'letters') {
              const w = document.createElement('span');
              w.className = 'uw';
              for (const ch of tok) {
                const u = document.createElement('span');
                u.className = 'u';
                u.textContent = ch;
                w.append(u);
                units.push(u);
              }
              to.append(w);
            } else {
              const u = document.createElement('span');
              u.className = 'u';
              u.textContent = tok;
              to.append(u);
              units.push(u);
            }
          }
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { to.append(n.cloneNode()); continue; }
          const c = n.cloneNode(false);
          build(n, c);
          to.append(c);
        }
      }
    };

    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = full;
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    build(clone, vis);
    el.append(sr, vis);
    return units;
  }

  // Fire a callback once an element scrolls into view.
  function onView(el, cb, margin = '0px 0px -12% 0px') {
    if (!hasIO) { cb(); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); cb(); }
    }, { rootMargin: margin });
    io.observe(el);
  }

  let resolveReady;
  const ready = new Promise((r) => { resolveReady = r; });

  /* ------------------------------------------------------------------ 3 */
  let lenis = null;
  let LenisCtor = null;
  async function startLenis() {
    if (motionOff || lenis) return;
    try {
      if (!LenisCtor) {
        const m = await import('https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.mjs');
        LenisCtor = m.default || m.Lenis;
      }
      if (motionOff || lenis) return;
      lenis = new LenisCtor({ autoRaf: true, smoothWheel: true });
      lenis.on('scroll', () => mark());
    } catch (e) { /* offline or blocked: native scrolling is fine */ }
  }
  function stopLenis() { if (lenis) { lenis.destroy(); lenis = null; } }

  function goTo(y, instant) {
    if (lenis) lenis.scrollTo(y, { immediate: !!instant, duration: 1.2 });
    else window.scrollTo({ top: y, behavior: instant || motionOff ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------------------ 4 */
  function runIntro() {
    const intro = $('#intro');
    const stage = $('#introStage');
    const bar = $('#introBar');
    const skip = $('#introSkip');
    const SEEN = 'chandru-intro-seen';
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === '1'; } catch (e) { /* ignore */ }

    const done = () => { if (intro) intro.remove(); body.classList.remove('intro-lock'); resolveReady(); };
    if (!intro || motionOff || seen) { done(); return; }

    body.classList.add('intro-lock');
    try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* ignore */ }
    skip.focus({ preventScroll: true });

    // fit the title to the screen whatever font is in use
    const titleEl = $('.intro-title', intro);
    const fit = () => {
      titleEl.style.fontSize = '';
      const fs = parseFloat(getComputedStyle(titleEl).fontSize);
      const w = titleEl.scrollWidth || 1;
      const max = innerWidth * 0.9;
      if (w > max) titleEl.style.fontSize = (fs * max / w) + 'px';
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener('resize', fit);

    const TOTAL = 9000; // title card length in ms
    let leaving = false;
    let raf = 0;
    const leave = () => {
      if (leaving) return;
      leaving = true;
      cancelAnimationFrame(raf);
      // the page below starts its own animations just as the curtain begins to rise
      setTimeout(resolveReady, 420);
      runSprings([{ el: intro }], (el, v) => {
        const p = clamp(v, 0, 1);
        el.style.transform = `translateY(${-p * 100}%)`;
        stage.style.transform = `translateY(${p * 38}%)`;
        if (v >= 1) done();
      }, [60, 22]);
    };

    skip.addEventListener('click', leave);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !leaving) leave(); });

    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp((now - t0) / TOTAL, 0, 1);
      bar.style.setProperty('--p', p);
      if (p >= 1) leave(); else raf = requestAnimationFrame(tick);
    };
    requestAnimationFrame(() => { intro.classList.add('is-playing'); raf = requestAnimationFrame(tick); });
  }

  /* ------------------------------------------------------------------ 5 */
  const nav = $('#overlayNav');
  const toggle = $('#menuToggle');
  const closeBtn = $('#menuClose');
  const navLinks = nav ? $$('a.overlay-link', nav) : [];

  function openNav() {
    if (!nav) return;
    nav.inert = false;
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    body.classList.add('nav-open');
    if (lenis) lenis.stop();
    closeBtn.focus();
    const items = navLinks.map((a, i) => { a.style.opacity = 0; a.style.transform = 'translateY(1.25rem)'; return { el: a, delay: 120 + i * 55 }; });
    runSprings(items, applyRise, SPR.SHEET);
  }
  function closeNav(refocus = true) {
    if (!nav || !nav.classList.contains('is-open')) return;
    nav.classList.remove('is-open');
    nav.inert = true;
    toggle.setAttribute('aria-expanded', 'false');
    body.classList.remove('nav-open');
    if (lenis) lenis.start();
    if (refocus) toggle.focus();
  }
  if (nav) {
    nav.inert = true;
    toggle.addEventListener('click', () => (nav.classList.contains('is-open') ? closeNav() : openNav()));
    closeBtn.addEventListener('click', () => closeNav());
    document.addEventListener('keydown', (e) => {
      if (!nav.classList.contains('is-open')) return;
      if (e.key === 'Escape') { closeNav(); return; }
      if (e.key === 'Tab') {
        const f = $$('a[href], button', nav).filter((x) => !x.disabled);
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // Pinned layers sit at the top of the stack, so their scroll position is the sum of the layers before them.
  const stack = $('#stack');
  const layers = stack ? $$(':scope > .layer', stack) : [];
  const anchorY = (el) => {
    if (stack && el.classList.contains('layer')) {
      let y = stack.getBoundingClientRect().top + scrollY;
      for (const s of stack.children) { if (s === el) break; y += s.offsetHeight; }
      return y;
    }
    return el.getBoundingClientRect().top + scrollY;
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    closeNav(false);
    goTo(target.id === 'home' ? 0 : anchorY(target));
    try { history.replaceState(null, '', '#' + target.id); } catch (err) { /* ignore */ }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ------------------------------------------------------------------ 6 */
  const scrollProg = $('#scrollProg');
  const seam = $('#seam');
  const missionLayer = $('#about');
  let anchors = [];
  let seamLast = -1;
  let seamDims = '';
  let marquee = null;
  let marqueeRate = 1;
  let lastY = 0;

  const layerParts = layers.map((l) => ({
    layer: l,
    inner: $('.layer-inner', l),
    shade: $('.layer-shade', l),
  }));
  const nextOf = layers.map((l, i) => layers[i + 1] || $('#capabilities'));

  function setPins() {
    const vh = innerHeight;
    layers.forEach((l) => { l.style.top = Math.min(0, vh - l.offsetHeight) + 'px'; });
  }
  function measureAnchors() {
    anchors = navLinks
      .map((a) => ({ a, el: document.getElementById(a.hash.slice(1)) }))
      .filter((x) => x.el)
      .map((x) => ({ a: x.a, y: x.el.id === 'home' ? 0 : anchorY(x.el) }));
  }

  function drawSeam(p) {
    if (!seam) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = seam.clientWidth;
    const h = seam.clientHeight;
    const dims = w + 'x' + h + 'x' + dpr;
    if (dims !== seamDims) { seam.width = Math.round(w * dpr); seam.height = Math.round(h * dpr); seamDims = dims; seamLast = -1; }
    if (Math.abs(p - seamLast) < 0.002) return;
    seamLast = p;
    const ctx = seam.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(seam).color;
    const rowsN = 6;
    const size = h / rowsN;
    const cols = Math.ceil(w / size);
    for (let r = 0; r < rowsN; r++) {
      for (let c = 0; c < cols; c++) {
        const s = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
        const hash = s - Math.floor(s);
        const thr = 1 - (r / rowsN) * 0.85 - hash * 0.18 - ((r + c) % 2 ? 0.1 : 0);
        if (p < thr) ctx.fillRect(c * size, r * size, size + 0.5, size + 0.5);
      }
    }
  }

  function update(dt) {
    const view = innerHeight || 1;
    let busy = false;

    if (scrollProg) {
      const max = root.scrollHeight - view;
      scrollProg.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    }

    // The stack: the covered layer recedes (scale + shade) instead of scrolling away.
    layerParts.forEach((lp, i) => {
      const next = nextOf[i];
      if (!next) return;
      const p = clamp(1 - next.getBoundingClientRect().top / view, 0, 1);
      const shrink = phoneMQ.matches || motionOff ? 0 : 0.1;
      lp.inner.style.transform = p > 0 && shrink > 0 ? `scale(${1 - shrink * p})` : '';
      lp.inner.style.willChange = p > 0 && shrink > 0 ? 'transform' : '';
      lp.shade.style.opacity = 0.55 * p;
      lp.inner.style.visibility = p >= 1 ? 'hidden' : 'visible';
    });

    // The chequered seam at the top of the mission layer.
    if (missionLayer && seam) {
      const p = clamp(1 - missionLayer.getBoundingClientRect().top / view, 0, 1);
      drawSeam(motionOff ? 1 : p);
      // Words light up with scroll as the page slides in (scrubbed, reversible).
      if (missionWords.length && !motionOff) {
        const n = Math.round(clamp((p - 0.2) / 0.78, 0, 1) * missionWords.length);
        if (n !== missionLit) {
          missionWords.forEach((w, i) => w.classList.toggle('is-lit', i < n));
          missionLit = n;
        }
      }
    }

    // Which nav entry is current.
    if (anchors.length) {
      let cur = anchors[0];
      for (const x of anchors) if (x.y <= scrollY + view * 0.4) cur = x;
      anchors.forEach((x) => { if (x === cur) x.a.setAttribute('aria-current', 'location'); else x.a.removeAttribute('aria-current'); });
    }

    // Marquee speeds up with scroll speed and eases back.
    if (marquee) {
      const speed = Math.min(5, Math.abs(scrollY - lastY) / Math.max(1, dt) * 2.2);
      lastY = scrollY;
      marqueeRate = lerp(marqueeRate, 1 + speed, 0.12);
      marquee.playbackRate = motionOff ? 1 : marqueeRate;
      if (Math.abs(marqueeRate - 1) > 0.02) busy = true;
    }
    return busy;
  }

  // The frame loop only runs while something is changing.
  let dirty = true;
  let idle = 0;
  let stopFrame = null;
  function frame(time, dt) {
    const busy = update(dt);
    if (dirty || busy) { idle = 0; dirty = false; }
    else if (++idle > 12) { stopFrame(); stopFrame = null; }
  }
  function mark() { dirty = true; if (!stopFrame) stopFrame = ticker.add(frame); }
  addEventListener('scroll', mark, { passive: true });
  addEventListener('resize', () => { setPins(); measureAnchors(); seamLast = -1; mark(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { setPins(); measureAnchors(); mark(); }).observe(body);

  /* ------------------------------------------------------------------ 7 */
  const contourInstances = [];

  function makeContours(canvas) {
    const ctx = canvas.getContext('2d');
    const CELL = 22;
    const LEVELS = 7;
    let w = 0, h = 0, cols = 0, rows2 = 0, dpr = 1, vals = null;
    let inView = false;
    let stop = null;
    let lastDraw = 0;

    const field = (x, y, t) =>
      Math.sin(x * 2.1 + t * 0.21) * 0.55 +
      Math.sin(y * 2.7 - t * 0.17 + Math.sin(x * 1.3 + t * 0.1) * 1.3) * 0.5 +
      Math.sin((x * 0.8 + y * 1.2) * 2.4 + t * 0.13) * 0.4;

    const resize = () => {
      dpr = Math.min(1.5, devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      cols = Math.ceil(w / CELL); rows2 = Math.ceil(h / CELL);
      vals = new Float32Array((cols + 1) * (rows2 + 1));
      draw(performance.now() / 1000);
    };

    function draw(t) {
      if (!w || !h) return;
      const seconds = motionOff ? 2.4 : t * 0.6;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      for (let j = 0; j <= rows2; j++) for (let i = 0; i <= cols; i++) vals[j * (cols + 1) + i] = field(i * CELL / 300, j * CELL / 300, seconds);
      ctx.strokeStyle = getComputedStyle(canvas).color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let l = 0; l < LEVELS; l++) {
        const level = -1.1 + (2.2 * l) / (LEVELS - 1);
        for (let j = 0; j < rows2; j++) {
          for (let i = 0; i < cols; i++) {
            const k = j * (cols + 1) + i;
            const a = vals[k], b = vals[k + 1], d = vals[k + cols + 1], c = vals[k + cols + 2];
            const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x = i * CELL, y = j * CELL;
            const T = [x + CELL * ((level - a) / (b - a)), y];
            const R = [x + CELL, y + CELL * ((level - b) / (c - b))];
            const B = [x + CELL * ((level - d) / (c - d)), y + CELL];
            const L = [x, y + CELL * ((level - a) / (d - a))];
            const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
            switch (idx) {
              case 1: case 14: seg(L, B); break;
              case 2: case 13: seg(B, R); break;
              case 3: case 12: seg(L, R); break;
              case 4: case 11: seg(T, R); break;
              case 6: case 9: seg(T, B); break;
              case 7: case 8: seg(T, L); break;
              case 5: case 10: {
                const centre = (a + b + c + d) / 4 > level;
                if ((idx === 5) === centre) { seg(T, L); seg(B, R); } else { seg(T, R); seg(L, B); }
                break;
              }
              default: break;
            }
          }
        }
      }
      ctx.stroke();
    }

    const covered = () => {
      const inner = canvas.closest('.layer-inner');
      return inner && inner.style.visibility === 'hidden';
    };
    const run = () => {
      const should = inView && !motionOff && !document.hidden;
      if (should && !stop) {
        stop = ticker.add((time) => {
          if (time - lastDraw < 33 || covered()) return;
          lastDraw = time;
          draw(time / 1000);
        });
      } else if (!should && stop) { stop(); stop = null; }
    };

    if (hasIO) new IntersectionObserver((es) => { inView = es[0].isIntersecting; run(); }).observe(canvas);
    else inView = true;
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
    document.addEventListener('visibilitychange', run);
    resize();
    run();
    return { refresh() { run(); draw(performance.now() / 1000); } };
  }

  /* ------------------------------------------------------------------ 8 */
  const stage = $('#capStage');
  const circuit = $('#circuit');
  let setLap = () => {};
  let lapStarted = false;

  function setupCircuit() {
    if (!circuit) return;
    const lap = $('#lapLine');
    const glow = $('#lapGlow');
    const head = $('#lapHead');
    const track = $('#trackBase');
    const L = track.getTotalLength();
    const turns = $$('.turn', circuit).map((g) => {
      const at = parseFloat(g.dataset.at);
      const pt = track.getPointAtLength(L * at);
      g.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      return { g, at };
    });
    const flag = $('#startFlag');
    if (flag) { const p0 = track.getPointAtLength(0); flag.setAttribute('transform', `translate(${p0.x - 12} ${p0.y - 12})`); }
    [lap, glow].forEach((p) => { p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });

    setLap = (p) => {
      [lap, glow].forEach((el) => { el.style.strokeDashoffset = L * (1 - p); });
      const pt = lap.getPointAtLength(L * p);
      head.setAttribute('cx', pt.x); head.setAttribute('cy', pt.y);
      head.style.opacity = p > 0 && p < 1 ? 1 : 0;
      turns.forEach((t) => t.g.classList.toggle('is-lit', p >= t.at));
    };

    const finishLap = () => { setLap(1); circuit.classList.add('is-cool'); };
    if (motionOff) finishLap();

    onView(stage, () => {
      if (lapStarted) return;
      lapStarted = true;
      if (motionOff) { finishLap(); return; }
      const t0 = performance.now();
      const stop = ticker.add(() => {
        const t = clamp((performance.now() - t0) / 6000, 0, 1);
        // braking through the corners, running away down the straights
        setLap(clamp(t + 0.025 * Math.sin(6 * Math.PI * t), 0, 1));
        if (t >= 1) { stop(); finishLap(); }
      });
    }, '0px 0px -30% 0px');
  }

  // Reticle: arms follow the cursor along the dot lattice.
  function setupReticle() {
    const map = $('.cap-map');
    if (!stage || !map) return;
    const sx = makeSpring(220, 26, 0, 0);
    const sy = makeSpring(220, 26, 0, 0);
    let stop = null;
    const GRID = 16;
    const apply = () => { map.style.setProperty('--mx', sx.v + 'px'); map.style.setProperty('--my', sy.v + 'px'); };
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || motionOff || !hoverMQ.matches) return;
      const r = map.getBoundingClientRect();
      sx.to = Math.round((e.clientX - r.left - GRID / 2) / GRID) * GRID + GRID / 2;
      sy.to = Math.round((e.clientY - r.top - GRID / 2) / GRID) * GRID + GRID / 2;
      if (!stage.classList.contains('is-aimed')) { stage.classList.add('is-aimed'); sx.v = sx.to; sy.v = sy.to; apply(); }
      if (!stop) stop = ticker.add((t, dt) => { const a = stepSpring(sx, dt); const b = stepSpring(sy, dt); apply(); if (a && b) { stop(); stop = null; } });
    });
    stage.addEventListener('pointerleave', () => stage.classList.remove('is-aimed'));
  }

  function setupCapCards() {
    $$('.matrix-col').forEach((card) => {
      card.classList.add('cap-armed');
      $$('.matrix-list li', card).forEach((li, k) => li.style.setProperty('--k', k));
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--px', (e.clientX - r.left) + 'px');
        card.style.setProperty('--py', (e.clientY - r.top) + 'px');
      });
      ready.then(() => onView(card, () => card.classList.add('cap-in'), '0px 0px -10% 0px'));
    });
  }

  /* ------------------------------------------------------------------ 9 */
  function setupHero() {
    const hero = $('#home');
    const img = $('.portrait-frame img', hero);
    if (!hero || !img) return;
    const sx = makeSpring(120, 22, 0, 0);
    const sy = makeSpring(120, 22, 0, 0);
    let stop = null;
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || motionOff || !hoverMQ.matches) return;
      const r = hero.getBoundingClientRect();
      sx.to = ((e.clientX - r.left) / r.width - 0.5) * -22;
      sy.to = ((e.clientY - r.top) / r.height - 0.5) * -22;
      if (!stop) stop = ticker.add((t, dt) => {
        const a = stepSpring(sx, dt); const b = stepSpring(sy, dt);
        img.style.translate = `${sx.v}px ${sy.v}px`;
        if (a && b) { stop(); stop = null; }
      });
    });
  }

  let missionWords = [], missionLit = -1;
  function setupMission() {
    const el = $('#missionText');
    if (!el) return;
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => '<span class="word">' + w + '</span>').join(' ');
    missionWords = $$('.word', el);
    if (motionOff) missionWords.forEach((w) => w.classList.add('is-lit'));
  }

  function setupReveals() {
    // split text
    $$('[data-split]').forEach((el) => {
      const mode = el.dataset.split;
      const units = splitText(el, mode);
      const delay = +el.dataset.delay || 0;
      const stagger = +el.dataset.stagger || (mode === 'letters' ? 26 : 55);
      ready.then(() => onView(el, () => {
        runSprings(units.map((u, i) => ({ el: u, delay: delay + i * stagger })), mode === 'letters' ? applyLetter : applyWord, mode === 'letters' ? SPR.TYPE : SPR.REVEAL);
      }));
    });

    // block rise (explicit)
    const rise = (el, delay) => {
      if (!motionOff) { el.style.opacity = 0; el.style.transform = 'translateY(1.25rem)'; }
      ready.then(() => onView(el, () => runSprings([{ el, delay }], applyRise, SPR.REVEAL)));
    };
    $$('[data-rise]').forEach((el) => rise(el, +el.dataset.delay || 0));

    // block rise (automatic, staggered by position among siblings)
    ['.layer-mission .meta-block', '.layer-exp .es', '.matrix-col', '.project-panel', '.cred-slide', '.contact-link', '.section-eyebrow']
      .forEach((sel) => {
        const counts = new Map();
        $$(sel).forEach((el) => {
          const n = counts.get(el.parentElement) || 0;
          counts.set(el.parentElement, n + 1);
          rise(el, Math.min(n * 90, 450));
        });
      });

    // contact nav resolves letter by letter
    $$('.contact-nav a').forEach((a, i) => {
      const units = splitText(a, 'letters');
      ready.then(() => onView(a, () => runSprings(units.map((u, k) => ({ el: u, delay: 260 + i * 80 + k * 22 })), applyLetter, SPR.TYPE), '0px 0px -5% 0px'));
    });
  }

  // Moments: photos never display larger than their real resolution; each wipes in, and a sticky index follows along.
  function setupShots() {
    const shots = $$('.shot');
    const items = $$('.mi-list li');
    const now = $('#miNow');
    const setActive = (i) => {
      items.forEach((li, k) => li.classList.toggle('is-active', k === i));
      if (now) now.textContent = String(i + 1).padStart(2, '0');
    };
    setActive(0);

    shots.forEach((shot) => {
      const open = $('.shot-open', shot);
      const img = $('img', open);
      const cap = $('.shot-cap', shot);
      const label = $('.shot-label', cap);
      const capSize = () => {
        if (!img.naturalWidth) return;
        img.style.setProperty('--cap', Math.max(320, Math.round(img.naturalWidth / Math.min(2, devicePixelRatio || 1))) + 'px');
      };
      if (img.complete && img.naturalWidth) capSize(); else img.addEventListener('load', capSize, { once: true });
      const units = splitText(label, 'letters');
      const lines = [$('strong', cap), $('.shot-sub', cap), $('.shot-story', cap)].filter(Boolean);
      if (!motionOff) { open.classList.add('is-wiping'); lines.forEach((l) => { l.style.opacity = 0; }); }
      onView(shot, () => ready.then(() => {
        if (motionOff) return;
        runSprings([{ el: open }], (el, v) => {
          el.classList.remove('is-wiping');
          el.style.clipPath = v >= 1 ? '' : `inset(0 0 ${(1 - clamp(v, 0, 1)) * 100}% 0)`;
          img.style.transform = v >= 1 ? '' : `scale(${1 + (1 - clamp(v, 0, 1)) * 0.14})`;
        }, SPR.SHEET);
        runSprings(units.map((u, i) => ({ el: u, delay: 320 + i * 30 })), applyLetter, SPR.YEAR);
        runSprings(lines.map((el, i) => ({ el, delay: 420 + i * 110 })), applyRise, SPR.COPY);
      }), '0px 0px -18% 0px');
    });

    if (hasIO && shots.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(shots.indexOf(e.target)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      shots.forEach((s) => io.observe(s));
    }
    $$('.mi-list button').forEach((btn) => btn.addEventListener('click', () => {
      const t = shots[+btn.dataset.go];
      if (t) goTo(t.getBoundingClientRect().top + scrollY - (innerHeight - t.offsetHeight) / 2);
    }));
  }

  // Headings get an accent line that draws in under them.
  function setupDrawLines() {
    $$('.sec-title, .projects-title, .credentials-title, .gallery-title').forEach((h) => {
      const line = document.createElement('i');
      line.className = 'draw-line';
      h.after(line);
      if (motionOff) { line.style.width = '72px'; return; }
      ready.then(() => onView(h, () => runSprings([{ el: line, delay: 500 }], (el, v) => { el.style.width = v * 72 + 'px'; }, SPR.REVEAL)));
    });
  }

  // Buttons lean toward the cursor.
  function setupMagnets() {
    if (!hoverMQ.matches) return;
    $$('.btn, .pill, .cred-nav').forEach((el) => {
      const sx = makeSpring(260, 22, 0, 0);
      const sy = makeSpring(260, 22, 0, 0);
      let stop = null;
      const run = () => {
        if (stop) return;
        stop = ticker.add((t, dt) => {
          const a = stepSpring(sx, dt); const b = stepSpring(sy, dt);
          el.style.translate = a && b && !sx.to && !sy.to ? '' : `${sx.v}px ${sy.v}px`;
          if (a && b) { stop(); stop = null; }
        });
      };
      el.addEventListener('pointermove', (e) => {
        if (motionOff || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        sx.to = (e.clientX - (r.left + r.width / 2)) * 0.28;
        sy.to = (e.clientY - (r.top + r.height / 2)) * 0.4;
        run();
      });
      el.addEventListener('pointerleave', () => { sx.to = 0; sy.to = 0; run(); });
    });
  }

  // Cards tilt in 3D under the cursor, with a red glare that follows it.
  function setupTilt() {
    if (!hoverMQ.matches) return;
    $$('.project-panel, .cred-slide').forEach((el) => {
      el.classList.add('tilt');
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.addEventListener('pointermove', (e) => {
        if (motionOff || e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 7}deg) rotateY(${(px - 0.5) * 9}deg) translateZ(0)`;
        el.style.setProperty('--gx', px * 100 + '%');
        el.style.setProperty('--gy', py * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { el.classList.remove('is-tilting'); el.style.transform = ''; });
    });
  }

  // Cursor follower: grows over links, and shows VIEW over photos.
  function setupCursor() {
    if (!hoverMQ.matches || reduceMQ.matches) return;
    const dot = document.createElement('div');
    dot.className = 'cursor';
    dot.innerHTML = '<span>View</span>';
    dot.setAttribute('aria-hidden', 'true');
    body.append(dot);
    const sx = makeSpring(420, 30, 0, 0);
    const sy = makeSpring(420, 30, 0, 0);
    let stop = null;
    const move = () => { dot.style.transform = `translate(${sx.v}px, ${sy.v}px)`; };
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || motionOff) { dot.classList.remove('is-on'); return; }
      sx.to = e.clientX; sy.to = e.clientY;
      if (!dot.classList.contains('is-on')) { dot.classList.add('is-on'); sx.v = sx.to; sy.v = sy.to; move(); }
      const t = e.target.closest ? e.target : null;
      dot.classList.toggle('is-photo', !!(t && t.closest('.shot-open')));
      dot.classList.toggle('is-link', !!(t && !t.closest('.shot-open') && t.closest('a, button, .cred-slide, .project-panel')));
      if (!stop) stop = ticker.add((tm, dt) => { const a = stepSpring(sx, dt); const b = stepSpring(sy, dt); move(); if (a && b) { stop(); stop = null; } });
    });
    document.addEventListener('pointerleave', () => dot.classList.remove('is-on'));
  }

  // LeetCode stats load live in the visitor's browser (cached as a fallback).
  function setupProfiles() {
    const fmt = (n) => Number(n).toLocaleString('en-IN');

    const card = $('#lcCard');
    if (!card) return;
    const user = card.dataset.user;
    const status = $('#lcStatus');
    const KEY = 'lc-stats-' + user;
    const C = 2 * Math.PI * 54;
    const arcs = [['#lcArcE', 'easy'], ['#lcArcM', 'medium'], ['#lcArcH', 'hard']].map(([sel, k]) => ({ el: $(sel), k }));
    arcs.forEach((a) => { a.el.style.stroke = a.el.dataset.c; });

    const draw = (d) => {
      const vals = { easy: d.easy, medium: d.medium, hard: d.hard };
      const total = d.easy + d.medium + d.hard;
      $('#lcTotal').textContent = fmt(d.total ?? total);
      $('#lcEasy').textContent = fmt(d.easy); $('#lcMed').textContent = fmt(d.medium); $('#lcHard').textContent = fmt(d.hard);
      if (d.totals) {
        $('#lcEasyOf').textContent = '/ ' + fmt(d.totals.easy); $('#lcMedOf').textContent = '/ ' + fmt(d.totals.medium); $('#lcHardOf').textContent = '/ ' + fmt(d.totals.hard);
      }
      $('#lcRank').textContent = d.ranking ? '#' + fmt(d.ranking) : '—';
      $('#lcAcc').textContent = d.acceptance ? Number(d.acceptance).toFixed(1) + '%' : '—';
      const place = (v) => {
        let offset = 0;
        arcs.forEach((a) => {
          const len = total ? (vals[a.k] / total) * C * v : 0;
          const gap = total && vals[a.k] ? Math.min(2, len) : 0;
          a.el.style.strokeDasharray = `${Math.max(0, len - gap)} ${C}`;
          a.el.style.strokeDashoffset = -offset;
          offset += total ? (vals[a.k] / total) * C * v : 0;
        });
      };
      if (motionOff) place(1);
      else onView(card, () => runSprings([{ el: card }], (e, v) => place(clamp(v, 0, 1)), SPR.SHEET));
    };

    const norm = (j) => {
      if (j && j.status === 'success') {
        return { total: j.totalSolved, easy: j.easySolved, medium: j.mediumSolved, hard: j.hardSolved,
          totals: { easy: j.totalEasy, medium: j.totalMedium, hard: j.totalHard }, ranking: j.ranking, acceptance: j.acceptanceRate };
      }
      if (j && typeof j.solvedProblem === 'number') return { total: j.solvedProblem, easy: j.easySolved, medium: j.mediumSolved, hard: j.hardSolved };
      throw new Error('bad response');
    };
    const get = async (url) => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error(r.status); return norm(await r.json()); }
      finally { clearTimeout(timer); }
    };

    (async () => {
      let data = null;
      for (const url of [`https://leetcode-stats-api.herokuapp.com/${user}`, `https://alfa-leetcode-api.onrender.com/${user}/solved`]) {
        try { data = await get(url); break; } catch (e) { /* try the next source */ }
      }
      if (data) {
        try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* ignore */ }
        draw(data);
        status.textContent = 'Live from LeetCode · refreshed just now';
        return;
      }
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved && saved.data) {
          draw(saved.data);
          status.textContent = 'Showing saved stats from ' + new Date(saved.at).toLocaleDateString('en-IN') + ' · open the profile for the latest.';
          return;
        }
      } catch (e) { /* ignore */ }
      status.textContent = 'Live stats are unavailable right now. Open the profile to see my progress.';
    })();
  }

  /* ----------------------------------------------------------------- 10 */
  function setupLightbox() {
    const dlg = $('#lightbox');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    const img = $('#lbImg');
    const cap = $('#lbCap');
    const btns = $$('.shot-open');
    let cur = 0;
    const show = (i) => {
      cur = (i + btns.length) % btns.length;
      const b = btns[cur];
      img.style.animation = 'none'; void img.offsetWidth; img.style.animation = '';
      img.src = b.dataset.full;
      img.alt = b.dataset.caption || '';
      cap.textContent = (cur + 1) + ' / ' + btns.length + ' — ' + (b.dataset.caption || '');
    };
    btns.forEach((btn, i) => btn.addEventListener('click', () => {
      show(i);
      if (lenis) lenis.stop();
      dlg.showModal();
    }));
    $('.lb-prev', dlg).addEventListener('click', () => show(cur - 1));
    $('.lb-next', dlg).addEventListener('click', () => show(cur + 1));
    dlg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    });
    $('.lightbox-close', dlg).addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { if (lenis) lenis.start(); });
  }

  function setupCredentials() {
    const track = $('#credTrack');
    if (!track) return;
    const slides = $$('.cred-slide', track);
    const fill = $('#credProgFill');
    const counter = $('#credCounterCurrent');
    const total = $('#credCounterTotal');
    const prev = $('.cred-prev');
    const next = $('.cred-next');
    if (total) total.textContent = String(slides.length).padStart(2, '0');
    const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : slides[0].offsetWidth + 14);
    const index = () => Math.round(track.scrollLeft / step());
    const go = (dir) => {
      const n = clamp(index() + dir, 0, slides.length - 1);
      track.scrollTo({ left: n * step(), behavior: motionOff ? 'auto' : 'smooth' });
    };
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      fill.style.width = (max > 0 ? (track.scrollLeft / max) * 100 : 100) + '%';
      counter.textContent = String(clamp(index() + 1, 1, slides.length)).padStart(2, '0');
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  }

  function setupForm() {
    const form = $('#contactForm');
    if (!form) return;
    const status = $('#formStatus');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#cf-name').value.trim();
      const email = $('#cf-email').value.trim();
      const message = $('#cf-message').value.trim();
      if (name.length < 2 || !email || message.length < 5) { form.reportValidity(); return; }
      const subject = encodeURIComponent('Portfolio enquiry from ' + name);
      const text = encodeURIComponent('Hi Chandru,\n\n' + message + '\n\nReply to: ' + email);
      if (status) status.textContent = 'Opening your email app…';
      location.href = 'mailto:lingamchandru53@gmail.com?subject=' + subject + '&body=' + text;
    });
  }

  function setupMotionToggle() {
    const btn = $('#motionToggle');
    if (!btn) return;
    const apply = (off) => {
      motionOff = off;
      root.classList.toggle('motion-off', off);
      btn.setAttribute('aria-pressed', String(off));
      btn.setAttribute('aria-label', off ? 'Turn motion on' : 'Turn motion off');
      btn.textContent = off ? 'Motion off' : 'Motion on';
      try { localStorage.setItem(STORE_KEY, off ? 'off' : 'on'); } catch (e) { /* ignore */ }
      if (off) stopLenis(); else startLenis();
      contourInstances.forEach((c) => c.refresh());
      if (off && circuit) { setLap(1); circuit.classList.add('is-cool'); }
      mark();
    };
    btn.addEventListener('click', () => apply(!motionOff));
    btn.setAttribute('aria-pressed', String(motionOff));
    btn.setAttribute('aria-label', motionOff ? 'Turn motion on' : 'Turn motion off');
    btn.textContent = motionOff ? 'Motion off' : 'Motion on';
  }

  /* ----------------------------------------------------------------- go */
  function init() {
    const year = $('#currentYear');
    if (year) year.textContent = new Date().getFullYear();

    setPins();
    measureAnchors();
    setupMotionToggle();
    setupCredentials();
    setupForm();
    setupLightbox();
    setupShots();
    setupProfiles();
    setupDrawLines();
    setupMagnets();
    setupTilt();
    setupCursor();
    const track = $('.marquee-track');
    if (track && track.getAnimations) marquee = track.getAnimations()[0] || null;
    setupMission();
    setupHero();
    setupCircuit();
    setupReticle();
    setupCapCards();
    setupReveals();
    $$('canvas.contours').forEach((c) => contourInstances.push(makeContours(c)));
    mark();
    startLenis();
    runIntro();

    ready.then(() => {
      window.scrollTo(0, 0);
      if (initialHash.length > 1) {
        const t = document.getElementById(initialHash.slice(1));
        if (t) goTo(t.id === 'home' ? 0 : anchorY(t), true);
      }
      setPins(); measureAnchors(); mark();
    });
    // measurements shift once fonts and images settle
    addEventListener('load', () => { setPins(); measureAnchors(); mark(); });
    setTimeout(resolveReady, 12000); // never leave the page waiting
  }

  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  } catch (err) {
    root.classList.add('no-motion');
    const v = $('#intro'); if (v) v.remove();
    $$('[style*="opacity"]').forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
    if (window.console) console.error(err);
  }
})();