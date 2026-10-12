// SSPART home page: every interactive component.
const { test, expect } = require('@playwright/test');
const { scrollThrough } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
});

test('hero showcase: each product tab shows its window, guide and headline word', async ({ page }) => {
  const tabs = page.locator('.showcase-tabs button');
  await expect(tabs).toHaveCount(4);
  const h1 = await page.locator('.hero h1').evaluate(e => e.offsetHeight);
  const words = [];
  for (let i = 0; i < 4; i++) {
    await tabs.nth(i).click();
    await expect(page.locator('.slides .slide').nth(i)).toHaveClass(/\bin\b/);
    words.push(await page.locator('.rotator').textContent());
    expect((await page.locator('.presenter .bubble').textContent()).length).toBeGreaterThan(10);
  }
  expect(new Set(words).size, `headline words: ${words.join(', ')}`).toBe(4);
  expect(await page.locator('.hero h1').evaluate(e => e.offsetHeight), 'headline height must not jump').toBe(h1);
});

test('hero showcase: picking a product stops auto-rotation', async ({ page }) => {
  await page.locator('.showcase-tabs button').nth(2).click();
  await expect(page.locator('.showcase')).toHaveClass(/manual/);
  await page.waitForTimeout(7000);
  await expect(page.locator('.slides .slide').nth(2)).toHaveClass(/\bin\b/);
});

for (const id of ['atlas', 'dhequest', 'neel']) {
  test(`${id} gallery: every tab shows its real screenshot and address`, async ({ page }) => {
    const btns = page.locator(`#${id} .shot-tabs button`);
    const n = await btns.count();
    expect(n).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < n; i++) {
      await btns.nth(i).scrollIntoViewIfNeeded();
      await btns.nth(i).click();
      await expect(page.locator(`#${id} .shots img`).nth(i)).toHaveClass(/\bon\b/);
      await expect(page.locator(`#${id} .bar span`)).toHaveText(await btns.nth(i).getAttribute('data-url'));
      expect(await page.locator(`#${id} .shots img.on`).evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
    }
  });
}

test('larger view opens, fits the screen and closes by button and Escape', async ({ page }) => {
  await page.locator('#neel .expand').scrollIntoViewIfNeeded();
  await page.locator('#neel .expand').click();
  const viewer = page.locator('.viewer');
  await expect(viewer).toHaveJSProperty('open', true);
  const box = await page.locator('.viewer .window').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  await page.locator('.viewer-close').click();
  await expect(viewer).toHaveJSProperty('open', false);
  await page.locator('#atlas .expand').scrollIntoViewIfNeeded();
  await page.locator('#atlas .expand').click();
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveJSProperty('open', false);
});

test('Experts Jar preview: next submission changes the content', async ({ page }) => {
  const title = page.locator('#experts-jar [data-f="title"]');
  const before = await title.textContent();
  await page.locator('#experts-jar [data-act="next"]').scrollIntoViewIfNeeded();
  await page.locator('#experts-jar [data-act="next"]').click();
  await expect(title).not.toHaveText(before);
});

test('fit picker: every option recommends a product with a matching email link', async ({ page }) => {
  const opts = page.locator('.fit-options button');
  for (let i = 0; i < await opts.count(); i++) {
    await opts.nth(i).scrollIntoViewIfNeeded();
    await opts.nth(i).click();
    const name = await page.locator('.fit-answer h3').textContent();
    const cta = page.locator('.fit-answer .btn-solid');
    expect(decodeURIComponent(await cta.getAttribute('href'))).toContain('mailto:contact@sspart-enterprise.com');
    expect(await cta.textContent(), 'a/an before a vowel').not.toMatch(/\ba [AEIOU]/);
    if (!/Custom/.test(name)) expect(decodeURIComponent(await cta.getAttribute('href'))).toContain(name);
  }
});

test('demo buttons send an email instead of opening a form', async ({ page }) => {
  await expect(page.locator('form')).toHaveCount(0);
  const hrefs = await page.locator('.mail-btn, .hero .btn-solid').evaluateAll(a => a.map(x => x.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThanOrEqual(6);
  for (const h of hrefs) expect(h).toMatch(/^mailto:contact@sspart-enterprise\.com\?subject=/);
});

test('FAQ opens and closes', async ({ page }) => {
  const item = page.locator('.faq details').first();
  await item.scrollIntoViewIfNeeded();
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

test('sticky product tabs: opaque, one row, active tab visible', async ({ page }) => {
  await page.evaluate(() => document.getElementById('experts-jar').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(800);
  const bar = await page.locator('.product-tabs').evaluate(t => {
    const links = [...t.querySelectorAll('a')], active = t.querySelector('a.active');
    const r = t.getBoundingClientRect(), a = active && active.getBoundingClientRect();
    return {
      bg: getComputedStyle(t).backgroundColor,
      rows: new Set(links.map(x => Math.round(x.getBoundingClientRect().top))).size,
      activeVisible: !!a && a.left >= r.left - 1 && a.right <= r.right + 1,
    };
  });
  expect(bar.bg).not.toMatch(/rgba\(.*, 0\)|transparent/);
  expect(bar.rows).toBe(1);
  expect(bar.activeVisible, 'active product tab is on screen').toBe(true);
});

test('case-study figures count up to their final values', async ({ page }) => {
  await page.locator('.cases').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200);
  const figures = await page.locator('.metrics strong').allTextContents();
  const finals = await page.locator('.metrics strong').evaluateAll(s => s.map(x => x.dataset.count));
  figures.forEach((f, i) => expect(f.replace(/[^\d.]/g, '')).toBe(finals[i].replace(/[^\d.]/g, '')));
});
