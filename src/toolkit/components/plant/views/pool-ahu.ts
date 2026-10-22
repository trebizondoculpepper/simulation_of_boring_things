import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import {
  createPartSet,
  disconnectHandle,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createDialGauge } from '../../industrial-control/views/dial-gauge';
import { badge, nameplate, sign } from './air-handling';
import { plantTools } from './plant-tools';
import { mergeStatic } from '../../core/views/merge-static';
import {
  ahuDisplay,
  ahuLamps,
  changeFilters,
  newAhu,
  resetAhu,
  stepAhu,
} from '../logic/pool-ahu';
import type { AhuMode, AhuState } from '../logic/pool-ahu';
import { ductSize } from '../../../../game/plant-sizing/ahu-range';
import type { AhuSize } from '../../../../game/plant-sizing/ahu-range';

/**
 * The pool halls' air handling units, after the Dantherm DanX XWPS range
 * (`ahu-range.ts`), at each size's true casing, and the stacks they stand
 * in. Each is a working unit (`logic/pool-ahu.ts`): its dampers open and
 * its fans run up behind their inspection windows; its controller on its
 * front has its isolator, HAND-OFF-AUTO, RESET and FILTERS CHANGED, RUN,
 * HEAT PUMP, FILTER and FAULT lamps, a filter pressure gauge and a 16 × 2
 * display. Ours are Mistral's.
 *
 * Every unit's state is kept in one place (`airHouse`), stepped once a
 * frame whoever asks first, so the stacks and the air plant's mimic show
 * the same plant.
 */

type Tools = ReturnType<typeof plantTools>;

/** One unit as the air plant knows it. */
export interface AirUnitSpec {
  tag: string;
  serves: string;
  /** Its hall, whose time programme (occupied or not) it follows in AUTO. */
  hall: string;
  size: AhuSize;
  airflow: number;
}

/** The air plant's units, their controls, and what each hall's programme asks. */
export const airHouse = {
  units: new Map<string, AhuState>(),
  isolator: new Map<string, () => boolean>(),
  mode: new Map<string, () => AhuMode>(),
  /** Each hall's programme: occupied, so its units run in AUTO. */
  occupied: new Map<string, boolean>(),
  hall: new Map<string, string>(),
  airflow: new Map<string, number>(),
  last: -1,
};

/** A unit known to the air plant, fresh, its hall occupied, unless already known. */
export function registerAirUnit(u: AirUnitSpec) {
  if (!airHouse.units.has(u.tag))
    airHouse.units.set(
      u.tag,
      // Running already, as found on arrival: dampers open, fans up.
      newAhu({ dampers: 1, speed: 1, filterPa: 90 + (u.airflow % 97) }),
    );
  airHouse.hall.set(u.tag, u.hall);
  airHouse.airflow.set(u.tag, u.airflow);
  if (!airHouse.occupied.has(u.hall)) airHouse.occupied.set(u.hall, true);
}

/** Step every unit to `now` (seconds), once however many ask. */
export function advanceAirPlant(now: number) {
  if (airHouse.last < 0) airHouse.last = now;
  const dt = Math.min(1, now - airHouse.last);
  if (dt <= 0) return;
  airHouse.last = now;
  for (const [tag, s] of airHouse.units)
    airHouse.units.set(
      tag,
      stepAhu(
        s,
        {
          isolatorOn: airHouse.isolator.get(tag)?.() ?? true,
          mode: airHouse.mode.get(tag)?.() ?? 'auto',
          demand: airHouse.occupied.get(airHouse.hall.get(tag) ?? '') ?? true,
        },
        dt,
      ),
    );
}

/** The share of a unit's length each of its sections takes, west to east. */
const SECTIONS = [
  ['DAMPERS', 0.11, false],
  ['FILTERS', 0.12, true],
  ['PLATE HEAT EXCHANGER', 0.23, false],
  ['HEAT PUMP', 0.21, false],
  ['LTHW COIL', 0.12, false],
  ['FANS', 0.21, true],
] as const;

/**
 * One unit at its size, its origin on the floor (or the frame it stands
 * on) at the middle of its footprint, front to +z, along x: casing in
 * sections, two decks, access doors with handles, inspection windows on
 * its fans with their impellers turning behind, and its four duct
 * spigots on its ends.
 */
export function createAhuUnit(kit: PanelKit, u: AirUnitSpec) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `${u.tag} air handling unit`;
  const { length: L, height: H, depth: D } = u.size;
  const livery = brandLivery(kit, 'mistral').paint;
  const base = 0.1;
  const body = H - base;
  t.box(group, livery.shade, L, base, D, 0, base / 2, 0);
  t.box(group, livery.casing, L, body, D - 0.02, 0, base + body / 2, 0);
  // The deck between supply (above) and extract (below), seen as a rail.
  t.box(group, livery.main, L, 0.04, 0.012, 0, base + body / 2, D / 2);
  const front = D / 2;
  const fans: Object3D[] = [];
  let x = -L / 2;
  for (const [name, share, windows] of SECTIONS) {
    const w = share * L;
    const cx = x + w / 2;
    // The section's frame profile, and its two doors, a handle on each.
    t.box(
      group,
      livery.main,
      0.04,
      body,
      0.015,
      x + 0.02,
      base + body / 2,
      front,
    );
    for (const deck of [0.25, 0.75]) {
      const y = base + body * deck;
      t.box(
        group,
        t.paint('#1d2022', 0.5),
        0.025,
        0.12,
        0.03,
        cx + w / 2 - 0.09,
        y,
        front + 0.015,
      );
      if (windows) {
        // An inspection window, and a fan (or a filter bank) behind it.
        t.box(
          group,
          t.paint('#101416', 0.15, 0.2),
          w * 0.45,
          body * 0.22,
          0.01,
          cx,
          y,
          front + 0.006,
        );
        if (name === 'FANS') {
          const fan = new Group();
          fan.position.set(cx, y, front - 0.03);
          fan.userData.live = true;
          const blade = t.paint('#9fa4a7', 0.35, 0.6);
          for (let k = 0; k < 6; k++) {
            const b = t.box(
              fan,
              blade,
              Math.min(w * 0.4, body * 0.2),
              0.03,
              0.01,
              0,
              0,
              0,
            );
            b.rotation.z = (k * Math.PI) / 3;
          }
          group.add(fan);
          fans.push(fan);
        }
      }
    }
    sign(
      t,
      group,
      name,
      [cx, base + 0.06, front + 0.004],
      Math.min(0.42, w * 0.9),
      0.045,
    );
    x += w;
  }
  t.box(
    group,
    livery.main,
    0.04,
    body,
    0.015,
    L / 2 - 0.02,
    base + body / 2,
    front,
  );
  // The four spigots on its ends: outside air and exhaust at its west end,
  // supply and the hall's extract at its east; each a flexible
  // connection, a short duct and its damper's actuator.
  const { w: dw, h: dh } = ductSize(u.size);
  const flex = t.paint('#2e3236', 0.8);
  const galv = t.paint('#b5babb', 0.4, 0.6);
  const ports = [
    ['OUTSIDE AIR', -1, 0.73],
    ['EXHAUST', -1, 0.27],
    ['SUPPLY', 1, 0.73],
    ['EXTRACT', 1, 0.27],
  ] as const;
  for (const [label, side, deck] of ports) {
    const y = H * deck;
    const ex = side * (L / 2);
    t.box(group, flex, 0.06, dh, dw, ex + side * 0.03, y, 0);
    // The spigot's face is the port the duct meets (`air-plant.ts`).
    t.box(
      group,
      galv,
      0.09,
      dh + 0.04,
      dw + 0.04,
      ex + side * 0.105,
      y,
      0,
    ).name = `${label} port`;
    t.box(
      group,
      t.paint('#3a3f45', 0.5),
      0.07,
      0.12,
      0.1,
      ex + side * 0.1,
      y + dh / 2 + 0.08,
      dw / 2 - 0.08,
    );
  }
  // Its tag, its maker, and its plate.
  sign(
    t,
    group,
    `${u.tag}  ${u.serves}`,
    [-L / 2 + 0.75, base + body * 0.9, front + 0.004],
    0.9,
    0.07,
    {
      ground: '#f2d23a',
    },
  );
  badge(
    kit,
    group,
    'mistral',
    [-L / 2 + 0.75, base + body * 0.6, front + 0.004],
    0.07,
  );
  nameplate(
    kit,
    group,
    'mistral',
    [-L / 2 + 0.75, base + body * 0.4, front + 0.004],
    [
      `POOLMASTER ${u.size.model} PHX`,
      `${u.airflow} m³/h  max ${u.size.max}`,
      `${u.size.kg} kg  heat pump, LTHW coil`,
    ],
    0.2,
    0.11,
  );
  // Its casing drawn in a few meshes, not hundreds.
  mergeStatic(group, Infinity, new Set(), {
    share: true,
    // Its fans turn; its spigots stay named, for the ports they are.
    keepIf: (o) => o.userData.live === true || / port$/.test(o.name),
  });
  return {
    group,
    /** Turn its fans by `speed` (0 to 1) over `delta` seconds. */
    turn(speed: number, delta: number) {
      for (const f of fans) f.rotation.z += speed * delta * 25;
    },
  };
}

/**
 * A unit's controller, on its front at its own floor's reach: a Mistral
 * enclosure 0.5 × 0.62 m. Returns its parts and what it shows.
 */
function createAhuController(
  kit: PanelKit,
  u: AirUnitSpec,
  parts: ReturnType<typeof createPartSet>,
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = `${u.tag} controller`;
  const livery = brandLivery(kit, 'mistral').paint;
  t.box(group, livery.casing, 0.5, 0.62, 0.16, 0, 0, 0.08);
  t.box(group, livery.main, 0.5, 0.05, 0.005, 0, 0.285, 0.163);
  badge(kit, group, 'mistral', [-0.15, 0.285, 0.166], 0.03);
  sign(t, group, u.tag, [0.13, 0.285, 0.166], 0.16, 0.035, {
    ground: '#f2d23a',
  });
  const z = 0.161;
  const mount = <P extends Part>(part: P, x: number, y: number) => {
    parts.add(part);
    part.object.position.set(x, y, z);
    part.object.scale.setScalar(0.85);
    group.add(part.object);
    return part;
  };
  const screen = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.0032,
    backlight: true,
  });
  screen.group.position.set(-0.05, 0.19, z);
  screen.group.traverse((o) => (o.userData.live = true));
  group.add(screen.group);
  const lamps = {
    run: signal(false),
    heatPump: signal(false),
    filter: signal(false),
    fault: signal(false),
  };
  (
    [
      ['RUN', 'green', lamps.run],
      ['HEAT PUMP', 'white', lamps.heatPump],
      ['FILTER', 'amber', lamps.filter],
      ['FAULT', 'red', lamps.fault],
    ] as const
  ).forEach(([legend, colour, drive], i) =>
    mount(
      pilotLight(kit, {
        colour,
        legend,
        drive,
        pushToTest: false,
        name: `${u.tag} ${legend} lamp`,
      }),
      -0.18 + i * 0.12,
      0.07,
    ),
  );
  const hoa = mount(
    selector(kit, {
      positions: 3,
      initial: 2,
      legend: 'HAND · OFF · AUTO',
      name: `${u.tag} HAND OFF AUTO`,
    }),
    -0.16,
    -0.08,
  );
  mount(
    pushButton(kit, {
      colour: 'blue',
      legend: 'RESET',
      name: `${u.tag} RESET`,
      action: () =>
        airHouse.units.set(u.tag, resetAhu(airHouse.units.get(u.tag)!)),
    }),
    -0.02,
    -0.08,
  );
  mount(
    pushButton(kit, {
      colour: 'black',
      legend: 'FILTERS CHANGED',
      name: `${u.tag} FILTERS CHANGED`,
      action: () =>
        airHouse.units.set(u.tag, changeFilters(airHouse.units.get(u.tag)!)),
    }),
    0.1,
    -0.08,
  );
  const isolator = mount(
    disconnectHandle(kit, {
      style: 'rotary',
      initial: 'on',
      name: `${u.tag} isolator`,
    }),
    0.15,
    -0.2,
  );
  const gauge = createDialGauge(kit, {
    dia: 0.09,
    max: 500,
    unit: 'Pa',
    legend: 'FILTERS',
    flutter: 0.002,
  });
  gauge.group.position.set(-0.13, -0.21, z);
  gauge.group.traverse((o) => (o.userData.live = true));
  group.add(gauge.group);
  airHouse.isolator.set(u.tag, () => isolator.on.value);
  airHouse.mode.set(
    u.tag,
    () => (['hand', 'off', 'auto'] as const)[hoa.position.value],
  );
  return {
    group,
    show(s: AhuState, delta: number) {
      const l = ahuLamps(s);
      lamps.run.value = l.run;
      lamps.heatPump.value = l.heatPump;
      lamps.filter.value = l.filter;
      lamps.fault.value = l.fault;
      screen.show(ahuDisplay(s, u.airflow));
      gauge.set(s.filterPa);
      gauge.update(delta);
    },
  };
}

/** The steel frame a stacked unit stands on: two beams the unit's length, on posts at its corners. */
function stackFrame(
  t: Tools,
  parent: Object3D,
  size: AhuSize,
  y: number,
  frame: number,
) {
  const steel = t.paint('#3c4a57', 0.55, 0.4);
  for (const z of [-size.depth / 2 + 0.06, size.depth / 2 - 0.06])
    t.box(parent, steel, size.length + 0.1, frame, 0.12, 0, y + frame / 2, z);
  for (const x of [-size.length / 2 - 0.02, size.length / 2 + 0.02])
    for (const z of [-size.depth / 2 + 0.06, size.depth / 2 - 0.06])
      t.box(parent, steel, 0.1, y, 0.1, x, y / 2, z);
}

/**
 * A stack of units, bottom first, each on a steel frame over the one
 * below: a working exhibit, its controllers on its units' fronts, each
 * at its own floor's height (the floor, or a gantry).
 */
export function createAhuStack(
  kit: PanelKit,
  units: readonly AirUnitSpec[],
  frame = 0.15,
) {
  const t = plantTools(kit);
  const object = new Group();
  object.name = `Air handling stack ${units.map((u) => u.tag).join(' ')}`;
  const parts = createPartSet();
  const built = units.map((u, k) => {
    registerAirUnit(u);
    const y = k * (u.size.height + frame);
    if (k > 0) stackFrame(t, object, u.size, y - frame, frame);
    const unit = createAhuUnit(kit, u);
    unit.group.position.y = y;
    object.add(unit.group);
    const controller = createAhuController(kit, u, parts);
    // On its front, near its east end, at a hand's height over its floor.
    controller.group.position.set(
      u.size.length / 2 - 0.55,
      y + 1.35,
      u.size.depth / 2,
    );
    object.add(controller.group);
    return { u, unit, controller };
  });
  return {
    object,
    parts,
    update(delta: number) {
      advanceAirPlant(performance.now() / 1000);
      for (const b of built) {
        const s = airHouse.units.get(b.u.tag)!;
        b.unit.turn(s.speed, delta);
        b.controller.show(s, delta);
      }
    },
    dispose() {
      parts.dispose();
    },
  };
}
