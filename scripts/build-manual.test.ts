import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'vite-plus/test';
import { instance } from '@viz-js/viz';
import { exhibitFor } from '../src/toolkit/gallery/views/room-equipment';
import { buildManual } from '../src/manual/logic/manual';
import { renderManual } from '../src/manual/latex/render';
import { SYMBOLS } from '../src/manual/logic/symbols';

/**
 * Builds the operator's manual's sources from the game's model into
 * `build/manual/` (`doc/plans/operators-manual.md`): `manual.tex`, and its
 * figures, Graphviz drawn with @viz-js/viz and every SVG turned into a
 * vector PDF by headless Chrome's print-to-PDF. `npm run manual` runs it
 * (with MANUAL=1) and then LuaLaTeX. Otherwise it does nothing.
 *
 * Chrome is `CHROME`, or Playwright's headless shell where it installs it.
 */

function findChrome(): string {
  if (process.env.CHROME) return process.env.CHROME;
  const cache =
    process.platform === 'darwin'
      ? join(homedir(), 'Library/Caches/ms-playwright')
      : join(homedir(), '.cache/ms-playwright');
  const shells = existsSync(cache)
    ? readdirSync(cache)
        .filter((d) => d.startsWith('chromium_headless_shell-'))
        .sort()
    : [];
  for (const dir of shells.reverse())
    for (const sub of [
      'chrome-headless-shell-mac-arm64',
      'chrome-headless-shell-mac-x64',
      'chrome-headless-shell-linux64',
    ]) {
      const bin = join(cache, dir, sub, 'chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  throw new Error('No Chrome to print figures with: set CHROME');
}

/** An SVG's size in pixels, from its width and height. */
function svgSize(svg: string): [number, number] {
  const w = /<svg[^>]*\swidth="([\d.]+)(pt|px)?"/.exec(svg);
  const h = /<svg[^>]*\sheight="([\d.]+)(pt|px)?"/.exec(svg);
  const px = (m: RegExpExecArray | null) =>
    m ? Number(m[1]) * (m[2] === 'pt' ? 4 / 3 : 1) : 600;
  return [Math.ceil(px(w)), Math.ceil(px(h))];
}

/** Print `svg` to a PDF page exactly its size. */
function svgToPdf(chrome: string, svg: string, pdf: string) {
  const [w, h] = svgSize(svg);
  const html = pdf.replace(/\.pdf$/, '.html');
  writeFileSync(
    html,
    `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${w}px ${h}px;margin:0}html,body{margin:0;padding:0}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<!DOCTYPE[^>]*>\s*/, '')}</body></html>`,
  );
  const run = spawnSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      `--print-to-pdf=${pdf}`,
      `file://${html}`,
    ],
    { timeout: 60_000 },
  );
  if (!existsSync(pdf))
    throw new Error(`Chrome did not print ${pdf}: ${run.stderr?.toString()}`);
}

it.skipIf(!process.env.MANUAL)(
  'builds the operator’s manual’s sources',
  async () => {
    const out = fileURLToPath(new URL('../build/manual/', import.meta.url));
    const figures = join(out, 'figures');
    mkdirSync(figures, { recursive: true });
    const manual = buildManual((kind) => exhibitFor(kind));
    writeFileSync(join(out, 'manual.tex'), renderManual(manual));
    const viz = await instance();
    const chrome = findChrome();
    for (const f of manual.figures) {
      // Its symbols beside it, where its drawing refers to them.
      const symbols =
        f.kind === 'dot' ? (f.symbols ?? []).map((s) => SYMBOLS[s]) : [];
      for (const s of symbols) writeFileSync(join(figures, s.file), s.svg);
      const svg =
        f.kind === 'dot'
          ? viz.renderString(f.source, {
              format: 'svg',
              engine: 'dot',
              images: symbols.map((s) => ({
                name: s.file,
                width: `${s.width}pt`,
                height: `${s.height}pt`,
              })),
            })
          : f.source;
      if (f.kind === 'dot')
        writeFileSync(join(figures, `${f.file}.dot`), f.source);
      writeFileSync(join(figures, `${f.file}.svg`), svg);
      svgToPdf(chrome, svg, join(figures, `${f.file}.pdf`));
    }
    console.log(`Manual sources in ${out}: ${manual.figures.length} figures`);
  },
  120_000,
);
