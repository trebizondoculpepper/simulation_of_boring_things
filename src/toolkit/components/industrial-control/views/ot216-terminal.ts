import {
  CanvasTexture,
  Group,
  Mesh as SceneMesh,
  SRGBColorSpace,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import { brandLivery } from '../../core/views/brand-livery';
import { createPartSet, keySwitch } from '../../core/parts/parts';
import { fasciaKey } from '../../core/parts/small-parts';
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
 * The OT-216's colours (the owner, 2026-10-28): its shell a pale green
 * moulded plastic, its fascia a darker green printed polyester, in
 * Chlorella's livery (`brands.ts`), the fascia's printing dark.
 */
export const OT216_LIVERY = {
  shell: '#b9d99c',
  fascia: '#3f9b3a',
  ink: '#0f2410',
} as const;
/** The fascia, metres: the shell's front less its screw bosses' margin. */
const FASCIA = { w: 0.2 - 0.03, h: 0.14 - 0.02 } as const;
/** The LCD's window's middle on it. */
const LCD_AT = { x: -0.02, y: 0.023 } as const;
/** Pixels across the fascia's canvases. */
const FASCIA_PX = 1024;

/** The keys printed on the fascia: each one's place, size, legend and print. */
const FASCIA_KEYS: readonly {
  key: TerminalKey;
  legend: string;
  fill: string;
  ink: string;
  x: number;
  y: number;
  w: number;
  h: number;
}[] = (
  [
    ['F1', 'F1\nMON', '#1f3550', -0.075, -0.012, 0.02],
    ['F2', 'F2\nSET', '#1f3550', -0.052, -0.012, 0.02],
    ['F3', 'F3\nCMD', '#1f3550', -0.029, -0.012, 0.02],
    ['ESC', 'ESC', '#8a1f19', -0.075, -0.045, 0.02],
    ['ENTER', 'ENTER', '#e8e6da', -0.052, -0.045, 0.02],
    ['UP', '▲', '#14240f', 0.055, -0.019, 0.018],
    ['LEFT', '◀', '#14240f', 0.034, -0.038, 0.018],
    ['DOWN', '▼', '#14240f', 0.055, -0.038, 0.018],
    ['RIGHT', '▶', '#14240f', 0.076, -0.038, 0.018],
  ] as const
).map(([key, legend, fill, x, y, w]) => ({
  key,
  legend,
  fill,
  ink: key === 'ENTER' ? '#14240f' : '#f4f1e6',
  x,
  y,
  w,
  h: 0.015,
}));

type FasciaDraw = (
  c: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  px: (x: number) => number,
  py: (y: number) => number,
  mm: number,
) => void;

/** A canvas the fascia's size, `draw` given its metre-to-pixel mapping. */
function fasciaCanvas(draw: FasciaDraw): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = FASCIA_PX;
  canvas.height = Math.round((FASCIA_PX * FASCIA.h) / FASCIA.w);
  const c = canvas.getContext('2d')!;
  const cw = canvas.width;
  const ch = canvas.height;
  const px = (x: number) => ((x + FASCIA.w / 2) / FASCIA.w) * cw;
  const py = (y: number) => ((FASCIA.h / 2 - y) / FASCIA.h) * ch;
  draw(c, cw, ch, px, py, cw / (FASCIA.w * 1000));
  return canvas;
}

/**
 * The fascia's layout drawn as one of its maps: `colour`, its print;
 * `bump`, its height (mid grey flat, the keys' patches raised, their
 * embossed rims, the LCD window's edge raised round its recessed clear
 * part, the LED windows' rings); `roughness`, its finish to match (the
 * smooth polyester a little glossy, the raised patches glossier, catching
 * the light, the clear window glossiest).
 */
function drawFascia(
  c: CanvasRenderingContext2D,
  px: (x: number) => number,
  py: (y: number) => number,
  mm: number,
  as: 'colour' | 'bump' | 'roughness',
  print: { band: string; title: string; tag: string } = {
    band: '',
    title: '',
    tag: '',
  },
) {
  const grey = (v: number) => `rgb(${v},${v},${v})`;
  const rect = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath();
    c.roundRect(
      px(x - w / 2),
      py(y + h / 2),
      w * 1000 * mm,
      h * 1000 * mm,
      r * mm,
    );
  };
  // The LCD's window: a printed black surround, raised a hair at its
  // edge, the clear part within it.
  const win = { w: 0.128, h: 0.042 };
  if (as === 'colour') {
    c.fillStyle = print.band;
    rect(0, 0.051, FASCIA.w - 0.008, 0.01, 0.6);
    c.fill();
    c.fillStyle = '#ffffff';
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = `bold ${6 * mm}px Arial, sans-serif`;
    c.fillText(print.title, px(-0.08), py(0.051));
    c.textAlign = 'right';
    c.font = `bold ${4.4 * mm}px Arial, sans-serif`;
    c.fillText(`OT-216  ${print.tag}`, px(0.08), py(0.051));
    c.fillStyle = '#121512';
    rect(LCD_AT.x, LCD_AT.y, win.w, win.h, 2);
    c.fill();
  } else {
    c.fillStyle = grey(as === 'bump' ? 150 : 120);
    rect(LCD_AT.x, LCD_AT.y, win.w, win.h, 2);
    c.fill();
    c.fillStyle = grey(as === 'bump' ? 110 : 15);
    rect(LCD_AT.x, LCD_AT.y, 0.12, 0.034, 1);
    c.fill();
  }
  // The LED windows and their words.
  for (const [word, y] of LED_ROWS) {
    if (as === 'colour') {
      c.fillStyle = '#0d1a0c';
      c.beginPath();
      c.arc(px(0.055), py(y), 3.4 * mm, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = OT216_LIVERY.ink;
      c.textAlign = 'left';
      c.font = `bold ${4.6 * mm}px Arial, sans-serif`;
      c.fillText(word, px(0.062), py(y));
    } else {
      c.strokeStyle = grey(as === 'bump' ? 175 : 60);
      c.lineWidth = 0.7 * mm;
      c.beginPath();
      c.arc(px(0.055), py(y), 3.4 * mm, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = grey(as === 'bump' ? 120 : 20);
      c.beginPath();
      c.arc(px(0.055), py(y), 2.8 * mm, 0, Math.PI * 2);
      c.fill();
    }
  }
  // The keys: printed patches, raised a little, their rims embossed.
  for (const k of FASCIA_KEYS) {
    if (as === 'colour') {
      c.fillStyle = k.fill;
      rect(k.x, k.y, k.w, k.h, 2.4);
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 0.5 * mm;
      rect(k.x, k.y, k.w - 0.001, k.h - 0.001, 2.2);
      c.stroke();
      c.fillStyle = k.ink;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const lines = k.legend.split('\n');
      const size = (lines.length > 1 ? 4.2 : 6) * mm;
      c.font = `bold ${size}px Arial, sans-serif`;
      lines.forEach((line, i) =>
        c.fillText(
          line,
          px(k.x),
          py(k.y) + (i - (lines.length - 1) / 2) * size * 1.1,
          k.w * 1000 * mm * 0.86,
        ),
      );
    } else {
      // Its rim highest, the patch within a little lower: the dome's edge.
      c.fillStyle = grey(as === 'bump' ? 205 : 70);
      rect(k.x, k.y, k.w, k.h, 2.4);
      c.fill();
      c.fillStyle = grey(as === 'bump' ? 190 : 55);
      rect(k.x, k.y, k.w - 0.0018, k.h - 0.0018, 1.8);
      c.fill();
    }
  }
  if (as === 'colour') {
    // The key switch's legends.
    c.fillStyle = OT216_LIVERY.ink;
    c.textAlign = 'center';
    c.font = `bold ${3.6 * mm}px Arial, sans-serif`;
    c.fillText('LOCAL ACCESS', px(-0.012), py(-0.028));
    c.fillText('OFF   ON', px(-0.012), py(-0.058));
  }
}

/** The fascia's bump and roughness maps, drawn once per room's kit and shared by its terminals. */
const sharedMaps = new WeakMap<
  PanelKit,
  { bump: CanvasTexture; roughness: CanvasTexture }
>();
function fasciaMaps(kit: PanelKit) {
  const had = sharedMaps.get(kit);
  if (had) return had;
  const map = (as: 'bump' | 'roughness', flat: number) => {
    const texture = new CanvasTexture(
      fasciaCanvas((c, cw, ch, px, py, mm) => {
        c.fillStyle = `rgb(${flat},${flat},${flat})`;
        c.fillRect(0, 0, cw, ch);
        drawFascia(c, px, py, mm, as);
      }),
    );
    texture.anisotropy = 4;
    kit.textures.push(texture);
    return texture;
  };
  // The smooth polyester's flat: mid height, fairly glossy.
  const maps = { bump: map('bump', 128), roughness: map('roughness', 95) };
  sharedMaps.set(kit, maps);
  return maps;
}

const LED_ROWS = [
  ['RUN', 0.042],
  ['CALL', 0.03],
  ['ALARM', 0.018],
] as const;
const LED_COLOURS = ['#39e05a', '#ffb21f', '#ff3324'] as const;

/**
 * Chlorella Chemicals' OT-216 operator terminal (prompt 091; the owner,
 * 2026-10-27; after the Siemens OP3/OP7, the Allen-Bradley DTAM Micro
 * and the Mitsubishi FX-10DU). Specialist Chlorella equipment for
 * automating the distribution of chlorine round a plant (the owner,
 * 2026-10-28), so Chlorella's and not Penfold's: a deliberate exception
 * to the rule that control panels are Penfold's, as instruments keep
 * their own makers. A moulded green plastic clamshell of the 2000s in
 * Chlorella's livery (the owner, 2026-10-28): two shell halves meeting at
 * a parting line round the edge, rounded corners, a screw boss at each
 * corner and a slightly domed front, Chlorella's logo on it; about 240 ×
 * 168 × 60 mm (`OT216_CASE`) screwed to a wall, its chemical's band across the top, a 16 × 2
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
  // The clamshell (the owner, 2026-10-28): two halves of pale green
  // moulded plastic, slightly rough and textured, their rounded edges
  // meeting at the parting line; the front half's face domed a little.
  const livery = brandLivery(kit, 'chlorella');
  const plastic = t.paint(OT216_LIVERY.shell, 0.92);
  const radius = 0.008;
  const shell = (from: number, to: number) => {
    const mesh = new SceneMesh(
      new RoundedBoxGeometry(W, H, to - from, 4, radius),
      plastic,
    );
    mesh.position.set(0, 0, (from + to) / 2);
    group.add(mesh);
  };
  // Each half's rounded rim buried in the other's, so they meet square,
  // a fine gap between them at the parting line.
  const gap = 0.0007;
  shell(0, D / 2 - gap + radius);
  shell(D / 2 + gap - radius, D);
  // The parting line: the dark of the gap between the halves.
  t.box(
    group,
    t.paint('#2c3a26', 0.8),
    W - 0.0012,
    H - 0.0012,
    gap * 2,
    0,
    0,
    D / 2,
  );
  const dome = 0.002;
  const crown = new SceneMesh(new SphereGeometry(1, 32, 12), plastic);
  crown.scale.set(W / 2 - radius * 0.6, H / 2 - radius * 0.6, dome);
  crown.position.set(0, 0, D - 0.001);
  group.add(crown);
  // A screw boss at each corner, clear of the fascia, its screw in it.
  for (const [sx, sy] of [
    [-1, 1],
    [1, 1],
    [-1, -1],
    [1, -1],
  ]) {
    const bx = sx * (W / 2 - 0.0065);
    const by = sy * (H / 2 - 0.0065);
    t.cyl(group, plastic, 0.0055, 0.004, bx, by, D + 0.0002, 'z', 16);
    t.cyl(
      group,
      t.paint('#b9bcbc', 0.3, 0.8),
      0.0026,
      0.001,
      bx,
      by,
      D + 0.0024,
      'z',
      12,
    );
  }
  // The fascia (the owner, 2026-10-28): one flat, smooth, darker green
  // printed polyester overlay over the whole front, protecting the rougher
  // shell and wiping clean. Nothing on it is modelled: its band, legends,
  // keys, LED windows, the LCD's window and Chlorella's logo are printed
  // (its colour map, drawn once), and the keys' raised patches, embosses
  // and the window's edge are a bump map with a roughness map to match,
  // drawn once and shared by every terminal in the room (`fasciaMaps`).
  const z = D + dome;
  const maps = fasciaMaps(kit);
  const colour = fasciaCanvas((c, cw, ch, px, py, mm) => {
    c.fillStyle = OT216_LIVERY.fascia;
    c.fillRect(0, 0, cw, ch);
    drawFascia(c, px, py, mm, 'colour', { band, title, tag });
    const s = 7 * mm;
    drawBrandMark(c, livery.brand, px(0.03), py(-0.054), s);
    c.fillStyle = OT216_LIVERY.ink;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = wordmarkFont(livery.brand, 6.5 * mm);
    c.fillText(
      livery.brand.wordmark ?? livery.brand.name,
      px(0.036),
      py(-0.0535),
    );
  });
  const colourMap = new CanvasTexture(colour);
  colourMap.colorSpace = SRGBColorSpace;
  colourMap.anisotropy = 4;
  kit.textures.push(colourMap);
  const fasciaMaterial = new MeshStandardMaterial({
    map: colourMap,
    bumpMap: maps.bump,
    bumpScale: 0.6,
    roughnessMap: maps.roughness,
    roughness: 1,
  });
  kit.materials.push(fasciaMaterial);
  const fascia = new SceneMesh(
    new PlaneGeometry(FASCIA.w, FASCIA.h),
    fasciaMaterial,
  );
  fascia.position.set(0, 0, z);
  group.add(fascia);
  const lcd = createCharacterLcd(kit, { w: 0.116, h: 0.03 });
  lcd.mesh.position.set(LCD_AT.x, LCD_AT.y, z + 0.0002);
  group.add(lcd.mesh);
  // The clear window over it, a faint sheen.
  const glass = new SceneMesh(
    new PlaneGeometry(0.12, 0.034),
    new MeshStandardMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.08,
      roughness: 0.05,
    }),
  );
  kit.materials.push(glass.material as MeshStandardMaterial);
  glass.position.set(LCD_AT.x, LCD_AT.y, z + 0.0005);
  group.add(glass);
  // RUN, CALL and ALARM, flat behind their printed windows.
  const leds = LED_ROWS.map(([, y], i) => {
    const led = t.led(group, LED_COLOURS[i], 0.0026, 0.055, y, z + 0.0004);
    // Flat behind its window: its length is the mesh's y, turned to face out.
    led.mesh.scale.y = 0.3;
    led.mesh.userData.live = true;
    return led;
  });
  // The keys.
  let terminal = newOt216(read().link.powered);
  let time = 0;
  let beeps = 0;
  // Its legends printed on the fascia, not on a plate of its own.
  const access = keySwitch(kit, {
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
  for (const k of FASCIA_KEYS) {
    // A hit area on the flat fascia: the key is printed, not modelled.
    const area = fasciaKey(kit, {
      w: k.w,
      h: k.h,
      name: `${tag} ${k.legend.replace('\n', ' ')} key`,
      action: () => {
        press(k.key);
        const hold = currentUseHold();
        repeating =
          CURSOR.has(k.key) && hold.held ? { key: k.key, hold, held: 0 } : null;
      },
    });
    area.object.position.set(k.x, k.y, z);
    group.add(area.object);
    parts.add(area);
  }
  access.object.position.set(-0.012, -0.043, z);
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
