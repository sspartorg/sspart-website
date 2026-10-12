// Every spec runs on 5 screen sizes in Chromium (Chrome, Edge, Android) and WebKit (Safari, iPhone, iPad).
// Speed budgets and the slow-network spec run in Chromium, one at a time (see package.json).
const { defineConfig } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';
const screens = {
  'desktop': { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  'tablet-portrait': { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'tablet-landscape': { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'phone-portrait': { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  'phone-landscape': { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};

module.exports = defineConfig({
  testDir: '.',
  timeout: 90_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: BASE_URL, reducedMotion: 'no-preference' },
  webServer: process.env.BASE_URL ? undefined : { command: 'node serve.js', url: BASE_URL, reuseExistingServer: true },
  projects: [
    // Behaviour and layout: both engines, every screen, run in parallel
    ...['chromium', 'webkit'].flatMap(browserName => Object.entries(screens).map(([name, device]) => ({
      name: `${browserName}-${name}`,
      testIgnore: /(perf|network)\.spec/,
      use: { browserName, ...device },
    }))),
    // Speed: Chromium only (it exposes the timing and throttling APIs); run these with --workers=1 so timings are not skewed
    ...Object.entries(screens).map(([name, device]) => ({ name: `speed-${name}`, testMatch: /perf\.spec/, use: { browserName: 'chromium', ...device } })),
    { name: 'network', testMatch: /network\.spec/, use: { browserName: 'chromium', ...screens['phone-portrait'] } },
  ],
});
