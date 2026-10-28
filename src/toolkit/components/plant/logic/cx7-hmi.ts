import {
  ALARM_TEXT,
  REFUSAL_TEXT,
  SETTING_RANGES,
  act,
  milliamps,
  relays,
  sessionReading,
  unacknowledged,
} from './dosing-controller';
import type {
  ControllerAction,
  ControllerSettings,
  ControllerState,
  DoseChannel,
  TrendPoint,
} from './dosing-controller';

/**
 * The Chlorella CX-7's touch screen (prompt 105): the Olympic's dosing
 * controller, after ProMinent's DULCOMARIN 3 (a 7" touch display, its
 * screen recorder, plain-text alarms, step-by-step calibration) and W&T's
 * DEPOLOX Pool (PI chlorine, P pH, the pH lockout, the maximum dosing
 * time). A 2010s industrial panel, not the bridge: a light grey ground,
 * white tiles with thin borders, dark figures, a Chlorella-green title bar
 * with the clock and the alarm bell, and a row of flat page keys along the
 * foot: HOME, CHLORINE, pH, TRENDS, ALARMS, CALIBRATE and STATUS.
 *
 * Pure: the screen is described as rectangles, text and lines on an
 * 800 × 480 pixel surface, with the zones a touch may land in, each naming
 * what it does; the view paints the description and passes the touches
 * back (`pressCx7`). What it shows is a function of the controller's state
 * and its own (page, trend span, a calibration's entry, a message), so a
 * view repaints only when the description changes.
 */

export const CX7_W = 800;
export const CX7_H = 480;

export const CX7_PAGES = [
  'home',
  'chlorine',
  'ph',
  'trends',
  'alarms',
  'cal',
  'status',
] as const;
export type Cx7Page = (typeof CX7_PAGES)[number];
const PAGE_NAMES: Record<Cx7Page, string> = {
  home: 'HOME',
  chlorine: 'CHLORINE',
  ph: 'pH',
  trends: 'TRENDS',
  alarms: 'ALARMS',
  cal: 'CALIBRATE',
  status: 'STATUS',
};

export interface Cx7State {
  page: Cx7Page;
  /** The trend page's span, hours. */
  span: 1 | 6 | 12;
  /** A calibration's entered value (a DPD or phenol red result). */
  entry: number | null;
  /** A message, and until when (its own clock's seconds). */
  message: { text: string; good: boolean; until: number } | null;
  /** Its own clock, real seconds (its blinking and messages, whatever the plant's pace). */
  time: number;
}

export const newCx7 = (): Cx7State => ({
  page: 'home',
  span: 1,
  entry: null,
  message: null,
  time: 0,
});

/** The screen `dt` real seconds on. */
export const tickCx7 = (h: Cx7State, dt: number): Cx7State => ({
  ...h,
  time: h.time + dt,
  message: h.message && h.message.until > h.time + dt ? h.message : null,
});

export type Cx7Item =
  | {
      kind: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      r?: number;
    }
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      size: number;
      colour: string;
      align?: 'left' | 'center' | 'right';
      bold?: boolean;
    }
  | {
      kind: 'line';
      points: number[];
      colour: string;
      width: number;
      dash?: boolean;
    };

export interface Cx7Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}

export interface Cx7Screen {
  items: Cx7Item[];
  zones: Cx7Zone[];
}

export const CX7_COLOURS = {
  ground: '#dde1e4',
  tile: '#ffffff',
  border: '#9aa4ab',
  ink: '#1d2429',
  muted: '#5b6670',
  title: '#3f9b3a',
  onTitle: '#ffffff',
  ok: '#2e8b3a',
  warn: '#d98c00',
  alarm: '#c62828',
  accent: '#1f5f99',
  key: '#c9cfd4',
  keyEdge: '#7d878e',
  free: '#2e8b3a',
  combined: '#d98c00',
  ph: '#1f5f99',
} as const;
const K = CX7_COLOURS;

/** The time of day it shows: its clock from 08:00. */
export const cx7Clock = (seconds: number) => {
  const s = Math.floor(seconds + 8 * 3600) % 86400;
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  return `${hh}:${mm}`;
};

const hms = (s: number) => {
  const t = Math.max(0, Math.round(s));
  const h = Math.floor(t / 3600);
  const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  return `${h}:${m}:${ss}`;
};

/** A screen being drawn. */
function canvas() {
  const items: Cx7Item[] = [];
  const zones: Cx7Zone[] = [];
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill?: string,
    stroke?: string,
    r = 0,
  ) => items.push({ kind: 'rect', x, y, w, h, fill, stroke, r });
  const text = (
    x: number,
    y: number,
    t: string,
    size: number,
    colour: string = K.ink,
    align: 'left' | 'center' | 'right' = 'left',
    bold = false,
  ) => items.push({ kind: 'text', x, y, text: t, size, colour, align, bold });
  const line = (points: number[], colour: string, width = 2, dash = false) =>
    items.push({ kind: 'line', points, colour, width, dash });
  /** A flat key: its face, its legend, its zone. */
  const key = (
    x: number,
    y: number,
    w: number,
    h: number,
    legend: string,
    id: string,
    lit = false,
    size = 16,
  ) => {
    rect(x, y, w, h, lit ? K.accent : K.key, K.keyEdge, 4);
    text(
      x + w / 2,
      y + h / 2,
      legend,
      size,
      lit ? '#ffffff' : K.ink,
      'center',
      true,
    );
    zones.push({ x, y, w, h, id });
  };
  const zone = (x: number, y: number, w: number, h: number, id: string) =>
    zones.push({ x, y, w, h, id });
  const tile = (x: number, y: number, w: number, h: number, title?: string) => {
    rect(x, y, w, h, K.tile, K.border, 3);
    if (title) text(x + 12, y + 18, title, 15, K.muted, 'left', true);
  };
  /** A status chip. */
  const chip = (
    x: number,
    y: number,
    w: number,
    label: string,
    colour: string,
  ) => {
    rect(x, y, w, 22, colour, undefined, 11);
    text(x + w / 2, y + 11, label, 13, '#ffffff', 'center', true);
  };
  return { items, zones, rect, text, line, key, zone, tile, chip };
}

type Canvas = ReturnType<typeof canvas>;

const fmt = (v: number | null, places: number) =>
  v === null || !Number.isFinite(v) ? '--' : v.toFixed(places);

/** The state of a reading against its limits, as its chip shows it. */
function limitChip(
  v: number,
  lo: number,
  hi: number,
  standing: boolean,
): [string, string] {
  if (v < lo) return ['LOW', standing ? K.alarm : K.warn];
  if (v > hi) return ['HIGH', standing ? K.alarm : K.warn];
  return ['OK', K.ok];
}

const standingCode = (c: ControllerState, code: string) =>
  c.alarms.some((a) => a.cleared === null && a.code === code);

function header(g: Canvas, c: ControllerState, title: string, blink: boolean) {
  g.rect(0, 0, CX7_W, 40, K.title);
  g.text(12, 20, 'Chlorella CX-7', 18, K.onTitle, 'left', true);
  g.text(400, 20, title, 17, K.onTitle, 'center', true);
  g.text(788, 20, cx7Clock(c.clock), 18, K.onTitle, 'right', true);
  const unacked = unacknowledged(c).length;
  const standing = c.alarms.filter(
    (a) => a.cleared === null && a.code !== 'ph-lockout',
  ).length;
  if (unacked || standing) {
    const lit = unacked ? blink : true;
    g.rect(612, 7, 104, 26, lit ? K.alarm : '#7a1b1b', '#ffffff', 4);
    g.text(
      664,
      20,
      `ALARM ${unacked || standing}`,
      14,
      '#ffffff',
      'center',
      true,
    );
    g.zone(612, 4, 104, 32, 'page:alarms');
  }
}

function nav(g: Canvas, page: Cx7Page) {
  const w = CX7_W / CX7_PAGES.length;
  g.rect(0, 428, CX7_W, 52, '#b7bec4');
  CX7_PAGES.forEach((p, i) =>
    g.key(
      i * w + 3,
      432,
      w - 6,
      44,
      PAGE_NAMES[p],
      `page:${p}`,
      p === page,
      15,
    ),
  );
}

function home(g: Canvas, c: ControllerState) {
  const m = c.measured;
  const P = c.settings;
  const W = 252;
  const H = 182;
  const at = (i: number) => [
    12 + (i % 3) * (W + 8),
    48 + Math.floor(i / 3) * (H + 8),
  ];
  const reading = (
    i: number,
    title: string,
    value: string,
    unit: string,
    lines: string[],
    chip: [string, string] | null,
    id: string,
  ) => {
    const [x, y] = at(i);
    g.tile(x, y, W, H, title);
    g.text(x + 14, y + 82, value, 56, K.ink, 'left', true);
    g.text(x + W - 14, y + 96, unit, 18, K.muted, 'right');
    lines.forEach((l, k) => g.text(x + 14, y + 136 + k * 20, l, 14, K.muted));
    if (chip) g.chip(x + W - 74, y + 8, 62, chip[0], chip[1]);
    g.zone(x, y, W, H, id);
  };
  reading(
    0,
    'FREE CHLORINE',
    fmt(m.free, 2),
    'mg/l',
    [
      `Setpoint ${P.chlorineSet.toFixed(2)}`,
      `Limits ${P.chlorineLow.toFixed(2)} – ${P.chlorineHigh.toFixed(2)}`,
    ],
    limitChip(
      m.free,
      P.chlorineLow,
      P.chlorineHigh,
      standingCode(c, 'chlorine-low') || standingCode(c, 'chlorine-high'),
    ),
    'page:chlorine',
  );
  reading(
    1,
    'COMBINED Cl',
    fmt(m.combined, 2),
    'mg/l',
    [`Total ${fmt(m.total, 2)} mg/l`, 'PWTAG: at most 1.0, ideally 0.5'],
    m.combined === null
      ? null
      : m.combined > 1
        ? ['HIGH', K.warn]
        : ['OK', K.ok],
    'page:trends',
  );
  reading(
    2,
    'pH',
    fmt(m.ph, 2),
    '',
    [
      `Setpoint ${P.pHSet.toFixed(2)}`,
      `Limits ${P.pHLow.toFixed(2)} – ${P.pHHigh.toFixed(2)}`,
    ],
    limitChip(
      m.ph,
      P.pHLow,
      P.pHHigh,
      standingCode(c, 'ph-low') || standingCode(c, 'ph-high'),
    ),
    'page:ph',
  );
  reading(
    3,
    'REDOX',
    fmt(m.redox, 0),
    'mV',
    ['Ag/AgCl reference'],
    null,
    'page:trends',
  );
  reading(
    4,
    'TEMPERATURE',
    fmt(m.temperature, 1),
    '°C',
    ['Pt1000, compensating pH'],
    null,
    'page:trends',
  );
  // The dosing tile.
  const [x, y] = at(5);
  g.tile(x, y, W, H, 'DOSING');
  const row = (k: number, name: string, ch: DoseChannel) => {
    const yy = y + 36 + k * 58;
    g.text(x + 14, yy + 10, name, 15, K.ink, 'left', true);
    g.text(
      x + W - 14,
      yy + 10,
      c.mode[ch] === 'auto' ? 'AUTO' : 'MANUAL',
      13,
      c.mode[ch] === 'auto' ? K.ok : K.warn,
      'right',
      true,
    );
    g.rect(x + 14, yy + 22, W - 90, 18, '#eef0f2', K.border, 2);
    g.rect(
      x + 15,
      yy + 23,
      (W - 92) * c.yout[ch],
      16,
      c.release[ch] ? K.accent : K.muted,
    );
    g.text(
      x + W - 14,
      yy + 31,
      `${Math.round(c.yout[ch] * 100)} %`,
      16,
      K.ink,
      'right',
      true,
    );
  };
  row(0, 'Hypochlorite', 'hypochlorite');
  row(1, 'Acid', 'acid');
  const why = c.flowFail
    ? ['SAMPLE FLOW LOW', K.alarm]
    : !c.circulating
      ? ['CIRCULATION OFF', K.alarm]
      : c.session
        ? ['CALIBRATING', K.warn]
        : c.timedOut.hypochlorite || c.timedOut.acid
          ? ['DOSING TIME', K.alarm]
          : c.lockout
            ? ['pH LOCKOUT', K.warn]
            : c.feedDelayLeft > 0
              ? [`FEED DELAY ${Math.ceil(c.feedDelayLeft)} s`, K.warn]
              : !c.running.hypochlorite || !c.running.acid
                ? ['STOPPED', K.warn]
                : ['RELEASED', K.ok];
  g.chip(x + 14, y + H - 32, W - 28, why[0], why[1]);
  g.zone(x, y, W, H, 'page:status');
}

/** A setting's row: its name, [−] value [+]. */
function adjustRow(
  g: Canvas,
  x: number,
  y: number,
  name: string,
  key: keyof ControllerSettings,
  value: string,
) {
  g.text(x, y + 20, name, 16, K.ink);
  g.key(x + 190, y, 50, 40, '−', `adj:${key}:-1`, false, 22);
  g.rect(x + 246, y, 96, 40, '#f6f7f8', K.border, 3);
  g.text(x + 294, y + 20, value, 20, K.ink, 'center', true);
  g.key(x + 348, y, 50, 40, '+', `adj:${key}:1`, false, 22);
}

function channelPage(g: Canvas, c: ControllerState, ch: DoseChannel) {
  const P = c.settings;
  const m = c.measured;
  const cl = ch === 'hypochlorite';
  g.tile(
    12,
    48,
    420,
    372,
    cl ? 'FREE CHLORINE · PI CONTROL' : 'pH · P CONTROL (ACID)',
  );
  g.text(26, 100, cl ? fmt(m.free, 2) : fmt(m.ph, 2), 54, K.ink, 'left', true);
  g.text(200, 108, cl ? 'mg/l' : 'pH', 18, K.muted);
  const rows: [string, keyof ControllerSettings, string][] = cl
    ? [
        ['Setpoint, mg/l', 'chlorineSet', P.chlorineSet.toFixed(2)],
        ['Band Xp, mg/l', 'chlorineBand', P.chlorineBand.toFixed(2)],
        [
          'Integral Tn, h',
          'chlorineIntegral',
          P.chlorineIntegral ? P.chlorineIntegral.toFixed(1) : 'OFF',
        ],
        ['Low limit, mg/l', 'chlorineLow', P.chlorineLow.toFixed(2)],
        ['High limit, mg/l', 'chlorineHigh', P.chlorineHigh.toFixed(1)],
      ]
    : [
        ['Setpoint', 'pHSet', P.pHSet.toFixed(2)],
        ['Band Xp, pH', 'pHBand', P.pHBand.toFixed(2)],
        [
          'Cl lockout, ± pH',
          'pHLockout',
          P.pHLockout ? P.pHLockout.toFixed(2) : 'OFF',
        ],
        ['Low limit', 'pHLow', P.pHLow.toFixed(2)],
        ['High limit', 'pHHigh', P.pHHigh.toFixed(2)],
      ];
  rows.forEach(([name, key, value], i) =>
    adjustRow(g, 26, 140 + i * 54, name, key, value),
  );
  // Its output.
  g.tile(442, 48, 346, 372, cl ? 'HYPOCHLORITE OUTPUT' : 'ACID OUTPUT');
  g.text(
    456,
    100,
    `${Math.round(c.yout[ch] * 100)} %`,
    48,
    K.ink,
    'left',
    true,
  );
  g.text(774, 100, `${milliamps(c, ch).toFixed(1)} mA`, 18, K.muted, 'right');
  g.rect(456, 128, 318, 22, '#eef0f2', K.border, 2);
  g.rect(457, 129, 316 * c.yout[ch], 20, c.release[ch] ? K.accent : K.muted);
  g.text(456, 176, 'Mode', 16, K.ink);
  g.key(530, 158, 116, 40, 'AUTO', `mode:${ch}:auto`, c.mode[ch] === 'auto');
  g.key(
    652,
    158,
    122,
    40,
    'MANUAL',
    `mode:${ch}:manual`,
    c.mode[ch] === 'manual',
  );
  g.text(
    456,
    230,
    'Manual output',
    16,
    c.mode[ch] === 'manual' ? K.ink : K.muted,
  );
  g.key(600, 212, 50, 40, '−', `man:${ch}:-1`, false, 22);
  g.rect(656, 212, 62, 40, '#f6f7f8', K.border, 3);
  g.text(
    687,
    232,
    `${Math.round(c.manual[ch] * 100)}%`,
    18,
    K.ink,
    'center',
    true,
  );
  g.key(724, 212, 50, 40, '+', `man:${ch}:1`, false, 22);
  const status = !c.running[ch]
    ? ['STOPPED', K.warn]
    : c.release[ch]
      ? ['RELEASED', K.ok]
      : ['HELD: see STATUS', K.alarm];
  g.chip(456, 270, 318, status[0], status[1]);
  const full = c.settings.doseLimit;
  g.text(
    456,
    316,
    full
      ? `At 100 %: ${hms(c.atFull[ch])} of ${hms(full)}`
      : 'No dosing time limit',
    15,
    c.timedOut[ch] ? K.alarm : K.muted,
  );
  g.key(
    456,
    352,
    318,
    50,
    c.running[ch] ? 'STOP DOSING' : 'START DOSING',
    `run:${ch}`,
    false,
    17,
  );
}

/** The trend's points within its span, as x, y pixels. */
export function trendPath(
  points: readonly TrendPoint[],
  now: number,
  spanH: number,
  value: (p: TrendPoint) => number | null,
  lo: number,
  hi: number,
  box: { x: number; y: number; w: number; h: number },
): number[] {
  const from = now - spanH * 3600;
  const out: number[] = [];
  // At most a point every two pixels: the twelve-hour span's 720 are thinned.
  const every = Math.max(1, Math.ceil(points.length / (box.w / 2)));
  points.forEach((p, i) => {
    if (p.t < from || i % every !== 0) return;
    const v = value(p);
    if (v === null) return;
    const fx = (p.t - from) / (spanH * 3600);
    const fy = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
    out.push(
      Math.round((box.x + fx * box.w) * 10) / 10,
      Math.round((box.y + box.h - fy * box.h) * 10) / 10,
    );
  });
  return out;
}

function trends(g: Canvas, c: ControllerState, h: Cx7State) {
  const box = { x: 64, y: 92, w: 664, h: 300 };
  g.tile(12, 48, 776, 372);
  g.text(26, 66, 'SCREEN RECORDER', 15, K.muted, 'left', true);
  ([1, 6, 12] as const).forEach((s, i) =>
    g.key(590 + i * 66, 54, 60, 30, `${s} h`, `span:${s}`, h.span === s, 14),
  );
  g.rect(box.x, box.y, box.w, box.h, '#fbfbfc', K.border);
  for (let k = 1; k < 6; k++) {
    const y = box.y + (box.h * k) / 6;
    g.line([box.x, y, box.x + box.w, y], '#e3e6e9', 1);
  }
  for (let k = 0; k <= 6; k++) {
    const y = box.y + box.h - (box.h * k) / 6;
    g.text(box.x - 8, y, (k * 0.5).toFixed(1), 12, K.free, 'right');
    g.text(box.x + box.w + 8, y, (6.5 + k * 0.25).toFixed(2), 12, K.ph, 'left');
  }
  const spanS = h.span * 3600;
  for (let k = 0; k <= 4; k++) {
    const x = box.x + (box.w * k) / 4;
    g.text(
      x,
      box.y + box.h + 14,
      cx7Clock(c.clock - spanS + (spanS * k) / 4),
      12,
      K.muted,
      'center',
    );
  }
  // The setpoints, dashed.
  const yCl = box.y + box.h - (c.settings.chlorineSet / 3) * box.h;
  const yPh = box.y + box.h - ((c.settings.pHSet - 6.5) / 1.5) * box.h;
  g.line([box.x, yCl, box.x + box.w, yCl], K.free, 1, true);
  g.line([box.x, yPh, box.x + box.w, yPh], K.ph, 1, true);
  const pts = c.trend;
  g.line(
    trendPath(pts, c.clock, h.span, (p) => p.free, 0, 3, box),
    K.free,
    2.5,
  );
  g.line(
    trendPath(pts, c.clock, h.span, (p) => p.combined, 0, 3, box),
    K.combined,
    2,
  );
  g.line(
    trendPath(pts, c.clock, h.span, (p) => p.ph, 6.5, 8, box),
    K.ph,
    2.5,
  );
  const legend: [string, string][] = [
    ['Free Cl, mg/l', K.free],
    ['Combined Cl, mg/l', K.combined],
    ['pH', K.ph],
  ];
  legend.forEach(([name, colour], i) => {
    g.rect(200 + i * 130, 62, 18, 6, colour);
    g.text(224 + i * 130, 66, name, 13, K.ink);
  });
}

function alarms(g: Canvas, c: ControllerState, blink: boolean) {
  g.tile(12, 48, 776, 372);
  g.text(26, 66, 'ALARM LIST', 15, K.muted, 'left', true);
  const list = c.alarms.slice().reverse().slice(0, 8);
  g.text(26, 92, 'TIME', 12, K.muted, 'left', true);
  g.text(96, 92, 'MESSAGE', 12, K.muted, 'left', true);
  g.text(560, 92, 'STATE', 12, K.muted, 'left', true);
  g.text(680, 92, 'CLEARED', 12, K.muted, 'left', true);
  list.forEach((a, i) => {
    const y = 102 + i * 34;
    const standing = a.cleared === null;
    const fill = !a.acked
      ? blink
        ? '#f5c6c6'
        : '#fbe4e4'
      : standing
        ? '#fdf0d8'
        : '#f3f4f5';
    g.rect(22, y, 756, 30, fill, '#d5d9dc', 2);
    g.text(30, y + 15, cx7Clock(a.raised), 15, K.ink);
    g.text(96, y + 15, ALARM_TEXT[a.code], 15, K.ink, 'left', !a.acked);
    g.text(
      560,
      y + 15,
      standing
        ? a.acked
          ? 'ACTIVE'
          : 'ACTIVE · NEW'
        : a.acked
          ? 'CLEARED'
          : 'CLEARED · NEW',
      13,
      standing ? K.alarm : K.muted,
      'left',
      true,
    );
    if (a.cleared !== null)
      g.text(680, y + 15, cx7Clock(a.cleared), 15, K.muted);
  });
  if (!list.length) g.text(400, 230, 'No alarms', 20, K.muted, 'center');
  const n = unacknowledged(c).length;
  g.text(
    26,
    396,
    `${n} unacknowledged · ${c.alarms.filter((a) => a.cleared === null).length} standing`,
    15,
    K.ink,
  );
  g.key(608, 376, 170, 38, 'ACKNOWLEDGE', 'ack', n > 0, 15);
}

const CAL_CHOICES = [
  ['cal:free', 'FREE CHLORINE', 'Zero, then slope against DPD 1', 'free'],
  ['cal:total', 'TOTAL CHLORINE', 'Zero, then slope against DPD 3', 'total'],
  ['cal:ph-process', 'pH, ONE POINT', 'Against phenol red, in the cell', 'ph'],
  [
    'cal:ph-buffers',
    'pH, TWO BUFFERS',
    'pH 7 then pH 4, out of the cell',
    'ph',
  ],
] as const;

function calibration(g: Canvas, c: ControllerState, h: Cx7State) {
  g.tile(12, 48, 776, 372);
  const x = c.session;
  if (!x) {
    g.text(26, 66, 'CALIBRATION', 15, K.muted, 'left', true);
    CAL_CHOICES.forEach(([id, name, how, probe], i) => {
      const y = 84 + i * 80;
      g.key(26, y, 300, 66, name, id, false, 17);
      g.text(340, y + 18, how, 15, K.ink);
      const rec = c.calLog[probe];
      g.text(
        340,
        y + 44,
        rec
          ? `Last: ${cx7Clock(rec.at)} · ${rec.ok ? 'OK' : 'REFUSED'} · slope ${rec.slopePercent.toFixed(0)} % · zero ${rec.zero.toFixed(probe === 'ph' ? 0 : 2)} ${probe === 'ph' ? 'mV' : 'µA'}`
          : 'Last: factory settings',
        14,
        rec && !rec.ok ? K.alarm : K.muted,
      );
    });
    message(g, h);
    return;
  }
  const r = sessionReading(c)!;
  const title =
    x.probe === 'ph'
      ? x.method === 'buffers'
        ? 'pH · TWO-POINT CALIBRATION'
        : 'pH · ONE-POINT CALIBRATION'
      : `${x.probe === 'free' ? 'FREE' : 'TOTAL'} CHLORINE · CALIBRATION`;
  g.text(26, 66, title, 15, K.muted, 'left', true);
  const steps: string[] =
    x.probe === 'ph'
      ? x.method === 'buffers'
        ? x.step === 'first'
          ? [
              'Step 1 of 2: lift the electrode out, rinse it,',
              'and stand it in pH 7 buffer. When steady: ACCEPT.',
            ]
          : [
              'Step 2 of 2: rinse the electrode and stand it',
              'in pH 4 buffer. When steady: ACCEPT.',
            ]
        : [
            'Test the sample tap’s water with phenol red,',
            'enter its pH and ACCEPT.',
          ]
      : x.step === 'zero'
        ? [
            'Step 1 of 2: shut the sample valve and wait for',
            'the reading to settle near zero. Then ACCEPT (or SKIP).',
          ]
        : [
            `Step 2 of 2: open the sample valve, let it settle, test`,
            `the tap’s water with ${x.probe === 'free' ? 'DPD 1' : 'DPD 3'}, enter the result and ACCEPT.`,
          ];
  steps.forEach((l, i) => g.text(26, 100 + i * 24, l, 17, K.ink));
  g.text(26, 176, 'Signal', 15, K.muted);
  g.text(
    26,
    210,
    `${r.raw.toFixed(x.probe === 'ph' ? 1 : 2)} ${r.unit}`,
    32,
    K.ink,
    'left',
    true,
  );
  g.text(300, 176, 'Reading', 15, K.muted);
  g.text(
    300,
    210,
    x.probe === 'ph'
      ? `pH ${r.value.toFixed(2)}`
      : `${r.value.toFixed(2)} mg/l`,
    32,
    K.ink,
    'left',
    true,
  );
  if (x.probe === 'ph' && x.method === 'buffers')
    g.text(
      560,
      210,
      r.buffer === null ? 'no buffer' : `buffer ${r.buffer.toFixed(2)}`,
      20,
      r.buffer === null ? K.warn : K.ok,
      'left',
      true,
    );
  const entering =
    (x.probe !== 'ph' && x.step === 'span') ||
    (x.probe === 'ph' && x.method === 'process');
  if (entering) {
    const v = h.entry ?? r.value;
    g.text(
      26,
      270,
      x.probe === 'ph' ? 'Phenol red pH' : 'DPD result, mg/l',
      17,
      K.ink,
    );
    g.key(220, 250, 56, 44, '−', 'entry:-1', false, 24);
    g.rect(282, 250, 120, 44, '#f6f7f8', K.border, 3);
    g.text(
      342,
      272,
      v.toFixed(x.probe === 'ph' ? 1 : 2),
      24,
      K.ink,
      'center',
      true,
    );
    g.key(408, 250, 56, 44, '+', 'entry:1', false, 24);
  }
  g.key(26, 330, 200, 54, 'ACCEPT', 'cal:accept', true, 18);
  if (x.probe !== 'ph' && x.step === 'zero')
    g.key(240, 330, 160, 54, 'SKIP ZERO', 'cal:skip', false, 16);
  g.key(588, 330, 186, 54, 'CANCEL', 'cal:cancel', false, 16);
  g.text(774, 66, 'Dosing held while calibrating', 13, K.warn, 'right', true);
  message(g, h);
}

function message(g: Canvas, h: Cx7State) {
  if (!h.message) return;
  g.rect(
    22,
    392,
    756,
    24,
    h.message.good ? '#dcefdc' : '#f8d7d7',
    undefined,
    3,
  );
  g.text(
    30,
    404,
    h.message.text,
    15,
    h.message.good ? K.ok : K.alarm,
    'left',
    true,
  );
}

function status(g: Canvas, c: ControllerState) {
  const P = c.settings;
  g.tile(12, 48, 476, 372, 'INTERLOCKS');
  const rows: [string, string, string][] = [
    [
      'Sample water flow',
      c.signals.flowOk
        ? 'OK'
        : c.flowFail
          ? 'LOW: DOSING STOPPED'
          : `LOW: stop in ${Math.ceil(P.sampleFlowDelay - c.flowLost)} s`,
      c.signals.flowOk ? K.ok : K.alarm,
    ],
    [
      'Circulation',
      c.circulating ? 'RUNNING' : 'STOPPED',
      c.circulating ? K.ok : K.alarm,
    ],
    [
      `pH lockout, ${P.pHSet.toFixed(2)} ± ${P.pHLockout.toFixed(2)}`,
      c.lockout ? 'CHLORINE LOCKED OUT' : 'clear',
      c.lockout ? K.warn : K.ok,
    ],
    [
      'Dosing time, hypochlorite',
      c.timedOut.hypochlorite
        ? 'EXCEEDED: ACKNOWLEDGE'
        : `${hms(c.atFull.hypochlorite)} of ${hms(P.doseLimit)}`,
      c.timedOut.hypochlorite ? K.alarm : K.ok,
    ],
    [
      'Dosing time, acid',
      c.timedOut.acid
        ? 'EXCEEDED: ACKNOWLEDGE'
        : `${hms(c.atFull.acid)} of ${hms(P.doseLimit)}`,
      c.timedOut.acid ? K.alarm : K.ok,
    ],
    [
      'Feed delay',
      c.feedDelayLeft > 0 ? `${Math.ceil(c.feedDelayLeft)} s` : 'done',
      c.feedDelayLeft > 0 ? K.warn : K.ok,
    ],
    [
      'Calibration',
      c.session ? 'IN PROGRESS: HELD' : 'none',
      c.session ? K.warn : K.ok,
    ],
  ];
  rows.forEach(([name, value, colour], i) => {
    const y = 80 + i * 36;
    g.text(26, y, name, 15, K.ink);
    g.text(474, y, value, 15, colour, 'right', true);
  });
  adjustRow(
    g,
    26,
    334,
    'Max. dosing time',
    'doseLimit',
    P.doseLimit ? `${(P.doseLimit / 3600).toFixed(1)} h` : 'OFF',
  );
  g.text(26, 400, 'Sample flow delay', 15, K.muted);
  g.text(474, 400, `${P.sampleFlowDelay} s`, 15, K.muted, 'right');
  // The outputs and relays.
  g.tile(498, 48, 290, 372, 'OUTPUTS');
  (['hypochlorite', 'acid'] as const).forEach((ch, i) => {
    const y = 80 + i * 66;
    g.text(
      512,
      y,
      ch === 'hypochlorite' ? 'Hypochlorite pump' : 'Acid pump',
      15,
      K.ink,
      'left',
      true,
    );
    g.text(
      512,
      y + 24,
      `${Math.round(c.yout[ch] * 100)} % · ${milliamps(c, ch).toFixed(1)} mA · ${c.release[ch] ? 'released' : 'held'}`,
      14,
      K.muted,
    );
    const fault = standingCode(c, `pump-${ch}`);
    g.text(
      774,
      y,
      fault ? 'PUMP FAULT' : c.mode[ch].toUpperCase(),
      13,
      fault ? K.alarm : K.muted,
      'right',
      true,
    );
  });
  g.text(512, 228, 'Relays to the control room', 15, K.ink, 'left', true);
  const rel = relays(c);
  const lamps: [string, boolean][] = [
    ['Chlorine alarm', rel.chlorine],
    ['pH alarm', rel.ph],
    ['Sample flow fail', rel.sampleFlow],
    ['Dosing time limit', rel.doseLimit],
    ['Controller fault', rel.fault],
    ['Common alarm', rel.common],
  ];
  lamps.forEach(([name, on], i) => {
    const y = 248 + i * 22;
    g.rect(512, y, 14, 14, on ? K.alarm : '#d5d9dc', K.border, 7);
    g.text(534, y + 7, name, 14, on ? K.ink : K.muted);
  });
  g.key(
    640,
    376,
    134,
    36,
    c.running.hypochlorite || c.running.acid ? 'STOP ALL' : 'START ALL',
    'run:all',
    false,
    14,
  );
}

/** What the screen shows now. */
export function cx7Screen(h: Cx7State, c: ControllerState): Cx7Screen {
  const g = canvas();
  const blink = Math.floor(h.time * 1.5) % 2 === 0;
  g.rect(0, 0, CX7_W, CX7_H, K.ground);
  header(g, c, `OLYMPIC POOL · ${PAGE_NAMES[h.page]}`, blink);
  switch (h.page) {
    case 'home':
      home(g, c);
      break;
    case 'chlorine':
      channelPage(g, c, 'hypochlorite');
      break;
    case 'ph':
      channelPage(g, c, 'acid');
      break;
    case 'trends':
      trends(g, c, h);
      break;
    case 'alarms':
      alarms(g, c, blink);
      break;
    case 'cal':
      calibration(g, c, h);
      break;
    case 'status':
      status(g, c);
      break;
  }
  if (h.page !== 'cal') message(g, h);
  nav(g, h.page);
  return { items: g.items, zones: g.zones };
}

/** The zone a touch at pixel `(x, y)` lands in, the topmost (last drawn). */
export function zoneAt(screen: Cx7Screen, x: number, y: number) {
  for (let i = screen.zones.length - 1; i >= 0; i--) {
    const z = screen.zones[i];
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z.id;
  }
  return null;
}

export type Cx7Sound = 'confirm' | 'done' | 'ack' | 'deny' | 'page' | null;

/** A touch on a zone: the screen's state, the controller's, and the sound to make. */
export function pressCx7(
  h: Cx7State,
  c: ControllerState,
  id: string,
): { hmi: Cx7State; controller: ControllerState; sound: Cx7Sound } {
  const [what, a, b] = id.split(':');
  const say = (text: string, good: boolean, hmi: Cx7State = h) => ({
    ...hmi,
    message: { text, good, until: h.time + 8 },
  });
  const send = (action: ControllerAction, hmi: Cx7State = h) => {
    const r = act(c, action);
    return {
      hmi: r.refused ? say(REFUSAL_TEXT[r.refused], false, hmi) : hmi,
      controller: r.state,
      sound: (r.refused ? 'deny' : 'done') as Cx7Sound,
      result: r,
    };
  };
  switch (what) {
    case 'page':
      return {
        hmi: { ...h, page: a as Cx7Page },
        controller: c,
        sound: 'page',
      };
    case 'span':
      return {
        hmi: { ...h, span: Number(a) as 1 | 6 | 12 },
        controller: c,
        sound: 'confirm',
      };
    case 'ack':
      return unacknowledged(c).length
        ? { ...send({ kind: 'ack' }), sound: 'ack' }
        : { hmi: h, controller: c, sound: 'deny' };
    case 'adj': {
      const key = a as keyof ControllerSettings;
      const r = SETTING_RANGES[key];
      const v = c.settings[key] + Number(b) * r.step;
      if (v < r.min - 1e-9 || v > r.max + 1e-9)
        return { hmi: h, controller: c, sound: 'deny' };
      return send({ kind: 'set', key, value: v });
    }
    case 'mode':
      return send({
        kind: 'mode',
        channel: a as DoseChannel,
        mode: b as 'auto' | 'manual',
      });
    case 'man':
      return send({
        kind: 'manual',
        channel: a as DoseChannel,
        value: c.manual[a as DoseChannel] + Number(b) * 0.05,
      });
    case 'run': {
      if (a === 'all') {
        const on = c.running.hypochlorite || c.running.acid;
        return send({ kind: on ? 'stop' : 'start' });
      }
      const ch = a as DoseChannel;
      return send({ kind: c.running[ch] ? 'stop' : 'start', channel: ch });
    }
    case 'entry': {
      const x = c.session;
      if (!x) return { hmi: h, controller: c, sound: 'deny' };
      const step = x.probe === 'ph' ? 0.1 : 0.01;
      const base = h.entry ?? sessionReading(c)!.value;
      const v = Math.max(
        0,
        Math.round((base + Number(a) * step) / step) * step,
      );
      return { hmi: { ...h, entry: v }, controller: c, sound: 'confirm' };
    }
    case 'cal': {
      if (a === 'free' || a === 'total')
        return send(
          { kind: 'cal-begin', probe: a },
          { ...h, entry: null, message: null },
        );
      if (a === 'ph-process' || a === 'ph-buffers')
        return send(
          {
            kind: 'cal-begin',
            probe: 'ph',
            method: a === 'ph-process' ? 'process' : 'buffers',
          },
          { ...h, entry: null, message: null },
        );
      if (a === 'cancel')
        return send(
          { kind: 'cal-end' },
          say('Calibration cancelled: the old one kept', false, {
            ...h,
            entry: null,
          }),
        );
      if (a === 'skip')
        return send({ kind: 'cal-skip' }, { ...h, entry: null });
      if (a === 'accept') {
        const x = c.session;
        if (!x) return { hmi: h, controller: c, sound: 'deny' };
        const value = h.entry ?? sessionReading(c)!.value;
        const action: ControllerAction =
          x.probe === 'ph'
            ? x.method === 'buffers'
              ? { kind: 'cal-buffer' }
              : { kind: 'cal-process', value }
            : x.step === 'zero'
              ? { kind: 'cal-zero' }
              : { kind: 'cal-span', value };
        const r = send(action, { ...h, entry: null });
        if (r.result.refused) return r;
        const f = r.result.found ?? {};
        const done = r.controller.session === null;
        const text = done
          ? `Calibrated: slope ${(f.slopePercent ?? 100).toFixed(0)} %${f.zero !== undefined ? `, zero ${f.zero.toFixed(1)}` : ''}`
          : f.buffer !== undefined
            ? `Buffer ${f.buffer.toFixed(2)} recognised`
            : `Zero accepted: ${(f.zero ?? 0).toFixed(2)} µA`;
        return { ...r, hmi: say(text, true, r.hmi) };
      }
      return { hmi: h, controller: c, sound: null };
    }
  }
  return { hmi: h, controller: c, sound: null };
}
