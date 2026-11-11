// Atlas page: the workflow map, the team, the task queue and the usual-way-vs-Atlas comparison.
// (the console demo is js/console.js)
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = q => document.querySelector(q), $$ = q => document.querySelectorAll(q);
  // (the header and section markers are in page.js)

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

  // The comparison (moved from the home page), in a block so its names stay its own
  {
    // The comparison: one timeline, two rows. A playhead sweeps both at the same pace and reveals each phase;
    // when it passes Atlas's end, a marker shows where the usual way still was
    const race = $('.race');
    const rows = [...race.querySelectorAll('.g-row')].map(r => ({
      r, end: +r.dataset.end, last: r.dataset.last, now: r.querySelector('.g-now'),
      segs: [...r.querySelectorAll('.seg')].map(x => ({ a: +x.style.getPropertyValue('--a'), b: +x.style.getPropertyValue('--b'), st: x.dataset.status })),
    }));
    const RUN = 9000;
    const show = p => {
      race.style.setProperty('--p', p);
      const P = p * 100;
      for (const w of rows) {
        const done = P >= w.end;
        w.r.classList.toggle('done', done);
        w.now.textContent = done ? w.last : (w.segs.find(x => P >= x.a && P < x.b) || { st: 'Ready' }).st;
      }
      if (P >= rows[1].end && !race.classList.contains('atlas-done')) {
        race.classList.add('atlas-done');
        $('#race-say').innerHTML = `<b>Atlas delivered</b> while the usual way was still ${rows[0].now.textContent.toLowerCase().replace(/^sent back/, 'being sent back')}.`;
      }
      race.classList.toggle('usual-done', P >= rows[0].end);
    };
    let raceId = 0;
    const runRace = () => {
      const id = ++raceId, t0 = performance.now();
      race.classList.remove('atlas-done', 'usual-done'); $('#race-say').textContent = '';
      const tick = now => { if (id !== raceId) return; const p = Math.min(1, (now - t0) / RUN); show(p); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    $('.race-replay').onclick = runRace;
    if (still) show(1);
    else {
      const need = Math.min(0.85, innerHeight * 0.85 / race.offsetHeight);
      const seenRace = new IntersectionObserver(es => { if (es[0].intersectionRatio >= need) { runRace(); seenRace.disconnect(); } }, { threshold: [need] });
      seenRace.observe(race);
    }
  }
})();
