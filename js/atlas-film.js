// Atlas page: the launch film that opens the page. The page falls to night, the globe grows, and Atlas is introduced one
// line at a time; with the .pin film mode each scroll gesture plays the next moment by itself. Needs js/globe.js.
(() => {
  const pin = document.querySelector('.hero-pin');
  if (!pin) return;
  const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
  const clamp = v => Math.max(0, Math.min(1, v));
  const globe = pin.querySelector('.globe'), slot = pin.querySelector('.globe-slot');
  const { zoom } = Globe(globe, slot, pin);
  // The launch: the page falls to night, the globe grows, and Atlas is introduced one line at a time
  const head = $('.site-head'), night = $('.hero-night'), copy = pin.querySelector('.hero-copy'), hud = pin.querySelector('.hud-bar'), beats = $$('.beat'), flyers = $$('.fly'), beatCount = $('#beat-count');
  const ease = (p, a, b) => clamp((p - a) / (b - a));
  let lastP = -1;
  const launch = () => {
    const p = clamp(-pin.getBoundingClientRect().top / (pin.offsetHeight - innerHeight));
    if (p === lastP) return;
    lastP = p;
    night.style.opacity = ease(p, 0.02, 0.13);
    head.classList.toggle('on-night', p > 0.09 && p < 1);
    const out = ease(p, 0, 0.1);
    copy.style.opacity = hud.style.opacity = 1 - out;
    copy.style.transform = `translateY(${-out * 120}px)`;
    copy.style.visibility = out === 1 ? 'hidden' : 'visible';
    zoom(ease(p, 0, 0.24));
    slot.style.opacity = 1 - out;
    globe.style.opacity = 1 - ease(p, 0.3, 0.6) * 0.6;
    beats.forEach(b => {
      const a = +b.dataset.a, v = ease(p, a, a + 0.05) * (1 - ease(p, +b.dataset.z - 0.04, +b.dataset.z));
      b.style.opacity = v;
      b.style.visibility = v ? 'visible' : 'hidden';
      b.style.transform = `scale(${1.25 - 0.25 * ease(p, a, a + 0.08)})`;
    });
    beatCount.textContent = Math.round(ease(p, 0.38, 0.46) * 100);
    flyers.forEach((f, i) => {
      const t = ease(p, 0.36, 0.46), side = i % 2 ? 1 : -1;
      f.style.opacity = ease(p, 0.36, 0.42) * (1 - ease(p, 0.72, 0.78));
      f.style.transform = `translate(${side * (70 - t * 26)}vw, ${[-24, -24, 26][i] + (1 - t) * 12}vh) rotate(${side * (16 - t * 16)}deg)`;
    });
  };
  // One gesture, one move: inside the launch a scroll plays the next moment by itself, then waits
  const film = document.documentElement.classList.contains('pin'), STOPS = [0, 0.24, 0.47, 0.69, 0.92, 1], MOVE = 1300;
  const travel = () => pin.offsetHeight - innerHeight;
  const spot = () => scrollY / travel();
  const inFilm = dir => dir > 0 ? spot() < 0.999 : spot() > 0.001 && spot() <= 1;
  let moving = false, lastWheel = -1e9, stopped = -1e9;
  const step = dir => {
    const now = spot(), to = (dir > 0 ? STOPS.find(s => s > now + 0.01) : STOPS.findLast(s => s < now - 0.01)) ?? (dir > 0 ? 1 : 0);
    const from = scrollY, end = to * travel(), t0 = performance.now();
    moving = true;
    const go = t => {
      if (!moving) return;
      const k = clamp((t - t0) / MOVE), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2;
      scrollTo({ top: from + (end - from) * e, behavior: 'instant' });
      if (k < 1) requestAnimationFrame(go); else { moving = false; stopped = performance.now(); }
    };
    requestAnimationFrame(go);
  };
  // (the header, progress bar and section markers are in page.js)
  let ticking = false;
  const onScroll = () => { ticking = false; if (film) launch(); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { lastP = -1; onScroll(); });
  onScroll();
  if (film) {
    addEventListener('wheel', e => {
      if ($('.nav').classList.contains('open') || e.ctrlKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const dir = Math.sign(e.deltaY);
      if (!moving && !inFilm(dir)) return;
      e.preventDefault();
      // A trackpad keeps sending events after the fingers lift, so only a pause or a settled stop counts as a new gesture
      const now = performance.now(), fresh = now - lastWheel > 120 || now - stopped > 700;
      lastWheel = now;
      if (!moving && fresh) step(dir);
    }, { passive: false });
    let y0 = 0, used = false;
    addEventListener('touchstart', e => { y0 = e.touches[0].clientY; used = false; }, { passive: true });
    addEventListener('touchmove', e => {
      const dy = y0 - e.touches[0].clientY, dir = Math.sign(dy);
      if (e.touches.length > 1 || !e.cancelable || $('.nav').classList.contains('open') || (!moving && !inFilm(dir))) return;
      e.preventDefault();
      if (!moving && !used && Math.abs(dy) > 24) { used = true; step(dir); }
    }, { passive: false });
    addEventListener('keydown', e => {
      const dir = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (!dir || e.shiftKey || e.metaKey || e.target.closest('input, textarea, select, button, a') || (!moving && !inFilm(dir))) return;
      e.preventDefault();
      if (!moving) step(dir);
    });
    $$('a[href="#launch-start"]').forEach(a => a.onclick = e => { e.preventDefault(); if (!moving) step(1); });
    addEventListener('click', e => { if (e.target.closest('a[href^="#"]:not([href="#launch-start"])')) moving = false; });
  }
})();
