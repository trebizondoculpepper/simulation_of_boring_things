/**
 * Chlorella Chemicals' OT-216 operator terminal, as the chemical distribution's
 * two terminals run it (prompt 091; the owner, 2026-10-27): a 16 × 2
 * character LCD and a membrane keypad (F1 MON, F2 SET, F3 CMD, ESC,
 * ENTER and four cursor keys in an inverted T), RUN, CALL and ALARM LEDs
 * and a LOCAL ACCESS key switch. It holds no plant logic: it shows what
 * its control box sends (`TerminalFeed`) and sends back what is set and
 * commanded (`TerminalCommand`). Pure: a state machine, its keys, its
 * clock and what its screen and LEDs show.
 *
 * Items, stepped through by ◀ ▶: the line's summary, its store, and its
 * day tanks. MON is read only and, at home, shows what is active; SET
 * sets a tank's low and high levels in litres; CMD fills a tank now,
 * stops (inhibits) it or resumes it, after a confirmation.
 */

export type TerminalKey =
  | 'F1'
  | 'F2'
  | 'F3'
  | 'ESC'
  | 'ENTER'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT';

export type TerminalMode = 'MON' | 'SET' | 'CMD';

export const OT216 = {
  width: 16,
  /** Seconds of its power-up self test. */
  selfTest: 3,
  /** Seconds without a key before it goes home and dims. */
  timeout: 60,
  /** Seconds a notice (LIMIT, STORED) stays. */
  notice: 1,
  /** A held cursor key: its first repeat, its rate, and its faster rate after 2 s. */
  repeatDelay: 0.5,
  repeatRate: 5,
  fastAfter: 2,
  fastRate: 20,
} as const;

/** A day tank as the box sends it. */
export interface FeedTank {
  /** Its name on the screen: `PL1 LOUNGE`. */
  name: string;
  litres: number;
  capacity: number;
  lowL: number;
  highL: number;
  state: 'OK' | 'CALL' | 'FILL' | 'INHIB';
  /** Seconds since its last fill ended, if it has had one. */
  lastFilled: number | null;
  outletOpen: boolean;
  /** What its levels may be set to, litres, and the step they change by. */
  limits: {
    low: { min: number; max: number };
    high: { min: number; max: number };
  };
  step: number;
}

/** What the box sends a terminal of its line. */
export interface TerminalFeed {
  /** The line's short name: `HYPO`, `ACID`. */
  line: string;
  store: number;
  storeLow: boolean;
  pump: 'RUN' | 'STOP' | 'TRIP';
  tanks: readonly FeedTank[];
  /** The tank being filled, if any. */
  filling: number | null;
  /** The first tank calling and waiting its turn, if any. */
  next: number | null;
  alarms: readonly { code: string; text: string }[];
}

/** The terminal's supply and its link: power from the box, and whether the box answers. */
export interface TerminalLink {
  powered: boolean;
  comms: boolean;
}

export type TerminalCommand =
  | { kind: 'set-low' | 'set-high'; tank: number; litres: number }
  | { kind: 'fill-now' | 'stop' | 'resume'; tank: number };

export interface Ot216 {
  mode: TerminalMode;
  /** MON at home: following what is active, not an item picked. */
  home: boolean;
  /** The item shown: 0 the summary, 1 the store, 2 on the tanks. */
  item: number;
  /** Inside the item's menu, on line `line`. */
  inside: boolean;
  line: number;
  /** A figure being edited, litres. */
  edit: number | null;
  /** CMD asking CONFIRM? */
  confirm: boolean;
  /** A word on the bottom line for a moment, and how long it has left. */
  notice: string;
  noticeLeft: number;
  /** Seconds since the last key. */
  idle: number;
  /** Seconds of self test left. */
  selfTest: number;
  /** Whether it had power last tick. */
  wasPowered: boolean;
  /** The alarms acknowledged, by code, while they last. */
  acked: readonly string[];
  /** Beeps given: a counter a view sounds on. */
  beeps: number;
}

export function newOt216(powered = true): Ot216 {
  return {
    mode: 'MON',
    home: true,
    item: 0,
    inside: false,
    line: 0,
    edit: null,
    confirm: false,
    notice: '',
    noticeLeft: 0,
    idle: 0,
    selfTest: 0,
    wasPowered: powered,
    acked: [],
    beeps: 0,
  };
}

/** The items: the summary, the store, then the tanks. */
export const itemCount = (feed: TerminalFeed) => 2 + feed.tanks.length;
const tankOf = (item: number) => (item >= 2 ? item - 2 : null);

/** The item MON's home shows: the tank being filled, or the summary. */
export const homeItem = (feed: TerminalFeed) =>
  feed.filling === null ? 0 : feed.filling + 2;

/** The item on screen now. */
export const shownItem = (t: Ot216, feed: TerminalFeed) =>
  t.mode === 'MON' && t.home ? homeItem(feed) : t.item;

const SET_LINES = ['LOW LEVEL', 'HIGH LEVEL'] as const;
const CMD_LINES = ['FILL NOW', 'STOP', 'RESUME'] as const;
const MON_LINES = 4;

const wrap = (n: number, count: number) => ((n % count) + count) % count;

/** Whether it takes keys now: powered, its self test done, the box answering. */
export const working = (t: Ot216, link: TerminalLink) =>
  link.powered && link.comms && t.selfTest <= 0;

/** The unacknowledged alarms. */
export const unacked = (t: Ot216, feed: TerminalFeed) =>
  feed.alarms.filter((a) => !t.acked.includes(a.code));

/**
 * A key pressed, with what the box has sent and whether the access key is
 * at ON: the terminal's next state, and what it sends the box, if anything.
 */
export function pressOt216(
  t: Ot216,
  key: TerminalKey,
  feed: TerminalFeed,
  access: boolean,
  link: TerminalLink,
): { terminal: Ot216; command?: TerminalCommand } {
  if (!working(t, link)) return { terminal: t };
  const s: Ot216 = { ...t, idle: 0, notice: '', noticeLeft: 0 };
  const count = itemCount(feed);
  const say = (notice: string, next: Ot216 = s) => ({
    terminal: { ...next, notice, noticeLeft: OT216.notice },
  });
  // The mode keys, from anywhere, abandoning any edit.
  if (key === 'F1' || key === 'F2' || key === 'F3') {
    const mode: TerminalMode =
      key === 'F1' ? 'MON' : key === 'F2' ? 'SET' : 'CMD';
    return {
      terminal: {
        ...s,
        mode,
        home: mode === 'MON',
        item: shownItem(t, feed),
        inside: false,
        line: 0,
        edit: null,
        confirm: false,
      },
    };
  }
  const tank = tankOf(shownItem(s, feed));
  const locked = s.mode !== 'MON' && !access;
  // ◀ ▶ step through the items whenever not inside one.
  if (key === 'LEFT' || key === 'RIGHT') {
    if (s.inside) return { terminal: s };
    const from = shownItem(s, feed);
    return {
      terminal: {
        ...s,
        home: false,
        item: wrap(from + (key === 'RIGHT' ? 1 : -1), count),
      },
    };
  }
  if (s.mode === 'MON') {
    switch (key) {
      case 'ENTER': {
        // Acknowledge first; then into a tank's detail.
        const fresh = unacked(s, feed);
        if (fresh.length)
          return {
            terminal: {
              ...s,
              acked: [...s.acked, ...fresh.map((a) => a.code)],
            },
          };
        if (s.inside || tank === null) return { terminal: s };
        return {
          terminal: {
            ...s,
            home: false,
            item: shownItem(s, feed),
            inside: true,
            line: 0,
          },
        };
      }
      case 'ESC':
        return { terminal: s.inside ? { ...s, inside: false } : s };
      case 'UP':
      case 'DOWN':
        return s.inside
          ? {
              terminal: {
                ...s,
                line: wrap(s.line + (key === 'DOWN' ? 1 : -1), MON_LINES),
              },
            }
          : { terminal: s };
    }
  }
  if (locked) return { terminal: s };
  const fed = tank === null ? null : feed.tanks[tank];
  if (s.mode === 'SET') {
    if (!fed || tank === null) return { terminal: s };
    const which = s.line === 0 ? 'low' : 'high';
    const limit = fed.limits[which];
    if (s.edit !== null) {
      switch (key) {
        case 'UP':
        case 'DOWN': {
          const want = s.edit + (key === 'UP' ? fed.step : -fed.step);
          const value = Math.max(limit.min, Math.min(limit.max, want));
          if (value === s.edit) return say('LIMIT');
          return { terminal: { ...s, edit: value } };
        }
        case 'ENTER':
          return {
            terminal: {
              ...s,
              edit: null,
              beeps: s.beeps + 1,
              notice: 'STORED',
              noticeLeft: OT216.notice,
            },
            command: {
              kind: which === 'low' ? 'set-low' : 'set-high',
              tank,
              litres: s.edit,
            },
          };
        case 'ESC':
          return { terminal: { ...s, edit: null } };
      }
      return { terminal: s };
    }
    if (!s.inside)
      return key === 'ENTER'
        ? { terminal: { ...s, inside: true, line: 0 } }
        : { terminal: s };
    switch (key) {
      case 'UP':
      case 'DOWN':
        return {
          terminal: {
            ...s,
            line: wrap(s.line + (key === 'DOWN' ? 1 : -1), SET_LINES.length),
          },
        };
      case 'ENTER':
        return {
          terminal: { ...s, edit: which === 'low' ? fed.lowL : fed.highL },
        };
      case 'ESC':
        return { terminal: { ...s, inside: false } };
    }
    return { terminal: s };
  }
  // CMD.
  if (!fed || tank === null) return { terminal: s };
  if (s.confirm) {
    if (key === 'ENTER') {
      const kind = (['fill-now', 'stop', 'resume'] as const)[s.line];
      return {
        terminal: {
          ...s,
          confirm: false,
          beeps: s.beeps + 1,
          notice: 'DONE',
          noticeLeft: OT216.notice,
        },
        command: { kind, tank },
      };
    }
    if (key === 'ESC') return { terminal: { ...s, confirm: false } };
    return { terminal: s };
  }
  if (!s.inside)
    return key === 'ENTER'
      ? { terminal: { ...s, inside: true, line: 0 } }
      : { terminal: s };
  switch (key) {
    case 'UP':
    case 'DOWN':
      return {
        terminal: {
          ...s,
          line: wrap(s.line + (key === 'DOWN' ? 1 : -1), CMD_LINES.length),
        },
      };
    case 'ENTER':
      return { terminal: { ...s, confirm: true } };
    case 'ESC':
      return { terminal: { ...s, inside: false } };
  }
  return { terminal: s };
}

/** The terminal `dt` seconds on: its self test, its notices, its timeout, its acknowledgements. */
export function tickOt216(
  t: Ot216,
  dt: number,
  feed: TerminalFeed,
  link: TerminalLink,
): Ot216 {
  if (!link.powered) return t.wasPowered ? { ...newOt216(false) } : t;
  let s = t;
  // Power back: everything forgotten, the self test first.
  if (!s.wasPowered) s = { ...newOt216(true), selfTest: OT216.selfTest };
  const selfTest = Math.max(0, s.selfTest - dt);
  const noticeLeft = Math.max(0, s.noticeLeft - dt);
  const idle = s.idle + dt;
  // Acknowledgements last only while their alarms do.
  const codes = feed.alarms.map((a) => a.code);
  const acked = s.acked.filter((c) => codes.includes(c));
  s = {
    ...s,
    selfTest,
    noticeLeft,
    notice: noticeLeft > 0 ? s.notice : '',
    idle,
    acked: acked.length === s.acked.length ? s.acked : acked,
  };
  if (idle >= OT216.timeout && t.idle < OT216.timeout)
    s = {
      ...s,
      mode: 'MON',
      home: true,
      inside: false,
      line: 0,
      edit: null,
      confirm: false,
    };
  return s;
}

/** Whether its backlight is dimmed: no key for a minute. */
export const dimmed = (t: Ot216) => t.idle >= OT216.timeout;

/**
 * How many repeats a cursor key held `from` to `to` seconds gives (the
 * owner: held, they repeat, faster after 2 s): the first after half a
 * second, then five a second, then twenty.
 */
export function heldRepeats(from: number, to: number): number {
  const count = (h: number) => {
    if (h < OT216.repeatDelay) return 0;
    const slow = Math.min(h, OT216.fastAfter) - OT216.repeatDelay;
    const fast = Math.max(0, h - OT216.fastAfter);
    return Math.floor(slow * OT216.repeatRate + fast * OT216.fastRate) + 1;
  };
  return Math.max(0, count(to) - count(from));
}

const pad = (text: string, width = OT216.width) =>
  text.length >= width
    ? text.slice(0, width)
    : text + ' '.repeat(width - text.length);

/** Text on the left, text on the right, in `width` characters. */
const ends = (left: string, right: string, width = OT216.width) =>
  pad(
    left + ' '.repeat(Math.max(1, width - left.length - right.length)) + right,
    width,
  );

const litres = (l: number) => `${Math.round(l)}L`;

function ago(seconds: number | null) {
  if (seconds === null) return '--';
  const m = Math.floor(seconds / 60);
  return m < 60 ? `${m}MIN AGO` : `${Math.floor(m / 60)}H AGO`;
}

/** An item's name on the top line, its mode in the last three characters. */
function title(feed: TerminalFeed, item: number, mode: TerminalMode) {
  const name =
    item === 0
      ? `${feed.line} LINE`
      : item === 1
        ? `STORE ${feed.line}`
        : (feed.tanks[item - 2]?.name ?? '');
  return ends(name, mode);
}

function summary(feed: TerminalFeed) {
  if (feed.next !== null) return ends(`NEXT PL${feed.next + 1}`, 'CALL');
  return ends(`STORE ${litres(feed.store)}`, feed.storeLow ? 'LOW' : 'OK');
}

export interface Ot216Screen {
  lines: [string, string];
  /** The blinking block cursor's cell, if it is shown now. */
  cursor: { row: number; col: number } | null;
  /** Each LED's brightness, 0 or 1. */
  leds: { run: boolean; call: boolean; alarm: boolean };
  /** The backlight: 0 off, 0.35 dimmed, 1 full. */
  backlight: number;
}

/** What it shows at `time` seconds (for its blinking). */
export function ot216Screen(
  t: Ot216,
  feed: TerminalFeed,
  access: boolean,
  link: TerminalLink,
  time: number,
): Ot216Screen {
  const blank: Ot216Screen = {
    lines: [pad(''), pad('')],
    cursor: null,
    leds: { run: false, call: false, alarm: false },
    backlight: 0,
  };
  if (!link.powered) return blank;
  const flash = time % 1 < 0.5;
  const backlight = dimmed(t) ? 0.35 : 1;
  if (t.selfTest > 0)
    return {
      ...blank,
      lines: [pad('CHLORELLA OT-216'), pad('V2.04 SELF TEST')],
      leds: { run: flash, call: false, alarm: false },
      backlight,
    };
  if (!link.comms)
    return {
      ...blank,
      lines: [pad(`OT-216 ${feed.line}`), pad('NO COMMS')],
      backlight,
    };
  const item = shownItem(t, feed);
  const tank = tankOf(item);
  const fed = tank === null ? null : feed.tanks[tank];
  const top = title(feed, item, t.mode);
  let bottom = '';
  let cursor: Ot216Screen['cursor'] = null;
  const fresh = unacked(t, feed);
  if (t.mode === 'MON') {
    if (t.home && feed.filling !== null && fed)
      bottom = `FILL ${litres(fed.litres)}/${litres(fed.capacity)}`;
    else if (item === 0) bottom = summary(feed);
    else if (item === 1) bottom = ends(litres(feed.store), `PUMP ${feed.pump}`);
    else if (fed && t.inside) {
      const detail = [
        ends('>LOW LEVEL', litres(fed.lowL)),
        ends('>HIGH LEVEL', litres(fed.highL)),
        ends('>FILLED', ago(fed.lastFilled)),
        ends('>OUTLET', fed.outletOpen ? 'OPEN' : 'SHUT'),
      ];
      bottom = detail[t.line];
    } else if (fed)
      bottom = ends(`${litres(fed.litres)}/${litres(fed.capacity)}`, fed.state);
    // The unacknowledged alarms break into the bottom line in turn.
    if (fresh.length && !t.notice) {
      const slot = Math.floor(time / 1.5) % (fresh.length + 1);
      if (slot > 0) bottom = `ALM ${fresh[slot - 1].text}`;
    }
  } else if (!access) bottom = 'ACCESS LOCKED';
  else if (!fed) bottom = t.mode === 'SET' ? 'NO SETTINGS' : 'NO COMMANDS';
  else if (t.mode === 'SET') {
    if (!t.inside) bottom = `LO ${litres(fed.lowL)} HI ${litres(fed.highL)}`;
    else {
      const name = SET_LINES[t.line];
      const value = t.edit ?? (t.line === 0 ? fed.lowL : fed.highL);
      bottom = ends(`${t.edit === null ? '>' : ' '}${name}`, litres(value));
      if (t.edit !== null && flash) cursor = { row: 1, col: OT216.width - 2 };
    }
  } else if (t.confirm) bottom = 'CONFIRM? ENT/ESC';
  else if (!t.inside) bottom = ends('STATE', fed.state);
  else bottom = `>${CMD_LINES[t.line]}`;
  if (t.notice) bottom = t.notice;
  return {
    lines: [pad(top), pad(bottom)],
    cursor,
    leds: {
      run: true,
      call: feed.tanks.some((k) => k.state === 'CALL' || k.state === 'FILL'),
      alarm: fresh.length ? flash : feed.alarms.length > 0,
    },
    backlight,
  };
}
