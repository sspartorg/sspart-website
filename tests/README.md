# Site tests

Browser tests for the site in the folder above, using Playwright. They start their own local server (gzip, like
GitHub Pages) and check the home page and legal pages on five screens in two engines.

| Screen | Size | Engines |
| --- | --- | --- |
| Desktop | 1440 × 900 | Chromium (Chrome, Edge, Android), WebKit (Safari, iPhone, iPad) |
| Tablet portrait / landscape | 768 × 1024 / 1024 × 768 | both |
| Phone portrait / landscape | 390 × 844 / 844 × 390 | both |

## Run

```bash
cd tests
npm install
npm run setup         # downloads the Chromium and WebKit browsers, once per machine
npm test              # everything: behaviour on both engines, then speed and slow networks
```

Other commands:

- `npm run test:behaviour`: layout, links, images, every interactive component; both engines in parallel.
- `npm run test:speed`: speed budgets and slow networks, one test at a time so timings are fair.
- `npm run test:chromium` / `npm run test:webkit`: one engine only.
- `npm run report`: open the HTML report of the last run.

To test the live site instead of a local copy, set `BASE_URL` (PowerShell: `$env:BASE_URL="https://sspart-enterprise.com"; npm test`,
bash: `BASE_URL=https://sspart-enterprise.com npm test`).

## What is checked

- `site.spec.js`: no script errors or missing files, no sideways scrolling, every in-page link has a target,
  external links open safely, every image loads with alt text and correct proportions, the phone menu works,
  and the legal pages load and link home.
- `components.spec.js`: the hero showcase, product screenshot galleries, the enlarged view, the fit picker,
  demo email links, FAQ, testimonials, back-to-top, sticky product tabs and the count-up figures.
- `perf.spec.js`: first load under 450 KB and 30 requests, layout shift under 0.1, largest paint under 2.5 s,
  and scrolling at about 60 fps. Phones and tablets run with the CPU slowed 4×.
- `network.spec.js`: on slow 4G and fast 3G, the headline and hero screenshot appear within budget and
  switching products or screenshots never shows an empty window.

Budgets live at the top of `perf.spec.js` and `network.spec.js`.

## Notes

- Speed tests run in Chromium only: it exposes the timing and CPU-throttling APIs. WebKit builds for Windows and
  Linux also draw without a GPU, so their frame times would not reflect a real iPhone.
- When a component changes on purpose, update its test in `components.spec.js` in the same commit.
