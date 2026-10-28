import { Group } from 'three';
import type { Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPartSet, keySwitch } from '../../core/parts/parts';
import { membraneKey } from '../../core/parts/small-parts';
import { partAudio } from '../../core/audio/part-audio';
import { bootBeep } from '../../sound/audio/boot-beep';
import { currentUseHold } from '../../../controls/input/use-holding';
import type { UseHold } from '../../../controls/logic/use-hold';
import {
  OT216,
  heldRepeats,
  newOt216,
  ot216Screen,
  pressOt216,
  tickOt216,
} from '../logic/ot216-terminal';
import type {
  TerminalCommand,
  TerminalFeed,
  TerminalKey,
  TerminalLink,
} from '../logic/ot216-terminal';

/**
 * A character LCD, `cols` × `rows`, after the STN modules of the 1990s
 * (HD44780 class): dark characters on a yellow-green field lit by an LED
 * backlight, each character in its own cell of 5 × 8 dots, a block cursor
 * drawn by inverting its cell. Redrawn only when what it shows changes.
 */
export function createCharacterLcd(
  kit: PanelKit,
  {
    w,
    h,
    cols = 16,
    rows = 2,
  }: { w: number; h: number; cols?: number; rows?: number },
) {
  const t = tools(kit);
  const screen = t.printed(w, h, () => {}, 512, true);
  screen.mesh.userData.live = true;
  let shown = '';
  const show = (
    lines: readonly string[],
    cursor: { row: number; col: number } | null,
    backlight: number,
  ) => {
    const key = `${lines.join('\n')}|${cursor?.row},${cursor?.col}|${backlight}`;
    if (key === shown) return;
    shown = key;
    const c = screen.context;
    const cw = c.canvas.width;
    const ch = c.canvas.height;
    // The field: unlit, a dull grey-green; lit, the backlight's yellow-green.
    const field = (k: number) => {
      const off = [74, 82, 58];
      const on = [176, 199, 62];
      const mix = off.map((v, i) => Math.round(v + (on[i] - v) * k));
      return `rgb(${mix.join(',')})`;
    };
    c.fillStyle = field(backlight);
    c.fillRect(0, 0, cw, ch);
    const padX = cw * 0.03;
    const padY = ch * 0.08;
    const cellW = (cw - padX * 2) / cols;
    const cellH = (ch - padY * 2) / rows;
    const ink = backlight > 0 ? '#1d2a10' : '#3d4530';
    // Every cell's faint unlit dots, as a real module shows.
    c.fillStyle = backlight > 0 ? 'rgba(40,60,10,0.12)' : 'rgba(0,0,0,0.08)';
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < cols; k++)
        c.fillRect(
          padX + k * cellW + cellW * 0.08,
          padY + r * cellH + cellH * 0.08,
          cellW * 0.84,
          cellH * 0.84,
        );
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.font = `bold ${cellH * 0.78}px "Courier New", monospace`;
    lines.forEach((line, r) => {
      for (let k = 0; k < cols; k++) {
        const x = padX + k * cellW;
        const y = padY + r * cellH;
        const isCursor = cursor && cursor.row === r && cursor.col === k;
        if (isCursor) {
          c.fillStyle = ink;
          c.fillRect(
            x + cellW * 0.06,
            y + cellH * 0.06,
            cellW * 0.88,
            cellH * 0.88,
          );
        }
        const char = line[k] ?? ' ';
        if (char === ' ') continue;
        c.fillStyle = isCursor ? field(backlight) : ink;
        c.fillText(char, x + cellW / 2, y + cellH * 0.54, cellW);
      }
    });
    screen.texture.needsUpdate = true;
  };
  show(['', ''], null, 0);
  return { mesh: screen.mesh as Mesh, show };
}

/** What a terminal is told each frame: its line's data from the box, and its supply and link. */
export interface Ot216Reading {
  feed: TerminalFeed;
  link: TerminalLink;
}

/**
 * The OT-216's size over the 200 × 140 × 50 mm it was designed at: the
 * owner, 2026-10-28, "20% bigger", so its LCD reads more easily; the
 * case 240 × 168 × 60 mm, everything on it scaled with it.
 */
export const OT216_SCALE = 1.2;
/** Its case, metres, as built: width, height and depth. */
export const OT216_CASE = {
  w: 0.2 * OT216_SCALE,
  h: 0.14 * OT216_SCALE,
  d: 0.05 * OT216_SCALE,
} as const;

/**
 * Penfold Controls' OT-216 operator terminal (prompt 091; the owner,
 * 2026-10-27; after the Siemens OP3/OP7, the Allen-Bradley DTAM Micro
 * and the Mitsubishi FX-10DU): a light grey moulded case about 240 × 168
 * × 60 mm (`OT216_CASE`) screwed to a wall, its chemical's band across the top, a 16 × 2
 * STN LCD, RUN, CALL and ALARM LEDs, a membrane keypad with tactile domes
 * (F1 MON, F2 SET, F3 CMD, ESC, ENTER and four cursor keys in an
 * inverted T), a LOCAL ACCESS key switch and one cable gland underneath.
 * It holds no plant logic: it shows what `read` gives and `send`s back
 * what is set and commanded (`../logic/ot216-terminal.ts`).
 *
 * Origin at the middle of its back, its face toward +z.
 */
export function createOt216Terminal(
  kit: PanelKit,
  {
    title,
    band,
    tag,
    read,
    send,
  }: {
    /** The chemical across its band: `HYPOCHLORITE`. */
    title: string;
    band: string;
    tag: string;
    read: () => Ot216Reading;
    send: (command: TerminalCommand) => void;
  },
) {
  const outer = new Group();
  // Drawn at its design size, then scaled as a whole (`OT216_SCALE`).
  const group = new Group();
  group.scale.setScalar(OT216_SCALE);
  outer.add(group);
  const t = tools(kit);
  const parts = createPartSet();
  const W = 0.2;
  const H = 0.14;
  const D = 0.05;
  const z = D;
  t.box(group, t.paint('#c9c7bd', 0.62), W, H, D, 0, 0, D / 2);
  // The front's slightly darker membrane overlay, and the band.
  t.box(
    group,
    t.paint('#b7b5aa', 0.5),
    W - 0.012,
    H - 0.012,
    0.001,
    0,
    -0.004,
    z + 0.0005,
  );
  t.box(
    group,
    t.paint(band, 0.5),
    W - 0.012,
    0.012,
    0.0012,
    0,
    H / 2 - 0.012,
    z + 0.0008,
  );
  t.label(group, title, -0.05, H / 2 - 0.012, z + 0.0016, 0.0062, '#ffffff');
  t.label(
    group,
    `OT-216  ${tag}`,
    0.056,
    H / 2 - 0.012,
    z + 0.0016,
    0.0045,
    '#ffffff',
  );
  // The LCD in its black bezel.
  t.box(
    group,
    t.paint('#1a1b1c', 0.4),
    0.128,
    0.042,
    0.002,
    -0.028,
    0.03,
    z + 0.001,
  );
  const lcd = createCharacterLcd(kit, { w: 0.116, h: 0.03 });
  lcd.mesh.position.set(-0.028, 0.03, z + 0.0022);
  group.add(lcd.mesh);
  // RUN, CALL and ALARM.
  const leds = (
    [
      ['RUN', '#39e05a', 0.042],
      ['CALL', '#ffb21f', 0.03],
      ['ALARM', '#ff3324', 0.018],
    ] as const
  ).map(([word, colour, y]) => {
    const led = t.led(group, colour, 0.0025, 0.055, y, z + 0.001);
    led.mesh.userData.live = true;
    t.label(group, word, 0.075, y, z + 0.001, 0.005, '#1b1b1b');
    return led;
  });
  // The keys.
  let terminal = newOt216(read().link.powered);
  let time = 0;
  let beeps = 0;
  const access = keySwitch(kit, {
    legend: 'LOCAL ACCESS',
    name: `${tag} local access key switch`,
  });
  const press = (key: TerminalKey) => {
    const r = read();
    const out = pressOt216(terminal, key, r.feed, access.state.value, r.link);
    terminal = out.terminal;
    if (out.command) send(out.command);
  };
  // A cursor key held (the owner, 2026-10-28: press-and-hold, to try):
  // the use's hold from the control scheme, and how long it has been held;
  // it repeats as `heldRepeats` gives, faster after 2 s.
  const CURSOR: ReadonlySet<TerminalKey> = new Set([
    'UP',
    'DOWN',
    'LEFT',
    'RIGHT',
  ]);
  let repeating: { key: TerminalKey; hold: UseHold; held: number } | null =
    null;
  const keys: [TerminalKey, string, string, number, number][] = [
    ['F1', 'F1 MON', '#3b4f6b', -0.085, -0.01],
    ['F2', 'F2 SET', '#3b4f6b', -0.058, -0.01],
    ['F3', 'F3 CMD', '#3b4f6b', -0.031, -0.01],
    ['ESC', 'ESC', '#9a2a22', -0.085, -0.045],
    ['ENTER', 'ENTER', '#2f6a3a', -0.058, -0.045],
    ['UP', '▲', '#2a2b2c', 0.055, -0.013],
    ['LEFT', '◀', '#2a2b2c', 0.034, -0.045],
    ['DOWN', '▼', '#2a2b2c', 0.055, -0.045],
    ['RIGHT', '▶', '#2a2b2c', 0.076, -0.045],
  ];
  for (const [key, legend, colour, x, y] of keys) {
    // Printed on the membrane above its dome, dark on the grey.
    const k = membraneKey(kit, {
      legend: ' ',
      colour,
      name: `${tag} ${legend} key`,
      action: () => {
        press(key);
        const hold = currentUseHold();
        repeating =
          CURSOR.has(key) && hold.held ? { key, hold, held: 0 } : null;
      },
    });
    k.object.position.set(x, y, z + 0.0012);
    t.label(
      group,
      legend.replace(' ', '\n'),
      x,
      y + 0.0135,
      z + 0.0012,
      legend.includes(' ') ? 0.0042 : 0.006,
      '#1b1b1b',
    );
    group.add(k.object);
    parts.add(k);
  }
  access.object.position.set(-0.012, -0.045, z + 0.0012);
  access.object.scale.setScalar(0.55);
  group.add(access.object);
  parts.add(access);
  // The cable gland underneath, its conduit away to the box.
  const grey = t.paint('#3a3c3d', 0.5);
  t.cyl(group, grey, 0.009, 0.014, 0.06, -H / 2 - 0.007, D / 2);
  t.cyl(
    group,
    t.paint('#5d6265', 0.6),
    0.01,
    0.12,
    0.06,
    -H / 2 - 0.074,
    D / 2,
  );
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z: z + 0.001,
    corner: 'bottom-right',
    size: 0.008,
    inset: 0.008,
  });
  return {
    object: outer,
    parts,
    /** Its access key at ON. */
    access: access.state,
    update(delta: number) {
      time += delta;
      parts.update(delta);
      if (repeating && !repeating.hold.held) repeating = null;
      if (repeating) {
        const from = repeating.held;
        repeating.held += delta;
        const n = heldRepeats(from, repeating.held);
        for (let k = 0; k < n; k++) press(repeating.key);
      }
      const r = read();
      terminal = tickOt216(terminal, delta, r.feed, r.link);
      const screen = ot216Screen(
        terminal,
        r.feed,
        access.state.value,
        r.link,
        time,
      );
      lcd.show(screen.lines, screen.cursor, screen.backlight);
      leds[0].set(screen.leds.run);
      leds[1].set(screen.leds.call);
      leds[2].set(screen.leds.alarm);
      if (terminal.beeps !== beeps) {
        beeps = terminal.beeps;
        partAudio.play(bootBeep(2600), group);
      }
    },
    /** What it shows, for the information overlay: its two lines and its LEDs. */
    status() {
      const r = read();
      const screen = ot216Screen(
        terminal,
        r.feed,
        access.state.value,
        r.link,
        0,
      );
      if (!r.link.powered) return `Operator terminal ${tag}, blank`;
      const lit = (['run', 'call', 'alarm'] as const).filter(
        (k) => screen.leds[k],
      );
      return `Operator terminal ${tag}: "${screen.lines[0].trim()}" / "${screen.lines[1].trim()}"${
        lit.length ? `; ${lit.map((k) => k.toUpperCase()).join(', ')} lit` : ''
      }`;
    },
    /** For a test or a script: press a key as a click would. */
    press,
    /**
     * For a script: hold a cursor key down for `seconds` of updates, as a
     * held use would (it repeats as held).
     */
    hold(key: TerminalKey, seconds: number) {
      press(key);
      const hold = { source: null, held: true };
      repeating = { key, hold, held: 0 };
      setTimeout(() => (hold.held = false), seconds * 1000);
    },
    /** For a script: turn the LOCAL ACCESS key, as a click on it would. */
    turnKey() {
      for (const use of access.uses.values()) use();
    },
    /** The width of its display, characters. */
    columns: OT216.width,
  };
}
