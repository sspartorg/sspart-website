// One gesture, one move, for every product film (Atlas, Synvord, DheQuest): inside a film a scroll, swipe or key plays
// the next moment by itself, then waits. Each film lists its resting points (0..1 through the film) in data-stops.
// Only with the .pin film mode; otherwise the films are plain sections and the page scrolls normally.
(() => {
  if (!document.documentElement.classList.contains('pin')) return;
  const films = [...document.querySelectorAll('[data-stops]')].map(el => ({ el, stops: el.dataset.stops.split(',').map(Number) }));
  if (!films.length) return;
  const MOVE = 1300, clamp = v => Math.max(0, Math.min(1, v));
  const navOpen = () => document.querySelector('.nav')?.classList.contains('open');
  const top = f => f.el.getBoundingClientRect().top + scrollY, travel = f => f.el.offsetHeight - innerHeight;
  const spot = f => (scrollY - top(f)) / travel(f);
  // a film takes the gesture from its first frame up to (not past) its last stop, in the direction of travel
  const inFilm = (f, dir) => { const s = spot(f); return dir > 0 ? s > -0.001 && s < 0.999 : s > 0.001 && s <= 1.001; };
  const filmFor = dir => films.find(f => inFilm(f, dir));
  let moving = false, lastWheel = -1e9, stopped = -1e9, lastD = 0;
  const step = (f, dir) => {
    const now = spot(f), to = (dir > 0 ? f.stops.find(s => s > now + 0.01) : f.stops.findLast(s => s < now - 0.01)) ?? (dir > 0 ? 1 : 0);
    const from = scrollY, end = top(f) + to * travel(f), t0 = performance.now();
    moving = true;
    const go = t => {
      if (!moving) return;
      const k = clamp((t - t0) / MOVE), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2;
      scrollTo({ top: from + (end - from) * e, behavior: 'instant' });
      if (k < 1) requestAnimationFrame(go); else { moving = false; stopped = performance.now(); }
    };
    requestAnimationFrame(go);
  };
  addEventListener('wheel', e => {
    if (navOpen() || e.ctrlKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const dir = Math.sign(e.deltaY), f = filmFor(dir);
    if (!moving && !f) return;
    e.preventDefault();
    // A trackpad keeps sending ever-smaller events after the fingers lift (over 2s in Chrome), so a new gesture is a pause,
    // or, once the last move has settled, a swipe that ramps up again; a fading momentum tail never moves the film twice
    const now = performance.now(), d = Math.abs(e.deltaY), rising = d > lastD * 1.5 + 4;
    const fresh = now - lastWheel > 120 || (now - stopped > 700 && rising);
    lastWheel = now; lastD = d;
    if (!moving && fresh) step(f, dir);
  }, { passive: false });
  let y0 = 0, used = false;
  addEventListener('touchstart', e => { y0 = e.touches[0].clientY; used = false; }, { passive: true });
  addEventListener('touchmove', e => {
    const dy = y0 - e.touches[0].clientY, dir = Math.sign(dy), f = filmFor(dir);
    if (e.touches.length > 1 || !e.cancelable || navOpen() || (!moving && !f)) return;
    e.preventDefault();
    if (!moving && !used && Math.abs(dy) > 24) { used = true; step(f, dir); }
  }, { passive: false });
  addEventListener('keydown', e => {
    const dir = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key], f = dir && filmFor(dir);
    if (!dir || e.shiftKey || e.metaKey || e.target.closest('input, textarea, select, button, a') || (!moving && !f)) return;
    e.preventDefault();
    if (!moving) step(f, dir);
  });
  // "Scroll to explore" plays the first move; any other in-page link wins over a move in progress
  document.querySelectorAll('a[href="#launch-start"]').forEach(a => a.onclick = e => { e.preventDefault(); if (!moving) step(films[0], 1); });
  addEventListener('click', e => { if (e.target.closest('a[href^="#"]:not([href="#launch-start"])')) moving = false; });
})();
