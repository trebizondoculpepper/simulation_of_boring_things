import type { Rect } from '../../../../ui2d/geometry';
import { hitRegion } from '../../../../ui2d/aero/logic/aero-layout';
import type { Region } from '../../../../ui2d/aero/logic/aero-layout';
import {
  CHANNEL_IDS,
  CHANNELS,
  READING_IDS,
  READING_LABELS,
  SCREEN,
} from '../../../../game/plant/aqualis-types';
import type {
  Advice,
  Alarm,
  AqualisReadings,
  AqualisSettings,
  ChannelId,
  ChannelView,
  Inhibit,
  ReadingId,
  SampleStatus,
  Selector,
  Target,
} from '../../../../game/plant/aqualis-types';

/**
 * The Aqualis cabinet's display model (mission 114, `doc/plans/114/`): it
 * binds the sampler's readings, the controller's channels and the advisor's
 * advice into what the 7-inch screen shows and the touches it takes. Left
 * alone the screen cycles between its three normal pages, pump status,
 * water status and Dr Aqualis; a touch holds it on the page touched until
 * it has been left untouched for a while. Settings (pool dynamics and
 * targets) is reached from its tab and never cycled to. HAND's rates are
 * set on the pump page while the knob is at HAND. Pure: the screen's
 * drawing is `views/aqualis-screens.ts`, which draws a page when its
 * model's `key` changes.
 */

export type Page = 'pumps' | 'water' | 'doctor' | 'settings';
export const CYCLED: readonly Page[] = ['pumps', 'water', 'doctor'];
export type SettingsTab = 'dynamics' | 'targets';

/** Seconds each page shows in the cycle, and how long a touch holds it. */
export const CYCLE_SECONDS = 10;
export const HOLD_SECONDS = 90;
/** Seconds a pressed region glows. */
export const PRESS_GLOW = 0.15;

/** Each target's step on the settings screen. */
export const TARGET_STEP: Record<Exclude<ReadingId, 'temperature'>, number> = {
  freeChlorine: 0.1,
  combinedChlorine: 0.1,
  totalChlorine: 0.1,
  ph: 0.05,
  alkalinity: 10,
  calciumHardness: 25,
  lsi: 0.1,
  tds: 100,
  sulphate: 20,
};
/** The pool dynamics' steps: m³ and m³/h. */
export const DYNAMICS_STEP = { volumeM3: 5, flowM3h: 5 } as const;
/** HAND's step, of a channel's most. */
export const HAND_STEP = 0.1;

export const TARGET_IDS = READING_IDS.filter(
  (id): id is Exclude<ReadingId, 'temperature'> => id !== 'temperature',
);

export interface DisplayState {
  page: Page;
  /** Seconds on this page in the cycle, and since the last touch (Infinity: never touched). */
  onPage: number;
  idle: number;
  tab: SettingsTab;
  /** The target chosen on the Targets tab. */
  targetRow: number;
  /** Which advice Dr Aqualis is giving, and whether its dose is shown. */
  advice: number;
  showDose: boolean;
  /** The region glowing from a press, and for how long. */
  pressed: string | null;
  glow: number;
}

export function newDisplay(): DisplayState {
  return {
    page: 'pumps',
    onPage: 0,
    idle: Infinity,
    tab: 'dynamics',
    targetRow: 0,
    advice: 0,
    showDose: false,
    pressed: null,
    glow: 0,
  };
}

/** What the rest of the cabinet gives the display each frame. */
export interface DisplayInputs {
  readings: AqualisReadings | null;
  sample: SampleStatus;
  selector: Selector;
  channels: Record<ChannelId, ChannelView>;
  inhibit: Inhibit | null;
  advice: readonly Advice[];
  alarms: readonly Alarm[];
  settings: AqualisSettings;
  /** HAND's demands, 0 to 1. */
  hand: Record<ChannelId, number>;
}

/** What a press asks of the cabinet beyond the display's own state. */
export type DisplayEffect =
  | { kind: 'settings'; settings: AqualisSettings }
  | { kind: 'hand'; channel: ChannelId; demand: number };

// ---- Time ------------------------------------------------------------------------------

/** The display `dt` seconds on: the cycle turns while it is untouched. */
export function tickDisplay(s: DisplayState, dt: number): DisplayState {
  let { page, onPage, idle, glow, pressed, advice, showDose } = s;
  idle += dt;
  onPage += dt;
  if (glow > 0) {
    glow = Math.max(0, glow - dt);
    if (glow === 0) pressed = null;
  }
  if (idle >= HOLD_SECONDS && onPage >= CYCLE_SECONDS) {
    const i = CYCLED.indexOf(page);
    page = CYCLED[(i + 1) % CYCLED.length];
    onPage = 0;
    advice = 0;
    showDose = false;
  }
  return { ...s, page, onPage, idle, glow, pressed, advice, showDose };
}

// ---- Layout ----------------------------------------------------------------------------

/** The title strip, the page tabs in it, the content and the status strip. */
export const LAYOUT = {
  title: { x: 0, y: 0, w: SCREEN.w, h: 52 } as Rect,
  content: { x: 14, y: 62, w: SCREEN.w - 28, h: 374 } as Rect,
  status: { x: 0, y: SCREEN.h - 36, w: SCREEN.w, h: 36 } as Rect,
};

const TAB_NAMES: Record<Page, string> = {
  pumps: 'Pumps',
  water: 'Water',
  doctor: 'Dr Aqualis',
  settings: 'Settings',
};

export function tabRects(): { page: Page; name: string; rect: Rect }[] {
  const pages: Page[] = ['pumps', 'water', 'doctor', 'settings'];
  const w = 112;
  const gap = 6;
  const x0 = SCREEN.w - 10 - pages.length * w - (pages.length - 1) * gap;
  return pages.map((page, i) => ({
    page,
    name: TAB_NAMES[page],
    rect: { x: x0 + i * (w + gap), y: 9, w, h: 34 },
  }));
}

/** A pump row's rectangle, and its HAND buttons'. */
export function pumpRow(i: number) {
  const c = LAYOUT.content;
  const h = 112;
  const row: Rect = { x: c.x, y: c.y + i * (h + 9), w: c.w, h };
  return {
    row,
    minus: { x: row.x + row.w - 132, y: row.y + 64, w: 56, h: 38 } as Rect,
    plus: { x: row.x + row.w - 66, y: row.y + 64, w: 56, h: 38 } as Rect,
  };
}

/** The water page's tile for reading `i`: two columns of five. */
export function waterTile(i: number): Rect {
  const c = LAYOUT.content;
  const col = Math.floor(i / 5);
  const row = i % 5;
  const w = (c.w - 12) / 2;
  const h = 68;
  return { x: c.x + col * (w + 12), y: c.y + row * (h + 8), w, h };
}

/** The doctor page: his place, his bubble, and its buttons. */
export const DOCTOR = {
  him: { x: 20, y: 120, w: 230, h: 300 } as Rect,
  bubble: { x: 270, y: 72, w: 510, h: 270 } as Rect,
  prev: { x: 270, y: 362, w: 60, h: 46 } as Rect,
  next: { x: 420, y: 362, w: 60, h: 46 } as Rect,
  dose: { x: 560, y: 362, w: 220, h: 46 } as Rect,
};

/** The settings page: its two tabs, and the editing rows. */
export const SETTINGS = {
  tabs: [
    { x: 24, y: 70, w: 200, h: 40 },
    { x: 232, y: 70, w: 200, h: 40 },
  ] as Rect[],
  /** Pool dynamics: two rows of a value and its − and +. */
  dynamics: [0, 1].map((i) => ({
    row: { x: 24, y: 136 + i * 96, w: 752, h: 80 } as Rect,
    minus: { x: 560, y: 150 + i * 96, w: 90, h: 52 } as Rect,
    plus: { x: 666, y: 150 + i * 96, w: 90, h: 52 } as Rect,
  })),
  /** Targets: the list on the left, the chosen target's set, low and high on the right. */
  list: { x: 24, y: 120, w: 300, h: 310 } as Rect,
  up: { x: 330, y: 120, w: 46, h: 46 } as Rect,
  down: { x: 330, y: 384, w: 46, h: 46 } as Rect,
  fields: (['set', 'low', 'high'] as const).map((field, i) => ({
    field,
    row: { x: 392, y: 150 + i * 92, w: 384, h: 76 } as Rect,
    minus: { x: 590, y: 162 + i * 92, w: 80, h: 52 } as Rect,
    plus: { x: 684, y: 162 + i * 92, w: 80, h: 52 } as Rect,
  })),
  rowH: 34,
};

/** Every region the page now answers. */
export function displayRegions(
  s: DisplayState,
  inputs: DisplayInputs,
): Region[] {
  const regions: Region[] = tabRects().map((t) => ({
    id: `tab:${t.page}`,
    rect: t.rect,
  }));
  if (s.page === 'pumps' && inputs.selector === 'hand')
    CHANNEL_IDS.forEach((id, i) => {
      const r = pumpRow(i);
      const on = inputs.channels[id].status.kind !== 'unconnected';
      regions.push(
        { id: `hand-:${id}`, rect: r.minus, enabled: on },
        { id: `hand+:${id}`, rect: r.plus, enabled: on },
      );
    });
  if (s.page === 'doctor') {
    const n = inputs.advice.length;
    regions.push(
      { id: 'advice-', rect: DOCTOR.prev, enabled: n > 1 },
      { id: 'advice+', rect: DOCTOR.next, enabled: n > 1 },
      {
        id: 'show-dose',
        rect: DOCTOR.dose,
        enabled: !!inputs.advice[Math.min(s.advice, n - 1)]?.dose,
      },
    );
  }
  if (s.page === 'settings') {
    regions.push(
      { id: 'stab:dynamics', rect: SETTINGS.tabs[0] },
      { id: 'stab:targets', rect: SETTINGS.tabs[1] },
    );
    if (s.tab === 'dynamics')
      SETTINGS.dynamics.forEach((d, i) => {
        const key = i === 0 ? 'volumeM3' : 'flowM3h';
        regions.push(
          { id: `dyn-:${key}`, rect: d.minus },
          { id: `dyn+:${key}`, rect: d.plus },
        );
      });
    else {
      regions.push(
        { id: 'row-', rect: SETTINGS.up },
        { id: 'row+', rect: SETTINGS.down },
      );
      TARGET_IDS.forEach((_, i) =>
        regions.push({ id: `row:${i}`, rect: targetListRow(i) }),
      );
      for (const f of SETTINGS.fields)
        regions.push(
          { id: `tgt-:${f.field}`, rect: f.minus },
          { id: `tgt+:${f.field}`, rect: f.plus },
        );
    }
  }
  return regions;
}

export function targetListRow(i: number): Rect {
  const l = SETTINGS.list;
  return {
    x: l.x,
    y: l.y + i * SETTINGS.rowH,
    w: l.w,
    h: SETTINGS.rowH - 2,
  };
}

/** What a touch at screen pixel (x, y) presses, or null. */
export function hitDisplay(
  s: DisplayState,
  inputs: DisplayInputs,
  x: number,
  y: number,
): string | null {
  return hitRegion(displayRegions(s, inputs), x, y);
}

// ---- Presses ---------------------------------------------------------------------------

const round = (v: number, step: number) => Math.round(v / step) * step + 0; // + 0: no −0

function stepTarget(
  t: Target,
  field: keyof Target,
  by: number,
  step: number,
): Target {
  const next = { ...t, [field]: round(t[field] + by, step) };
  // Keep low ≤ set ≤ high, the field being moved pushing the others.
  if (field === 'set') {
    next.low = Math.min(next.low, next.set);
    next.high = Math.max(next.high, next.set);
  } else if (field === 'low') {
    next.set = Math.max(next.set, next.low);
    next.high = Math.max(next.high, next.set);
  } else {
    next.set = Math.min(next.set, next.high);
    next.low = Math.min(next.low, next.set);
  }
  return next;
}

/** A press of region `id`: the display's next state, and what it asks of the cabinet. */
export function pressDisplay(
  s: DisplayState,
  inputs: DisplayInputs,
  id: string,
): { state: DisplayState; effect: DisplayEffect | null } {
  let state: DisplayState = {
    ...s,
    idle: 0,
    pressed: id,
    glow: PRESS_GLOW,
  };
  let effect: DisplayEffect | null = null;
  const [verb, arg] = id.split(':');
  const settings = inputs.settings;
  if (verb === 'tab') {
    state = {
      ...state,
      page: arg as Page,
      onPage: 0,
      advice: 0,
      showDose: false,
    };
  } else if (verb === 'hand-' || verb === 'hand+') {
    const ch = arg as ChannelId;
    const by = verb === 'hand+' ? HAND_STEP : -HAND_STEP;
    const demand = Math.min(1, Math.max(0, round(inputs.hand[ch] + by, 0.1)));
    effect = { kind: 'hand', channel: ch, demand };
  } else if (verb === 'advice-' || verb === 'advice+') {
    const n = Math.max(1, inputs.advice.length);
    const by = verb === 'advice+' ? 1 : -1;
    state = { ...state, advice: (s.advice + by + n) % n, showDose: false };
  } else if (verb === 'show-dose') {
    state = { ...state, showDose: !s.showDose };
  } else if (verb === 'stab') {
    state = { ...state, tab: arg as SettingsTab };
  } else if (verb === 'dyn-' || verb === 'dyn+') {
    const key = arg as keyof typeof DYNAMICS_STEP;
    const step = DYNAMICS_STEP[key];
    const v = Math.max(
      step,
      round(settings.dynamics[key] + (verb === 'dyn+' ? step : -step), step),
    );
    effect = {
      kind: 'settings',
      settings: { ...settings, dynamics: { ...settings.dynamics, [key]: v } },
    };
  } else if (verb === 'row-' || verb === 'row+') {
    const n = TARGET_IDS.length;
    state = {
      ...state,
      targetRow: (s.targetRow + (verb === 'row+' ? 1 : -1) + n) % n,
    };
  } else if (verb === 'row') {
    state = { ...state, targetRow: Number(arg) };
  } else if (verb === 'tgt-' || verb === 'tgt+') {
    const rid = TARGET_IDS[s.targetRow];
    const step = TARGET_STEP[rid];
    effect = {
      kind: 'settings',
      settings: {
        ...settings,
        targets: {
          ...settings.targets,
          [rid]: stepTarget(
            settings.targets[rid],
            arg as keyof Target,
            verb === 'tgt+' ? step : -step,
            step,
          ),
        },
      },
    };
  }
  return { state, effect };
}

// ---- What the screen shows -------------------------------------------------------------

export type Band = 'low' | 'ok' | 'high';

export function bandOf(v: number, t: Target): Band {
  return v < t.low ? 'low' : v > t.high ? 'high' : 'ok';
}

/** A number as the screen shows it, to its reading's precision. */
export function formatReading(id: ReadingId, v: number): string {
  if (id === 'ph') return v.toFixed(2);
  if (id === 'lsi') return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;
  if (id === 'temperature') return v.toFixed(1);
  if (id.endsWith('hlorine')) return v.toFixed(2);
  return Math.round(v).toString();
}

export function formatRate(id: ChannelId, v: number): string {
  const unit = CHANNELS[id].unit;
  return unit === 'g/h' ? `${Math.round(v)} g/h` : `${v.toFixed(2)} l/h`;
}

const OFFLINE_WORDS = {
  'switched-off': 'switched off',
  manual: 'in manual',
  'no-power': 'no power',
  fault: 'fault',
  'not-delivering': 'not delivering',
} as const;

/** A channel's status in words, and its badge's colour. */
export function channelBadge(v: ChannelView): {
  text: string;
  tint: 'green' | 'red' | 'grey' | 'amber';
} {
  if (v.status.kind === 'unconnected')
    return { text: 'NOT CONNECTED', tint: 'grey' };
  if (v.status.kind === 'online')
    return v.delivering > 0
      ? { text: 'DOSING', tint: 'green' }
      : { text: 'ONLINE', tint: 'green' };
  return {
    text: `OFFLINE: ${OFFLINE_WORDS[v.status.reason]}${v.status.fault ? ` (${v.status.fault})` : ''}`,
    tint: 'red',
  };
}

const INHIBIT_WORDS: Record<Inhibit, string> = {
  'selector-off': 'Dosing off',
  'sample-flow-lost': 'Dosing stopped: no sample flow',
  'no-readings': 'Waiting for readings',
};

/** The screen's model: everything a page draws, and its key. */
export interface DisplayModel {
  page: Page;
  tab: SettingsTab;
  pressed: string | null;
  selector: Selector;
  status: { text: string; alarms: number; tint: 'green' | 'red' | 'amber' };
  pumps: {
    id: ChannelId;
    name: string;
    device: string;
    badge: { text: string; tint: 'green' | 'red' | 'grey' | 'amber' };
    demand: number;
    asked: string;
    delivering: string;
    hand: number | null;
  }[];
  water: {
    id: ReadingId;
    name: string;
    value: string;
    unit: string;
    band: Band | null;
    /** Where the value sits along its target's band, 0 to 1 (0.5 the set point), for the gauge. */
    along: number | null;
  }[];
  doctor: {
    advice: Advice | null;
    index: number;
    count: number;
    showDose: boolean;
  };
  settings: {
    dynamics: { volumeM3: number; flowM3h: number; turnoverH: number };
    row: number;
    targets: { id: ReadingId; name: string; unit: string; target: Target }[];
  };
  key: string;
}

export function displayModel(
  s: DisplayState,
  inputs: DisplayInputs,
): DisplayModel {
  const r = inputs.readings;
  const alarms = inputs.alarms.length;
  const status = inputs.inhibit
    ? { text: INHIBIT_WORDS[inputs.inhibit], alarms, tint: 'amber' as const }
    : alarms > 0
      ? {
          text: inputs.alarms.map((a) => a.text).join(' · '),
          alarms,
          tint: 'red' as const,
        }
      : {
          text: inputs.selector === 'auto' ? 'AUTO: regulating' : 'HAND',
          alarms,
          tint: 'green' as const,
        };
  const pumps = CHANNEL_IDS.map((id) => {
    const v = inputs.channels[id];
    return {
      id,
      name: CHANNELS[id].name,
      device: CHANNELS[id].device === 'valve' ? 'Valve' : 'Pump',
      badge: channelBadge(v),
      demand: v.demand,
      asked:
        v.status.kind === 'unconnected' ? '—' : formatRate(id, v.demandRate),
      delivering:
        v.status.kind === 'unconnected' ? '—' : formatRate(id, v.delivering),
      hand: inputs.selector === 'hand' ? inputs.hand[id] : null,
    };
  });
  const water = READING_IDS.map((id) => {
    const t = id === 'temperature' ? null : inputs.settings.targets[id];
    const v = r ? r[id] : null;
    let along: number | null = null;
    if (t && v !== null) {
      const half = v < t.set ? t.set - t.low : t.high - t.set;
      along =
        half > 0
          ? Math.min(1, Math.max(0, 0.5 + ((v - t.set) / half) * 0.3))
          : 0.5;
    }
    return {
      id,
      name: READING_LABELS[id].name,
      unit: READING_LABELS[id].unit,
      value: v === null ? '—' : formatReading(id, v),
      band: t && v !== null ? bandOf(v, t) : null,
      along,
    };
  });
  const n = inputs.advice.length;
  const index = n ? Math.min(s.advice, n - 1) : 0;
  const d = inputs.settings.dynamics;
  const model: Omit<DisplayModel, 'key'> = {
    page: s.page,
    tab: s.tab,
    pressed: s.pressed,
    selector: inputs.selector,
    status,
    pumps,
    water,
    doctor: {
      advice: n ? inputs.advice[index] : null,
      index,
      count: n,
      showDose: s.showDose,
    },
    settings: {
      dynamics: {
        volumeM3: d.volumeM3,
        flowM3h: d.flowM3h,
        turnoverH: d.flowM3h > 0 ? d.volumeM3 / d.flowM3h : Infinity,
      },
      row: s.targetRow,
      targets: TARGET_IDS.map((id) => ({
        id,
        name: READING_LABELS[id].name,
        unit: READING_LABELS[id].unit,
        target: inputs.settings.targets[id],
      })),
    },
  };
  return { ...model, key: modelKey(model) };
}

/** The key of what the page on show draws: other pages' changes do not redraw it. */
function modelKey(m: Omit<DisplayModel, 'key'>): string {
  const head = [m.page, m.pressed, m.selector, m.status.text, m.status.tint];
  const body =
    m.page === 'pumps'
      ? m.pumps.map((p) => [
          p.badge.text,
          p.asked,
          p.delivering,
          p.hand,
          Math.round(p.demand * 100),
        ])
      : m.page === 'water'
        ? m.water.map((w) => [w.value, w.band, w.along?.toFixed(2)])
        : m.page === 'doctor'
          ? [
              m.doctor.advice?.id,
              m.doctor.advice?.problem,
              m.doctor.index,
              m.doctor.count,
              m.doctor.showDose,
              m.doctor.advice?.dose?.text,
            ]
          : [m.tab, m.settings.row, m.settings.dynamics, m.settings.targets];
  return JSON.stringify([head, body]);
}
