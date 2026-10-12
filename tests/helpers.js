// Shared by the specs.

// Scroll the whole page so lazy images, fade-ins and observers all run, then return to the top
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
      scrollTo({ top: y, behavior: 'instant' });
      await new Promise(r => setTimeout(r, 120));
    }
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(600);
}

// Frame-to-frame times while scrolling the full page, in milliseconds (16.7 = 60 fps)
async function scrollFrameTimes(page) {
  return page.evaluate(async () => {
    const gaps = []; let last = performance.now(), run = true;
    const tick = t => { gaps.push(t - last); last = t; if (run) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    const max = document.body.scrollHeight - innerHeight;
    for (let y = 0; y <= max; y += 40) { scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => requestAnimationFrame(r)); }
    run = false;
    gaps.sort((a, b) => a - b);
    return { median: gaps[gaps.length >> 1], p95: gaps[Math.floor(gaps.length * 0.95)] };
  });
}

// Wait until an image has actually downloaded and decoded
const imageShown = (page, selector, timeout = 30_000) => page.waitForFunction(sel => {
  const i = document.querySelector(sel);
  return !!i && i.complete && i.naturalWidth > 0;
}, selector, { timeout });

module.exports = { scrollThrough, scrollFrameTimes, imageShown };
