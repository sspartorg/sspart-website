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
})();
