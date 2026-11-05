// Atlas page: the launch film that opens the page. The page falls to night, the globe grows, and Atlas is introduced one
// line at a time. Needs js/globe.js; js/film-steps.js turns each scroll gesture into one move between beats.
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
  // One gesture, one move: js/film-steps.js, with the stops in the film's data-stops
  const film = document.documentElement.classList.contains('pin');
  // (the header, progress bar and section markers are in page.js)
  let ticking = false;
  const onScroll = () => { ticking = false; if (film) launch(); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', () => { lastP = -1; onScroll(); });
  onScroll();
})();
