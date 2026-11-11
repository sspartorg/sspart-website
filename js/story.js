// Home page: the SSPART story. The chapter being read (the one crossing the middle of the screen) picks the scene on the
// sticky stage; the scenes morph with CSS. The globe is js/globe.js. A thin line down the story fills as it is read.
(() => {
  const story = document.querySelector('.story');
  if (!story) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = story.querySelector('.story-stage'), scenes = [...stage.querySelectorAll('.scene')], chapters = [...story.querySelectorAll('.chapter')];
  // Phones and tablets read the story straight down: each scene moves under its chapter (the globe above the headline,
  // the at-a-glance cards under "Who we are"); wide screens keep them on the sticky stage
  const narrow = matchMedia('(max-width: 900px)'), home = stage.querySelector('.stage-sticky');
  const globeScene = stage.querySelector('.sc-globe'), glance = [...stage.querySelectorAll('.who-head, .who-orbit')];
  const arrange = () => {
    if (!narrow.matches) { globeScene.append(...glance); home.append(...scenes); return; }
    scenes.forEach(s => { const c = story.querySelector(`.chapter[data-scene="${s.dataset.scenes.split(' ')[0]}"]`); s === globeScene ? c.prepend(s) : c.append(s); });
    story.querySelector('.chapter[data-scene="where"]').append(...glance);
  };
  arrange();
  narrow.addEventListener('change', () => { arrange(); dispatchEvent(new Event('resize')); });
  Globe(story.querySelector('.globe'), story.querySelector('.globe-slot'), story);
  const show = name => {
    stage.dataset.scene = name;
    scenes.forEach(s => s.classList.toggle('on', s.dataset.scenes.split(' ').includes(name)));
    chapters.forEach(c => c.classList.toggle('on', c.dataset.scene === name));
  };
  show('globe');
  const reading = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && show(e.target.dataset.scene)), { rootMargin: '-45% 0px -50% 0px' });
  chapters.forEach(c => reading.observe(c));
  // SSPART at a glance: the pieces revolve around the globe, passing in front of it and behind it
  const pieces = [...story.querySelectorAll('.who-piece')], box = stage.querySelector('.stage-sticky');
  const place = t => {
    const w = box.clientWidth, h = box.clientHeight, cx = w / 2, cy = h / 2, rx = Math.min(w * 0.42, 330), ry = Math.min(h * 0.3, 170);
    pieces.forEach((el, i) => {
      const a = t + i * 2 * Math.PI / pieces.length, depth = (Math.sin(a) + 1) / 2;  // 0 behind the globe, 1 in front
      el.style.transform = `translate(${cx + Math.cos(a) * rx}px, ${cy + Math.sin(a) * ry}px) translate(-50%, -50%) scale(${0.78 + 0.26 * depth})`;
      el.style.zIndex = depth > 0.5 ? 2 : 0;
      el.style.opacity = 0.45 + 0.55 * depth;
    });
  };
  if (still) place(0.4);
  else {
    let t = 0.4, last = 0;
    const orbit = now => {
      if (stage.dataset.scene === 'where') { t += Math.min(50, now - (last || now)) / 1000 * 0.22; place(t); }
      last = now; requestAnimationFrame(orbit);
    };
    requestAnimationFrame(orbit);
  }
  // the live run: Atlas's real agents work through one request, line by line, then start again
  const RUN = [['PO Writer', 'Split it into 3 sub-tasks', 'done'], ['Architect', 'Wrote the spec', 'reviewed'], ['Coder', 'Built each sub-task', 'reviewed'],
    ['QA agents', 'Wrote and automated the tests', 'reviewed'], ['Lint check', 'Ran your lint check', 'passed'], ['Build check', 'Ran your build', 'passed'],
    ['Tests check', 'Ran your tests', 'failed'], ['Coverage Fixer', 'Fixed the gap, reviewer checked it', 'fixed'], ['Tests check', 'Ran your tests again', 'passed'],
    ['Release Reviewer', 'Read it as one change against your request', 'approved']];
  const lines = story.querySelector('.term-lines');
  const line = ([who, what, st]) => { const li = document.createElement('li'); li.className = st; li.innerHTML = '<b></b><span></span><em></em>'; li.children[0].textContent = who; li.children[1].textContent = what; li.children[2].textContent = st; return li; };
  if (still) RUN.forEach(r => lines.append(line(r)));
  else {
    let at = 0;
    const tick = () => {
      if (!story.querySelector('.sc-globe.on') || story.getBoundingClientRect().bottom < 0) return;
      if (at === RUN.length) { lines.replaceChildren(); at = 0; return; }
      const li = line(RUN[at++]); lines.append(li);
      while (lines.children.length > 6) lines.firstElementChild.remove();
    };
    setInterval(tick, 900);
  }
  const text = story.querySelector('.story-text');
  let ticking = false;
  // the timeline runs from the first chapter's stop to the last; a stop lights up once the middle of the screen passes it
  const nums = [...story.querySelectorAll('.ch-num')];
  const read = () => {
    ticking = false;
    const r = text.getBoundingClientRect(), mid = innerHeight * 0.5 - r.top;
    const at = nums.map(n => { const b = n.getBoundingClientRect(); return b.top + b.height / 2 - r.top; }), a = at[0], z = at[at.length - 1];
    text.style.setProperty('--t0', `${a}px`); text.style.setProperty('--t1', `${z}px`);
    text.style.setProperty('--read', Math.max(0, Math.min(1, (mid - a) / (z - a))));
    nums.forEach((n, i) => n.closest('.chapter').classList.toggle('read', at[i] <= mid));
    document.documentElement.classList.toggle('in-story', r.bottom > innerHeight * 0.5);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
  addEventListener('resize', read); addEventListener('load', read);
  read();
})();
