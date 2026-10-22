import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createBrandBadge } from '../../core/views/brand-badge';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { createPs1Material } from '../../core/parts/ps1-material';
import {
  createLouvres,
  createPowerMonitor,
  createRotaryIsolatorHandle,
} from '../../industrial-control/views/cabinet-fittings';
import { createDriveKeypad } from '../../industrial-control/views/industrial-displays';
import {
  createCharacterLcd,
  createPanelMeter,
} from '../../industrial-control/views/panel-instruments';
import {
  createPartSet,
  disconnectHandle,
  mushroomStop,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  batteryDisplay,
  batteryLamps,
  newCentralBattery,
  newStarter,
  pressStarter,
  pressTest,
  stepCentralBattery,
  stepStarter,
} from '../logic/electrical-room';
import type { BatteryTest, StarterMode } from '../logic/electrical-room';
import { plantTools } from './plant-tools';

/**
 * The leisure centre's electrical distribution, in metres, each modelled
 * at true size on a real product (named in its exhibit's reference) under
 * a maker of the game's own:
 *
 * - the LV main switchboard (Voltara), form 4: an incoming air circuit
 *   breaker, outgoing moulded-case breakers each behind its own door, and
 *   a metering section;
 * - the motor control centre (Hartwell & Bligh): starters and the drives'
 *   doors for the pool circulation pumps;
 * - a variable-speed drive (Grundflow, who make the pumps) on its pedestal;
 * - a TPN distribution board (Voltara) with its door glazed;
 * - enclosed rotary isolators (Voltara), as fitted beside every motor;
 * - cable tray and trunking (Bonk Industries);
 * - the generator connection point (Volt Xoccula);
 * - the emergency lighting central battery (Warden);
 * - the main earthing terminal bar (Gorskiy).
 *
 * Floor equipment stands on its origin facing +z; wall equipment has its
 * back at z = 0, facing +z.
 */

type Tools = ReturnType<typeof plantTools>;
type Parts = ReturnType<typeof createPartSet>;

/**
 * A working cabinet: its model, the parts a player works, and what it
 * does each frame (the shape of a gallery's working exhibit). The room
 * updates its parts; `update` does the rest.
 */
export interface WorkingCabinet {
  object: Group;
  parts: Parts;
  update(delta: number): void;
  dispose(): void;
}

/** Place `part` on a door's face at (x, y), and add it to `parts`. */
function mount<P extends Part>(
  parts: Parts,
  parent: Object3D,
  part: P,
  x: number,
  y: number,
  z: number,
): P {
  parts.add(part);
  part.object.position.set(x, y, z);
  parent.add(part.object);
  return part;
}

/** Mark everything under `object` as changing, so the room merges none of it. */
const live = (object: Object3D) =>
  object.traverse((o) => (o.userData.live = true));

const SEAM = '#5e6366';

/** A small printed legend plate, facing +z at (x, y, z). */
function legend(
  t: Tools,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  w = 0.09,
  h = 0.022,
  { ink = '#151515', fill = '#f2f2ec' } = {},
) {
  const label = t.printed(
    w,
    h,
    (c, cw, ch) => {
      c.fillStyle = fill;
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = ink;
      c.font = `bold ${ch * 0.55}px ${SANS}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, cw / 2, ch / 2);
    },
    256,
  );
  label.mesh.position.set(x, y, z);
  parent.add(label.mesh);
  return label.mesh;
}

/** The maker's nameplate in its livery, facing +z at `at`. */
function plate(
  L: BrandLivery,
  parent: Object3D,
  lines: readonly string[],
  at: readonly [number, number, number],
  w = 0.16,
  h = 0.09,
) {
  const mesh = L.nameplate(lines, w, h);
  mesh.position.set(...at);
  parent.add(mesh);
  return mesh;
}

/** A maker's badge on a nameplate, facing +z at (x, y, z). */
function badge(
  kit: PanelKit,
  parent: Object3D,
  id: BrandId,
  x: number,
  y: number,
  z: number,
  height = 0.03,
  plate?: string,
) {
  const mark = createBrandBadge(kit, id, { height, plate });
  mark.position.set(x, y, z);
  parent.add(mark);
  return mark;
}

/**
 * A hinged door panel `w` × `h` on a cubicle's face at z = `face`, its
 * middle at (x, y): the leaf, a dark seam round it, and a quarter-turn
 * lock near its free edge.
 */
function door(
  t: Tools,
  parent: Object3D,
  paint: Material,
  w: number,
  h: number,
  x: number,
  y: number,
  face: number,
) {
  t.box(parent, t.paint(SEAM, 0.6), w, h, 0.004, x, y, face + 0.002);
  t.box(parent, paint, w - 0.006, h - 0.006, 0.018, x, y, face + 0.009);
  t.cyl(
    parent,
    t.paint('#2a2b2d', 0.4),
    0.009,
    0.012,
    x + w / 2 - 0.03,
    y,
    face + 0.024,
    'z',
    12,
  );
}

/** A cubicle carcass: plinth, frame, roof and sides, `w` × `h` × `d`, its front at z = d / 2. */
function cubicle(
  t: Tools,
  parent: Object3D,
  paint: Material,
  w: number,
  h: number,
  d: number,
  x: number,
  shade: Material = t.paint('#2b2d2f', 0.6),
) {
  t.box(parent, shade, w, 0.1, d - 0.04, x, 0.05, 0);
  t.box(parent, paint, w, h - 0.1, d, x, 0.1 + (h - 0.1) / 2, 0);
  // The top cover's lip and the vertical seam between sections.
  t.box(parent, paint, w + 0.004, 0.02, d + 0.01, x, h - 0.01, 0);
  t.box(
    parent,
    t.paint(SEAM, 0.6),
    0.004,
    h - 0.1,
    d + 0.004,
    x - w / 2,
    0.1 + (h - 0.1) / 2,
    0,
  );
}

/**
 * An air circuit breaker's front, through its door's cut-out: the
 * after MasterPact MTZ2 face (441 × 439 mm), its trip unit's display,
 * the charging handle, ON and OFF push buttons and the racking window.
 */
function acbFront(t: Tools, parent: Object3D, x: number, y: number, z: number) {
  const black = t.paint('#1e1f21', 0.5);
  t.box(parent, black, 0.441, 0.439, 0.04, x, y, z + 0.02);
  // Trip unit (the electronic protection) with its screen.
  t.box(
    parent,
    t.paint('#2c2e31', 0.3),
    0.13,
    0.11,
    0.012,
    x + 0.11,
    y + 0.1,
    z + 0.046,
  );
  const screen = t.printed(
    0.07,
    0.045,
    (c, w, h) => {
      c.fillStyle = '#132b20';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#7ef0a8';
      c.font = `bold ${h * 0.28}px ${SANS}`;
      c.fillText('I 1 1 2 6 A', w * 0.08, h * 0.38);
      c.font = `${h * 0.2}px ${SANS}`;
      c.fillText('Ir 1600A  OK', w * 0.08, h * 0.75);
    },
    128,
    true,
  );
  screen.mesh.position.set(x + 0.11, y + 0.11, z + 0.053);
  parent.add(screen.mesh);
  // ON (green) and OFF (red) push buttons, the spring-charging handle.
  t.cyl(
    parent,
    t.paint('#1f8a3a', 0.4),
    0.017,
    0.012,
    x - 0.12,
    y + 0.08,
    z + 0.046,
    'z',
    16,
  );
  t.cyl(
    parent,
    t.paint('#c8261c', 0.4),
    0.017,
    0.012,
    x - 0.06,
    y + 0.08,
    z + 0.046,
    'z',
    16,
  );
  t.box(parent, black, 0.04, 0.16, 0.03, x - 0.09, y - 0.1, z + 0.055);
  // The state windows: O / I and CHARGED.
  legend(t, parent, 'O OFF', x - 0.09, y + 0.15, z + 0.041, 0.07, 0.022, {
    ink: '#141414',
    fill: '#2fbf4a',
  });
  legend(t, parent, 'DISCHARGED', x + 0.0, y + 0.15, z + 0.041, 0.07, 0.022, {
    ink: '#141414',
    fill: '#e8e3d0',
  });
}

/**
 * An MCCB's front behind its own door (form 4): the breaker's
 * door-coupled rotary handle, a red grip on a yellow ring that works it
 * (`disconnectHandle`, rotary), with the breaker's rating legend over it.
 * A spare way stands OFF.
 */
/**
 * Where a switchboard's breakers are bound to the world: each way, by its
 * legend, on or off there; `undefined` for a way the world does not know,
 * which keeps its own position.
 */
export interface SwitchboardFeed {
  on(legend: string): boolean | undefined;
  set(legend: string, on: boolean): void;
}

function mccbDoor(
  kit: PanelKit,
  t: Tools,
  parent: Object3D,
  paint: Material,
  w: number,
  h: number,
  x: number,
  y: number,
  face: number,
  name: string,
  parts: Parts,
  feed?: SwitchboardFeed,
) {
  door(t, parent, paint, w, h, x, y, face);
  // Bound, it shows and sets its way in the world; tripped counts as off.
  const bound =
    feed && feed.on(name) !== undefined
      ? {
          get value() {
            return feed.on(name) ? ('on' as const) : ('off' as const);
          },
          set: (p: 'on' | 'off' | 'tripped') => feed.set(name, p === 'on'),
        }
      : undefined;
  const handle = mount(
    parts,
    parent,
    disconnectHandle(kit, {
      style: 'rotary',
      initial: name.startsWith('SPARE') ? 'off' : 'on',
      bound,
      name: `MSB-1 ${name} breaker`,
    }),
    x,
    y - 0.01,
    face + 0.019,
  );
  legend(t, parent, name, x, y + h / 2 - 0.035, face + 0.019, w - 0.04, 0.024);
  return handle;
}

/**
 * The LV main switchboard: four PrismaSeT P-style sections, 650 mm wide,
 * 2000 mm high, 600 mm deep, form 4. Left to right: the incomer (air
 * circuit breaker, 1600 A), two sections of outgoing MCCBs, metering and
 * the bus section's cable chamber.
 */
export function createMainSwitchboard(
  kit: PanelKit,
  /** The world its ways feed, if bound (`switch-room.ts`). */
  feed?: SwitchboardFeed,
): WorkingCabinet {
  const t = plantTools(kit);
  const group = new Group();
  const parts = createPartSet();
  const L = brandLivery(kit, 'voltara');
  const paint = L.paint.casing;
  const w = 0.65,
    h = 2.0,
    d = 0.6,
    face = d / 2;
  const xs = [-0.975, -0.325, 0.325, 0.975];
  xs.forEach((x) => cubicle(t, group, paint, w, h, d, x, L.paint.shade));
  // The incomer: the ACB's door with its cut-out, a busbar chamber over it.
  door(t, group, paint, w - 0.02, 0.45, xs[0], 1.72, face);
  legend(
    t,
    group,
    'BUSBAR CHAMBER · DANGER 400 V',
    xs[0],
    1.86,
    face + 0.019,
    0.3,
    0.024,
    { fill: '#f0d21c' },
  );
  door(t, group, paint, w - 0.02, 0.62, xs[0], 1.17, face);
  acbFront(t, group, xs[0], 1.17, face + 0.018);
  legend(
    t,
    group,
    'INCOMER  ACB-1  1600 A',
    xs[0],
    1.52,
    face + 0.019,
    0.24,
    0.026,
  );
  door(t, group, paint, w - 0.02, 0.7, xs[0], 0.47, face);
  legend(t, group, 'INCOMING CABLES', xs[0], 0.72, face + 0.019, 0.2, 0.024);
  // Outgoing ways: three tiers of two MCCB doors in each of two sections.
  // The building's own loads: the motor control centre, each plant room's
  // board, the boiler house, the air plant's handling units, lighting and
  // small power, the emergency lighting battery and the BMS's UPS.
  const ways = [
    ['MCC-1 400 A', 'DB-OLYMPIC 160 A'],
    ['DB-LOUNGE 100 A', 'DB-SPAS 63 A'],
    ['DB-BOILERS 100 A', 'DB-AIR PLANT 250 A'],
    ['DB-LIGHTING 160 A', 'DB-SMALL POWER 125 A'],
    ['EM BATT 63 A', 'UPS BMS 32 A'],
    ['SPARE 125 A', 'SPARE 160 A'],
  ];
  const breakers: { on: { value: boolean }; amps: number }[] = [];
  for (let s = 0; s < 2; s++)
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 2; c++) {
        const x = xs[1 + s] + (c - 0.5) * 0.315;
        const y = 1.6 - r * 0.46;
        const name = ways[s * 3 + r][c];
        const handle = mccbDoor(
          kit,
          t,
          group,
          paint,
          0.305,
          0.44,
          x,
          y,
          face,
          name,
          parts,
          feed,
        );
        // What the way draws, on average: about 40 % of its rating.
        breakers.push({
          on: handle.on,
          amps: 0.4 * parseInt(name.split(' ').at(-2) ?? '0', 10),
        });
      }
  for (const x of [xs[1], xs[2]]) {
    door(t, group, paint, w - 0.02, 0.32, x, 0.27, face);
    legend(
      t,
      group,
      'OUTGOING CABLE CHAMBER',
      x,
      0.36,
      face + 0.019,
      0.24,
      0.022,
    );
  }
  // Metering: a multifunction meter, three ammeters and a voltmeter.
  door(t, group, paint, w - 0.02, 0.62, xs[3], 1.6, face);
  const monitor = createPowerMonitor(kit);
  monitor.group.position.set(xs[3], 1.72, face + 0.019);
  group.add(monitor.group);
  const ammeters = ['L1', 'L2', 'L3'].map((phase, i) => {
    const meter = createPanelMeter(kit, 'A', { width: 0.072, scaleMax: 1600 });
    meter.group.position.set(xs[3] + (i - 1) * 0.12, 1.5, face + 0.019);
    group.add(meter.group);
    legend(
      t,
      group,
      phase,
      xs[3] + (i - 1) * 0.12,
      1.44,
      face + 0.019,
      0.03,
      0.016,
    );
    return meter;
  });
  legend(t, group, 'METERING', xs[3], 1.86, face + 0.019, 0.14, 0.024);
  door(t, group, paint, w - 0.02, 1.2, xs[3], 0.71, face);
  const vents = createLouvres(kit, 0.4, 0.12, paint);
  vents.position.set(xs[3], 0.3, face + 0.018);
  group.add(vents);
  // The maker and the board's name.
  badge(
    kit,
    group,
    'voltara',
    xs[0],
    1.97 - 0.06,
    face + 0.02,
    0.035,
    '#e9eae5',
  );
  legend(
    t,
    group,
    'MAIN LV SWITCHBOARD  MSB-1',
    0,
    1.94,
    face + 0.02,
    0.5,
    0.04,
    { ink: L.palette.onMain, fill: L.palette.main },
  );
  plate(
    L,
    group,
    [
      'Prisma-type 4-section board, form 4b',
      '400/230 V 3ph+N 50 Hz  In 1600 A',
      'Icw 50 kA 1 s  IP31  BS EN 61439-2',
    ],
    [xs[3] + 0.2, 0.45, face + 0.02],
    0.16,
    0.08,
  );
  // The incomer carries what the ways on draw, a little unevenly by phase;
  // the meters read it.
  let shown = -1;
  live(monitor.group);
  for (const m of ammeters) live(m.group);
  return {
    object: group,
    parts,
    update(delta) {
      const amps = breakers.reduce(
        (sum, b) => sum + (b.on.value ? b.amps : 0),
        0,
      );
      ammeters.forEach((m, i) => {
        m.set(Math.min(1, (amps * (0.97 + 0.03 * i)) / 1600));
        m.update(delta);
      });
      if (Math.round(amps) !== shown) {
        shown = Math.round(amps);
        // 400 V three-phase, as given; a power factor of 0.9.
        monitor.show(
          400,
          shown,
          Math.round((Math.sqrt(3) * 400 * amps * 0.9) / 1000),
        );
      }
    },
    dispose() {
      parts.dispose();
    },
  };
}

/**
 * The motor control centre: three 600 mm sections, 2000 mm high, 500 mm
 * deep. Two hold the circulation pumps' variable-speed drives (each door
 * carries the drive's keypad, a door-coupled isolator and RUN / TRIP
 * lamps); the third holds direct-on-line starters in 300 mm buckets.
 */
export function createMotorControlCentre(kit: PanelKit): WorkingCabinet {
  const t = plantTools(kit);
  const group = new Group();
  const parts = createPartSet();
  const L = brandLivery(kit, 'hartwell-bligh');
  const paint = L.paint.casing;
  const w = 0.6,
    h = 2.0,
    d = 0.5,
    face = d / 2;
  const z = face + 0.019;
  const xs = [-0.6, 0, 0.6];
  xs.forEach((x) => cubicle(t, group, paint, w, h, d, x, L.paint.shade));
  /** Each starter, its state, and what its door shows from it. */
  const starters: {
    state: ReturnType<typeof newStarter>;
    isolator: { on: { value: boolean } };
    mode: () => StarterMode;
    stop?: { pushed: { value: boolean } };
    demand: boolean;
    run: ReturnType<typeof signal<boolean>>;
    trip: ReturnType<typeof signal<boolean>>;
    meter?: ReturnType<typeof createPanelMeter>;
  }[] = [];
  const buttons = (k: number, x: number, y: number, reset: boolean) => {
    (
      [
        ['START', 'green', 'start'],
        ['STOP', 'red', 'stop'],
        ...(reset ? ([['RESET', 'blue', 'reset']] as const) : []),
      ] as const
    ).forEach(([legendText, colour, key], i) =>
      mount(
        parts,
        group,
        pushButton(kit, {
          colour,
          legend: legendText,
          name: `MCC-1 starter ${k + 1} ${legendText}`,
          action: () => {
            starters[k].state = pressStarter(starters[k].state, key);
          },
        }),
        x + i * 0.09,
        y,
        z,
      ),
    );
  };
  // The circulation pumps' drives: each door its drive's keypad, its
  // isolator, HAND-OFF-AUTO, START, STOP and RESET, RUN and TRIP lamps,
  // and an emergency stop. In AUTO the duty pump runs, the standby waits.
  // The Olympic pool's circulation pumps, the plant's largest motors,
  // each on its drive (their local isolators by the pumps, `P-101A
  // isolator` and `P-101B isolator`, are in the world state).
  ['P-101A OLYMPIC DUTY', 'P-101B OLYMPIC SBY'].forEach((name, i) => {
    const x = xs[i];
    const k = starters.length;
    door(t, group, paint, w - 0.02, 1.55, x, 1.0, face);
    const keypad = createDriveKeypad(kit);
    keypad.group.position.set(x - 0.12, 1.4, z);
    group.add(keypad.group);
    const isolator = mount(
      parts,
      group,
      disconnectHandle(kit, {
        style: 'rotary',
        initial: 'on',
        name: `MCC-1 ${name} isolator`,
      }),
      x + 0.15,
      1.4,
      z,
    );
    const hoa = mount(
      parts,
      group,
      selector(kit, {
        positions: 3,
        initial: 2,
        legend: 'HAND · OFF · AUTO',
        name: `MCC-1 ${name} HAND OFF AUTO`,
      }),
      x + 0.15,
      1.16,
      z,
    );
    const run = signal(false);
    const trip = signal(false);
    (
      [
        ['RUN', 'green', run],
        ['TRIP', 'amber', trip],
      ] as const
    ).forEach(([legendText, colour, drive], j) =>
      mount(
        parts,
        group,
        pilotLight(kit, {
          colour,
          legend: legendText,
          drive,
          name: `MCC-1 ${name} ${legendText} lamp`,
        }),
        x - 0.18 + j * 0.09,
        1.16,
        z,
      ),
    );
    buttons(k, x - 0.18, 0.96, true);
    const stop = mount(
      parts,
      group,
      mushroomStop(kit, { name: `MCC-1 ${name} emergency stop` }),
      x + 0.15,
      0.94,
      z,
    );
    starters.push({
      state: newStarter('vsd'),
      isolator,
      mode: () => (['hand', 'off', 'auto'] as const)[hoa.position.value],
      stop,
      demand: i === 0,
      run,
      trip,
    });
    legend(t, group, `${name}  45 kW VSD`, x, 1.68, z, 0.42, 0.026);
    const vents = createLouvres(kit, 0.36, 0.14, paint);
    vents.position.set(x, 0.42, face + 0.018);
    group.add(vents);
  });
  // Direct-on-line starters, one bucket each: its ammeter, START and
  // STOP, RUN lamp and isolator. Those in service were left started.
  // The lounge pool's pumps, the boiler house's LTHW circulator (one
  // twin-head pump, a motor each head) and the wet hall's make-up booster
  // set: duty running, standby waiting.
  const dol = [
    ['P-201A LOUNGE', true],
    ['P-201B LOUNGE SBY', false],
    ['P-501A LTHW', true],
    ['P-501B LTHW SBY', false],
    ['P-601 MAKE-UP BOOSTER', true],
  ] as const;
  dol.forEach(([name, started], i) => {
    const y = 1.72 - i * 0.31;
    const k = starters.length;
    door(t, group, paint, w - 0.02, 0.3, xs[2], y, face);
    legend(t, group, name, xs[2] - 0.06, y + 0.11, z, 0.3, 0.022);
    const meter = createPanelMeter(kit, 'A', { width: 0.06, scaleMax: 30 });
    meter.group.position.set(xs[2] - 0.21, y - 0.03, z);
    group.add(meter.group);
    live(meter.group);
    buttons(k, xs[2] - 0.11, y - 0.04, false);
    const run = signal(false);
    mount(
      parts,
      group,
      pilotLight(kit, {
        colour: 'green',
        legend: 'RUN',
        drive: run,
        name: `MCC-1 ${name} RUN lamp`,
      }),
      xs[2] + 0.07,
      y - 0.04,
      z,
    );
    const isolator = mount(
      parts,
      group,
      disconnectHandle(kit, {
        style: 'rotary',
        initial: 'on',
        name: `MCC-1 ${name} isolator`,
      }),
      xs[2] + 0.2,
      y - 0.02,
      z,
    );
    starters.push({
      state: started
        ? pressStarter(newStarter('dol'), 'start')
        : newStarter('dol'),
      isolator,
      mode: () => 'hand',
      demand: false,
      run,
      trip: signal(false),
      meter,
    });
  });
  legend(
    t,
    group,
    'MOTOR CONTROL CENTRE  MCC-1',
    0,
    1.94,
    face + 0.02,
    0.5,
    0.04,
    { ink: L.palette.onMain, fill: L.palette.main },
  );
  badge(
    kit,
    group,
    'hartwell-bligh',
    xs[0],
    1.89,
    face + 0.02,
    0.03,
    '#e9eae5',
  );
  plate(
    L,
    group,
    [
      'MCC form 4 type 6, 400 V 3ph 50 Hz',
      'Busbars 630 A, Icw 35 kA 1 s',
      'IP42  BS EN 61439-2',
    ],
    [xs[2] + 0.17, 0.2, face + 0.02],
    0.16,
    0.08,
  );
  return {
    object: group,
    parts,
    update(delta) {
      for (const st of starters) {
        st.state = stepStarter(
          st.state,
          {
            isolatorOn: st.isolator.on.value,
            mode: st.mode(),
            stopped: st.stop?.pushed.value,
            demand: st.demand,
          },
          delta,
        );
        st.run.value = st.state.running;
        st.trip.value = st.state.tripped;
        // A full-load current of about 20 A on a 30 A scale.
        if (st.meter) {
          st.meter.set(Math.min(1, (st.state.current * 20) / 30));
          st.meter.update(delta);
        }
      }
    },
    dispose() {
      parts.dispose();
    },
  };
}

/**
 * A variable-speed drive for a circulation pump, after Danfoss's VLT AQUA
 * Drive FC 202 in its D1h enclosure (IP54, about 901 × 325 × 378 mm) on
 * its 400 mm floor pedestal: a dark body, the control panel's keypad, the
 * cooling fins down each side, and the cable entry below.
 */
export function createVariableSpeedDrive(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const L = brandLivery(kit, 'grundflow');
  const body = L.paint.casing;
  const front = L.paint.main;
  const plinth = 0.4,
    w = 0.325,
    h = 0.901,
    d = 0.378;
  // The pedestal, and the drive on it.
  t.box(group, L.paint.shade, w, plinth, d - 0.03, 0, plinth / 2, 0);
  t.box(group, body, w, h, d, 0, plinth + h / 2, 0);
  t.box(
    group,
    front,
    w - 0.03,
    h - 0.08,
    0.012,
    0,
    plinth + h / 2 + 0.01,
    d / 2 + 0.006,
  );
  // Fins down each side.
  for (const side of [-1, 1])
    for (let i = 0; i < 9; i++)
      t.box(
        group,
        t.paint('#2c2f31', 0.5),
        0.012,
        h - 0.2,
        0.012,
        (side * w) / 2 + side * 0.006,
        plinth + h / 2,
        -d / 2 + 0.05 + i * 0.03,
      );
  const keypad = createDriveKeypad(kit);
  keypad.group.position.set(0, plinth + h - 0.2, d / 2 + 0.012);
  group.add(keypad.group);
  badge(
    kit,
    group,
    'grundflow',
    0,
    plinth + h - 0.06,
    d / 2 + 0.013,
    0.025,
    '#d9dbd6',
  );
  plate(
    L,
    group,
    ['45 kW  400 V 3ph  90 A', 'IP54  0–100 Hz  pump duty', 'S/N 20-4471-0912'],
    [0, plinth + 0.25, d / 2 + 0.013],
    0.14,
    0.075,
  );
  // Cables into the gland plate below, from the floor.
  for (const x of [-0.08, 0, 0.08])
    t.rod(
      group,
      t.paint('#141414', 0.6),
      [x, 0.05, 0],
      [x, plinth, 0],
      0.014,
      10,
    );
  return group;
}

/**
 * A three-phase distribution board, after Hager's JK112B (12-way TPN,
 * 125 A, 850 × 465 × 132.5 mm), here with its glazed door: the incoming
 * switch at the top and twelve ways of three MCBs, one per phase, each
 * way's circuit chart beside it.
 */
export function createDistributionBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const L = brandLivery(kit, 'voltara');
  const white = L.paint.casing;
  const w = 0.465,
    h = 0.85,
    d = 0.1325;
  t.box(group, white, w, h, d, 0, 0, d / 2);
  t.box(group, L.paint.tint, w - 0.08, h - 0.1, 0.004, 0, -0.01, d + 0.001);
  // The incomer: a 125 A switch disconnector.
  t.box(
    group,
    t.paint('#f3f3ef', 0.4),
    0.072,
    0.09,
    0.03,
    0,
    h / 2 - 0.12,
    d + 0.015,
  );
  t.box(
    group,
    t.paint('#c8261c', 0.4),
    0.05,
    0.02,
    0.02,
    0,
    h / 2 - 0.12,
    d + 0.035,
  );
  // The MCB rows: three single-pole devices (18 mm) per way.
  const mcb = t.paint('#f6f6f2', 0.4);
  const toggle = t.paint('#1b1b1c', 0.4);
  for (let way = 0; way < 12; way++) {
    const y = h / 2 - 0.22 - way * 0.045;
    for (let p = 0; p < 3; p++) {
      const x = (p - 1) * 0.019;
      t.box(group, mcb, 0.0175, 0.04, 0.03, x, y, d + 0.015);
      t.box(
        group,
        toggle,
        0.008,
        0.012,
        0.012,
        x,
        y + (way === 9 && p === 1 ? -0.006 : 0.006),
        d + 0.034,
      );
    }
  }
  legend(
    t,
    group,
    'DB-POOL  12-WAY TPN 125 A',
    0,
    h / 2 - 0.04,
    d + 0.02,
    0.3,
    0.03,
  );
  // The circuit chart, inside the door.
  const chart = t.printed(
    0.12,
    0.5,
    (c, cw, ch) => {
      c.fillStyle = '#fbfaf3';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#202020';
      c.font = `${ch * 0.024}px ${SANS}`;
      const names = [
        'Pumps P-101',
        'Pumps P-102',
        'UV-101',
        'Dosing',
        'Analyser',
        'BMS panel',
        'Plant lights',
        'Sockets',
        'AHU ctrl',
        'Spare (tripped)',
        'Spare',
        'Spare',
      ];
      names.forEach((n, i) =>
        c.fillText(`${i + 1}. ${n}`, cw * 0.06, ch * (0.06 + i * 0.075)),
      );
    },
    128,
  );
  chart.mesh.position.set(0.15, -0.02, d + 0.003);
  group.add(chart.mesh);
  // The glazed door, slightly open.
  const glass = createPs1Material({
    color: '#cfe3e6',
    transparent: true,
    opacity: 0.25,
    roughness: 0.1,
  });
  kit.materials.push(glass);
  const leaf = new Group();
  leaf.position.set(-w / 2, 0, d + 0.005);
  leaf.rotation.y = -0.35;
  t.box(leaf, white, w, h, 0.012, w / 2, 0, 0);
  group.add(leaf);
  t.box(leaf, glass, w - 0.08, h - 0.12, 0.014, w / 2, 0, 0.001);
  badge(kit, group, 'voltara', 0, -h / 2 + 0.04, d + 0.002, 0.02);
  return group;
}

/**
 * Enclosed rotary isolators, after Eaton's P3-63/I4/SVB and its larger
 * sibling: grey moulded boxes with a red-on-yellow lockable handle, as
 * every motor has beside it so it can be locked off for work. Three sizes
 * on a board, one locked off with a padlock.
 */
export function createIsolatorBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const casing = brandLivery(kit, 'voltara').paint.casing;
  t.box(group, t.paint('#9a9e9c', 0.8), 1.2, 0.6, 0.02, 0, 0, 0.01);
  const sizes = [
    ['20 A  P-301 DOSING', 0.1, 0.14, 0.09],
    ['63 A  AB-301 BLOWER', 0.125, 0.19, 0.12],
    ['100 A  P-101 PUMP', 0.16, 0.25, 0.14],
  ] as const;
  sizes.forEach(([name, w, h, d], i) => {
    const x = -0.4 + i * 0.4;
    t.box(group, casing, w, h, d, x, 0, 0.02 + d / 2);
    const handle = createRotaryIsolatorHandle(kit, { on: i !== 2 });
    handle.group.position.set(x, 0.02, 0.02 + d);
    group.add(handle.group);
    legend(t, group, name, x, -0.24, 0.021, 0.2, 0.026);
    if (i === 2) {
      // Locked off for maintenance: a red padlock and a tag.
      t.box(
        group,
        t.paint('#c8261c', 0.4),
        0.03,
        0.035,
        0.018,
        x - 0.055,
        -0.03,
        0.02 + d + 0.02,
      );
      legend(
        t,
        group,
        'DANGER  DO NOT OPERATE',
        x - 0.055,
        -0.1,
        0.02 + d + 0.025,
        0.07,
        0.05,
        { ink: '#ffffff', fill: '#b5211b' },
      );
    }
  });
  badge(kit, group, 'voltara', 0.45, 0.24, 0.021, 0.025);
  return group;
}

/**
 * Cable management: a 2 m run of 300 mm medium-duty return-flange cable
 * tray (after Unitrunk's MR300, 25 mm flanges), perforated and
 * galvanised, carrying armoured cables on cleats; and beside it 100 ×
 * 100 mm steel trunking with its lid off. On two stands, 1.2 m up.
 */
export function createCableTray(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const galv = t.paint('#b6bbbb', 0.4, 0.6);
  const L = 2,
    y = 1.2;
  // Stands, and a cross-arm under each end.
  for (const x of [-0.8, 0.8]) {
    t.box(group, galv, 0.041, y, 0.041, x, y / 2, -0.25);
    t.box(group, galv, 0.041, 0.041, 0.7, x, y - 0.02, 0);
  }
  // The tray: its floor, perforated (slots printed), and return flanges.
  const perforation = t.printed(
    L,
    0.3,
    (c, cw, ch) => {
      c.fillStyle = '#b6bbbb';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#3d4244';
      for (let x = 8; x < cw; x += 24)
        for (const yy of [0.2, 0.5, 0.8]) c.fillRect(x, ch * yy - 3, 12, 6);
    },
    512,
  );
  perforation.mesh.rotation.x = -Math.PI / 2;
  perforation.mesh.position.set(0, y + 0.002, 0.12);
  group.add(perforation.mesh);
  for (const z of [-0.03, 0.27]) {
    t.box(group, galv, L, 0.025, 0.002, 0, y + 0.0125, z);
    t.box(
      group,
      galv,
      L,
      0.002,
      0.012,
      0,
      y + 0.025,
      z + (z < 0.1 ? 0.006 : -0.006),
    );
  }
  // Armoured cables (black SWA) laid on it.
  [0.03, 0.08, 0.13, 0.18, 0.22].forEach((z, i) =>
    t.rod(
      group,
      t.paint('#161616', 0.6),
      [-L / 2 - 0.1, y + 0.02, z],
      [L / 2 + 0.1, y + 0.02, z],
      0.012 + (i % 2) * 0.006,
      10,
    ),
  );
  // The trunking, lid off, with singles inside.
  t.box(group, galv, L, 0.003, 0.1, 0, y - 0.003, -0.15);
  for (const z of [-0.2, -0.1])
    t.box(group, galv, L, 0.1, 0.002, 0, y + 0.047, z);
  ['#8b5a2b', '#141414', '#7d7d7d', '#2c58b0', '#3a9b3a'].forEach((colour, i) =>
    t.rod(
      group,
      t.paint(colour, 0.5),
      [-L / 2, y + 0.012, -0.18 + i * 0.012],
      [L / 2, y + 0.012, -0.18 + i * 0.012],
      0.004,
      6,
    ),
  );
  badge(kit, group, 'bonk-industries', 0.7, y + 0.05, 0.28, 0.02);
  return group;
}

/**
 * The generator connection point, after a 400 A generator connection box
 * (Union Connector's GCB, 762 × 610 × 254 mm): a steel cabinet on the
 * wall by the plant room's outside door whose lower flap opens on five
 * single-pole inlets (L1 brown, L2 black, L3 grey, N blue, earth green
 * and yellow) for a hired generator's cables when the supply fails.
 */
export function createGeneratorConnection(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const L = brandLivery(kit, 'volt-xoccula');
  const steel = L.paint.casing;
  const w = 0.61,
    h = 0.762,
    d = 0.254;
  t.box(group, steel, w, h, d, 0, 0, d / 2);
  door(t, group, steel, w - 0.03, 0.4, 0, 0.16, d);
  legend(
    t,
    group,
    'GENERATOR CONNECTION  400 A',
    0,
    0.3,
    d + 0.02,
    0.36,
    0.036,
    { ink: '#141414', fill: '#f0d21c' },
  );
  legend(
    t,
    group,
    'ISOLATE AT MSB-1 BEFORE CONNECTING',
    0,
    0.22,
    d + 0.02,
    0.36,
    0.026,
  );
  // The flap, swung down, and the inlets behind it.
  const inside = t.paint('#2a2c2d', 0.6);
  t.box(group, inside, w - 0.04, 0.3, 0.01, 0, -0.2, d - 0.02);
  const colours = ['#7a4a22', '#141414', '#8a8a8a', '#2050b0', '#3a9b3a'];
  colours.forEach((colour, i) => {
    const x = -0.22 + i * 0.11;
    t.cyl(group, t.paint(colour, 0.45), 0.034, 0.06, x, -0.2, d - 0.0, 'z', 20);
    t.cyl(
      group,
      t.paint('#d8b74a', 0.3, 0.8),
      0.012,
      0.02,
      x,
      -0.2,
      d + 0.035,
      'z',
      12,
    );
    legend(
      t,
      group,
      ['L1', 'L2', 'L3', 'N', 'E'][i],
      x,
      -0.28,
      d - 0.012,
      0.04,
      0.018,
    );
  });
  const flap = t.box(group, steel, w - 0.03, 0.3, 0.018, 0, -0.39, d + 0.12);
  flap.rotation.x = -1.3;
  badge(kit, group, 'volt-xoccula', 0.2, -0.36, d - 0.012, 0.022);
  return group;
}

/**
 * The emergency lighting central battery, after RP-Technik's MultiControl
 * MCS (EN 50171; 1800 × 600 × 450 mm): a free-standing cabinet whose
 * upper door carries the monitoring display, status lamps and test keys
 * over louvred battery compartments.
 */
export function createCentralBattery(kit: PanelKit): WorkingCabinet {
  const t = plantTools(kit);
  const group = new Group();
  const parts = createPartSet();
  const L = brandLivery(kit, 'warden');
  const paint = L.paint.casing;
  const w = 0.6,
    h = 1.8,
    d = 0.45;
  const z = d / 2 + 0.019;
  t.box(group, t.paint('#2b2d2f', 0.6), w - 0.02, 0.1, d - 0.04, 0, 0.05, 0);
  t.box(group, paint, w, h - 0.1, d, 0, 0.1 + (h - 0.1) / 2, 0);
  door(t, group, paint, w - 0.02, 0.6, 0, 1.45, d / 2);
  door(t, group, paint, w - 0.02, 1.0, 0, 0.62, d / 2);
  // The controller's 20 × 4 backlit character LCD, at its true size.
  const screen = createCharacterLcd(kit, {
    columns: 20,
    rows: 4,
    cell: 0.003,
    backlight: true,
  });
  screen.group.position.set(0, 1.57, z);
  group.add(screen.group);
  live(screen.group);
  let battery = newCentralBattery();
  const lamps = {
    mains: signal(true),
    charging: signal(false),
    fault: signal(false),
    low: signal(false),
  };
  (
    [
      ['MAINS', 'green', lamps.mains],
      ['CHARGE', 'green', lamps.charging],
      ['FAULT', 'amber', lamps.fault],
      ['BATT LOW', 'red', lamps.low],
    ] as const
  ).forEach(([legendText, colour, drive], i) =>
    mount(
      parts,
      group,
      pilotLight(kit, {
        colour,
        legend: legendText,
        drive,
        name: `Central battery ${legendText} lamp`,
      }),
      -0.195 + i * 0.13,
      1.4,
      z,
    ),
  );
  // The monthly and yearly tests (BS 5266-1), each on its own key; a
  // second press ends a test early.
  (
    [
      ['FUNCTION TEST', 'function'],
      ['DURATION TEST', 'duration'],
    ] as const
  ).forEach(([legendText, kind]: readonly [string, BatteryTest], i) =>
    mount(
      parts,
      group,
      pushButton(kit, {
        colour: 'black',
        head: 'flush',
        legend: legendText,
        name: `Central battery ${legendText}`,
        action: () => {
          battery = pressTest(battery, kind);
        },
      }),
      -0.1 + i * 0.2,
      1.24,
      z,
    ),
  );
  for (const y of [0.35, 0.85]) {
    const louvres = createLouvres(kit, 0.4, 0.14, paint);
    louvres.position.set(0, y, d / 2 + 0.018);
    group.add(louvres);
  }
  legend(
    t,
    group,
    'EMERGENCY LIGHTING CENTRAL BATTERY',
    0,
    1.72,
    d / 2 + 0.02,
    0.4,
    0.03,
    { ink: '#ffffff', fill: '#1f8a3a' },
  );
  badge(kit, group, 'warden', -0.16, 1.66, d / 2 + 0.02, 0.025);
  plate(
    L,
    group,
    [
      'Central battery 216 V DC, 3 h',
      'EN 50171  BS 5266-1',
      'Batteries: 18 × 12 V 65 Ah',
    ],
    [0.18, 0.16, d / 2 + 0.02],
    0.15,
    0.075,
  );
  return {
    object: group,
    parts,
    update(delta) {
      battery = stepCentralBattery(battery, delta);
      const lit = batteryLamps(battery);
      lamps.mains.value = lit.mains;
      lamps.charging.value = lit.charging;
      lamps.fault.value = lit.fault;
      lamps.low.value = lit.low;
      screen.show(batteryDisplay(battery));
    },
    dispose() {
      parts.dispose();
    },
  };
}

/**
 * The main earthing terminal, after Furse's LK245-12 (750 mm, 12 ways,
 * with disconnecting link): a tinned copper bar on two insulators on the
 * wall, its link bolted across the gap, green-and-yellow earth conductors
 * bonded to it and its warning label.
 */
export function createEarthBar(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const copper = t.paint('#c47a45', 0.35, 0.85);
  const L = 0.75;
  for (const x of [-L / 2 + 0.05, L / 2 - 0.05])
    t.cyl(group, t.paint('#c8261c', 0.5), 0.02, 0.06, x, 0, 0.03, 'z', 14);
  t.box(group, copper, L, 0.05, 0.006, 0, 0, 0.065);
  // The disconnecting link across a gap in the bar, a third along.
  t.box(
    group,
    t.paint('#d8dad8', 0.3, 0.8),
    0.08,
    0.04,
    0.008,
    -0.12,
    0,
    0.073,
  );
  // Twelve bolted ways; nine with conductors running up to the ceiling void.
  for (let i = 0; i < 12; i++) {
    const x = -L / 2 + 0.07 + i * 0.055;
    t.cyl(
      group,
      t.paint('#d8dad8', 0.3, 0.8),
      0.006,
      0.014,
      x,
      0,
      0.074,
      'z',
      10,
    );
    if (i < 9 && Math.abs(x + 0.12) > 0.05) {
      const ge = t.rod(
        group,
        t.paint('#3a9b3a', 0.5),
        [x, 0.01, 0.08],
        [x, 0.45, 0.06],
        0.006,
        8,
      );
      ge.name = 'Earth conductor';
      for (let s = 0.08; s < 0.44; s += 0.08)
        t.rod(
          group,
          t.paint('#e8c215', 0.5),
          [x, s, 0.077],
          [x, s + 0.03, 0.074],
          0.0065,
          8,
        );
    }
  }
  const label = t.printed(
    0.2,
    0.07,
    (c, cw, ch) => {
      c.fillStyle = '#f2f2ec';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#141414';
      c.font = `bold ${ch * 0.2}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText('SAFETY ELECTRICAL CONNECTION', cw / 2, ch * 0.4);
      c.fillText('DO NOT REMOVE', cw / 2, ch * 0.75);
    },
    256,
  );
  label.mesh.position.set(0.15, -0.09, 0.02);
  group.add(label.mesh);
  badge(kit, group, 'gorskiy', -0.25, -0.07, 0.02, 0.02);
  legend(t, group, 'MAIN EARTHING TERMINAL  MET', 0, 0.1, 0.02, 0.3, 0.03);
  return group;
}
