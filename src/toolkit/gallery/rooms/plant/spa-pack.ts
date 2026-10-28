import { cabinetFeeds, feedMessages } from '../../../../game/plant/pool-dosing';
import { computed, signal } from '@preact/signals-core';
import { createLouvres } from '../../../components/industrial-control/views/cabinet-fittings';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { ReadonlySignal } from '@preact/signals-core';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../../components/core/views/pipe-kinds';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  SERVO_WHIRR,
  VALVE_STOP,
} from '../../../components/plant/audio/actuated-valve';
import {
  SPA_FILTERS,
  filtering,
  spaFilterGlass,
  spaFilterLine,
  washSignals,
} from '../../../../game/plant/spa-filter';
import type { SpaPool } from '../../../../game/plant/spa-filter';
import type { GlassInputs } from '../../../components/plant/logic/sight-glass';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createSpaSandFilter,
  createInlineUv,
  createSpaDosingController,
  createSpaHeatExchanger,
  createSpaPump,
  createSurgeVessel,
} from '../../../components/plant/views/spa-pack-parts';
import {
  AIR_BLOWER_PIPES,
  JET_PUMP_STUBS,
  createAirBlower,
  createJetPump,
} from '../../../components/plant/views/pumps-plant';
import type { OwnPipe } from '../../../components/plant/views/pumps-plant';
import {
  createPartSet,
  doorBack,
  doorLatch,
  pilotLight,
  pushButton,
  selector,
} from '../../../components/core/parts/parts';
import { worldStore, roomWorld } from '../../../save/world-store';
import { partAudio, tone } from '../../../components/core/audio/part-audio';
import { READY_BEEP_LEVEL } from '../../../components/sound/audio/boot-beep';
import {
  CABINET_SERVOS,
  bootBeep as bootBeepFor,
  bootLine,
  cabinetReady,
} from '../../../../game/plant/cabinet-boot';
import type {
  BootPhase,
  CabinetBoot,
} from '../../../../game/plant/cabinet-boot';
import { machineTone } from '../../../components/sound/audio/machine-tones';
import { doorGain } from '../../../components/core/logic/door-attenuation';
import {
  FOOTBATH,
  footbathLineup,
  partOn,
} from '../../../../game/plant/identification';
import { createCabinetMimic } from '../../../components/plant/views/cabinet-mimic';
import {
  cabinetBootInputs,
  clampSetpoint,
  footbathFilling,
  jacuzziCabinetPanel,
  jacuzziRuns,
} from '../../../../game/world';
import { footbathPumpStarved } from '../../../../game/plant/pools';

/**
 * A packaged spa set in its prefabricated plant cabinet: what the plant
 * sizing (`src/game/plant-sizing/sizing.ts`) gives a circuit too small for
 * pool plant, such as the foot spa. A factory-built steel cabinet,
 * 1.7 × 0.9 × 2.1 m, its two doors latched; inside, on one skid, a small
 * circulation pump, a cartridge filter, an inline UV unit, a plate heat
 * exchanger and a surge vessel, piped together, and on its back wall the
 * dosing controller with its two peristaltic pumps over their chemical
 * containers. Made by Lidoluxe; its control panel, on the left door, by
 * Penfold Controls.
 *
 * It works: the panel's POWER switch runs the pump (PUMP RUN lit, the
 * filter's gauge rising to its working pressure) and the UV lamp, which
 * an interlock puts out while a door is open, as a real one does, so no
 * one looks into its light (UV ON goes out, its sight glass dark).
 */

const CABINET = { w: 1.7, d: 0.9, h: 2.1, wall: 0.03 } as const;
/**
 * Its controller's beeper (the owner, 2026-10-25): a piezo sounder on its
 * board, the cheapest there is, a plain square tone. One short beep coming
 * online; three quick ones for a fault.
 */
const ONLINE_BEEP = tone({
  hz: 2700,
  seconds: 0.09,
  level: READY_BEEP_LEVEL,
  type: 'square',
});
const FAULT_BEEP = tone({
  hz: 2700,
  seconds: 0.07,
  level: READY_BEEP_LEVEL,
  type: 'square',
  repeat: [3, 0.09],
});
/**
 * The Jacuzzi's: the same set in a wider, deeper cabinet, with a bay at
 * its right end for the spa's own jet pump and air blower, each switched
 * from the panel and run only while the circulation is.
 */
const JACUZZI_CABINET = { w: 2.8, d: 1.0, h: 2.1, wall: 0.03 } as const;
/** The jets' bay at the cabinet's right end, its width. */
const JETS_BAY = 1.1;
/**
 * The cabinet's upper row of controls under its mimic (POWER, its lamps,
 * JETS), moved down and left clear of the mimic's DRAINING and FILLING
 * strip, which overprinted it (the owner, 2026-10-28: 1.5 cm down, 2 cm
 * left), m.
 */
const ROW_NUDGE = { x: -0.02, y: -0.015 } as const;

/** Its drain's stub, in the skid's frame (over the skid's top). */
export const SPA_DRAIN = { x: 0.05, y: 0.05 } as const;
/** Its supply gland on the roof, in the body's frame: at its left end, toward its back. */
export const spaGland = (c: { w: number; d: number }) => ({
  x: -c.w / 2 + 0.1,
  z: -c.d / 2 + 0.15,
});
/** How far the doors swing open, radians. */
const OPEN = 1.75;
/** The filter's working pressure, bar. */
const WORKING = 0.7;

type P3 = [number, number, number];

/** A pipe run inside a cabinet: its points (the cabinet body's frame, or the skid's), its kind and size. */
export interface CabinetRun {
  name: string;
  points: P3[];
  kind: PipeKindId;
  od: number;
}

/** Where the skid stands in the body, and its deck's height. */
const skidAt = (jets: boolean) => ({ x: jets ? -JETS_BAY / 2 : 0, y: 0.16 });

/** The skid's runs, in its frame (heights over its deck), the back panel at `hd` behind the body's middle. */
function skidRuns(hd: number, jets = false): CabinetRun[] {
  // Out through the back panel and a little beyond, where each connection
  // ends, plain, ready to be connected to the spa and the heating ring; its
  // isolating valve is the room's, up the pipe's rise behind the cabinet
  // (`cabinet-pipes.ts`), clear of the elbow at the stub (the owner,
  // 2026-10-23).
  const out = -hd - 0.03;
  const pvc = (name: string, points: P3[]): CabinetRun => ({
    name,
    points,
    kind: 'pvc-pressure',
    od: 0.05,
  });
  return [
    // Out to its sand filter, outside the cabinet, and back to its UV
    // unit (the owner, 2026-10-25).
    pvc('Cabinet to the filter', [
      [-0.3, 0.27, 0.1],
      [-0.3, 0.6, 0.1],
      [-0.1, 0.6, 0.1],
      [-0.1, 0.6, out],
    ]),
    pvc('Filter to the cabinet', [
      [0.6, 0.75, out],
      [0.6, 0.75, 0.28],
      [0.7, 0.75, 0.28],
      [0.7, 0.27, 0.28],
    ]),
    // From its back port, behind the filter.
    pvc('UV unit to the heat exchanger', [
      [0.7, 0.27, -0.12],
      [0.7, 0.45, -0.12],
      [0.385, 0.45, -0.12],
      [0.385, 0.32, -0.12],
      [0.385, 0.32, -0.22],
    ]),
    pvc('Return to the spa', [
      [0.385, 0.08, -0.22],
      [0.385, 0.08, -0.16],
      [0.52, 0.08, -0.16],
      [0.52, 0.08, out],
    ]),
    // The foot spa's overflow, down into its surge vessel; the jacuzzi's
    // pump's suction, low, straight from its external balance tank.
    jets
      ? // At the room's suction level (`SUCTION_LEVEL`, 0.3 m: the skid's
        // deck is 0.16 up), into its pump's suction union.
        pvc('Suction from the balance tank', [
          [-0.45, 0.14, 0.1],
          [-0.6, 0.14, 0.1],
          [-0.6, 0.14, out],
        ])
      : pvc('Overflow into the surge vessel', [
          [-0.66, 0.59, 0.1],
          [-0.66, 1.0, 0.1],
          [-0.66, 1.0, out],
        ]),
    // The heating ring's, in copper.
    {
      name: 'Heating flow',
      kind: 'copper',
      od: 0.022,
      points: [
        [0.315, 0.32, -0.22],
        [0.315, 0.32, -0.16],
        [0.315, 1.0, -0.16],
        [0.315, 1.0, out],
      ],
    },
    {
      name: 'Heating return',
      kind: 'copper',
      od: 0.022,
      points: [
        [0.315, 0.08, -0.22],
        [0.315, 0.08, -0.16],
        [0.2, 0.08, -0.16],
        [0.2, 1.1, -0.16],
        [0.2, 1.1, out],
      ],
    },
    // Low through the back panel, from under the surge vessel and filter.
    {
      name: 'Drain to waste',
      kind: 'pvc-drain',
      od: 0.05,
      points: [
        [SPA_DRAIN.x, SPA_DRAIN.y, -0.05],
        [SPA_DRAIN.x, SPA_DRAIN.y, out],
      ],
    },
  ];
}

/** The jets' bay's machines, in the body's frame: the jet pump's place and the blower's. */
const jetsBay = (c: { w: number }) => {
  const jx = c.w / 2 - JETS_BAY / 2;
  return {
    jx,
    base: 0.1,
    pump: [jx, 0.1, 0.24] as P3,
    blower: [jx - 0.2, 0.1, -0.06] as P3,
  };
};

/**
 * How far the jets' discharge steps toward the bay's outer end before it
 * goes back to the wall: clear of the blower's air line rising behind the
 * pump (the owner, 2026-10-24: they crossed).
 */
export const JETS_DISCHARGE_STEP = 0.12;

/** The jets' bay's runs, in the body's frame. */
function jetsRuns(c: { w: number; d: number }): CabinetRun[] {
  const { jx, base } = jetsBay(c);
  const out = -c.d / 2 - 0.03;
  const x = jx - 0.1 + JETS_DISCHARGE_STEP;
  return [
    // From the spa into the pump's strainer pot.
    {
      name: 'Jets suction',
      kind: 'pvc-pressure',
      od: 0.09,
      points: [
        [jx - 0.45, base + 0.35, 0.24],
        [jx - 0.5, base + 0.35, 0.24],
        [jx - 0.5, base + 0.35, out],
      ],
    },
    // Up from the pump, over toward the bay's end, and back to the jets.
    {
      name: 'Jets discharge',
      kind: 'pvc-pressure',
      od: 0.09,
      points: [
        [jx - 0.1, base + 0.7, 0.24],
        [jx - 0.1, base + 1.25, 0.24],
        [x, base + 1.25, 0.24],
        [x, base + 1.25, out],
      ],
    },
    // From the blower's loop out to the spa's air ring.
    {
      name: 'Air line',
      kind: 'pvc-pressure',
      od: 0.06,
      points: [
        [jx + 0.2, base + 1.4, -0.1],
        [jx + 0.2, base + 1.4, out],
      ],
    },
  ];
}

/**
 * Every pipe inside a cabinet, in its body's frame: the skid's runs, the
 * jets' bay's, and the machines' own pipework (the jet pump's stubs, the
 * blower's air line), as straight lengths, for checking that none passes
 * through another.
 */
export function cabinetPipework(jets: boolean): {
  name: string;
  from: P3;
  to: P3;
  r: number;
}[] {
  const c = jets ? JACUZZI_CABINET : CABINET;
  const skid = skidAt(jets);
  const lengths = (r: CabinetRun, shift: P3) =>
    r.points.slice(1).map((to, i) => ({
      name: r.name,
      from: r.points[i].map((v, k) => v + shift[k]) as P3,
      to: to.map((v, k) => v + shift[k]) as P3,
      r: r.od / 2,
    }));
  const out = [
    ...skidRuns(c.d / 2).flatMap((r) => lengths(r, [skid.x, skid.y, 0])),
  ];
  if (jets) {
    const bay = jetsBay(c);
    out.push(...jetsRuns(c).flatMap((r) => lengths(r, [0, 0, 0])));
    const own = (name: string, pipes: readonly OwnPipe[], at: P3) =>
      pipes.map((p) => ({
        name,
        from: p.from.map((v, k) => v + at[k]) as P3,
        to: p.to.map((v, k) => v + at[k]) as P3,
        r: p.r,
      }));
    out.push(
      ...own('Jet pump’s own stubs', JET_PUMP_STUBS, bay.pump),
      ...own('Blower’s own air line', AIR_BLOWER_PIPES, bay.blower),
    );
  }
  return out;
}

/** Supplies a development cabinet from a separate, port-connected trial. */
export interface SpaPackDemoBinding {
  state(): {
    litres: number;
    celsius: number;
    setpoint: number;
    powerOn: boolean;
    filling: boolean;
    draining: boolean;
    fillOpen: boolean;
  };
  setPower(on: boolean): void;
  setSetpoint(celsius: number): void;
  /** Its filter's wash programme, where it has one (`spa-filter.ts`). */
  filter?: SpaFilterBinding;
}

/** A cabinet's filter programme, as its panel works it: its display line and MODE. */
export interface SpaFilterBinding {
  line(): string;
  mode(): void;
  /** WASH NOW: its programme started at once. */
  washNow(): void;
  /** Whether it is washing now (its programme's stop, backwash or rinse). */
  washing(): boolean;
  /** What its wash changes in the cabinet now (`washSignals`). */
  signals(): ReturnType<typeof washSignals>;
  /** What its filter's sight glass shows (`spaFilterGlass`). */
  glass(pumping: boolean): GlassInputs;
}

/**
 * What drives the jacuzzi's cabinet: its controller and its water, from
 * the world (`jacuzziWorldBinding`) or from a trial (`jacuzzi-trial.ts`).
 */
export interface JacuzziCabinetBinding {
  /** Its panel now (`jacuzziCabinetPanel`, `trialPanel`). */
  panel(doorOpen: boolean): ReturnType<typeof jacuzziCabinetPanel>;
  power(): boolean;
  setPower(on: boolean): void;
  reset(): void;
  /** What runs of its jets and air, and a press on either's button. */
  runs(): { jets: boolean; air: boolean };
  toggle(what: 'jets' | 'air'): void;
  waterC(): number;
  setpoint(): number;
  setSetpoint(celsius: number): void;
  /** Heat going into its water. */
  heating(): boolean;
  /** Its filter's wash programme, where it has one (`spa-filter.ts`). */
  filter?: SpaFilterBinding;
}

/** A spa cabinet's filter programme as the world has it (`spaFilters`). */
export function spaFilterWorldBinding(
  store: ReturnType<typeof worldStore>,
  pool: SpaPool,
): SpaFilterBinding {
  const f = () => store.world.value.spaFilters[pool];
  return {
    line: () => spaFilterLine(f()),
    mode: () =>
      store.dispatch({ type: 'spa-filter', pool, action: { act: 'mode' } }),
    washNow: () =>
      store.dispatch({
        type: 'spa-filter',
        pool,
        action: { act: 'wash-now' },
      }),
    washing: () => !filtering(f()),
    signals: () => washSignals(f()),
    glass: (pumping) => spaFilterGlass(f(), pumping),
  };
}

/** The jacuzzi's cabinet as the world has it. */
export function jacuzziWorldBinding(
  store: ReturnType<typeof worldStore>,
): JacuzziCabinetBinding {
  const w = () => store.world.value;
  return {
    panel: (doorOpen) => jacuzziCabinetPanel(w(), doorOpen),
    power: () => w().jacuzziCabinet.power,
    setPower: (on) =>
      store.dispatch({
        type: 'jacuzzi/cabinet',
        action: { act: 'power', on },
      }),
    reset: () =>
      store.dispatch({ type: 'jacuzzi/cabinet', action: { act: 'reset' } }),
    runs: () => jacuzziRuns(w()),
    toggle: (what) =>
      store.dispatch({ type: 'jacuzzi', action: { act: 'toggle', what } }),
    waterC: () => w().pools.pool_03.temperature,
    setpoint: () => w().pools.pool_03.setpoint,
    setSetpoint: (celsius) =>
      store.dispatch({ type: 'pool/setpoint', pool: 'pool_03', celsius }),
    heating: () => w().pools.pool_03.heating > 0.05,
  };
}

export function buildSpaPack(
  kit: PanelKit,
  circuit = 'FOOT SPA',
  jets = false,
  /** Its POWER on from the start: installed and in service, not an exhibit. */
  inService = false,
  external?: SpaPackDemoBinding,
  /** The jacuzzi's: what drives it, if not the world (a trial). */
  jacuzziBinding?: JacuzziCabinetBinding,
): LiveExhibit {
  const t = plantTools(kit);
  const c = jets ? JACUZZI_CABINET : CABINET;
  const leafW = c.w / 2 - 0.01;
  const object = new Group();
  object.name = 'Packaged spa set in its plant cabinet';
  if (external) object.userData.graphNodeId = 'demo.cabinet';
  // Centred on its footprint, the doors' swing included.
  const body = new Group();
  body.position.z = -leafW / 2;
  object.add(body);
  const steel = t.paint('#d9ddd8', 0.5, 0.2);
  const dark = t.paint('#2f3436', 0.6);

  // The carcass: back, sides, top, plinth; open at the front for the doors.
  // The back and sides stand on the plinth, not down beside it, so no face
  // of theirs lies in the plinth's (which flickered where they met).
  const hd = c.d / 2;
  const plinth = 0.1;
  const tall = c.h - plinth;
  t.box(body, steel, c.w, tall, c.wall, 0, plinth + tall / 2, -hd + c.wall / 2);
  for (const side of [-1, 1])
    t.box(
      body,
      steel,
      c.wall,
      tall,
      c.d,
      side * (c.w / 2 - c.wall / 2),
      plinth + tall / 2,
      0,
    );
  t.box(body, steel, c.w, c.wall, c.d, 0, c.h - c.wall / 2, 0);
  t.box(body, dark, c.w, plinth, c.d, 0, plinth / 2, 0);
  // Louvres high in each side, for its ventilation.
  for (const side of [-1, 1])
    for (let k = 0; k < 5; k++)
      t.box(
        body,
        dark,
        0.006,
        0.02,
        0.3,
        side * (c.w / 2 + 0.003),
        1.7 + k * 0.05,
        0,
      );

  // The supply's cable gland, on a gland plate on its roof at its left end
  // (as you face it), toward the back.
  const gland = spaGland(c);
  t.box(body, dark, 0.14, 0.012, 0.14, gland.x, c.h + 0.006, gland.z);
  t.cyl(
    body,
    t.paint('#3a3d3f', 0.5),
    0.022,
    0.05,
    gland.x,
    c.h + 0.037,
    gland.z,
  );

  // ---- Inside: the skid, its parts (`spa-pack-parts.ts`) -------------------
  // The skid stands at the cabinet's left, leaving the jets' bay free.
  const shell = body;
  const skid = new Group();
  skid.position.x = skidAt(jets).x;
  shell.add(skid);
  const skidY = skidAt(jets).y;
  t.box(skid, dark, 1.55, 0.06, 0.7, 0, skidY - 0.03, 0);
  const backZ = -hd + c.wall;
  const set = <P extends { group: Group }>(
    part: P,
    x: number,
    z: number,
    yaw = 0,
  ): P => {
    part.group.position.set(x, skidY, z);
    part.group.rotation.y = yaw;
    skid.add(part.group);
    return part;
  };
  // In the order the water goes, along the front: the surge vessel, its
  // union meeting the pump's suction; the pump; the filter; the UV unit
  // turned to run front to back. Behind: the heat exchanger, and the
  // dosing on the back wall over its containers.
  // The foot spa's surge vessel; the jacuzzi has none, its balance tank
  // outside (the owner, 2026-10-25).
  const vessel = jets ? null : set(createSurgeVessel(kit), -0.66, 0.1);
  const pump = set(createSpaPump(kit), -0.27, 0.1);
  // Its sand filter stands outside it (the owner, 2026-10-25): in a plant
  // room, the room's own; as an exhibit or a trial, drawn beside it.
  const ownFilter = !inService || !!external || !!jacuzziBinding;
  const filter = ownFilter
    ? createSpaSandFilter(kit, jets ? SPA_FILTERS.jacuzzi : SPA_FILTERS.footSpa)
    : null;
  if (filter) {
    filter.group.position.set(-c.w / 2 - 0.45, 0, -leafW / 2);
    object.add(filter.group);
  }
  const uv = set(createInlineUv(kit), 0.7, 0.06, Math.PI / 2);
  const exchanger = set(createSpaHeatExchanger(kit), 0.35, -0.3);
  const dosing = set(createSpaDosingController(kit), -0.3, backZ);
  /**
   * A pipe run, square: straight lengths between the points (each step
   * along one axis), a fitting at each turn. Heights above the skid.
   */
  // The back panel, which the runs to and from the spa go out through,
  // each in its rubber grommet.
  const backPanel = {
    at: [0, 0, -hd + c.wall / 2] as const,
    normal: [0, 0, 1] as const,
    kind: 'grommet' as const,
    thickness: c.wall,
  };
  const run = (
    points: [number, number, number][],
    kind: PipeKindId = 'pvc-pressure',
    od = 0.05,
  ) => {
    skid.add(
      createPipe(
        kind,
        od,
        points.map(([x, y, z]) => [x, skidY + y, z] as const),
        {
          laid: true,
          through: [backPanel],
          ends: ['open', 'open'],
        },
      ),
    );
  };
  // Its runs, the skid's (`cabinetPipework`): pump to filter, filter to
  // the UV unit, the UV unit to the exchanger, back to the spa, the
  // overflow into the surge vessel, the heating's flow and return, the
  // drain.
  for (const r of skidRuns(hd, jets)) run(r.points, r.kind, r.od);
  // The dosing tubes, from each pump head's outlet down under the pumps,
  // back to the wall, along it and down to their injection points on the
  // return.
  dosing.outlets.forEach(([x, y, z], k) => {
    const wx = -0.3 + x;
    const low = 0.4 - k * 0.03;
    const wall = backZ + 0.02 + k * 0.012;
    run(
      [
        [wx, y, backZ + z],
        [wx, low, backZ + z],
        [wx, low, wall],
        [0.5, low, wall],
        [0.5, 0.12, wall],
      ],
      'chemical-tube',
      0.008,
    );
  });

  // A plant tag on each part, as an installer labels them: on the skid's
  // front edge under the front row, on the parts behind.
  const tag = (text: string, x: number, y: number, z: number) => {
    const label = createMicroLabel(kit, text, {
      height: 0.013,
      ink: '#1d2125',
      plate: '#f2efe2',
    });
    label.position.set(x, y, z);
    skid.add(label);
  };
  const edge = 0.351;
  if (!jets) tag('SV1  SURGE VESSEL', -0.66, skidY - 0.03, edge);
  tag('P1  CIRCULATION PUMP', -0.27, skidY - 0.03, edge);
  tag('F1  SAND FILTER', 0.34, skidY - 0.03, edge);
  tag('UV1  UV UNIT', 0.7, skidY - 0.03, edge);
  tag('HX1  HEAT EXCHANGER', 0.35, skidY + 0.42, -0.24);
  tag('DC1  DOSING CONTROLLER', -0.3, skidY + 0.95, backZ + 0.002);

  // ---- The jets' bay: the jet pump and the air blower --------------------
  const jetPump = jets ? createJetPump(kit) : null;
  const blower = jets ? createAirBlower(kit) : null;
  if (jetPump && blower) {
    const { pump: at, blower: blowerAt } = jetsBay(c);
    jetPump.position.set(...at);
    blower.position.set(...blowerAt);
    shell.add(jetPump, blower);
    const back = {
      at: [0, 0, -c.d / 2 + c.wall / 2] as const,
      normal: [0, 0, 1] as const,
      kind: 'grommet' as const,
      thickness: c.wall,
    };
    const line = (points: [number, number, number][], od: number) =>
      shell.add(
        createPipe('pvc-pressure', od, points, {
          laid: true,
          through: [back],
          ends: ['open', 'open'],
        }),
      );
    // The jets' suction, their discharge, the blower's air line
    // (`cabinetPipework`).
    for (const r of jetsRuns(c)) line(r.points, r.od);
  }

  // ---- The doors ---------------------------------------------------------
  const leaf = (side: -1 | 1) => {
    const hinge = new Group();
    hinge.position.set(side * (c.w / 2), 0.1, hd);
    body.add(hinge);
    const face = new Group();
    face.position.x = -side * (leafW / 2);
    hinge.add(face);
    t.box(face, steel, leafW, c.h - 0.13, 0.025, 0, (c.h - 0.13) / 2, 0.0125);
    // Its vents, through the door: louvres outside matching those of its
    // inside cover (`createDoorRearCover`), near its top and its foot.
    const pan = c.h - 0.176;
    const ventH = Math.min(0.072, pan * 0.22);
    const ventW = Math.min(0.24, leafW - 0.086);
    for (const k of [-1, 1]) {
      const vent = createLouvres(kit, ventW, ventH, steel);
      vent.name = 'Spa set cabinet door vent';
      vent.position.set(
        0,
        (c.h - 0.13) / 2 + k * (pan / 2 - ventH / 2 - 0.018),
        0.0255,
      );
      face.add(vent);
    }
    return { hinge, face };
  };
  const left = leaf(-1);
  const right = leaf(1);
  const badge = createBrandBadge(kit, 'lidoluxe', { height: 0.05 });
  badge.position.set(0, 1.78, 0.026);
  left.face.add(badge);
  const plate = createMicroLabel(kit, `PACKAGED SPA SET · ${circuit}`, {
    height: 0.018,
    ink: '#1d2125',
  });
  plate.position.set(0, 1.78, 0.026);
  right.face.add(plate);

  // ---- The control panel, on the left door -------------------------------
  const panel = new Group();
  panel.position.set(0, 1.2, 0.026);
  left.face.add(panel);
  const panelW = jets ? 0.8 : 0.5;
  // The common controls sit at its left; the jets' at its right.
  const shift = jets ? -0.15 : 0;
  // Taller than its controls: its own mimic along the top (the owner,
  // 2026-10-23: a set this small has no board of its own).
  t.box(panel, t.paint('#c8ccc4', 0.55), panelW, 0.72, 0.04, 0, 0.14, 0.02);
  const front = new Group();
  front.position.z = 0.041;
  panel.add(front);
  panelMakerMark(kit, front, {
    width: panelW,
    height: 0.44,
    z: 0,
    corner: 'bottom-right',
  });
  const parts = createPartSet();
  const pool = jets ? 'pool_03' : 'pool_04';
  const store = inService && typeof window !== 'undefined' ? roomWorld() : null;
  // Its thermostat's setting: the world's pool's, or, an exhibit, its own.
  let ownSet = jets ? 37 : 34;
  // The jacuzzi's: its controller in the world (`jacuzzi-cabinet.ts`),
  // or a trial's.
  const jz = jets
    ? (jacuzziBinding ?? (store ? jacuzziWorldBinding(store) : null))
    : null;
  const setting = () =>
    jz?.setpoint() ??
    external?.state().setpoint ??
    store?.world.value.pools[pool].setpoint ??
    ownSet;
  const panelNow = (doorOpen = false) => jz?.panel(doorOpen) ?? null;
  // Its filter's programme: a trial's, an exhibit's, or the world's.
  const filterBinding =
    jz?.filter ??
    external?.filter ??
    (store ? spaFilterWorldBinding(store, pool) : undefined);
  const mimic = createCabinetMimic(kit, {
    drainAndMakeUp: !jets,
    // One display on both, the maker's dot-matrix (the owner, 2026-10-25).
    display: 'lcd',
    onMode: () => filterBinding?.mode(),
    onWashNow: () => filterBinding?.washNow(),
    parts,
    onSet: (step) => {
      const celsius = clampSetpoint(setting() + step);
      if (jz) jz.setSetpoint(celsius);
      else if (external) external.setSetpoint(celsius);
      else if (store) store.dispatch({ type: 'pool/setpoint', pool, celsius });
      else ownSet = celsius;
    },
  });
  mimic.group.position.set(shift, 0.355, 0.001);
  front.add(mimic.group);
  const footbathStore =
    inService && !jets && typeof window !== 'undefined' ? roomWorld() : null;
  const power = parts.add(
    selector(kit, {
      positions: 2,
      initial: inService ? 1 : 0,
      bound: external
        ? {
            get value() {
              return external.state().powerOn ? 1 : 0;
            },
            set: (position: number) => external.setPower(position === 1),
          }
        : jz
          ? {
              get value() {
                return jz.power() ? 1 : 0;
              },
              set: (position: number) => jz.setPower(position === 1),
            }
          : footbathStore
            ? {
                get value() {
                  return partOn(
                    footbathStore.world.value.identifiedPlant,
                    FOOTBATH.power,
                  )
                    ? 1
                    : 0;
                },
                set: (position) =>
                  footbathStore.dispatch({
                    type: 'plant/switch',
                    id: FOOTBATH.power,
                    on: position === 1,
                  }),
              }
            : undefined,
      legend: 'POWER',
      name: 'Spa set power',
    }),
  );
  power.object.position.set(-0.15 + shift + ROW_NUDGE.x, 0.06 + ROW_NUDGE.y, 0);
  power.object.scale.setScalar(0.8);
  front.add(power.object);
  const latches = ([left, right] as const).map((door, i) => {
    const latch = parts.add(
      doorLatch(kit, {
        material: dark,
        name: `Spa set cabinet ${i ? 'right' : 'left'} door`,
      }),
    );
    latch.object.position.set(
      i ? -(leafW / 2 - 0.08) : leafW / 2 - 0.08,
      1.0,
      0.026,
    );
    door.face.add(latch.object);
    // The rear skin is a second way to work the same door. When the
    // cabinet is open, clicking its inside closes the shared latch.
    const back = parts.add(
      doorBack(kit, {
        shared: latch.door,
        material: steel,
        name: `Spa set cabinet ${i ? 'right' : 'left'} inside cover`,
        layout: {
          width: leafW - 0.006,
          height: c.h - 0.136,
          panWidth: leafW - 0.046,
          panHeight: c.h - 0.176,
          panX: 0,
          flangeDepth: 0.002,
          panDepth: 0.012,
          opening: null,
        },
      }),
    );
    back.object.position.set(0, (c.h - 0.13) / 2, -0.002);
    door.face.add(back.object);
    return latch;
  });
  // Its supply, through the isolator on the wall beside it: off, the
  // whole panel is dead, its lamps dark and its pump stopped. The room
  // sets it (`object.userData.supply`); on its own, it is always fed.
  const supplied = signal(true);
  /** Its chemical feeds' messages, for its display (`feedMessages`). */
  let feedWords: string[] = [];
  object.userData.supply = supplied;
  const trialLowWater = signal(false);
  // Its pump's cutout: the foot spa's on low water; the jacuzzi's its
  // no-flow trip, latched in the world until RESET (`jacuzzi-cabinet.ts`).
  const lowWater = computed(() => {
    if (external) return trialLowWater.value;
    const w = store?.world.value;
    if (!w) return false;
    return jets
      ? w.jacuzziCabinet.trip !== ''
      : footbathPumpStarved(
          w.pools.pool_04,
          footbathLineup(w.identifiedPlant).draining,
        );
  });
  // Its controller starting and stopping, as the world has it
  // (`cabinet-boot.ts`): a trial's and an exhibit's have none.
  const boot = computed(() =>
    !jacuzziBinding && !external
      ? (store?.world.value.cabinets[pool] ?? null)
      : null,
  );
  const bootReady = computed(() =>
    boot.value ? cabinetReady(boot.value) : true,
  );
  const doorOpen = computed(() => latches.some((l) => l.open.value));
  // The jacuzzi's panel, as its controller has it.
  const jacuzziPanel = computed(() => panelNow(doorOpen.value));
  // Its pump's motor: running dead-headed, too, until it trips.
  // Its filter's wash programme, where it has one (`spa-filter.ts`).
  const washBinding = filterBinding;
  const wash = signal(washBinding?.signals() ?? null);
  const running = computed(() =>
    jacuzziPanel.value
      ? supplied.value && jacuzziPanel.value.pumpRun
      : supplied.value &&
        power.position.value === 1 &&
        !lowWater.value &&
        bootReady.value &&
        (wash.value?.pumpAllowed ?? true),
  );
  // Its water moving through the filter, the UV and the dosing.
  const flowing = computed(() =>
    jacuzziPanel.value
      ? supplied.value && jacuzziPanel.value.flowing
      : running.value,
  );
  // Its pump's motor, heard while it runs (the owner, 2026-10-23): at full
  // volume while either door is open more than about 20 degrees, fading
  // to 15 dB down as the last one shuts (`doorGain`). The jacuzzi's jet
  // pump and air blower likewise, each while it runs (the owner,
  // 2026-10-24), louder than the circulation: bigger motors.
  const HUM = 0.07;
  const doors = signal(doorGain(0));
  const humLevel = computed(() => HUM * doors.value);
  // Lighter, faster, against the drain while it washes.
  const pumpRate = computed(() => wash.value?.pumpRate ?? 1);
  const hum = machineTone('motor', pumpRate, humLevel);
  let humming = false;
  let servoRunning = false;
  // Its controller's last phase and servo travel, for its beeps and its
  // servos' whine as they open in turn.
  let lastPhase: BootPhase | null = null;
  let lastValves: CabinetBoot['valves'] | null = null;
  let bootWhirring = false;
  const bay: {
    what: 'jets' | 'air';
    runs: ReadonlySignal<boolean>;
    source: Object3D;
    recipe: ReturnType<typeof machineTone>;
    on: boolean;
  }[] = [];
  const doorLamp = computed(() => supplied.value && doorOpen.value);
  // Lit with its flow, after its warm-up once a wash is done.
  const uvOn = computed(
    () => flowing.value && !doorOpen.value && (wash.value?.uvReady ?? true),
  );
  (
    [
      ['PUMP RUN', 'green', running],
      ['UV ON', 'blue', uvOn],
      ['DOOR OPEN', 'amber', doorLamp],
    ] as const
  ).forEach(([legend, colour, drive], i) => {
    const lamp = parts.add(
      pilotLight(kit, {
        colour,
        legend,
        drive,
        pushToTest: false,
        name: `Spa set ${legend.toLowerCase()} lamp`,
      }),
    );
    lamp.object.position.set(
      0.02 + shift + i * 0.1 + ROW_NUDGE.x,
      0.06 + ROW_NUDGE.y,
      0,
    );
    lamp.object.scale.setScalar(0.8);
    front.add(lamp.object);
  });
  {
    const fault = parts.add(
      pilotLight(kit, {
        colour: 'red',
        legend: jets ? 'NO FLOW' : 'LOW WATER',
        drive: computed(() =>
          jacuzziPanel.value
            ? supplied.value && jacuzziPanel.value.noFlow
            : supplied.value && lowWater.value,
        ),
        pushToTest: false,
        name: jets
          ? 'Jacuzzi cabinet no-flow cutout lamp'
          : 'Foot spa cabinet low-water cutout lamp',
      }),
    );
    fault.object.position.set(jets ? -0.03 : -0.15, -0.11, 0);
    fault.object.scale.setScalar(0.8);
    front.add(fault.object);
  }
  // The jacuzzi's RESET, beside its NO FLOW lamp: clears a no-flow trip
  // once there is a way through again; dead without power.
  if (jets) {
    const reset = parts.add(
      pushButton(kit, {
        colour: 'black',
        power: supplied,
        legend: 'RESET',
        name: 'Jacuzzi cabinet reset button',
        action: () => jz?.reset(),
      }),
    );
    reset.object.position.set(0.07, -0.11, 0);
    reset.object.scale.setScalar(0.8);
    front.add(reset.object);
  }
  // No gauge on the door, which nothing connects to (the owner,
  // 2026-10-25): the filter's pressure is on its own gauge inside, on the
  // filter, and on the display's FILTER page.
  // The jets and the air, each on its own switch, interlocked with the
  // circulation: neither runs unless the pump does.
  // The jets and the air, each on an illuminated button: pressed to start
  // and to stop, lit while it runs, and run only with the circulation.
  // In service they are the world's (`game/plant/jacuzzi.ts`), worked from
  // here and from the plate by the tub alike, so the lamp follows the world
  // whichever started it; an exhibit keeps its own.
  if (jets) {
    (
      [
        ['JETS', 'jets'],
        ['AIR', 'air'],
      ] as const
    ).forEach(([legend, what], i) => {
      const own = signal(false);
      const lit = computed(() =>
        jz ? jz.runs()[what] : running.value && own.value,
      );
      const button = parts.add(
        pushButton(kit, {
          colour: 'green',
          head: 'illuminated',
          lamp: lit,
          // Dead with the cabinet's supply off: a press does nothing.
          power: supplied,
          legend,
          name: `Spa set ${legend.toLowerCase()} button`,
          action: () => (jz ? jz.toggle(what) : (own.value = !own.value)),
        }),
      );
      // Heard while it runs: the jet pump's motor, the blower's whine.
      const source = what === 'jets' ? jetPump : blower;
      if (source)
        bay.push({
          what,
          runs: lit,
          source,
          recipe:
            what === 'jets'
              ? machineTone(
                  'pump',
                  signal(1),
                  computed(() => 0.11 * doors.value),
                )
              : machineTone(
                  'side-channel',
                  signal(1),
                  computed(() => 0.09 * doors.value),
                ),
          on: false,
        });
      // JETS in the upper row, nudged with it; AIR below, where it was.
      button.object.position.set(
        0.26 + (i ? 0 : ROW_NUDGE.x),
        i ? -0.11 : 0.06 + ROW_NUDGE.y,
        0,
      );
      button.object.scale.setScalar(0.8);
      front.add(button.object);
    });
  }

  // Everything here moves or changes: none of it is merged.
  object.traverse((o) => (o.userData.live = true));
  let swing = [0, 0];
  return {
    object,
    parts,
    update(delta) {
      if (external) trialLowWater.value = external.state().litres < 60;
      const ease = Math.min(1, delta * 4);
      swing = latches.map(
        (l, i) => swing[i] + ((l.open.value ? OPEN : 0) - swing[i]) * ease,
      );
      left.hinge.rotation.y = -swing[0];
      right.hinge.rotation.y = swing[1];
      // Heard by the wider-open door.
      doors.value = doorGain((Math.max(swing[0], swing[1]) * 180) / Math.PI);
      for (const b of bay) {
        const sounding = b.runs.value;
        if (sounding !== b.on) {
          b.on = sounding;
          partAudio.hold(b.source, sounding ? b.recipe : null, b.source);
        }
      }
      const on = running.value;
      if (on !== humming) {
        humming = on;
        partAudio.hold(pump.group, on ? hum : null, pump.group);
      }
      const moving = flowing.value;
      pump.update(delta, on);
      // Its programme's state now, and its servo valves heard as they move.
      wash.value = washBinding?.signals() ?? null;
      const servos = !!wash.value?.servos;
      if (servos !== servoRunning) {
        servoRunning = servos;
        if (filter) {
          partAudio.hold(
            filter.group,
            servos ? SERVO_WHIRR : null,
            filter.group,
          );
          if (!servos) partAudio.play(VALVE_STOP, filter.group);
        }
      }
      // Its gauge: the pump's pressure on it, filtering or washing.
      filter?.update(
        delta,
        running.value ? (wash.value?.gaugeBar ?? WORKING) : 0,
        washBinding?.glass(running.value),
      );
      uv.update(delta, uvOn.value);
      // The foot spa's surge vessel; the jacuzzi's tank is outside.
      vessel?.update(delta, moving);
      exchanger.update();
      // Its peristaltic pumps stop while it washes, and each while its
      // chemical cannot reach it (the owner, 2026-10-28: they turned with
      // the footbath's feeds shut); its readouts its water's.
      const dosingOn = moving && (wash.value?.dosing ?? true);
      const wd = store?.world.value;
      const feeds = wd ? cabinetFeeds(wd, pool, dosingOn) : null;
      dosing.update(
        delta,
        dosingOn,
        wd ? wd.pools[pool].freeChlorine : 1.8,
        wd ? wd.pools[pool].ph : 7.3,
        [
          dosingOn && !feeds?.fault.includes('hypochlorite'),
          dosingOn && !feeds?.fault.includes('acid'),
        ],
      );
      feedWords = feeds ? feedMessages(feeds) : [];
      // Its mimic, as the world has its water (an exhibit: as if in service).
      const w = store?.world.value;
      const trial = external?.state();
      const lineup = w && !jets ? footbathLineup(w.identifiedPlant) : null;
      // Its controller: a beep coming online, three for a fault; its
      // servos heard as each opens in turn, or springs shut.
      const b = boot.value;
      let bootText: string | null = null;
      if (b && w) {
        const beep = lastPhase ? bootBeepFor(lastPhase, b.phase) : null;
        if (beep)
          partAudio.play(beep === 'online' ? ONLINE_BEEP : FAULT_BEEP, object);
        lastPhase = b.phase;
        const turning =
          !!lastValves &&
          CABINET_SERVOS.some((v) => b.valves[v] !== lastValves![v]);
        lastValves = b.valves;
        if (turning !== bootWhirring) {
          bootWhirring = turning;
          partAudio.hold(
            exchanger.group,
            turning ? SERVO_WHIRR : null,
            exchanger.group,
          );
          if (!turning) partAudio.play(VALVE_STOP, exchanger.group);
        }
        bootText = bootLine(b, cabinetBootInputs(w)[pool].fault);
      }
      /** Its display's lines, its controller's word on the second while it starts. */
      const withBoot = (l: readonly [string, string] | null) =>
        l && bootText ? ([l[0], bootText.padEnd(16)] as const) : l;
      mimic.show({
        pump: on,
        uv: uvOn.value,
        heat:
          flowing.value &&
          (jz ? jz.heating() : w ? w.pools[pool].heating > 0.05 : true),
        drain: trial?.draining ?? (!!lineup?.draining && on),
        filling: trial?.filling ?? (!!w && !jets && footbathFilling(w)),
        makeUp: trial?.fillOpen ?? lineup?.makeUpOpen ?? false,
        waterC: !supplied.value
          ? null
          : (jz?.waterC() ??
            trial?.celsius ??
            (w ? w.pools[pool].temperature : ownSet)),
        setC: setting(),
        washLine: filterBinding?.line(),
        washing: !!wash.value?.washing,
        // What the filter's gauge inside reads: its working pressure while
        // it filters, or washes, nothing stopped.
        filterBar: running.value ? (wash.value?.gaugeBar ?? WORKING) : 0,
        ...(jets
          ? {
              lines:
                supplied.value && jacuzziPanel.value
                  ? withBoot(jacuzziPanel.value.lines)
                  : supplied.value
                    ? ([
                        `${ownSet.toFixed(1)}C  SET ${ownSet.toFixed(1)}`.padEnd(
                          16,
                        ),
                        (on ? 'RUNNING  UV ON' : 'STOPPED').padEnd(16),
                      ] as const)
                    : null,
            }
          : {
              // The foot spa's, as the jacuzzi's: its water and its state.
              lines: supplied.value
                ? ([
                    `${(trial?.celsius ?? (w ? w.pools[pool].temperature : ownSet)).toFixed(1)}C  SET ${setting().toFixed(1)}`.padEnd(
                      16,
                    ),
                    (
                      bootText ??
                      (filterBinding?.washing()
                        ? filterBinding.line()
                        : // Its state, and in turn any feed's message, 2 s
                          // each, as the jacuzzi's display does.
                          [
                            trial?.draining || lineup?.draining
                              ? 'DRAINING'
                              : on
                                ? 'RUNNING  UV ON'
                                : 'STOPPED',
                            ...feedWords,
                          ][
                            Math.floor((w?.time ?? 0) / 2) %
                              (1 + feedWords.length)
                          ])
                    ).padEnd(16),
                  ] as const)
                : null,
            }),
      });
      mimic.update(delta);
    },
    // Its motor's sound stops with its room.
    dispose: () => {
      humming = false;
      partAudio.hold(pump.group, null);
      partAudio.hold(exchanger.group, null);
      for (const b of bay) {
        b.on = false;
        partAudio.hold(b.source, null);
      }
    },
  };
}

export function spaPackDemoExhibit(binding: SpaPackDemoBinding): PlantExhibit {
  return {
    graphNodeId: 'demo.cabinet',
    title: 'Lidoluxe foot spa treatment cabinet',
    reference:
      'The same working cabinet used by the installed foot spa, connected to the ideal pool trial',
    // Its sand filter beside it, at its left (the owner, 2026-10-25).
    size: { w: 3.4, d: 1.9, h: 2.2, mount: 'floor' },
    maker: 'lidoluxe',
    build: (kit) => buildSpaPack(kit, 'IDEAL FOOT SPA', false, false, binding),
  };
}

export const SPA_PACK_EXHIBIT: PlantExhibit = {
  title: 'Packaged spa set in a prefabricated plant cabinet',
  reference:
    'For circuits under 10 m³/h (the foot spa): pump, inline UV, plate heat exchanger and surge vessel on one skid, dosing on the back wall, in a 1.7 × 0.9 × 2.1 m cabinet; its sand filter, with its sight glass, beside it',
  size: { w: 3.4, d: 1.9, h: 2.2, mount: 'floor' },
  build: (kit) => buildSpaPack(kit),
};

/** The footbath's cabinet as installed in its plant room: in service, its POWER on. */
export const SPA_PACK_IN_SERVICE: PlantExhibit = {
  ...SPA_PACK_EXHIBIT,
  // Its filter the room's own.
  size: { w: 2.1, d: 1.9, h: 2.2, mount: 'floor' },
  build: (kit) => buildSpaPack(kit, 'FOOT SPA', false, true),
};

/** The same factory cabinet labeled for the Jacuzzi circuit. */
export const JACUZZI_PACK_EXHIBIT: PlantExhibit = {
  title: 'Packaged Jacuzzi plant cabinet',
  reference:
    'For a spa circuit under 30 m³/h (the Jacuzzi, 8 m³/h): the packaged set, and a bay for its jet pump and air blower, each switched from the panel; 2.8 × 1.0 × 2.1 m cabinet, its sand filter beside it',
  size: { w: 4.6, d: 3.0, h: 2.2, mount: 'floor' },
  build: (kit) => buildSpaPack(kit, 'JACUZZI', true),
};

/** The Jacuzzi's cabinet as installed in its plant room: in service, its POWER on. */
export const JACUZZI_PACK_IN_SERVICE: PlantExhibit = {
  ...JACUZZI_PACK_EXHIBIT,
  // Its filter the room's own.
  size: { w: 3.2, d: 3.0, h: 2.2, mount: 'floor' },
  build: (kit) => buildSpaPack(kit, 'JACUZZI', true, true),
};

/**
 * The same parts on their own, each on a plinth with its name, and a
 * POWER switch that runs them all as the cabinet would: the pump's fan
 * spinning, the filter's gauge up, the UV lit and counting its hours, the
 * surge vessel drawn down, the dosing pumps turning and its readouts lit.
 */
function buildSpaParts(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Packaged spa set, its parts';
  const plinth = t.paint('#5d625f', 0.8);
  const ink = '#1d2125';
  const parts = createPartSet();
  const spots: { label: string; x: number; z?: number }[] = [
    { label: 'Circulation pump', x: -1.75 },
    { label: 'Cartridge filter', x: -1.05 },
    { label: 'Inline UV unit', x: -0.25 },
    { label: 'Plate heat exchanger', x: 0.5 },
    { label: 'Surge vessel', x: 1.1 },
    { label: 'Dosing controller', x: 1.75, z: -0.3 },
  ];
  for (const { label, x, z = 0 } of spots) {
    t.box(object, plinth, 0.62, 0.15, 0.6, x, 0.075, z);
    const name = createMicroLabel(kit, label.toUpperCase(), {
      height: 0.022,
      ink,
      plate: '#eeeae0',
    });
    name.position.set(x, 0.1, z + 0.305);
    object.add(name);
  }
  const at = <P extends { group: Group }>(part: P, x: number, z = 0): P => {
    part.group.position.set(x, 0.15, z);
    object.add(part.group);
    return part;
  };
  const pump = at(createSpaPump(kit), -1.75);
  const filter = at(createSpaSandFilter(kit, SPA_FILTERS.footSpa), -1.05);
  const uv = at(createInlineUv(kit), -0.25);
  const exchanger = at(createSpaHeatExchanger(kit), 0.5);
  const vessel = at(createSurgeVessel(kit), 1.1);
  // The dosing controller on a little wall of its own.
  t.box(object, t.paint('#c9ccc4', 0.8), 0.6, 1.1, 0.04, 1.75, 0.7, -0.3);
  const dosing = at(createSpaDosingController(kit), 1.75, -0.28);
  // The test switch, on a post at the front.
  const post = new Group();
  post.position.set(-2.35, 0, 0.15);
  object.add(post);
  t.box(post, t.paint('#3a3d40', 0.6), 0.05, 1.0, 0.05, 0, 0.5, 0);
  t.box(post, t.paint('#c8ccc4', 0.55), 0.22, 0.22, 0.05, 0, 1.1, 0.03);
  const face = new Group();
  face.position.set(0, 1.1, 0.056);
  post.add(face);
  const power = parts.add(
    selector(kit, {
      positions: 2,
      initial: 0,
      legend: 'POWER',
      name: 'Spa parts power',
    }),
  );
  power.object.position.set(-0.05, 0.02, 0);
  power.object.scale.setScalar(0.7);
  face.add(power.object);
  const running = computed(() => power.position.value === 1);
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'green',
      legend: 'RUN',
      drive: running,
      pushToTest: false,
      name: 'Spa parts run lamp',
    }),
  );
  lamp.object.position.set(0.06, 0.02, 0);
  lamp.object.scale.setScalar(0.7);
  face.add(lamp.object);
  object.traverse((o) => (o.userData.live = true));
  return {
    object,
    parts,
    update(delta) {
      const on = running.value;
      pump.update(delta, on);
      filter.update(delta, on ? WORKING : 0);
      uv.update(delta, on);
      vessel.update(delta, on);
      exchanger.update();
      dosing.update(delta, on, 1.8, 7.3);
    },
  };
}

export const SPA_PARTS_EXHIBIT: PlantExhibit = {
  title: 'Packaged spa set, its parts',
  reference:
    'Each part of the spa set alone: 0.4 kW self-priming pump; sand filter with its sight glass; 40 W inline UV with lamp-hours counter; 20-plate brazed heat exchanger; surge vessel; dosing controller with two peristaltic pumps',
  size: { w: 4.9, d: 1.2, h: 1.6, mount: 'floor' },
  build: buildSpaParts,
};
