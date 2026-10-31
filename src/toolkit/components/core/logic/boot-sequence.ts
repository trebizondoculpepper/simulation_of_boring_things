/**
 * Boot sequences (the owner, 2026-10-31): what a computer's screen shows
 * from its power coming on until its application runs, for each kind of
 * operating system in the game. Power-down effects are not wanted yet (a
 * switched-off display just goes black); boot-ups are, for the game's
 * visibility, and funny ones.
 *
 * Each family's script is timed data: steps with their durations, the text
 * lines that appear or scroll on them and when, and at most one small "live"
 * element at a time (a memory count, a cursor, a twirling baton, a progress
 * marquee, a spinner, a progress bar). `bootFrame(script, t)` says what
 * shows at time t, with a `pictureKey` that changes only when the still
 * picture does and a `liveKey` for the live element, so a host redraws (and
 * uploads) the big picture rarely and the live element's small rectangle at
 * no more than 10 Hz (`views/boot-screens.ts` draws both).
 *
 * The families:
 * - `gui`: a Windows-like embedded PC of about 2006: the BIOS's power-on
 *   self-test, its PCI listing, the OS's logo and its marquee, the glossy
 *   Welcome and its spinner, the permission dialog that presses itself, and
 *   the application's splash. About 35 to 45 s: the period was slow.
 * - `unix`: a BSD-flavoured controller: its boot loader and twirling baton,
 *   the kernel probing its devices, the rc scripts starting services with
 *   their `[ OK ]`s, and a login prompt. About 20 s.
 * - `dos`: a 1990s PC: a brief POST, the DOS's start, its CONFIG.SYS and
 *   AUTOEXEC.BAT (and a typo in it), the plant program. About 12 s.
 * - `firmware`: a microcontroller's few lines: its memory and devices
 *   checked, then RUN. About 3 s.
 *
 * Every name is invented (`BOOT_NAMES`), gently parodic in the period's
 * spirit; no real vendor's trademark or artwork is used. A seed gives each
 * machine its own small differences (its timings, serial numbers, address,
 * and which of the period's little embarrassments it suffers), the same
 * every time for the same seed. Pure: no DOM.
 */

// ---- The names -------------------------------------------------------------------------

/** Every invented name the boots show, in one place, so they are easily changed. */
export const BOOT_NAMES = {
  /** The BIOS's maker and its product, in the 1990s' and 2000s' manner. */
  bios: {
    maker: 'Kestrel Software, Inc.',
    product: 'Kestrel Modular BIOS',
    /** The power-saving scheme its logo belongs to. */
    ally: 'An Energy Thrift Ally',
    board: 'Brindle BI-945E fanless embedded board',
    boardId: 'BI945E',
    cpu: 'Corvid M',
  },
  /** The Windows-like OS of the gui family. */
  gui: {
    maker: 'Mullion Software Corporation',
    os: 'Fenestra',
    edition: 'Prospect',
    tagline: 'Professional Embedded Edition',
    /** Its permission dialog's title. */
    consent: 'Permission Steward',
  },
  /** The BSD-flavoured Unix of the unix family. */
  unix: {
    os: 'FrugalBSD',
    release: '5.4-RELEASE',
    project: 'The FrugalBSD Project',
    regents: 'The Regents of the University of Coldwater',
    loader: 'BRX loader',
    builder: 'builder@build.frugalbsd.example',
  },
  /** The DOS of the dos family. */
  dos: { os: 'Harbour DOS', version: '6.20', maker: 'Harbour Software' },
  /** The microcontroller's boot monitor. */
  firmware: { monitor: 'KiloMon', version: '1.3', maker: 'Ferrite Micro' },
} as const;

// ---- The data's shapes -----------------------------------------------------------------

export type BootFamily = 'gui' | 'unix' | 'dos' | 'firmware';
export const BOOT_FAMILIES: readonly BootFamily[] = [
  'gui',
  'unix',
  'dos',
  'firmware',
];

/** How a line of text is shown. */
export type Tone = 'normal' | 'bright' | 'dim' | 'ok' | 'fail' | 'warn';

/** A result appended to a line later, rc-style, at the right: `[  OK  ]`. */
export type ResultKind = 'ok' | 'fail' | 'warn';

export interface ScriptLine {
  /** Seconds into its step when it appears. */
  at: number;
  text: string;
  /** Its row and column on a page (a scrolling console appends instead). */
  row?: number;
  col?: number;
  tone?: Tone;
  /** A result appended at the right `after` seconds later. */
  result?: { after: number; kind: ResultKind };
}

/** A rectangle in fractions of the screen (0 to 1 across and down). */
export interface FracRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The small live element a step may have, from `at` to `until` seconds into it (the step's end if left out). */
export type LiveSpec =
  | {
      kind: 'counter';
      at: number;
      until: number;
      from: number;
      to: number;
      /** Its granule: memory counts in kilobyte steps of this. */
      step: number;
      row: number;
      col: number;
      width: number;
      /** The text after the number while counting, and the line left once done. */
      suffix: string;
      done: string;
      /** Counting down (a countdown): the number's text is then padded less. */
      tone?: Tone;
    }
  /** A blinking block cursor at the end of the last line, or at a row and column. */
  | { kind: 'cursor'; at: number; until?: number; row?: number; col?: number }
  /** The boot loader's twirling baton, at the end of the last line. */
  | { kind: 'twirl'; at: number; until: number }
  /** The OS logo's progress marquee: a few blocks sliding through a channel. */
  | { kind: 'marquee'; at: number; until?: number; rect: FracRect }
  /** The Welcome's spinner: a ring of dots, one bright, going round. */
  | { kind: 'spinner'; at: number; until?: number; rect: FracRect }
  /** A determinate progress bar and the status message under it. */
  | {
      kind: 'bar';
      at: number;
      until?: number;
      rect: FracRect;
      messages: readonly { at: number; text: string }[];
    };

export type LiveKind = LiveSpec['kind'];

/** What a step looks like. */
export type StepKind =
  | 'black'
  | 'text'
  | 'logo'
  | 'welcome'
  | 'consent'
  | 'splash';

export interface BootStep {
  id: string;
  kind: StepKind;
  /** Seconds it lasts (the last step's is how long until the boot is done). */
  duration: number;
  /** A text step's grid, and whether it is a page (lines at rows) or a scrolling console. */
  grid?: { cols: number; rows: number; mode: 'page' | 'scroll' };
  lines?: readonly ScriptLine[];
  /** A text step's badge in its top right corner (the BIOS's logo). */
  badge?: 'thrift';
  /** A graphic step's captions, each from its time until the next. */
  captions?: readonly { at: number; text: string }[];
  live?: readonly LiveSpec[];
  /**
   * The most times a second its still picture may change: lines due
   * sooner than that are shown together, as a console's burst. 10 if left
   * out.
   */
  pictureHz?: number;
}

/** The application the boot ends by starting, if it ends in one (its splash). */
export interface BootApp {
  name: string;
  maker: string;
  /** A line under its name: what it is, and its version. */
  subtitle: string;
  /** Its splash's status messages, in turn. */
  messages: readonly string[];
  /** How long its splash lasts, s. */
  seconds?: number;
}

export interface BootScript {
  family: BootFamily;
  seed: number;
  steps: readonly (BootStep & { start: number })[];
  /** Seconds from power-on until it is done. */
  total: number;
  app: BootApp | null;
  /** Its hostname or station address, as it shows them. */
  host: string;
}

export interface BootOptions {
  seed?: number;
  app?: BootApp | null;
  /** The last switch-off was a power cut, not a shutdown (the OS notices). */
  unclean?: boolean;
  /**
   * The `gui` boot's permission dialog, which waits and then presses
   * itself: a nod to the period's consent prompts, for scenarios only (the
   * owner, 2026-10-31); a normal boot goes without it.
   */
  consent?: boolean;
}

// ---- A seeded source -------------------------------------------------------------------

/** mulberry32: a small, good, seeded source in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (r: () => number, n: number) =>
  Array.from({ length: n }, () =>
    Math.floor(r() * 16)
      .toString(16)
      .toUpperCase(),
  ).join('');
const pick = <T>(r: () => number, xs: readonly T[]): T =>
  xs[Math.floor(r() * xs.length) % xs.length];
/**
 * A duration lengthened by up to `by` of itself (never shortened, so a
 * step's last change is never hurried into the next step's first).
 */
const jitter = (r: () => number, s: number, by = 0.03) =>
  Math.round(s * (1 + r() * by) * 100) / 100;

/** A text with dots out to `width`, then `tail`: `ROM CRC ..... OK`. */
export const dotted = (text: string, width: number, tail = '') =>
  text + ' ' + '.'.repeat(Math.max(1, width - text.length - 1)) + tail;

// ---- The scripts -----------------------------------------------------------------------

const PC = { cols: 80, rows: 25 } as const;

/**
 * The fewest seconds between changes of a big screen's still picture (the
 * gui family's 640 × 480): about a full upload in that time, within the
 * component bench's budget.
 */
export const GAP = 1.6;

/** The most times a second a console's text may move on: lines due sooner come in a burst together. */
export const CONSOLE_HZ = 1.5;

/** The 2000s BIOS's POST and PCI listing, as the gui family's PC shows them. */
function postSteps(
  r: () => number,
  bootDevice: string,
  memK: number,
): BootStep[] {
  const b = BOOT_NAMES.bios;
  const date = `0${1 + Math.floor(r() * 9)}/${10 + Math.floor(r() * 18)}/2006`;
  const quirk = pick(r, ['keyboard', 'cmos', 'none'] as const);
  const lines: ScriptLine[] = [
    { at: 0, row: 0, text: `${b.product} v6.02PG, ${b.ally}`, tone: 'bright' },
    { at: 0, row: 1, text: `Copyright (C) 1984-2006, ${b.maker}` },
    { at: 0, row: 3, text: `${b.board}, BIOS rev 1.07 (${date})` },
    {
      at: 0,
      row: 5,
      text: `Main Processor : ${b.cpu} 1.20GHz (100x12.0)`,
    },
    { at: 0, row: 6, text: 'Memory Testing :' },
    {
      at: 0,
      row: 23,
      text: `${date.replace(/\//g, '/')}-945GSE-ICH7-6A79${b.boardId}C-00`,
      tone: 'dim',
    },
    {
      at: 0,
      row: 24,
      text: 'Press DEL to enter SETUP, F12 for Boot Menu',
    },
    // The still picture changes no more than once in GAP seconds, so a
    // 640 × 480 screen keeps within its upload budget.
    { at: 3.2, row: 8, text: 'Detecting IDE drives ...' },
    { at: 3.2 + GAP, row: 9, text: `Primary Master   : ${bootDevice}` },
    { at: 3.2 + GAP, row: 10, text: 'Primary Slave    : None' },
    { at: 3.2 + GAP, row: 11, text: 'Secondary Master : None' },
    { at: 3.2 + GAP, row: 12, text: 'Secondary Slave  : None' },
  ];
  let postEnd = 3.2 + 2 * GAP;
  const q1 = 3.2 + 2 * GAP;
  if (quirk === 'keyboard') {
    lines.push(
      { at: q1, row: 14, text: 'Keyboard error or no keyboard present' },
      { at: q1, row: 15, text: 'Press F1 to continue, DEL to enter SETUP' },
      {
        at: q1 + GAP,
        row: 16,
        text: '(Nobody here but the chlorine. Continuing anyway.)',
        tone: 'dim',
      },
    );
    postEnd = q1 + 2 * GAP;
  } else if (quirk === 'cmos') {
    lines.push(
      { at: q1, row: 14, text: 'CMOS checksum error - Defaults loaded' },
      {
        at: q1 + GAP,
        row: 15,
        text: '(Its clock battery has been flat since about 2011.)',
        tone: 'dim',
      },
    );
    postEnd = q1 + 2 * GAP;
  }
  const pci: ScriptLine[] = [
    { at: 0, row: 0, text: 'PCI device listing .....', tone: 'bright' },
    {
      at: 0,
      row: 1,
      text: ' Bus No. Device No. Func No. Vendor/Device Class Device Class         IRQ',
    },
    { at: 0, row: 2, text: ' ' + '-'.repeat(74) },
    ...[
      ['0', '2', '0', '1B7E 27AE', '0300', 'Display Cntrlr', '11'],
      ['0', '27', '0', '1B7E 27D8', '0403', 'Multimedia Device', '5'],
      ['0', '29', '0', '1B7E 27C8', '0C03', 'USB 1.0/1.1 UHCI Cntrlr', '10'],
      ['0', '29', '7', '1B7E 27CC', '0C03', 'USB 2.0 EHCI Cntrlr', '10'],
      ['0', '31', '1', '1B7E 27DF', '0101', 'IDE Cntrlr', '14'],
      ['1', '0', '0', '15C3 8169', '0200', 'Network Cntrlr', '11'],
      ['1', '1', '0', '1D0A 0485', '0700', 'Serial Bus Cntrlr', '5'],
    ].map(([bus, dev, fn, vd, cls, name, irq], i): ScriptLine => ({
      at: 0,
      row: 3 + i,
      text:
        ' ' +
        bus.padStart(4) +
        dev.padStart(10) +
        fn.padStart(10) +
        '   ' +
        vd.padEnd(12) +
        cls.padEnd(7) +
        name.padEnd(24) +
        irq.padStart(3),
    })),
    {
      at: 0,
      row: 11,
      text: '                                                ACPI Controller   9',
    },
    {
      at: GAP,
      row: 13,
      text: 'Verifying DMI Pool Data ........ Update Success',
    },
    { at: GAP, row: 14, text: `Boot from CF : ${bootDevice}` },
  ];
  return [
    {
      id: 'post',
      kind: 'text',
      grid: { ...PC, mode: 'page' },
      badge: 'thrift',
      duration: jitter(r, postEnd, 0.02),
      lines,
      live: [
        {
          kind: 'counter',
          at: 1.0,
          until: 3.2,
          from: 0,
          to: memK,
          step: 1024,
          row: 6,
          col: 17,
          width: 32,
          suffix: 'K',
          done: `${memK}K OK + 8192K Shared Memory`,
        },
      ],
    },
    {
      id: 'pci',
      kind: 'text',
      grid: { ...PC, mode: 'page' },
      duration: jitter(r, 2 * GAP, 0.02),
      lines: pci,
    },
  ];
}

/** The OS's recovery menu after a power cut, its countdown running down. */
function recoveryStep(): BootStep {
  const g = BOOT_NAMES.gui;
  const w = `${g.os} Error Recovery`;
  const lines: ScriptLine[] = [
    { at: 0, row: 0, text: ' '.repeat(Math.floor((80 - w.length) / 2)) + w },
    {
      at: 0,
      row: 2,
      text: `  ${g.os} could not start. A recent power cut may be the cause, or`,
    },
    {
      at: 0,
      row: 3,
      text: '  somebody switched off the dosing controller to see what it would do.',
    },
    { at: 0, row: 6, text: `    Start ${g.os} Normally`, tone: 'bright' },
    {
      at: 0,
      row: 7,
      text: '    Launch Startup Repair (recommended, never chosen)',
    },
    {
      at: 0,
      row: 9,
      text: '  Seconds until the highlighted choice will be started automatically:',
    },
    {
      at: 0,
      row: 24,
      text: ' ENTER=Choose                                   (nobody is here to choose)',
      tone: 'dim',
    },
  ];
  return {
    id: 'recovery',
    kind: 'text',
    grid: { ...PC, mode: 'page' },
    duration: 5.2,
    lines,
    live: [
      {
        kind: 'counter',
        at: 0,
        until: 5.2,
        from: 5,
        to: 0,
        step: 1,
        row: 9,
        col: 72,
        width: 3,
        suffix: '',
        done: '0',
      },
    ],
  };
}

const MARQUEE: FracRect = { x: 0.375, y: 0.74, w: 0.25, h: 0.025 };
const SPINNER: FracRect = { x: 0.33, y: 0.47, w: 0.06, h: 0.08 };
const APP_BAR: FracRect = { x: 0.2, y: 0.72, w: 0.6, h: 0.1 };

/** The Windows-like embedded PC, about 2006: POST to the application. */
function guiScript(r: () => number, o: BootOptions): BootStep[] {
  const g = BOOT_NAMES.gui;
  const device = `AQ-CF4096 ${hex(r, 2)}${Math.floor(r() * 10)} Ver 1.02`;
  const steps: BootStep[] = [
    // The panel's backlight warming, the BIOS not yet drawing.
    { id: 'power', kind: 'black', duration: jitter(r, GAP, 0.02) },
    ...postSteps(r, device, 1047552),
    ...(o.unclean ? [recoveryStep()] : []),
    // The boot sector's moment: a black screen, a cursor blinking at its top left.
    {
      id: 'loader',
      kind: 'text',
      grid: { ...PC, mode: 'page' },
      duration: jitter(r, GAP, 0.02),
      lines: [],
      live: [{ kind: 'cursor', at: 0, row: 0, col: 0 }],
    },
    {
      id: 'logo',
      kind: 'logo',
      duration: jitter(r, o.unclean ? 7 : 10, 0.02),
      captions: [
        { at: 0, text: '' },
        { at: o.unclean ? 4 : 6, text: 'Loading files you will never need…' },
      ],
      live: [{ kind: 'marquee', at: 0, rect: MARQUEE }],
    },
    {
      id: 'welcome',
      kind: 'welcome',
      duration: jitter(r, 6.2, 0.02),
      captions: [
        { at: 0, text: 'Welcome' },
        { at: 3.5, text: 'Preparing your desktop…' },
      ],
      live: [{ kind: 'spinner', at: 0, rect: SPINNER }],
    },
  ];
  if (o.consent)
    steps.push({
      id: 'consent',
      kind: 'consent',
      duration: jitter(r, 3.8, 0.02),
      captions: [
        { at: 0, text: '' },
        {
          at: 2.2,
          text: `Nobody was here to press Continue, so ${g.os} pressed it.`,
        },
      ],
    });
  if (o.app) {
    const secs = o.app.seconds ?? 5.5;
    const n = o.app.messages.length;
    steps.push({
      id: 'app',
      kind: 'splash',
      duration: secs,
      live: [
        {
          kind: 'bar',
          at: 0,
          rect: APP_BAR,
          messages: o.app.messages.map((text, i) => ({
            at: (i * secs) / n,
            text,
          })),
        },
      ],
    });
  }
  return steps;
}

/** The BSD-flavoured controller: loader, kernel, rc, login. */
function unixScript(r: () => number, o: BootOptions, host: string): BootStep[] {
  const u = BOOT_NAMES.unix;
  const memK = 261120;
  const mac = Array.from({ length: 6 }, (_, i) =>
    i < 3 ? ['00', '0c', '42'][i] : hex(r, 2).toLowerCase(),
  ).join(':');
  const ip = `10.40.${7 + Math.floor(r() * 3)}.${20 + Math.floor(r() * 200)}`;
  const loader: ScriptLine[] = [
    { at: 0.2, text: `${u.loader} 1.00  BRX version is 1.02` },
    { at: 0.4, text: 'Consoles: internal video/keyboard' },
    { at: 0.8, text: 'BIOS drive A: is disk0' },
    { at: 0.8, text: 'BIOS drive C: is disk1' },
    { at: 1.2, text: `BIOS 639kB/${memK}kB available memory` },
    { at: 1.6, text: '' },
    { at: 1.6, text: `${u.os}/i386 bootstrap loader, Revision 1.1` },
    { at: 1.6, text: `(${u.builder}, Tue May 10 04:41:22 UTC 2005)` },
    { at: 2.0, text: 'Loading /boot/defaults/loader.conf' },
    {
      at: 2.4,
      text: '/boot/kernel/kernel text=0x5c1f4c data=0x8a0d8+0x7e4c8 syms=[0x4+0x5b6b0]',
    },
  ];
  const kernel: string[] = [
    `Copyright (c) 1992-2005 ${u.project}.`,
    'Copyright (c) 1979, 1980, 1983, 1986, 1988, 1989, 1991, 1992, 1993, 1994',
    `        ${u.regents}. All rights reserved.`,
    `${u.os} ${u.release} #0: Tue May 10 04:41:22 UTC 2005`,
    '    root@build:/usr/obj/usr/src/sys/FRUGAL',
    'Timecounter "i8254" frequency 1193182 Hz quality 0',
    'CPU: Lowwatt Ezra 733MHz (733.38-MHz 686-class CPU)',
    '  Origin = "LowwattHauls"  Id = 0x698  Stepping = 8',
    `real memory  = ${memK * 1024} (${memK / 1024} MB)`,
    `avail memory = ${(memK - 9364) * 1024} (${Math.floor((memK - 9364) / 1024)} MB)`,
    'npx0: [FAST] <math processor> on motherboard',
    'pcib0: <Host to PCI bridge> pcibus 0 on motherboard',
    'pci0: <PCI bus> on pcib0',
    'atapci0: <Generic ATA66 controller> port 0x1c00-0x1c0f at device 17.1 on pci0',
    'ata0: channel #0 on atapci0',
    `rl0: <Hoopoe 8139 10/100BaseTX> port 0xe000-0xe0ff irq 11 at device 13.0 on pci0`,
    `rl0: Ethernet address: ${mac}`,
    'uhci0: <UHCI (generic) USB controller> irq 10 at device 17.2 on pci0',
    'usb0: <UHCI (generic) USB controller> on uhci0',
    'uhub0: 2 ports with 2 removable, self powered',
    'sio0: <16550A-compatible COM port> port 0x3f8-0x3ff irq 4 flags 0x10 on acpi0',
    'sio0: type 16550A, console',
    'sio1: <16550A-compatible COM port> port 0x2f8-0x2ff irq 3 on acpi0',
    'sio1: type 16550A (RS-485, Modbus RTU)',
    'atkbdc0: <Keyboard controller (i8042)> port 0x60,0x64 irq 1 on acpi0',
    'atkbd0: <AT Keyboard> irq 1 on atkbdc0',
    'kbd0: no keyboard found (that is fine; nobody types here)',
    'ad0: 488MB <CF 512MB 20050118> at ata0-master PIO4',
    'Mounting root from ufs:/dev/ad0s1a',
  ];
  const kernelLines: ScriptLine[] = kernel.map((text, i) => ({
    // Bursts: the banner, then the probes in clumps, then the root.
    at:
      i < 5
        ? 0.1
        : i < 10
          ? 0.9 + i * 0.05
          : i < 20
            ? 1.8 + (i - 10) * 0.12
            : i < 28
              ? 3.4 + (i - 20) * 0.14
              : 5.0,
    text,
    tone: 'bright' as Tone,
  }));
  const failing = pick(r, ['lpd', 'sendmail', 'none'] as const);
  type Svc = [string, number, ResultKind?, string?];
  const svcs: Svc[] = [
    ['Setting hostname: ' + host, 0.3],
    ['Starting file system checks', 0.6],
    ['Configuring network: rl0 ' + ip, 1.2],
    ['Starting syslogd', 0.4],
    ['Setting date via ntp', 1.6, 'warn', 'no server; 1 Jan 1970 it is'],
    ['Starting cron', 0.3],
    ['Starting modbusd on /dev/cuad1', 0.5],
    ['Starting plantmon', 0.9],
  ];
  if (failing === 'lpd')
    svcs.splice(5, 0, ['Starting lpd (there is no printer)', 0.6, 'fail']);
  if (failing === 'sendmail')
    svcs.splice(5, 0, ['Starting sendmail (to whom?)', 0.8, 'fail']);
  const rc: ScriptLine[] = [];
  let at = 0.2;
  if (o.unclean) {
    rc.push(
      { at, text: 'WARNING: / was not properly dismounted', tone: 'warn' },
      {
        at: at + 0.6,
        text: '/dev/ad0s1a: 412 files, 61822 used, 58137 free (MARKED CLEAN)',
      },
    );
    at += 1.4;
  }
  for (const [text, takes, kind = 'ok', note] of svcs) {
    rc.push({ at, text, result: { after: takes, kind } });
    at += takes + 0.15;
    if (note) rc.push({ at: at - 0.1, text: '  ' + note, tone: 'dim' });
  }
  const login: ScriptLine[] = [
    { at: 0, text: '' },
    { at: 0, text: `${u.os}/i386 (${host}) (ttyv0)` },
    { at: 0, text: '' },
    { at: 0, text: 'login: ' },
  ];
  const grid = { ...PC, mode: 'scroll' as const };
  const countdown: ScriptLine[] = [
    ...loader.map((l) => ({ ...l, at: 0 })),
    {
      at: 0,
      text: 'Hit [Enter] to boot immediately, or any other key for command prompt.',
    },
    { at: 0, text: 'Booting [/boot/kernel/kernel] in    seconds...' },
  ];
  return [
    { id: 'power', kind: 'black', duration: jitter(r, 0.6) },
    {
      id: 'loader',
      kind: 'text',
      grid,
      duration: jitter(r, 4.6),
      lines: loader,
      // The baton starts once the kernel's line is shown (the console's burst after it is due).
      live: [{ kind: 'twirl', at: 2.8, until: 4.6 }],
      pictureHz: CONSOLE_HZ,
    },
    {
      id: 'countdown',
      kind: 'text',
      grid,
      duration: 2,
      lines: countdown,
      live: [
        {
          kind: 'counter',
          at: 0,
          until: 2,
          from: 2,
          to: 0,
          step: 1,
          row: loader.length + 1,
          col: 33,
          width: 2,
          suffix: '',
          done: '0',
        },
      ],
    },
    {
      id: 'kernel',
      kind: 'text',
      grid,
      duration: jitter(r, 5.6),
      lines: [
        ...countdown.slice(0, -1).map((l) => ({ ...l, at: 0 })),
        { at: 0, text: 'Booting [/boot/kernel/kernel]...' },
        ...kernelLines,
      ],
      pictureHz: CONSOLE_HZ,
    },
    {
      id: 'rc',
      kind: 'text',
      grid,
      duration: at + 0.4,
      lines: [...kernelLines.map((l) => ({ ...l, at: 0 })), ...rc],
      pictureHz: CONSOLE_HZ,
    },
    {
      id: 'login',
      kind: 'text',
      grid,
      duration: 1,
      lines: [
        ...kernelLines.map((l) => ({ ...l, at: 0 })),
        ...rc.map((l) => ({
          ...l,
          at: 0,
          result: l.result && { ...l.result, after: 0 },
        })),
        ...login,
      ],
      live: [{ kind: 'cursor', at: 0 }],
    },
  ];
}

/** The 1990s PC: a POST, the DOS, its start-up files and a typo, the plant program. */
function dosScript(r: () => number): BootStep[] {
  const b = BOOT_NAMES.bios;
  const d = BOOT_NAMES.dos;
  const grid = { ...PC, mode: 'scroll' as const };
  const shell: ScriptLine[] = [
    { at: 0, text: `Starting ${d.os}...` },
    { at: 1.4, text: '' },
    { at: 1.6, text: 'HIGHMEM is testing extended memory...done.' },
    { at: 2.4, text: '' },
    {
      at: 2.4,
      text: `${d.os} Version ${d.version}  (C)Copyright ${d.maker} 1981-1994`,
    },
    { at: 2.8, text: '' },
    { at: 2.8, text: 'C:\\>PROMPT $P$G' },
    { at: 3.0, text: 'C:\\>LH C:\\DOS\\DISKCACHE.EXE /X' },
    { at: 3.6, text: 'C:\\>CD \\PLANT' },
    { at: 3.8, text: 'C:\\PLANT>PLNATMON /COM2' },
    { at: 4.0, text: 'Bad command or file name' },
    { at: 4.2, text: 'C:\\PLANT>REM WHO WROTE THIS AUTOEXEC.BAT' },
    { at: 4.4, text: 'C:\\PLANT>PLANTMON /COM2' },
    { at: 5.2, text: '' },
    {
      at: 5.2,
      text: `PLANTMON 2.3   ${hex(r, 4)}-${hex(r, 4)}   (c) 1994 Coldwater Process Systems`,
      tone: 'bright',
    },
    { at: 5.8, text: dotted('Opening COM2 at 9600 baud', 40, ' OK') },
    { at: 6.6, text: dotted('Polling outstations 1 2 3 4', 40, ' OK') },
    { at: 7.4, text: 'Ready. F1 Help  F10 Quit' },
  ];
  return [
    { id: 'power', kind: 'black', duration: jitter(r, 0.5) },
    {
      id: 'post',
      kind: 'text',
      grid: { ...PC, mode: 'page' },
      badge: 'thrift',
      duration: jitter(r, 3.4),
      lines: [
        {
          at: 0,
          row: 0,
          text: `${b.product} v4.51PG, ${b.ally}`,
          tone: 'bright',
        },
        { at: 0, row: 1, text: `Copyright (C) 1984-95, ${b.maker}` },
        { at: 0, row: 3, text: '486DX2 CPU at 66MHz' },
        { at: 0.2, row: 4, text: 'Memory Test :' },
        { at: 0, row: 23, text: '03/14/95-KX-486-2A4IBK2AC-00', tone: 'dim' },
        { at: 0, row: 24, text: 'Press DEL to enter SETUP' },
        { at: 2.3, row: 6, text: 'Kestrel Plug and Play BIOS Extension v1.0A' },
      ],
      live: [
        {
          kind: 'counter',
          at: 0.3,
          until: 1.9,
          from: 0,
          to: 16384,
          step: 64,
          row: 4,
          col: 14,
          width: 24,
          suffix: 'K',
          done: '16384K OK',
        },
      ],
    },
    {
      id: 'dos',
      kind: 'text',
      grid,
      duration: 8.2,
      lines: shell,
      pictureHz: CONSOLE_HZ,
      // Once the last line's burst is shown (at 8.0, the quantum after 7.4).
      live: [{ kind: 'cursor', at: 8.0 }],
    },
  ];
}

/** The firmware's small screen: its grid. */
export const FIRMWARE_GRID = { cols: 21, rows: 8 } as const;

/** The microcontroller: its banner, its memory and devices checked, RUN. */
function firmwareScript(r: () => number, host: string): BootStep[] {
  const f = BOOT_NAMES.firmware;
  const W = 17;
  const crc = hex(r, 4);
  return [
    { id: 'power', kind: 'black', duration: 0.3 },
    {
      id: 'post',
      kind: 'text',
      grid: { ...FIRMWARE_GRID, mode: 'page' },
      duration: jitter(r, 3.2, 0.05),
      lines: [
        { at: 0, row: 0, text: `${f.monitor} ${f.version}`, tone: 'bright' },
        { at: 0, row: 1, text: `(c)1997 ${f.maker}`, tone: 'dim' },
        { at: 0.2, row: 2, text: 'RAM' },
        { at: 1.0, row: 3, text: dotted(`ROM ${crc}`, W, 'OK') },
        { at: 1.4, row: 4, text: dotted('EEPROM', W, 'OK') },
        { at: 1.8, row: 5, text: dotted('ADC 8ch', W, 'OK') },
        { at: 2.2, row: 6, text: dotted(`RS485 #${host}`, W, 'OK') },
        { at: 2.8, row: 7, text: 'RUN', tone: 'bright' },
      ],
      live: [
        {
          kind: 'counter',
          at: 0.2,
          until: 0.9,
          from: 0,
          to: 2048,
          step: 256,
          row: 2,
          col: 4,
          width: 17,
          suffix: 'B',
          done: dotted('2048B', W - 4, 'OK'),
        },
        { kind: 'cursor', at: 2.8, row: 7, col: 4 },
      ],
    },
  ];
}

/** A family's boot script for one machine (its seed), deterministic. */
export function bootScript(
  family: BootFamily,
  options: BootOptions = {},
): BootScript {
  const seed = options.seed ?? 1;
  const r = seededRandom(seed * 2654435761 + family.length * 97);
  const host =
    family === 'firmware'
      ? String(1 + Math.floor(r() * 30)).padStart(2, '0')
      : `dosing-${String(1 + Math.floor(r() * 40)).padStart(2, '0')}.plant.local`;
  const app = family === 'gui' ? (options.app ?? null) : null;
  const raw =
    family === 'gui'
      ? guiScript(r, { ...options, app })
      : family === 'unix'
        ? unixScript(r, options, host)
        : family === 'dos'
          ? dosScript(r)
          : firmwareScript(r, host);
  let start = 0;
  const steps = raw.map((s) => {
    const placed = { ...s, start };
    start += s.duration;
    return placed;
  });
  return { family, seed, steps, total: start, app, host };
}

// ---- What shows at a time --------------------------------------------------------------

/** A run of text at a place on the grid. */
export interface TextCell {
  row: number;
  col: number;
  text: string;
  tone: Tone;
}

/** The live element now: what kind, where, and its quantised state. */
export interface LiveFrame {
  kind: LiveKind;
  /** Where it is drawn, in fractions of the screen. */
  rect: FracRect;
  /** Counter's text, twirl's character, bar's message. */
  text: string;
  /** Cursor shown, marquee's and spinner's phase (0 to 1), bar's fraction. */
  value: number;
  tone: Tone;
}

export interface BootFrame {
  family: BootFamily;
  done: boolean;
  step: string;
  kind: StepKind;
  index: number;
  /** How far through its step (0 to 1), and through the whole boot. */
  progress: number;
  overall: number;
  /** A text step's grid and what is on it. */
  grid: { cols: number; rows: number } | null;
  cells: TextCell[];
  badge: 'thrift' | null;
  /** A graphic step's caption now. */
  caption: string;
  live: LiveFrame | null;
  app: BootApp | null;
  /** Changes only when the still picture does. */
  pictureKey: string;
  /** Changes only when the live element does ('' with none). */
  liveKey: string;
  /** Both together: changes when anything shown does. */
  key: string;
}

/** The live elements' rates, Hz: each changes at most this often. */
export const LIVE_HZ: Record<LiveKind, number> = {
  counter: 10,
  cursor: 2,
  twirl: 8,
  marquee: 10,
  spinner: 10,
  bar: 5,
};

/** How many steps the marquee's and spinner's cycles have. */
export const MARQUEE_STEPS = 24;
export const SPINNER_STEPS = 8;

const RESULT_TEXT: Record<ResultKind, string> = {
  ok: '[  OK  ]',
  fail: '[FAILED]',
  warn: '[ WARN ]',
};
const RESULT_TONE: Record<ResultKind, Tone> = {
  ok: 'ok',
  fail: 'fail',
  warn: 'warn',
};

const cellRect = (
  grid: { cols: number; rows: number },
  row: number,
  col: number,
  width: number,
): FracRect => ({
  x: col / grid.cols,
  y: row / grid.rows,
  w: Math.min(width, grid.cols - col) / grid.cols,
  h: 1 / grid.rows,
});

/** A counter's number at a moment, its granule and direction kept. */
function counterValue(
  l: Extract<LiveSpec, { kind: 'counter' }>,
  local: number,
): number {
  const f = Math.min(1, Math.max(0, (local - l.at) / (l.until - l.at)));
  const raw = l.from + (l.to - l.from) * f;
  const v =
    l.to >= l.from
      ? Math.floor(raw / l.step) * l.step
      : Math.ceil(raw / l.step) * l.step;
  return Math.min(Math.max(v, Math.min(l.from, l.to)), Math.max(l.from, l.to));
}

/** Which step is showing at t, and how far into it. */
function stepAt(script: BootScript, t: number) {
  const steps = script.steps;
  let i = steps.length - 1;
  for (let k = 0; k < steps.length; k++)
    if (t < steps[k].start + steps[k].duration) {
      i = k;
      break;
    }
  return { i, step: steps[i], local: t - steps[i].start };
}

/** What the screen shows `t` seconds after power-on. */
export function bootFrame(script: BootScript, t: number): BootFrame {
  t = Math.max(0, t);
  const { i, step, local } = stepAt(script, t);
  const hz = Math.min(10, step.pictureHz ?? 10);
  // The still picture moves on in its quanta only.
  const q = Math.floor(local * hz + 1e-9) / hz;
  let events = 0;
  const cells: TextCell[] = [];
  const grid = step.grid ?? null;
  const live = (step.live ?? []).find(
    (l) => local >= l.at && local < (l.until ?? Infinity),
  );
  // Live counters' done text, once each is done, is part of the picture.
  for (const l of step.live ?? [])
    if (l.kind === 'counter' && local >= l.until - EPS) {
      events++;
      cells.push({
        row: l.row,
        col: l.col,
        text: l.done,
        tone: l.tone ?? 'normal',
      });
    }
  if (grid) {
    const shown = (step.lines ?? []).filter((l) => l.at <= q + EPS);
    events += shown.length;
    const texts = shown.map((l) => {
      let text = l.text;
      const tone = l.tone ?? 'normal';
      let result: { text: string; tone: Tone } | null = null;
      if (l.result && l.at + l.result.after <= q + EPS) {
        events++;
        result = {
          text: RESULT_TEXT[l.result.kind],
          tone: RESULT_TONE[l.result.kind],
        };
      } else if (l.result) text = text + ' ...';
      return { l, text, tone, result };
    });
    if (grid.mode === 'page') {
      for (const x of texts)
        cells.push({
          row: x.l.row ?? 0,
          col: x.l.col ?? 0,
          text: x.text,
          tone: x.tone,
        });
    } else {
      // A console: the last rows' worth, scrolled.
      const tail = texts.slice(-grid.rows);
      tail.forEach((x, row) => {
        cells.push({ row, col: 0, text: x.text, tone: x.tone });
        if (x.result)
          cells.push({
            row,
            col: grid.cols - 9,
            text: x.result.text,
            tone: x.result.tone,
          });
      });
    }
  }
  let caption = '';
  for (const c of step.captions ?? [])
    if (c.at <= q + EPS) {
      caption = c.text;
      events++;
    }

  let liveFrame: LiveFrame | null = null;
  if (live) {
    const lhz = LIVE_HZ[live.kind];
    const n = Math.floor((local - live.at) * lhz + 1e-9);
    const lastCell = () => {
      const g = grid ?? { cols: 80, rows: 25 };
      const text = cells.filter((c) => c.col === 0).at(-1);
      const row = text ? text.row : 0;
      const col = text ? Math.min(g.cols - 1, text.text.length) : 0;
      return { g, row, col };
    };
    if (live.kind === 'counter') {
      const v = counterValue(live, live.at + n / lhz);
      liveFrame = {
        kind: 'counter',
        rect: cellRect(grid!, live.row, live.col, live.width),
        text: `${v}${live.suffix}`,
        value: v,
        tone: live.tone ?? 'normal',
      };
    } else if (live.kind === 'cursor' || live.kind === 'twirl') {
      const at =
        live.kind === 'cursor' && live.row !== undefined
          ? { g: grid!, row: live.row, col: live.col ?? 0 }
          : lastCell();
      liveFrame = {
        kind: live.kind,
        rect: cellRect(at.g, at.row, at.col, 1),
        text: live.kind === 'twirl' ? '|/-\\'[n % 4] : '_',
        value: live.kind === 'cursor' ? (n % 2 === 0 ? 1 : 0) : n % 4,
        tone: 'normal',
      };
    } else if (live.kind === 'marquee' || live.kind === 'spinner') {
      const steps = live.kind === 'marquee' ? MARQUEE_STEPS : SPINNER_STEPS;
      liveFrame = {
        kind: live.kind,
        rect: live.rect,
        text: '',
        value: (n % steps) / steps,
        tone: 'normal',
      };
    } else {
      const span = (live.until ?? step.duration) - live.at;
      const f = Math.min(1, Math.round((n / lhz / span) * 50) / 50);
      const msg = live.messages.filter((m) => m.at <= n / lhz).at(-1);
      liveFrame = {
        kind: 'bar',
        rect: live.rect,
        text: msg?.text ?? '',
        value: f,
        tone: 'normal',
      };
    }
  }
  const pictureKey = `${script.family}:${script.seed}:${i}:${events}`;
  const liveKey = liveFrame
    ? `${liveFrame.kind}:${liveFrame.text}:${liveFrame.value}:${rectKey(liveFrame.rect)}`
    : '';
  return {
    family: script.family,
    done: t >= script.total,
    step: step.id,
    kind: step.kind,
    index: i,
    progress: step.duration > 0 ? Math.min(1, local / step.duration) : 1,
    overall: script.total > 0 ? Math.min(1, t / script.total) : 1,
    grid: grid ? { cols: grid.cols, rows: grid.rows } : null,
    cells,
    badge: step.badge ?? null,
    caption,
    live: liveFrame,
    app: script.app,
    pictureKey,
    liveKey,
    key: `${pictureKey}|${liveKey}`,
  };
}

/** Times within this of one another are the same moment (sums of seconds are inexact). */
const EPS = 1e-6;

const rectKey = (r: FracRect) => `${r.x},${r.y},${r.w},${r.h}`;

/** A fractional rectangle as whole pixels on a `w` × `h` screen, rounded outwards. */
export function pixelRect(
  r: FracRect,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const x0 = Math.max(0, Math.floor(r.x * w));
  const y0 = Math.max(0, Math.floor(r.y * h));
  const x1 = Math.min(w, Math.ceil((r.x + r.w) * w));
  const y1 = Math.min(h, Math.ceil((r.y + r.h) * h));
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/**
 * The texels a host uploads drawing this boot on a `w` × `h` screen with
 * its live element on a canvas of its own (the picture's whole screen at
 * each change of its key, the live rectangle's at each of its), sampled at
 * `hz` from `t0` to `t1`: each upload's time and texels. For the budget's
 * tests and the bench's reasoning.
 */
export function bootUploads(
  script: BootScript,
  w: number,
  h: number,
  t0 = 0,
  t1 = script.total,
  hz = 60,
): { t: number; texels: number }[] {
  const out: { t: number; texels: number }[] = [];
  let picture = '';
  let live = '';
  for (let k = Math.ceil(t0 * hz); k / hz <= t1; k++) {
    const t = k / hz;
    const f = bootFrame(script, t);
    if (f.pictureKey !== picture) {
      picture = f.pictureKey;
      out.push({ t, texels: w * h });
    }
    if (f.liveKey !== live) {
      live = f.liveKey;
      if (f.live) {
        const p = pixelRect(f.live.rect, w, h);
        out.push({ t, texels: p.w * p.h });
      }
    }
  }
  return out;
}
