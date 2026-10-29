import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The museum's photographs' low-resolution copies (the owner, 2026-10-29:
 * "Unless you are close and looking directly at the photos we need to use
 * a low resolution version"): each photograph in a gallery folder under
 * `resources/images/` copied into its `lo/` folder at a quarter of its
 * width and height, a sixteenth of its pixels, for `photo-print.ts` to
 * show until the visitor is close. Made with macOS's `sips`; a copy newer
 * than its photograph is left alone. Run `node scripts/photo-lows.ts`
 * after adding or replacing a photograph.
 */

const ROOT = 'resources/images';
const SHARE = 4;

for (const gallery of readdirSync(ROOT)) {
  const dir = join(ROOT, gallery);
  if (!statSync(dir).isDirectory()) continue;
  const lo = join(dir, 'lo');
  for (const name of readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
    const from = join(dir, name);
    const to = join(lo, name.replace(/\.[a-z]+$/i, '.jpg'));
    if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs)
      continue;
    mkdirSync(lo, { recursive: true });
    const size = execFileSync('sips', ['-g', 'pixelWidth', from], {
      encoding: 'utf8',
    });
    const width = Number(/pixelWidth: (\d+)/.exec(size)?.[1]);
    execFileSync('sips', [
      '-s',
      'format',
      'jpeg',
      '-s',
      'formatOptions',
      '80',
      '--resampleWidth',
      String(Math.max(8, Math.round(width / SHARE))),
      from,
      '--out',
      to,
    ]);
    console.log(`${to}`);
  }
}
