// Home page: the SSPART story. The chapter being read (the one crossing the middle of the screen) picks the scene on the
// sticky stage; the scenes morph with CSS. The globe is js/globe.js. A thin line down the story fills as it is read.
(() => {
  const story = document.querySelector('.story');
  if (!story) return;
  const stage = story.querySelector('.story-stage'), scenes = [...stage.querySelectorAll('.scene')], chapters = [...story.querySelectorAll('.chapter')];
  Globe(stage.querySelector('.globe'), stage.querySelector('.globe-slot'), story);
  const show = name => {
    stage.dataset.scene = name;
    scenes.forEach(s => s.classList.toggle('on', s.dataset.scenes.split(' ').includes(name)));
    chapters.forEach(c => c.classList.toggle('on', c.dataset.scene === name));
  };
  show('globe');
  const reading = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && show(e.target.dataset.scene)), { rootMargin: '-45% 0px -50% 0px' });
  chapters.forEach(c => reading.observe(c));
  // the live run: Atlas's real agents work through one request, line by line, then start again
  const RUN = [['PO Writer', 'Split it into 3 sub-tasks', 'done'], ['Architect', 'Wrote the spec', 'reviewed'], ['Coder', 'Built each sub-task', 'reviewed'],
    ['QA agents', 'Wrote and automated the tests', 'reviewed'], ['Lint check', 'Ran your lint check', 'passed'], ['Build check', 'Ran your build', 'passed'],
    ['Tests check', 'Ran your tests', 'failed'], ['Coverage Fixer', 'Fixed the gap, reviewer checked it', 'fixed'], ['Tests check', 'Ran your tests again', 'passed'],
    ['Release Reviewer', 'Read it as one change against your request', 'approved']];
  const lines = stage.querySelector('.term-lines'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const line = ([who, what, st]) => { const li = document.createElement('li'); li.className = st; li.innerHTML = '<b></b><span></span><em></em>'; li.children[0].textContent = who; li.children[1].textContent = what; li.children[2].textContent = st; return li; };
  if (still) RUN.forEach(r => lines.append(line(r)));
  else {
    let at = 0;
    const tick = () => {
      if (!stage.querySelector('.sc-globe.on') || story.getBoundingClientRect().bottom < 0) return;
      if (at === RUN.length) { lines.replaceChildren(); at = 0; return; }
      const li = line(RUN[at++]); lines.append(li);
      while (lines.children.length > 6) lines.firstElementChild.remove();
    };
    setInterval(tick, 900);
  }
  const text = story.querySelector('.story-text');
  let ticking = false;
  const read = () => { ticking = false; const r = text.getBoundingClientRect(); text.style.setProperty('--read', Math.max(0, Math.min(1, (innerHeight * 0.5 - r.top) / r.height))); };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(read); } }, { passive: true });
  read();
})();
