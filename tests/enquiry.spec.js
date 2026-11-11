// Atlas page, enquiry form and owner desk, with Supabase mocked at the network.
const { test, expect } = require('@playwright/test');

const SB = 'https://test.supabase.co';
const useConfig = page => page.route('**/js/config.js*', r => r.fulfill({ contentType: 'text/javascript', body: `window.SSPART_SUPABASE = { url: '${SB}', key: 'public-key' };` }));
const fill = async (page, { mobile = '+91 95150 93965' } = {}) => {
  await page.fill('[name=name]', 'Asha Rao');
  await page.fill('[name=mobile]', mobile);
  await page.fill('[name=message]', 'We would like Atlas pricing.');
};

test('the product link fills in the dropdown', async ({ page }) => {
  await page.goto('/contact.html?product=Atlas%20Enterprise');
  await expect(page.locator('[name=product]')).toHaveValue('Atlas Enterprise');
  await page.goto('/contact.html?product=Nonsense');
  await expect(page.locator('[name=product]')).toHaveValue('Other');
});

test('a valid enquiry is sent with only the public fields', async ({ page }) => {
  await useConfig(page);
  let sent, headers;
  await page.route(`${SB}/rest/v1/enquiries`, r => { sent = r.request().postDataJSON(); headers = r.request().headers(); r.fulfill({ status: 201 }); });
  await page.goto('/contact.html?product=Atlas');
  await fill(page);
  await page.click('button[type=submit]');
  await expect(page.locator('#done')).toBeVisible();
  await expect(page.locator('#enquiry')).toBeHidden();
  expect(sent).toMatchObject({ name: 'Asha Rao', mobile: '+91 95150 93965', product: 'Atlas', email: null });
  expect(Object.keys(sent)).not.toContain('status');
  expect(headers.prefer).toBe('return=minimal');
});

test('invalid details are refused with a reason and nothing is sent', async ({ page }) => {
  await useConfig(page);
  let calls = 0;
  await page.route(`${SB}/rest/v1/enquiries`, r => { calls++; r.fulfill({ status: 201 }); });
  await page.goto('/contact.html');
  await page.click('button[type=submit]');
  await expect(page.locator('#status')).toHaveText('Enter your name.');
  await fill(page, { mobile: '123' });
  await page.click('button[type=submit]');
  await expect(page.locator('#status')).toContainText('valid mobile');
  await expect(page.locator('[name=mobile]')).toHaveAttribute('aria-invalid', 'true');
  expect(calls).toBe(0);
});

test('a filled honeypot looks like success but sends nothing', async ({ page }) => {
  await useConfig(page);
  let calls = 0;
  await page.route(`${SB}/rest/v1/enquiries`, r => { calls++; r.fulfill({ status: 201 }); });
  await page.goto('/contact.html');
  await fill(page);
  await page.evaluate(() => { document.querySelector('[name=contact_time]').value = 'http://spam.example'; });
  await page.click('button[type=submit]');
  await expect(page.locator('#done')).toBeVisible();
  expect(calls).toBe(0);
});

for (const [name, setup] of [
  ['server error', page => page.route(`${SB}/rest/v1/enquiries`, r => r.fulfill({ status: 500, body: '{}' }))],
  ['network failure', page => page.route(`${SB}/rest/v1/enquiries`, r => r.abort())],
]) {
  test(`${name}: the text stays and the visitor gets another way to reach us`, async ({ page }) => {
    await useConfig(page);
    await setup(page);
    await page.goto('/contact.html');
    await fill(page);
    await page.click('button[type=submit]');
    await expect(page.locator('#status')).toContainText('+91 95150 93965');
    await expect(page.locator('[name=message]')).toHaveValue('We would like Atlas pricing.');
    await expect(page.locator('button[type=submit]')).toBeEnabled();
  });
}

test('with no Supabase project configured, the form still points to email and phone', async ({ page }) => {
  await page.goto('/contact.html');
  await fill(page);
  await page.click('button[type=submit]');
  await expect(page.locator('#status')).toContainText('contact@sspart-enterprise.com');
});

test('the repeat limit gets its own message', async ({ page }) => {
  await useConfig(page);
  await page.route(`${SB}/rest/v1/enquiries`, r => r.fulfill({ status: 400, contentType: 'application/json', body: '{"code":"P0001"}' }));
  await page.goto('/contact.html');
  await fill(page);
  await page.click('button[type=submit]');
  await expect(page.locator('#status')).toContainText('in the last hour');
});

test('atlas page: the board runs, pricing shows and the promises stay true', async ({ page }) => {
  await page.goto('/atlas.html');
  await expect(page.locator('#board i')).toHaveCount(100);
  await page.locator('#board').evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('#board-count')).not.toHaveText('0', { timeout: 10_000 });
  await expect(page.locator('.tier-main .price')).toContainText('$19');
  const text = await page.locator('body').innerText();
  for (const banned of [/auto.?merge/i, /tamper/i, /SOC 2/i, /SAML/i, /GitLab/i, /Bitbucket/i, /Slack/i, /unlimited/i, /enterprise.ready/i, /Copilot Studio/i, /Watson/i, /\bDevin\b/i, /Cursor/i]) {
    expect(text, String(banned)).not.toMatch(banned);
  }
});

test('atlas page: the console delivers what the visitor typed, and Atlas pricing is there', async ({ page }) => {
  await page.goto('/atlas.html');
  const flag = page.locator('#flagship');
  await expect(page.locator('#pricing')).toContainText('$19');
  await expect(flag.locator('#board')).toHaveCount(0);
  await flag.locator('#console').evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.fill('#con-req', '<b>Add a refund page</b>');
  await page.click('#con-form button[type=submit]');
  await expect(page.locator('#con-log')).toContainText('Failed');
  await expect(page.locator('#con-done')).toContainText('ready for your approval', { timeout: 15_000 });
  await expect(page.locator('#con-done b')).toHaveCount(0);
  await expect(page.locator('#con-rail li.on')).toHaveCount(4);
  await expect(page.locator('#con-log li.wait')).toHaveCount(0);
  await expect(page.locator('#sum-checks')).toHaveText('4');
  await expect(page.locator('#sum-fixes')).toHaveText('1');
  await expect(page.locator('#sum-who')).toHaveText('You');
});

test('atlas page: each kind of work lights its own specialists', async ({ page }) => {
  await page.goto('/atlas.html');
  const lit = page.locator('.crew-group li:not(.off)');
  await expect(page.locator('.crew-group li')).toHaveCount(24);
  await expect(lit).toHaveCount(16);
  for (const [name, n] of [['Quick change', 4], ['Repository readiness', 1], ['Research and upkeep', 5], ['Your own workflow', 24], ['Full delivery', 16]]) {
    await page.locator('.crew-picks button', { hasText: name }).evaluate(b => b.click());
    await expect(lit).toHaveCount(n);
    await expect(page.locator('.crew-picks [aria-pressed="true"]')).toContainText(name);
  }
});

test('atlas page: the queue never runs two tasks in one repository, and finishes at 100', async ({ page }) => {
  await page.goto('/atlas.html');
  await page.locator('#queue').evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  // Sampled from inside the page on every change, so a clash between polls can't slip through
  const peak = await page.evaluate(() => new Promise(done => {
    let most = 0;
    const list = document.getElementById('q-rows');
    new MutationObserver(() => {
      const r = [...list.querySelectorAll('li.run span')].map(s => s.textContent);
      if (new Set(r).size !== r.length) done(-1);
      most = Math.max(most, r.length);
      if (list.querySelectorAll('li.ok').length === 8) done(most);
    }).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }));
  expect(peak, 'different repositories run side by side').toBeGreaterThan(1);
  await expect(page.locator('#q-done')).toHaveText('100');
});

test('atlas page: every workflow step explains itself when selected', async ({ page }) => {
  await page.goto('/atlas.html');
  const steps = page.locator('.map-nodes button');
  await expect(steps).toHaveCount(12);
  await steps.nth(8).evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await steps.nth(8).click();
  await expect(page.locator('#map-card h3')).toHaveText('Tests check');
  await expect(page.locator('#map-card')).toContainText('never counts as a pass');
  await page.waitForTimeout(3000);
  await expect(page.locator('#map-card h3'), 'a chosen step stays chosen').toHaveText('Tests check');
});

test('atlas page: reduced motion shows the finished board and no animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/atlas.html');
  await expect(page.locator('#board-count')).toHaveText('100');
  await expect(page.locator('#board i.s4')).toHaveCount(100);
  await page.locator('#queue').evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('#q-done')).toHaveText('100');
  await expect(page.locator('.film-logo').first(), 'the film is a plain section').toBeVisible();
  await expect(page.locator('#con-log li')).toHaveCount(11);
  await page.locator('#console').evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('#con-done')).toContainText('ready for your approval');
});

test('home page: the SSPART story changes the stage as each chapter is read, and links to every product', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero h1')).toBeVisible();
  await expect(page.locator('.scene.on')).toHaveClass(/sc-globe/);
  const read = async (scene, cls) => {
    await page.locator(`.chapter[data-scene="${scene}"]`).evaluate(c => { const r = c.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }); });
    await expect(page.locator('.scene.on')).toHaveClass(cls);
    await expect(page.locator(`.chapter[data-scene="${scene}"]`)).toHaveClass(/\bon\b/);
  };
  await read('where', /sc-globe/);
  await expect(page.locator('.who-piece')).toHaveCount(5);
  // the at-a-glance cards circle the globe on wide screens and roll past under "Who we are" on narrow ones
  await expect(page.locator('.who-orbit')).toBeVisible();
  await read('services', /sc-services/);
  await expect(page.locator('.svc-nodes li')).toHaveCount(6);
  await read('atlas', /sc-shot/);
  await expect(page.locator('.scene.on .device img')).toHaveAttribute('src', /atlas-dashboard/);
  await read('synvord', /sc-board/);
  await read('dhequest', /sc-shot/);
  await expect(page.locator('.scene.on .device img')).toHaveAttribute('src', /dhequest/);
  await read('clients', /sc-clients/);
  for (const href of ['atlas.html', 'synvord.html', 'dhequest.html']) await expect(page.locator(`.story .ch-link[href="${href}"]`)).toHaveCount(1);
});

test('home page: the story timeline has one stop per chapter, fills in order, and stands in for the header bar', async ({ page }) => {
  await page.goto('/');
  const state = () => page.evaluate(() => {
    const text = document.querySelector('.story-text'), t = text.getBoundingClientRect().top, line = getComputedStyle(text, '::before');
    const dot = n => { const b = n.getBoundingClientRect(); return b.top + b.height / 2 - t; };
    const nums = [...document.querySelectorAll('.story .ch-num')];
    return { stops: nums.length, read: nums.map(n => n.closest('.chapter').classList.contains('read')),
      lineTop: parseFloat(line.top), lineEnd: parseFloat(line.top) + parseFloat(line.height), first: dot(nums[0]), last: dot(nums.at(-1)),
      heroEnd: document.querySelector('.ch-hero').getBoundingClientRect().bottom - t, bar: +getComputedStyle(document.querySelector('.site-head .progress')).opacity };
  });
  let s = await state();
  expect(s.stops).toBe(6);
  // the line runs from the first stop to the last, never beside the headline
  expect(Math.abs(s.lineTop - s.first)).toBeLessThan(2);
  expect(Math.abs(s.lineEnd - s.last)).toBeLessThan(2);
  expect(s.lineTop).toBeGreaterThan(s.heroEnd);
  expect(s.read.some(Boolean), 'stops lit before reading').toBe(false);
  await expect.poll(async () => (await state()).bar, { message: 'header bar shown during the story' }).toBe(0);
  await page.locator('.chapter[data-scene="services"]').evaluate(c => { const r = c.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2, behavior: 'instant' }); });
  await expect.poll(async () => (await state()).read).toEqual([true, true, false, false, false, false]);
  await page.locator('#clients').evaluate(c => scrollTo({ top: scrollY + c.getBoundingClientRect().top, behavior: 'instant' }));
  await expect.poll(async () => (await state()).bar, { message: 'header bar back after the story' }).toBe(1);
});

// Film chips are fixed-size boxes: every label must fit inside its box at every screen size
for (const url of ['/synvord.html']) {
  test(`${url}: every film chip label fits inside its chip, words unbroken`, async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => scrollBy(0, innerHeight));
    const spill = await page.evaluate(() => [...document.querySelectorAll('.sv-chips li')].filter(li => {
      const t = li.querySelector('span'); if (!t || getComputedStyle(t).display === 'none') return false;
      const a = li.getBoundingClientRect(), b = t.getBoundingClientRect();
      const brokenWord = !t.textContent.includes(' ') && t.offsetHeight > parseFloat(getComputedStyle(t).lineHeight) * 1.5; // one word split over two lines
      return brokenWord || li.scrollWidth > li.clientWidth + 1 || li.scrollHeight > li.clientHeight + 1 || b.right > a.right + 1 || b.bottom > a.bottom + 1;
    }).map(li => li.textContent.trim()));
    expect(spill, 'chip labels that spill out of their box').toEqual([]);
  });
}

// When the tiles snap into order, the grid sits under the words and inside the screen, on every screen shape
for (const url of ['/synvord.html']) {
  test(`${url}: the ordered tile grid never covers the words and stays on screen`, async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => { const f = document.querySelector('.sv-film'); scrollTo({ top: f.getBoundingClientRect().top + scrollY + (f.offsetHeight - innerHeight) * 0.68, behavior: 'instant' }); });
    // wait until the tiles have stopped moving
    const tops = () => page.evaluate(() => [...document.querySelectorAll('.sv-chips li')].map(c => Math.round(c.getBoundingClientRect().top)).join());
    let before = '';
    await expect.poll(async () => { const now = await tops(), same = now === before; before = now; return same; }, { intervals: [100] }).toBe(true);
    const m = await page.evaluate(() => {
      const f = document.querySelector('.sv-film'), chips = [...f.querySelectorAll('.sv-chips li')], words = f.querySelector('.sv-b3');
      const text = [...words.children].map(e => e.getBoundingClientRect());
      const r = chips.map(c => c.getBoundingClientRect());
      return { chips: chips.length, textBottom: Math.max(...text.map(t => t.bottom)), gridTop: Math.min(...r.map(c => c.top)), gridBottom: Math.max(...r.map(c => c.bottom)),
        overlaps: r.flatMap((a, i) => r.slice(i + 1).filter(b => a.left < b.right + 2 && b.left < a.right + 2 && a.top < b.bottom + 2 && b.top < a.bottom + 2).map(() => chips[i].textContent.trim())),
        gridLeft: Math.min(...r.map(c => c.left)), gridRight: Math.max(...r.map(c => c.right)), w: innerWidth, h: innerHeight };
    });
    expect(m.chips, 'the film has its tiles').toBeGreaterThan(0);
    expect(m.gridTop, 'tiles start below the words').toBeGreaterThanOrEqual(m.textBottom);
    expect(m.gridBottom, 'tiles end above the bottom of the screen').toBeLessThanOrEqual(m.h);
    expect(m.overlaps, 'tiles that touch or overlap a neighbour').toEqual([]);
    expect(m.gridLeft).toBeGreaterThanOrEqual(0);
    expect(m.gridRight).toBeLessThanOrEqual(m.w);
  });
}

// Through the whole film no two beats' words overlap; and once the tiles settle into their grid (from 66% on),
// no words sit over a tile. The drifting tiles behind "A tool for every job" are the scatter, on purpose.
test('/synvord.html: film words never overlap each other, nor the tiles once they are in order', async ({ page }) => {
  await page.goto('/synvord.html');
  const clashes = [];
  for (let q = 0; q <= 1; q += 0.01) {
    await page.evaluate(q => { const f = document.querySelector('.sv-film'); scrollTo({ top: f.getBoundingClientRect().top + scrollY + (f.offsetHeight - innerHeight) * q, behavior: 'instant' }); }, q);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    clashes.push(...await page.evaluate(q => {
      const f = document.querySelector('.sv-film'), on = e => +getComputedStyle(e).opacity > 0.02;
      const boxes = [...f.querySelectorAll('.sv-beat')].filter(on).map(b => ({ name: b.className, r: [...b.children].map(c => c.getBoundingClientRect()) }));
      const tiles = [...f.querySelectorAll('.sv-chips li')].filter(on).map(c => c.getBoundingClientRect());
      const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const out = [];
      boxes.forEach((b, i) => {
        boxes.slice(i + 1).forEach(o => { if (b.r.some(x => o.r.some(y => hit(x, y)))) out.push(`${q.toFixed(2)}: ${b.name} over ${o.name}`); });
        if (q >= 0.66 && b.r.some(x => tiles.some(t => hit(x, t)))) out.push(`${q.toFixed(2)}: ${b.name} over the tiles`);
      });
      return out;
    }, q));
  }
  expect(clashes).toEqual([]);
});

// Every product film moves with the scroll: nothing snaps, nothing takes over, wherever the visitor stops is where it stays
for (const [url, sel] of [['/atlas.html', '.sv-film'], ['/synvord.html', '.sv-film'], ['/dhequest.html', '.sv-film']]) {
  test(`${url}: the film follows the scroll smoothly and never snaps`, async ({ page, isMobile }) => {
    await page.goto(url);
    const at = () => page.evaluate(sel => { const p = document.querySelector(sel); return { y: scrollY, f: (scrollY - (p.getBoundingClientRect().top + scrollY)) / (p.offsetHeight - innerHeight) }; }, sel);
    // Touch screens have no wheel: scroll the page itself, then check nothing pulls it to a beat
    if (isMobile) await page.evaluate(() => scrollBy(0, 300));
    else { await page.mouse.move(400, 400); await page.mouse.wheel(0, 300); }
    await expect.poll(async () => (await at()).y).toBeGreaterThan(250);
    await page.waitForTimeout(900);
    const { y, f } = await at();
    expect(y, 'the page moved by what was scrolled, no more').toBeLessThan(360);
    expect(f, 'part-way into the film, not on a beat').toBeGreaterThan(0.02);
    expect(f).toBeLessThan(0.2);
  });
}

for (const [page_, name] of [['atlas.html', 'Atlas'], ['synvord.html', 'Synvord'], ['dhequest.html', 'DheQuest']]) {
  test(`${page_}: the film opens the page, turns the header night, then hands over`, async ({ page }) => {
    await page.goto('/' + page_);
    const film = page.locator('.sv-film');
    await expect(film.locator('.film-logo img'), 'the film opens with the real logo').toHaveAttribute('alt', name);
    await expect(page.locator('.site-head')).toHaveClass(/on-night/);
    const at = f => page.evaluate(f => { const s = document.querySelector('.sv-film'); scrollTo({ top: s.offsetTop + (s.offsetHeight - innerHeight) * f, behavior: 'instant' }); }, f);
    await at(0.9);
    await expect(film.locator('.sv-b4 .beat-cta a').first()).toBeVisible();
    await at(1.3);
    await expect(page.locator('.site-head')).not.toHaveClass(/on-night/);
    await expect(page.locator('.a-hero h1')).toBeVisible();
  });
}

test('section links land on their section, from a click and from another page', async ({ page }) => {
  const top = sel => page.evaluate(s => document.querySelector(s).getBoundingClientRect().top, sel);
  await page.goto('/');
  await page.evaluate(() => document.querySelector('a[href="#clients"]').click());
  // ponytail: lazy images above can add about 150px on small screens while the jump runs; give them fixed sizes if it matters
  await expect.poll(() => top('#clients'), { timeout: 12_000 }).toBeLessThan(260);
  expect(await top('#clients')).toBeGreaterThan(-20);
  await page.goto('/services.html#approach');
  await expect.poll(() => top('#approach'), { timeout: 12_000 }).toBeLessThan(260);
  expect(await top('#approach')).toBeGreaterThan(-20);
  await page.goto('/atlas.html');
  await page.evaluate(() => document.querySelector('.rail a[href="#pricing"]').click());
  await expect.poll(() => top('#pricing'), { timeout: 12_000 }).toBeLessThan(130);
  expect(await top('#pricing')).toBeGreaterThan(-20);
});

test('home page: every section heading is the same size', async ({ page }) => {
  await page.goto('/');
  const sizes = await page.$$eval('main h2:not(.mega):not(.film-logo)', hs => hs.map(h => getComputedStyle(h).fontSize));
  expect(sizes.length).toBeGreaterThan(10);
  expect(new Set(sizes).size).toBe(1);
});

test('atlas page: every heading is the same size, and real screens are never stretched', async ({ page }) => {
  await page.goto('/atlas.html');
  const sizes = await page.$$eval('main h2:not(.mega):not(.film-logo)', hs => hs.map(h => getComputedStyle(h).fontSize)); // the film's giant ATLAS is a beat, not a heading size
  expect(sizes.length).toBeGreaterThan(10);
  expect(new Set(sizes).size).toBe(1);
  const widest = await page.$$eval('.a-hero .shots img, .a-screens .shots img', is => Math.max(...is.map(i => i.getBoundingClientRect().width)));
  expect(widest, '1440px captures stay sharp at twice the density only up to about 860px').toBeLessThanOrEqual(860);
});

test('atlas page: the market map stays inside its box at every width', async ({ page }) => {
  await page.goto('/atlas.html');
  for (const width of [1440, 1024, 820, 640]) {
    await page.setViewportSize({ width, height: 900 });
    const over = await page.evaluate(() => {
      const q = document.querySelector('.quad'), box = q.closest('.wrap').getBoundingClientRect();
      return [q, ...q.querySelectorAll('tbody td')].filter(c => { const r = c.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || c.scrollWidth > c.clientWidth + 1; }).length;
    });
    expect(over, `overflow at ${width}px`).toBe(0);
  }
});

test('Atlas is one product: visitors never see a second name for it', async ({ page }) => {
  for (const url of ['/', '/atlas.html', '/contact.html']) {
    await page.goto(url);
    expect(await page.locator('html').innerHTML()).not.toMatch(/Atlas Open/);
  }
});

test('every page with a nav shares one header', async ({ page }) => {
  const read = async url => {
    await page.goto(url);
    return page.evaluate(() => ({ links: [...document.querySelectorAll('.nav a')].map(a => a.textContent), h1: getComputedStyle(document.querySelector('h1')).fontSize, bar: !!document.querySelector('.site-head .progress') }));
  };
  const home = await read('/');
  expect(home.links).toEqual(['Atlas', 'Synvord', 'DheQuest', 'Services', 'Talk to us']);
  for (const url of ['/services.html', '/atlas.html', '/synvord.html', '/dhequest.html', '/synvord-stay.html', '/synvord-care.html']) expect(await read(url)).toEqual(home);
});

// A small in-memory stand-in for the two tables, enough to walk the desk end to end
const mockDesk = async (page, { admin = true } = {}) => {
  await useConfig(page);
  const enquiries = [{ id: 'e1', created_at: '2026-10-30T10:00:00Z', name: '<img src=x onerror="window.__xss=1">', mobile: '+91 95150 93965', mobile_digits: '919515093965', email: 'a@b.co', company: null, product: 'Atlas', message: '<script>window.__xss=1</script>', status: 'new' },
    { id: 'e2', created_at: '2026-10-29T10:00:00Z', name: 'Ravi', mobile: '98765 43210', mobile_digits: '9876543210', email: null, company: 'Acme', product: 'Neel', message: 'Demo', status: 'won' }];
  const comments = [];
  const json = (r, body, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route(`${SB}/auth/v1/token*`, r => json(r, { access_token: 'x.y.z', refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'u', email: 'owner@example.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
  await page.route(`${SB}/auth/v1/logout*`, r => r.fulfill({ status: 204 }));
  await page.route(`${SB}/rest/v1/rpc/is_admin`, r => json(r, admin));
  await page.route(`${SB}/rest/v1/enquiries*`, r => {
    const u = new URL(r.request().url()), m = r.request().method();
    const id = u.searchParams.get('id')?.replace('eq.', '');
    if (m === 'PATCH') { Object.assign(enquiries.find(e => e.id === id), r.request().postDataJSON()); return r.fulfill({ status: 204 }); }
    if (m === 'DELETE') { enquiries.splice(enquiries.findIndex(e => e.id === id), 1); return r.fulfill({ status: 204 }); }
    if (id) return json(r, enquiries.find(e => e.id === id));
    const like = u.searchParams.get('mobile_digits')?.replace(/\D/g, ''), st = u.searchParams.get('status')?.replace('eq.', '');
    json(r, enquiries.filter(e => (!like || e.mobile_digits.includes(like)) && (!st || e.status === st)));
  });
  await page.route(`${SB}/rest/v1/enquiry_comments*`, r => {
    if (r.request().method() === 'POST') { comments.push({ id: 'c', created_at: '2026-10-30T11:00:00Z', author_email: 'owner@example.com', ...r.request().postDataJSON() }); return r.fulfill({ status: 201 }); }
    json(r, comments);
  });
};
const signIn = async page => {
  await page.goto('/admin.html');
  await page.fill('[name=email]', 'owner@example.com');
  await page.fill('[name=password]', 'secret-pass');
  await page.click('#login-form button');
};

test('owner desk: search by mobile, change status, comment, delete', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await mockDesk(page);
  await signIn(page);
  await expect(page.locator('#rows button')).toHaveCount(2);

  await page.fill('#search', '95150 93965');
  await expect(page.locator('#rows button')).toHaveCount(1);

  await page.locator('#rows button').click();
  await expect(page.locator('.desk-message')).toHaveText('<script>window.__xss=1</script>');
  await expect(page.locator('.desk-detail h2')).toContainText('<img');
  expect(await page.evaluate(() => window.__xss), 'visitor text must never run').toBeUndefined();

  await page.selectOption('.desk-detail select', 'contacted');
  await expect(page.locator('#rows .pill')).toHaveText('Contacted');

  await page.fill('.desk-detail textarea', 'Called, sending a quote');
  await page.click('.desk-detail form button');
  await expect(page.locator('.thread')).toContainText('Called, sending a quote');
  await expect(page.locator('.thread')).toContainText('owner@example.com');

  page.on('dialog', d => d.accept());
  await page.locator('.btn.danger').click();
  await expect(page.locator('#rows')).toContainText('No enquiries match');
  expect(errors).toEqual([]);
});

test('owner desk: a signed-in account that is not an admin is sent back', async ({ page }) => {
  await mockDesk(page, { admin: false });
  await signIn(page);
  await expect(page.locator('#login-status')).toHaveText('This account has no access to enquiries.');
  await expect(page.locator('#board')).toBeHidden();
});

test('owner desk: a sign-in outage is not reported as a wrong password', async ({ page }) => {
  await useConfig(page);
  await page.route(`${SB}/auth/v1/token*`, r => r.abort());
  await page.goto('/admin.html');
  await page.fill('[name=email]', 'owner@example.com');
  await page.fill('[name=password]', 'secret-pass');
  await page.click('#login-form button');
  await expect(page.locator('#login-status')).toContainText('Could not reach');
});

test('owner desk: never appears in search engines and locks down scripts', async ({ page }) => {
  await page.goto('/admin.html');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[http-equiv=Content-Security-Policy]')).toHaveAttribute('content', /script-src 'self'/);
  await expect(page.locator('#login-status')).toContainText('not connected');
});
