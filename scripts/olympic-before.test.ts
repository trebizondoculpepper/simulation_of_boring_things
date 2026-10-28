import { it } from 'vite-plus/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { advance, newWorld } from '../src/game/world';
import { doseRates } from '../src/game/plant/pool-dosing';
import { DOSING_PUMPS } from '../src/game/plant/water-treatment';
import { plantReadingOf } from '../src/toolkit/gallery/logic/world-reading';
import {
  GAME_PLANTS,
  GAME_POOLS,
  PLANT,
  runBench,
  warmedUp,
} from '../src/game/water/chemistry-bench';

/**
 * The Olympic with its drawn, undersized hypochlorite pump (a DMX 1602,
 * 2.1 l/h; the owner, 2026-10-28, keeps it to see how it goes wrong;
 * mission 101): the "before" picture for a larger pump. Two days in the
 * world from a new game at midnight, the second the busiest a day is drawn
 * (busyness 1.3); and two days on the bench, its pool healthy with a pump
 * big enough (12.5 l/h) and then on the drawn pump from midnight, the
 * second evening busier by half. Writes each as CSV and both as one SVG
 * chart (free chlorine and the pump's rate):
 *
 *     OLYMPIC_BEFORE=1 npx vp test run scripts/olympic-before.test.ts
 *
 * to `build/reports/olympic-before.*`, or to `OLYMPIC_BEFORE_OUT` (a path
 * without its extension). The chart in `doc/prompts/101-olympic-before.svg`
 * is one such run.
 */
type Row = {
  h: number;
  fc: number;
  cc: number;
  ph: number;
  lh: number;
  alarms?: string;
};

function world(): Row[] {
  let w = newWorld();
  const rows: Row[] = [];
  for (let q = 1; q <= 48 * 4; q++) {
    w = advance(w, 900, 10);
    // The second day drawn as busy as a day can be.
    if (q === 24 * 4 + 1) w = { ...w, bathers: { ...w.bathers, busy: 1.3 } };
    const p = w.pools.pool_02;
    rows.push({
      h: q / 4,
      fc: p.freeChlorine,
      cc: p.combinedChlorine,
      ph: p.ph,
      lh: doseRates(w, 'pool_02').hypochlorite * 3600,
      alarms: plantReadingOf(w, 'pool_02')
        .alarms.filter((a) =>
          ['cl-low', 'cl-high', 'ph-range', 'dosing-inhibit'].includes(a),
        )
        .join(' '),
    });
  }
  return rows;
}

function bench(): Row[] {
  const pool = GAME_POOLS.pool_02;
  const start = warmedUp(pool, {
    ...PLANT,
    ...GAME_PLANTS.pool_02,
    hypoPump: 12.5,
  });
  const drawn = DOSING_PUMPS.pool_02.hypochlorite;
  const run = runBench(
    { ...start, plant: { ...start.plant, hypoPump: drawn } },
    pool,
    48,
    [
      {
        at: 24 + 17,
        label: 'a busy evening',
        apply: (s) => ({ ...s, plant: { ...s.plant, batherFactor: 1.5 } }),
      },
      {
        at: 24 + 22,
        label: 'closed',
        apply: (s) => ({ ...s, plant: { ...s.plant, batherFactor: 1 } }),
      },
    ],
  );
  return run.samples.map((x) => ({
    h: x.t,
    fc: x.freeChlorine,
    cc: x.combined,
    ph: x.ph,
    lh: x.hypoOut * drawn,
  }));
}

const csv = (rows: Row[]) =>
  [
    'hour,free chlorine mg/l,combined mg/l,pH,pump l/h,alarms',
    ...rows.map((r) =>
      [
        r.h,
        r.fc.toFixed(3),
        r.cc.toFixed(3),
        r.ph.toFixed(3),
        r.lh.toFixed(2),
        r.alarms ?? '',
      ].join(','),
    ),
  ].join('\n');

/** Both runs on one chart: free chlorine (left axis) and the pump's l/h (right). */
function svg(w: Row[], b: Row[]): string {
  const W = 760;
  const H = 360;
  const L = 56;
  const R = 56;
  const T = 40;
  const B = 44;
  const x = (h: number) => L + (h / 48) * (W - L - R);
  const y = (fc: number) => T + (1 - fc / 2) * (H - T - B);
  const yr = (lh: number) => T + (1 - lh / 2.5) * (H - T - B);
  const path = (
    rows: Row[],
    f: (r: Row) => number,
    sy: (v: number) => number,
  ) =>
    rows
      .map(
        (r, i) => `${i ? 'L' : 'M'}${x(r.h).toFixed(1)},${sy(f(r)).toFixed(1)}`,
      )
      .join('');
  const line = (v: number, label: string, dash: string) =>
    `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#888" stroke-dasharray="${dash}"/><text x="${W - R - 4}" y="${y(v) - 4}" text-anchor="end" font-size="11" fill="#555">${label}</text>`;
  const ticks = [0, 6, 12, 18, 24, 30, 36, 42, 48]
    .map(
      (h) =>
        `<line x1="${x(h)}" x2="${x(h)}" y1="${H - B}" y2="${H - B + 4}" stroke="#333"/><text x="${x(h)}" y="${H - B + 16}" text-anchor="middle" font-size="11" fill="#333">${String(h % 24).padStart(2, '0')}:00</text>`,
    )
    .join('');
  const yTicks = [0, 0.5, 1, 1.5, 2]
    .map(
      (v) =>
        `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#333">${v}</text>`,
    )
    .join('');
  const rTicks = [0, 1, 2]
    .map(
      (v) =>
        `<text x="${W - R + 6}" y="${yr(v) + 4}" font-size="11" fill="#333">${v}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif">
<rect width="${W}" height="${H}" fill="#ffffff"/>
<text x="${L}" y="20" font-size="14" fill="#111">The Olympic on its drawn 2.1 l/h hypochlorite pump: free chlorine at the pool, and the pump</text>
<rect x="${x(24)}" y="${T}" width="${x(48) - x(24)}" height="${H - T - B}" fill="#f3f0e8"/>
<text x="${x(24) + 6}" y="${T + 14}" font-size="11" fill="#555">day 2: busiest (world), a busy evening (bench)</text>
${line(1.3, 'setpoint 1.3 (sample)', '4 3')}
${line(1.0, 'CHLORINE LOW 1.0', '2 2')}
${line(0.75, 'PWTAG minimum 0.75', '6 2')}
<path d="${path(w, (r) => r.lh, yr)}" fill="none" stroke="#c8a24a" stroke-width="1.5"/>
<path d="${path(w, (r) => r.fc, y)}" fill="none" stroke="#1f5fa8" stroke-width="2.2"/>
<path d="${path(b, (r) => r.fc, y)}" fill="none" stroke="#b8322a" stroke-width="2.2"/>
<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#333"/><line x1="${W - R}" x2="${W - R}" y1="${T}" y2="${H - B}" stroke="#333"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#333"/>
${ticks}${yTicks}${rTicks}
<text x="14" y="${T + (H - T - B) / 2}" font-size="11" fill="#333" transform="rotate(-90 14 ${T + (H - T - B) / 2})" text-anchor="middle">free chlorine, mg/l</text>
<text x="${W - 14}" y="${T + (H - T - B) / 2}" font-size="11" fill="#333" transform="rotate(90 ${W - 14} ${T + (H - T - B) / 2})" text-anchor="middle">pump, l/h</text>
<g font-size="12"><line x1="${L + 10}" x2="${L + 34}" y1="${H - 8}" y2="${H - 8}" stroke="#1f5fa8" stroke-width="2.2"/><text x="${L + 40}" y="${H - 4}" fill="#111">world (its own bathers)</text>
<line x1="${L + 210}" x2="${L + 234}" y1="${H - 8}" y2="${H - 8}" stroke="#b8322a" stroke-width="2.2"/><text x="${L + 240}" y="${H - 4}" fill="#111">bench (1,650 bathers a day)</text>
<line x1="${L + 430}" x2="${L + 454}" y1="${H - 8}" y2="${H - 8}" stroke="#c8a24a" stroke-width="1.5"/><text x="${L + 460}" y="${H - 4}" fill="#111">world's pump, l/h (right axis)</text></g>
</svg>
`;
}

it.skipIf(process.env.OLYMPIC_BEFORE !== '1')(
  'writes the Olympic’s before picture',
  () => {
    const out =
      process.env.OLYMPIC_BEFORE_OUT ?? 'build/reports/olympic-before';
    mkdirSync(dirname(out), { recursive: true });
    const w = world();
    const b = bench();
    writeFileSync(`${out}-world.csv`, csv(w));
    writeFileSync(`${out}-bench.csv`, csv(b));
    writeFileSync(`${out}.svg`, svg(w, b));
  },
  300_000,
);
