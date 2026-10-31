/**
 * The stop screen (mission 114, `doc/plans/114/crash-modes.md`): the Dr
 * Aqualis Trio's embedded operating system, Fenestra Prospect Embedded (an
 * invented parody of the period's Vista-like systems), crashing to its blue
 * screen. This works out the screen's text and what it shows as time goes
 * on; the view (`views/stop-screen.ts`) draws it, white monospace on royal
 * blue, 80 columns by 30 rows.
 *
 * Each crash is seeded, so a given crash replays the same: its STOP code
 * and parameters, the faulting driver and its addresses, a little variety
 * in the advice, then the crash dump's lines appearing one by one and its
 * percentage counting up in uneven jumps. Some crashes finish the dump and
 * ask to be rebooted (`moment.reboot`, for the host to start the boot
 * sequence); some hang for good, at the disk, part way through the dump,
 * or after it, until the cabinet is power-cycled.
 *
 * Only the dump moves, and only every `STEP_MIN`–`STEP_MAX` seconds, so a
 * 640 × 480 screen redrawn on its `key` uploads under the component
 * bench's budget. Pure: no DOM.
 */

/** The parody operating system, its maker and its version. */
export const STOP_OS = {
  name: 'Prospect',
  maker: 'Fenestra',
  full: 'Fenestra Prospect Embedded',
  version: '6.0.6002',
} as const;

/** The screen's text grid, as the period's text mode had it. */
export const STOP_COLUMNS = 80;
export const STOP_ROWS = 30;

/** The dump's steps come this many seconds apart, at least and at most. */
export const STEP_MIN = 1.3;
export const STEP_MAX = 2.6;

/** A STOP code: its name and number. */
export interface StopCode {
  name: string;
  code: number;
}

/**
 * The STOP codes it may stop on: the period's own, the pool's puns among
 * them, and two of its own.
 */
export const STOP_CODES: readonly StopCode[] = [
  { name: 'PAGE_FAULT_IN_NONPAGED_POOL', code: 0x50 },
  { name: 'DRIVER_IRQL_NOT_LESS_OR_EQUAL', code: 0xd1 },
  { name: 'KMODE_EXCEPTION_NOT_HANDLED', code: 0x1e },
  { name: 'SYSTEM_SERVICE_EXCEPTION', code: 0x3b },
  { name: 'UNEXPECTED_KERNEL_MODE_TRAP', code: 0x7f },
  { name: 'DRIVER_POWER_STATE_FAILURE', code: 0x9f },
  { name: 'BAD_POOL_HEADER', code: 0x19 },
  { name: 'BAD_POOL_CALLER', code: 0xc2 },
  { name: 'DOSE_IRQL_NOT_LESS_OR_EQUAL', code: 0xd05e },
  { name: 'ANIMATED_ASSISTANT_TIMEOUT', code: 0xaa },
];

/** The drivers that may be to blame. */
export const STOP_DRIVERS: readonly string[] = [
  'AQDOSE.SYS',
  'CLRDOSE_USB.SYS',
  'DRAQUALIS_ANIM.DLL',
  'TRIOTOUCH.SYS',
  'PHPROBE.SYS',
  'ORPCELL.SYS',
  'AQSERIAL.SYS',
  'PROSGLASS.DLL',
];

/** How a crash ends: rebooting after its dump, or hanging (and where). */
export type StopOutcome =
  | { kind: 'reboot'; after: number }
  | { kind: 'hang'; at: 'disk' | 'dump' | 'complete' };

/** One step of the dump: from `at` seconds, `lines` dump lines and its percentage. */
export interface DumpStep {
  at: number;
  /** How many of `DUMP_LINES` (and the completion's) show. */
  lines: number;
  /** The percentage shown, or null before the counting begins. */
  percent: number | null;
}

/** One crash's stop screen, all of it worked out from its seed. */
export interface StopScreen {
  seed: number;
  stop: StopCode;
  driver: string;
  /** Its four parameters, as the screen prints them. */
  params: readonly string[];
  /** The text above the dump's lines, one entry a row. */
  body: readonly string[];
  /** The dump's steps, in time order; the last holds for ever. */
  steps: readonly DumpStep[];
  outcome: StopOutcome;
  /** When it reboots, if it does, s after the crash. */
  rebootAt: number | null;
}

/** What it shows at a moment. */
export interface StopMoment {
  /** Every row of text, top to bottom. */
  lines: readonly string[];
  percent: number | null;
  phase: 'collecting' | 'dumping' | 'complete' | 'hung';
  /** Time to start the boot sequence. */
  reboot: boolean;
  /** Changes only when what it shows changes. */
  key: string;
}

/** The dump's lines, in order, then the completion's. */
export const DUMP_LINES = [
  'Collecting data for crash dump ...',
  'Initializing disk for crash dump ...',
  'Beginning dump of physical memory.',
  'Dumping physical memory to disk:',
] as const;
export const COMPLETE_LINES = [
  'Physical memory dump complete.',
  'Contact your system administrator or technical support group for further',
  'assistance.',
] as const;

/** A small seeded uniform source (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (n: number, digits = 8) =>
  (n >>> 0).toString(16).toUpperCase().padStart(digits, '0');

/**
 * A crash's stop screen from its seed. `outcome` forces how it ends
 * (a scenario's, or dev58's CRASH board's), else the seed chooses: most
 * reboot after the dump.
 */
export function stopScreen(
  seed: number,
  { outcome }: { outcome?: StopOutcome['kind'] } = {},
): StopScreen {
  const random = seeded(seed * 2654435761 + 114);
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(random() * list.length)];
  const stop = pick(STOP_CODES);
  const driver = pick(STOP_DRIVERS);
  // Kernel addresses of the period: a driver loaded high, page aligned.
  const base = 0xf8000000 + Math.floor(random() * 0x7000) * 0x1000;
  const address = base + Math.floor(random() * 0xc000);
  const stamp = 0x44000000 + Math.floor(random() * 0x04000000);
  const params = [
    hex(Math.floor(random() * 0x100000000)),
    hex(Math.floor(random() * 3)),
    hex(address),
    hex(random() < 0.5 ? 0 : Math.floor(random() * 0x100)),
  ];
  const advice = pick([
    [
      'Check to make sure any new hardware or software is properly installed.',
      'If this is a new installation, ask your hardware or software manufacturer',
      `for any ${STOP_OS.name} updates you might need.`,
    ],
    [
      'Check to make sure any new probes, pumps or software are properly',
      'installed. If this is a new installation, ask your dosing equipment',
      `supplier for any ${STOP_OS.name} updates you might need.`,
    ],
  ]);
  const further = pick([
    [
      'If problems continue, disable or remove any newly installed hardware',
      'or software. Disable BIOS memory options such as caching or shadowing.',
    ],
    [
      'If problems continue, disable or remove any newly installed hardware',
      'or software. Isolate the cabinet, then restore its power to restart.',
    ],
  ]);
  const body = [
    `A problem has been detected and ${STOP_OS.name} has been shut down to prevent damage`,
    'to your computer.',
    '',
    `The problem seems to be caused by the following file: ${driver}`,
    '',
    stop.name,
    '',
    "If this is the first time you've seen this Stop error screen, restart your",
    'computer. If this screen appears again, follow these steps:',
    '',
    ...advice,
    '',
    ...further,
    '',
    'Technical information:',
    '',
    `*** STOP: 0x${hex(stop.code)} (0x${params.join(',0x')})`,
    '',
    `***  ${driver} - Address ${hex(address)} base at ${hex(base)}, DateStamp ${hex(stamp).toLowerCase()}`,
    '',
  ];
  const kind = outcome ?? (random() < 0.6 ? 'reboot' : 'hang');
  const hangAt = pick(['disk', 'dump', 'dump', 'complete'] as const);
  const result: StopOutcome =
    kind === 'reboot'
      ? { kind, after: 4 + random() * 6 }
      : { kind, at: hangAt };
  // The dump: its lines one by one, then its percentage in uneven jumps.
  const gap = () => STEP_MIN + random() * (STEP_MAX - STEP_MIN);
  const steps: DumpStep[] = [{ at: 0, lines: 1, percent: null }];
  let at = 0;
  const step = (lines: number, percent: number | null) => {
    at += gap();
    steps.push({ at, lines, percent });
  };
  step(2, null);
  const stall =
    result.kind === 'hang' && result.at === 'dump'
      ? 5 + Math.floor(random() * 90)
      : 100;
  if (!(result.kind === 'hang' && result.at === 'disk')) {
    step(3, null);
    step(4, 0);
    let percent = 0;
    while (percent < stall) {
      percent = Math.min(stall, percent + 1 + Math.floor(random() * 9));
      step(4, percent);
    }
    if (stall === 100) step(4 + COMPLETE_LINES.length, 100);
  }
  return {
    seed,
    stop,
    driver,
    params,
    body,
    steps,
    outcome: result,
    rebootAt: result.kind === 'reboot' ? at + result.after : null,
  };
}

/** The dump's step showing at `t`: the last begun. */
function stepAt(screen: StopScreen, t: number) {
  const { steps } = screen;
  let lo = 0;
  let hi = steps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (steps[mid].at <= t) lo = mid;
    else hi = mid - 1;
  }
  return steps[lo];
}

/** The dump's percentage as the screen prints it, right-aligned in three. */
export const percentText = (percent: number) =>
  String(Math.round(percent)).padStart(3, ' ');

/** What the stop screen shows `t` seconds after the crash. */
export function stopMoment(screen: StopScreen, t: number): StopMoment {
  const step = stepAt(screen, Math.max(0, t));
  const dump = [...DUMP_LINES, ...COMPLETE_LINES]
    .slice(0, step.lines)
    .map((line, i) =>
      i === 3 && step.percent !== null
        ? `${line} ${percentText(step.percent)}`
        : line,
    );
  const last = step === screen.steps[screen.steps.length - 1];
  const reboot = screen.rebootAt !== null && t >= screen.rebootAt;
  const phase = !last
    ? step.percent === null
      ? 'collecting'
      : 'dumping'
    : screen.outcome.kind === 'hang' && screen.outcome.at !== 'complete'
      ? 'hung'
      : 'complete';
  return {
    lines: [...screen.body, ...dump],
    percent: step.percent,
    phase,
    reboot,
    key: `${screen.seed}|${step.lines}|${step.percent ?? '-'}|${reboot ? 1 : 0}`,
  };
}

/**
 * Just the key of what it shows at `t`: cheap, for a host deciding each
 * frame whether to redraw.
 */
export function stopKey(screen: StopScreen, t: number) {
  const step = stepAt(screen, Math.max(0, t));
  const reboot = screen.rebootAt !== null && t >= screen.rebootAt;
  return `${screen.seed}|${step.lines}|${step.percent ?? '-'}|${reboot ? 1 : 0}`;
}
