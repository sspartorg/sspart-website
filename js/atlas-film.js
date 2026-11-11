// Atlas page film backdrop: a board of 100 tasks fills as the page scrolls, each one taken on (violet) then delivered
// (green), while the count runs to 100 and Atlas's agents drift in. The beats and the night header are run by
// js/product-film.js; this follows the same scroll progress.
(() => {
  const film = document.querySelector('.at-film');
  if (!film || !document.documentElement.classList.contains('pin')) return;
  const cells = [...film.querySelectorAll('.at-board li')], board = film.querySelector('.at-board'), count = film.querySelector('#beat-count'), flyers = [...film.querySelectorAll('.fly')];
  const clamp = v => Math.max(0, Math.min(1, v)), ease = (p, a, b) => clamp((p - a) / (b - a));
  // tasks are taken in a scattered order (seeded), the way agents pick them up in parallel
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const order = cells.map((_, i) => [rnd(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]), rank = [];
  order.forEach((c, k) => { rank[c] = k; });
  // eases toward the scroll position at the same rate as js/product-film.js, so the board keeps time with the beats
  const FOLLOW = 0.18;
  let lastP = -1, cur = null;
  const frame = () => {
    const target = clamp(-film.getBoundingClientRect().top / (film.offsetHeight - innerHeight));
    cur = cur === null || Math.abs(target - cur) < 0.0005 ? target : cur + (target - cur) * FOLLOW;
    const p = cur;
    if (p === lastP) return false;
    lastP = p;
    const done = ease(p, 0.28, 0.46) * 100, taken = ease(p, 0.26, 0.42) * 100;
    count.textContent = Math.round(done);
    cells.forEach((c, i) => c.className = rank[i] < done ? 'done' : rank[i] < taken ? 'run' : '');
    board.style.opacity = ease(p, 0.22, 0.3) * (1 - ease(p, 0.44, 0.5));  // gone before "No new AI subscription"
    flyers.forEach((f, i) => {
      const t = ease(p, 0.3, 0.42), side = i % 2 ? 1 : -1;
      f.style.opacity = ease(p, 0.3, 0.36) * (1 - ease(p, 0.44, 0.5));
      f.style.transform = `translate(${side * (70 - t * 26)}vw, ${[-24, -24, 26][i] + (1 - t) * 12}vh) rotate(${side * (16 - t * 16)}deg)`;
    });
    return p !== target; // still easing: ask for another frame
  };
  frame();
  let ticking = false;
  const tick = () => { if (frame()) requestAnimationFrame(tick); else ticking = false; };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  addEventListener('resize', () => { lastP = -1; cur = null; frame(); });
})();
