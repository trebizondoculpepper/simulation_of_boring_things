import { chromium } from 'playwright-core';
const D = process.argv[2];
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 2600, height: 1700 } });
await p.goto('file://' + D + '/caustics.html#2560x1600');
await p.waitForTimeout(3000);
await p
  .locator('#c')
  .screenshot({ path: D + '/the-pool-background-caustics-2560x1600.png' });
await b.close();
