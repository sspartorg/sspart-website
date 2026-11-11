// Product films (Synvord, DheQuest) that open their product page: the page turns night, a set of tiles drifts apart
// ("a tool for every job"), then snaps into one grid ("one platform, in order"). Scroll-linked; without the .pin film
// mode each film stays a static section. Every .sv-film on the page runs on its own.
(() => {
  if (!document.documentElement.classList.contains('pin')) return;
  const head = document.querySelector('.site-head');
  const clamp = v => Math.max(0, Math.min(1, v)), ease = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  // when each beat is on screen: [fade in from, fully in, start out, gone]
  const SPANS = [[-1, 0, 0.2, 0.26], [0.26, 0.31, 0.44, 0.5], [0.49, 0.55, 0.76, 0.8], [0.8, 0.86, 2, 3]];
  const films = [...document.querySelectorAll('.sv-film')].map(film => {
    const mark = film.querySelector('.sv-mark'), beats = [...film.querySelectorAll('.sv-beat')], chips = [...film.querySelectorAll('.sv-chips li')];
    // scattered spots are fixed per tile (seeded), so the scatter looks the same on every visit
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const loose = chips.map(() => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, r: (rnd() * 2 - 1) * 28, s: 0.8 + rnd() * 0.35 }));
    let grid = [], inside = false, lastP = -1;
    const layout = () => {
      // short screens (phones on their side) get small icon tiles in wide rows, so the grid fits under the words
      const short = innerHeight < 560, narrow = innerWidth < 760 || short, cols = short ? 9 : 5;
      const w = short ? 40 : narrow ? 52 : Math.min(176, (innerWidth - 120) / cols - 12), h = short ? 40 : narrow ? 52 : 50, g = short ? 8 : narrow ? 10 : 12;
      film.classList.toggle('sv-narrow', narrow);
      chips.forEach(c => { c.style.width = w + 'px'; c.style.height = c.style.minHeight = h + 'px'; });
      // the grid sits under the words of its beat, never on top of them
      const words = film.querySelector('.sv-b3')?.lastElementChild, below = words ? words.offsetTop + words.offsetHeight + 16 : 0;
      const rows = Math.ceil(chips.length / cols), top = Math.max(below, innerHeight * 0.58 - (rows * (h + g) - g) / 2);
      // tiles are placed by their centre, so the first row's centre is half a tile below the grid's top
      grid = chips.map((_, i) => ({ x: (i % cols - (cols - 1) / 2) * (w + g), y: top + h / 2 + Math.floor(i / cols) * (h + g) - innerHeight / 2 }));
      lastP = -1;
    };
    const frame = () => {
      const r = film.getBoundingClientRect(), p = clamp(-r.top / (film.offsetHeight - innerHeight));
      // the header joins the night while the film plays; only flip it when this film's state changes
      const now = r.top <= 1 && r.bottom > innerHeight * 0.5;
      if (now !== inside) { inside = now; head.classList.toggle('on-night', now); }
      if (p === lastP) return;
      lastP = p;
      beats.forEach((b, i) => {
        const [a, f, o, z] = SPANS[i], v = ease(p, a, f) * (1 - ease(p, o, z));
        b.style.opacity = v; b.style.visibility = v ? 'visible' : 'hidden';
        b.style.transform = `scale(${1.15 - 0.15 * ease(p, a, f + 0.04)})`;
      });
      if (mark && 'spin' in mark.dataset) mark.style.transform = `rotate(${-90 + 90 * smooth(ease(p, 0, 0.18))}deg)`; // Synvord's mark turns into place
      const order = smooth(ease(p, 0.47, 0.66));
      // the tiles leave with "in order", fully, before the next words arrive, so nothing sits under them
      const seen = ease(p, 0.22, 0.3) * (1 - ease(p, SPANS[2][2], SPANS[2][3]));
      chips.forEach((c, i) => {
        const L = loose[i], G = grid[i];
        const x = (L.x * innerWidth * 0.44) * (1 - order) + G.x * order, y = (L.y * innerHeight * 0.4) * (1 - order) + G.y * order;
        c.style.transform = `translate(${x}px, ${y}px) rotate(${L.r * (1 - order)}deg) scale(${L.s + (1 - L.s) * order})`;
        c.style.opacity = seen * (0.38 + 0.62 * order);
      });
    };
    layout(); frame();
    return { layout, frame };
  });
  if (!films.length) return;
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { films.forEach(f => f.frame()); ticking = false; }); } }, { passive: true });
  const relayout = () => films.forEach(f => { f.layout(); f.frame(); });
  addEventListener('resize', relayout);
  // the words under the grid change height once the web font and header settle, so measure again then
  addEventListener('load', relayout);
  document.fonts?.ready.then(relayout);
})();
