import { signal } from '@preact/signals-core';
import { PointLight } from 'three';
import { createLedDriver } from '../logic/led-driver';
import { createFluorescentTube } from '../logic/fluorescent-gear';
import { createSpringDoor } from '../logic/spring-door';
import { createSpringDoorView } from '../views/spring-door';
import {
  createOverheadCloser,
  createRisingButtDoor,
} from '../logic/door-closers';
import { createSelfClosingDoorView } from '../views/self-closing-doors';
import type { GearEvent } from '../logic/fluorescent-gear';
import { machineTone } from '../../sound/audio/machine-tones';
import { createArchitecturalFixture } from '../views/architectural-fixtures';
import { click, partAudio, recording } from '../../core/audio/part-audio';
import type { SoundRecipe } from '../../core/audio/part-audio';
import { EXTRACT_FAN } from '../../core/audio/part-loops';
import type { Binding, Readable } from '../../core/logic/world/components';
import {
  createAccessDoor,
  createAcCassette,
  createAcController,
  createDimmerPlate,
  createDistributionBoard,
  createExtractorFan,
  createFloorBox,
  createFusedSpur,
  createGridSwitchPlate,
  createIntercom,
  createOccupancySensor,
  createPresenceDetector,
  createPullSwitch,
  createRadiator,
  createRockerPlate,
  createThermostat,
  createTwinSocket,
  createWindowWithVent,
} from '../views/building-fittings';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  BEEP,
  CALL_POINT,
  CHIME,
  CORD,
  DOOR_OPEN,
  DOOR_SHUT,
  ERROR,
  KEY_TURN,
  LID,
  LOCKED,
  PRESS,
  asset,
  emitter,
  play,
  show,
} from '../../core/parts/building-part-tools';

/**
 * A building's general fittings as parts, bound to its services model
 * (`../logic/building-services.ts`): lighting switches and sensors, power,
 * climate, the access door and the intercom.
 */

const ROCKER = recording(asset('rocker-click.wav'), 0.08);

const DETENT = recording(asset('switch-click.wav'), 0.05);

const BREAKER = click({
  band: 3200,
  q: 1.4,
  decay: 0.03,
  level: 0.7,
  thump: [140, 0.04],
});

const MAGLOCK = click({
  band: 1200,
  q: 2,
  decay: 0.03,
  level: 0.5,
  thump: [90, 0.05],
});

// ---- Lighting ----------------------------------------------------------------

/** A plate switch of one rocker per gang, each throwing its binding. */
export function lightSwitch(
  kit: PanelKit,
  props: { name?: string; gangs: Binding<boolean>[] },
): Part {
  const a = beginPart(kit, props.name ?? 'light switch');
  const view = createRockerPlate(kit, props.gangs.length);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  view.rockers.forEach((rocker, i) => {
    const bound = props.gangs[i];
    a.uses.set(rocker.mesh, () => {
      bound.set(!bound.value);
      e.emit(bound.value ? 'on' : 'off');
    });
  });
  show(a, () => view.rockers.forEach((r, i) => r.set(props.gangs[i].value)));
  return a.part();
}

/**
 * A bank of grid switches in a metalclad plate: a rocker per lighting
 * zone, and perhaps the emergency lighting test key, each throwing its
 * binding.
 */
export function gridSwitchPlate(
  kit: PanelKit,
  props: {
    name?: string;
    title?: string;
    modules: { legend: string; bound: Binding<boolean>; key?: boolean }[];
  },
): Part {
  const a = beginPart(kit, props.name ?? 'grid switch plate');
  const view = createGridSwitchPlate(kit, props.modules, props.title);
  a.object.add(view.group);
  const e = emitter();
  const k = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  a.voice(k, { on: KEY_TURN, off: KEY_TURN });
  view.switches.forEach((control, i) => {
    const { bound, key } = props.modules[i];
    a.uses.set(control.mesh, () => {
      bound.set(!bound.value);
      (key ? k : e).emit(bound.value ? 'on' : 'off');
    });
  });
  show(a, () =>
    view.switches.forEach((c, i) => c.set(props.modules[i].bound.value)),
  );
  return a.part();
}

/**
 * A high-bay presence detector over a lighting zone. Its walk-test LED
 * blinks while it sees someone (`unseen`, seconds since it last did, is
 * under a second).
 */
export function presenceDetector(
  kit: PanelKit,
  props: { unseen: Readable<number> },
): Part {
  const a = beginPart(kit, 'presence detector');
  const view = createPresenceDetector(kit);
  a.object.add(view.group);
  let time = 0;
  a.updates.push((delta) => {
    time += delta;
    view.set(props.unseen.value < 1 && time % 0.5 < 0.25);
  });
  return a.part();
}

/** A spring door's soft thud as it settles shut. */
const DOOR_SETTLES = click({
  band: 380,
  q: 0.8,
  decay: 0.08,
  level: 0.12,
  thump: [70, 0.08],
});

/**
 * A spring door (`spring-door.ts`) that opens one way only, `opens`: +1
 * away from its face (pushed from in front, pulled from behind), −1
 * towards it; its push plate and pull handle say which, whichever side
 * it is worked from. A use opens it, and it eases shut on its spring a
 * while after it is let go, settling with a soft thud; `hold` while
 * someone stands in its doorway; `snapShut` closes it at once and
 * silently.
 */
export function springDoor(
  kit: PanelKit,
  props: { name?: string; opens?: 1 | -1 } = {},
): Part & {
  door: ReturnType<typeof createSpringDoor>;
  hold(held: boolean): void;
} {
  const a = beginPart(kit, props.name ?? 'spring door');
  const opens = props.opens ?? 1;
  const view = createSpringDoorView(kit, opens);
  a.object.add(view.group);
  const door = createSpringDoor();
  const e = emitter();
  a.voice(e, { off: DOOR_SETTLES });
  let held = false;
  for (const grip of [view.leaf, ...view.grips])
    a.uses.set(grip, () => door.push(opens));
  let shown = 0;
  a.updates.push((delta) => {
    const before = door.angle;
    const angle = door.step(delta, held);
    if (before !== 0 && angle === 0) e.emit('off');
    if (angle !== shown) view.set((shown = angle));
  });
  return {
    ...a.part(),
    door: {
      ...door,
      get angle() {
        return door.angle;
      },
      get open() {
        return door.open;
      },
      snapShut() {
        door.snapShut();
        view.set((shown = 0));
      },
      swingTo(value: number) {
        door.swingTo(value);
        view.set((shown = door.angle));
      },
    },
    hold(on: boolean) {
      held = on;
    },
  };
}

/**
 * A single-action door in a freestanding frame that closes itself on an
 * overhead door closer (`createOverheadCloser`): a use opens it; let go, it
 * sweeps back, slows for its last degrees and latches with a click. It
 * waits while someone stands in its doorway (`hold`).
 */
export function closerDoor(
  kit: PanelKit,
  props: { name?: string } = {},
): Part & {
  door: ReturnType<typeof createOverheadCloser>;
  hold(held: boolean): void;
} {
  const a = beginPart(kit, props.name ?? 'door on an overhead closer');
  const view = createSelfClosingDoorView(kit, 'closer');
  a.object.add(view.group);
  const door = createOverheadCloser();
  const e = emitter();
  // It latches shut with a click.
  a.voice(e, { off: DOOR_SHUT });
  a.uses.set(view.leaf, () => door.push());
  let shown = -1;
  a.updates.push((delta) => {
    const event = door.step(delta);
    if (event) e.emit('off');
    if (door.angle !== shown) view.set((shown = door.angle));
  });
  return { ...a.part(), door, hold: (held) => door.hold(held) };
}

/**
 * A single-action door in a freestanding frame hung on rising butts
 * (`createRisingButtDoor`): a use opens it, lifting it on their helix; let
 * go, its own weight swings it shut, quickly, with a soft knock.
 */
export function risingButtDoor(
  kit: PanelKit,
  props: { name?: string } = {},
): Part & {
  door: ReturnType<typeof createRisingButtDoor>;
  hold(held: boolean): void;
} {
  const a = beginPart(kit, props.name ?? 'door on rising butts');
  const view = createSelfClosingDoorView(kit, 'rising-butt');
  a.object.add(view.group);
  const door = createRisingButtDoor();
  const e = emitter();
  // It lands shut with a soft knock.
  a.voice(e, { off: DOOR_SETTLES });
  a.uses.set(view.leaf, () => door.push());
  let shown = -1;
  a.updates.push((delta) => {
    const event = door.step(delta);
    if (event) e.emit('off');
    if (door.angle !== shown) view.set((shown = door.angle), door.lift);
  });
  return { ...a.part(), door, hold: (held) => door.hold(held) };
}

/** A rotary dimmer: a click on its left half dims, its right brightens. */
export function dimmer(
  kit: PanelKit,
  props: { name?: string; bound: Binding<number> },
): Part {
  const a = beginPart(kit, props.name ?? 'dimmer');
  const view = createDimmerPlate(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { detent: DETENT, 'end-stop': LOCKED });
  a.uses.set(view.knob, (direction = 1) => {
    const next = Math.max(0, Math.min(10, props.bound.value + direction));
    if (next === props.bound.value) return e.emit('end-stop');
    props.bound.set(next);
    e.emit('detent');
  });
  show(a, () => view.set(props.bound.value));
  return a.part();
}

/** A ceiling pull-cord switch, hanging from y = 0. */
export function pullCordSwitch(
  kit: PanelKit,
  props: { name?: string; bound: Binding<boolean> },
): Part {
  const a = beginPart(kit, props.name ?? 'pull-cord switch');
  const view = createPullSwitch(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: CORD, off: CORD });
  a.uses.set(view.bobble, () => {
    view.pull();
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  });
  a.updates.push(view.update);
  return a.part();
}

/** A ceiling occupancy sensor, its LED lit while it sees someone. */
export function occupancySensor(
  kit: PanelKit,
  props: { occupied: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'occupancy sensor');
  const view = createOccupancySensor(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.occupied.value));
  return a.part();
}

/** How a luminaire lights the room, when it does. */
export interface LuminaireLight {
  /** Its intensity at full output, candela, in the room's own scale. */
  candela: number;
  /** How far its light reaches, metres. */
  range: number;
  /** Scene units to the metre. */
  metre: number;
}

/** Control gear: a fluorescent's switch-start gear, or an LED driver. */
export type LuminaireGear = 'switch-start' | 'led';

/** The starter's click as it opens, kicking the tube to strike. */
const STARTER = click({ band: 2600, q: 3, decay: 0.012, level: 0.05 });
/** A failed strike's flash: a small, glassy tink. */
const TINK: SoundRecipe = {
  tones: [
    { at: 0, hz: 3150, seconds: 0.05, level: 0.012, type: 'sine' },
    { at: 0, hz: 4720, seconds: 0.03, level: 0.006, type: 'sine' },
  ],
};
/** The tube striking: a soft ping. */
const PING: SoundRecipe = {
  tone: { hz: 2350, seconds: 0.16, level: 0.012, type: 'triangle' },
};
/** The ballast's hum while the tube is lit: a quiet, low 100 Hz buzz. */
const BALLAST = machineTone('transformer', signal(2), 0.02, {
  up: 0.15,
  down: 0.1,
  floor: 1,
});

/**
 * How old a fitting's tube is, from its seed: most are in their middle
 * years, some old and slow to start, and about one in twenty-five a dud.
 */
export function tubeAge(seed: number) {
  const r = (((Math.sin(seed * 37.719 + 4.1) * 15731.743) % 1) + 1) % 1;
  return r < 0.04 ? 0.97 : r < 0.3 ? 0.55 + r : 0.05 + 0.4 * r;
}

/**
 * A luminaire on a lighting circuit. On switch-start gear (the default),
 * a twin fluorescent batten whose two tubes come to life each in its own
 * time (`fluorescent-gear.ts`): the starter glowing and clicking, failed
 * strikes flashing, then the strike and the run-up to full light, with the
 * ballast's hum while lit; below about 80 % of nominal a tube goes out and
 * starts all over again. On an LED driver (`led-driver.ts`), steady near
 * nominal, dimming and flickering with a sagging supply, dropping out and
 * restarting in a deep dip. `level` is what its switching asks of it (0 to
 * 1). With `light` it lights the room as well as showing lit; `ages` sets
 * its tubes' ages (0 new to 1 dead), else they follow from `seed`.
 */
export function luminaire(
  kit: PanelKit,
  props: {
    level: Readable<number>;
    volts: Readable<number>;
    seed?: number;
    light?: LuminaireLight;
    gear?: LuminaireGear;
    ages?: [number, number];
  },
): Part & { output: () => number; age: (tube: number, age: number) => void } {
  const a = beginPart(kit, 'luminaire');
  const view = createArchitecturalFixture(kit, 'luminaire');
  a.object.add(view.group);
  const seed = props.seed ?? 0;
  const gear = props.gear ?? 'switch-start';
  const driver = createLedDriver(seed);
  const ages = props.ages ?? [tubeAge(seed * 2), tubeAge(seed * 2 + 1)];
  let tubes = ages.map((age, i) => createFluorescentTube(seed * 2 + i, age));
  const light = props.light
    ? new PointLight('#f4f2e8', 0, props.light.range * props.light.metre, 2)
    : null;
  if (light) {
    light.position.y = -0.12;
    a.object.add(light);
  }
  const humming = signal(false);
  if (gear === 'switch-start') a.holdWhile(humming, BALLAST);
  const sound: Partial<Record<GearEvent, SoundRecipe>> = {
    click: STARTER,
    flash: TINK,
    strike: PING,
  };
  let output = -1;
  a.updates.push((delta) => {
    const level = props.level.value;
    const volts = level > 0 ? props.volts.value : 0;
    let lit: number;
    if (gear === 'led') lit = driver.step(delta, volts) * level;
    else {
      let sum = 0;
      for (const tube of tubes) {
        const step = tube.step(delta, volts);
        sum += step.light;
        for (const event of step.events) {
          const recipe = sound[event];
          if (recipe) partAudio.play(recipe, a.object);
        }
      }
      lit = (sum / tubes.length) * level;
      humming.value = tubes.some(
        (t) => t.phase === 'lit' || t.phase === 'runup',
      );
    }
    if (lit === output) return;
    output = lit;
    view.set(lit);
    if (light && props.light)
      light.intensity =
        props.light.candela * props.light.metre * props.light.metre * lit;
  });
  return {
    ...a.part(),
    output: () => Math.max(0, output),
    /** Fit tube `tube` (0 or 1) with one of another age: a dud, say. */
    age(tube: number, age: number) {
      ages[tube] = age;
      tubes = ages.map((each, i) => createFluorescentTube(seed * 2 + i, each));
    },
  };
}

// ---- Power -------------------------------------------------------------------

/** A twin switched socket, each side with a tester plugged in. */
export function twinSocket(
  kit: PanelKit,
  props: {
    left: Binding<boolean>;
    right: Binding<boolean>;
    live: Readable<{ left: boolean; right: boolean }>;
    metalclad?: boolean;
    testers?: boolean;
  },
): Part {
  const a = beginPart(kit, 'twin socket');
  const view = createTwinSocket(kit, props);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  const sides = [props.left, props.right];
  view.sides.forEach((side, i) =>
    a.uses.set(side.rocker, () => {
      sides[i].set(!sides[i].value);
      e.emit(sides[i].value ? 'on' : 'off');
    }),
  );
  show(a, () => {
    view.sides[0].set(props.left.value, props.live.value.left);
    view.sides[1].set(props.right.value, props.live.value.right);
  });
  return a.part();
}

/** A switched fused spur, its neon lit while it is live. */
export function fusedSpur(
  kit: PanelKit,
  props: { bound: Binding<boolean>; live: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'fused spur');
  const view = createFusedSpur(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  a.uses.set(view.rocker, () => {
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  });
  show(a, () => view.set(props.bound.value, props.live.value));
  return a.part();
}

/** A floor box whose lid a click opens and shuts. */
export function floorBox(kit: PanelKit): Part {
  const a = beginPart(kit, 'floor box');
  const view = createFloorBox(kit);
  a.object.add(view.group);
  const open = signal(false);
  const e = emitter();
  a.voice(e, { on: LID, off: LID });
  a.uses.set(view.lid, () => {
    open.value = !open.value;
    e.emit(open.value ? 'on' : 'off');
  });
  show(a, () => view.set(open.value));
  return a.part();
}

/** The distribution board: its main switch and a breaker per circuit. */
export function distributionBoard(
  kit: PanelKit,
  props: { main: Binding<boolean>; circuits: [string, Binding<boolean>][] },
): Part {
  const a = beginPart(kit, 'distribution board');
  const view = createDistributionBoard(
    kit,
    props.circuits.map(([name]) => name),
  );
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: BREAKER, off: BREAKER });
  let open = false;
  const toggleCover = () => {
    open = !open;
    view.setOpen(open);
    e.emit(open ? 'on' : 'off');
  };
  a.uses.set(view.cover, toggleCover);
  a.uses.set(view.latch, toggleCover);
  const work = (bound: Binding<boolean>) => () => {
    bound.set(!bound.value);
    e.emit(bound.value ? 'on' : 'off');
  };
  a.uses.set(view.main.lever, work(props.main));
  props.circuits.forEach(([, bound], i) =>
    a.uses.set(view.breakers[i].lever, work(bound)),
  );
  show(a, () => {
    view.main.set(props.main.value);
    props.circuits.forEach(([, bound], i) => view.breakers[i].set(bound.value));
  });
  return a.part();
}

// ---- Climate -----------------------------------------------------------------

/** The air-conditioning wall controller. */
export function acController(
  kit: PanelKit,
  props: {
    power: Binding<boolean>;
    mode: Binding<number>;
    setpoint: Binding<number>;
    modes: readonly string[];
    temperature: Readable<number>;
    running: Readable<boolean>;
  },
): Part {
  const a = beginPart(kit, 'AC controller');
  const view = createAcController(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: BEEP });
  const button = (mesh: Part['object']['children'][number], act: () => void) =>
    a.uses.set(mesh, () => {
      act();
      e.emit('press');
    });
  button(view.power, () => props.power.set(!props.power.value));
  button(view.mode, () =>
    props.mode.set((props.mode.value + 1) % props.modes.length),
  );
  button(view.up, () =>
    props.setpoint.set(Math.min(30, props.setpoint.value + 0.5)),
  );
  button(view.down, () =>
    props.setpoint.set(Math.max(16, props.setpoint.value - 0.5)),
  );
  show(a, () =>
    view.set(
      props.power.value,
      props.modes[props.mode.value] ?? '',
      props.setpoint.value,
      props.temperature.value,
      props.running.value,
    ),
  );
  return a.part();
}

/** A ceiling cassette: vanes open and a whirr while it runs. */
export function acCassette(
  kit: PanelKit,
  props: { running: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'AC cassette');
  const view = createAcCassette(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.running.value));
  a.updates.push(view.update);
  a.holdWhile(props.running, EXTRACT_FAN);
  return a.part();
}

/** A dial thermostat: a click on the dial's left half turns it down 1 °C. */
export function thermostat(
  kit: PanelKit,
  props: { bound: Binding<number>; calling: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'room thermostat');
  const view = createThermostat(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { detent: DETENT, 'end-stop': LOCKED });
  a.uses.set(view.dial, (direction = 1) => {
    const next = Math.max(5, Math.min(30, props.bound.value + direction));
    if (next === props.bound.value) return e.emit('end-stop');
    props.bound.set(next);
    e.emit('detent');
  });
  show(a, () => view.set(props.bound.value, props.calling.value));
  return a.part();
}

/** A radiator: its thermostatic valve's head turns 0 to 5, a click a step. */
export function radiator(
  kit: PanelKit,
  props: { valve: Binding<number>; heat: Readable<number> },
): Part {
  const a = beginPart(kit, 'radiator');
  const view = createRadiator(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { detent: DETENT, 'end-stop': LOCKED });
  a.uses.set(view.head, (direction = 1) => {
    const next = Math.max(0, Math.min(5, props.valve.value + direction));
    if (next === props.valve.value) return e.emit('end-stop');
    props.valve.set(next);
    e.emit('detent');
  });
  show(a, () => view.set(props.valve.value, props.heat.value));
  return a.part();
}

/** A window: its handle opens the vent; a click on the blinds turns them. */
export function windowWithVent(
  kit: PanelKit,
  props: { vent: Binding<boolean>; blinds: Binding<boolean> },
): Part {
  const a = beginPart(kit, 'window');
  const view = createWindowWithVent(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: LID, off: LID, detent: CORD });
  const vent = () => {
    props.vent.set(!props.vent.value);
    e.emit(props.vent.value ? 'on' : 'off');
  };
  a.uses.set(view.handle, vent);
  a.uses.set(view.sash, vent);
  const blinds = () => {
    props.blinds.set(!props.blinds.value);
    e.emit('detent');
  };
  a.uses.set(view.headrail, blinds);
  for (const slat of view.slats) a.uses.set(slat, blinds);
  show(a, () => view.set(props.vent.value, props.blinds.value));
  return a.part();
}

/** A wall extractor fan, spinning and whirring while it runs. */
export function extractorFan(
  kit: PanelKit,
  props: { running: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'extractor fan');
  const view = createExtractorFan(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.running.value));
  a.updates.push(view.update);
  a.holdWhile(props.running, EXTRACT_FAN);
  return a.part();
}

// ---- Access and welfare ------------------------------------------------------

/**
 * An access controlled door: present a card at the reader, push to exit,
 * or break the green emergency release (reset with its key); then push the
 * door. Locked, the door rattles and the reader buzzes.
 */
export function accessDoor(
  kit: PanelKit,
  props: {
    locked: Readable<boolean>;
    open: Readable<boolean>;
    broken: Readable<boolean>;
    card: () => void;
    exit: () => void;
    breakGlass: () => void;
    resetGlass: () => void;
    work: () => boolean;
  },
): Part {
  const a = beginPart(kit, 'access door');
  const view = createAccessDoor(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, {
    press: BEEP,
    release: KEY_TURN,
    refused: LOCKED,
    on: DOOR_OPEN,
    off: DOOR_SHUT,
    trip: CALL_POINT,
  });
  a.uses.set(view.reader, () => {
    props.card();
    e.emit('press');
  });
  a.uses.set(view.exitButton, () => {
    play(PRESS, a.object);
    props.exit();
  });
  a.uses.set(view.release, () => {
    props.breakGlass();
    e.emit('trip');
  });
  a.uses.set(view.releaseKey, () => {
    props.resetGlass();
    e.emit('release');
  });
  a.uses.set(view.leaf, () => {
    const was = props.open.value;
    if (!props.work()) {
      play(ERROR, a.object);
      return e.emit('refused');
    }
    e.emit(was ? 'off' : 'on');
  });
  let wasLocked = true;
  show(a, () => {
    const locked = props.locked.value;
    view.set(locked, props.open.value, props.broken.value);
    if (locked !== wasLocked) play(MAGLOCK, a.object);
    wasLocked = locked;
  });
  a.updates.push(view.update);
  return a.part();
}

/** A door entry intercom: its button rings reception. */
export function intercom(kit: PanelKit): Part {
  const a = beginPart(kit, 'intercom');
  const view = createIntercom(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: CHIME });
  a.uses.set(view.button, () => e.emit('press'));
  return a.part();
}
