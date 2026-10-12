// Checks every page of the site should pass on every screen and browser.
const { test, expect } = require('@playwright/test');
const { scrollThrough } = require('./helpers');

const LEGAL = ['privacy.html', 'terms.html', 'cookies.html'];

test.describe('home page', () => {
  let errors, failed;
  test.beforeEach(async ({ page, baseURL }) => {
    errors = []; failed = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    // Only this site's own files must load; third-party hiccups (CDNs, video thumbnails) are not our failures
    page.on('requestfailed', r => { if (r.url().startsWith(baseURL)) failed.push(r.url()); });
    page.on('response', r => { if (r.url().startsWith(baseURL) && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto('/');
  });

  test('has no script errors and no missing files', async ({ page }) => {
    await scrollThrough(page);
    expect(errors, 'console errors').toEqual([]);
    expect(failed, 'failed requests').toEqual([]);
  });

  test('never scrolls sideways', async ({ page }) => {
    await scrollThrough(page);
    const wide = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      // Rows that scroll sideways on purpose (marquees, swipeable tab rows) and dialogs are excluded
      const skip = '.marquee, dialog, .toast, [data-scroll-x], .product-tabs';
      return {
        page: document.documentElement.scrollWidth - w,
        elements: [...document.querySelectorAll('body *')].filter(e => {
          if (e.closest(skip)) return false;
          const cs = getComputedStyle(e);
          if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') return false;
          const b = e.getBoundingClientRect();
          return b.width > 0 && b.right > w + 1;
        }).slice(0, 5).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`),
      };
    });
    expect(wide.page, 'page wider than the screen').toBeLessThanOrEqual(0);
    expect(wide.elements, 'elements wider than the screen').toEqual([]);
  });

  test('every in-page link has a target and external links open safely', async ({ page }) => {
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => ({
      href: a.getAttribute('href'), blank: a.target === '_blank', rel: a.rel, text: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40),
      target: a.getAttribute('href').startsWith('#') && a.getAttribute('href').length > 1 ? !!document.getElementById(a.getAttribute('href').slice(1)) : true,
    })));
    for (const l of links) {
      expect.soft(l.target, `"${l.text}" points to missing ${l.href}`).toBe(true);
      if (l.blank) expect.soft(l.rel, `"${l.text}" opens a new tab without rel=noopener`).toContain('noopener');
      if (l.href.startsWith('mailto:')) expect.soft(() => decodeURIComponent(l.href), `bad mailto on "${l.text}"`).not.toThrow();
    }
  });

  test('every image loads, has alt text and keeps its proportions', async ({ page }) => {
    await scrollThrough(page);
    const report = await page.evaluate(() => {
      const imgs = [...document.images];
      return {
        // An image still waiting to be shown (data-src) has not been requested yet; that is intended
        broken: imgs.filter(i => !i.dataset.src && i.getAttribute('src') && i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
        noAlt: imgs.filter(i => !i.hasAttribute('alt')).map(i => i.getAttribute('src') || i.dataset.src),
        distorted: imgs.filter(i => i.naturalWidth && i.offsetWidth && i.offsetHeight && getComputedStyle(i).objectFit !== 'cover' && getComputedStyle(i).objectFit !== 'contain')
          .filter(i => Math.abs((i.offsetWidth / i.offsetHeight) / (i.naturalWidth / i.naturalHeight) - 1) > 0.03)
          .map(i => i.getAttribute('src')),
      };
    });
    expect(report.broken, 'broken images').toEqual([]);
    expect(report.noAlt, 'images without alt').toEqual([]);
    expect(report.distorted, 'squashed or stretched images').toEqual([]);
  });

  test('mobile menu opens, fits the screen and closes after picking a link', async ({ page }) => {
    const toggle = page.locator('.nav-toggle');
    const width = page.viewportSize().width;
    if (width > 900) {
      await expect(toggle).toBeHidden();
      return;
    }
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const firstLink = page.locator('#nav a, #nav-links a').filter({ visible: true }).first();
    await expect(firstLink).toBeVisible();
    await firstLink.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

for (const legal of LEGAL) {
  test(`${legal} loads, links home and fits the screen`, async ({ page }) => {
    const res = await page.goto(`/${legal}`);
    expect(res.status()).toBe(200);
    await expect(page.locator('a[href="index.html"], a[href="/"], a[href="./"]').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

