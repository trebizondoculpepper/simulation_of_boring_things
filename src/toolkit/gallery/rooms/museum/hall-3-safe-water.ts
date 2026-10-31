import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import type { Part } from '../../../components/core/parts/parts';
import {
  createPipe,
  createPipeTee,
} from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import {
  componentOf,
  markComponent,
} from '../../../components/core/views/component-identity';
import { tools } from '../../../components/core/views/fitting-tools';
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { markPipe } from '../../../components/plant/views/pipe-markers';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import {
  createCharacterLcd,
  createPanelMeter,
} from '../../../components/industrial-control/views/panel-instruments';
import { createChemicalBallValve } from '../../../components/plant/views/chemical-ball-valve';
import { createDiaphragmPump } from '../../../components/plant/views/diaphragm-pump';
import { createDc1Pair } from '../../../components/plant/views/dc1-controller';
import { createSamplePanel } from '../../../components/plant/views/sample-cell-panel';
import {
  createDayChartRecorder,
  createDpdTestKit,
  createFaultPedestal,
  createSmallDayTank,
  createSwimmersDial,
} from '../../../components/plant/views/museum-dosing-parts';
import { createExperimentalSource } from '../../../../game/plant/experimental-source';
import {
  HALL3_MODEL,
  LINK_NAMES,
  NODES,
  PUMPS,
  PUMP_KIND,
  SWIMMERS,
  TAGS,
  WEAK_STRENGTH,
  actOnHall3,
  bathersNow,
  fittingById,
  fittingName,
  hall3Readings,
  shortTag,
} from '../../../../game/plant/museum-3-dosing';
import type {
  Hall3Action,
  MachineId,
  ValveId,
} from '../../../../game/plant/museum-3-dosing';
import type { DoseChannel } from '../../../components/plant/logic/dosing-controller';
import {
  DAY_TANK,
  LECTERNS,
  LECTERN_Z,
  TEST_KIT_X,
  NORTH,
  OD,
  PANEL_Y,
  PLACES,
  PLANT_EDGE,
  PLINTH,
  PORTS,
  POOL_SHAPE,
  POOL_WATER,
  TANK_SHAPE,
  WEST,
  interior,
  plumbHall3,
} from '../../logic/museum-3-layout';
import type { PlacedItem } from '../../logic/museum-3-layout';
import {
  HALL3_MIMIC,
  hall3MimicState,
  hall3Reading,
  mimicSpeed,
} from '../../logic/museum-3-mimic';
import {
  RESET_SIGN,
  hall3Entrance,
  hall3Placards,
} from '../../logic/museum-3-placards';
import {
  hallClockText,
  hallSession,
  localNow,
  runSession,
  setSpeed,
} from '../../logic/museum-time';
import {
  createLectern,
  createPumpStation,
  heldPumpSound,
  createResetPedestal,
  createWallPanel,
  paintEntrance,
  paintResetSign,
} from '../../views/museum-exhibit';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import type { HallExhibit } from './exhibits';

/**
 * Hall 3, "Safe water" (107c): automatic disinfection, a closed loop. The
 * schematic, model, layout, mimic and words are pure
 * (`museum-3-dosing.ts`, `museum-3-*.ts`); this draws what they say, binds
 * each thing to them, and keeps the hall's session. The plant stands
 * along the north (street) wall, chemicals on the west (the visitor's
 * left, facing it), the pool on the east; the mimic, the chemistry board
 * with its chart recorder, the entrance panel and RESET on the south wall.
 * In the hall's frame, metres.
 */

const SOUTH = interior.maxZ - 0.04;
const FACE_NORTH = Math.PI;
const E = interior.maxX;

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const plumbed = plumbHall3();
  let session = hallSession(HALL3_MODEL, localNow());
  let readings = hall3Readings(session.state);
  let mimicState: MimicState = hall3MimicState(session.state, 1);
  let mimicDue = 0;
  let blink = 0;
  const state = () => session.state;
  const act = (a: Hall3Action) => {
    session = { ...session, state: actOnHall3(session.state, a) };
    readings = hall3Readings(session.state);
    mimicDue = 0;
  };
  const resets: ((now: number) => void)[] = [];
  const reset = (now: number) => {
    session = hallSession(HALL3_MODEL, now);
    readings = hall3Readings(session.state);
    mimicDue = 0;
    for (const r of resets) r(now);
  };

  const object = new Group();
  object.name = 'Hall 3: Safe water';
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
  /** An instrument of the model, drawn by `thing`, bound to it by its id. */
  const instrument = (
    thing: Object3D,
    id: string,
    name: string,
    status?: () => string | undefined,
  ) => describe(thing, id, name, { node: id }, status);
  /** Bind a piece a view has already described to `model`, keeping its words. */
  const bindPiece = (
    thing: Object3D,
    model: { node: string } | { fitting: string },
  ) => markComponent(thing, { ...componentOf(thing), model });
  const atMachine = (o: Object3D, id: MachineId) =>
    turnTo(o, PLACES[id].x, PLACES[id].y ?? 0, PLACES[id].z, PLACES[id].yaw);
  const solids: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [
    ...plumbed.solids,
  ];
  const footprint = (x: number, z: number, r = 0.3) =>
    solids.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
  const channelOf: Record<'hypoPump' | 'acidPump', DoseChannel> = {
    hypoPump: 'hypochlorite',
    acidPump: 'acid',
  };

  // ---- The stores and day tanks ----
  for (const [id, substance] of [
    ['hypoStore', 'hypochlorite'],
    ['acidStore', 'acid'],
  ] as const) {
    const source = createExperimentalSource({ id: `m3.${id}`, substance });
    const view = createExperimentalSourceView(kit, source);
    const holder = atMachine(new Group(), id);
    holder.add(view.group);
    object.add(
      describe(
        still(holder),
        id,
        nodeName(id),
        { node: id },
        id === 'hypoStore'
          ? () =>
              `${state().storeStrength === WEAK_STRENGTH ? 'its rating plate amended: 100' : '140'} g/l available chlorine`
          : undefined,
      ),
    );
  }
  for (const [id, chemical, li] of [
    ['hypoTank', 'hypochlorite', 'hypoTank.li'],
    ['acidTank', 'acid', 'acidTank.li'],
  ] as const) {
    const tank = createSmallDayTank(kit, {
      tag: shortTag(id),
      chemical,
      ...DAY_TANK,
      litres: 60,
      inlet: PORTS[id].in.at,
      outlet: PORTS[id].out.at,
    });
    object.add(
      describe(
        atMachine(tank.group, id),
        id,
        nodeName(id),
        { node: id },
        () =>
          `its sight gauge ${TAGS[li]} at ${state().tanks[chemical].litres.toFixed(0)} litres`,
      ),
    );
    for (const piece of tank.sight)
      instrument(
        piece,
        li,
        'sight gauge',
        () => `reads ${state().tanks[chemical].litres.toFixed(0)} litres`,
      );
    updates.push(() => tank.show(state().tanks[chemical].litres));
  }

  // ---- The dosing pumps, on their plinths ----
  for (const id of ['hypoPump', 'acidPump'] as const) {
    const c = channelOf[id];
    const pump = createDiaphragmPump(kit, shortTag(id), PUMP_KIND[c], {
      state: () => state().pumps[c].state.keys,
      press: (key) => {
        act({ type: 'pump-key', channel: c, key });
        // START (its ▶ key) also acknowledges a fault, as the pumps' own keys do.
        if (key === 'start') act({ type: 'pump-ack', channel: c });
      },
    });
    const holder = atMachine(new Group(), id);
    t.box(
      holder,
      t.paint('#8d9493', 0.6),
      0.36,
      PLINTH,
      0.36,
      0,
      PLINTH / 2,
      0,
    );
    pump.object.position.y = PLINTH;
    pump.object.scale.setScalar(1);
    holder.add(pump.object);
    // Its tubes to the plinth's ports.
    const [sx, sy] = pump.suctionAt;
    const [dx, dy] = pump.dischargeAt;
    const suction = PORTS[id].suction.at;
    const discharge = PORTS[id].discharge.at;
    holder.add(
      createPipe(
        'chemical-tube',
        0.012,
        [
          [sx - 0.03, PLINTH + sy, 0],
          [suction[0], PLINTH + sy, 0],
          [...suction],
        ],
        { laid: true },
      ),
    );
    holder.add(
      createPipe(
        'chemical-tube',
        0.012,
        [
          [dx - 0.03, PLINTH + dy, 0],
          [discharge[0], PLINTH + dy, 0],
          [...discharge],
        ],
        { laid: true },
      ),
    );
    object.add(
      describe(
        holder,
        id,
        `${nodeName(id)} (Grundflow ${PUMPS[c].model})`,
        {
          node: id,
        },
        () => pump.status(),
      ),
    );
    for (const k of pump.keys) parts.add(k);
    updates.push((delta) => {
      const s = state();
      pump.update(
        delta,
        {
          running: s.controller.release[c],
          rate: s.controller.yout[c] * PUMPS[c].maxLh,
        },
        true,
        s.pumps[c].fault,
      );
      pump.parts.update(delta);
    });
  }

  // ---- The sample cell and its controller, on the wall ----
  const panel = createSamplePanel(kit, {
    tag: shortTag('sampleCell'),
    state: () => ({ ...state().cell, valveOpen: state().open['sample.iso'] }),
    change: (f) => {
      const before = { ...state().cell, valveOpen: state().open['sample.iso'] };
      const after = f(before);
      if (after.valveOpen !== before.valveOpen)
        act({ type: 'valve', id: 'sample.iso', open: after.valveOpen });
      if (after.regulator !== before.regulator)
        act({ type: 'needle', by: after.regulator - before.regulator });
    },
    sampled: () => act({ type: 'test' }),
    holders: [
      { name: `${shortTag('cell.cl')} free chlorine`, colour: '#2f6fb3' },
      { name: `${shortTag('cell.ph')} pH`, colour: '#3a3a3a', ph: true },
      null,
    ],
  });
  const panelHolder = atMachine(new Group(), 'sampleCell');
  panelHolder.add(panel.object);
  object.add(
    describe(
      panelHolder,
      'sampleCell',
      nodeName('sampleCell'),
      {
        node: 'sampleCell',
      },
      () =>
        `${Math.round(readings.sampleFlow)} l/h, ${shortTag('cell.fs')} ${readings.flowSwitch ? 'made' : 'open'}`,
    ),
  );
  // Its working pieces, each its own component of the model.
  bindPiece(panel.pieces.valve, { fitting: 'sample.iso' });
  bindPiece(panel.pieces.regulator, { fitting: 'sample.needle' });
  bindPiece(panel.pieces.flowSwitch, { node: 'cell.fs' });
  bindPiece(panel.pieces.probes[0], { node: 'cell.cl' });
  bindPiece(panel.pieces.probes[1], { node: 'cell.ph' });
  bindPiece(panel.pieces.tap, { node: 'cell.tap' });
  for (const p of panel.parts) parts.add(p as Part);
  updates.push((delta) => panel.update(delta));

  const dc = createDc1Pair(kit, {
    tag: shortTag('controller'),
    state: () => state().controller,
    change: (c) => act({ type: 'controller', state: c }),
    tuning: true,
  });
  dc.object.scale.setScalar(1.6);
  turnTo(dc.object, PLACES.sampleCell.x + 1.0, PANEL_Y + 0.25, NORTH + 0.01, 0);
  object.add(
    instrument(dc.object, 'controller', 'Chlorella DC-1 pair (chlorine, pH)'),
  );
  take(dc.parts);
  updates.push((delta) => dc.update(delta));
  const dcPlate = createMicroLabel(
    kit,
    `${shortTag('controller')}  SET 1.30 mg/l · XP 0.50 · tn 6.0 h · pH 7.30 · XP 0.30`,
    { height: 0.022, ink: '#16191b', plate: '#f4f3ee' },
  );
  dcPlate.position.set(
    PLACES.sampleCell.x + 1.0,
    PANEL_Y - 0.05,
    NORTH + 0.012,
  );
  // Its settings plate is the controller's own.
  object.add(instrument(dcPlate, 'controller', 'settings plate'));

  // The sample drain: a floor gully.
  const drain = atMachine(new Group(), 'drain');
  t.box(drain, t.paint('#3a3f42', 0.6), 0.3, 0.05, 0.3, 0, 0.025, 0);
  t.box(drain, t.paint('#1b1d1e', 0.6), 0.2, 0.01, 0.2, 0, 0.055, 0);
  object.add(
    describe(still(drain), 'drain', nodeName('drain'), { node: 'drain' }),
  );

  // ---- The balance tank, the pump, the pool ----
  const bt = createIdealVessel(kit, {
    ...TANK_SHAPE,
    water: TANK_SHAPE.h - 0.25,
    name: 'Balance tank',
    ports: Object.values(PORTS.balanceTank).map((p) => ({ ...p, od: OD[150] })),
  });
  object.add(
    describe(
      still(atMachine(bt.group, 'balanceTank')),
      'balanceTank',
      `${nodeName('balanceTank')} (30 m³)`,
      {
        node: 'balanceTank',
      },
    ),
  );
  // Fixed words: shown once, not every frame (2026-10-29 performance pass).
  bt.show(['BALANCE TANK', '30m3   IDEAL']);

  const pump = createEndSuctionPump(kit);
  object.add(
    describe(
      still(atMachine(pump, 'poolPump')),
      'poolPump',
      nodeName('poolPump'),
      { node: 'poolPump' },
      () => (readings.flow > 0 ? 'running' : 'stopped'),
    ),
  );
  updates.push((delta) => {
    const run = readings.flow > 0;
    pump.gauges.suction.set(run ? 0.05 : 0.1);
    pump.gauges.discharge.set(run ? 1.9 : 0.1);
    pump.gauges.suction.update(delta);
    pump.gauges.discharge.update(delta);
  });
  // Its sound, while it runs.
  updates.push(heldPumpSound(pump, () => readings.flow > 0));
  const station = createPumpStation(kit, {
    tag: shortTag('poolPump'),
    start: () => act({ type: 'pump', run: true }),
    stop: () => act({ type: 'pump', run: false }),
    running: () => state().poolPump,
    tripped: () => false,
    resetTrip: () => {},
  });
  turnTo(station.group, PLACES.poolPump.x + 1.3, 0, PLANT_EDGE - 0.3, 0);
  object.add(
    markComponent(station.group, {
      name: `${TAGS.poolPump} circulation pump local control station`,
      model: { node: 'poolPump' },
    }),
  );
  take(station.parts);
  updates.push(station.update);
  footprint(PLACES.poolPump.x + 1.3, PLANT_EDGE - 0.3, 0.2);

  const pool = createIdealVessel(kit, {
    ...POOL_SHAPE,
    water: POOL_WATER,
    name: 'Ideal pool',
    ports: Object.values(PORTS.pool).map((p) => ({ ...p, od: OD[150] })),
  });
  object.add(
    describe(
      still(atMachine(pool.group, 'pool')),
      'pool',
      'Ideal pool (25 × 12.5 m, 470 m³)',
      { node: 'pool' },
      () => `${Math.round(bathersNow(state()))} swimmers in the water`,
    ),
  );
  updates.push(() =>
    pool.show([
      `SWIMMERS ${String(Math.round(bathersNow(state()))).padStart(3)} 470m3`,
      `IN ${readings.flow.toFixed(0).padStart(4)}m3/h   IDEAL`,
    ]),
  );

  // ---- The pipes, the tee and the injection points ----
  const SERVICE: Partial<Record<string, 'pool water'>> = {
    overflow: 'pool water',
    suction: 'pool water',
    discharge: 'pool water',
    returnA: 'pool water',
    returnB: 'pool water',
    returnC: 'pool water',
  };
  for (const line of plumbed.lines) {
    const pipe = createPipe(
      line.pipe,
      line.od,
      line.points,
      line.chemical === 'hypochlorite'
        ? { colour: '#e8d84a', laid: true }
        : line.chemical === 'acid'
          ? { colour: '#d8d2c0', laid: true }
          : line.pipe === 'pvc-pressure'
            ? { colour: '#4d5a63' }
            : { laid: true },
    );
    markComponent(pipe, {
      name: `Pipe: ${LINK_NAMES[line.edge]}`,
      model: { link: line.edge },
    });
    object.add(pipe);
    if (SERVICE[line.edge])
      // Its plates and flow arrows are its own: bound to its link.
      object.add(
        markComponent(
          markPipe(kit, line.points, {
            radius: line.od / 2,
            service: 'pool water',
            text: LINK_NAMES[line.edge].toUpperCase(),
            flow: 1,
          }),
          {
            name: `${LINK_NAMES[line.edge]} pipe markings`,
            model: { link: line.edge },
          },
        ),
      );
  }
  {
    const p = PLACES.sampleTee;
    const tee = createPipeTee(
      'pvc-pressure',
      OD[150],
      OD[15] * 2,
      [p.x, p.y!, p.z],
      [1, 0, 0],
      [0, -1, 0],
    );
    object.add(
      describe(tee, 'sampleTee', nodeName('sampleTee'), { node: 'sampleTee' }),
    );
  }
  for (const id of ['hypoInjection', 'acidInjection'] as const) {
    const p = PLACES[id];
    const g = new Group();
    g.position.set(p.x, p.y!, p.z);
    t.cyl(
      g,
      t.paint('#4d5a63', 0.5),
      OD[150] / 2 + 0.01,
      0.3,
      0,
      0,
      0,
      'x',
      20,
    );
    t.cyl(g, t.paint('#ecebe4', 0.4), 0.02, 0.15, 0, 0, -0.08, 'z', 12);
    object.add(describe(still(g), id, nodeName(id), { node: id }));
  }

  // ---- The fittings on the lines ----
  for (const item of plumbed.items) placeItem(item);
  function placeItem(item: PlacedItem) {
    const line = plumbed.lines.find((l) => l.edge === item.edge)!;
    const od = line.od;
    const f = fittingById(item.id)!;
    const tag = TAGS[item.id];
    const south: [number, number] = [0, 1];
    // The sample's own valve and needle are on its panel (its ball valve and regulator).
    if (f.id === 'sample.iso' || f.id === 'sample.needle') return;
    if (f.kind === 'non-return-valve') {
      const nrv = createInlineFitting(kit, {
        kind: 'non-return-valve',
        medium: line.chemical ? 'chemical' : 'water',
        operator: 'self',
        od,
      } as never);
      placeFitting(nrv.object, 'non-return-valve', item.at, item.along, south);
      object.add(
        markComponent(nrv.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
        }),
      );
      return;
    }
    if (f.kind === 'flowmeter') {
      const meter = createMagFlowmeter(kit, { od, tag: shortTag(item.id) });
      meter.group.traverse((o) => (o.userData.live = true));
      placeFitting(meter.group, 'flowmeter', item.at, item.along, south);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(f)} (Kessler-Moody)`,
          model: { fitting: f.id },
          status: () => `shows ${readings.flow.toFixed(0)} m³/h`,
        }),
      );
      updates.push(() => meter.show(readings.flow, 'FLOW'));
      return;
    }
    const id = f.id as ValveId;
    const valve = parts.add(
      createChemicalBallValve(kit, {
        dn: 15,
        name: `${shortTag(id)} ${fittingName(f)}`,
        binding: {
          open: () => state().open[id],
          set: (open) => act({ type: 'valve', id, open }),
        },
      }),
    );
    if (od > 0.1) valve.object.scale.setScalar(4);
    placeFitting(valve.object, 'isolating-valve', item.at, item.along, south);
    markComponent(valve.object, {
      name: `${tag} ${fittingName(f)}`,
      model: { fitting: f.id },
      status: () =>
        state().open[id]
          ? 'handle along the pipe: open'
          : 'handle across the pipe: shut',
    });
    object.add(valve.object);
  }

  // ---- The swimmers, the test kit, the fault pedestal: before the plant ----
  const swim = createSwimmersDial(kit, {
    tag: shortTag('swimmers'),
    swimmers: {
      get value() {
        return SWIMMERS.indexOf(state().swimmers);
      },
      set: (p: number) =>
        act({
          type: 'swimmers',
          swimmers: SWIMMERS[Math.max(0, Math.min(3, p))],
        }),
    },
  });
  turnTo(swim.group, E - 1.0, 0, PLANT_EDGE + 0.4, 0);
  object.add(
    markComponent(swim.group, {
      name: `${TAGS['swimmers']} SWIMMERS dial`,
      // The exhibit's own control of the bathers, the world beyond the
      // hall (never drawn): it sets the load, it is no part of the plant.
      decorative: true,
      status: () =>
        `at ${state().swimmers.toUpperCase()}, ${Math.round(bathersNow(state()))} in the water`,
    }),
  );
  take(swim.parts);
  updates.push((delta) => swim.show(bathersNow(state()), delta));
  footprint(E - 1.0, PLANT_EDGE + 0.4, 0.2);

  const kitTk = createDpdTestKit(kit, {
    tag: shortTag('testKit'),
    test: () => act({ type: 'test' }),
  });
  turnTo(kitTk.group, TEST_KIT_X, 0, LECTERN_Z, 0);
  object.add(
    markComponent(kitTk.group, {
      name: `${TAGS['testKit']} DPD test kit`,
      model: { node: 'testKit' },
      status: () => {
        const r = state().test;
        return r
          ? `its ticket reads free ${r.dpd1.toFixed(2)}, total ${r.dpd3.toFixed(2)}, pH ${r.phenolRed.toFixed(1)}`
          : 'not yet used';
      },
    }),
  );
  take(kitTk.parts);
  updates.push((delta) => {
    kitTk.show(state().test);
    kitTk.parts.update(delta);
  });
  footprint(TEST_KIT_X, LECTERN_Z, 0.3);

  const faults = createFaultPedestal(kit, {
    tag: shortTag('faults'),
    air: () => act({ type: 'air' }),
    weak: () => act({ type: 'weak' }),
    airLit: () => state().airFault,
    weakLit: () => state().storeStrength === WEAK_STRENGTH,
  });
  turnTo(faults.group, WEST + 1.2, 0, PLANT_EDGE + 0.4, 0);
  object.add(
    markComponent(faults.group, {
      name: `${TAGS['faults']} fault pedestal`,
      // The exhibit's fault buttons: they stage a fault in the simulation
      // (air in a pump, weak delivery), as RESET restarts it; no plant.
      decorative: true,
    }),
  );
  take(faults.parts);
  updates.push(faults.update);
  footprint(WEST + 1.2, PLANT_EDGE + 0.4, 0.2);

  // ---- The south wall: the mimic, the chemistry board, the entrance, RESET ----
  const board = createMimicBoard(kit, HALL3_MIMIC, {
    maker: 'penfold',
    press: (id) => {
      const s = mimicSpeed(id);
      if (s) {
        session = { ...session, clock: setSpeed(session.clock, s) };
        mimicDue = 0;
      }
    },
    parts: {
      readout: (id) => ({
        kind: 'visible',
        label: `${hall3Reading(id, state())?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  turnTo(board.group, 0, 1.5, SOUTH, FACE_NORTH);
  // The mimic panel is in the model (M3-MP1), its lamps, readouts and
  // buttons bound through it.
  object.add(
    instrument(board.group, 'mimic', 'mimic panel (Penfold Controls)'),
  );
  take(board.parts);

  // The chemistry board: QI1, QI2 and the chart recorder QR1, and PLANT TIME.
  const chem = new Group();
  turnTo(chem, 3.4, 0, SOUTH, FACE_NORTH);
  t.box(chem, t.paint('#d9d7cf', 0.6), 1.6, 1.1, 0.04, 0, 1.55, 0.02);
  const cl = createPanelMeter(kit, 'mg/l', {
    scaleMax: 3,
    band: { from: 0.8 / 3, to: 2 / 3, colour: '#3a9a4a' },
  });
  cl.group.scale.setScalar(3.2);
  cl.group.position.set(-0.55, 1.75, 0.05);
  chem.add(
    instrument(
      cl.group,
      'board.cl',
      'free chlorine meter',
      () => `reads ${readings.free.toFixed(2)} mg/l`,
    ),
  );
  const ph = createDialGauge(kit, {
    dia: 0.2,
    min: 6.5,
    max: 8,
    unit: 'pH',
    entry: 'back',
    legend: shortTag('board.ph'),
    flutter: 0,
  });
  ph.group.position.set(-0.55, 1.28, 0.06);
  chem.add(
    instrument(
      ph.group,
      'board.ph',
      'pH meter',
      () => `reads pH ${readings.ph.toFixed(2)}`,
    ),
  );
  const chart = createDayChartRecorder(kit);
  chart.group.position.set(0.35, 1.62, 0.04);
  chem.add(instrument(chart.group, 'chart', '24-hour chart recorder'));
  for (const [text, x, y] of [
    [`${shortTag('board.cl')} FREE CHLORINE`, -0.55, 1.52],
    [`${shortTag('board.ph')} pH`, -0.55, 1.13],
    [`${shortTag('chart')} 24 HOURS`, 0.35, 1.32],
  ] as const) {
    const l = createMicroLabel(kit, text, {
      height: 0.022,
      ink: '#16191b',
      plate: '#f4f3ee',
    });
    l.position.set(x, y, 0.045);
    chem.add(l);
  }
  const timeLcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.016,
    backlight: true,
  });
  timeLcd.group.position.set(0.35, 1.15, 0.045);
  chem.add(
    markComponent(timeLcd.group, {
      name: 'Plant time display',
      // The exhibit's own time readout, not plant.
      decorative: true,
      status: () => `shows ${hallClockText(session.clock)}`,
    }),
  );
  object.add(
    markComponent(chem, {
      name: `${TAGS.board} chemistry board: free chlorine, pH and the 24-hour chart, from DC1`,
      model: { node: 'board' },
      status: () =>
        `meters at ${readings.free.toFixed(2)} mg/l and pH ${readings.ph.toFixed(2)}; PLANT TIME ${hallClockText(session.clock)}`,
    }),
  );
  const freshChart = (now: number) => chart.fresh(now);
  freshChart(session.clock.start);
  resets.push(freshChart);
  let timeShown = '';
  let timeDue = 0;
  updates.push((delta) => {
    cl.set(readings.free / 3);
    cl.update(delta);
    ph.set(readings.ph);
    ph.update(delta);
    chart.show(session.clock.start + session.clock.seconds, [
      readings.free / 3,
      (readings.ph - 6.5) / 1.5,
    ]);
    timeDue -= delta;
    if (timeDue > 0) return;
    timeDue = 0.25;
    const lines = [
      `PLANT TIME ${hallClockText(session.clock).slice(0, 5)}`,
      `SPEED x${session.clock.speed}`.padEnd(16),
    ];
    const key = lines.join('|');
    if (key === timeShown) return;
    timeShown = key;
    timeLcd.show(lines);
  });

  const entrance = createWallPanel(
    kit,
    'Entrance panel',
    1.9,
    1.5,
    paintEntrance(hall3Entrance(), 'Hall 3 · Safe water'),
  );
  // East of the archway in from Hall 2 (layout C).
  turnTo(entrance, WEST + 0.8, 1.65, SOUTH, FACE_NORTH);
  object.add(still(entrance));
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  turnTo(resetSign, WEST + 2.6, 1.75, SOUTH, FACE_NORTH);
  object.add(still(resetSign));
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(localNow()),
    lit: () => state().sinceReset < 2.5,
  });
  turnTo(resetButton.group, WEST + 2.6, 0, SOUTH - 0.45, FACE_NORTH);
  // The exhibit's RESET: it restarts the simulation, it works no plant.
  object.add(
    markComponent(resetButton.group, {
      name: 'RESET SIMULATION pedestal',
      decorative: true,
    }),
  );
  take(resetButton.parts);
  updates.push(resetButton.update);
  footprint(WEST + 2.6, SOUTH - 0.45, 0.25);

  // ---- The placards, before the plant ----
  for (const p of hall3Placards()) {
    const x = LECTERNS[p.station!];
    const lectern = createLectern(kit, p);
    turnTo(lectern, x, 0, LECTERN_Z, 0);
    object.add(still(lectern));
    footprint(x, LECTERN_Z, 0.2);
  }

  return {
    object,
    parts,
    status: () => (readings.flow > 0 ? 'circulating and dosing' : 'stopped'),
    solids: () => solids,
    reset,
    update(delta) {
      session = runSession(HALL3_MODEL, session, delta);
      session = {
        ...session,
        state: {
          ...session.state,
          sinceReset: session.state.sinceReset + delta,
        },
      };
      readings = hall3Readings(session.state);
      blink += delta;
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall3MimicState(
          session.state,
          session.clock.speed,
          Math.floor(blink * 4) % 2 === 0,
        );
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}
