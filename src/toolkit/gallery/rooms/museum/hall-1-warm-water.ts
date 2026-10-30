import { Group } from 'three';
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
} from '../../../components/core/parts/parts';
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
} from '../../../components/plant/views/pumps-plant';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createDigitalThermometer } from '../../../components/plant/views/digital-thermometer';
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import { createThrottleValve } from '../../../components/plant/views/throttle-valve';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { createHeatMeter } from '../../../components/plant/views/heat-meter';
import { markPipe } from '../../../components/plant/views/pipe-markers';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import { createPoolClock } from '../../../components/architectural/views/pool-clock';
import {
  createCondensingBoiler,
  createPressurisation,
  createTwinHeadPump,
} from '../../../components/plant/views/boiler-plant';
import { createBoilerPanel } from '../../../components/plant/views/boiler-controls';
import { createGasBallValve } from '../../../components/plant/views/gas-fittings';
import { createRotaryGasMeter } from '../../../components/plant/views/utility-meters';
import {
  createControlSelector,
  createGasBurnDisplay,
  createLossesBoard,
  createPoolThermostat,
} from '../../../components/plant/views/museum-heating-parts';
import { createExperimentalSource } from '../../../../game/plant/experimental-source';
import {
  BOILER_KW,
  LINK_NAMES,
  NODES,
  NOTCHES,
  POOL_HEAD,
  SWIMMERS,
  TAGS,
  TC_RANGE,
  actOnHall1,
  fittingById,
  fittingName,
  hall1Readings,
  HALL1_MODEL,
  shortTag,
} from '../../../../game/plant/museum-1-heating';
import type {
  Hall1Action,
  LinkId,
  MachineId,
  ValveId,
} from '../../../../game/plant/museum-1-heating';
import {
  BOILER,
  HX_PLINTH,
  OD,
  PLACES,
  PORTS,
  POOL_SHAPE,
  plumbHall1,
} from '../../logic/museum-1-layout';
import type { PlacedItem } from '../../logic/museum-1-layout';
import { HALL_TITLE, hallInterior, hallOrigin } from '../../logic/museum-plan';
import {
  HALL1_MIMIC,
  hall1MimicState,
  READOUT_PERIOD,
  withHeldReadouts,
  hall1Reading,
  mimicSpeed,
} from '../../logic/museum-1-mimic';
import {
  RESET_SIGN,
  hall1Entrance,
  hall1Placards,
} from '../../logic/museum-1-placards';
import {
  hallClockText,
  hallSession,
  localNow,
  runSession,
  setSpeed,
  timeOfDay,
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
import { HEATING_CIRCULATOR } from '../../../components/plant/logic/pump-sound';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import type { HallExhibit } from './exhibits';

/**
 * Hall 1, "Warm water" (107a): a real gas boiler heats the ideal pool
 * through a plate heat exchanger. The schematic, model, layout, mimic and
 * words are pure (`museum-1-heating.ts`, `museum-1-*.ts`); this draws what
 * they say, binds each thing to them, and keeps the hall's session (its
 * state and its clock, `museum-time.ts`). The plant stands along the
 * street (west) wall, gas on the south, pool on the north; the mimic, the
 * clock, the entrance panel, RESET and the cost display on the east wall.
 * In the hall's frame, metres.
 */

/** The east wall's face, where its panels hang, facing west. */
const EAST = 7.66;
/** The street (west) wall's inside face, in the hall's frame. */
const WEST_FACE = hallInterior('museum1').minX - hallOrigin('museum1').x;
const FACE_WEST = -Math.PI / 2;
const FACE_EAST = Math.PI / 2;

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const plumbed = plumbHall1();
  let session = hallSession(HALL1_MODEL, localNow());
  let readings = hall1Readings(session.state);
  let mimicState: MimicState = hall1MimicState(session.state, 1);
  let mimicDue = 0;
  let readoutDue = 0;
  const state = () => session.state;
  const act = (a: Hall1Action) => {
    session = { ...session, state: actOnHall1(session.state, a) };
    readings = hall1Readings(session.state);
    mimicDue = 0;
  };
  const reset = (now: number) => {
    session = hallSession(HALL1_MODEL, now);
    readings = hall1Readings(session.state);
    mimicDue = 0;
    readoutDue = 0;
  };

  const object = new Group();
  object.name = 'Hall 1: Warm water';
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

  // ---- The gas main and the boiler ----
  const gasSource = createExperimentalSource({
    id: 'm1.gas',
    substance: 'natural-gas',
  });
  const gasView = createExperimentalSourceView(kit, gasSource);
  const gasHolder = atMachine(new Group(), 'gasMain');
  gasHolder.add(gasView.group);
  object.add(
    describe(still(gasHolder), 'gasMain', nodeName('gasMain'), {
      node: 'gasMain',
    }),
  );

  const boilerPanel = createBoilerPanel(
    kit,
    (key) => act({ type: 'boiler', key }),
    (celsius) => act({ type: 'boiler-setpoint', celsius }),
  );
  const boiler = createCondensingBoiler(kit, BOILER_KW, boilerPanel.group);
  const control = createControlSelector(kit, {
    name: 'Boiler CONTROL selector',
    mode: {
      get value() {
        return state().mode === 'on-off' ? 0 : 1;
      },
      set: (p: number) =>
        act({ type: 'mode', mode: p === 0 ? 'on-off' : 'modulating' }),
    },
  });
  control.group.position.set(0, BOILER.h - 0.45, BOILER.d / 2);
  boiler.add(control.group);
  // The fill's tapping on top.
  t.cyl(
    boiler,
    t.paint('#b87333', 0.35, 0.8),
    0.011,
    0.04,
    ...PORTS.boiler.fill.at.map((v, k) => (k === 1 ? v - 0.02 : v)),
  );
  const boilerHolder = atMachine(new Group(), 'boiler');
  boilerHolder.add(boiler);
  object.add(
    describe(
      still(
        boilerHolder,
        new Set([
          ...boilerPanel.parts.uses.keys(),
          ...control.parts.uses.keys(),
        ]),
      ),
      'boiler',
      `${nodeName('boiler')} (Hamwarmy HW ${BOILER_KW})`,
      { node: 'boiler' },
      () => {
        const lamps = state().boiler;
        return lamps.lockout
          ? 'its LOCKOUT lamp flashing'
          : lamps.code === 3
            ? 'its BURNER lamp lit'
            : lamps.on
              ? 'its display lit, burner lamp out'
              : 'switched off at its rocker';
      },
    ),
  );
  take(boilerPanel.parts);
  take(control.parts);
  updates.push((delta) => {
    boilerPanel.show(
      state().boiler,
      session.clock.seconds,
      delta,
      readings.gasAvailable,
    );
    control.parts.update(delta);
  });

  const pu = createPressurisation(kit);
  object.add(
    describe(
      still(atMachine(pu, 'pressurisation')),
      'pressurisation',
      nodeName('pressurisation'),
      { node: 'pressurisation' },
      () => 'its gauge at 1.5 bar',
    ),
  );
  const p1 = createTwinHeadPump(kit);
  object.add(
    describe(
      still(atMachine(p1, 'primaryPump')),
      'primaryPump',
      nodeName('primaryPump'),
      { node: 'primaryPump' },
      () =>
        readings.primaryFlow > 0 ? 'duty head display lit' : 'displays dark',
    ),
  );
  let p1Shown: boolean | null = null;
  updates.push(() => {
    const on = readings.primaryFlow > 0;
    if (on !== p1Shown) p1.show((p1Shown = on));
  });
  // Its sound: a heating circulator's, small and quick.
  updates.push(
    heldPumpSound(p1, () => readings.primaryFlow > 0, HEATING_CIRCULATOR, 0.5),
  );

  // ---- The exchanger, the pool pump, the pool ----
  const hx = new Group();
  const plate = createPlateHeatExchanger(kit);
  plate.position.y = HX_PLINTH;
  hx.add(plate);
  t.box(
    hx,
    t.paint('#9a9d98', 0.85),
    1.25,
    HX_PLINTH,
    0.62,
    0.55,
    HX_PLINTH / 2,
    0,
  );
  object.add(
    describe(still(atMachine(hx, 'hx')), 'hx', nodeName('hx'), { node: 'hx' }),
  );

  const pump = createEndSuctionPump(kit);
  object.add(
    describe(
      still(atMachine(pump, 'poolPump')),
      'poolPump',
      nodeName('poolPump'),
      { node: 'poolPump' },
      () => (state().poolPump && !state().tripped ? 'running' : 'stopped'),
    ),
  );
  updates.push((delta) => {
    pump.gauges.suction.set(readings.suctionBar);
    pump.gauges.discharge.set(readings.dischargeBar);
    pump.gauges.suction.update(delta);
    pump.gauges.discharge.update(delta);
  });
  // Its sound, while it runs.
  updates.push(heldPumpSound(pump, () => state().poolPump && !state().tripped));
  // The pool pump's local station: START, STOP, RUN, TRIPPED and its trip RESET.
  const station = createPumpStation(kit, {
    tag: shortTag('poolPump'),
    start: () => act({ type: 'pump', run: true }),
    stop: () => act({ type: 'pump', run: false }),
    running: () => state().poolPump && !state().tripped,
    tripped: () => state().tripped,
    resetTrip: () => act({ type: 'trip-reset' }),
  });
  turnTo(station.group, -3.1, 0, -2.6, FACE_EAST);
  object.add(station.group);
  take(station.parts);
  updates.push(station.update);
  footprint(-3.1, -2.6, 0.2);

  const pool = createIdealVessel(kit, {
    ...POOL_SHAPE,
    water: POOL_HEAD,
    name: 'Ideal pool',
    ports: Object.values(PORTS.pool).map((p) => ({ ...p, od: OD[150] })),
  });
  object.add(
    describe(
      still(atMachine(pool.group, 'pool')),
      'pool',
      'Ideal pool (25 × 12.5 m, 470 m³)',
      { node: 'pool' },
      () => `its display shows ${state().poolC.toFixed(1)} °C`,
    ),
  );
  updates.push(() => {
    pool.show([
      `WATER ${state().poolC.toFixed(1).padStart(5)}C 470m3`,
      `IN ${readings.flow.toFixed(0).padStart(4)}m3/h   IDEAL`,
    ]);
  });
  // The pool's big display, TI5, on the street (west) wall just below
  // the hall's title (the owner, 2026-10-30): its digits (a window 0.81
  // × 0.37 m) across the top, the unit and tag in a line of their own
  // beneath them, never over them.
  const big = new Group();
  const bigH = 0.58;
  turnTo(
    big,
    WEST_FACE + 0.01,
    HALL_TITLE.y - HALL_TITLE.h / 2 - 0.12 - bigH / 2,
    0,
    FACE_EAST,
  );
  t.box(big, t.paint('#1b2328', 0.5), 1.1, bigH, 0.05, 0, 0, 0.025);
  // Read from anywhere in the hall: drawn in full from its far end.
  const bigDigits = createSevenSegment(kit, 4, {
    digitHeight: 0.22,
    kind: 'giant-led',
  });
  bigDigits.group.position.set(0, 0.07, 0.052);
  bigDigits.group.traverse((o) => (o.userData.live = true));
  big.add(bigDigits.group);
  const bigUnit = createMicroLabel(kit, `°C  POOL ${shortTag('pool.ti')}`, {
    height: 0.05,
    ink: '#f4f3ee',
  });
  bigUnit.position.set(0, -0.2, 0.052);
  big.add(bigUnit);
  object.add(
    markComponent(big, {
      name: `${TAGS['pool.ti']} pool temperature display`,
      model: { node: 'pool' },
      status: () => `shows ${state().poolC.toFixed(1)} °C`,
    }),
  );
  let bigShown = '';
  updates.push(() => {
    const text = state().poolC.toFixed(1).padStart(5);
    if (text !== bigShown) bigDigits.show((bigShown = text));
  });

  // ---- The pipes and tees ----
  const SERVICE: Partial<
    Record<LinkId, 'gas' | 'heating flow' | 'heating return' | 'pool water'>
  > = {
    gas: 'gas',
    primaryFlow: 'heating flow',
    hxFlow: 'heating flow',
    bypass: 'heating flow',
    hxReturn: 'heating return',
    primarySuction: 'heating return',
    primaryReturn: 'heating return',
    fill: 'heating return',
    poolOut: 'pool water',
    poolDischarge: 'pool water',
    poolReturn: 'pool water',
  };
  for (const line of plumbed.lines) {
    const kind =
      line.pipe === 'flue'
        ? 'twin-wall-flue'
        : line.pipe === 'steel-gas'
          ? 'steel-screwed'
          : line.pipe;
    const pipe = createPipe(
      kind,
      line.od,
      line.points,
      line.pipe === 'steel-gas'
        ? { colour: '#e8c21a' }
        : line.pipe === 'pvc-pressure'
          ? { colour: '#4d5a63' }
          : {},
    );
    markComponent(pipe, {
      name: `Pipe: ${LINK_NAMES[line.edge]}`,
      model: { link: line.edge },
    });
    object.add(pipe);
    const service = SERVICE[line.edge];
    if (service)
      object.add(
        markPipe(kit, line.points, {
          radius: line.od / 2 + (line.pipe === 'lagged-heating' ? 0.025 : 0),
          service,
          text: LINK_NAMES[line.edge].toUpperCase(),
          flow: 1,
        }),
      );
  }
  for (const id of ['flowTee', 'returnTee'] as const) {
    const ports = Object.values(PORTS[id]);
    const opposite = (a: (typeof ports)[number]) =>
      ports.some(
        (b) => a !== b && a.out.every((v, k) => Math.abs(v + b.out[k]) < 1e-9),
      );
    const main = ports.find(opposite)!;
    const branch = ports.find((p) => !opposite(p))!;
    const centre = [0, 1, 2].map((n) => main.at[n] - main.out[n] * 0.15) as [
      number,
      number,
      number,
    ];
    const p = PLACES[id];
    const tee = createPipeTee(
      'lagged-heating',
      OD[65],
      OD[40],
      [p.x + centre[0], centre[1], p.z + centre[2]],
      main.out,
      branch.out,
      // Its ports, where the pipes end, stand 0.15 m out (`PORTS`).
      0.15,
    );
    object.add(describe(tee, id, nodeName(id), { node: id }));
  }

  // ---- The fittings and instruments on the lines ----
  for (const item of plumbed.items) placeItem(item);
  function placeItem(item: PlacedItem) {
    const od = plumbed.lines.find((l) => l.edge === item.edge)!.od;
    const f = fittingById(item.id);
    const tag = TAGS[item.id];
    const short = shortTag(item.id);
    const east: [number, number] = [1, 0];
    if (f?.kind === 'isolating-valve' && f.operator === 'motor') {
      const mv = createInlineFitting(
        kit,
        { kind: 'remote-valve', medium: 'water', operator: 'motor', od },
        { open: () => state().mv > 0.5, set: () => {} },
      );
      placeFitting(mv.object, 'remote-valve', item.at, item.along, east);
      object.add(
        markComponent(mv.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () =>
            state().mv >= 0.98
              ? 'indicator at OPEN'
              : state().mv <= 0.02
                ? 'indicator at SHUT'
                : 'actuator moving',
        }),
      );
      updates.push(mv.update);
      return;
    }
    if (f?.body === 'butterfly') {
      const id = f.id as ValveId;
      const valve = parts.add(
        createThrottleValve(kit, {
          dn: 150,
          tag: short,
          name: fittingName(f),
          opening: () => state().opening[id],
          step: (by) => act({ type: 'notch', id, by }),
          notches: NOTCHES,
        }),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, east);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(f)}`,
        model: { fitting: f.id },
        status: () => {
          const o = state().opening[id];
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
    if (f?.body === 'ball') {
      const id = f.id as ValveId;
      const valve = parts.add(
        createGasBallValve(kit, {
          pipeRadius: od / 2,
          name: `${short} ${fittingName(f)}`,
          binding: {
            open: () => state().opening[id] > 0.5,
            set: (open) => act({ type: 'valve', id, open }),
          },
        }),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, east);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(f)}`,
        model: { fitting: f.id },
        status: () =>
          state().opening[id] > 0.5
            ? 'lever along the pipe: open'
            : 'lever across the pipe: shut',
      });
      object.add(valve.object);
      return;
    }
    if (f?.body === 'bypass' || f?.kind === 'non-return-valve') {
      const nrv = createInlineFitting(kit, {
        kind: 'non-return-valve',
        medium: 'water',
        operator: 'self',
        od,
      });
      placeFitting(nrv.object, 'non-return-valve', item.at, item.along, east);
      object.add(
        markComponent(nrv.object, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
        }),
      );
      return;
    }
    if (f?.meter === 'gas') {
      const meter = createRotaryGasMeter(kit, { flangeR: 0.06 });
      placeFitting(meter.group, 'flowmeter', item.at, item.along, east);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(f)} (Trager-Feinstein)`,
          model: { fitting: f.id },
          status: () => `its counter at ${state().gasM3.toFixed(0)} m³`,
        }),
      );
      updates.push(() => meter.show(state().gasM3));
      return;
    }
    if (f?.meter === 'heat') {
      const meter = createHeatMeter(kit, { od, tag: short });
      placeFitting(meter.group, 'flowmeter', item.at, item.along, east);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () => `shows ${state().heatKWh.toFixed(1)} kWh`,
        }),
      );
      updates.push((delta) =>
        meter.show(state().heatKWh, Math.max(0, readings.duty), delta),
      );
      return;
    }
    if (f?.kind === 'flowmeter') {
      const meter = createMagFlowmeter(kit, { od, tag: short });
      meter.group.traverse((o) => (o.userData.live = true));
      placeFitting(meter.group, 'flowmeter', item.at, item.along, east);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(f)}`,
          model: { fitting: f.id },
          status: () => `shows ${readings.flow.toFixed(0)} m³/h`,
        }),
      );
      updates.push(() => meter.show(readings.flow, 'FLOW'));
      return;
    }
    // The instruments.
    const holder = new Group();
    placeFitting(holder, 'isolating-valve', item.at, item.along, east);
    object.add(holder);
    if (item.kind === 'gauge') {
      const dial = createDialGauge(kit, {
        dia: 0.1,
        max: 40,
        unit: 'mbar',
        legend: short,
      });
      dial.group.position.set(0, od / 2 + 0.13, 0);
      holder.add(dial.group);
      markComponent(holder, {
        name: `${tag} gas pressure gauge`,
        status: () => `reads ${dial.value.toFixed(0)} mbar`,
      });
      updates.push((delta) => {
        dial.set(readings.gasMbar);
        dial.update(delta);
      });
    } else if (item.kind === 'thermometer') {
      const read = () => readings.temps[item.id];
      if (od < 0.1) {
        const dial = createDialGauge(kit, {
          kind: 'thermometer',
          dia: 0.1,
          min: 0,
          max: 120,
          legend: short,
          entry: 'bottom',
        });
        dial.group.position.set(0, od / 2 + 0.025 + 0.11, 0);
        holder.add(dial.group);
        markComponent(holder, {
          name: `${tag} thermometer`,
          status: () => `reads ${dial.value.toFixed(0)} °C`,
        });
        updates.push((delta) => {
          dial.set(read());
          dial.update(delta);
        });
      } else {
        const tt = createDigitalThermometer(kit, { tag: short, pipeOd: od });
        holder.add(tt.group);
        markComponent(holder, {
          name: `${tag} thermometer`,
          status: () => `shows ${read().toFixed(1)} °C`,
        });
        // A reading a second, as the real head samples (2026-10-29).
        let due = 0;
        updates.push((delta) => {
          due -= delta;
          if (due > 0) return;
          due = 1;
          tt.show(read());
        });
      }
    } else if (item.kind === 'flow-switch') {
      // A paddle flow switch: its head on the pipe, its LED lit while made.
      t.cyl(
        holder,
        t.paint('#7d8285', 0.5, 0.4),
        0.02,
        0.08,
        0,
        od / 2 + 0.04,
        0,
      );
      const head = new Group();
      head.position.set(0, od / 2 + 0.13, 0);
      holder.add(head);
      t.box(head, t.paint('#d8dbd6', 0.5), 0.1, 0.1, 0.07, 0, 0, 0);
      const made = signal(readings.flowSwitch);
      const led = parts.add(
        pilotLight(kit, {
          colour: 'green',
          legend: short,
          drive: made,
          name: `${short} flow switch lamp`,
          pushToTest: false,
        }),
      );
      led.object.position.set(0, 0, 0.036);
      led.object.scale.setScalar(0.6);
      head.add(led.object);
      markComponent(holder, {
        name: `${tag} flow switch`,
        status: () => (made.value ? 'its lamp lit' : 'its lamp out'),
      });
      updates.push(() => {
        if (made.value !== readings.flowSwitch)
          made.value = readings.flowSwitch;
      });
    } else if (item.kind === 'thermostat') {
      const tc = createPoolThermostat(kit, {
        tag: short,
        range: TC_RANGE,
        setting: {
          get value() {
            return state().tcSet;
          },
          set: (celsius: number) => act({ type: 'tc-set', celsius }),
        },
        calling: () => state().calling,
      });
      // On a stem above the pipe, its face toward the visitors.
      t.cyl(
        holder,
        t.paint('#7d8285', 0.5, 0.4),
        0.012,
        0.35,
        0,
        od / 2 + 0.17,
        0,
      );
      const box = new Group();
      box.add(tc.group);
      box.position.set(item.at[0], item.at[1] + od / 2 + 0.47, item.at[2]);
      box.rotation.y = FACE_EAST;
      object.add(box);
      markComponent(box, {
        name: `${tag} pool thermostat`,
        status: () =>
          `dial at ${state().tcSet} °C, CALL lamp ${state().calling ? 'lit' : 'out'}`,
      });
      take(tc.parts);
      updates.push(tc.update);
    }
  }

  // ---- The east wall: the mimic, the clock, the entrance, RESET, the cost ----
  const board = createMimicBoard(kit, HALL1_MIMIC, {
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
        label: `${hall1Reading(id, state())?.name ?? id} readout`,
        shows: () => {
          const r = mimicState.readouts[id]?.live;
          return r ? `${r.value.toFixed(r.places ?? 0)} ${r.unit}` : undefined;
        },
      }),
    },
  });
  turnTo(board.group, EAST, 1.5, -1.0, FACE_WEST);
  object.add(board.group);
  take(board.parts);

  const clock = createPoolClock(kit, { dia: 0.75 });
  turnTo(clock.group, EAST, 1.95, 2.3, FACE_WEST);
  object.add(
    markComponent(clock.group, {
      name: 'Pool clock, showing the hall’s time',
      status: () => `shows ${hallClockText(session.clock).slice(0, 5)}`,
    }),
  );
  const timeBox = new Group();
  turnTo(timeBox, EAST, 1.35, 2.3, FACE_WEST);
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
      status: () =>
        `shows ${hallClockText(session.clock)} at TIME ×${session.clock.speed}`,
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
      c.fillText('THE HALL’S TIME', w * 0.04, h * 0.34);
      c.font = `${h * 0.2}px Arial`;
      c.fillText(
        'Press a TIME button on the map and watch it race.',
        w * 0.04,
        h * 0.72,
        w * 0.92,
      );
    },
  );
  turnTo(clockPlaque, EAST, 0.95, 2.3, FACE_WEST);
  object.add(still(clockPlaque));
  let timeShown = '';
  let timeDue = 0;
  updates.push((delta) => {
    clock.show(
      timeOfDay(session.clock),
      session.clock.speed,
      delta > 0 ? Math.min(240, 1 / delta) : 60,
    );
    timeDue -= delta;
    if (timeDue > 0) return;
    timeDue = 0.25;
    const lines = [
      `TIME ${hallClockText(session.clock)}`,
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
    paintEntrance(hall1Entrance(), 'Hall 1 · Warm water'),
  );
  turnTo(entrance, EAST, 1.65, 4.9, FACE_WEST);
  object.add(still(entrance));
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  turnTo(resetSign, EAST, 1.75, 3.45, FACE_WEST);
  object.add(still(resetSign));
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(localNow()),
    lit: () => state().sinceReset < 2.5,
  });
  turnTo(resetButton.group, EAST - 0.45, 0, 3.45, FACE_WEST);
  object.add(resetButton.group);
  take(resetButton.parts);
  updates.push(resetButton.update);
  footprint(EAST - 0.45, 3.45, 0.25);

  const cost = createGasBurnDisplay(kit, {
    tag: shortTag('cost'),
    scale: 200,
  });
  turnTo(cost.group, EAST, 1.55, -4.6, FACE_WEST);
  object.add(
    markComponent(cost.group, {
      name: `${TAGS['cost']} gas burn display`,
      status: () =>
        `shows ${readings.gasFlow.toFixed(1)} m³/h; needle at ${readings.gasKW.toFixed(0)} kW`,
    }),
  );
  updates.push((delta) => cost.show(readings.gasKW, readings.gasFlow, delta));

  // ---- The losses board, by the pool ----
  const losses = createLossesBoard(kit, {
    meters: [
      {
        id: 'loss.evaporation',
        label: `${shortTag('loss.evaporation')}\nEVAPORATION`,
        scale: 50,
      },
      {
        id: 'loss.convection',
        label: `${shortTag('loss.convection')}\nTO THE AIR ±10`,
        scale: 10,
        signed: true,
      },
      {
        id: 'loss.ground',
        label: `${shortTag('loss.ground')}\nTO THE GROUND`,
        scale: 10,
      },
      {
        id: 'loss.total',
        label: `${shortTag('loss.total')}\nTOTAL LOST`,
        scale: 50,
      },
    ],
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
  const lossStand = new Group();
  turnTo(lossStand, -2.45, 0, -5.6, FACE_EAST);
  t.box(
    lossStand,
    t.paint('#2b3438', 0.5, 0.3),
    0.08,
    0.9,
    0.08,
    -0.5,
    0.45,
    -0.05,
  );
  t.box(
    lossStand,
    t.paint('#2b3438', 0.5, 0.3),
    0.08,
    0.9,
    0.08,
    0.5,
    0.45,
    -0.05,
  );
  losses.group.position.set(0, 1.35, 0);
  lossStand.add(losses.group);
  object.add(
    markComponent(lossStand, {
      name: 'Losses board (the museum’s model of the heat balance, no real plant measures these)',
      status: () =>
        `needles at ${readings.losses.evaporation.toFixed(0)}, ${readings.losses.convection.toFixed(0)}, ${readings.losses.ground.toFixed(0)} and ${readings.losses.total.toFixed(0)} kW; SWIMMERS at ${state().swimmers.toUpperCase()}`,
    }),
  );
  take(losses.parts);
  updates.push((delta) =>
    losses.show(
      {
        'loss.evaporation': readings.losses.evaporation,
        'loss.convection': readings.losses.convection,
        'loss.ground': readings.losses.ground,
        'loss.total': readings.losses.total,
      },
      delta,
    ),
  );
  solids.push({ minX: -2.6, maxX: -2.3, minZ: -6.35, maxZ: -4.85 });

  // ---- The placards ----
  const LECTERNS: Record<number, { x: number; z: number; yaw: number }> = {
    1: { x: -2.0, z: 5.4, yaw: FACE_EAST },
    2: { x: -2.0, z: 4.0, yaw: FACE_EAST },
    3: { x: -2.0, z: 1.2, yaw: FACE_EAST },
    4: { x: -2.0, z: -1.6, yaw: FACE_EAST },
    5: { x: -2.0, z: -3.0, yaw: FACE_EAST },
    6: { x: -2.0, z: -4.3, yaw: FACE_EAST },
    7: { x: 6.6, z: -3.2, yaw: FACE_WEST },
  };
  for (const p of hall1Placards()) {
    const at = LECTERNS[p.station!];
    const lectern = createLectern(kit, p);
    turnTo(lectern, at.x, 0, at.z, at.yaw);
    object.add(still(lectern));
    footprint(at.x, at.z, 0.2);
  }

  return {
    object,
    parts,
    status: () => (state().poolPump ? 'circulating' : 'stopped'),
    solids: () => solids,
    reset,
    update(delta) {
      session = runSession(HALL1_MODEL, session, delta);
      session = {
        ...session,
        state: {
          ...session.state,
          sinceReset: session.state.sinceReset + delta,
        },
      };
      readings = hall1Readings(session.state);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        readoutDue -= 0.25 - mimicDue;
        mimicState = withHeldReadouts(
          hall1MimicState(session.state, session.clock.speed),
          mimicState,
          readoutDue <= 0,
        );
        if (readoutDue <= 0) readoutDue = READOUT_PERIOD;
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      for (const u of updates) u(delta);
    },
  };
}
