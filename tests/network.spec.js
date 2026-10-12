// Slow connections on a phone (CPU slowed 4x): text and the hero screenshot arrive in time, and switching
// products or screenshots never leaves an empty window.
const { test, expect } = require('@playwright/test');
const { imageShown } = require('./helpers');

const NETWORKS = [
  { name: 'Slow 4G', downMbps: 1.6, upMbps: 0.75, rttMs: 150, headlineMs: 2500, heroShotMs: 4000 },
  { name: 'Fast 3G', downMbps: 1.44, upMbps: 0.675, rttMs: 563, headlineMs: 3500, heroShotMs: 6000 },
];

for (const net of NETWORKS) {
  test(`${net.name}: headline and hero screenshot arrive in time, no blank screens`, async ({ page }) => {
    // Warm-up visit at full speed, so the first measured run is not paying for a cold browser and server
    await page.goto('/', { waitUntil: 'load' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.clearBrowserCache');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.rttMs, downloadThroughput: net.downMbps * 125000, uploadThroughput: net.upMbps * 125000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // The browser's own paint timings: polling the page would measure when the busy main thread frees up, not when things appear
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await imageShown(page, '.slide.in .shots img.on');
    await page.waitForTimeout(500);
    const { headline, heroShot } = await page.evaluate(() => ({
      headline: Math.round(performance.getEntriesByName('first-contentful-paint')[0].startTime),
      heroShot: Math.round(window.__lcp),
    }));
    test.info().annotations.push({ type: net.name, description: `headline ${headline} ms, hero screenshot ${heroShot} ms` });
    expect(headline, 'headline readable (ms)').toBeLessThanOrEqual(net.headlineMs);
    expect(heroShot, 'hero screenshot shown (ms)').toBeLessThanOrEqual(net.heroShotMs);

    // Switching hero product: a screen is on show at every moment
    await page.locator('.showcase-tabs button').nth(2).click();
    const blankHero = await page.evaluate(async () => {
      let blank = 0;
      for (let t = 0; t < 40; t++) {
        const s = document.querySelector('.slide.in'), i = s && s.querySelector('.shots img.on');
        if (i && !(i.complete && i.naturalWidth > 0)) blank++;
        if (s === document.querySelectorAll('.slide')[2] && i && i.complete) break;
        await new Promise(r => setTimeout(r, 100));
      }
      return blank;
    });
    expect(blankHero, 'moments with an empty hero window').toBe(0);

    // Switching a gallery tab keeps the current screen until the next one is ready
    await page.evaluate(() => document.getElementById('dhequest').scrollIntoView({ behavior: 'instant' }));
    await imageShown(page, '#dhequest .shots img.on');
    await page.locator('#dhequest .shot-tabs button').nth(3).click();
    const blankGallery = await page.evaluate(async () => {
      const w = document.querySelector('#dhequest .window');
      let blank = 0;
      for (let t = 0; t < 200; t++) {
        const on = w.querySelector('.shots img.on');
        if (!(on.complete && on.naturalWidth > 0)) blank++;
        if (on === w.querySelectorAll('.shots img')[3] && on.complete) break;
        await new Promise(r => setTimeout(r, 100));
      }
      return blank;
    });
    expect(blankGallery, 'moments with an empty gallery window').toBe(0);
  });
}
