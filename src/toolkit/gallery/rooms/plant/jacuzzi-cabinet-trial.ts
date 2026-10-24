import { signal } from '@preact/signals-core';
import { Group, Mesh, MeshPhysicalMaterial, CylinderGeometry } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import {
  createPartSet,
  pushButton,
} from '../../../components/core/parts/parts';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { plantTools } from '../../../components/plant/views/plant-tools';
import { createValveControlPanel } from '../../../components/plant/views/valve-control-panel';
import {
  TRIAL,
  TRIAL_VALVES,
  actOnJacuzziTrial,
  newJacuzziTrial,
  stepJacuzziTrial,
  trialPanel,
  trialReadings,
  trialRuns,
} from '../../../../game/plant/jacuzzi-trial';
import type { TrialAction } from '../../../../game/plant/jacuzzi-trial';
import { buildSpaPack } from './spa-pack';
import type { JacuzziCabinetBinding } from './spa-pack';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The jacuzzi’s cabinet on trial: plumbed to an ideal spa, an ideal 1.3 m³ balance tank and ideal sources of power, water and heat, nothing of the world’s. Work its valves and cut its sources from the test console; seat the bathers; watch the cabinet’s display, its NO FLOW lamp and RESET, and the tank take the surge.';
export const FINISH = { wall: '#cbd3d0', floor: '#929a97' };

/**
 * The state.value, fresh each time the room is built (`jacuzzi-state.value.ts`): a
 * signal, so the cabinet's lamps and display, computed from it, follow it.
 */
const state = signal(newJacuzziTrial());
export function prepareRoom() {
  state.value = newJacuzziTrial();
}
const act = (a: TrialAction) =>
  (state.value = actOnJacuzziTrial(state.value, a));
// For trying it from the console: `jacuzziTrial.act({...})`, `jacuzziTrial.state`.
if (typeof window !== 'undefined')
  (window as unknown as { jacuzziTrial?: unknown }).jacuzziTrial = {
    act,
    get state() {
      return state.value;
    },
    get panel() {
      return trialPanel(state.value);
    },
  };

/** The cabinet, driven by the state.value. */
const binding: JacuzziCabinetBinding = {
  panel: (doorOpen) => trialPanel(state.value, doorOpen),
  power: () => state.value.cabinet.power,
  setPower: (on) => act({ act: 'cabinet', action: { act: 'power', on } }),
  reset: () => act({ act: 'cabinet', action: { act: 'reset' } }),
  runs: () => trialRuns(state.value),
  toggle: (what) => act({ act: 'toggle', what }),
  waterC: () => state.value.celsius,
  setpoint: () => state.value.setpoint,
  setSetpoint: (celsius) => act({ act: 'setpoint', celsius }),
  heating: () => trialPanel(state.value).heating,
};

/** A clear vessel with water in it, `r` round and `h` tall, on the floor. */
function clearVessel(kit: PanelKit, r: number, h: number) {
  const group = new Group();
  const glass = new MeshPhysicalMaterial({
    color: '#a9b4b6',
    transparent: true,
    opacity: 0.3,
    roughness: 0.3,
    depthWrite: false,
    side: 2,
  });
  const blue = new MeshPhysicalMaterial({
    color: '#38a8bf',
    transparent: true,
    opacity: 0.6,
    roughness: 0.16,
    depthWrite: false,
  });
  kit.materials.push(glass, blue);
  const shell = new Mesh(new CylinderGeometry(r, r, h, 40, 1, true), glass);
  shell.position.y = h / 2;
  group.add(shell);
  const water = new Mesh(new CylinderGeometry(r - 0.02, r - 0.02, 1, 40), blue);
  water.userData.live = true;
  group.add(water);
  return {
    group,
    /** Its water `share` of `h` deep. */
    fill(share: number) {
      const d = Math.max(0, Math.min(1, share)) * (h - 0.02);
      water.visible = d > 0.002;
      water.scale.y = Math.max(0.001, d);
      water.position.y = 0.01 + d / 2;
    },
  };
}

/** An LCD on a short post in front of a vessel, its face toward +z. */
function postLcd(kit: PanelKit, title: string, z: number) {
  const t = plantTools(kit);
  const group = new Group();
  const steel = t.paint('#55616a', 0.5);
  t.box(group, steel, 0.06, 1.1, 0.06, 0, 0.55, z - 0.04);
  t.box(group, t.paint('#31383b', 0.55), 0.5, 0.22, 0.04, 0, 1.2, z);
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.01,
    backlight: true,
  });
  lcd.group.position.set(0, 1.2, z + 0.022);
  group.add(lcd.group);
  const name = createMicroLabel(kit, title, {
    height: 0.022,
    maxWidth: 0.48,
    ink: '#f2f2ea',
    plate: '#25343a',
  });
  name.position.set(0, 1.35, z + 0.022);
  group.add(name);
  let shown = '';
  return {
    group,
    show(lines: string[]) {
      const key = lines.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show(lines);
    },
  };
}

/** The ideal spa: the jacuzzi's 2.8 m³ in a clear drum, its bathers in it when seated. */
function idealSpa(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Ideal spa';
  const r = 1.0;
  const h = 0.9;
  const drum = clearVessel(kit, r, h);
  object.add(drum.group);
  // Its bathers: eight grey figures round its seat.
  const bathers = new Group();
  const grey = t.paint('#8d9396', 0.7);
  for (let i = 0; i < TRIAL.seats; i++) {
    const a = ((i + 0.5) / TRIAL.seats) * Math.PI * 2;
    t.cyl(
      bathers,
      grey,
      0.13,
      0.9,
      Math.cos(a) * 0.72,
      0.6,
      Math.sin(a) * 0.72,
      'y',
      12,
    );
  }
  object.add(bathers);
  const lcd = postLcd(kit, 'IDEAL SPA · 2.8 m³', r + 0.25);
  object.add(lcd.group);
  object.traverse((o) => (o.userData.live = true));
  return {
    object,
    update() {
      const r1 = trialReadings(state.value);
      drum.fill(r1.spaShare);
      bathers.visible = state.value.bathers;
      lcd.show([
        `SPA ${r1.spaLitres.toFixed(0)} L ${state.value.celsius.toFixed(1)}C`,
        `${state.value.bathers ? 'BATHERS 8' : 'NO BATHERS'} ${r1.full ? 'FULL' : 'LOW'}`,
      ]);
    },
  };
}

/** The ideal balance tank: 1.3 m³, 1.1 m across, its float and low-low marked. */
function idealTank(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Ideal balance tank';
  const { diameter, height, depth, float, lowLow } = TRIAL.tank;
  const r = diameter / 2;
  const vessel = clearVessel(kit, r, height);
  object.add(vessel.group);
  // Its float and low-low, as rings round it at their water depths.
  for (const [share, colour] of [
    [float, '#2f7d3a'],
    [lowLow, '#b03a2e'],
  ] as const) {
    const ring = t.cyl(
      object,
      t.paint(colour, 0.5),
      r + 0.012,
      0.012,
      0,
      share * depth,
      0,
      'y',
      40,
    );
    ring.userData.live = true;
  }
  const lcd = postLcd(kit, 'IDEAL BALANCE TANK · 1.3 m³', r + 0.25);
  object.add(lcd.group);
  return {
    object,
    update() {
      const r1 = trialReadings(state.value);
      vessel.fill((r1.tankShare * depth) / height);
      const filling = trialPanel(state.value).messages.some((m) =>
        m.endsWith('FILLING'),
      );
      lcd.show([
        `TANK ${r1.tankLitres.toFixed(0)} L ${Math.round(r1.tankShare * 100)}%`,
        state.value.tankLow
          ? 'LOW-LOW'
          : r1.wasteLitres > 0.5
            ? `LOST ${r1.wasteLitres.toFixed(0)} L`
            : filling
              ? 'MAKE-UP FILLING'
              : `GUTTER ${r1.gutterLitres.toFixed(0)} L`,
      ]);
    },
  };
}

/**
 * The trial's test console by Penfold Controls, on its pedestal: the
 * cabinet's eight valves (a SHUT and an OPEN for each), and its ideal
 * sources and its bathers, each an illuminated button, pressed on and off,
 * lit while on; and a readout of where the water is.
 */
function testConsole(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Jacuzzi cabinet trial console';
  t.box(object, t.paint('#3a4246', 0.6), 0.9, 1.0, 0.3, 0, 0.5, -0.05);
  const valves = createValveControlPanel(
    kit,
    'TRIAL · CABINET VALVES',
    TRIAL_VALVES.map((v) => ({
      tag: v.tag,
      legend: v.legend,
      open: () => state.value.valves[v.id],
      set: (open: boolean) => act({ act: 'valve', valve: v.id, open }),
    })),
  );
  valves.group.position.set(0, 1.0 + valves.height / 2 + 0.36, -0.2);
  object.add(valves.group);
  // The sources and the bathers.
  const panel = new Group();
  panel.position.set(0, 1.18, 0.1);
  panel.rotation.x = -0.5;
  object.add(panel);
  const w = 0.82;
  const h = 0.32;
  t.box(panel, t.paint('#c8ccc4', 0.55), w, h, 0.04, 0, 0, 0);
  panelMakerMark(kit, panel, {
    width: w,
    height: h,
    z: 0.021,
    corner: 'top-right',
  });
  const name = createMicroLabel(kit, 'TRIAL · SOURCES', {
    height: 0.018,
    ink: '#f2f2ea',
    plate: '#25343a',
    maxWidth: w - 0.2,
  });
  name.position.set(-0.08, h / 2 - 0.03, 0.021);
  panel.add(name);
  const parts = createPartSet();
  const toggles: (() => void)[] = [];
  (
    [
      [
        'POWER',
        'white',
        () => state.value.power,
        (on: boolean) => act({ act: 'source', source: 'power', on }),
      ],
      [
        'WATER',
        'blue',
        () => state.value.water,
        (on: boolean) => act({ act: 'source', source: 'water', on }),
      ],
      [
        'HEAT',
        'amber',
        () => state.value.heat,
        (on: boolean) => act({ act: 'source', source: 'heat', on }),
      ],
      [
        'BATHERS',
        'green',
        () => state.value.bathers,
        (on: boolean) => act({ act: 'bathers', in: on }),
      ],
    ] as const
  ).forEach(([legend, colour, get, set], i) => {
    const lit = signal(get());
    toggles.push(() => (lit.value = get()));
    const button = parts.add(
      pushButton(kit, {
        colour,
        head: 'illuminated',
        lamp: lit,
        legend,
        name: `Trial ${legend.toLowerCase()} button`,
        action: () => set(!get()),
      }),
    );
    button.object.position.set(-0.3 + i * 0.2, 0.03, 0.021);
    panel.add(button.object);
  });
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.0075,
    backlight: true,
  });
  lcd.group.position.set(0, -0.1, 0.021);
  panel.add(lcd.group);
  for (const [piece, use] of valves.parts.uses) parts.uses.set(piece, use);
  let shown = '';
  object.traverse((o) => (o.userData.live = true));
  return {
    object,
    parts,
    update(delta) {
      for (const toggle of toggles) toggle();
      valves.update(delta);
      parts.update(delta);
      const r1 = trialReadings(state.value);
      const lines = [
        `SPA ${r1.spaLitres.toFixed(0)} TANK ${r1.tankLitres.toFixed(0)}`,
        `LOST ${r1.wasteLitres.toFixed(0)} L  ${state.value.cabinet.trip ? 'TRIPPED' : trialPanel(state.value).flowing ? 'FLOWING' : 'STILL'}`,
      ];
      const key = lines.join('|');
      if (key !== shown) {
        shown = key;
        lcd.show(lines);
      }
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Jacuzzi cabinet, on trial',
    reference:
      'The jacuzzi’s Lidoluxe cabinet, its controller and display, plumbed to the trial’s ideal spa and balance tank',
    size: { w: 3.2, d: 1.6, h: 2.2, mount: 'floor' },
    maker: 'lidoluxe',
    build: (kit) => {
      const cabinet = buildSpaPack(
        kit,
        'JACUZZI TRIAL',
        true,
        true,
        undefined,
        binding,
      );
      return {
        ...cabinet,
        // The trial runs with the cabinet: one step a frame.
        update(delta) {
          state.value = stepJacuzziTrial(state.value, delta);
          cabinet.update?.(delta);
        },
      };
    },
  },
  {
    title: 'Ideal spa',
    reference:
      'The jacuzzi’s 2.8 m³ in a clear drum; eight bathers when seated',
    size: { w: 2.4, d: 2.8, h: 1.5, mount: 'floor' },
    build: idealSpa,
  },
  {
    title: 'Ideal balance tank',
    reference:
      '1.3 m³, 1.1 m across and 1.55 m tall; its float (green) and low-low (red) marked',
    size: { w: 1.6, d: 2.0, h: 1.6, mount: 'floor' },
    build: idealTank,
  },
  {
    title: 'Trial console',
    reference:
      'The cabinet’s eight valves, the ideal sources of power, water and heat, and the bathers',
    size: { w: 1.2, d: 0.9, h: 2.0, mount: 'floor' },
    build: testConsole,
  },
];
