// DheQuest film backdrop: a candlestick chart that races in as the page scrolls ("markets don't wait"), then dims while a
// tested equity curve draws over it with its buy markers ("test it, then trade it"). The beats and the night header are
// run by js/product-film.js; this follows the same scroll progress. Illustrative data from a seeded random walk.
(() => {
  const film = document.querySelector('.dq-film'), cv = film && film.querySelector('.dq-chart');
  if (!cv || !document.documentElement.classList.contains('pin')) return;
  const cx = cv.getContext('2d'), steps = [...film.querySelectorAll('.dq-steps li')];
  const clamp = v => Math.max(0, Math.min(1, v)), ease = (p, a, b) => clamp((p - a) / (b - a));
  const UP = '#5fbcc8', DOWN = '#e0606b', CURVE = '#7fe0ea';
  // the same chart on every visit
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const N = 72, bars = [];
  for (let i = 0, c = 100; i < N; i++) {
    const o = c, v = 2.2 + 1.6 * Math.sin(i / 7);
    c = o + (rnd() - 0.48) * v * 2;
    bars.push({ o, c, h: Math.max(o, c) + rnd() * v, l: Math.min(o, c) - rnd() * v });
  }
  // the tested strategy: a steadier climb, with a buy every few bars
  const eq = [0]; for (let i = 1; i < N; i++) eq.push(eq[i - 1] + 0.35 + (rnd() - 0.42) * 1.1);
  const lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h)), elo = Math.min(...eq), ehi = Math.max(...eq);
  let W = 0, H = 0, dpr = 1, lastP = -1;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect(); W = cv.width = Math.round(r.width * dpr); H = cv.height = Math.round(r.height * dpr); lastP = -1;
  };
  const X = i => W * 0.04 + (i + 0.5) * (W * 0.92 / N);
  const Y = v => H * 0.88 - (v - lo) / (hi - lo) * H * 0.62;
  const EY = v => H * 0.84 - (v - elo) / (ehi - elo) * H * 0.5;
  const draw = p => {
    cx.clearRect(0, 0, W, H);
    // faint price grid
    cx.globalAlpha = 0.08; cx.strokeStyle = '#fff'; cx.lineWidth = dpr;
    for (let k = 1; k < 6; k++) { const y = H * (0.22 + k * 0.12); cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }
    // candles: a few at first, then the whole market races in; they step back once the test starts
    const shown = Math.round(10 + (N - 10) * ease(p, 0.04, 0.46));
    cx.globalAlpha = 0.22 + 0.38 * ease(p, 0.24, 0.32) - 0.4 * ease(p, 0.5, 0.58);
    const bw = Math.max(2 * dpr, W * 0.92 / N * 0.56);
    for (let i = 0; i < shown; i++) {
      const b = bars[i], up = b.c >= b.o, x = X(i);
      cx.strokeStyle = cx.fillStyle = up ? UP : DOWN;
      cx.beginPath(); cx.moveTo(x, Y(b.h)); cx.lineTo(x, Y(b.l)); cx.stroke();
      const y0 = Y(Math.max(b.o, b.c)), y1 = Y(Math.min(b.o, b.c));
      cx.fillRect(x - bw / 2, y0, bw, Math.max(dpr, y1 - y0));
    }
    // the tested equity curve, with its buys
    const t = ease(p, 0.52, 0.76), n = Math.round(t * (N - 1));
    cx.globalAlpha = 1 - 0.75 * ease(p, 0.8, 0.88);
    if (n > 0) {
      cx.save(); cx.shadowColor = CURVE; cx.shadowBlur = 18 * dpr;
      cx.strokeStyle = CURVE; cx.lineWidth = 3 * dpr; cx.lineJoin = cx.lineCap = 'round';
      cx.beginPath(); for (let i = 0; i <= n; i++) i ? cx.lineTo(X(i), EY(eq[i])) : cx.moveTo(X(i), EY(eq[i])); cx.stroke(); cx.restore();
      cx.fillStyle = CURVE;
      for (let i = 6; i <= n; i += 9) { const x = X(i), y = EY(eq[i]) + 16 * dpr; cx.beginPath(); cx.moveTo(x, y - 7 * dpr); cx.lineTo(x - 6 * dpr, y + 4 * dpr); cx.lineTo(x + 6 * dpr, y + 4 * dpr); cx.fill(); }
      const x = X(n), y = EY(eq[n]); cx.beginPath(); cx.arc(x, y, 5 * dpr, 0, 6.283); cx.fill();
    }
    cx.globalAlpha = 1;
    // Back-test, then paper trade, then live
    steps.forEach((s, i) => s.classList.toggle('on', p >= 0.56 + i * 0.07));
  };
  const frame = () => {
    const r = film.getBoundingClientRect(), p = clamp(-r.top / (film.offsetHeight - innerHeight));
    if (p !== lastP) { lastP = p; draw(p); }
  };
  size(); frame();
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { frame(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', () => { size(); frame(); });
})();
