import { Group, Mesh, SphereGeometry } from 'three';
import type { Object3D } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  pilotLight,
  selector,
} from '../../../components/core/parts/parts';
import {
  createPipe,
  createPipeTee,
} from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { SANS, tools } from '../../../components/core/views/fitting-tools';
import { createBrandBadge } from '../../../components/core/views/brand-badge';
import { createStencilText } from '../../../components/core/views/plant-signs';
import { wrapOnto } from '../../../components/core/views/wrap-label';
import {
  createEndSuctionPump,
  createSandFilter,
  createUvUnit,
} from '../../../components/plant/views/pumps-plant';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import { createThrottleValve } from '../../../components/plant/views/throttle-valve';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { createPipeSightGlass } from '../../../components/plant/views/pipe-sight-glass';
import { markPipe } from '../../../components/plant/views/pipe-markers';
import type { PipeService } from '../../../components/plant/views/pipe-markers';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  OZONE_AT_REST,
  createOffGasDestructor,
  createOzoneGenerator,
  createOzoneMonitor,
} from '../../../components/plant/views/ozone-plant';
import type { OzoneShown } from '../../../components/plant/logic/ozone-room';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import { createPoolClock } from '../../../components/architectural/views/pool-clock';
import {
  createExperimentalSink,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import {
  LINK_NAMES,
  NODES,
  NOTCHES,
  OZONE,
  PLANT,
  TAGS,
  actOnHall2,
  clockText,
  fittingName,
  fittingOf,
  gaugeReading,
  hall2Readings,
  networkKey,
  newHall2,
  plantClock,
  shortTag,
  solveHall2,
  stepHall2,
} from '../../../../game/plant/museum-2-clean-water';
import type {
  Hall2Action,
  Hall2Flows,
  Hall2Readings,
  Hall2State,
  LinkId,
  MachineId,
  ValveId,
} from '../../../../game/plant/museum-2-clean-water';
import {
  CARBON_SHAPE,
  CONTACT_SHAPE,
  DESTRUCTOR_SHAPE,
  FILTER_SHAPE,
  OD,
  PLACES,
  PLANT_EDGE_NORTH,
  PLANT_SHIFT,
  PORTS,
  POOL_SHAPE,
  TANK_SHAPE,
  inHall,
  plumbHall2,
} from '../../logic/museum-2-layout';
import type { PlacedItem } from '../../logic/museum-2-layout';
import { cutLine, distanceAlong } from '../../logic/ideal-pool-plant-layout';
import {
  HALL2_MIMIC,
  hall2MimicState,
  hall2Reading,
  mimicSpeed,
} from '../../logic/museum-2-mimic';
import {
  RESET_SIGN,
  filterSettingsCard,
  hall2ActivityCard,
  hall2Entrance,
  hall2Placards,
} from '../../logic/museum-2-placards';
import type { PlacardIcon } from '../../logic/ideal-pool-plant-placards';
import { localNow } from '../../logic/museum-time';
import {
  createLectern,
  createResetPedestal,
  createPumpStation,
  heldPumpSound,
  createWallPanel,
  paintActivity,
  paintEntrance,
  paintResetSign,
} from '../../views/museum-exhibit';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import type { HallExhibit } from './exhibits';
import { hallInterior } from '../../logic/museum-plan';

/**
 * Hall 2, "Clean water" (107b): the pool's water strained through sand,
 * then treated with ozone and ultraviolet light. The schematic, model,
 * layout, mimic and words are pure (`museum-2-clean-water.ts`,
 * `museum-2-*.ts`); this draws what they say and binds each thing to them.
 * The plant stands in an L round the corner hall's two outer walls (the
 * owner, 2026-10-28): up the west wall from the south, where the visitor
 * comes in from Hall 1, the inputs, the balance tank, the pump, the filter
 * and the ozone bay; then along the north wall, toward the way on to Hall
 * 3, the contact tank, the carbon, the UV unit and the pool. The entrance
 * panel, RESET and the filter's settings card hang on the east wall; the
 * mimic, the activity card and the hall's clock on the south. The hall
 * keeps its own clock in its state (dev51's: the Poolguard clock, PLANT
 * TIME, the mimic's TIME buttons), set to the visitor's time on entry. In
 * the hall's frame, metres.
 */

/**
 * The east and south walls' faces, where their panels hang flush, in the
 * exhibit's own frame: the hall as it stands now (layout C,
 * `hallInterior`), less the shift that carries the L into its corner
 * (`PLANT_SHIFT`), so that the walls, not the panels, stop the walker.
 */
const INSIDE = hallInterior('museum2');
const EAST = (INSIDE.maxX - INSIDE.minX) / 2 - PLANT_SHIFT.x;
const SOUTH = (INSIDE.maxZ - INSIDE.minZ) / 2 - PLANT_SHIFT.z;
const FACE_WEST = -Math.PI / 2;
const FACE_EAST = Math.PI / 2;
const FACE_NORTH = Math.PI;

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

/** Each pipe's marking service. */
const SERVICE: Record<LinkId, PipeService> = {
  makeup: 'pool water',
  overflow: 'pool water',
  suction: 'pool water',
  discharge: 'pool water',
  toInlet: 'pool water',
  toUnderdrain: 'pool water',
  backwashOut: 'drainage',
  rinse: 'drainage',
  waste: 'drainage',
  filtered: 'pool water',
  mainRun: 'pool water',
  sideSuction: 'pool water',
  sideDischarge: 'pool water',
  sideReturn: 'pool water',
  toContact: 'pool water',
  toCarbon: 'pool water',
  toUv: 'pool water',
  returnMain: 'pool water',
  airFeed: 'air',
  ozoneGas: 'air',
  offGas: 'air',
};

/** The placard icons the museum's lecterns draw, for the hall's two new stations. */
const ICON: Record<string, PlacardIcon> = { ozone: 'meter', uv: 'meter' };

/** The generator's model, after its 240 g/h class (`OZONE.generator`). */
const GENERATOR_MODEL = 'OZ-240';

/** What the ozone views show, from the hall. */
function ozoneShown(s: Hall2State, r: Hall2Readings): OzoneShown {
  const o = r.ozone;
  return {
    ...OZONE_AT_REST,
    powered: s.generatorOn,
    producing: o.running && o.ozone > 0,
    alarm: o.alarm,
    tripped: s.generator.trip !== null,
    message: [
      `TRIOXA ${GENERATOR_MODEL}`,
      (s.generatorOn ? o.status : 'MAINS OFF').toUpperCase().slice(0, 20),
    ],
    output: o.ozone,
    setpoint: s.setpoint / 100,
    dewPoint: PLANT.airDewPoint,
    coolingFlow: PLANT.coolingFlow,
    coolingTemp: PLANT.coolingC,
    vacuum: o.vacuum / 1000,
    booster: o.sideFlow > 0 ? 0 : 1,
    residualContact: o.contactResidual,
    residualAfter: o.carbonResidual,
    carbonUsed: s.carbon.used,
    destructorOn: s.destructorOn,
    // Its catalyst held hot while on (indicative), at the room's air when off.
    destructorTemp: s.destructorOn ? 70 : PLANT.roomC,
    roomPpm: o.roomPpm,
    warning: o.warning,
    roomAlarm: o.roomAlarm,
  };
}

/** Wrap `text` to `width` px in the context's font. */
function wrapText(c: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** The filter's settings card's face: its headline, the plant's numbers, the invitation. */
function paintSettings(card: ReturnType<typeof filterSettingsCard>) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#f6f4ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#0f6f7c';
    c.fillRect(0, 0, w, h * 0.14);
    const m = w * 0.05;
    c.fillStyle = '#ffffff';
    c.font = `bold ${h * 0.075}px ${SANS}`;
    c.fillText(card.headline, m, h * 0.095, w - 2 * m);
    c.fillStyle = '#16232b';
    const size = h * 0.047;
    c.font = `${size}px ${SANS}`;
    let y = h * 0.22;
    for (const line of card.lines) {
      for (const l of wrapText(c, line, w - 2 * m)) {
        c.fillText(l, m, y);
        y += size * 1.25;
      }
      y += size * 0.45;
    }
    c.fillStyle = '#e5631c';
    c.font = `bold ${h * 0.055}px ${SANS}`;
    c.fillText(card.invite, m, h * 0.94, w - 2 * m);
  };
}

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const plumbed = plumbHall2();
  let state: Hall2State = newHall2(localNow());
  let flows: Hall2Flows = solveHall2(state);
  let solvedFor = networkKey(state);
  let readings: Hall2Readings = hall2Readings(state, flows);
  let mimicState: MimicState = hall2MimicState(state);
  let mimicDue = 0;
  /** Solve the water again if what it depends on has changed. */
  const resolve = () => {
    const key = networkKey(state);
    if (key !== solvedFor) {
      solvedFor = key;
      flows = solveHall2(state);
    }
    readings = hall2Readings(state, flows);
  };
  /** Bumped on every act, so a switch bound to the state follows it (a reset too). */
  const version = signal(0);
  const act = (a: Hall2Action) => {
    state = actOnHall2(state, a);
    resolve();
    mimicDue = 0;
    version.value++;
  };
  /** A world value for a bound part: read through `version`, so it is tracked. */
  const bind = (get: () => number, set: (v: number) => void) => ({
    get value() {
      void version.value;
      return get();
    },
    set,
  });
  const reset = (now: number) => act({ type: 'reset', clock: now });

  const object = new Group();
  object.name = 'Hall 2: Clean water';
  const parts = createPartSet();
  const t = tools(kit);
  const updates: ((delta: number) => void)[] = [];
  const still = (thing: Object3D, worked: Set<Object3D> = new Set()) => {
    mergeTree(thing, (o) => o.userData.live === true || worked.has(o));
    return thing;
  };
  const take = (set: { uses: Map<Object3D, (d?: number) => void> }) => {
    for (const [o, use] of set.uses) parts.uses.set(o, use);
  };
  const nodeName = (id: MachineId) => NODES.find((n) => n.id === id)!.name;
  const describe = (
    thing: Object3D,
    id: string,
    name: string,
    model: { node: string } | { fitting: string },
    status?: () => string | undefined,
  ) =>
    markComponent(thing, {
      name: `${TAGS[id]} ${name}`,
      model,
      ...(status ? { status } : {}),
    });
  const atMachine = (o: Object3D, id: MachineId) =>
    turnTo(o, PLACES[id].x, 0, PLACES[id].z, PLACES[id].yaw);
  const solids: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [
    ...plumbed.solids,
  ];
  const footprint = (x: number, z: number, r = 0.3) =>
    solids.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
  /** A two-position OFF · ON switch bound to the hall's state. */
  const onOff = (
    legend: string,
    name: string,
    value: () => boolean,
    set: (on: boolean) => void,
  ) =>
    parts.add(
      selector(kit, {
        positions: 2,
        legend,
        name,
        bound: bind(
          () => (value() ? 1 : 0),
          (p) => set(p === 1),
        ),
      }),
    );

  // ---- The ideal inputs and the drain ----
  const terminals = [
    [
      'mains',
      createExperimentalSource({ id: 'm2.mains', substance: 'mains-water' }),
    ],
    [
      'air',
      createExperimentalSource({ id: 'm2.air', substance: 'compressed-air' }),
    ],
    [
      'drain',
      createExperimentalSink({ id: 'm2.drain', substance: 'dirty-water' }),
    ],
  ] as const;
  for (const [id, terminal] of terminals) {
    const view = createExperimentalSourceView(kit, terminal);
    const holder = atMachine(new Group(), id);
    holder.add(view.group);
    object.add(describe(still(holder), id, nodeName(id), { node: id }));
  }

  // ---- The balance tank and the pool ----
  const vesselPorts = (id: 'pool' | 'tank') =>
    Object.values(PORTS[id]).map((p) => ({ ...p, od: OD[150] }));
  const tank = createIdealVessel(kit, {
    ...TANK_SHAPE,
    water: PLANT.tankHead,
    name: 'Ideal balance tank',
    ports: vesselPorts('tank'),
  });
  object.add(
    describe(
      still(atMachine(tank.group, 'tank')),
      'tank',
      nodeName('tank'),
      { node: 'tank' },
      () => `its display shows ${state.tankWater.toFixed(1)} m³`,
    ),
  );
  const pool = createIdealVessel(kit, {
    ...POOL_SHAPE,
    water: PLANT.poolHead,
    name: 'Ideal pool',
    ports: vesselPorts('pool'),
  });
  object.add(
    describe(
      still(atMachine(pool.group, 'pool')),
      'pool',
      `${nodeName('pool')} (25 × 12.5 m, ${PLANT.poolVolume} m³)`,
      { node: 'pool' },
      () => `its display shows ${PLANT.poolC.toFixed(1)} °C`,
    ),
  );
  updates.push(() => {
    tank.show([
      `${shortTag('tank.li')} ${state.tankWater.toFixed(1).padStart(5)}m3 IDEAL`,
      `OUT ${readings.flows.circulation.toFixed(0).padStart(4)}m3/h ${state.lowLevel ? 'LOW' : '   '}`,
    ]);
    pool.show([
      `${shortTag('pool.ti')} ${PLANT.poolC.toFixed(1).padStart(5)}C ${PLANT.poolVolume}m3`,
      `IN ${readings.flows.toPool.toFixed(0).padStart(4)}m3/h   IDEAL`,
    ]);
  });

  // ---- The circulation pump and its local station ----
  const pump = createEndSuctionPump(kit);
  object.add(
    describe(
      still(atMachine(pump, 'pump')),
      'pump',
      `${nodeName('pump')} (Grundflow NKC 150-315)`,
      { node: 'pump' },
      () =>
        state.tripped
          ? 'stopped, tripped'
          : state.pumpRunning
            ? 'running'
            : 'stopped',
    ),
  );
  updates.push((delta) => {
    pump.gauges.suction.set(readings.flows.gauge['pump.suction.pi']);
    pump.gauges.discharge.set(
      gaugeReading(state, readings.flows, 'pump.discharge.pi'),
    );
    pump.gauges.suction.update(delta);
    pump.gauges.discharge.update(delta);
  });
  // Its sound, while it runs.
  updates.push(heldPumpSound(pump, () => state.pumpRunning && !state.tripped));
  const station = createPumpStation(kit, {
    tag: shortTag('pump'),
    start: () => act({ type: 'pump', run: true }),
    stop: () => act({ type: 'pump', run: false }),
    running: () => state.pumpRunning,
    tripped: () => state.tripped || state.lowLevel,
    resetTrip: () => act({ type: 'trip-reset' }),
  });
  turnTo(station.group, -2.2, 0, 5.5, FACE_EAST);
  object.add(station.group);
  take(station.parts);
  updates.push(station.update);
  footprint(-2.2, 5.5, 0.2);

  // ---- The sand filter, its nest's nozzles and its differential gauge ----
  const filter = createSandFilter(kit, {
    dia: FILTER_SHAPE.dia,
    shell: FILTER_SHAPE.shell,
    dn: 150,
    label: `SAND FILTER ${shortTag('filter')}`,
    bedDepth: 1.0,
  });
  object.add(
    describe(still(atMachine(filter, 'filter')), 'filter', nodeName('filter'), {
      node: 'filter',
    }),
  );
  for (const port of ['backwash-out', 'backwash-in', 'rinse']) {
    const p = PORTS.filter[port];
    const pipe = createPipe('steel-flanged', OD[150], [
      inHall('filter', [p.at[0], p.at[1], p.at[2] - 0.22]),
      inHall('filter', p.at),
    ]);
    object.add(
      markComponent(pipe, {
        name: `Sand filter nozzle (${port})`,
        model: { node: 'filter' },
      }),
    );
  }
  const dp = createDialGauge(kit, {
    dia: 0.1,
    min: 0,
    max: 1.6,
    legend: `${shortTag('filter.pdi')} ΔP`,
    entry: 'back',
  });
  const dpAt = inHall('filter', [-FILTER_SHAPE.dia / 2 + 0.05, 1.45, 0.55]);
  dp.group.position.set(...dpAt);
  dp.group.rotation.y = FACE_EAST;
  object.add(
    describe(
      dp.group,
      'filter.pdi',
      'filter differential pressure gauge',
      { node: 'filter' },
      () => `reads ${dp.value.toFixed(2)} bar`,
    ),
  );
  t.box(
    object,
    t.paint('#55616a', 0.5),
    0.04,
    1.4,
    0.04,
    dpAt[0] - 0.05,
    0.7,
    dpAt[2],
  );
  updates.push((delta) => {
    filter.show(
      {
        inlet: readings.flows.gauge['filter.inlet.pi'],
        outlet: readings.flows.gauge['filter.outlet.pi'],
      },
      delta,
    );
    dp.set(readings.flows.gauge['filter.pdi']);
    dp.update(delta);
  });

  // ---- The ozone bay: the generator, the booster, the venturi ----
  const generator = createOzoneGenerator(
    kit,
    {
      start: () => act({ type: 'generator-run', run: true }),
      stop: () => act({ type: 'generator-run', run: false }),
      reset: () => act({ type: 'generator-reset' }),
      mains: (on) => act({ type: 'generator-power', on }),
      setpoint: (share) => act({ type: 'setpoint', percent: share * 100 }),
    },
    {
      inService: true,
      model: GENERATOR_MODEL,
      rated: OZONE.generator.rated,
      bound: {
        mains: bind(
          () => (state.generatorOn ? 1 : 0),
          (p) => act({ type: 'generator-power', on: p === 1 }),
        ),
        setpoint: bind(
          () => Math.round(state.setpoint / 5),
          (k) => act({ type: 'setpoint', percent: k * 5 }),
        ),
      },
    },
  );
  object.add(
    describe(
      still(
        atMachine(generator.group, 'generator'),
        new Set(generator.parts.uses.keys()),
      ),
      'generator',
      `${nodeName('generator')} (Trioxa ${GENERATOR_MODEL})`,
      { node: 'generator' },
      () =>
        !state.generatorOn
          ? 'MAINS off, its display dark'
          : readings.ozone.alarm
            ? 'its ALARM lamp lit'
            : readings.ozone.running
              ? `OZONE ON lamp lit, meter at ${readings.ozone.ozone.toFixed(0)} g/h`
              : 'POWER lamp lit, not making ozone',
    ),
  );
  take(generator.parts);
  let shown: OzoneShown = ozoneShown(state, readings);
  updates.push((delta) => {
    shown = ozoneShown(state, readings);
    generator.show(shown, delta);
    generator.parts.update(delta);
  });

  // The booster: a small Grundflow end-suction set, its suction toward the
  // tees, its volute under the venturi, its motor on toward the generator.
  {
    const g = new Group();
    const livery = t.paint('#2f5fb8', 0.45, 0.2);
    const iron = t.paint('#30343a', 0.5, 0.4);
    const pvc = t.paint('#5f6669', 0.5);
    t.box(g, t.paint('#3e4a55', 0.6, 0.3), 1.3, 0.08, 0.4, 0.2, 0.04, 0);
    t.box(g, iron, 0.18, 0.44, 0.2, 0.25, 0.3, 0);
    t.cyl(g, iron, 0.17, 0.2, 0.25, 0.6, 0, 'x', 24);
    t.cyl(g, livery, 0.13, 0.42, 0.6, 0.6, 0, 'x', 24);
    t.box(g, livery, 0.22, 0.4, 0.2, 0.6, 0.28, 0);
    t.cyl(g, pvc, 0.038, 0.6, -0.2, 0.6, 0, 'x');
    t.cyl(g, pvc, 0.038, 0.2, 0.25, 0.86, 0);
    const badge = createBrandBadge(kit, 'grundflow', { height: 0.03 });
    badge.position.set(0.6, 0.6, 0.135);
    g.add(badge);
    object.add(
      describe(
        still(atMachine(g, 'booster')),
        'booster',
        `${nodeName('booster')} (Grundflow, 2.2 kW)`,
        { node: 'booster' },
        () => (readings.ozone.sideFlow > 0 ? 'running' : 'stopped'),
      ),
    );
  }
  // Its local starter on a post at the bay's front: RUN lamp, OFF · ON.
  {
    const g = new Group();
    turnTo(g, -4.9, 0, -1.2, FACE_EAST);
    t.box(g, t.paint('#55616a', 0.5), 0.06, 1.2, 0.06, 0, 0.6, -0.05);
    t.box(g, t.paint('#c9ccc6', 0.55), 0.24, 0.3, 0.1, 0, 1.3, 0);
    const run = signal(false);
    const lamp = parts.add(
      pilotLight(kit, {
        colour: 'green',
        legend: 'RUN',
        drive: run,
        name: `${shortTag('booster')} RUN lamp`,
      }),
    );
    lamp.object.position.set(0, 1.39, 0.052);
    g.add(lamp.object);
    const sw = onOff(
      `${shortTag('booster')}  OFF · ON`,
      `${shortTag('booster')} booster pump switch`,
      () => state.boosterRunning,
      (on) => act({ type: 'booster', run: on }),
    );
    sw.object.position.set(0, 1.25, 0.052);
    g.add(sw.object);
    object.add(
      markComponent(g, {
        name: `${TAGS.booster} booster pump local starter`,
        model: { node: 'booster' },
        status: () =>
          `switch at ${state.boosterRunning ? 'ON' : 'OFF'}, RUN lamp ${run.value ? 'lit' : 'out'}`,
      }),
    );
    updates.push(() => {
      const on = readings.ozone.sideFlow > 0;
      if (run.value !== on) run.value = on;
    });
    footprint(-4.9, -1.2, 0.15);
  }

  // The venturi injector, in the side stream above the booster, the gas in at its throat, its vacuum gauge PI5.
  {
    const g = atMachine(new Group(), 'injector');
    const body = t.paint('#e6e2d8', 0.4);
    t.cyl(g, body, 0.04, 0.2, 0, 2.1, 0, 'y', 16);
    t.cyl(g, body, 0.022, 0.06, 0, 2.22, 0, 'y', 16);
    t.cyl(g, body, 0.04, 0.2, 0, 2.35, 0, 'y', 16);
    t.cyl(g, t.paint('#c9cdcf', 0.3, 0.8), 0.014, 0.12, 0, 2.22, -0.06, 'z');
    const badge = createBrandBadge(kit, 'trioxa', { height: 0.02 });
    badge.position.set(0, 2.06, 0.042);
    g.add(badge);
    const vac = createDialGauge(kit, {
      kind: 'compound',
      dia: 0.1,
      min: -1,
      max: 0.6,
      legend: shortTag('injector.pi'),
      entry: 'back',
    });
    vac.group.position.set(0.11, 2.22, 0.02);
    g.add(vac.group);
    object.add(
      describe(
        still(g),
        'injector',
        `${nodeName('injector')} (Trioxa)`,
        { node: 'injector' },
        () => `${shortTag('injector.pi')} reads ${vac.value.toFixed(2)} bar`,
      ),
    );
    updates.push((delta) => {
      vac.set(readings.ozone.vacuum / 1000);
      vac.update(delta);
    });
  }

  // ---- The contact tank and its off-gas destructor ----
  {
    const g = atMachine(new Group(), 'contact');
    const r = CONTACT_SHAPE.dia / 2;
    const grp = t.paint('#7d8f6a', 0.6);
    t.box(
      g,
      t.paint('#9c9a94', 0.8),
      CONTACT_SHAPE.dia,
      0.1,
      CONTACT_SHAPE.dia,
      0,
      0.05,
      0,
    );
    t.cyl(g, grp, r, 2.3, 0, 1.25, 0, 'y', 32);
    const dome = new Mesh(
      new SphereGeometry(r, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      grp,
    );
    dome.scale.y = 0.18;
    dome.position.set(0, 2.4, 0);
    g.add(dome);
    const pvc = t.paint('#5f6669', 0.5);
    // Its nozzles, to its ports: the water in through the roof, out low on the front, the vent up.
    const inlet = PORTS.contact.inlet.at;
    t.cyl(
      g,
      pvc,
      0.085,
      inlet[1] - 2.4,
      inlet[0],
      (inlet[1] + 2.4) / 2,
      inlet[2],
    );
    const vent = PORTS.contact.vent.at;
    t.cyl(g, pvc, 0.02, vent[1] - 2.4, vent[0], (vent[1] + 2.4) / 2, vent[2]);
    const out = PORTS.contact.outlet.at;
    const shell = Math.sqrt(r * r - out[0] * out[0]) - 0.05;
    t.cyl(
      g,
      pvc,
      0.085,
      out[2] - shell,
      out[0],
      out[1],
      (out[2] + shell) / 2,
      'z',
    );
    const stencil = (
      text: string,
      y: number,
      height: number,
      colour: string,
    ) => {
      const paint = createStencilText(kit, text, {
        height,
        colour,
        drips: false,
      });
      paint.position.set(0, y, r);
      g.add(wrapOnto(paint, [0, 0], r + 0.002));
    };
    stencil(
      `OZONE CONTACT TANK ${shortTag('contact')}\n7 M3`,
      1.75,
      0.09,
      '#e9e5d3',
    );
    stencil('DANGER OZONE\nDO NOT ENTER', 1.3, 0.08, '#f2c21b');
    const badge = createBrandBadge(kit, 'trioxa', { height: 0.04 });
    badge.position.set(0, 2.15, r + 0.01);
    g.add(badge);
    // The destructor's isolator on the tank's front, at hand: OFF · ON.
    const sw = onOff(
      `${shortTag('destructor')}  OFF · ON`,
      `${shortTag('destructor')} off-gas destructor switch`,
      () => state.destructorOn,
      (on) => act({ type: 'destructor', on }),
    );
    const at = [-0.55, 1.2] as const;
    const box = new Group();
    box.position.set(at[0], at[1], Math.sqrt(r * r - at[0] * at[0]) + 0.02);
    box.rotation.y = Math.atan2(at[0], Math.sqrt(r * r - at[0] * at[0]));
    t.box(box, t.paint('#c9ccc6', 0.55), 0.18, 0.22, 0.08, 0, 0, 0.04);
    sw.object.position.set(0, -0.02, 0.082);
    box.add(sw.object);
    g.add(box);
    object.add(
      describe(
        still(g, new Set([sw.object])),
        'contact',
        `${nodeName('contact')} (Trioxa, 7 m³)`,
        { node: 'contact' },
        () => `its destructor switch at ${state.destructorOn ? 'ON' : 'OFF'}`,
      ),
    );
    const destructor = createOffGasDestructor(kit);
    const d = new Group();
    atMachine(d, 'destructor');
    destructor.group.position.set(
      0,
      CONTACT_SHAPE.h + DESTRUCTOR_SHAPE.above + 0.21,
      -0.35,
    );
    d.add(destructor.group);
    object.add(
      describe(
        d,
        'destructor',
        `${nodeName('destructor')} (Trioxa)`,
        { node: 'destructor' },
        () =>
          state.destructorOn
            ? 'its HEATER ON lamp lit'
            : 'its HEATER ON lamp out',
      ),
    );
    take(destructor.parts);
    updates.push((delta) => {
      destructor.show(shown, delta);
      destructor.parts.update(delta);
    });
  }

  // ---- The carbon deozoniser ----
  {
    const g = atMachine(new Group(), 'carbon');
    const r = CARBON_SHAPE.dia / 2;
    const body = t.paint('#2f5f7a', 0.45, 0.3);
    t.cyl(g, body, r, 1.5, 0, 1.2, 0, 'y', 32);
    for (const y of [0.45, 1.95]) {
      const end = new Mesh(
        new SphereGeometry(r, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        body,
      );
      end.scale.y = y > 1 ? 0.35 : -0.35;
      end.position.set(0, y, 0);
      g.add(end);
    }
    const leg = t.paint('#2a2d30', 0.6, 0.3);
    for (const [x, z] of [
      [-0.8, 0.8],
      [0.8, 0.8],
      [-0.8, -0.8],
      [0.8, -0.8],
    ] as const)
      t.box(g, leg, 0.08, 0.45, 0.08, x, 0.225, z);
    const pvc = t.paint('#5f6669', 0.5);
    for (const port of ['inlet', 'outlet'] as const) {
      const p = PORTS.carbon[port].at;
      const shell = Math.sqrt(r * r - p[0] * p[0]) - 0.05;
      t.cyl(g, pvc, 0.085, p[2] - shell, p[0], p[1], (p[2] + shell) / 2, 'z');
    }
    const stencil = createStencilText(
      kit,
      `ACTIVATED CARBON\nDEOZONISER ${shortTag('carbon')}`,
      { height: 0.08, colour: '#e9e5d3', drips: false },
    );
    stencil.position.set(0, 1.35, r);
    g.add(wrapOnto(stencil, [0, 0], r + 0.002));
    const badge = createBrandBadge(kit, 'trioxa', { height: 0.04 });
    badge.position.set(0, 1.75, r + 0.01);
    g.add(badge);
    object.add(
      describe(
        still(g),
        'carbon',
        `${nodeName('carbon')} (Trioxa, Ø${CARBON_SHAPE.dia} m)`,
        { node: 'carbon' },
      ),
    );
  }

  // ---- The UV unit, its switch on its panel's stand ----
  {
    const uv = createUvUnit(kit);
    const g = atMachine(new Group(), 'uv');
    g.add(uv);
    const sw = onOff(
      `${shortTag('uv')}  OFF · ON`,
      `${shortTag('uv')} UV unit switch`,
      () => state.uvOn,
      (on) => act({ type: 'uv', on }),
    );
    const box = new Group();
    box.position.set(0.2, 0.95, 0.62);
    t.box(box, t.paint('#c9ccc6', 0.55), 0.16, 0.18, 0.06, 0, 0, 0);
    sw.object.position.set(0, -0.02, 0.032);
    box.add(sw.object);
    g.add(box);
    // A viewing port on the chamber: violet while the lamp is lit.
    const glow = t.paint('#9d7cff', 0.3);
    const dark = t.paint('#2a2d34', 0.3);
    const port = t.cyl(g, glow, 0.03, 0.03, -0.3, 0.8, 0.11, 'z', 16);
    port.userData.live = true;
    object.add(
      describe(
        still(g, new Set([sw.object])),
        'uv',
        `${nodeName('uv')} (Lidoluxe, after the VGE Pro 2000-219)`,
        { node: 'uv' },
        () =>
          readings.uvLit
            ? `its lamp lit, ${shortTag('uv.ri')} at ${readings.uvIntensity.toFixed(0)} W/m²`
            : state.uvOn
              ? 'switched on, its lamp out (too little flow)'
              : 'switched off',
      ),
    );
    let uvShown = '';
    updates.push(() => {
      const lit = readings.uvLit;
      const key = `${lit}|${Math.round(readings.uvIntensity)}|${Math.floor(state.uvHours)}|${state.uvOn}`;
      if (key === uvShown) return;
      uvShown = key;
      uv.show({
        on: lit,
        flowing: state.uvOn && !lit,
        intensity: readings.uvIntensity,
        hours: state.uvHours,
      });
      port.material = lit ? glow : dark;
    });
  }

  // ---- The ozone-in-air monitor, on the east wall by the way on ----
  {
    const monitor = createOzoneMonitor(kit, {
      test: () => {},
      reset: () => act({ type: 'monitor-reset' }),
    });
    turnTo(monitor.group, EAST, 1.15, -1.0, FACE_WEST);
    object.add(
      describe(
        monitor.group,
        'hall.ai',
        'ozone-in-air monitor (Trioxa)',
        { node: 'generator' },
        () =>
          readings.ozone.roomAlarm
            ? 'its ALARM lamp lit'
            : readings.ozone.warning
              ? 'its WARNING lamp lit'
              : `reads ${readings.ozone.roomPpm.toFixed(2)} ppm`,
      ),
    );
    take(monitor.parts);
    updates.push((delta) => {
      monitor.show(shown, delta);
      monitor.parts.update(delta);
    });
  }

  // ---- The pipes and tees ----
  const glassItem = plumbed.items.find((i) => i.id === 'backwashOut.sg');
  for (const line of plumbed.lines) {
    let runs = [line.points];
    if (glassItem && glassItem.edge === line.edge) {
      const d = distanceAlong(line.points, glassItem.at);
      runs = cutLine(line.points, d - 0.17, d + 0.17);
    }
    for (const points of runs) {
      const pipe = createPipe(
        line.pipe === 'ozone-gas' ? 'stainless' : 'pvc-pressure',
        line.od,
        points,
        line.pipe === 'ozone-gas' ? {} : { colour: '#4d5a63' },
      );
      markComponent(pipe, {
        name: `Pipe: ${LINK_NAMES[line.edge]}`,
        model: { link: line.edge },
      });
      object.add(pipe);
    }
    object.add(
      markPipe(kit, line.points, {
        radius: line.od / 2,
        service: SERVICE[line.edge],
        text: LINK_NAMES[line.edge].toUpperCase(),
        flow: 1,
      }),
    );
  }
  for (const id of ['feedTee', 'wasteTee', 'sideTee', 'mixTee'] as const) {
    const ports = Object.values(PORTS[id]);
    const opposite = (a: (typeof ports)[number]) =>
      ports.some(
        (b) => a !== b && a.out.every((v, k) => Math.abs(v + b.out[k]) < 1e-9),
      );
    const main = ports.find(opposite);
    const branch = ports.find((p) => !opposite(p))!;
    // Every port's mouth is 0.15 m out from the fitting's middle.
    const centre = inHall(
      id,
      [0, 1, 2].map((n) => branch.at[n] - branch.out[n] * 0.15) as [
        number,
        number,
        number,
      ],
    );
    const yaw = PLACES[id].yaw;
    const turn = (v: readonly number[]) =>
      [
        v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw),
        v[1],
        -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw),
      ] as [number, number, number];
    const side = id === 'sideTee' || id === 'mixTee';
    const tee = main
      ? createPipeTee(
          'pvc-pressure',
          OD[150],
          side ? OD[65] : OD[150],
          centre,
          turn(main.out),
          turn(branch.out),
        )
      : new Group();
    if (!main) {
      // TE3's three ways are square to each other: the main in level and
      // out upward, the side stream off level: a tee on its side with a
      // bend, drawn as its three spigots from its body.
      for (const [name, p] of Object.entries(PORTS[id]))
        tee.add(
          createPipe(
            'pvc-pressure',
            name === 'branch' ? OD[65] : OD[150],
            [centre, inHall(id, p.at)],
            { colour: '#4d5a63' },
          ),
        );
      t.box(tee, t.paint('#4d5a63', 0.5), 0.2, 0.2, 0.2, ...centre);
    }
    object.add(describe(tee, id, nodeName(id), { node: id }));
  }

  // ---- The fittings and instruments on the lines ----
  for (const item of plumbed.items) placeItem(item);
  function placeItem(item: PlacedItem) {
    const od = plumbed.lines.find((l) => l.edge === item.edge)!.od;
    const f = fittingOf(item.id);
    const tag = TAGS[item.id];
    const short = shortTag(item.id);
    // Each faces the visitors: east along the west wall, south along the north.
    const face: [number, number] =
      item.at[2] > PLANT_EDGE_NORTH ? [1, 0] : [0, 1];
    if (f?.kind === 'isolating-valve') {
      const id = f.id as ValveId;
      const dn = od >= 0.15 ? 150 : od >= 0.07 ? 65 : 50;
      const valve = parts.add(
        createThrottleValve(kit, {
          dn,
          tag: short,
          name: fittingName(f),
          opening: () => state.opening[id],
          step: (by) => act({ type: 'notch', id, by }),
          notches: f.throttles === false ? [0, 1] : NOTCHES,
        }),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, face);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(f)}`,
        model: { fitting: f.id },
        status: () => {
          const o = state.opening[id];
          return o >= 0.98
            ? 'lever at OPEN'
            : o <= 0.02
              ? 'lever at SHUT'
              : `lever throttled, notch ${Math.round(o * 5)} of 5`;
        },
      });
      object.add(valve.object);
      return;
    }
    if (f?.kind === 'non-return-valve') {
      const nrv = createInlineFitting(kit, {
        kind: 'non-return-valve',
        medium: item.edge === 'ozoneGas' ? 'air' : 'water',
        operator: 'self',
        od,
      });
      placeFitting(nrv.object, 'non-return-valve', item.at, item.along, face);
      object.add(
        markComponent(nrv.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
        }),
      );
      return;
    }
    if (f?.kind === 'flowmeter') {
      const meter = createMagFlowmeter(kit, { od, tag: short });
      meter.group.traverse((o) => (o.userData.live = true));
      placeFitting(meter.group, 'flowmeter', item.at, item.along, face);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () => `shows ${readings.flows.toPool.toFixed(0)} m³/h`,
        }),
      );
      updates.push(() => meter.show(readings.flows.toPool, 'FLOW'));
      return;
    }
    if (item.kind === 'sight-glass') {
      const glass = createPipeSightGlass(kit, { od, tag: short });
      placeFitting(glass.group, 'flowmeter', item.at, item.along, face);
      object.add(
        markComponent(glass.group, {
          name: `${tag} sight glass on the backwash waste`,
          model: { node: 'filter' },
          status: () =>
            state.wasteDirt > 100
              ? 'the water in it murky'
              : state.wasteDirt > 10
                ? 'the water in it cloudy'
                : 'the water in it clear',
        }),
      );
      updates.push(() => glass.show(state.wasteDirt));
      return;
    }
    // A dissolved-ozone analyser: its cell on the line, its head on a stem above, reading mg/l.
    const holder = new Group();
    placeFitting(holder, 'isolating-valve', item.at, item.along, face);
    object.add(holder);
    t.cyl(holder, t.paint('#7d8285', 0.5, 0.4), 0.015, 0.2, 0, od / 2 + 0.1, 0);
    const head = new Group();
    head.position.set(0, od / 2 + 0.3, 0);
    holder.add(head);
    t.box(head, t.paint('#d9dcd6', 0.5), 0.2, 0.16, 0.09, 0, 0, 0);
    const digits = createSevenSegment(kit, 4, {
      digitHeight: 0.03,
      colour: '#3dff7a',
    });
    digits.group.position.set(0, 0.02, 0.046);
    digits.group.traverse((o) => (o.userData.live = true));
    head.add(digits.group);
    const label = createMicroLabel(kit, `${short} O₃ mg/l`, {
      height: 0.014,
      ink: '#16181a',
    });
    label.position.set(0, -0.05, 0.046);
    head.add(label);
    const badge = createBrandBadge(kit, 'trioxa', { height: 0.014 });
    badge.position.set(0, 0.065, 0.046);
    head.add(badge);
    const read = () =>
      item.id === 'toCarbon.ai'
        ? readings.ozone.contactResidual
        : readings.ozone.carbonResidual;
    markComponent(holder, {
      name: `${tag} dissolved ozone analyser (Trioxa)`,
      model: { link: item.edge },
      status: () => `shows ${read().toFixed(2)} mg/l`,
    });
    let text = '';
    updates.push(() => {
      const next = read().toFixed(2).padStart(4).slice(-4);
      if (next !== text) digits.show((text = next));
    });
  }

  // ---- The south wall: the mimic, the activity card, the hall's clock ----
  const board = createMimicBoard(kit, HALL2_MIMIC, {
    maker: 'penfold',
    press: (id) => {
      const s = mimicSpeed(id);
      if (s) act({ type: 'speed', speed: s });
    },
    parts: {
      readout: (id) => ({
        kind: 'visible',
        label: `${hall2Reading(id, state)?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  // Found by the walls' test (it has no name of its own).
  board.group.userData.onWall = 'Hall 2 mimic board';
  turnTo(board.group, 6.5, 1.5, SOUTH, FACE_NORTH);
  object.add(board.group);
  take(board.parts);

  const activity = hall2ActivityCard();
  const card = createWallPanel(
    kit,
    'Activity card',
    1.6,
    2.0,
    paintActivity({ ...activity, reset: hall2Entrance().reset }),
  );
  turnTo(card, 2.0, 1.58, SOUTH, FACE_NORTH);
  object.add(still(card));

  const clock = createPoolClock(kit, { dia: 0.75 });
  turnTo(clock.group, 5.4, 3.1, SOUTH, FACE_NORTH);
  object.add(
    markComponent(clock.group, {
      name: 'Pool clock, showing the plant’s time',
      status: () => `shows ${clockText(state).slice(0, 5)}`,
    }),
  );
  const timeBox = new Group();
  timeBox.userData.onWall = 'Plant time display';
  turnTo(timeBox, 6.9, 3.2, SOUTH, FACE_NORTH);
  t.box(timeBox, t.paint('#25343a', 0.5), 0.62, 0.22, 0.04, 0, 0, 0.02);
  const timeLcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.02,
    backlight: true,
  });
  timeLcd.group.position.z = 0.042;
  timeBox.add(timeLcd.group);
  object.add(
    markComponent(timeBox, {
      name: 'Plant time display',
      status: () => `shows ${clockText(state)} at TIME ×${state.speed}`,
    }),
  );
  const clockPlaque = createWallPanel(
    kit,
    'Clock placard',
    0.9,
    0.26,
    (c, w, h) => {
      c.fillStyle = '#f6f4ec';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.26}px Arial`;
      c.fillText('THE PLANT’S TIME', w * 0.04, h * 0.34);
      c.font = `${h * 0.2}px Arial`;
      c.fillText(
        'Press a TIME button on the map and watch it race.',
        w * 0.04,
        h * 0.72,
        w * 0.92,
      );
    },
  );
  turnTo(clockPlaque, 6.9, 2.85, SOUTH, FACE_NORTH);
  object.add(still(clockPlaque));
  let timeShown = '';
  let timeDue = 0;
  updates.push((delta) => {
    clock.show(
      plantClock(state),
      state.speed,
      delta > 0 ? Math.min(240, 1 / delta) : 60,
    );
    timeDue -= delta;
    if (timeDue > 0) return;
    timeDue = 0.25;
    const lines = [
      `PLANT ${clockText(state)}`,
      `TIME x${state.speed}`.padEnd(16),
    ];
    const key = lines.join('|');
    if (key === timeShown) return;
    timeShown = key;
    timeLcd.show(lines);
  });

  // ---- The east wall: the entrance panel, RESET, the filter's settings ----
  const ent = hall2Entrance();
  const stations = hall2Placards();
  const entrance = createWallPanel(
    kit,
    'Entrance panel',
    1.9,
    1.5,
    paintEntrance(
      {
        title: ent.headline,
        subtitle: 'Hall 2: sand, ozone and ultraviolet light',
        introduction: `${ent.bigIdea} ${ent.fact}`,
        route: stations.map((p) => ({
          station: p.station,
          name: p.headline,
          what: p.title.split(' · ')[0],
        })),
        reset: ent.reset,
      },
      'Hall 2 · Clean water',
    ),
  );
  turnTo(entrance, EAST, 1.65, 7.0, FACE_WEST);
  object.add(still(entrance));
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  turnTo(resetSign, EAST, 1.75, 4.8, FACE_WEST);
  object.add(still(resetSign));
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(localNow()),
    lit: () => state.sinceReset < 2.5,
  });
  turnTo(resetButton.group, EAST - 0.45, 0, 4.8, FACE_WEST);
  object.add(resetButton.group);
  take(resetButton.parts);
  updates.push(resetButton.update);
  footprint(EAST - 0.45, 4.8, 0.25);
  const settings = createWallPanel(
    kit,
    'Filter settings card',
    1.2,
    1.0,
    paintSettings(filterSettingsCard()),
  );
  turnTo(settings, EAST, 1.6, 2.9, FACE_WEST);
  object.add(still(settings));

  // ---- The placards, at the plant's edge by each station ----
  const LECTERNS: Record<number, { x: number; z: number; yaw: number }> = {
    1: { x: -2.2, z: 3.3, yaw: FACE_EAST },
    2: { x: -2.2, z: 4.45, yaw: FACE_EAST },
    3: { x: -2.2, z: 1.4, yaw: FACE_EAST },
    4: { x: -2.2, z: -1.0, yaw: FACE_EAST },
    5: { x: -1.5, z: -2.05, yaw: 0 },
    6: { x: 0.0, z: -2.05, yaw: 0 },
    7: { x: 2.6, z: -2.05, yaw: 0 },
    8: { x: 5.4, z: -2.05, yaw: 0 },
  };
  for (const p of stations) {
    const at = LECTERNS[p.station];
    const lectern = createLectern(kit, {
      ...p,
      icon: ICON[p.icon] ?? (p.icon as PlacardIcon),
    });
    turnTo(lectern, at.x, 0, at.z, at.yaw);
    object.add(still(lectern));
    footprint(at.x, at.z, 0.2);
  }

  // The L where it stands in the hall grown round it (layout C).
  object.position.set(PLANT_SHIFT.x, 0, PLANT_SHIFT.z);
  const placed = solids.map((f) => ({
    minX: f.minX + PLANT_SHIFT.x,
    maxX: f.maxX + PLANT_SHIFT.x,
    minZ: f.minZ + PLANT_SHIFT.z,
    maxZ: f.maxZ + PLANT_SHIFT.z,
  }));
  return {
    object,
    parts,
    status: () => (state.pumpRunning ? 'circulating' : 'stopped'),
    solids: () => placed,
    reset,
    update(delta) {
      state = stepHall2(state, flows, delta);
      // A trip, the low level or the bed's fouling may have changed the water.
      resolve();
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall2MimicState(state);
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}
