// Product pages (Atlas, Synvord, DheQuest): the header, the section markers and the screenshot tabs.
(() => {
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

  // Screenshot tabs: each button shows the matching image and updates the address bar
  document.addEventListener('click', e => {
    const b = e.target.closest('.shot-tabs button'); if (!b) return;
    const w = b.closest('.window'), i = [...b.parentNode.children].indexOf(b);
    w.querySelectorAll('.shot-tabs button').forEach((x, j) => { x.classList.toggle('on', j === i); x.setAttribute('aria-pressed', j === i); });
    w.querySelectorAll('.shots img').forEach((x, j) => x.classList.toggle('on', j === i));
    w.querySelector('.bar span').textContent = b.dataset.url;
  });

  // Screenshots open full size, at their largest source: the frames crop tall screens to 16:10
  const box = document.createElement('dialog');
  box.className = 'lightbox';
  box.innerHTML = '<button type="button" class="lightbox-close" aria-label="Close">&times;</button><img alt="">';
  document.body.append(box);
  const big = box.querySelector('img');
  const largest = img => img.srcset ? img.srcset.split(',').map(s => s.trim().split(/\s+/)).sort((a, b) => parseInt(b[1]) - parseInt(a[1]))[0][0] : img.currentSrc;
  const open = shots => {
    const img = shots.querySelector('img.on') || shots.querySelector('img'); // the images are stacked; the shown one has .on
    big.src = largest(img); big.alt = img.alt;
    box.showModal();
  };
  document.querySelectorAll('.window.real .shots').forEach(s => {
    s.tabIndex = 0; s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'Open this screen full size');
    s.addEventListener('click', () => open(s));
    s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(s); } });
  });
  // a click anywhere closes it, the picture included, unless the picture is wider than the screen (phones) and is being
  // swiped across; Esc and the close button always work
  box.addEventListener('click', e => { if (e.target !== big || big.offsetWidth <= box.clientWidth) box.close(); });
})();
