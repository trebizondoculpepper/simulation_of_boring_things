import process from 'node:process';
import { chromium } from 'playwright-core';
const D = process.argv[2];
const b = await chromium.launch({ headless: true, channel: 'chrome' });
for (const [scale, out] of [
  [1, 'the-pool-embed-800x600.png'],
  [2, 'the-pool-embed-1600x1200.png'],
]) {
  const p = await b.newPage({
    viewport: { width: 1000, height: 800 },
    deviceScaleFactor: scale,
  });
  await p.goto('file://' + D + '/embed800.html');
  await p.waitForTimeout(1200);
  await p.locator('#e').screenshot({ path: D + '/' + out });
  await p.close();
}
await b.close();
