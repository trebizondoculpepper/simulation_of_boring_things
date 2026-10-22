import {
  Group,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  Quaternion,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createPlaceholder,
  createTank,
} from '../../components/plant/views/blockout';
import { createSandFilter } from '../../components/plant/views/pumps-plant';
import { machinePorts } from '../logic/machine-ports';
import { isLive } from '../rooms/plant/exhibit';
import { worldStore } from '../../save/world-store';
import { SWITCHBOARD_FEEDS, wayName } from '../logic/switch-room';
import { createMainSwitchboard } from '../../components/plant/views/electrical-switchgear';
import type { SwitchboardFeed } from '../../components/plant/views/electrical-switchgear';
import { airBox, gantries, STACK_FRAME, stackOf } from '../logic/air-plant';
import {
  createAirMimic,
  createAirPlantStructure,
  gantryColumnFeet,
} from './air-plant';
import { createAhuStack } from '../../components/plant/views/pool-ahu';
import type { LiveExhibit, PlantExhibit } from '../rooms/plant/exhibit';
import { EXHIBITS as PUMPS } from '../rooms/plant/pumps';
import { EXHIBITS as OZONE } from '../rooms/plant/ozone';
import { EXHIBITS as DOSING } from '../rooms/plant/dosing';
import { EXHIBITS as BALANCE } from '../rooms/plant/balance';
import { createMainSwitch } from '../../components/plant/views/main-switch';
import { createScenarioSimulator } from './scenario-simulator';
import type { Scenarios } from './scenario-simulator';
import { switchRoomContainment } from '../logic/cable-containment';
import { createContainment } from './cable-containment';
import type { MainsFeed } from '../../components/plant/views/main-switch';
import {
  createWetHallMimic,
  createWorldBoosterSet,
  createWorldWaterMeter,
} from './wet-hall';
import { EXHIBITS as BOILER } from '../rooms/plant/boiler';
import {
  bindBoilerSupply,
  createLiveBoilerCascade,
} from '../rooms/plant/boiler';
import { airHouse } from '../../components/plant/views/pool-ahu';
import { serviceAvailable } from '../../../game/plant/services';
import { EXHIBITS as CHEMICALS } from '../rooms/plant/chemicals';
import { EXHIBITS as ELECTRICAL } from '../rooms/plant/electrical';
import { EXHIBITS as CONTROL } from '../rooms/plant/control';
import {
  JACUZZI_PACK_EXHIBIT,
  SPA_PACK_EXHIBIT,
} from '../rooms/plant/spa-pack';
import { PUMP_PANEL_EXHIBIT } from '../rooms/plant/pump-panel';
import { layoutRoom } from '../logic/room-equipment';
import { createRoomPipework } from './room-pipework';
import { createRoomServices } from './room-services';
import { ROOM_SERVICES } from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';
import type { Item, Placed } from '../logic/room-equipment';

/** Each model the rooms' machines are, by its key in `logic/room-equipment.ts`. */
const MODELS: Record<string, PlantExhibit> = {
  'pump-pair': PUMPS[0],
  'uv-unit': PUMPS[4],
  'heat-exchanger': PUMPS[5],
  'pump-panel': PUMP_PANEL_EXHIBIT,
  'jacuzzi-pack': JACUZZI_PACK_EXHIBIT,
  'spa-pack': SPA_PACK_EXHIBIT,
  'ozone-generator': OZONE[0],
  'dosing-controller': DOSING[4],
  'hypo-pumps': DOSING[2],
  'acid-pump': DOSING[3],
  'level-instruments': BALANCE[4],
  'boiler-cascade': BOILER[0],
  'low-loss-header': BOILER[1],
  'lthw-pumps': BOILER[2],
  pressurisation: BOILER[3],
  calorifier: BOILER[4],
  'gas-train': BOILER[5],
  'dosing-pot': BOILER[6],
  'gas-safety': BOILER[7],
  'combustion-panel': BOILER[8],
  'mimic-gas': BOILER[9],
  'mimic-boiler-heat': BOILER[10],
  'hypo-tank': CHEMICALS[0],
  'acid-ibc': CHEMICALS[1],
  'spill-kit': CHEMICALS[2],
  'safety-shower': CHEMICALS[3],
  'fill-cabinet': CHEMICALS[4],
  'ppe-cabinet': CHEMICALS[5],
  'store-extract': CHEMICALS[6],
  'store-signs': CHEMICALS[7],
  'lv-switchboard': ELECTRICAL[0],
  mcc: ELECTRICAL[1],
  'central-battery': ELECTRICAL[3],
  'distribution-board': ELECTRICAL[5],
  'rotary-isolators': ELECTRICAL[6],
  'generator-point': ELECTRICAL[7],
  'earthing-terminal': ELECTRICAL[8],
  'operator-desk': CONTROL[0],
  'alarm-printer': CONTROL[1],
  'water-test-kit': CONTROL[2],
  'mimic-pool': CONTROL[3],
  'mimic-heating': CONTROL[4],
  'mimic-air': CONTROL[5],
  annunciator: CONTROL[6],
  'chart-recorders': CONTROL[7],
  'readout-board': CONTROL[8],
  'bms-outstation': CONTROL[9],
  'fire-repeater': CONTROL[11],
  cctv: CONTROL[12],
};

/** The tanks drawn at their size by the tank helper: sectional, or an upright vessel. */
const TANKS: Record<string, 'sectional' | 'vessel'> = {
  'balance-tank': 'sectional',
  'break-tank': 'sectional',
  'backwash-tank': 'sectional',
  'contact-tank': 'vessel',
};

/**
 * A machine's model: its working development-room model if one fits the
 * space it takes, a sand filter at its diameter, a tank at its size, or a
 * placeholder.
 */
function modelFor(kit: PanelKit, item: Item): Object3D | LiveExhibit | null {
  const [kind, arg] = item.key.split(':');
  bindSupplies();
  if (kind === 'boiler-cascade' && arg)
    return createLiveBoilerCascade(kit, (Number(arg) - 1) * 2);
  if (kind === 'mimic-air') return createAirMimic(kit);
  // The wet hall's machines, bound to the world's wet hall.
  if (kind === 'booster-set') return createWorldBoosterSet(kit);
  if (kind === 'water-meter') return createWorldWaterMeter(kit);
  if (kind === 'mimic-wet') return createWetHallMimic(kit);
  // The switch room's switchboard, its ways feeding the rooms in the world.
  if (kind === 'lv-switchboard') return createMainSwitchboard(kit, worldFeed());
  // The engineer's scenario simulator, switching the whole plant.
  if (kind === 'scenario-simulator') return worldScenarioSimulator(kit);
  // The main incoming switch, the whole site's supply in the world.
  if (kind === 'main-switch') return createMainSwitch(kit, mainsFeed());
  if (kind === 'ahu-stack') {
    const stack = stackOf(item.key);
    if (stack) return createAhuStack(kit, stack.units, STACK_FRAME);
  }
  if (kind === 'tanker-stand') return tankerStand(kit, item);
  // The lounge's contact tank is the ozone room's own model.
  if (kind === 'contact-tank' && item.w <= OZONE[3].size.w + 0.05)
    return OZONE[3].build(kit);
  if (TANKS[kind])
    return createTank(kit, {
      w: item.w,
      d: item.d,
      h: item.h,
      label: item.label.toUpperCase(),
      shape: TANKS[kind],
    });
  if (kind === 'sand-filter') {
    const dia = Number(arg);
    const filter = createSandFilter(kit, {
      dia,
      shell: dia * 0.57,
      dn: dia >= 2 ? 200 : 80,
      label: `SMDD ${Math.round(dia * 1000)}`,
    });
    filter.position.z += 0.1;
    const holder = new Group();
    holder.add(filter);
    return holder;
  }
  const model = MODELS[kind];
  // The model, where it fits the machine's space: else a placeholder.
  if (model && model.size.w <= item.w + 0.05 && model.size.d <= item.d + 0.05)
    return model.build(kit);
  return createPlaceholder(kit, {
    w: item.w,
    d: item.d,
    h: item.h,
    label: item.label.toUpperCase(),
    mount: item.mount,
  });
}

/**
 * The main switchboard's ways bound to the world's feeders
 * (`switch-room.ts`): a way is on while every room it feeds is.
 */
function worldFeed(): SwitchboardFeed | undefined {
  if (typeof window === 'undefined') return undefined;
  const store = worldStore('dev');
  return {
    on(legend) {
      const rooms = SWITCHBOARD_FEEDS[wayName(legend)];
      if (!rooms) return undefined;
      return rooms.every((r) => store.world.value.plant.feeders[r]);
    },
    set(legend, on) {
      for (const room of SWITCHBOARD_FEEDS[wayName(legend)] ?? [])
        store.dispatch({ type: 'plant/feeder', room, on });
    },
  };
}

/**
 * The machines that keep their own state, the boilers and the air
 * handling units, bound to their rooms' supply in the world: off when
 * the room's feeder is, or the whole site's main switch.
 */
let suppliesBound = false;
function bindSupplies() {
  if (suppliesBound || typeof window === 'undefined') return;
  suppliesBound = true;
  const store = worldStore('dev');
  bindBoilerSupply(() =>
    serviceAvailable(store.world.value.plant, 'boiler_house', 'power'),
  );
  airHouse.supply = () =>
    serviceAvailable(store.world.value.plant, 'air_plant', 'power');
}

/**
 * The Hyperplasc Scenario Simulator (`scenario-simulator.ts`), its FULL
 * OFF, FULL ON and SLOW START the whole plant's (`plant/startup.ts`).
 *
 * In the fiction it is a machine from another timeline: it draws its
 * power from branching universes, not from this building, so it is never
 * bound to the world's supply and works with the main switch off; and it
 * does not so much switch the plant as carry its user, seamlessly, into
 * the reality where the plant is off, on, or coming up.
 * Its origin, under the middle of its front, set forward so that its
 * footprint's middle is the machine's.
 */
function worldScenarioSimulator(kit: PanelKit): LiveExhibit {
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  const scenarios: Scenarios = {
    fullOff: () => store?.dispatch({ type: 'plant/full-off' }),
    fullOn: () => store?.dispatch({ type: 'plant/full-on' }),
    slowStart: () => store?.dispatch({ type: 'plant/slow-start' }),
    get starting() {
      return (store?.world.value.startup ?? -1) >= 0;
    },
    update() {},
  };
  const sim = createScenarioSimulator(kit, scenarios);
  const object = new Group();
  object.name = 'Hyperplasc Scenario Simulator';
  sim.group.position.z = 0.9 / 2 - 0.07;
  object.add(sim.group);
  return {
    object,
    parts: sim.parts,
    update: (delta) => sim.update(delta),
    dispose: () => sim.dispose(),
  };
}

/** The world's whole-site supply (`plant.sources.power`), for the main switch. */
function mainsFeed(): MainsFeed | undefined {
  if (typeof window === 'undefined') return undefined;
  const store = worldStore('dev');
  return {
    on: () => store.world.value.plant.sources.power,
    set: (on) => store.dispatch({ type: 'plant/source', utility: 'power', on }),
  };
}

/** The flange and short welded stub specified by a machine's port data. */
function drawPortNozzles(kit: PanelKit, item: Item) {
  const group = new Group();
  const body = new MeshStandardMaterial({ color: '#59636a', roughness: 0.45 });
  const flange = new MeshStandardMaterial({
    color: '#343c41',
    roughness: 0.48,
    metalness: 0.45,
  });
  kit.materials.push(body, flange);
  for (const port of machinePorts(item)) {
    if (port.drawn) continue;
    const dir = new Vector3(...port.outward);
    const end = new Vector3(...port.at);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
    const stub = new Mesh(
      new CylinderGeometry(port.od / 2, port.od / 2, 0.12, 20),
      body,
    );
    stub.name = `nozzle ${port.name}`;
    stub.position.copy(end).addScaledVector(dir, -0.06);
    stub.quaternion.copy(q);
    group.add(stub);
    const rim = new Mesh(
      new CylinderGeometry(port.od * 0.78, port.od * 0.78, 0.022, 20),
      flange,
    );
    rim.name = `flange ${port.name}`;
    rim.position.copy(end).addScaledVector(dir, -0.011);
    rim.quaternion.copy(q);
    group.add(rim);
  }
  return group;
}

/** A tanker's stand: its bay painted on the floor, yellow, hatched at its ends. */
function tankerStand(kit: PanelKit, item: Item) {
  const group = new Group();
  const yellow = new MeshStandardMaterial({ color: '#e3b51f', roughness: 0.6 });
  kit.materials.push(yellow);
  const line = (sx: number, sz: number, x: number, z: number) => {
    const m = new Mesh(new BoxGeometry(sx, 0.004, sz), yellow);
    m.position.set(x, 0.002, z);
    group.add(m);
  };
  const lw = 0.1;
  line(lw, item.d, -item.w / 2 + lw / 2, 0);
  line(lw, item.d, item.w / 2 - lw / 2, 0);
  line(item.w, lw, 0, -item.d / 2 + lw / 2);
  line(item.w, lw, 0, item.d / 2 - lw / 2);
  return group;
}

/**
 * A room's machines, placed (`logic/room-equipment.ts`), as one group in
 * metres to stand on the room's floor at `floorY`: and what the room needs
 * of them, their footprints to walk round, their parts to work, and each
 * frame's update.
 */
export function createRoomEquipment(kit: PanelKit, room: string, floorY = 0) {
  const group = new Group();
  group.name = `${room} equipment`;
  const layout = layoutRoom(room);
  const lives: LiveExhibit[] = [];
  const solids: Footprint[] = [];
  const placed: Placed[] = layout?.placed ?? [];
  for (const p of placed) {
    const built = modelFor(kit, p.item);
    if (!built) continue;
    const object = isLive(built) ? built.object : built;
    if (isLive(built)) lives.push(built);
    if (machinePorts(p.item).length) object.add(drawPortNozzles(kit, p.item));
    object.position.set(p.x, floorY + p.y, p.z);
    object.rotation.y = p.yaw;
    object.name ||= p.item.label;
    group.add(object);
    if (p.item.mount === 'floor' && !p.item.walkable) solids.push(p.footprint);
  }
  // The pipework between them (`room-pipework.ts`): its low runs more to
  // walk round, its valves more to work.
  const pipework = createRoomPipework(kit, room, floorY);
  group.add(pipework.group);
  solids.push(...pipework.solids);
  const services =
    room in ROOM_SERVICES
      ? createRoomServices(kit, room as ServiceRoom, floorY)
      : null;
  if (services) pipework.group.add(services.group);
  // The switch room's cable ladder and its switchgear's trunking.
  if (room === 'switch_room') {
    const c = switchRoomContainment();
    pipework.group.add(createContainment(kit, c.runs, c.entries, 7, floorY));
  }
  // The air plant's ductwork, gantries and stair (`air-plant.ts`).
  if (room === 'air_plant') {
    const structure = createAirPlantStructure(kit, placed, floorY);
    pipework.group.add(structure);
    solids.push(...gantryColumnFeet(gantries(airBox())));
  }
  return {
    group,
    solids,
    /** What working a part beneath `o` does, if any. */
    useOf(o: Object3D) {
      for (const live of lives) {
        const use = live.parts?.uses.get(o);
        if (use) return use;
      }
      return pipework.uses.get(o) ?? services?.uses.get(o);
    },
    update(delta: number) {
      for (const live of lives) {
        live.parts?.update(delta);
        live.update?.(delta);
      }
      pipework.update(delta);
      services?.update();
    },
    dispose() {
      for (const live of lives) {
        live.parts?.dispose();
        live.dispose?.();
      }
      pipework.dispose();
    },
  };
}
