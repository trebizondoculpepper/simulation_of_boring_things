import {
  SETTING_RANGES,
  act,
  sessionReading,
  unacknowledged,
} from './dosing-controller';
import type {
  AlarmCode,
  ControllerAction,
  ControllerSettings,
  ControllerState,
  DoseChannel,
} from './dosing-controller';

/**
 * The face of a Chlorella DC-1 (prompt 105): one of the Lounge's pair of
 * single-channel dosing controllers, after ProMinent's DULCOMETER D1C of
 * the late 1990s (its operating instructions, part 2, BA DM 036 5/97). The
 * pair is one controller model (`dosing-controller.ts`), each unit its
 * channel's face: the chlorine unit doses hypochlorite, the pH unit acid,
 * and the pH unit's limit relay is wired to the chlorine unit's pause
 * input, which is the model's pH lockout.
 *
 * Six membrane keys, as the D1C's: CHANGE (◄►, the next display or menu),
 * ▲ and ▼ (a flashing value up or down), ENTER (↵: start a menu, accept a
 * value, acknowledge an alarm), BACK (↩: back to the reading, a value
 * unsaved) and START/STOP. A four-digit red LED readout shows the reading
 * (MEAS), the output in % (OUT), and the menus: SEt, Lo, Hi, the mode
 * (Auto or HAnd) and CAL; a value being changed flashes. Its LEDs: MEAS,
 * OUT and SET for what is shown, AUTO and MAN, DOSE (lit while its pump is
 * released, flickering with its output), LIM (a limit passed), ALARM (red,
 * flashing until acknowledged) and STOP. On the reading, an alarm's code
 * alternates with the value: `E FL` sample flow, `E dt` dosing time,
 * `E Lo` and `E Hi` the limits, `E PU` its pump, `PAUS` locked out by pH,
 * `StoP` stopped.
 *
 * The chlorine unit's calibration: `CAL0` (the zero, with the sample
 * stopped; BACK skips it) and `dPd` (the slope: ▲ ▼ to the DPD 1 result,
 * ENTER). The pH unit's: `bUF1` and `bUF2`, the electrode in each buffer
 * in turn, ENTER at each; the buffer found shows, then `Good` or an error
 * (`Err0` zero, `ErrS` slope, `Errd` buffers too close, `Errb` no buffer).
 * Pure.
 */

export type Dc1Key = 'change' | 'up' | 'down' | 'enter' | 'back' | 'startstop';
export const DC1_KEYS: readonly Dc1Key[] = [
  'change',
  'up',
  'down',
  'enter',
  'back',
  'startstop',
];

/** What CHANGE steps through, in order. */
export const DC1_MENUS = [
  'meas',
  'out',
  'set',
  'lo',
  'hi',
  'mode',
  'cal',
] as const;
/**
 * With its tuning menus opened (the museum's Hall 3; the owner,
 * 2026-10-28: "let users play with all the controls"): after SEt, the
 * band `XP` and, on the chlorine unit, the integral time `tn` (hours), as
 * the D1C's control parameters.
 */
export const DC1_TUNING_MENUS: Record<
  DoseChannel,
  readonly (Dc1Menu | 'xp' | 'tn')[]
> = {
  hypochlorite: ['meas', 'out', 'set', 'xp', 'tn', 'lo', 'hi', 'mode', 'cal'],
  acid: ['meas', 'out', 'set', 'xp', 'lo', 'hi', 'mode', 'cal'],
};
export type Dc1Menu = (typeof DC1_MENUS)[number] | 'xp' | 'tn';

export interface Dc1Face {
  channel: DoseChannel;
  menu: Dc1Menu;
  /** A value being changed (it flashes), or null. */
  editing: number | null;
  /** A message shown for a while (`Good`, `Err0`, a buffer), until this face time. */
  flash: { text: string; until: number } | null;
  /** The face's own clock, s. */
  time: number;
  /** Its tuning menus open (`DC1_TUNING_MENUS`). */
  tuning?: boolean;
}

export const newDc1Face = (channel: DoseChannel, tuning = false): Dc1Face => ({
  channel,
  ...(tuning ? { tuning } : {}),
  menu: 'meas',
  editing: null,
  flash: null,
  time: 0,
});

/** Which setting each menu edits, by channel. */
const SETTING: Record<
  'set' | 'lo' | 'hi' | 'xp' | 'tn',
  Record<DoseChannel, keyof ControllerSettings>
> = {
  set: { hypochlorite: 'chlorineSet', acid: 'pHSet' },
  lo: { hypochlorite: 'chlorineLow', acid: 'pHLow' },
  hi: { hypochlorite: 'chlorineHigh', acid: 'pHHigh' },
  xp: { hypochlorite: 'chlorineBand', acid: 'pHBand' },
  tn: { hypochlorite: 'chlorineIntegral', acid: 'chlorineIntegral' },
};

const isSetting = (m: Dc1Menu): m is 'set' | 'lo' | 'hi' | 'xp' | 'tn' =>
  m === 'set' || m === 'lo' || m === 'hi' || m === 'xp' || m === 'tn';

/** A setting's value as the unit shows it: the integral time in hours to 0.1. */
const settingText = (m: Dc1Menu, v: number, ch: DoseChannel) =>
  m === 'tn' ? v.toFixed(1) : dc1Number(v, ch);

const reading = (c: ControllerState, ch: DoseChannel) =>
  ch === 'hypochlorite' ? c.measured.free : c.measured.ph;

/** A value in four digits, as the unit shows it: 1.32, 7.31, 45. */
export function dc1Number(v: number, ch: DoseChannel | 'percent'): string {
  if (ch === 'percent') return String(Math.round(v * 100));
  return ch === 'hypochlorite' ? v.toFixed(2) : v.toFixed(2);
}

const FLASH = 1.2;
const flashed = (f: Dc1Face, text: string): Dc1Face => ({
  ...f,
  flash: { text, until: f.time + FLASH },
});

const ERRORS: Partial<Record<string, string>> = {
  zero: 'Err0',
  'zero-high': 'Err0',
  slope: 'ErrS',
  'dpd-low': 'ErrS',
  'buffer-distance': 'Errd',
  'buffer-unknown': 'Errb',
};

/** Whether this unit's channel is the one a session calibrates. */
const calibratingHere = (c: ControllerState, ch: DoseChannel) =>
  c.session !== null &&
  (ch === 'acid' ? c.session.probe === 'ph' : c.session.probe === 'free');

/**
 * A key pressed: the face's new state and the action it sends its
 * controller, if any (applied here, the result given back).
 */
export function pressDc1(
  f: Dc1Face,
  c: ControllerState,
  key: Dc1Key,
): {
  face: Dc1Face;
  controller: ControllerState;
  sent: ControllerAction | null;
} {
  const ch = f.channel;
  const send = (a: ControllerAction, face: Dc1Face = f) => {
    const r = act(c, a);
    return { face, controller: r.state, sent: a, result: r };
  };
  const none = (face: Dc1Face = f) => ({ face, controller: c, sent: null });
  if (key === 'startstop')
    return send({ kind: c.running[ch] ? 'stop' : 'start', channel: ch });
  // Calibrating: its own steps.
  if (f.menu === 'cal' && calibratingHere(c, ch)) {
    const x = c.session!;
    if (key === 'back') {
      if (x.probe === 'free' && x.step === 'zero')
        return send({ kind: 'cal-skip' });
      return send({ kind: 'cal-end' }, { ...f, menu: 'meas', editing: null });
    }
    if (x.probe === 'free' && x.step === 'span') {
      const base = f.editing ?? sessionReading(c)!.value;
      if (key === 'up' || key === 'down')
        return none({
          ...f,
          editing: Math.max(0, base + (key === 'up' ? 0.01 : -0.01)),
        });
      if (key === 'enter') {
        const r = send({ kind: 'cal-span', value: base });
        const text = r.result.refused
          ? (ERRORS[r.result.refused] ?? 'Err')
          : 'Good';
        return {
          ...r,
          face: flashed(
            { ...f, editing: null, menu: r.result.refused ? 'cal' : 'meas' },
            text,
          ),
        };
      }
      return none();
    }
    if (key === 'enter') {
      if (x.probe === 'free') {
        const r = send({ kind: 'cal-zero' });
        return {
          ...r,
          face: flashed(f, r.result.refused ? 'Err0' : 'Good'),
        };
      }
      const r = send({ kind: 'cal-buffer' });
      if (r.result.refused)
        return {
          ...r,
          face: flashed(f, ERRORS[r.result.refused] ?? 'Err'),
        };
      const done = r.controller.session === null;
      return {
        ...r,
        face: flashed(
          { ...f, menu: done ? 'meas' : 'cal' },
          done ? 'Good' : (r.result.found?.buffer ?? 7).toFixed(2),
        ),
      };
    }
    return none();
  }
  // Changing a value.
  if (f.editing !== null) {
    if (key === 'back') return none({ ...f, editing: null });
    if (f.menu === 'mode') {
      if (key === 'up' || key === 'down')
        return none({ ...f, editing: f.editing ? 0 : 1 });
      if (key === 'enter')
        return send(
          { kind: 'mode', channel: ch, mode: f.editing ? 'manual' : 'auto' },
          { ...f, editing: null },
        );
      return none();
    }
    if (f.menu === 'out') {
      if (key === 'up' || key === 'down')
        return none({
          ...f,
          editing: Math.min(
            1,
            Math.max(0, f.editing + (key === 'up' ? 0.05 : -0.05)),
          ),
        });
      if (key === 'enter')
        return send(
          { kind: 'manual', channel: ch, value: f.editing },
          { ...f, editing: null },
        );
      return none();
    }
    if (isSetting(f.menu)) {
      const k = SETTING[f.menu][ch];
      const r = SETTING_RANGES[k];
      if (key === 'up' || key === 'down')
        return none({
          ...f,
          editing: Math.min(
            r.max,
            Math.max(r.min, f.editing + (key === 'up' ? r.step : -r.step)),
          ),
        });
      if (key === 'enter')
        return send(
          { kind: 'set', key: k, value: f.editing },
          { ...f, editing: null },
        );
    }
    return none();
  }
  if (key === 'back') return none({ ...f, menu: 'meas', flash: null });
  if (key === 'change') {
    const menus: readonly Dc1Menu[] = f.tuning
      ? DC1_TUNING_MENUS[ch]
      : DC1_MENUS;
    const i = menus.indexOf(f.menu);
    return none({
      ...f,
      menu: menus[(i + 1) % menus.length],
      flash: null,
    });
  }
  if (key === 'enter') {
    switch (f.menu) {
      case 'meas':
        // ENTER on the reading acknowledges the alarms (the D1C's).
        return unacknowledged(c).length ? send({ kind: 'ack' }) : none();
      case 'out':
        return c.mode[ch] === 'manual'
          ? none({ ...f, editing: c.manual[ch] })
          : none();
      case 'set':
      case 'xp':
      case 'tn':
      case 'lo':
      case 'hi':
        return none({ ...f, editing: c.settings[SETTING[f.menu][ch]] });
      case 'mode':
        return none({ ...f, editing: c.mode[ch] === 'manual' ? 1 : 0 });
      case 'cal':
        if (c.session) return none(flashed(f, 'bUSY'));
        return send(
          ch === 'hypochlorite'
            ? { kind: 'cal-begin', probe: 'free' }
            : { kind: 'cal-begin', probe: 'ph', method: 'buffers' },
        );
    }
  }
  return none();
}

/** The face `dt` seconds on. */
export const tickDc1 = (f: Dc1Face, dt: number): Dc1Face => {
  const time = f.time + dt;
  return {
    ...f,
    time,
    flash: f.flash && f.flash.until > time ? f.flash : null,
  };
};

/** The alarm codes this unit shows, by its channel. */
const CODES: Record<DoseChannel, Partial<Record<AlarmCode, string>>> = {
  hypochlorite: {
    'sample-flow': 'E FL',
    circulation: 'E Ci',
    'dose-limit-hypochlorite': 'E dt',
    'chlorine-low': 'E Lo',
    'chlorine-high': 'E Hi',
    'pump-hypochlorite': 'E PU',
    'tank-hypochlorite': 'E tA',
    'ph-lockout': 'PAUS',
  },
  acid: {
    'sample-flow': 'E FL',
    circulation: 'E Ci',
    'dose-limit-acid': 'E dt',
    'ph-low': 'E Lo',
    'ph-high': 'E Hi',
    'pump-acid': 'E PU',
    'tank-acid': 'E tA',
  },
};

export interface Dc1Lamps {
  meas: boolean;
  out: boolean;
  set: boolean;
  auto: boolean;
  man: boolean;
  dose: number;
  lim: boolean;
  alarm: boolean;
  stop: boolean;
}

export interface Dc1Display {
  text: string;
  lamps: Dc1Lamps;
}

/** What the unit shows now: its readout and its lamps. */
export function dc1Display(f: Dc1Face, c: ControllerState): Dc1Display {
  const ch = f.channel;
  const t = f.time;
  const blink = Math.floor(t * 2) % 2 === 0;
  const alternate = Math.floor(t / 1.5) % 2 === 1;
  const own = CODES[ch];
  const alarms = c.alarms.filter((a) => a.cleared === null && own[a.code]);
  const unacked = c.alarms.some((a) => !a.acked && own[a.code]);
  const limitCodes: AlarmCode[] =
    ch === 'hypochlorite'
      ? ['chlorine-low', 'chlorine-high']
      : ['ph-low', 'ph-high'];
  const lamps: Dc1Lamps = {
    meas: f.menu === 'meas' || f.menu === 'cal',
    out: f.menu === 'out',
    set: isSetting(f.menu),
    auto: c.mode[ch] === 'auto',
    man: c.mode[ch] === 'manual',
    dose: c.release[ch] && c.yout[ch] > 0 ? 0.4 + 0.6 * c.yout[ch] : 0,
    lim: alarms.some((a) => limitCodes.includes(a.code)),
    alarm: unacked ? blink : alarms.some((a) => a.code !== 'ph-lockout'),
    stop: !c.running[ch],
  };
  const show = (text: string) => ({ text, lamps });
  if (f.flash) return show(f.flash.text);
  const value = reading(c, ch);
  const editingShown = (v: string) => (blink ? v : '');
  if (f.menu === 'cal' && calibratingHere(c, ch)) {
    const x = c.session!;
    const r = sessionReading(c)!;
    const code =
      x.probe === 'free'
        ? x.step === 'zero'
          ? 'CAL0'
          : 'dPd'
        : x.probe === 'ph' && x.method === 'buffers' && x.step === 'first'
          ? 'bUF1'
          : 'bUF2';
    const v =
      x.probe === 'free' && x.step === 'span' && f.editing !== null
        ? f.editing
        : r.value;
    return show(alternate ? code : dc1Number(v, ch));
  }
  if (f.editing !== null) {
    if (f.menu === 'mode')
      return show(editingShown(f.editing ? 'HAnd' : 'Auto'));
    if (f.menu === 'out')
      return show(editingShown(`H ${dc1Number(f.editing, 'percent')}`));
    return show(editingShown(settingText(f.menu, f.editing, ch)));
  }
  switch (f.menu) {
    case 'meas': {
      const codes = [
        ...(c.running[ch] ? [] : ['StoP']),
        ...alarms.map((a) => own[a.code]!),
      ];
      if (codes.length && alternate) {
        const k = Math.floor(t / 3) % codes.length;
        return show(codes[k]);
      }
      return show(dc1Number(value, ch));
    }
    case 'out':
      return show(
        `${c.mode[ch] === 'manual' ? 'H' : ' '}${dc1Number(c.yout[ch], 'percent').padStart(3, ' ')}`,
      );
    case 'set':
      return show(
        alternate ? 'SEt' : dc1Number(c.settings[SETTING.set[ch]], ch),
      );
    case 'xp':
      return show(alternate ? 'XP' : dc1Number(c.settings[SETTING.xp[ch]], ch));
    case 'tn':
      return show(
        alternate ? 'tn' : settingText('tn', c.settings.chlorineIntegral, ch),
      );
    case 'lo':
      return show(alternate ? 'Lo' : dc1Number(c.settings[SETTING.lo[ch]], ch));
    case 'hi':
      return show(alternate ? 'Hi' : dc1Number(c.settings[SETTING.hi[ch]], ch));
    case 'mode':
      return show(c.mode[ch] === 'manual' ? 'HAnd' : 'Auto');
    case 'cal':
      return show(c.session ? 'bUSY' : 'CAL');
  }
}
