// Home page: the Atlas console. A scripted run of the real delivery steps, played against whatever the visitor types.
(() => {
  const box = document.getElementById('console');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const form = document.getElementById('con-form'), req = document.getElementById('con-req'), log = document.getElementById('con-log'), done = document.getElementById('con-done');
  const rail = [...document.getElementById('con-rail').children];
  const STEP = 620;
  // [stage on the rail, robot, who, what happened, result, failed?]
  const STEPS = [
    [0, 1, 'PO Writer', 'Split it into 3 sub-tasks', 'Done'],
    [0, 2, 'Architect', 'Wrote the spec', 'Reviewed'],
    [1, 5, 'Coder', 'Built each sub-task', 'Reviewed'],
    [1, 1, 'QA agents', 'Wrote and automated the tests', 'Reviewed'],
    [1, 2, 'Doc Writer', 'Updated the documentation', 'Reviewed'],
    [2, 1, 'Lint check', 'Atlas ran your lint check', 'Passed'],
    [2, 2, 'Build check', 'Atlas ran your build', 'Passed'],
    [2, 5, 'Tests check', 'Atlas ran your tests', 'Failed', true],
    [2, 1, 'Coverage Fixer', 'Fixed the gap, and a reviewer checked it', 'Fixed'],
    [2, 5, 'Tests check', 'Atlas ran your tests again', 'Passed'],
    [2, 2, 'Release Reviewer', 'Read it as one change against your request', 'Approved'],
  ];
  const row = ([, bot, who, what]) => {
    const li = document.createElement('li');
    const img = new Image(); img.src = `resources/people/agent-${bot}.svg`; img.alt = '';
    const b = document.createElement('b'), s = document.createElement('span'), e = document.createElement('em');
    b.textContent = who; s.textContent = what;
    li.append(img, b, s, e);
    return li;
  };
  const rows = STEPS.map(row);
  log.append(...rows);

  const sum = id => document.getElementById(`sum-${id}`);
  const count = { agents: 0, checks: 0, fixes: 0 };
  const tally = () => Object.entries(count).forEach(([k, v]) => sum(k).textContent = v);
  const reset = () => {
    rows.forEach(li => { li.className = 'wait'; li.lastChild.textContent = 'Waiting'; });
    rail.forEach(r => r.classList.remove('on'));
    done.textContent = 'Type a requirement, then press Deliver it.'; done.classList.remove('ok');
    count.agents = count.checks = count.fixes = 0; tally();
    sum('who').textContent = 'You';
  };
  const show = i => {
    const s = STEPS[i];
    rows[i].className = s[5] ? 'bad' : '';
    rows[i].lastChild.textContent = s[4];
    rail[s[0]].classList.add('on');
    count[s[2].endsWith('check') ? 'checks' : 'agents']++;
    if (s[4] === 'Fixed') count.fixes++;
    tally();
    sum('who').textContent = s[2];
  };
  let timer;
  const finish = () => {
    rail.forEach(r => r.classList.add('on'));
    sum('who').textContent = 'You';
    done.textContent = `Delivered: "${req.value.trim() || 'Your requirement'}" is ready for your approval.`;
    done.classList.add('ok');
  };
  const run = () => {
    clearInterval(timer);
    reset();
    if (still) { STEPS.forEach((_, i) => show(i)); return finish(); }
    done.textContent = 'Atlas is working on it.';
    let i = 0;
    timer = setInterval(() => {
      if (i === STEPS.length) { clearInterval(timer); return finish(); }
      show(i++);
    }, STEP);
  };
  reset();
  form.onsubmit = e => { e.preventDefault(); run(); };
  form.querySelectorAll('.con-chips button').forEach(b => b.onclick = () => { req.value = b.textContent; run(); });
  // Plays once, the first time it's seen
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); run(); } }, { threshold: 0.35 }).observe(box);
})();
