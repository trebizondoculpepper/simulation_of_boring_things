import { Group, Object3D } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import {
  createPipe,
  createPipeTee,
} from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { tools } from '../../../components/core/views/fitting-tools';
import {
  createEndSuctionPump,
  createPlateHeatExchanger,
  createSandFilter,
} from '../../../components/plant/views/pumps-plant';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createDigitalThermometer } from '../../../components/plant/views/digital-thermometer';
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import { createThrottleValve } from '../../../components/plant/views/throttle-valve';
import {
  createGlassRotameter,
  createMetalTubeMeter,
  createPaddleWheelMeter,
} from '../../../components/plant/views/small-flowmeters';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { markPipe } from '../../../components/plant/views/pipe-markers';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import {
  createExperimentalSink,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import {
  LINK_NAMES,
  NOTCHES,
  PLANT,
  TAGS,
  actOnPlant,
  fittingById,
  fittingName,
  newIdealPlant,
  plantReadings,
  shortTag,
  solvePlant,
  stepIdealPlant,
} from '../../../../game/plant/ideal-pool-plant';
import type {
  IdealPlantAction,
  IdealPlantState,
  MachineId,
  PlantFlows,
  ValveId,
} from '../../../../game/plant/ideal-pool-plant';
import {
  HX_PLINTH,
  FILTER_SHAPE,
  OD,
  PLACES,
  PORTS,
  POOL_SHAPE,
  TANK_SHAPE,
  cutLine,
  distanceAlong,
  inRoom,
  plumbIdealPlantRoom,
} from '../../logic/ideal-pool-plant-layout';
import type {
  IdealPlantRoom,
  PlacedItem,
} from '../../logic/ideal-pool-plant-layout';
import {
  IDEAL_PLANT_MIMIC,
  idealPlantMimicState,
  instrumentReading,
  mimicAction,
} from '../../logic/ideal-pool-plant-mimic';
import {
  RESET_SIGN,
  activityCard,
  entrancePanel,
  placards,
} from '../../logic/ideal-pool-plant-placards';
import {
  createLectern,
  createPumpStation,
  createResetPedestal,
  createWallPanel,
  paintActivity,
  paintEntrance,
  paintResetSign,
} from '../../views/museum-exhibit';
import { DEV_ROOM_NAMES } from '../../logic/dev-room-links';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'A working three-dimensional schematic of a swimming pool’s plant: an ideal pool and balance tank, one real pump, a real sand filter and a real heat exchanger, every valve manual, every gauge and meter live.';

export const FINISH = {
  wall: '#dfe3df',
  floor: '#9aa19e',
  titleCard: { x: 8.83, y: 3.3, z: 1.6, yaw: -Math.PI / 2, scale: 1 },
};

/** Where a visitor arrives: by the entrance panel, looking over the plant. */
export const START = { x: -3.6, z: 5.2, yaw: (15 * Math.PI) / 180 };

/**
 * Dev51, the ideal pool plant (mission 106; the owner, 2026-10-28): the
 * schematic, model and words are pure (`ideal-pool-plant.ts`, its layout,
 * mimic and placards); this module draws what they say and binds each
 * thing to them. One clock steps the plant each frame; the water network
 * is solved again only when a valve or the pump changes; the mimic's state
 * is worked out a few times a second, so it redraws only then.
 */

let state: IdealPlantState = newIdealPlant();
let flows: PlantFlows = solvePlant(state);
let room: IdealPlantRoom | null = null;

function act(a: IdealPlantAction) {
  const before = state;
  state = actOnPlant(state, a);
  if (
    state.pumpRunning !== before.pumpRunning ||
    state.opening !== before.opening
  )
    flows = solvePlant(state);
  mimicDue = 0;
}
let mimicDue = 0;

export function layoutRoom() {
  room ??= plumbIdealPlantRoom();
  return room.layout;
}

export function prepareRoom() {
  state = newIdealPlant();
  flows = solvePlant(state);
  room ??= plumbIdealPlantRoom();
}

// For working it from the console: `idealPlant.act({type: 'pump', run: false})`.
if (typeof window !== 'undefined')
  (window as unknown as { idealPlant?: unknown }).idealPlant = {
    get state() {
      return state;
    },
    get flows() {
      return flows;
    },
    readings: () => plantReadings(state, flows),
    act,
  };

export const EXHIBITS: readonly PlantExhibit[] = [];

/** Place `object` in the room at a machine's place. */
function atMachine(object: Object3D, id: MachineId) {
  const p = PLACES[id];
  object.position.set(p.x, 0, p.z);
  object.rotation.y = p.yaw;
  return object;
}

/**
 * A horizontal pipe's way turned so an instrument drawn along it faces the
 * visitors (south, +z) or, along a north–south pipe, the east: returns the
 * way to draw it and whether that is against the flow.
 */
function facingVisitors(along: readonly [number, number, number]) {
  if (Math.abs(along[1]) > 0.5) return { along, flip: 1 };
  // Drawn along x, an instrument faces x × y: south along +x, east along −z.
  const faces = Math.abs(along[0]) > 0.5 ? along[0] > 0 : -along[2] > 0;
  return faces
    ? { along, flip: 1 }
    : {
        along: [-along[0], -along[1], -along[2]] as [number, number, number],
        flip: -1,
      };
}

export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const plumbed = room ?? plumbIdealPlantRoom();
  const object = new Group();
  object.name = 'Ideal pool plant';
  const parts = createPartSet();
  const t = tools(kit);
  const updates: ((delta: number) => void)[] = [];
  /** Merge a still thing's meshes, keeping what moves and what a click works. */
  const still = (thing: Object3D, worked: Set<Object3D> = new Set()) => {
    mergeTree(thing, (o) => o.userData.live === true || worked.has(o));
    return thing;
  };
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

  // ---- The machines ----
  // The ideal pool and tank.
  const vesselPorts = (id: 'pool' | 'tank') =>
    Object.values(PORTS[id]).map((p) => ({ ...p, od: OD[150] }));
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
      'Ideal pool',
      { node: 'pool' },
      () => `water ${state.poolC.toFixed(1)} °C`,
    ),
  );
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
      'Ideal balance tank',
      { node: 'tank' },
      () => `water ${state.tankC.toFixed(1)} °C`,
    ),
  );
  updates.push(() => {
    pool.show([
      `WATER ${state.poolC.toFixed(1).padStart(5)}C ${PLANT.poolVolume}m3`,
      `IN ${flows.circulation.toFixed(1).padStart(5)}m3/h  IDEAL`,
    ]);
    tank.show([
      `WATER ${state.tankC.toFixed(1).padStart(5)}C LVL ${PLANT.tankHead.toFixed(1)}m`,
      `OUT ${flows.circulation.toFixed(1).padStart(5)}m3/h IDEAL`,
    ]);
  });

  // The pump and its local station.
  const pump = createEndSuctionPump(kit);
  object.add(
    describe(
      still(atMachine(pump, 'pump')),
      'pump',
      'Circulation pump',
      { node: 'pump' },
      () => (state.pumpRunning ? 'running' : 'stopped'),
    ),
  );
  updates.push((delta) => {
    pump.gauges.suction.set(flows.gauge['pump.suction.pi']);
    pump.gauges.discharge.set(flows.gauge['pump.discharge.pi']);
    pump.gauges.suction.update(delta);
    pump.gauges.discharge.update(delta);
  });
  const station = createPumpStation(kit, {
    tag: shortTag('pump'),
    start: () => act({ type: 'pump', run: true }),
    stop: () => act({ type: 'pump', run: false }),
    running: () => state.pumpRunning,
  });
  station.group.position.set(-1.25, 0, -3.75);
  object.add(station.group);
  for (const [o, use] of station.parts.uses) parts.uses.set(o, use);
  updates.push(station.update);

  // The sand filter, its gauges and its differential gauge.
  const filter = createSandFilter(kit, {
    dia: FILTER_SHAPE.dia,
    shell: FILTER_SHAPE.shell,
    dn: 150,
    label: `SAND FILTER ${shortTag('filter')}`,
    bedDepth: 1.0,
  });
  object.add(
    describe(
      still(atMachine(filter, 'filter'), new Set()),
      'filter',
      'Sand filter',
      { node: 'filter' },
    ),
  );
  const dp = createDialGauge(kit, {
    dia: 0.1,
    min: 0,
    max: 1,
    legend: `${shortTag('filter.pdi')} ΔP`,
    entry: 'back',
  });
  const dpAt = inRoom('filter', [-FILTER_SHAPE.dia / 2 + 0.05, 1.45, 0.55]);
  dp.group.position.set(...dpAt);
  object.add(
    describe(
      dp.group,
      'filter.pdi',
      'Filter differential pressure gauge',
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
    dpAt[0],
    0.7,
    dpAt[2] - 0.05,
  );
  updates.push((delta) => {
    filter.show(
      {
        inlet: flows.gauge['filter.inlet.pi'],
        outlet: flows.gauge['filter.outlet.pi'],
      },
      delta,
    );
    dp.set(flows.gauge['filter.pdi']);
    dp.update(delta);
  });

  // The heat exchanger on its plinth.
  const hx = new Group();
  const plate = createPlateHeatExchanger(kit);
  plate.position.y = HX_PLINTH;
  hx.add(plate);
  t.box(
    hx,
    t.paint('#b9b6ad', 0.85),
    1.15,
    HX_PLINTH,
    0.6,
    0.53,
    HX_PLINTH / 2,
    0,
  );
  object.add(
    describe(still(atMachine(hx, 'hx')), 'hx', 'Pool heat exchanger', {
      node: 'hx',
    }),
  );

  // The ideal hot-water source and its return.
  const source = createExperimentalSource({
    id: 'ipp.heat',
    substance: 'lthw',
    potential: PLANT.sourceBar,
    maxRate: PLANT.sourceMax,
  });
  const sink = createExperimentalSink({
    id: 'ipp.heatReturn',
    substance: 'lthw',
  });
  for (const [id, terminal] of [
    ['heat', source],
    ['heatReturn', sink],
  ] as const) {
    const view = createExperimentalSourceView(kit, terminal);
    const holder = atMachine(new Group(), id);
    holder.add(view.group);
    object.add(
      describe(
        holder,
        id,
        id === 'heat' ? 'Ideal hot-water source' : 'Ideal hot-water return',
        { node: id },
      ),
    );
  }

  // ---- The pipes, their tees and markings ----
  const rotameter = plumbed.items.find((i) => i.id === 'heat.out-1.meter');
  for (const line of plumbed.lines) {
    let runs = [line.points];
    if (rotameter && line.edge === rotameter.edge) {
      const d = distanceAlong(line.points, rotameter.at);
      runs = cutLine(line.points, d - 0.2, d + 0.2);
    }
    for (const points of runs) {
      const pipe = createPipe(
        line.pipe,
        line.od,
        points,
        line.heating ? {} : { colour: '#4d5a63' },
      );
      pipe.name = `Pipe: ${LINK_NAMES[line.edge]}`;
      markComponent(pipe, {
        name: `Pipe: ${LINK_NAMES[line.edge]}`,
        model: { link: line.edge },
      });
      object.add(pipe);
    }
    const radius = line.od / 2 + (line.heating ? 0.025 : 0);
    const service =
      line.edge === 'primaryFlow'
        ? 'heating flow'
        : line.edge === 'primaryReturn'
          ? 'heating return'
          : 'pool water';
    object.add(
      markPipe(kit, line.points, {
        radius,
        service,
        text: LINK_NAMES[line.edge].toUpperCase(),
        flow: 1,
      }),
    );
  }
  for (const [id, main, branch] of [
    ['split', [1, 0, 0], [0, 1, 0]],
    ['join', [0, 1, 0], [1, 0, 0]],
  ] as const) {
    const centre = inRoom(id, [0, id === 'split' ? 0.52 : 2.55, 0]);
    const tee = createPipeTee(
      'pvc-pressure',
      OD[150],
      OD[100],
      centre,
      main,
      branch,
    );
    object.add(
      markComponent(tee, {
        name: `${TAGS[id]} ${id === 'split' ? 'Bypass tee' : 'Return tee'}`,
        model: { node: id },
      }),
    );
  }

  // ---- The fittings and instruments on the lines ----
  const flowOf = (id: string) =>
    flows.meter[id as keyof typeof flows.meter] ?? 0;
  for (const item of plumbed.items) placeItem(item);
  function placeItem(item: PlacedItem) {
    const f = fittingById(item.id);
    const od =
      OD[
        item.edge === 'primaryFlow' || item.edge === 'primaryReturn'
          ? 40
          : item.edge === 'hxIn' || item.edge === 'hxOut'
            ? 100
            : 150
      ];
    const tag = TAGS[item.id];
    const short = shortTag(item.id);
    if (f?.kind === 'isolating-valve') {
      const id = f.id as ValveId;
      const dn = od >= 0.15 ? 150 : od >= 0.1 ? 100 : 50;
      const valve = parts.add(
        createThrottleValve(kit, {
          dn,
          tag: short,
          name: fittingName(f),
          opening: () => state.opening[id],
          step: (by) => act({ type: 'notch', id, by }),
          notches: NOTCHES,
        }),
      );
      placeFitting(
        valve.object,
        'isolating-valve',
        item.at,
        item.along,
        [0, 1],
      );
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
        medium: 'water',
        operator: 'self',
        od,
      });
      placeFitting(nrv.object, 'non-return-valve', item.at, item.along, [0, 1]);
      object.add(
        markComponent(nrv.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
        }),
      );
      return;
    }
    if (f?.kind === 'flowmeter') {
      const way = facingVisitors(item.along);
      if (f.meter === 'electromagnetic') {
        const meter = createMagFlowmeter(kit, { od, tag: short });
        meter.group.traverse((o) => (o.userData.live = true));
        placeFitting(meter.group, 'flowmeter', item.at, way.along, [0, 1]);
        object.add(
          markComponent(meter.group, {
            name: `${tag} ${fittingName(f)}`,
            model: { fitting: f.id },
            status: () => `shows ${flowOf(f.id).toFixed(1)} m³/h`,
          }),
        );
        updates.push(() => meter.show(way.flip * flowOf(f.id), 'FLOW'));
      } else if (f.meter === 'paddle-wheel') {
        const meter = createPaddleWheelMeter(kit, { od, tag: short });
        placeFitting(meter.group, 'flowmeter', item.at, way.along, [0, 1]);
        object.add(
          markComponent(meter.group, {
            name: `${tag} ${fittingName(f)}`,
            model: { fitting: f.id },
            status: () => `shows ${flowOf(f.id).toFixed(1)} m³/h`,
          }),
        );
        updates.push(() => meter.show(flowOf(f.id)));
      } else if (item.edge === 'primaryFlow') {
        const meter = createGlassRotameter(kit, { od, tag: short, max: 4 });
        placeFitting(meter.group, 'flowmeter', item.at, item.along, [0, 1]);
        object.add(
          markComponent(meter.group, {
            name: `${tag} ${fittingName(f)}`,
            model: { fitting: f.id },
            status: () => 'float shows the flow on its scale',
          }),
        );
        updates.push((delta) => meter.show(flowOf(f.id), delta));
      } else {
        const meter = createMetalTubeMeter(kit, { od, tag: short, max: 200 });
        placeFitting(meter.group, 'flowmeter', item.at, item.along, [0, 1]);
        object.add(
          markComponent(meter.group, {
            name: `${tag} ${fittingName(f)}`,
            model: { fitting: f.id },
            status: () => 'pointer shows the flow on its dial',
          }),
        );
        updates.push((delta) => meter.show(flowOf(f.id), delta));
      }
      return;
    }
    // A thermometer: digital on the pool water, a bimetal dial on the heating.
    const read = () => state.thermometer[item.id];
    if (item.edge === 'primaryFlow' || item.edge === 'primaryReturn') {
      const dial = createDialGauge(kit, {
        kind: 'thermometer',
        dia: 0.1,
        min: 0,
        max: 120,
        legend: short,
        entry: 'bottom',
      });
      const holder = new Group();
      dial.group.position.set(0, od / 2 + 0.025 + 0.11, 0);
      holder.add(dial.group);
      placeFitting(
        holder,
        'isolating-valve',
        item.at,
        facingVisitors(item.along).along,
        [0, 1],
      );
      object.add(
        markComponent(holder, {
          name: `${tag} thermometer`,
          model: { node: item.edge === 'primaryFlow' ? 'hx' : 'hx' },
          status: () => `reads ${dial.value.toFixed(0)} °C`,
        }),
      );
      updates.push((delta) => {
        dial.set(read());
        dial.update(delta);
      });
    } else {
      const tt = createDigitalThermometer(kit, { tag: short, pipeOd: od });
      placeFitting(
        tt.group,
        'isolating-valve',
        item.at,
        facingVisitors(item.along).along,
        [0, 1],
      );
      object.add(
        markComponent(tt.group, {
          name: `${tag} thermometer`,
          model: { node: item.edge === 'suction' ? 'tank' : 'hx' },
          status: () => `shows ${read().toFixed(1)} °C`,
        }),
      );
      updates.push(() => tt.show(read()));
    }
  }

  // ---- The mimic board, on the south wall facing the plant ----
  let mimicState: MimicState = idealPlantMimicState(state, flows);
  const board = createMimicBoard(kit, IDEAL_PLANT_MIMIC, {
    maker: 'penfold',
    press: (id) => {
      const a = mimicAction(id);
      if (a) act(a);
    },
    parts: {
      readout: (id) => ({
        kind: 'visible',
        label: `${instrumentReading(id, state, flows)?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  board.group.position.set(1.6, 1.65, 6.33);
  board.group.rotation.y = Math.PI;
  object.add(board.group);
  for (const [o, use] of board.parts.uses) parts.uses.set(o, use);

  // ---- The museum: placards, the entrance panel, the activity card, RESET ----
  const LECTERNS: Record<string, { x: number; z: number; yaw: number }> = {
    pool: { x: -4.7, z: 1.9, yaw: Math.PI / 2 },
    tank: { x: -5.3, z: -2.3, yaw: 0 },
    pump: { x: -2.7, z: -2.6, yaw: 0 },
    filter: { x: -0.9, z: -1.7, yaw: 0 },
    meters: { x: 2.2, z: -1.6, yaw: 0 },
    hx: { x: 5.6, z: -2.3, yaw: 0 },
    heat: { x: 7.6, z: -3.0, yaw: -0.3 },
  };
  const all = placards();
  for (const p of all) {
    const at = LECTERNS[p.of];
    if (!at) continue;
    const lectern = createLectern(kit, p);
    lectern.position.set(at.x, 0, at.z);
    lectern.rotation.y = at.yaw;
    object.add(still(lectern));
  }
  const mimicPlacard = all.find((p) => p.of === 'mimic')!;
  const mimicLectern = createLectern(kit, mimicPlacard);
  // On the wall beside the board, tilted as a lectern's face is.
  mimicLectern.position.set(4.1, 0, 5.75);
  mimicLectern.rotation.y = Math.PI;
  object.add(still(mimicLectern));
  const entrance = createWallPanel(
    kit,
    'Entrance panel',
    1.9,
    1.5,
    paintEntrance(entrancePanel(), DEV_ROOM_NAMES.dev51),
  );
  entrance.position.set(-8.82, 1.65, 4.1);
  entrance.rotation.y = Math.PI / 2;
  object.add(still(entrance));
  const card = createWallPanel(
    kit,
    'Activity card',
    1.1,
    1.5,
    paintActivity(activityCard()),
  );
  card.position.set(-1.6, 1.55, 6.33);
  card.rotation.y = Math.PI;
  object.add(still(card));
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  resetSign.position.set(-4.0, 1.75, 6.33);
  resetSign.rotation.y = Math.PI;
  object.add(still(resetSign));
  const reset = createResetPedestal(kit, {
    reset: () => act({ type: 'reset' }),
    lit: () => state.sinceReset < 2.5,
  });
  reset.group.position.set(-4.0, 0, 5.95);
  reset.group.rotation.y = Math.PI;
  object.add(reset.group);
  for (const [o, use] of reset.parts.uses) parts.uses.set(o, use);
  updates.push(reset.update);

  // The route on the floor: a painted band from the entrance past each station.
  const route: [number, number][] = [
    [-5.2, 4.6],
    [-4.0, 1.9],
    [-4.0, -1.6],
    [-2.7, -1.6],
    [-0.9, -0.9],
    [2.2, -0.9],
    [5.6, -1.5],
    [5.6, 3.6],
    [1.6, 4.8],
  ];
  const band = t.paint('#e5631c', 0.7);
  for (let k = 1; k < route.length; k++) {
    const [ax, az] = route[k - 1];
    const [bx, bz] = route[k];
    const len = Math.hypot(bx - ax, bz - az);
    const strip = t.box(
      object,
      band,
      0.12,
      0.004,
      len,
      (ax + bx) / 2,
      0.003,
      (az + bz) / 2,
    );
    strip.rotation.y = Math.atan2(bx - ax, bz - az);
  }

  return {
    object,
    parts,
    status: () => (state.pumpRunning ? 'circulating' : 'stopped'),
    update(delta) {
      state = stepIdealPlant(state, flows, delta);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = idealPlantMimicState(state, flows);
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}
