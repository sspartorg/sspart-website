// Atlas page: the header, the workflow map, the team and the task queue.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Same header behaviour as the home page: clear over the hero, solid once scrolling, with progress and section markers
  const root = document.documentElement, bar = document.querySelector('.progress');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    bar.style.transform = `scaleX(${scrollY / (root.scrollHeight - innerHeight)})`;
    root.style.setProperty('--head-a', Math.min(1, scrollY / 260));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  const marks = [...document.querySelectorAll('.rail a')];
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) marks.forEach(a => a.classList.toggle('active', a.hash === `#${e.target.id}`));
  }), { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(s => spy.observe(s));

  const items = [...document.querySelectorAll('.map-nodes li')], card = document.getElementById('map-card');
  const show = i => {
    const li = items[i], b = li.querySelector('button');
    items.forEach(x => x.classList.toggle('on', x === li));
    card.style.setProperty('--c', getComputedStyle(li).getPropertyValue('--c'));
    card.querySelector('.map-who').textContent = b.dataset.who;
    card.querySelector('h3').textContent = b.textContent;
    card.querySelector('.map-what').textContent = b.dataset.what;
  };
  let at = 0, timer;
  const stop = () => { clearInterval(timer); timer = 0; };
  const walk = () => { timer ||= setInterval(() => show(at = (at + 1) % items.length), 2400); };
  items.forEach((li, i) => li.querySelector('button').onclick = () => { stop(); paused = true; show(at = i); });
  let paused = false;
  show(0);
  // Walks the route only while it's on screen, and stops for good once someone picks a step
  if (!still) new IntersectionObserver(([e]) => { e.isIntersecting && !paused ? walk() : stop(); }, { threshold: 0.3 }).observe(document.getElementById('map'));


  // Who steps in for each kind of work
  const picks = [...document.querySelectorAll('.crew-picks button')], crew = [...document.querySelectorAll('.crew-group li')];
  const pick = b => {
    picks.forEach(p => p.setAttribute('aria-pressed', p === b));
    crew.forEach(c => c.classList.toggle('off', b.dataset.set !== 'all' && !c.dataset.in.includes(b.dataset.set)));
  };
  picks.forEach(b => b.onclick = () => pick(b));
  pick(picks[0]);

  // The task queue: one task at a time per repository, so at most one row per repository is ever running
  const queue = [...document.querySelectorAll('#q-rows li')], ready = document.getElementById('q-done');
  const set = (li, state, label) => { li.className = state; li.lastElementChild.textContent = label; };
  const finished = li => { set(li, 'ok', 'Ready'); ready.textContent = +ready.textContent + 1; };
  const repo = li => li.firstElementChild.textContent;
  const tick = q => {
    const busy = new Set();
    queue.filter(li => li.className === 'run').forEach(li => { if (++li.dataset.age > 1) finished(li); else busy.add(repo(li)); });
    queue.filter(li => !li.className).forEach(li => { if (!busy.has(repo(li))) { busy.add(repo(li)); li.dataset.age = 0; set(li, 'run', 'Working'); } });
    if (!busy.size) clearInterval(q);
  };
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    o.disconnect();
    if (still) return queue.forEach(finished);
    const q = setInterval(() => tick(q), 1100);
  }, { threshold: 0.35 }).observe(document.getElementById('queue'));
})();
