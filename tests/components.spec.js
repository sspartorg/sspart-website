// SSPART home page: every interactive component.
const { test, expect } = require('@playwright/test');
const { scrollThrough } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

test('hero globe: the canvas paints', async ({ page }) => {
  await page.waitForTimeout(600);
  const painted = await page.locator('.globe').evaluate(c => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 40) n++;
    return n;
  });
  expect(painted, 'painted pixels sampled').toBeGreaterThan(20);
});

test('atlas page ROI calculator: three ways priced from the stated assumptions, Atlas cheapest', async ({ page }) => {
  await page.goto('/atlas.html');
  const n = page.locator('#changes');
  await n.scrollIntoViewIfNeeded();
  await n.fill('40');
  await expect(page.locator('#changes-out')).toHaveText('40');
  const money = async sel => +(await page.locator(`${sel} .v`).textContent()).replace(/[^\d]/g, '');
  expect(await money('.roi-col.manual')).toBe(40 * 3 * 400);
  expect(await money('.roi-col.adhoc')).toBe(Math.round(40 * 1.3 * (1.5 * 400 + 25)));
  expect(await money('.roi-col.atlas')).toBe(Math.round(40 * (0.5 * 400 + 11.75)));
  await expect(page.locator('.roi-col.atlas .t')).toHaveText('1 day');
  await expect(page.locator('#roi-save')).toContainText('1 day instead of 5');
});

test('atlas page usual way vs Atlas way: on one timeline Atlas delivers first, and every row compares both', async ({ page }) => {
  await page.goto('/atlas.html');
  await page.evaluate(() => document.querySelector('.race').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect(page.locator('.race')).toHaveClass(/atlas-done/, { timeout: 10000 });
  await expect(page.locator('.race')).not.toHaveClass(/usual-done/);
  await expect(page.locator('#st-atlas')).toHaveText('Delivered');
  await expect(page.locator('#race-say')).toContainText('Atlas delivered');
  const rows = page.locator('.vs-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(4);
  for (const n of await rows.evaluateAll(r => r.map(x => x.querySelectorAll('.old, .new').length))) expect(n).toBe(2);
});

// The product galleries live on the product pages; DheQuest's hero has the tabbed one (Atlas shows its screens side by side)
test('dhequest page gallery: every tab shows its real screenshot and address', async ({ page }) => {
  await page.goto('/dhequest.html');
  const w = page.locator('.a-hero .window'), btns = w.locator('.shot-tabs button');
  const n = await btns.count();
  expect(n).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < n; i++) {
    await btns.nth(i).scrollIntoViewIfNeeded();
    await btns.nth(i).click();
    await expect(w.locator('.shots img').nth(i)).toHaveClass(/\bon\b/);
    await expect(w.locator('.bar span')).toHaveText(await btns.nth(i).getAttribute('data-url'));
    await expect.poll(() => w.locator('.shots img.on').evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
  }
});

test('fit picker: every option recommends a product with a matching enquiry link', async ({ page }) => {
  const opts = page.locator('.fit-options button');
  for (let i = 0; i < await opts.count(); i++) {
    await opts.nth(i).scrollIntoViewIfNeeded();
    await opts.nth(i).click();
    const name = await page.locator('.fit-answer h3').textContent();
    const cta = page.locator('.fit-answer .btn-solid');
    expect(await cta.getAttribute('href')).toMatch(/^contact\.html\?product=/);
    expect(await cta.textContent(), 'a/an before a vowel').not.toMatch(/\ba [AEIOU]/);
    if (!/Custom/.test(name)) expect(decodeURIComponent(await cta.getAttribute('href'))).toContain(name);
  }
});

test('demo buttons open the enquiry form, and no email links remain', async ({ page }) => {
  const hrefs = await page.locator('.mail-btn').evaluateAll(a => a.map(x => x.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThanOrEqual(4); // Atlas, DheQuest, Synvord, custom work
  for (const h of hrefs) expect(h).toMatch(/^contact\.html\?product=/);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('a[href*="github.com/sspartorg/atlas"]:not([href*="atlas-open"])')).toHaveCount(0);
});

test('FAQ opens and closes', async ({ page }) => {
  const item = page.locator('.faq details').first();
  // A real scroll: WebKit's scrollIntoViewIfNeeded sometimes leaves the page where it is
  await item.evaluate(d => d.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await item.locator('summary').click();
  await expect(item).toHaveJSProperty('open', true);
  await item.locator('summary').click();
  await expect(item).toHaveJSProperty('open', false);
});

test('testimonials: dots switch the quote and the choice is not undone by rotation', async ({ page }) => {
  await page.locator('.quote-dots').scrollIntoViewIfNeeded();
  await page.locator('.quote-dots button').nth(1).click();
  await expect(page.locator('.quotes-rot .quote').nth(1)).toHaveClass(/\bon\b/);
  const dot = await page.locator('.quote-dots button').first().boundingBox();
  expect(dot.height, 'dot tap target').toBeGreaterThanOrEqual(24);
});

test('back-to-top: hidden while reading down, offered when scrolling up, arrow centred', async ({ page }) => {
  await scrollThrough(page);
  const btn = page.locator('.to-top');
  await page.evaluate(() => scrollTo({ top: innerHeight * 4, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await expect(btn).not.toHaveClass(/show/);
  await page.evaluate(() => scrollTo({ top: innerHeight * 3, behavior: 'instant' }));
  await expect(btn).toHaveClass(/show/);
  const off = await btn.evaluate(a => {
    const b = a.getBoundingClientRect(), s = a.querySelector('svg').getBoundingClientRect();
    return Math.max(Math.abs(s.left + s.width / 2 - (b.left + b.width / 2)), Math.abs(s.top + s.height / 2 - (b.top + b.height / 2)));
  });
  expect(off, 'arrow offset from centre').toBeLessThanOrEqual(0.5);
});

test('product cards: Atlas, Synvord and DheQuest, each linking to its own page', async ({ page }) => {
  const cards = page.locator('#products .p-card');
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll(as => as.map(a => a.getAttribute('href')))).toEqual(['atlas.html', 'synvord.html', 'dhequest.html']);
  await expect(page.locator('#products')).not.toContainText('Experts Jar');
});

test('case-study figures count up to their final values', async ({ page }) => {
  await page.locator('.cases').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200);
  const figures = await page.locator('.metrics strong').allTextContents();
  const finals = await page.locator('.metrics strong').evaluateAll(s => s.map(x => x.dataset.count));
  figures.forEach((f, i) => expect(f.replace(/[^\d.]/g, '')).toBe(finals[i].replace(/[^\d.]/g, '')));
});
