import { readFileSync, writeFileSync } from 'node:fs';
import {
  GAUGES,
  LOGO_ART,
  LOOP_S,
  RIPPLE_HZ,
  SIGHT_GLASS,
  TITLE_TEXT,
  gaugeNeedle,
  sightGlassView,
} from '../src/toolkit/title/logic/title-logo.ts';

/**
 * The title logo as a true vector drawing (the owner, 2026-10-29), drawn by
 * hand after the owner's roundel (`doc/marketing/logos/05-circle-notext.png`)
 * but cleaner: above, a dome of flat pool-blue water with a few white wave
 * lines over a white tiled band, the whole upper section closed in one
 * deep-navy keyline; below, on a transparent ground with no rim, the plant
 * in flat style with navy outlines: the sand filter with its sight glass
 * and stand, the strainer, pump and motor, three gauges, yellow-handled
 * valves, flanged pipework with swept elbows, and the plate heat exchanger,
 * piped as a working circuit (pool → strainer → pump → heat exchanger →
 * filter → pool). The palette is `doc/prompts/art/logo-design.md`'s.
 *
 * Writes `resources/images/title/the-pool-logo.svg` (no lettering: the
 * title screen draws the title live, `title-logo.ts`) and
 * `the-pool-logo-titled.svg` (with "The Pool" as SVG text in embedded
 * Antonio Bold, outlined, shadowed and reflected, for marketing) and
 * `the-pool-logo-animated.svg` (no lettering; the sight glass's grains
 * swirl over its stirring sand, the gauges' needles tremble and the waves
 * roll and bob, by SMIL,
 * looping every `LOOP_S` seconds, the motion the title screen draws). The art's
 * 760 × 743 space is the one `logic/title-logo.ts` places the title, the
 * ripple and the sight glass in. Run `node scripts/title-logo.ts`.
 */

const OUT = 'resources/images/title/the-pool-logo.svg';
const TITLED_OUT = 'resources/images/title/the-pool-logo-titled.svg';
const ANIMATED_OUT = 'resources/images/title/the-pool-logo-animated.svg';
const FONT = 'src/toolkit/components/core/assets/fonts/Antonio-Variable.ttf';

/** The palette: pool blue, deep navy, white, safety yellow (and sand). */
const BLUE = '#1dabcd';
const NAVY = '#02213a';
const WHITE = '#ffffff';
const YELLOW = '#f6c324';
const SAND = '#e8c46d';
const SAND_LINE = '#b8923e';
const GLASS = '#7fd6ef';

const { width: W, height: H } = LOGO_ART;
/** The dome: its centre, and the keyline's middle radius and thickness. */
const CX = LOGO_ART.centreX;
const CY = LOGO_ART.centreY;
const KEY = 8;
const KEY_R = LOGO_ART.innerRadius + 1.5 + KEY / 2;
/** The tiled band under the water, its keyline's middle at its foot. */
const BAND_TOP = 312;
const BAND_FOOT = 345;
const TILE_FOOT = 334;
const TILE_W = 32.6;
/** The plant's outline, and the pipes' bore. */
const LINE = 3;
const PIPE = 16;
const BEND = 22;
/** Where the runs that go down through the floor end, at a flange. */
const FLOOR_END = 690;

const fmt = (n: number) => String(Math.round(n * 10) / 10);

// --- The upper section ---------------------------------------------------

/** The swell's points' spacing, and the seconds it takes to travel a wave. */
const SWELL_STEP = 8;
const SWELL_PERIOD_S = 4;
/**
 * The shorter wave strokes' motion in the animated logo: each drifts a few
 * pixels sideways and bobs, and its crest rises and falls, each at its own
 * period (every one dividing `LOOP_S`) and phase.
 */
const STROKE_DRIFT_PX = 5;
const STROKE_BOB_PX = 1.2;
const STROKE_PERIODS_S = [4, 3.2, 8 / 3, 16 / 5, 2, 16 / 3];

/** A wave stroke from `a` to `b` at height `y`, still or moving. */
function waveStroke(
  y: number,
  a: number,
  b: number,
  k: number,
  animated: boolean,
) {
  const mid = (a + b) / 2;
  const crest = (h: number) => `M ${a},${y} Q ${mid},${fmt(y - h)} ${b},${y}`;
  if (!animated) return `<path d="${crest(3)}"/>`;
  const period = STROKE_PERIODS_S[k % STROKE_PERIODS_S.length]!;
  const begin = -((k * 0.37) % 1) * period;
  const drift = Array.from({ length: 9 }, (_, n) => {
    const a2 = (2 * Math.PI * n) / 8;
    return `${fmt(STROKE_DRIFT_PX * Math.sin(a2))} ${fmt(STROKE_BOB_PX * Math.sin(2 * a2))}`;
  });
  return `<path d="${crest(3)}"><animate attributeName="d" values="${[3, 1.5, 3, 4.2, 3].map(crest).join(';')}" dur="${fmt(period / 2)}s" begin="${fmt(begin)}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="${drift.join(';')}" dur="${fmt(period)}s" begin="${fmt(begin)}s" repeatCount="indefinite"/></path>`;
}

function upperSection(animated: boolean) {
  const half = Math.sqrt(KEY_R ** 2 - (BAND_TOP - CY) ** 2);
  const [l, r] = [CX - half, CX + half];
  const dome = `M ${fmt(l)},${BAND_TOP} A ${KEY_R} ${KEY_R} 0 0 1 ${fmt(r)},${BAND_TOP} Z`;
  const outline = `M ${fmt(l)},${BAND_FOOT} L ${fmt(l)},${BAND_TOP} A ${KEY_R} ${KEY_R} 0 0 1 ${fmt(r)},${BAND_TOP} L ${fmt(r)},${BAND_FOOT} Z`;
  const tiles: string[] = [];
  for (let x = l + TILE_W; x < r - 4; x += TILE_W)
    tiles.push(`M ${fmt(x)},${BAND_TOP} V ${TILE_FOOT}`);
  // The waves: one long swell at the waterline, and shorter strokes below.
  const inner = (y: number) =>
    Math.sqrt((LOGO_ART.innerRadius - 6) ** 2 - (y - CY) ** 2);
  const swellY = TITLE_TEXT.waterline + 2;
  const reach = inner(swellY);
  // The swell's shape at a phase of its travel (0–1), its points fixed.
  const swellAt = (phase: number) => {
    const points: string[] = [];
    for (let x = CX - reach; x <= CX + reach; x += SWELL_STEP)
      points.push(
        `${fmt(x)},${fmt(swellY + 2.2 * Math.sin(((x - CX) / 64) * Math.PI - 2 * Math.PI * phase))}`,
      );
    return points.join(' ');
  };
  const strokes: [number, number, number][] = [
    [262, 70, 160],
    [262, 236, 340],
    [262, 418, 520],
    [262, 598, 690],
    [280, 52, 118],
    [280, 168, 292],
    [280, 352, 436],
    [280, 494, 640],
    [298, 96, 214],
    [298, 284, 362],
    [298, 446, 566],
    [298, 624, 700],
  ];
  return `
  <g id="upper">
    <path d="${dome}" fill="${BLUE}"/>
    <g clip-path="url(#dome)">
    <polyline points="${swellAt(0)}" fill="none" stroke="${WHITE}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${
      animated
        ? `<animate attributeName="points" values="${Array.from({ length: 9 }, (_, k) => swellAt(k / 8)).join(';')}" dur="${SWELL_PERIOD_S}s" repeatCount="indefinite"/>`
        : ''
    }</polyline>
    <g stroke="${WHITE}" stroke-width="3.5" stroke-linecap="round" fill="none">
      ${strokes.map(([y, a, b], k) => waveStroke(y, a, b, k, animated)).join('\n      ')}
    </g>
    </g>
    <rect x="${fmt(l)}" y="${BAND_TOP}" width="${fmt(r - l)}" height="${BAND_FOOT - BAND_TOP}" fill="${WHITE}"/>
    <path d="${tiles.join(' ')}" stroke="${NAVY}" stroke-width="2.5"/>
    <path d="M ${fmt(l)},${BAND_TOP} H ${fmt(r)} M ${fmt(l)},${TILE_FOOT + 1} H ${fmt(r)}" stroke="${NAVY}" stroke-width="3"/>
    <path d="${outline}" fill="none" stroke="${NAVY}" stroke-width="${KEY}" stroke-linejoin="miter"/>
  </g>`;
}

// --- The plant's parts ---------------------------------------------------

/** A pipe through `points`, its corners swept as elbows. */
function pipe(points: number[][], bore = PIPE) {
  let d = `M ${fmt(points[0]![0]!)},${fmt(points[0]![1]!)}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!;
    const next = points[i + 1];
    if (!next) {
      d += ` L ${fmt(x!)},${fmt(y!)}`;
      break;
    }
    const [px, py] = points[i - 1]!;
    const into = Math.min(BEND, Math.hypot(x! - px!, y! - py!) / 2);
    const out = Math.min(BEND, Math.hypot(next[0]! - x!, next[1]! - y!) / 2);
    const a = [
      x! - Math.sign(x! - px!) * into,
      y! - Math.sign(y! - py!) * into,
    ];
    const b = [
      x! + Math.sign(next[0]! - x!) * out,
      y! + Math.sign(next[1]! - y!) * out,
    ];
    d += ` L ${fmt(a[0]!)},${fmt(a[1]!)} Q ${fmt(x!)},${fmt(y!)} ${fmt(b[0]!)},${fmt(b[1]!)}`;
  }
  return `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="${bore + 2 * LINE}"/><path d="${d}" fill="none" stroke="${WHITE}" stroke-width="${bore}"/>`;
}

/** A flange pair across a pipe at (x, y): `h` for a horizontal pipe. */
function flange(x: number, y: number, h: boolean) {
  const [w, l] = [9, PIPE + 10];
  const [rw, rh] = h ? [w, l] : [l, w];
  const bolts = h
    ? [
        [x, y - l / 2 + 2.5],
        [x, y + l / 2 - 2.5],
      ]
    : [
        [x - l / 2 + 2.5, y],
        [x + l / 2 - 2.5, y],
      ];
  return `<rect x="${fmt(x - rw / 2)}" y="${fmt(y - rh / 2)}" width="${rw}" height="${rh}" rx="1.5" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE}"/>${bolts.map(([bx, by]) => `<circle cx="${fmt(bx!)}" cy="${fmt(by!)}" r="1.4" fill="${NAVY}"/>`).join('')}`;
}

/** A ball valve with a yellow lever, in a pipe at (x, y). */
function valve(x: number, y: number, h: boolean, lever: 1 | -1 = 1) {
  const body = h
    ? `<rect x="${x - 9}" y="${y - 11}" width="18" height="22" rx="5" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>`
    : `<rect x="${x - 11}" y="${y - 9}" width="22" height="18" rx="5" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>`;
  const stem = h
    ? `<rect x="${x - 2.5}" y="${y - 19}" width="5" height="9" fill="${NAVY}"/>`
    : `<rect x="${x + (lever > 0 ? 10 : -19)}" y="${y - 2.5}" width="9" height="5" fill="${NAVY}"/>`;
  const handle = h
    ? `<rect x="${lever > 0 ? x - 4 : x - 26}" y="${y - 24}" width="30" height="7" rx="3.5" fill="${YELLOW}" stroke="${NAVY}" stroke-width="2"/>`
    : `<rect x="${lever > 0 ? x + 17 : x - 24}" y="${y - 4}" width="7" height="30" rx="3.5" fill="${YELLOW}" stroke="${NAVY}" stroke-width="2"/>`;
  return (
    flange(h ? x - 14 : x, h ? y : y - 14, h) +
    flange(h ? x + 14 : x, h ? y : y + 14, h) +
    body +
    stem +
    handle
  );
}

/**
 * The animation's frames: `LOOP_S` seconds at `RIPPLE_HZ`, the same motion
 * the title screen draws, looped seamlessly by SMIL.
 */
const FRAMES = Array.from({ length: LOOP_S * RIPPLE_HZ + 1 }, (_, f) => f);
const smil = (attrs: string, values: string[]) =>
  `<animate${attrs.startsWith('transform') ? 'Transform' : ''} attributeName="${attrs.split(' ')[0]}"${attrs.includes(' ') ? ' ' + attrs.slice(attrs.indexOf(' ') + 1) : ''} values="${values.join(';')}" dur="${LOOP_S}s" repeatCount="indefinite"/>`;

/** Pressure gauge `k` (`GAUGES`): face, ticks, and a needle on its pivot. */
function gauge(k: number, animated: boolean) {
  const { x, y, r } = GAUGES[k]!;
  const ticks: string[] = [];
  for (let n = 0; n <= 8; n++) {
    const a = ((-225 + n * 33.75) * Math.PI) / 180;
    ticks.push(
      `M ${fmt(x + Math.cos(a) * (r - 5))},${fmt(y + Math.sin(a) * (r - 5))} L ${fmt(x + Math.cos(a) * (r - 2.5))},${fmt(y + Math.sin(a) * (r - 2.5))}`,
    );
  }
  const turn = (f: number) => `${fmt(gaugeNeedle(k, f))} ${x} ${y}`;
  const motion = animated
    ? smil(
        'transform type="rotate"',
        FRAMES.map((f) => turn(f)),
      )
    : '';
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE + 0.5}"/>
    <path d="${ticks.join(' ')}" stroke="${NAVY}" stroke-width="1.6"/>
    <g transform="rotate(${turn(0)})"><path d="M ${x},${y} H ${fmt(x + r - 4)}" stroke="${NAVY}" stroke-width="2.2" stroke-linecap="round"/>${motion}</g>
    <circle cx="${x}" cy="${y}" r="2.2" fill="${NAVY}"/>`;
}

/** The sight glass's contents: the sand bed and the grains, frame 0 or looping. */
function sightGlass(animated: boolean) {
  const g = SIGHT_GLASS;
  const sand = (f: number) => {
    const v = sightGlassView(f);
    const [l, r] = [
      g.y + v.sandY - v.sandTilt / 2,
      g.y + v.sandY + v.sandTilt / 2,
    ];
    return `M ${g.x - g.radius},${fmt(l)} L ${g.x + g.radius},${fmt(r)} V ${g.y + g.radius} H ${g.x - g.radius} Z`;
  };
  const line = (f: number) => {
    const v = sightGlassView(f);
    return `M ${g.x - g.radius},${fmt(g.y + v.sandY - v.sandTilt / 2)} L ${g.x + g.radius},${fmt(g.y + v.sandY + v.sandTilt / 2)}`;
  };
  const views = animated ? FRAMES.map((f) => sightGlassView(f)) : [];
  const first = sightGlassView(0);
  return `<g clip-path="url(#glass)">
      <path d="${sand(0)}" fill="${SAND}">${animated ? smil('d', FRAMES.map(sand)) : ''}</path>
      <path d="${line(0)}" stroke="${SAND_LINE}" stroke-width="1.2">${animated ? smil('d', FRAMES.map(line)) : ''}</path>
      ${first.grains
        .map(
          (grain, i) =>
            `<circle cx="${fmt(g.x + grain.dx)}" cy="${fmt(g.y + grain.dy)}" r="1.5" fill="#f6e4a8">${
              animated
                ? smil(
                    'cx',
                    views.map((v) => fmt(g.x + v.grains[i]!.dx)),
                  ) +
                  smil(
                    'cy',
                    views.map((v) => fmt(g.y + v.grains[i]!.dy)),
                  )
                : ''
            }</circle>`,
        )
        .join('\n      ')}
      <path d="M ${fmt(g.x - g.radius * 0.72 * Math.cos(0.25))},${fmt(g.y - g.radius * 0.72 * Math.sin(0.25))} A ${fmt(g.radius * 0.72)} ${fmt(g.radius * 0.72)} 0 0 1 ${fmt(g.x - g.radius * 0.72 * Math.cos(1.32))},${fmt(g.y - g.radius * 0.72 * Math.sin(1.32))}" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2"/>
    </g>`;
}

/** The sand filter: vessel, bands, multiport head and lever, sight glass, stand. */
function filter(animated: boolean) {
  const g = SIGHT_GLASS;
  const legs = [
    [133, 618, 119, 651],
    [140, 618, 128, 651],
    [163, 618, 162, 651],
    [184, 618, 185, 651],
    [206, 618, 219, 651],
    [213, 618, 228, 651],
  ];
  return `
  <g id="filter">
    <g stroke-linecap="round">
      ${legs.map(([a, b, c, d]) => `<path d="M ${a},${b} L ${c},${d}" stroke="${NAVY}" stroke-width="7"/>`).join('')}
      ${legs.map(([a, b, c, d]) => `<path d="M ${a},${b} L ${c},${d}" stroke="${WHITE}" stroke-width="2.6"/>`).join('')}
    </g>
    <rect x="128" y="613" width="90" height="8" rx="2" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="112" y="649" width="124" height="9" rx="2" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="92" y="438" width="162" height="180" rx="72" ry="54" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE + 0.5}"/>
    <path d="M 93,505 H 253 M 93,557 H 253" stroke="${NAVY}" stroke-width="7"/>
    <path d="M 93,505 H 253 M 93,557 H 253" stroke="${WHITE}" stroke-width="2.5"/>
    <path d="M 112,470 Q 118,452 136,446" fill="none" stroke="${WHITE}" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
    <rect x="148" y="404" width="50" height="40" rx="8" fill="${NAVY}"/>
    <rect x="156" y="390" width="34" height="18" rx="5" fill="${NAVY}"/>
    <rect x="162" y="413" width="22" height="22" rx="11" fill="none" stroke="${BLUE}" stroke-width="2.5"/>
    <rect x="170" y="382" width="6" height="10" fill="${NAVY}"/>
    <rect x="166" y="376" width="44" height="8" rx="4" fill="${YELLOW}" stroke="${NAVY}" stroke-width="2"/>
    <circle cx="${g.x}" cy="${g.y}" r="${g.radius + 4}" fill="${WHITE}" stroke="${NAVY}" stroke-width="2"/>
    ${[0, 1, 2, 3]
      .map((k) => {
        const a = Math.PI / 4 + (k * Math.PI) / 2;
        return `<circle cx="${fmt(g.x + (g.radius + 2) * Math.cos(a))}" cy="${fmt(g.y + (g.radius + 2) * Math.sin(a))}" r="1.2" fill="${NAVY}"/>`;
      })
      .join('')}
    <circle cx="${g.x}" cy="${g.y}" r="${g.radius}" fill="${GLASS}"/>
    ${sightGlass(animated)}
    <circle cx="${g.x}" cy="${g.y}" r="${g.radius}" fill="none" stroke="${NAVY}" stroke-width="2"/>
  </g>`;
}

/** The strainer pot: lid, mesh basket in a clear body, foot. */
function strainer() {
  const mesh: string[] = [];
  for (let x = 290; x <= 322; x += 5) mesh.push(`M ${x},590 V 640`);
  for (let y = 592; y <= 640; y += 5) mesh.push(`M 288,${y} H 324`);
  return `
  <g id="strainer">
    <rect x="286" y="648" width="40" height="10" rx="2" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="282" y="574" width="48" height="76" rx="8" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <path d="${mesh.join(' ')}" stroke="${NAVY}" stroke-width="1.2"/>
    <rect x="276" y="562" width="60" height="13" rx="4" fill="${NAVY}"/>
    ${[284, 296, 316, 328].map((x) => `<circle cx="${x}" cy="568.5" r="2" fill="${BLUE}"/>`).join('')}
  </g>`;
}

/** The pump (a navy volute) and its motor (ribbed, with terminal box and cowl). */
function pump() {
  const ribs: string[] = [];
  for (let y = 590; y <= 636; y += 7) ribs.push(`M 426,${y} H 500`);
  return `
  <g id="pump">
    <rect x="344" y="652" width="186" height="10" rx="2" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="430" y="644" width="12" height="10" fill="${NAVY}"/>
    <rect x="486" y="644" width="12" height="10" fill="${NAVY}"/>
    <rect x="416" y="578" width="94" height="68" rx="8" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <path d="${ribs.join(' ')}" stroke="${NAVY}" stroke-width="1.8"/>
    <rect x="506" y="586" width="18" height="52" rx="7" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="432" y="566" width="34" height="14" rx="2" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <path d="M 356,640 V 600 Q 356,566 388,566 Q 418,566 418,600 V 640 Q 418,652 406,652 H 368 Q 356,652 356,640 Z" fill="${NAVY}"/>
    <circle cx="387" cy="608" r="22" fill="none" stroke="${BLUE}" stroke-width="2.5"/>
    <circle cx="387" cy="608" r="7" fill="${BLUE}"/>
  </g>`;
}

/** The plate heat exchanger: end frames, plate pack, guide bars, tie bolts. */
function heatExchanger() {
  const plates: string[] = [];
  for (let x = 611; x <= 654; x += 4) plates.push(`M ${x},426 V 574`);
  return `
  <g id="heat-exchanger">
    <rect x="606" y="422" width="54" height="156" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <path d="${plates.join(' ')}" stroke="${NAVY}" stroke-width="1.6"/>
    <rect x="592" y="414" width="16" height="172" rx="2" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="658" y="414" width="16" height="172" rx="2" fill="${BLUE}" stroke="${NAVY}" stroke-width="${LINE}"/>
    <rect x="586" y="418" width="94" height="6" rx="2" fill="${NAVY}"/>
    <rect x="586" y="576" width="94" height="6" rx="2" fill="${NAVY}"/>
    ${[
      [583, 421],
      [683, 421],
      [583, 579],
      [683, 579],
    ]
      .map(
        ([x, y]) =>
          `<rect x="${x! - 4}" y="${y! - 4}" width="8" height="8" rx="1.5" fill="${YELLOW}" stroke="${NAVY}" stroke-width="1.6"/>`,
      )
      .join('')}
    <rect x="596" y="586" width="12" height="14" fill="${NAVY}"/>
    <rect x="658" y="586" width="12" height="14" fill="${NAVY}"/>
  </g>`;
}

/**
 * The pipework, run for run as the owner's roundel has it, and its fittings:
 * the pool return from the multiport valve up into the deck (A); the
 * multiport to the vessel's side (B); the multiport to the top manifold and
 * on to the heat exchanger (C); the multiport down to the pump (D); the
 * strainer's inlet riser with its gauge tapping (E1), fed up through the
 * floor (E2); the strainer to the pump (F); the pump's discharge manifold,
 * with its three gauge tappings, into the heat exchanger (G); the heat
 * exchanger's outlet back down through the floor (I); and its secondary
 * flow and return up into the deck (S1, S2).
 */
function pipework(animated: boolean) {
  const runs: number[][][] = [
    // The gauge tappings first, so the runs they tee into pass in front.
    ...GAUGES.slice(1).map((g) => [
      [g.x, 540],
      [g.x, g.y + g.r - 2],
    ]),
    [
      [GAUGES[0].x, GAUGES[0].y + GAUGES[0].r - 2],
      [GAUGES[0].x, 604],
      [284, 604],
    ],
    [
      [250, FLOOR_END],
      [250, 604],
      [GAUGES[0].x, 604],
    ],
    [
      [150, 412],
      [62, 412],
      [62, BAND_FOOT + 4],
    ],
    [
      [148, 436],
      [46, 436],
      [46, 532],
      [94, 532],
    ],
    [
      [198, 412],
      [226, 412],
      [226, 380],
      [633, 380],
      [633, 416],
    ],
    [
      [198, 436],
      [366, 436],
      [366, 568],
    ],
    [
      [328, 604],
      [358, 604],
    ],
    [
      [402, 568],
      [402, 540],
      [578, 540],
      [578, 470],
      [594, 470],
    ],
    [
      [633, 584],
      [633, 604],
      [540, 604],
      [540, FLOOR_END],
    ],
    [
      [672, 452],
      [708, 452],
      [708, BAND_FOOT + 4],
    ],
    [
      [672, 548],
      [732, 548],
      [732, BAND_FOOT + 4],
    ],
  ];
  return `
  <g id="pipework">
    ${runs.map((run, k) => pipe(run, k < 3 ? 10 : PIPE)).join('')}
    ${GAUGES.map((_, k) => gauge(k, animated)).join('')}
    ${GAUGES.slice(1)
      .map((g) => valve(g.x, 494, false, 1))
      .join('')}
    ${[
      [110, 412, true],
      [78, 532, true],
      [100, 436, true],
      [300, 436, true],
      [400, 380, true],
      [470, 380, true],
      [250, 640, false],
      [250, FLOOR_END - 6, false],
      [540, FLOOR_END - 6, false],
      [343, 604, true],
      [430, 540, true],
      [517, 540, true],
      [588, 470, true],
      [633, 400, false],
      [680, 452, true],
      [680, 548, true],
      [540, 640, false],
    ]
      .map(([x, y, h]) => flange(x as number, y as number, h as boolean))
      .join('')}
    <path d="M 504,372 L 520,380 L 504,388 Z" fill="${NAVY}"/>
    ${valve(62, 378, false, -1)}
    ${valve(366, 500, false, -1)}
    ${valve(GAUGES[0].x, 530, false, 1)}
    ${valve(300, 380, true, 1)}
    ${valve(585, 380, true, 1)}
    ${valve(552, 604, true, 1)}
    ${valve(708, 396, false, -1)}
    ${valve(732, 490, false, 1)}
  </g>`;
}

/** Behind it all: stanchions holding up the deck, and the plinth rail. */
function structure() {
  const posts = [105, 318, 420, 552, 690];
  return `
  <g id="structure">
    ${posts.map((x) => `<rect x="${x - 4}" y="${BAND_FOOT + 4}" width="8" height="${664 - BAND_FOOT - 4}" fill="${WHITE}" stroke="${NAVY}" stroke-width="2.5"/><rect x="${x - 9}" y="662" width="18" height="6" rx="1.5" fill="${WHITE}" stroke="${NAVY}" stroke-width="2.5"/>`).join('')}
    <rect x="334" y="660" width="244" height="9" rx="2" fill="${WHITE}" stroke="${NAVY}" stroke-width="${LINE}"/>
  </g>`;
}

function logo(title: string, animated = false) {
  const g = SIGHT_GLASS;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>The Pool</title>
  <defs>
    <clipPath id="dome"><circle cx="${CX}" cy="${CY}" r="${LOGO_ART.innerRadius}"/></clipPath>
    <clipPath id="glass"><circle cx="${g.x}" cy="${g.y}" r="${g.radius}"/></clipPath>${title ? titleDefs() : ''}
  </defs>${upperSection(animated)}${structure()}
  <g id="plant" stroke-linejoin="round">${pipework(animated)}${filter(animated)}${strainer()}${pump()}${heatExchanger()}
  </g>${title}
</svg>
`;
}

// --- The title, for the titled version -----------------------------------

const t = TITLE_TEXT;
const reflectTop = t.baselineY + t.reflectionGapPx;
const reflectDepth = Math.min(
  t.sizePx * t.reflectionScale,
  LOGO_ART.waterBottom - reflectTop,
);

function titleDefs() {
  const font = readFileSync(FONT).toString('base64');
  return `
    <style>
      @font-face { font-family: "The Pool Title"; font-weight: 100 700; src: url(data:font/ttf;base64,${font}) format("truetype"); }
      .title { font-family: "The Pool Title", "Arial Narrow", sans-serif; font-weight: 700; font-size: ${t.sizePx}px; text-anchor: middle; stroke-width: 11; stroke-linejoin: round; paint-order: stroke fill; }
    </style>
    <filter id="shadow" x="-10%" y="-30%" width="120%" height="160%">
      <feDropShadow dx="3" dy="5" stdDeviation="3.5" flood-color="#000" flood-opacity="1"/>
    </filter>
    <linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${reflectTop}" x2="0" y2="${reflectTop + t.sizePx * t.reflectionScale}">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="1" stop-color="#000"/>
    </linearGradient>
    <mask id="reflection-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
      <rect x="0" y="${reflectTop}" width="${W}" height="${fmt(reflectDepth)}" fill="url(#fade)"/>
    </mask>`;
}

function titleLayer() {
  const text = (attrs: string) => `<text x="0" y="0" ${attrs}>The Pool</text>`;
  return `
  <g id="title">
    <g mask="url(#reflection-fade)" opacity="${t.reflectionAlpha}">
      ${text(`class="title" transform="translate(${CX} ${reflectTop}) scale(1 ${-t.reflectionScale})" fill="#8f9eb0" stroke="#0a397d"`)}
    </g>
    ${text(`class="title" transform="translate(${CX} ${t.baselineY})" fill="#fff" stroke="#0d47a1" filter="url(#shadow)"`)}
  </g>`;
}

writeFileSync(OUT, logo(''));
writeFileSync(TITLED_OUT, logo(titleLayer()));
writeFileSync(ANIMATED_OUT, logo('', true));
console.info(`wrote ${OUT}, ${TITLED_OUT} and ${ANIMATED_OUT}`);
