import { Group, Mesh, MeshStandardMaterial, CylinderGeometry } from 'three';
import type { Object3D } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  keySwitch,
  mushroomStop,
  pilotLight,
  pushButton,
  selector,
} from '../../../components/core/parts/parts';
import type { Part } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../../components/core/views/pipe-kinds';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { tools } from '../../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
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
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import { createThrottleValve } from '../../../components/plant/views/throttle-valve';
import { createIdealVessel } from '../../../components/plant/views/ideal-vessel';
import { createHeatMeter } from '../../../components/plant/views/heat-meter';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import {
  createCharacterLcd,
  createPanelMeter,
} from '../../../components/industrial-control/views/panel-instruments';
import {
  createCondensingBoiler,
  createPressurisation,
  createTwinHeadPump,
} from '../../../components/plant/views/boiler-plant';
import { createBoilerPanel } from '../../../components/plant/views/boiler-controls';
import { createGasBallValve } from '../../../components/plant/views/gas-fittings';
import { createRotaryGasMeter } from '../../../components/plant/views/utility-meters';
import { createChemicalBallValve } from '../../../components/plant/views/chemical-ball-valve';
import { createDiaphragmPump } from '../../../components/plant/views/diaphragm-pump';
import { createSamplePanel } from '../../../components/plant/views/sample-cell-panel';
import { createCx7Controller } from '../../../components/plant/views/cx7-controller';
import {
  createDpdTestKit,
  createSmallDayTank,
} from '../../../components/plant/views/museum-dosing-parts';
import { createAnnunciatorBoard } from '../../views/location-annunciator';
import { createExperimentalSource } from '../../../../game/plant/experimental-source';
import { BOILER_KW } from '../../../../game/plant/museum-1-heating';
import { NOTCHES } from '../../../../game/plant/museum-2-clean-water';
import type { ValveId as WaterValve } from '../../../../game/plant/museum-2-clean-water';
import { PUMPS, PUMP_KIND } from '../../../../game/plant/museum-3-dosing';
import type { ValveId as ChemValve } from '../../../../game/plant/museum-3-dosing';
import {
  ALARM_TEXT,
  INSTRUMENTS,
  LINK_NAMES,
  NODES,
  STARTER_MODES,
  TAGS,
  WINDOWS,
  fittingById,
  fittingName,
  hall9Readings,
  shortTag,
} from '../../../../game/plant/museum-9-plant';
import type {
  Hall9PlantAction,
  Hall9Readings,
  MachineId,
} from '../../../../game/plant/museum-9-plant';
import {
  FAULTS,
  HALL9_MODEL,
  actOnHall9,
  scoreboard,
  stationClock,
} from '../../../../game/plant/museum-9-faults';
import type {
  FaultNo,
  Hall9,
  Hall9Action,
} from '../../../../game/plant/museum-9-faults';
import type { DoseChannel } from '../../../components/plant/logic/dosing-controller';
import {
  BOILER,
  CHEM_EDGE,
  DAY_TANK,
  DESK,
  FILTER_SHAPE,
  HX_PLINTH,
  OD,
  PEDESTAL,
  PLACES,
  PLANT_EDGE,
  PLINTH,
  PORTS,
  POOL_SHAPE,
  POOL_WATER,
  SOUTH,
  TANK_SHAPE,
  interior,
  inHall,
  plumbHall9,
} from '../../logic/museum-9-layout';
import type { PlacedItem } from '../../logic/museum-9-layout';
import {
  HALL9_MIMIC,
  hall9MimicState,
  mimicCommand,
} from '../../logic/museum-9-mimic';
import {
  RESET_SIGN,
  hall9Entrance,
  hall9Placards,
} from '../../logic/museum-9-placards';
import {
  SPEEDS,
  hallSession,
  localNow,
  runSession,
  setSpeed,
} from '../../logic/museum-time';
import {
  createLectern,
  createResetPedestal,
  createWallPanel,
  paintEntrance,
  paintResetSign,
} from '../../views/museum-exhibit';
import type { MimicState } from '../../../components/industrial-control/logic/mimic';
import type { HallExhibit } from './exhibits';

/**
 * Hall 9, "The whole plant" (107e, the finale): Halls 1 to 3's models
 * joined into one small working plant (`museum-9-plant.ts`), its ten
 * faults and the hall round it (`museum-9-faults.ts`), laid out and
 * plumbed (`museum-9-layout.ts`), its mimic and words pure and tested.
 * This draws what they say and binds each thing to them: the heat and
 * water along the north wall, the chemistry along the south, the control
 * desk in the south-west corner by the way out (mimic, annunciator, the
 * water panel, the station clock and TIME), the fault pedestal and its
 * scoreboard beside it; the entrance panel and RESET by the way in from
 * Hall 8. Every control works; the desk works only what its mimic carries,
 * the rest is done at the machines. In the hall's frame, metres.
 */

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

const FACE_NORTH = Math.PI;
const FACE_WEST = -Math.PI / 2;
const E = interior.maxX;

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const plumbed = plumbHall9();
  let session = hallSession(HALL9_MODEL, localNow());
  let readings: Hall9Readings = hall9Readings(session.state.plant);
  let mimicState: MimicState = hall9MimicState(session.state.plant);
  let mimicDue = 0;
  let sinceReset = 0;
  const hall = (): Hall9 => session.state;
  const plant = () => session.state.plant;
  const doHall = (a: Hall9Action) => {
    session = { ...session, state: actOnHall9(session.state, a) };
    readings = hall9Readings(session.state.plant);
    mimicDue = 0;
  };
  const act = (action: Hall9PlantAction) => doHall({ type: 'plant', action });
  const reset = (now: number) => {
    session = hallSession(HALL9_MODEL, now);
    readings = hall9Readings(session.state.plant);
    mimicDue = 0;
    sinceReset = 0;
  };

  const object = new Group();
  object.name = 'Hall 9: The whole plant';
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
    turnTo(o, PLACES[id].x, PLACES[id].y ?? 0, PLACES[id].z, PLACES[id].yaw);
  const solids: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [
    ...plumbed.solids,
  ];
  const footprint = (x: number, z: number, r = 0.3) =>
    solids.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });
  /** An engraved traffolyte tag: its derived tag over what it measures, from the model. */
  const tagPlate = (id: string, width = 0.2) => {
    const role = INSTRUMENTS.find((i) => i.id === id)?.role ?? '';
    const g = new Group();
    const a = createMicroLabel(kit, TAGS[id], {
      height: 0.02,
      ink: '#f4f4f0',
      plate: '#16191b',
      maxWidth: width,
    });
    a.position.y = 0.014;
    const b = createMicroLabel(kit, role.toUpperCase(), {
      height: 0.016,
      ink: '#f4f4f0',
      plate: '#16191b',
      maxWidth: width,
    });
    b.position.y = -0.014;
    g.add(a, b);
    g.name = `Tag plate ${TAGS[id]}`;
    return g;
  };
  const machine = (
    view: Object3D,
    id: MachineId,
    name = nodeName(id),
    status?: () => string | undefined,
    worked?: Set<Object3D>,
  ) => {
    const holder = atMachine(new Group(), id);
    holder.add(view);
    object.add(describe(still(holder, worked), id, name, { node: id }, status));
    return holder;
  };

  // ---- The heat: gas main, pressurisation, boiler and flue, primary pump, exchanger ----
  const gasView = createExperimentalSourceView(
    kit,
    createExperimentalSource({ id: 'm9.gas', substance: 'natural-gas' }),
  );
  machine(gasView.group, 'gasMain');
  const pi3 = createDialGauge(kit, {
    dia: 0.1,
    min: 0,
    max: 40,
    unit: 'mbar',
    legend: shortTag('gas.pi'),
    entry: 'back',
  });
  // On its own post, by the gas main, at eye height.
  const pi3Post = new Group();
  pi3Post.position.set(PLACES.gasMain.x + 0.4, 0, PLACES.gasMain.z);
  t.box(pi3Post, t.paint('#55616a', 0.5), 0.04, 1.3, 0.04, 0, 0.65, -0.04);
  pi3.group.position.set(0, 1.3, 0);
  pi3Post.add(pi3.group);
  const pi3Tag = tagPlate('gas.pi');
  pi3Tag.position.set(0, 1.17, 0.01);
  pi3Post.add(pi3Tag);
  object.add(
    describe(
      pi3Post,
      'gas.pi',
      'gas pressure gauge',
      { node: 'gasMain' },
      () => `reads ${readings.pi3.toFixed(0)} mbar`,
    ),
  );
  updates.push((delta) => {
    pi3.set(readings.pi3);
    pi3.update(delta);
  });

  machine(
    createPressurisation(kit),
    'pressurisation',
    nodeName('pressurisation'),
    () => 'its gauge at 1.5 bar',
  );

  const boilerPanel = createBoilerPanel(
    kit,
    (key) => act({ type: 'heat', action: { type: 'boiler', key } }),
    (celsius) =>
      act({ type: 'heat', action: { type: 'boiler-setpoint', celsius } }),
  );
  const boiler = createCondensingBoiler(kit, BOILER_KW, boilerPanel.group);
  machine(
    boiler,
    'boiler',
    `${nodeName('boiler')} (Hamwarmy HW ${BOILER_KW})`,
    () => {
      const b = plant().heat.boiler;
      return b.lockout
        ? 'its LOCKOUT lamp flashing'
        : b.code === 3
          ? 'its BURNER lamp lit'
          : 'its display lit, burner lamp out';
    },
    new Set(boilerPanel.parts.uses.keys()),
  );
  take(boilerPanel.parts);
  updates.push((delta) =>
    boilerPanel.show(
      plant().heat.boiler,
      session.clock.seconds,
      delta,
      plant().heat.opening['gas.ecv'] > 0.5 &&
        plant().heat.opening['boiler.gas.iso'] > 0.5,
    ),
  );

  const p2 = createTwinHeadPump(kit);
  machine(p2, 'primaryPump', nodeName('primaryPump'), () =>
    readings.p2Running ? 'duty head display lit' : 'displays dark',
  );
  let p2Shown: boolean | null = null;
  updates.push(() => {
    if (readings.p2Running !== p2Shown) p2.show((p2Shown = readings.p2Running));
  });

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
  machine(hx, 'hx');
  // The motorised valve's actuator: its manual override and, for the museum, REPLACE ACTUATOR.
  const actuator = new Group();
  turnTo(actuator, PLACES.hx.x + 0.5, 0, PLACES.hx.z + 0.85, 0);
  t.box(actuator, t.paint('#55616a', 0.5), 0.05, 1.1, 0.05, 0, 0.55, -0.04);
  t.box(actuator, t.paint('#c9ccc6', 0.55), 0.34, 0.26, 0.06, 0, 1.2, 0);
  const actLamp = signal(true);
  const override = parts.add(
    selector(kit, {
      positions: 2,
      legend: 'AUTO · MANUAL OPEN',
      name: `${shortTag('hx.primary.mv')} manual override`,
      bound: {
        get value() {
          return plant().override ? 1 : 0;
        },
        set: (p: number) => act({ type: 'mv-override', on: p === 1 }),
      },
    }),
  );
  override.object.position.set(-0.08, 1.2, 0.032);
  actuator.add(override.object);
  const power = parts.add(
    pilotLight(kit, {
      colour: 'green',
      legend: 'POWER',
      drive: actLamp,
      name: `${shortTag('hx.primary.mv')} actuator POWER lamp`,
    }),
  );
  power.object.position.set(0.09, 1.25, 0.032);
  actuator.add(power.object);
  const replace = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'REPLACE',
      name: 'REPLACE ACTUATOR (the museum’s spare)',
      action: () => act({ type: 'replace-actuator' }),
    }),
  );
  replace.object.position.set(0.09, 1.14, 0.032);
  actuator.add(replace.object);
  object.add(
    markComponent(actuator, {
      name: `${TAGS['hx.primary.mv']} actuator: override and replacement`,
      model: { fitting: 'hx.primary.mv' },
      status: () =>
        `its POWER lamp ${plant().actuatorFailed ? 'out' : 'lit'}, its pointer at ${Math.round(readings.mv * 100)} %`,
    }),
  );
  updates.push(() => {
    const on = !plant().actuatorFailed;
    if (actLamp.value !== on) actLamp.value = on;
  });
  footprint(PLACES.hx.x + 0.5, PLACES.hx.z + 0.85, 0.2);

  // The heating's thermometers, on a board by the exchanger: TI1 to TI4.
  const tiBoard = new Group();
  turnTo(tiBoard, PLACES.hx.x - 0.9, 0, PLACES.hx.z + 1.6, 0);
  t.box(tiBoard, t.paint('#55616a', 0.5), 0.05, 1.2, 0.05, 0, 0.6, -0.04);
  t.box(tiBoard, t.paint('#d9d7cf', 0.6), 0.62, 0.4, 0.03, 0, 1.38, 0);
  const tis = (['ti1', 'ti2', 'ti3', 'ti4'] as const).map((k, i) => {
    const id = ['hxIn.ti', 'hxOut.ti', 'boilerFlow.ti', 'boilerReturn.ti'][i];
    const g = createDialGauge(kit, {
      dia: 0.11,
      min: 0,
      max: i < 2 ? 40 : 100,
      unit: '°C',
      legend: shortTag(id),
      entry: 'back',
    });
    g.group.position.set(-0.22 + i * 0.146, 1.43, 0.03);
    tiBoard.add(g.group);
    const plate = tagPlate(id, 0.135);
    plate.position.set(-0.22 + i * 0.146, 1.31, 0.032);
    tiBoard.add(plate);
    return { g, k };
  });
  object.add(
    markComponent(tiBoard, {
      name: 'Heating thermometers TI1 to TI4',
      status: () =>
        `${shortTag('hxIn.ti')} ${readings.ti.ti1.toFixed(1)}, ${shortTag('hxOut.ti')} ${readings.ti.ti2.toFixed(1)}, ${shortTag('boilerFlow.ti')} ${readings.ti.ti3.toFixed(0)}, ${shortTag('boilerReturn.ti')} ${readings.ti.ti4.toFixed(0)} °C`,
    }),
  );
  updates.push((delta) => {
    for (const { g, k } of tis) {
      g.set(readings.ti[k]);
      g.update(delta);
    }
  });
  footprint(PLACES.hx.x - 0.9, PLACES.hx.z + 1.6, 0.2);

  // ---- The water: filter, drain, pump and its starter, strainer, tank, pool ----
  const filter = createSandFilter(kit, {
    dia: FILTER_SHAPE.dia,
    shell: FILTER_SHAPE.shell,
    dn: 150,
    label: `SAND FILTER ${shortTag('filter')}`,
    bedDepth: 1.0,
  } as never);
  machine(filter, 'filter');
  const pdi = createDialGauge(kit, {
    dia: 0.1,
    min: 0,
    max: 1.6,
    legend: `${shortTag('filter.pdi')} ΔP`,
    entry: 'back',
  });
  // On its own post before the filter's nest.
  const pdiPost = new Group();
  pdiPost.position.set(PLACES.filter.x - 1.55, 0, PLACES.filter.z + 0.6);
  t.box(pdiPost, t.paint('#55616a', 0.5), 0.04, 1.45, 0.04, 0, 0.725, -0.04);
  pdi.group.position.set(0, 1.45, 0);
  pdiPost.add(pdi.group);
  const pdiTag = tagPlate('filter.pdi');
  pdiTag.position.set(0, 1.32, 0.01);
  pdiPost.add(pdiTag);
  object.add(
    describe(
      pdiPost,
      'filter.pdi',
      'filter differential pressure gauge',
      { node: 'filter' },
      () => `reads ${readings.pdi1.toFixed(2)} bar`,
    ),
  );
  const f = () => session.state.plant;
  updates.push((delta) => {
    (
      filter as unknown as {
        show: (g: { inlet: number; outlet: number }, d: number) => void;
      }
    ).show(
      { inlet: readings.pi2 - 0.1, outlet: readings.pi2 - 0.1 - readings.pdi1 },
      delta,
    );
    pdi.set(readings.pdi1);
    pdi.update(delta);
  });

  const drain = new Group();
  t.cyl(drain, t.paint('#3a3f42', 0.6), 0.22, 1.1, 0, 0.55, 0, 'y', 16);
  t.cyl(drain, t.paint('#c9ccc6', 0.5), 0.12, 0.08, 0, 1.12, 0, 'y', 16);
  machine(
    drain,
    'drain',
    `${nodeName('drain')} (tundish, ${shortTag('backwashOut.sg')} on its inlet)`,
    () =>
      plant().water.wasteDirt > 0.2
        ? 'the sight glass dirty'
        : 'the sight glass clear',
  );

  const pump = createEndSuctionPump(kit);
  machine(
    pump,
    'poolPump',
    `${nodeName('poolPump')} (Grundflow NKC 150-315)`,
    () => (readings.p1Running ? 'running' : 'stopped'),
  );
  updates.push((delta) => {
    pump.gauges.suction.set(readings.pi1);
    pump.gauges.discharge.set(readings.pi2);
    pump.gauges.suction.update(delta);
    pump.gauges.discharge.update(delta);
  });

  // P1's starter: HAND · OFF · AUTO, its ammeter, RUN and TRIPPED, the overload's RESET.
  const starter = new Group();
  turnTo(starter, PLACES.poolPump.x + 0.6, 0, PLANT_EDGE - 0.35, 0);
  t.box(starter, t.paint('#55616a', 0.5), 0.06, 1.1, 0.06, 0, 0.55, -0.07);
  t.box(starter, t.paint('#d8d6cc', 0.55), 0.42, 0.5, 0.14, 0, 1.35, 0);
  const sFace = new Group();
  sFace.position.set(0, 1.35, 0.071);
  starter.add(sFace);
  const runLamp = signal(false);
  const tripLamp = signal(false);
  const put = (p: Part, x: number, y: number) => {
    p.object.position.set(x, y, 0.002);
    sFace.add(p.object);
    parts.add(p);
  };
  put(
    selector(kit, {
      positions: 3,
      legend: 'HAND · OFF · AUTO',
      name: `${TAGS['starter']} HAND · OFF · AUTO`,
      bound: {
        get value() {
          return STARTER_MODES.indexOf(plant().starter.mode);
        },
        set: (p: number) =>
          act({
            type: 'starter-mode',
            mode: STARTER_MODES[Math.max(0, Math.min(2, p))],
          }),
      },
    }),
    -0.1,
    -0.12,
  );
  put(
    pilotLight(kit, {
      colour: 'green',
      legend: 'RUN',
      drive: runLamp,
      name: `${TAGS['starter']} RUN lamp`,
    }),
    0.06,
    -0.06,
  );
  put(
    pilotLight(kit, {
      colour: 'amber',
      legend: 'TRIPPED',
      drive: tripLamp,
      name: `${TAGS['starter']} TRIPPED lamp`,
    }),
    0.15,
    -0.06,
  );
  put(
    pushButton(kit, {
      colour: 'blue',
      legend: 'O/L RESET',
      name: `${TAGS['starter']} overload RESET`,
      action: () => act({ type: 'starter-reset' }),
    }),
    0.1,
    -0.17,
  );
  const amps = createPanelMeter(kit, 'A', { scaleMax: 80 });
  amps.group.scale.setScalar(1.6);
  amps.group.position.set(0, 0.12, 0.002);
  sFace.add(amps.group);
  panelMakerMark(kit, sFace, {
    width: 0.42,
    height: 0.5,
    z: 0.001,
    corner: 'top-right',
  });
  object.add(
    markComponent(starter, {
      name: `${TAGS['starter']} P1 starter (HAND · OFF · AUTO, overload)`,
      status: () =>
        `at ${plant().starter.mode.toUpperCase()}, ${runLamp.value ? 'RUN lit' : 'RUN out'}${tripLamp.value ? ', TRIPPED lit' : ''}, ammeter ${readings.p1Amps.toFixed(0)} A`,
    }),
  );
  updates.push((delta) => {
    if (runLamp.value !== readings.p1Running)
      runLamp.value = readings.p1Running;
    const tr = plant().starter.tripped || plant().water.tripped;
    if (tripLamp.value !== tr) tripLamp.value = tr;
    amps.set(readings.p1Amps / 80);
    amps.update(delta);
  });
  footprint(PLACES.poolPump.x + 0.6, PLANT_EDGE - 0.35, 0.25);

  // ST1: the basket strainer, its clear lid lifted off when isolated, its basket cleaned.
  const strainer = new Group();
  const pot = t.paint('#4d5a63', 0.5);
  t.cyl(strainer, pot, 0.17, 0.75, 0, 0.375, 0, 'y', 20);
  t.cyl(strainer, pot, 0.09, 0.6, 0, 0.68, 0, 'x', 16);
  const lid = new Mesh(
    new CylinderGeometry(0.19, 0.19, 0.05, 24),
    new MeshStandardMaterial({
      color: '#cfe8f0',
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
    }),
  );
  kit.materials.push(lid.material as MeshStandardMaterial);
  lid.position.y = 0.78;
  lid.userData.live = true;
  strainer.add(lid);
  const debris = new Mesh(
    new CylinderGeometry(0.14, 0.14, 0.3, 16),
    new MeshStandardMaterial({ color: '#4a3b2a', roughness: 0.9 }),
  );
  kit.materials.push(debris.material as MeshStandardMaterial);
  debris.position.y = 0.6;
  debris.userData.live = true;
  strainer.add(debris);
  const stHolder = machine(
    strainer,
    'strainer',
    `${nodeName('strainer')} (basket strainer)`,
    () =>
      `${plant().lidOpen ? 'its lid off, ' : ''}debris filling ${Math.round(plant().strainer * 100)} % of its basket`,
  );
  parts.uses.set(lid, () => act({ type: 'lid', open: !plant().lidOpen }));
  parts.uses.set(debris, () => act({ type: 'clean-basket' }));
  void stHolder;
  updates.push(() => {
    const k = plant().strainer;
    debris.scale.set(1, Math.max(0.02, k), 1);
    debris.position.y = 0.45 + 0.15 * k;
    lid.position.set(
      plant().lidOpen ? 0.35 : 0,
      plant().lidOpen ? 0.03 : 0.78,
      0,
    );
  });

  const bt = createIdealVessel(kit, {
    ...TANK_SHAPE,
    water: TANK_SHAPE.h - 0.25,
    name: 'Balance tank',
    ports: Object.values(PORTS.balanceTank).map((p) => ({ ...p, od: OD[150] })),
  });
  machine(bt.group, 'balanceTank', `${nodeName('balanceTank')} (30 m³)`);
  updates.push(() => bt.show(['BALANCE TANK', '30m3   IDEAL']));

  const pool = createIdealVessel(kit, {
    ...POOL_SHAPE,
    water: POOL_WATER,
    name: 'Ideal pool',
    ports: Object.values(PORTS.pool).map((p) => ({ ...p, od: OD[150] })),
  });
  const poolHolder = machine(
    pool.group,
    'pool',
    'Ideal pool (25 × 12.5 m, 470 m³)',
    () => `its display shows ${readings.ti.ti5.toFixed(1)} °C`,
  );
  // TI5 is the pool's own display; its tag plate on the vessel's front.
  const ti5 = tagPlate('pool.ti', 0.3);
  ti5.position.set(0.6, 1.0, POOL_SHAPE.d / 2 + 0.006);
  poolHolder.add(ti5);
  updates.push(() =>
    pool.show([
      `WATER ${readings.ti.ti5.toFixed(1).padStart(5)}C 470m3`,
      `IN ${readings.flow.toFixed(0).padStart(4)}m3/h   IDEAL`,
    ]),
  );

  // The points in the lines: the tees and the injection points.
  for (const id of [
    'flowTee',
    'returnTee',
    'hxTeeIn',
    'hxTeeOut',
    'wasteTee',
    'feedTee',
    'sampleTee',
    'hypoInjection',
    'acidInjection',
  ] as const) {
    const g = new Group();
    const p = PLACES[id];
    const ports = Object.values(PORTS[id]);
    const y = (p.y ?? 0) + ports[0].at[1];
    g.position.set(p.x, y, p.z);
    t.box(
      g,
      t.paint(id.endsWith('Injection') ? '#ecebe4' : '#4d5a63', 0.5),
      0.2,
      0.2,
      0.2,
      0,
      0,
      0,
    );
    object.add(describe(still(g), id, nodeName(id), { node: id }));
  }

  // ---- The chemistry, along the south wall ----
  for (const [id, substance] of [
    ['hypoStore', 'hypochlorite'],
    ['acidStore', 'acid'],
  ] as const)
    machine(
      createExperimentalSourceView(
        kit,
        createExperimentalSource({ id: `m9.${id}`, substance }),
      ).group,
      id,
    );
  for (const [id, chemical, li] of [
    ['hypoTank', 'hypochlorite', 'hypoTank.li'],
    ['acidTank', 'acid', 'acidTank.li'],
  ] as const) {
    const tank = createSmallDayTank(kit, {
      tag: shortTag(id),
      chemical,
      ...DAY_TANK,
      litres: 60,
    });
    object.add(
      describe(
        atMachine(tank.group, id),
        id,
        nodeName(id),
        { node: id },
        () =>
          `its sight gauge ${TAGS[li]} at ${plant().chem.tanks[chemical].litres.toFixed(0)} litres`,
      ),
    );
    updates.push(() => tank.show(plant().chem.tanks[chemical].litres));
  }
  const channelOf: Record<'hypoPump' | 'acidPump', DoseChannel> = {
    hypoPump: 'hypochlorite',
    acidPump: 'acid',
  };
  for (const id of ['hypoPump', 'acidPump'] as const) {
    const c = channelOf[id];
    const dp = createDiaphragmPump(kit, shortTag(id), PUMP_KIND[c], {
      state: () => plant().chem.pumps[c].state.keys,
      press: (key) => {
        act({ type: 'chem', action: { type: 'pump-key', channel: c, key } });
        if (key === 'start')
          act({ type: 'chem', action: { type: 'pump-ack', channel: c } });
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
    dp.object.position.y = PLINTH;
    holder.add(dp.object);
    object.add(
      describe(
        holder,
        id,
        `${nodeName(id)} (Grundflow ${PUMPS[c].model})`,
        { node: id },
        () => dp.status(),
      ),
    );
    for (const k of dp.keys) parts.add(k);
    updates.push((delta) => {
      const s = plant().chem;
      dp.update(
        delta,
        {
          running: s.controller.release[c],
          rate: s.controller.yout[c] * PUMPS[c].maxLh,
        },
        true,
        s.pumps[c].fault,
      );
      dp.parts.update(delta);
    });
  }

  const panel = createSamplePanel(kit, {
    tag: shortTag('sampleCell'),
    state: () => ({
      ...plant().chem.cell,
      valveOpen: plant().chem.open['sample.iso'],
    }),
    change: (fn) => {
      const before = {
        ...plant().chem.cell,
        valveOpen: plant().chem.open['sample.iso'],
      };
      const after = fn(before);
      if (after.valveOpen !== before.valveOpen)
        act({
          type: 'chem',
          action: { type: 'valve', id: 'sample.iso', open: after.valveOpen },
        });
      if (after.regulator !== before.regulator) {
        // Worked through its travel, a blocked needle valve clears.
        if (plant().needleBlocked) act({ type: 'clear-needle' });
        else
          act({
            type: 'chem',
            action: { type: 'needle', by: after.regulator - before.regulator },
          });
      }
    },
    sampled: () => act({ type: 'chem', action: { type: 'test' } }),
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
      { node: 'sampleCell' },
      () =>
        `${Math.round(readings.sampleFlow)} l/h, ${shortTag('cell.fs')} ${readings.fs2 ? 'made' : 'open'}`,
    ),
  );
  for (const p of panel.parts) parts.add(p as Part);
  updates.push((delta) => panel.update(delta));

  const cx7 = createCx7Controller(kit, {
    tag: shortTag('controller'),
    pool: 'MUSEUM HALL 9',
    state: () => plant().chem.controller,
    change: (c) =>
      act({ type: 'chem', action: { type: 'controller', state: c } }),
  });
  turnTo(
    cx7.object,
    PLACES.sampleCell.x - 0.85,
    1.55,
    SOUTH - 0.01,
    FACE_NORTH,
  );
  object.add(cx7.object);
  parts.add(cx7.part);
  updates.push((delta) => cx7.update(delta));

  const sDrain = new Group();
  t.box(sDrain, t.paint('#3a3f42', 0.6), 0.3, 0.05, 0.3, 0, 0.025, 0);
  machine(sDrain, 'sampleDrain');

  const tk = createDpdTestKit(kit, {
    tag: shortTag('testKit'),
    test: () => act({ type: 'chem', action: { type: 'test' } }),
  });
  turnTo(tk.group, PLACES.sampleCell.x + 0.9, 0, CHEM_EDGE + 0.2, FACE_NORTH);
  object.add(
    markComponent(tk.group, {
      name: `${TAGS['testKit']} DPD test kit`,
      status: () => {
        const r = plant().chem.test;
        return r
          ? `its ticket reads free ${r.dpd1.toFixed(2)}, total ${r.dpd3.toFixed(2)}, pH ${r.phenolRed.toFixed(1)}`
          : 'not yet used';
      },
    }),
  );
  take(tk.parts);
  updates.push((delta) => {
    tk.show(plant().chem.test);
    tk.parts.update(delta);
  });
  footprint(PLACES.sampleCell.x + 0.9, CHEM_EDGE + 0.2, 0.3);

  // ---- The pipes ----
  for (const line of plumbed.lines) {
    const kind: PipeKindId =
      line.pipe === 'flue'
        ? 'twin-wall-flue'
        : line.pipe === 'gas-steel'
          ? 'steel-screwed'
          : line.pipe;
    const pipe = createPipe(
      kind,
      line.od,
      line.points,
      line.pipe === 'gas-steel'
        ? { colour: '#e8c21a' }
        : line.chemical === 'hypochlorite'
          ? { colour: '#e8d84a', laid: true }
          : line.chemical === 'acid'
            ? { colour: '#d8d2c0', laid: true }
            : line.pipe === 'pvc-pressure'
              ? { colour: '#4d5a63' }
              : line.pipe === 'steel-screwed'
                ? { colour: '#b0392b' }
                : {},
    );
    markComponent(pipe, {
      name: `Pipe: ${LINK_NAMES[line.edge]}`,
      model: { link: line.edge },
    });
    object.add(pipe);
  }

  // ---- The fittings on the lines ----
  for (const item of plumbed.items) placeItem(item);
  function placeItem(item: PlacedItem) {
    const line = plumbed.lines.find((l) => l.edge === item.edge)!;
    const od = line.od;
    const fit = fittingById(item.id)!;
    const tag = TAGS[item.id];
    const short = shortTag(item.id);
    const side: [number, number] = [0, 1];
    if (fit.id === 'sample.iso' || fit.id === 'sample.needle') return;
    if (fit.body === 'motorised') {
      const mv = createInlineFitting(
        kit,
        { kind: 'remote-valve', medium: 'water', operator: 'motor', od },
        { open: () => readings.mv > 0.5, set: () => {} },
      );
      placeFitting(mv.object, 'remote-valve', item.at, item.along, side);
      object.add(
        markComponent(mv.object, {
          name: `${tag} ${fittingName(fit)}`,
          model: { fitting: fit.id },
          status: () =>
            readings.mv >= 0.98
              ? 'indicator at OPEN'
              : readings.mv <= 0.02
                ? 'indicator at SHUT'
                : 'actuator moving',
        }),
      );
      updates.push(mv.update);
      return;
    }
    if (fit.kind === 'non-return-valve' || fit.body === 'bypass') {
      const nrv = createInlineFitting(kit, {
        kind: 'non-return-valve',
        medium: line.chemical ? 'chemical' : 'water',
        operator: 'self',
        od,
      } as never);
      placeFitting(nrv.object, 'non-return-valve', item.at, item.along, side);
      object.add(
        markComponent(nrv.object, {
          name: `${tag} ${fittingName(fit)}`,
          model: { fitting: fit.id },
        }),
      );
      return;
    }
    if (fit.kind === 'flowmeter') {
      if (fit.meter === 'FQ') {
        const meter = createRotaryGasMeter(kit, { flangeR: 0.06 });
        placeFitting(meter.group, 'flowmeter', item.at, item.along, side);
        object.add(
          markComponent(meter.group, {
            name: `${tag} ${fittingName(fit)} (Trager-Feinstein)`,
            model: { fitting: fit.id },
            status: () => `its counter at ${plant().heat.gasM3.toFixed(0)} m³`,
          }),
        );
        updates.push(() => meter.show(plant().heat.gasM3));
        return;
      }
      if (fit.meter === 'HM') {
        const meter = createHeatMeter(kit, { od, tag: short });
        placeFitting(meter.group, 'flowmeter', item.at, item.along, side);
        object.add(
          markComponent(meter.group, {
            name: `${tag} ${fittingName(fit)}`,
            model: { fitting: fit.id },
            status: () => `shows ${plant().heat.heatKWh.toFixed(1)} kWh`,
          }),
        );
        updates.push((delta) =>
          meter.show(plant().heat.heatKWh, Math.max(0, readings.heatKW), delta),
        );
        return;
      }
      const meter = createMagFlowmeter(kit, { od, tag: short });
      meter.group.traverse((o) => (o.userData.live = true));
      placeFitting(meter.group, 'flowmeter', item.at, item.along, side);
      object.add(
        markComponent(meter.group, {
          name: `${tag} ${fittingName(fit)} (Kessler-Moody)`,
          model: { fitting: fit.id },
          status: () => `shows ${readings.flow.toFixed(0)} m³/h`,
        }),
      );
      updates.push(() => meter.show(readings.flow, 'FLOW'));
      return;
    }
    if (fit.body === 'butterfly') {
      const isBypass = fit.id === 'hx.bypass';
      const id = fit.id as WaterValve;
      const opening = () =>
        isBypass ? plant().hxBypass : plant().water.opening[id];
      const valve = parts.add(
        createThrottleValve(kit, {
          dn: 150,
          tag: short,
          name: fittingName(fit),
          opening,
          step: (by: number) => {
            if (isBypass) act({ type: 'hx-bypass', open: by > 0 });
            else if (id === 'filter.outlet.iso' && plant().stuck)
              act({ type: 'free-valve' });
            else
              act({
                type: 'water',
                action: { type: 'notch', id, by: by > 0 ? 1 : -1 },
              });
          },
          notches: NOTCHES,
        } as never),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, side);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(fit)}`,
        model: { fitting: fit.id },
        status: () => {
          const o = opening();
          const seized =
            !isBypass && id === 'filter.outlet.iso' && plant().stuck
              ? ', the lever stiff'
              : '';
          return (
            (o >= 0.98
              ? 'lever at OPEN'
              : o <= 0.02
                ? 'lever at SHUT'
                : `lever at ${Math.round(o * 100)} %`) + seized
          );
        },
      });
      object.add(valve.object);
      return;
    }
    if (fit.home === 'heat') {
      const id = fit.id as 'gas.ecv';
      const valve = parts.add(
        createGasBallValve(kit, {
          pipeRadius: od / 2,
          name: `${short} ${fittingName(fit)}`,
          binding: {
            open: () => plant().heat.opening[id] > 0.5,
            set: (open: boolean) =>
              act({ type: 'heat', action: { type: 'valve', id, open } }),
          },
        } as never),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, side);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(fit)}`,
        model: { fitting: fit.id },
        status: () => {
          const o = plant().heat.opening[id];
          return o >= 0.99
            ? 'lever along the pipe: open'
            : o <= 0.01
              ? 'lever across the pipe: shut'
              : 'lever part-way: part-shut';
        },
      });
      object.add(valve.object);
      return;
    }
    if (fit.home === 'chem') {
      const id = fit.id as ChemValve;
      const valve = parts.add(
        createChemicalBallValve(kit, {
          dn: 15,
          name: `${short} ${fittingName(fit)}`,
          binding: {
            open: () => plant().chem.open[id],
            set: (open: boolean) =>
              act({ type: 'chem', action: { type: 'valve', id, open } }),
          },
        }),
      );
      placeFitting(valve.object, 'isolating-valve', item.at, item.along, side);
      markComponent(valve.object, {
        name: `${tag} ${fittingName(fit)}`,
        model: { fitting: fit.id },
        status: () =>
          plant().chem.open[id]
            ? 'handle along the pipe: open'
            : 'handle across the pipe: shut',
      });
      object.add(valve.object);
    }
  }

  // ---- The desk: mimic, annunciator, water panel, station clock ----
  const desk = new Group();
  turnTo(desk, DESK.x, 0, DESK.z, DESK.yaw);
  const steel = t.paint('#c9ccc6', 0.55);
  t.box(desk, steel, DESK.w, 0.85, 0.5, 0, 0.425, 0.15);
  t.box(desk, t.paint('#3b3f42', 0.5), DESK.w, 0.04, 0.55, 0, 0.87, 0.16);
  t.box(desk, steel, DESK.w, 1.9, 0.12, 0, 1.85, -0.2);
  object.add(still(desk));
  const board = createMimicBoard(kit, HALL9_MIMIC, {
    maker: 'penfold',
    press: (id: string) => {
      const c = mimicCommand(id);
      if (c) act(c);
    },
  } as never);
  board.group.position.set(-0.6, 1.95, -0.13);
  desk.add(board.group);
  take(board.parts);
  const ann = createAnnunciatorBoard(
    kit,
    {
      title: `${shortTag('desk.ua')} · THE WHOLE PLANT`,
      name: `${TAGS['desk.ua']} location annunciator`,
      alarms: WINDOWS,
      text: ALARM_TEXT,
      columns: 6,
    },
    {
      state: () => hall().annunciator,
      accept: () => doHall({ type: 'accept' }),
      reset: () => doHall({ type: 'reset-alarms' }),
    },
  );
  ann.object.position.set(1.65, 2.05, -0.13);
  desk.add(ann.object);
  if (ann.parts) take(ann.parts);
  // The water panel and the station clock on the desk's fascia.
  const fascia = new Group();
  fascia.position.set(0, 0.92, 0.36);
  fascia.rotation.x = -0.55;
  desk.add(fascia);
  const water = createCharacterLcd(kit, {
    columns: 20,
    rows: 4,
    cell: 0.009,
    backlight: true,
  });
  water.group.position.set(-1.2, 0, 0.01);
  fascia.add(water.group);
  const waterLabel = createMicroLabel(
    kit,
    `${shortTag('desk.qi')} THE WATER, FROM ITS INSTRUMENTS`,
    {
      height: 0.022,
      ink: '#16191b',
      plate: '#f4f3ee',
    },
  );
  waterLabel.position.set(-1.2, 0.12, 0.01);
  fascia.add(waterLabel);
  const clock = createSevenSegment(kit, 4, { digitHeight: 0.06 });
  clock.group.position.set(0.55, 0.02, 0.01);
  clock.group.traverse((o) => (o.userData.live = true));
  fascia.add(clock.group);
  const day = createSevenSegment(kit, 2, { digitHeight: 0.04 });
  day.group.position.set(0.95, 0.02, 0.01);
  day.group.traverse((o) => (o.userData.live = true));
  fascia.add(day.group);
  const clockLabel = createMicroLabel(kit, 'PLANT TIME          DAY', {
    height: 0.022,
    ink: '#16191b',
    plate: '#f4f3ee',
  });
  clockLabel.position.set(0.7, 0.1, 0.01);
  fascia.add(clockLabel);
  const speedLamps = SPEEDS.map(() => signal(false));
  SPEEDS.forEach((sp, k) => {
    const b = parts.add(
      pushButton(kit, {
        colour: 'white',
        head: 'illuminated',
        lamp: speedLamps[k],
        legend: `×${sp}`,
        name: `TIME ×${sp}`,
        action: () => {
          session = { ...session, clock: setSpeed(session.clock, sp) };
        },
      }),
    );
    b.object.position.set(1.3 + k * 0.1, 0, 0.01);
    fascia.add(b.object);
  });
  // Marked where it is, on the desk's fascia (re-parented, it would float in the hall).
  fascia.name = 'Desk fascia: water panel and station clock';
  markComponent(fascia, {
    name: `${TAGS['desk.qi']} water panel and ${TAGS['desk.clock']} station clock`,
    status: () => {
      const c = stationClock(hall());
      return `free chlorine ${readings.free.toFixed(2)} mg/l, pH ${readings.ph.toFixed(2)}, pool ${readings.ti.ti5.toFixed(1)} °C, flow ${readings.flow.toFixed(0)} m³/h; PLANT TIME ${c.time} DAY ${c.day}, ×${session.clock.speed}`;
    },
  });
  let waterShown = '';
  let clockShown = '';
  updates.push(() => {
    const lines = [
      `FREE Cl ${readings.free.toFixed(2).padStart(5)} mg/l`,
      `pH      ${readings.ph.toFixed(2).padStart(5)}`,
      `POOL    ${readings.ti.ti5.toFixed(1).padStart(5)} C`,
      `FLOW    ${readings.flow.toFixed(0).padStart(5)} m3/h`,
    ].map((l) => l.padEnd(20).slice(0, 20));
    const key = lines.join('|');
    if (key !== waterShown) water.show((waterShown = key).split('|'));
    const c = stationClock(hall());
    const ck = `${c.time}|${c.day}`;
    if (ck !== clockShown) {
      clockShown = ck;
      clock.show(c.time.replace(':', ''));
      day.show(String(c.day % 100).padStart(2));
    }
    SPEEDS.forEach((sp, k) => {
      const on = session.clock.speed === sp;
      if (speedLamps[k].value !== on) speedLamps[k].value = on;
    });
  });
  solids.push({
    minX: DESK.x - DESK.w / 2,
    maxX: DESK.x + DESK.w / 2,
    minZ: DESK.z - 0.45,
    maxZ: DESK.z + 0.45,
  });

  // ---- The fault pedestal and its scoreboard ----
  const ped = new Group();
  turnTo(ped, PEDESTAL.x, 0, PEDESTAL.z, PEDESTAL.yaw);
  const teal = t.paint('#0f6f7c', 0.5);
  t.box(ped, teal, 0.34, 0.95, 0.34, 0, 0.475, 0);
  t.box(ped, t.paint('#22272a', 0.5), 0.5, 0.04, 0.5, 0, 0.02, 0);
  t.box(ped, t.paint('#55616a', 0.5), 0.06, 2.4, 0.06, 0, 1.2, -0.2);
  t.box(ped, t.paint('#1b2328', 0.5), 0.9, 0.62, 0.06, 0, 2.3, -0.2);
  const top = new Group();
  top.position.set(0, 1.0, 0.04);
  top.rotation.x = -0.5;
  ped.add(top);
  t.box(top, teal, 0.42, 0.32, 0.05, 0, 0, -0.025);
  const mush = parts.add(
    mushroomStop(kit, {
      legend: 'CAUSE A RANDOM FAULT',
      name: 'CAUSE A RANDOM FAULT',
      bound: {
        get value() {
          return false;
        },
        set: (pushed: boolean) => {
          if (pushed) doHall({ type: 'cause', r: Math.random() });
        },
      },
    }),
  );
  mush.object.scale.setScalar(1.6);
  mush.object.position.set(-0.08, 0.02, 0.002);
  top.add(mush.object);
  const key = parts.add(
    keySwitch(kit, {
      legend: 'ATTENDANT',
      name: 'Attendant’s key switch: choose the fault',
      bound: {
        get value() {
          return hall().key;
        },
        set: (on: boolean) => doHall({ type: 'key', on }),
      },
    }),
  );
  key.object.position.set(0.12, 0.08, 0.002);
  top.add(key.object);
  const sel = createSevenSegment(kit, 2, { digitHeight: 0.025 });
  sel.group.position.set(0.12, -0.04, 0.002);
  sel.group.traverse((o) => (o.userData.live = true));
  top.add(sel.group);
  for (const [legend, by, x] of [
    ['◀', -1, 0.07],
    ['▶', 1, 0.17],
  ] as const) {
    const b = parts.add(
      pushButton(kit, {
        colour: 'black',
        symbol: legend,
        name: `Fault selector ${by > 0 ? 'up' : 'down'}`,
        action: () =>
          doHall({
            type: 'select',
            fault: (((((hall().selected - 1 + by) % 10) + 10) % 10) +
              1) as FaultNo,
          }),
      }),
    );
    b.object.position.set(x, -0.12, 0.002);
    top.add(b.object);
  }
  const rows = ['FAULT', 'TO ACCEPT', 'TO FIX', 'BEST'] as const;
  const digits = rows.map((label, k) => {
    const d = createSevenSegment(kit, k === 0 ? 2 : 4, { digitHeight: 0.07 });
    d.group.position.set(0.22, 2.5 - k * 0.13, -0.165);
    d.group.traverse((o) => (o.userData.live = true));
    ped.add(d.group);
    const l = createMicroLabel(kit, label, { height: 0.035, ink: '#f4f3ee' });
    l.position.set(-0.2, 2.5 - k * 0.13, -0.165);
    ped.add(l);
    return d;
  });
  object.add(
    markComponent(ped, {
      name: `${TAGS['faults']} fault pedestal and ${TAGS['scoreboard']} scoreboard`,
      status: () => {
        const s = scoreboard(hall());
        return `FAULT ${s.fault.trim()}, TO ACCEPT ${s.toAccept}, TO FIX ${s.toFix}, BEST ${s.best}${hall().key ? `; key turned, fault ${hall().selected} chosen` : ''}`;
      },
    }),
  );
  let scoreShown = '';
  updates.push(() => {
    const s = scoreboard(hall());
    const text = [
      s.fault,
      s.toAccept.replace(':', ''),
      s.toFix.replace(':', ''),
      s.best.replace(':', ''),
    ];
    const k = text.join('|') + hall().selected + hall().key;
    if (k === scoreShown) return;
    scoreShown = k;
    text.forEach((v, i) => digits[i].show(v));
    sel.show(hall().key ? String(hall().selected).padStart(2) : '--');
  });
  footprint(PEDESTAL.x, PEDESTAL.z, 0.3);

  // ---- The entrance panel and RESET, by the way in from Hall 8 ----
  const entrance = createWallPanel(
    kit,
    'Entrance panel',
    1.9,
    1.5,
    paintEntrance(hall9Entrance(), 'Hall 9 · The whole plant'),
  );
  turnTo(entrance, E - 0.04, 1.65, 3.4, FACE_WEST);
  object.add(still(entrance));
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  turnTo(resetSign, E - 0.04, 1.75, 5.4, FACE_WEST);
  object.add(still(resetSign));
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(localNow()),
    lit: () => sinceReset < 2.5,
  });
  turnTo(resetButton.group, E - 0.5, 0, 5.4, FACE_WEST);
  object.add(resetButton.group);
  take(resetButton.parts);
  updates.push(resetButton.update);
  footprint(E - 0.5, 5.4, 0.25);

  // ---- The placards ----
  const LECTERNS: Record<number, [number, number, number]> = {
    1: [DESK.x + 1.6, DESK.z - 1.4, FACE_NORTH],
    2: [PLACES.poolPump.x + 1.6, PLANT_EDGE + 0.4, 0],
    3: [PLACES.boiler.x + 1.5, PLANT_EDGE + 0.4, 0],
    4: [PLACES.sampleCell.x + 2.0, CHEM_EDGE - 0.4, FACE_NORTH],
    5: [PEDESTAL.x + 1.1, PEDESTAL.z - 0.1, FACE_NORTH],
  };
  for (const p of hall9Placards()) {
    const [x, z, yaw] = LECTERNS[p.station!];
    const lectern = createLectern(kit, p);
    turnTo(lectern, x, 0, z, yaw);
    object.add(still(lectern));
    footprint(x, z, 0.2);
  }
  void inHall;
  void BOILER;
  void f;
  void FAULTS;

  return {
    object,
    parts,
    status: () =>
      hall().fault !== null ? 'a fault is in the plant' : 'running normally',
    solids: () => solids,
    reset,
    update(delta) {
      session = runSession(HALL9_MODEL, session, delta);
      sinceReset += delta;
      readings = hall9Readings(session.state.plant);
      mimicDue -= delta;
      if (mimicDue <= 0) {
        mimicState = hall9MimicState(session.state.plant);
        mimicDue = 0.25;
      }
      board.parts.update(delta);
      board.show(mimicState);
      ann.update?.(delta);
      ann.parts?.update(delta);
      for (const u of updates) u(delta);
    },
  };
}
