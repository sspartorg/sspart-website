// Home page: the SSPART film. The hero first; as the page scrolls, night falls, the globe opens out into a soft
// backdrop, SSPART is introduced, and its three products fly out to revolve around it. Moves with the scroll.
// Needs js/globe.js. Without the .pin film mode it is a plain section.
(() => {
  const pin = document.querySelector('.hero-pin');
  if (!pin) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, film = document.documentElement.classList.contains('pin');
  const clamp = v => Math.max(0, Math.min(1, v)), ease = (p, a, b) => clamp((p - a) / (b - a)), smooth = t => t * t * (3 - 2 * t);
  const globe = pin.querySelector('.globe'), slot = pin.querySelector('.globe-slot');
  const { zoom } = Globe(globe, slot, document.querySelector('.hero'));
  if (!film) return;
  const head = document.querySelector('.site-head'), night = pin.querySelector('.hero-night'), copy = pin.querySelector('.hero-copy'), hud = pin.querySelector('.hud-bar');
  const beats = [...pin.querySelectorAll('.beat')], orbit = pin.querySelector('.orbit'), core = orbit.querySelector('.orbit-core'), items = [...orbit.querySelectorAll('.orbit-item')];
  let p = 0, lastP = -1;
  const scene = () => {
    night.style.opacity = ease(p, 0.02, 0.13);
    head.classList.toggle('on-night', p > 0.09 && p < 1);
    const out = ease(p, 0, 0.1);
    copy.style.opacity = hud.style.opacity = 1 - out;
    copy.style.transform = `translateY(${-out * 120}px)`;
    copy.style.visibility = out === 1 ? 'hidden' : 'visible';
    // the globe grows past the edges, then settles into a faint backdrop
    zoom(ease(p, 0, 0.3));
    slot.style.opacity = 1 - out;
    globe.style.opacity = 1 - 0.62 * ease(p, 0.18, 0.4);
    beats.forEach(b => {
      const a = +b.dataset.a, v = ease(p, a, a + 0.05) * (1 - ease(p, +b.dataset.z - 0.04, +b.dataset.z));
      b.style.opacity = v; b.style.visibility = v ? 'visible' : 'hidden';
      b.style.transform = `scale(${1.15 - 0.15 * ease(p, a, a + 0.08)})`;
    });
  };
  // The orbit: SSPART at the centre, the products fly out from it and keep revolving while the film is on screen
  const spin = () => {
    const show = ease(p, 0.33, 0.4), spread = smooth(ease(p, 0.34, 0.5)), focus = smooth(ease(p, 0.6, 0.66)) * (1 - ease(p, 0.77, 0.81));
    orbit.style.opacity = show;
    orbit.style.visibility = show ? 'visible' : 'hidden';
    const cx = innerWidth / 2, cy = innerHeight * 0.62, rx = Math.min(innerWidth * 0.36, 470) * spread, ry = rx * (innerWidth < 700 ? 1.05 : 0.36); // a tall circle on phones, a wide ellipse elsewhere
    core.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%) scale(${(0.7 + 0.3 * spread) * (1 - 0.35 * focus)})`;
    core.style.opacity = 1 - 0.82 * focus;  // SSPART steps back while Atlas takes the centre
    const turn = (still ? 0 : performance.now() / 1000 * 0.16) + p * 3.2;
    items.forEach((it, i) => {
      const a = turn + i * 2.0944, depth = (Math.sin(a) + 1) / 2;  // 0 at the back, 1 at the front
      const atlas = i === 0 ? focus : 0, k = (0.78 + 0.26 * depth) * (1 - atlas) + 1.45 * atlas;
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;  // on the orbit; Atlas glides to the centre when it is the subject
      it.style.transform = `translate(${x + (cx - x) * atlas}px, ${y + (cy - y) * atlas}px) translate(-50%, -50%) scale(${k})`;
      it.style.zIndex = Math.round(depth * 10) + (atlas > 0.5 ? 20 : 0);
      it.style.opacity = (0.55 + 0.45 * depth) * (i && focus ? 1 - 0.55 * focus : 1);
    });
  };
  const frame = () => {
    p = clamp(-pin.getBoundingClientRect().top / (pin.offsetHeight - innerHeight));
    if (p !== lastP) { lastP = p; scene(); }
    spin();
  };
  let live = false;
  const loop = () => { if (!live) return; frame(); requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { live = e.isIntersecting; if (live) requestAnimationFrame(loop); }).observe(pin);
  addEventListener('resize', () => { lastP = -1; frame(); });
  frame();
  // "Scroll to explore" glides down to SSPART's introduction
  document.querySelectorAll('a[href="#launch-start"]').forEach(a => a.onclick = e => {
    e.preventDefault();
    scrollTo({ top: pin.getBoundingClientRect().top + scrollY + (pin.offsetHeight - innerHeight) * 0.24, behavior: 'smooth' });
  });
})();
