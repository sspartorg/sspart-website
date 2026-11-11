// Product films (Synvord, DheQuest) that open their product page: the page turns night, a set of tiles drifts apart
// ("a tool for every job"), then snaps into one grid ("one platform, in order"). Scroll-linked; without the .pin film
// mode each film stays a static section. Every .sv-film on the page runs on its own.
(() => {
  if (!document.documentElement.classList.contains('pin')) return;
  const head = document.querySelector('.site-head');
  const clamp = v => Math.max(0, Math.min(1, v)), ease = (p, a, b) => clamp((p - a) / (b - a));
  const smooth = t => t * t * (3 - 2 * t);
  // the film eases toward the scroll position instead of jumping with each wheel notch; js/atlas-film.js uses the same rate
  const FOLLOW = 0.32;
  // when each beat is on screen: [fade in from, fully in, start out, gone]
  // each beat arrives only once the one before has gone: they share the middle of the screen, so they must never cross-fade
  const SPANS = [[-1, 0, 0.2, 0.26], [0.26, 0.31, 0.44, 0.5], [0.5, 0.56, 0.76, 0.8], [0.8, 0.86, 2, 3]];
  const films = [...document.querySelectorAll('.sv-film')].map(film => {
    const mark = film.querySelector('.sv-mark'), beats = [...film.querySelectorAll('.sv-beat')], chips = [...film.querySelectorAll('.sv-chips li')];
    // scattered spots are fixed per tile (seeded), so the scatter looks the same on every visit
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const loose = chips.map(() => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, r: (rnd() * 2 - 1) * 28, s: 0.8 + rnd() * 0.35 }));
    let grid = [], inside = false, lastP = -1, cur = null;
    const layout = () => {
      // eight product lines, always named: 4 x 2 (short tiles on phones on their side), or 2 x 4 on narrow phones
      const short = innerHeight < 560, narrow = innerWidth < 760 && !short, cols = narrow ? 2 : 4, g = narrow ? 10 : 12;
      const w = narrow ? Math.min(176, (innerWidth - 32 - g) / 2) : Math.min(176, (innerWidth - 120) / cols - g), h = short ? 40 : narrow ? 46 : 50;
      chips.forEach(c => { c.style.width = w + 'px'; c.style.height = c.style.minHeight = h + 'px'; });
      // the words and the grid under them are centred together, as one block, in the screen below the header
      const rows = Math.ceil(chips.length / cols), gridH = rows * (h + g) - g, gap = narrow ? 32 : 48;
      const b3 = film.querySelector('.sv-b3'), headH = head.offsetHeight;
      let top = innerHeight * 0.58 - gridH / 2;
      if (b3 && chips.length) { // only a film with tiles under its words (Synvord)
        b3.style.paddingTop = '0px';
        const first = b3.firstElementChild, last = b3.lastElementChild, wordsH = last.offsetTop + last.offsetHeight - first.offsetTop;
        const blockTop = Math.max(headH + 16, headH + (innerHeight - headH - wordsH - gap - gridH) / 2);
        b3.style.paddingTop = blockTop + 'px';
        top = last.offsetTop + last.offsetHeight + gap; // the grid always starts under the words
      }
      // tiles are placed by their centre, so the first row's centre is half a tile below the grid's top
      grid = chips.map((_, i) => ({ x: (i % cols - (cols - 1) / 2) * (w + g), y: top + h / 2 + Math.floor(i / cols) * (h + g) - innerHeight / 2 }));
      lastP = -1; cur = null; // after a resize, snap rather than ease
    };
    const frame = () => {
      const r = film.getBoundingClientRect(), target = clamp(-r.top / (film.offsetHeight - innerHeight));
      cur = cur === null || Math.abs(target - cur) < 0.0005 ? target : cur + (target - cur) * FOLLOW;
      const p = cur;
      // the header joins the night while the film plays; only flip it when this film's state changes
      const now = r.top <= 1 && r.bottom > innerHeight * 0.5;
      if (now !== inside) { inside = now; head.classList.toggle('on-night', now); }
      if (p === lastP) return false;
      lastP = p;
      beats.forEach((b, i) => {
        const [a, f, o, z] = SPANS[i], v = ease(p, a, f) * (1 - ease(p, o, z));
        b.style.opacity = v; b.style.visibility = v ? 'visible' : 'hidden';
        // a beat arriving mid-film settles from 115% as it fades in; the first is on screen from the start, so instead
        // it grows slowly toward the viewer while it holds the screen and as it leaves, so scrolling always moves something
        b.style.transform = `scale(${a < 0 ? 1 + 0.14 * (1 - (1 - ease(p, 0, z)) ** 2) : 1.15 - 0.15 * ease(p, a, f + 0.04)})`;
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
      return p !== target; // still easing: ask for another frame
    };
    layout(); frame();
    return { layout, frame };
  });
  if (!films.length) return;
  let ticking = false;
  const tick = () => { const more = films.map(f => f.frame()).some(Boolean); if (more) requestAnimationFrame(tick); else ticking = false; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  const relayout = () => films.forEach(f => { f.layout(); f.frame(); });
  addEventListener('resize', relayout);
  // the words under the grid change height once the web font and header settle, so measure again then
  addEventListener('load', relayout);
  document.fonts?.ready.then(relayout);
})();
