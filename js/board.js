// The Atlas task board: 100 cells walking from queued to delivered. Used on the home page and atlas.html.
(() => {
  const grid = document.getElementById('board');
  if (!grid) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STAGES = ['Queued', 'Planned', 'Built', 'Checked', 'Delivered'];
  const JOBS = ['Update the pricing page', 'Add GST to invoices', 'Fix the login timeout', 'Add an export button', 'Translate the checkout', 'Clean up old reports', 'Add a stock alert', 'Fix the search filter'];
  const TOTAL = 100, AT_ONCE = 4, TICK = 150, HOLD = 5000;
  const count = document.getElementById('board-count'), now = document.getElementById('board-now');
  const cells = Array.from({ length: TOTAL }, () => grid.appendChild(document.createElement('i')));

  // A handful are in progress at any time and the rest wait their turn
  let stage, next, done, timer;
  const paint = (c, s) => { c.className = `s${s}`; };
  const reset = () => { stage = cells.map(() => 0); next = 0; done = 0; cells.forEach(c => paint(c, 0)); count.textContent = 0; };
  const start = () => { timer ||= setInterval(tick, TICK); };
  const stop = () => { clearInterval(timer); timer = 0; };
  const tick = () => {
    const active = stage.flatMap((s, i) => s > 0 && s < 4 ? [i] : []);
    while (active.length < AT_ONCE && next < TOTAL) { active.push(next); stage[next] = 1; paint(cells[next], 1); next++; }
    const i = active[Math.floor(Math.random() * active.length)];
    if (i === undefined) { stop(); return setTimeout(() => { reset(); start(); }, HOLD); }
    stage[i]++; paint(cells[i], stage[i]);
    now.textContent = `${JOBS[i % JOBS.length]}: ${STAGES[stage[i]].toLowerCase()}`;
    if (stage[i] === 4) count.textContent = ++done;
  };

  reset();
  if (still) { cells.forEach(c => paint(c, 4)); count.textContent = TOTAL; now.textContent = 'All 100 tasks delivered'; }
  else new IntersectionObserver(([e]) => e.isIntersecting ? start() : stop()).observe(grid);
})();
