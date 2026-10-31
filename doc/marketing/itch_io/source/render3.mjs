import process from 'node:process';
import { chromium } from 'playwright-core';
const D = process.argv[2];
const b = await chromium.launch({ headless: true, channel: 'chrome' });
async function shot(file, sel, out, scale) {
  const p = await b.newPage({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: scale,
  });
  await p.goto('file://' + D + '/' + file);
  await p.waitForTimeout(1200);
  await p.locator(sel).screenshot({ path: D + '/' + out });
  await p.close();
}
await shot('banner2.html', '#b', 'the-pool-banner-960x320.png', 1);
await shot('banner2.html', '#b', 'the-pool-banner-1920x640.png', 2);
await shot('embed2.html', '#e', 'the-pool-embed-1280x720.png', 1);
await shot('embed2.html', '#e', 'the-pool-embed-1920x1080.png', 1.5);
await b.close();
