import { tankDrain } from '../../../components/plant/parts/tank-drain';
import { markComponent } from '../../../components/core/views/component-identity';
import { createFlexHose } from '../../../components/core/views/pipe-route';
import { createPipeBellmouth } from '../../../components/plant/views/pipe-bellmouth';
import { ladderGate } from '../../../components/architectural/parts/ladder-gate';
import { createPartSet } from '../../../components/core/parts/parts';
import { BoxGeometry, Group, Mesh, PlaneGeometry, PointLight } from 'three';
import { METRE } from '../../../components/core/logic/units';
import {
  createBreezeBlockTextures,
  mapBlockwork,
} from '../../../../scene/breeze-block-texture';
import {
  addWallBatten,
  createWallBattenMaterials,
} from '../../../../scene/wall-batten';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPs1Material } from '../../../components/core/parts/ps1-material';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { createEngravedPlate } from '../../../components/core/views/plant-signs';
import { tools } from '../../../components/core/views/fitting-tools';
import {
  inMetres,
  plainBoardMarkedConcrete,
} from '../../../components/architectural/views/board-marked-concrete';
import {
  createGratingDeck,
  createGuardRail,
} from '../../../components/plant/views/railings';
import { createTankLadder } from '../../../components/plant/views/tank-ladder';
import { createFloatSwitch } from '../../../components/plant/views/float-switch';
import { createUltrasonicLevel } from '../../../components/plant/views/ultrasonic-level';
import { createStaffGauge } from '../../../components/plant/views/staff-gauge';
import { createSolenoidValve } from '../../../components/plant/views/solenoid-valve';
import { createFallingWater } from '../../../components/plant/views/falling-water';
import { createDisturbedWater } from '../../../components/plant/views/disturbed-water';
import { createBalanceTankPanel } from '../../../components/plant/views/balance-tank-panel';
import { createLifebuoy } from '../../../components/general-safety/views/lifebuoy';
import { createSafetySign } from '../../../components/general-safety/views/safety-signs';
import {
  BALANCE_TANK,
  floats,
  newBalanceTank,
  pressBalanceTank,
  stepBalanceTank,
  volumeOf,
} from '../../../../game/plant/balance-tank';
import type {
  BalanceTankState,
  MakeupMode,
} from '../../../../game/plant/balance-tank';
import {
  BAY_FLOOR,
  DOORWAY,
  PARTITION,
  GATE,
  HALL,
  HALL_PIPES,
  HALL_INLET_LABELS,
  LADDER,
  OPENING,
  OPENING_OUTLINE,
  SPOTS,
  START as HALL_START,
  TANK,
  hallPipes,
  hallLevelCable,
  hallDrainRun,
  heightOf,
  layoutBalanceHall,
} from '../../logic/balance-tank-hall';
import type { RoomFinish } from '../plant-room';
import type { Footprint } from '../../../controls/logic/walk-collision';
import { doorwayStops, overlaps } from '../../logic/doorway';
import { equipmentDoors } from '../../../components/architectural/parts/equipment-doors';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  "The Olympic pool's balance tank: 216 m³ of cast concrete under a steel gantry. Drive the bather load, the pumps and the make-up, and watch the level.";

export const layoutRoom = () => layoutBalanceHall();
/** Breeze-block walls above the gantry, lit by its own wall battens; no floor of its own, its gantry and bay drawn over the tank. */
export const FINISH: RoomFinish = {
  blockwork: true,
  floor: null,
  ownLights: true,
};
export const START = HALL_START;

let state: BalanceTankState = newBalanceTank();

export function prepareRoom() {
  state = newBalanceTank();
}

const MODES: MakeupMode[] = ['off', 'auto', 'hand'];

/**
 * The hall, drawn and working. `bay`: with Dev28's bay of the adjacent
 * plant room behind its partition (its floor, its panel, its make-up
 * valve); without it, the building's hall (`tank-hall-room.ts`),
 * entered from the Olympic plant room itself through the partition's
 * doors, which it hands back for that doorway's joint.
 */
export function buildHall(
  kit: PanelKit,
  {
    bay = true,
    source,
    setDrain,
  }: {
    bay?: boolean;
    setDrain?: (open: boolean) => void;
    /**
     * Where its water comes from: the world's Olympic tank, read each
     * frame (`tank-hall-room.ts`); without it, the exhibit's own tank,
     * stepped here.
     */
    source?: () => BalanceTankState;
  } = {},
): LiveExhibit & { doors: ReturnType<typeof equipmentDoors> } {
  if (source) state = source();
  const object = new Group();
  object.name = 'Balance tank hall';
  const t = tools(kit);
  const updates: ((delta: number) => void)[] = [];

  // The tank: cast concrete, its walls up to the gantry (the blockwork above them), and its floor.
  const concrete = plainBoardMarkedConcrete('#d8d6cf');
  kit.materials.push(concrete);
  const face = (
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ) => {
    const mesh = new Mesh(inMetres(new PlaneGeometry(w, h), w, h), concrete);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    object.add(mesh);
  };
  const deep = -TANK.floor;
  const L = TANK.maxX - TANK.minX;
  const W = TANK.maxZ - TANK.minZ;
  const mid = (TANK.minX + TANK.maxX) / 2;
  const e = 0.001;
  face(L, deep, mid, TANK.floor / 2, TANK.minZ + e, 0);
  face(L, deep, mid, TANK.floor / 2, TANK.maxZ - e, Math.PI);
  face(W, deep, TANK.maxX - e, TANK.floor / 2, 0, -Math.PI / 2);
  face(W, deep, TANK.minX + e, TANK.floor / 2, 0, Math.PI / 2);
  const floor = new Mesh(inMetres(new PlaneGeometry(L, W), L, W), concrete);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(mid, TANK.floor, 0);
  object.add(floor);

  // The water, stirred white where the filler and the returns pour into it, calm further off.
  const surface = createDisturbedWater(kit, { w: L, d: W });
  const water = surface.mesh;
  water.position.x = mid;
  object.add(water);
  let time = 0;
  const waterY = () => heightOf(state.level);

  // The gantry: grating on cantilevered steel, round three sides.
  const steel = t.paint('#9da3a3', 0.45, 0.6);
  const deck = (minX: number, maxX: number, minZ: number, maxZ: number) => {
    const g = createGratingDeck(kit, maxX - minX, maxZ - minZ);
    g.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    object.add(g);
  };
  deck(TANK.minX, OPENING.minX, TANK.minZ, TANK.maxZ);
  deck(OPENING.minX, TANK.maxX, TANK.minZ, OPENING.minZ);
  deck(OPENING.minX, TANK.maxX, OPENING.maxZ, TANK.maxZ);
  // Edge beams along the opening, and brackets back to the walls.
  t.box(
    object,
    steel,
    TANK.maxX - OPENING.minX,
    0.2,
    0.08,
    (OPENING.minX + TANK.maxX) / 2,
    -0.1,
    OPENING.minZ,
  );
  t.box(
    object,
    steel,
    TANK.maxX - OPENING.minX,
    0.2,
    0.08,
    (OPENING.minX + TANK.maxX) / 2,
    -0.1,
    OPENING.maxZ,
  );
  t.box(
    object,
    steel,
    0.08,
    0.2,
    OPENING.maxZ - OPENING.minZ + 0.08,
    OPENING.minX,
    -0.1,
    0,
  );
  for (let x = OPENING.minX + 0.75; x < TANK.maxX; x += 1.5) {
    t.box(
      object,
      steel,
      0.06,
      0.15,
      OPENING.minZ - TANK.minZ,
      x,
      -0.08,
      (TANK.minZ + OPENING.minZ) / 2,
    );
    t.box(
      object,
      steel,
      0.06,
      0.15,
      TANK.maxZ - OPENING.maxZ,
      x,
      -0.08,
      (TANK.maxZ + OPENING.maxZ) / 2,
    );
  }
  for (let z = TANK.minZ + 0.75; z < TANK.maxZ; z += 1.5)
    t.box(
      object,
      steel,
      OPENING.minX - TANK.minX,
      0.15,
      0.06,
      (TANK.minX + OPENING.minX) / 2,
      -0.08,
      z,
    );

  // Its guard rails, and the self-closing gate to the ladder.
  const rail = (from: number, to: number, at: number, alongZ: boolean) => {
    const r = createGuardRail(kit, { length: to - from });
    if (alongZ) {
      r.rotation.y = Math.PI / 2;
      r.position.set(at, 0, (from + to) / 2);
    } else r.position.set((from + to) / 2, 0, at);
    object.add(r);
    return r;
  };
  rail(OPENING.minX, TANK.maxX, OPENING.minZ, false);
  rail(OPENING.minX, GATE.minX, OPENING.maxZ, false);
  rail(OPENING.minZ, OPENING.maxZ, OPENING.minX, true);
  const gate = ladderGate(kit, GATE.maxX - GATE.minX - 0.05);
  gate.object.position.set(GATE.minX, 0, OPENING.maxZ);
  object.add(gate.object);
  const deepSign = createSafetySign(kit, ['general'], ['Danger', 'Deep water']);
  deepSign.rotation.y = -Math.PI / 2;
  deepSign.position.set(OPENING.minX - 0.03, 0.85, 0.9);
  object.add(deepSign);

  // The ladder down the east wall, and the staff gauge beside it.
  const ladder = createTankLadder(kit, { depth: -TANK.floor });
  ladder.rotation.y = -Math.PI / 2;
  ladder.position.set(TANK.maxX, 0, LADDER.z);
  object.add(ladder);
  const gauge = createStaffGauge(kit, -TANK.floor - 0.1);
  gauge.rotation.y = -Math.PI / 2;
  gauge.position.set(TANK.maxX - 0.003, TANK.floor, SPOTS.gauge.z);
  object.add(gauge);

  // The pipes: the pool's returns, the make-up, the weir to drain, the pumps' suctions.
  const runs = hallPipes();
  for (const [i, r] of runs.returns.entries()) {
    const p = createPipe('pvc-drain', HALL_PIPES.returns.od, r);
    p.name = `Overflow return ${i + 1}`;
    object.add(p);
  }
  // Without the bay, the make-up comes through the partition from the plant room beyond.
  object.add(
    createPipe(
      'copper',
      HALL_PIPES.makeup.od,
      bay
        ? runs.makeup
        : [
            [TANK.minX - PARTITION / 2, runs.makeup[3][1], runs.makeup[3][2]],
            ...runs.makeup.slice(4),
          ],
    ),
  );
  // Each discharge is identified on its vertical drop, where it can be read
  // from either side of the gantry. The plates sit on a collar, not in mid-air.
  for (const inlet of HALL_INLET_LABELS) {
    const marker = new Group();
    marker.name = `${inlet.id} pipe identification`;
    marker.position.set(...inlet.at);
    const radius = inlet.od / 2;
    const width = inlet.id === 'mains-make-up' ? 0.46 : 0.56;
    t.cyl(marker, steel, radius + 0.012, 0.032, 0, 0, 0, 'y', 20);
    for (const side of [-1, 1]) {
      t.box(
        marker,
        steel,
        width + 0.016,
        0.132,
        0.012,
        0,
        0,
        side * (radius + 0.018),
      );
      const plate = createEngravedPlate(kit, inlet.lines, {
        colour: 'white',
        width,
        height: 0.12,
      });
      plate.position.z = side * (radius + 0.028);
      if (side < 0) plate.rotation.y = Math.PI;
      marker.add(plate);
    }
    object.add(marker);
  }
  const weirRun = runs.weir.map((p) => [...p] as [number, number, number]);
  // Bury the pipe's end face below the flared inlet, clear of its annular rim.
  weirRun[0][1] -= 0.08;
  object.add(
    markComponent(createPipe('pvc-drain', HALL_PIPES.weir.od, weirRun), {
      name: 'Balance tank overflow to waste',
    }),
  );
  const pvc = t.paint('#4a4e52', 0.5);
  const weirMouth = createPipeBellmouth(
    pvc,
    HALL_PIPES.weir.od,
    HALL_PIPES.weir.od * 0.9,
    0.08,
  );
  // Shade the bore below the rim; the route's closed end sits deeper behind it.
  const bore = t.paint('#101719', 1);
  t.cyl(weirMouth, bore, HALL_PIPES.weir.od / 2 - 0.008, 0.002, 0, -0.078, 0);
  weirMouth.position.set(...runs.weir[0]);
  markComponent(weirMouth, { name: 'Balance tank overflow inlet — to waste' });
  object.add(weirMouth);
  for (const [i, r] of runs.suctions.entries()) {
    // These downward-facing inlets continue west through the partition to the pumps.
    const intake = markComponent(new Group(), {
      name: `Olympic pump ${i === 0 ? 'A' : 'B'} suction intake — through the west wall to the plant room`,
      model: { link: `tank.suction${i === 0 ? 'A' : 'B'}` },
    });
    intake.add(createPipe('pvc-pressure', HALL_PIPES.suction.od, r));
    const mouth = createPipeBellmouth(
      pvc,
      HALL_PIPES.suction.od,
      HALL_PIPES.suction.od * 0.85,
      0.1,
    );
    t.cyl(mouth, bore, HALL_PIPES.suction.od / 2 - 0.008, 0.002, 0, -0.098, 0);
    mouth.rotation.x = Math.PI;
    mouth.position.set(r[0][0], r[0][1] - 0.1, r[0][2]);
    intake.add(mouth);
    object.add(intake);
  }
  // In the bay, on the main's rise (the building's is in the plant room).
  const valve = bay ? createSolenoidValve(kit, HALL_PIPES.makeup.od) : null;
  if (valve) {
    valve.group.rotation.y = Math.PI / 2;
    valve.group.position.set(
      SPOTS.makeup.bayX,
      SPOTS.makeup.valve,
      TANK.minZ + 0.25,
    );
    object.add(valve.group);
  }
  // The water falling from them.
  const falls = runs.returns.map((r) => {
    const f = createFallingWater(kit, HALL_PIPES.returns.od / 2 - 0.02);
    f.group.position.set(r[1][0], r[1][1], r[1][2]);
    object.add(f.group);
    return f;
  });
  const makeupFall = createFallingWater(kit, HALL_PIPES.makeup.od / 2 - 0.006);
  makeupFall.group.position.set(
    SPOTS.makeup.x,
    SPOTS.makeup.end,
    SPOTS.makeup.z,
  );
  object.add(makeupFall.group);

  // The level transmitter on its arm off the south rail.
  const tx = SPOTS.transmitter;
  t.box(
    object,
    steel,
    0.05,
    0.05,
    OPENING.maxZ - tx.z + 0.05,
    tx.x,
    tx.y + 0.32,
    (OPENING.maxZ + tx.z) / 2,
  );
  t.box(object, steel, 0.05, 0.82, 0.05, tx.x, 0.75, OPENING.maxZ + 0.04);
  const transmitter = createUltrasonicLevel(kit);
  transmitter.group.position.set(tx.x, tx.y, tx.z);
  markComponent(transmitter.group, {
    tag: 'PL2-T1-LT1',
    model: { node: 'tank-level-transmitter' },
    status: () => `${state.level.toFixed(2)} m`,
  });
  object.add(transmitter.group);
  const signalCable = createFlexHose(
    hallLevelCable(),
    t.paint('#252a2c', 0.65),
    0.012,
  );
  signalCable.name = 'Level transmitter signal cable — south to pool controls';
  markComponent(signalCable, {
    name: signalCable.name,
    model: { link: 'tank.level-signal' },
  });
  object.add(signalCable);
  // Two overhead saddles suspend the cable below the soffit on its way to the doorway.
  const cableHigh = HALL.height - 0.25;
  for (const x of [tx.x + 0.18, (tx.x + TANK.minX) / 2]) {
    t.box(
      object,
      steel,
      0.025,
      0.25,
      0.025,
      x,
      cableHigh + 0.125,
      TANK.maxZ - 0.15,
    );
    t.box(
      object,
      steel,
      0.06,
      0.015,
      0.045,
      x,
      cableHigh - 0.008,
      TANK.maxZ - 0.15,
    );
  }

  // The float switches on their bracket off the north rail.
  const fl = SPOTS.floats;
  const hang = 0.3;
  t.box(object, steel, 0.7, 0.05, 0.05, fl.x, hang, fl.z);
  t.box(
    object,
    steel,
    0.05,
    0.05,
    fl.z - OPENING.minZ + 0.05,
    fl.x,
    hang,
    (fl.z + OPENING.minZ) / 2,
  );
  const switches = (
    [
      ['LSL-LL', BALANCE_TANK.lowLow, -0.25],
      ['LSL', BALANCE_TANK.low, 0],
      ['LSH', BALANCE_TANK.high, 0.25],
    ] as const
  ).map(([tag, level, dx]) => {
    const f = createFloatSwitch(kit, { drop: hang - heightOf(level), tag });
    f.group.position.set(fl.x + dx, hang, fl.z);
    object.add(f.group);
    return f;
  });

  // In the bay: the panel, on its north wall (the building's is in the plant room).
  const panel = !bay
    ? null
    : createBalanceTankPanel(kit, {
        level: () => state.level,
        volume: () => volumeOf(state.level),
        inflow: () => state.inflow + state.makeup,
        outflow: () => state.outflow + state.spill,
        bathers: () => state.bathers,
        lamps: () => {
          const f = floats(state);
          return {
            high: f.high,
            overflowing: state.spill > 0.5,
            makeup: state.makeupOpen,
            low: f.low,
            lowLow: f.lowLow || state.pumps === 'tripped',
            running: state.pumps === 'run',
          };
        },
        makeup: () => MODES.indexOf(state.makeupMode) as 0 | 1 | 2,
        setMakeup: (mode) => {
          state = pressBalanceTank(state, {
            type: 'makeup',
            mode: MODES[mode],
          });
        },
        session: () => state.session,
        setSession: (to) => {
          state = pressBalanceTank(state, { type: 'session', to });
        },
        start: () => {
          state = pressBalanceTank(state, { type: 'start' });
        },
        stop: () => {
          state = pressBalanceTank(state, { type: 'stop' });
        },
      });
  if (panel) {
    panel.group.position.set(SPOTS.panel.x, SPOTS.panel.y, TANK.minZ);
    object.add(panel.group);
  }
  const parts = panel?.parts ?? createPartSet();
  parts.add(gate);
  const drain = tankDrain(kit, -TANK.floor, {
    get: () => !!state.drainOpen,
    set: (open) => {
      if (setDrain) setDrain(open);
      else state = { ...state, drainOpen: open };
    },
  });
  drain.object.position.set(SPOTS.drain.x, 0, SPOTS.drain.z);
  markComponent(drain.object, {
    tag: 'PL2-T1-DV1',
    model: { fitting: 'tank.drain.iso' },
    status: () => (state.drainOpen ? 'Open' : 'Closed'),
  });
  parts.add(drain);
  object.add(drain.object);
  const drainRun = hallDrainRun();
  object.add(
    markComponent(createPipe(drainRun.kind, drainRun.od, drainRun.points), {
      name: 'Balance tank floor drain to waste',
      model: { link: 'tank.drain' },
    }),
  );
  // The make-up solenoid valve's manual override: held open by hand
  // (HAND), or given back to its level control (AUTO).
  if (valve)
    parts.uses.set(valve.overrideButton, () => {
      state = pressBalanceTank(state, {
        type: 'makeup',
        mode: state.makeupMode === 'hand' ? 'auto' : 'hand',
      });
    });
  // In the hall: the lifebuoy on the partition, beside the doorway onto the gantry.
  const lifebuoy = createLifebuoy(kit);
  lifebuoy.rotation.y = Math.PI / 2;
  lifebuoy.position.set(TANK.minX, SPOTS.lifebuoy.y, SPOTS.lifebuoy.z);
  object.add(lifebuoy);

  // The bay: its floor, and the blockwork partition with its doorway onto the gantry.
  if (bay)
    t.box(
      object,
      t.paint('#8f8e88', 0.8),
      BAY_FLOOR.maxX - BAY_FLOOR.minX + PARTITION,
      0.15,
      W,
      (BAY_FLOOR.minX + TANK.minX) / 2,
      -0.075,
      0,
    );
  const blocks = createBreezeBlockTextures();
  kit.textures.push(blocks.map, blocks.normalMap, blocks.roughnessMap);
  const block = createPs1Material({
    map: blocks.map,
    normalMap: blocks.normalMap,
    roughnessMap: blocks.roughnessMap,
    roughness: 1,
  });
  kit.materials.push(block);
  const px = TANK.minX - PARTITION / 2;
  const wall = (minZ: number, maxZ: number, bottom: number, top: number) => {
    const at = [px, (bottom + top) / 2, (minZ + maxZ) / 2] as const;
    const geometry = new BoxGeometry(PARTITION, top - bottom, maxZ - minZ);
    mapBlockwork(geometry, at);
    const mesh = new Mesh(geometry, block);
    mesh.position.set(...at);
    object.add(mesh);
  };
  const d0 = DOORWAY.z - DOORWAY.width / 2;
  const d1 = DOORWAY.z + DOORWAY.width / 2;
  wall(TANK.minZ, d0, 0, HALL.height);
  wall(d1, TANK.maxZ, 0, HALL.height);
  wall(d0, d1, DOORWAY.height, HALL.height);
  // The doorway's doors: the equipment doors, as between every plant room, pulled open from the bay.
  const doors = equipmentDoors(kit, 'BALANCE TANK');
  doors.object.rotation.y = -Math.PI / 2;
  doors.object.position.set(TANK.minX - PARTITION, 0, DOORWAY.z);
  object.add(doors.object);
  parts.add(doors);
  const leaves: Footprint = {
    minX: TANK.minX - PARTITION - 0.05,
    maxX: TANK.minX + 0.05,
    minZ: d0,
    maxZ: d1,
  };

  // Light: sealed LED battens high on the walls, as the plant rooms have, a few lamps lighting the room.
  const battens = createWallBattenMaterials();
  kit.materials.push(...Object.values(battens));
  const inZ = TANK.maxZ - 0.05;
  for (const x of [
    ...(bay ? [BAY_FLOOR.minX + 1.5] : []),
    mid - 3,
    mid,
    mid + 3,
  ]) {
    addWallBatten(object, battens, x, 2.7, -inZ, 'x', 1);
    addWallBatten(object, battens, x, 2.7, inZ, 'x', -1);
  }
  for (const x of [
    ...(bay ? [(BAY_FLOOR.minX + BAY_FLOOR.maxX) / 2] : []),
    mid - 2.2,
    mid + 2.2,
  ]) {
    const lamp = new PointLight('#f2f4ee', 3 * METRE * METRE, 14 * METRE, 2);
    lamp.position.set(x, 2.4, 0);
    object.add(lamp);
  }

  updates.push((delta) => {
    state = source ? source() : stepBalanceTank(state, delta);
    time += delta;
    const y = waterY();
    water.position.y = y + 0.006 * Math.sin(time * 0.9);
    const share = state.inflow / BALANCE_TANK.circulation / 1.2;
    for (const [i, f] of falls.entries()) {
      f.set(share, runs.returns[i][1][1] - y);
      f.update(delta);
    }
    makeupFall.set(state.makeupOpen ? 1 : 0, SPOTS.makeup.end - y);
    makeupFall.update(delta);
    // The water stirred where each lands: the filler's churns a small patch; a return's, a wider one.
    surface.setSource(0, makeupFall.foot, makeupFall.share(), 1.6);
    for (const [i, f] of falls.entries())
      surface.setSource(i + 1, f.foot, f.share(), 4);
    surface.update(delta);
    valve?.setOpen(state.makeupOpen);
    transmitter.show(state.level);
    for (const f of switches) {
      f.setWater(y - hang);
      f.update(delta);
    }
    panel?.update();
  });
  return {
    object,
    parts,
    doors,
    // The doors bar the doorway while shut, and are held open while the walker stands in it.
    solids: (walker) => {
      const inside = overlaps(leaves, walker.x, walker.z, 0.35);
      if (inside) doors.holdOpen();
      const gateSweep = {
        minX: GATE.minX - 0.05,
        maxX: GATE.maxX,
        minZ: OPENING.maxZ - 0.05,
        maxZ: OPENING.maxZ + 0.65,
      };
      if (overlaps(gateSweep, walker.x, walker.z, 0.35)) gate.holdOpen();
      return [
        ...(gate.angle() < 0.6
          ? [
              {
                minX: GATE.minX,
                maxX: GATE.maxX,
                minZ: OPENING.maxZ - 0.03,
                maxZ: OPENING.maxZ + 0.03,
              },
            ]
          : []),
        ...doorwayStops(
          { inside, shut: doors.angle() < 0.6, seen: true },
          leaves,
          leaves,
        ),
      ];
    },
    update: (delta) => {
      for (const u of updates) u(delta);
    },
    // The pouring water's sound stops with the room.
    dispose: () => {
      makeupFall.dispose();
      for (const f of falls) f.dispose();
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Balance tank: cast concrete, 216 m³',
    reference:
      '9 × 6 m, 4.5 m deep; weir at 4.0 m; Trager-Feinstein level instruments, Penfold panel',
    size: { w: 9, d: 6, h: 1, mount: 'floor', pit: OPENING_OUTLINE },
    build: (kit) => buildHall(kit),
  },
];
