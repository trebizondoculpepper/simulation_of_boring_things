/**
 * The operator terminal on the displays board, as a small program: four
 * screens on F1 to F4 (MAIN, SETPOINT, EVENTS and KEY TEST), a numeric
 * entry on the SETPOINT screen typed on the keypad and accepted with ↵,
 * and an event list of what was done. F5 to F8 are not configured, and
 * say so. Pure logic: the board draws `terminalLines`.
 */

export const TERMINAL_SCREENS = [
  'MAIN',
  'SETPOINT',
  'EVENTS',
  'KEY TEST',
] as const;
export type TerminalScreen = (typeof TERMINAL_SCREENS)[number];

export interface Terminal {
  screen: TerminalScreen;
  setpoint: number;
  /** What is being typed on the SETPOINT screen. */
  entry: string;
  events: string[];
  lastKey: string;
  /** A message on the bottom line, if any. */
  notice: string;
}

export function createTerminal(): Terminal {
  return {
    screen: 'MAIN',
    setpoint: 1200,
    entry: '',
    events: [],
    lastKey: '',
    notice: '',
  };
}

const log = (t: Terminal, line: string) => {
  t.events.unshift(line);
  t.events.length = Math.min(t.events.length, 6);
};

/** A key pressed: `F1` to `F8`, a digit, `.` or `↵`. */
export function pressTerminalKey(t: Terminal, key: string) {
  t.lastKey = key;
  t.notice = '';
  const f = /^F([1-8])$/.exec(key);
  if (f) {
    const n = Number(f[1]);
    if (n <= TERMINAL_SCREENS.length) {
      t.screen = TERMINAL_SCREENS[n - 1];
      t.entry = '';
    } else t.notice = `${key} NOT CONFIGURED`;
    return;
  }
  if (t.screen !== 'SETPOINT') return;
  if (key === '↵') {
    const value = Number(t.entry);
    if (t.entry && Number.isFinite(value) && value <= 1800) {
      t.setpoint = value;
      log(t, `SETPOINT ${value}`);
    } else if (t.entry) t.notice = 'OUT OF RANGE 0-1800';
    t.entry = '';
    return;
  }
  if (/^[0-9.]$/.test(key) && t.entry.length < 6) t.entry += key;
}

/** What the screen shows: a title and up to six lines. */
export function terminalLines(t: Terminal, speed: number): string[] {
  const lines: string[] = [];
  switch (t.screen) {
    case 'MAIN':
      lines.push(`SPEED    ${Math.round(speed).toString().padStart(5)} RPM`);
      lines.push(`SETPOINT ${String(t.setpoint).padStart(5)} RPM`);
      lines.push('');
      lines.push('F1 MAIN  F2 SETPT');
      lines.push('F3 EVENTS F4 KEYS');
      break;
    case 'SETPOINT':
      lines.push(`NOW   ${String(t.setpoint).padStart(6)} RPM`);
      lines.push(`ENTER ${t.entry.padStart(6, '_')}`);
      lines.push('');
      lines.push('KEY IN, THEN ↵');
      break;
    case 'EVENTS':
      lines.push(...(t.events.length ? t.events : ['NO EVENTS']));
      break;
    case 'KEY TEST':
      lines.push(`LAST KEY: ${t.lastKey || '-'}`);
      break;
  }
  if (t.notice) {
    while (lines.length < 5) lines.push('');
    lines[5] = t.notice;
  }
  return [t.screen, ...lines.slice(0, 6)];
}
