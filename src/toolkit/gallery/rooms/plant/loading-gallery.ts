import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  beginPart,
  createPartSet,
  pushButton,
  selector,
} from '../../../components/core/parts/parts';
import { partAudio } from '../../../components/core/audio/part-audio';
import {
  SHUTTER_STOP,
  shutterRun,
} from '../../../components/loading-dock/audio/shutter-run';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  createClass8Placard,
  createHazchemPlate,
  createOrangePlate,
} from '../../../components/general-safety/views/dangerous-goods';
import { TANK_CHEMICAL } from '../../../components/plant/logic/iso-tank';
import {
  PALLET,
  createChainRun,
  createDockBuffer,
  createDockLight,
  createEdgePost,
  createPallet,
  createPalletOfGoods,
  createRollerShutter,
  createWheelChock,
  createWheelGuide,
} from '../../../components/loading-dock/views/dock-parts';
import {
  createBarrier,
  createBollard,
  createDockLeveller,
  createDockShelter,
  createDrumOnSpillPallet,
  createFillCabinet,
  createForklift,
  createGeneratorCabinet,
  createPalletStack,
  createPalletTruck,
  createRollCage,
  createSackTruck,
  createSafetyMirror,
} from '../../../components/loading-dock/views/yard-kit';
import {
  createElectricityMeteringCabinet,
  createGasMeterTrain,
  createWaterMeterSet,
} from '../../../components/plant/views/utility-meters';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The loading dock’s gallery: everything a loading dock, a utility area and a goods yard hold, each modelled here before the dock uses it. The roller shutter works from its controller, its dock light green only when it is fully open; the cabinets open.';
export const FINISH = { wall: '#c9cbc6', floor: '#8d908c' };

/**
 * Dev43, the loading dock's gallery (the owner, 2026-10-26; prompt 073):
 * one of each thing found in a loading dock and goods yard, rough, at true
 * size. The shutter and its controller are worked here; the rest are
 * blocked out for the dock and the yard to use.
 */

const still = (
  title: string,
  reference: string,
  size: PlantExhibit['size'],
  build: (kit: PanelKit) => Object3D,
): PlantExhibit => ({ title, reference, size, build });

/** A wall cabinet whose door opens and shuts with Use. */
function openable(
  make: (kit: PanelKit) => { group: Group; door: Group },
): (kit: PanelKit) => LiveExhibit {
  return (kit) => {
    const { group, door } = make(kit);
    const parts = createPartSet();
    let target = 0;
    let angle = 0;
    group.traverse((o) => parts.uses.set(o, () => (target = target ? 0 : 1)));
    door.traverse((o) => (o.userData.live = true));
    return {
      object: group,
      parts,
      update(delta) {
        angle =
          angle < target
            ? Math.min(target, angle + delta * 1.5)
            : Math.max(target, angle - delta * 1.5);
        door.rotation.y = (-angle * Math.PI * 0.6) as number;
      },
    };
  };
}

/**
 * The roller shutter on a blank wall with its controller beside it (a
 * push-button station: OPEN, STOP, CLOSE, and a key switch that must be ON)
 * and its dock light, green only while it stands fully open: an interlock
 * a real dock wires so a lorry never moves under a shutter.
 */
function shutterRig(kit: PanelKit): LiveExhibit {
  const W = 3.0;
  const H = 3.4;
  const group = new Group();
  const shutter = createRollerShutter(kit, { w: W, h: H });
  // Its head 3.4 m up; the group's origin at the wall at floor level.
  shutter.group.position.y = H;
  group.add(shutter.group);
  const parts = createPartSet();
  const t = plantTools(kit);
  // The control station, right of the opening.
  const station = new Group();
  station.position.set(W / 2 + 0.75, 1.4, 0);
  t.box(station, t.paint('#d9d4c4', 0.5), 0.2, 0.6, 0.1, 0, 0.06, 0.05);
  const name = createMicroLabel(kit, 'SHUTTER 1', {
    height: 0.014,
    ink: '#151515',
    plate: '#f0ede3',
  });
  name.position.set(0, 0.18, 0.102);
  station.add(name);
  const enabled = signal(false);
  let motion = 0;
  const mount = (part: ReturnType<typeof pushButton>, y: number) => {
    parts.add(part);
    part.object.position.set(0, y, 0.102);
    part.object.scale.setScalar(0.8);
    station.add(part.object);
  };
  mount(
    pushButton(kit, {
      colour: 'black',
      legend: 'OPEN',
      symbol: '▲',
      action: () => enabled.value && (motion = 1),
    }),
    0.08,
  );
  mount(
    pushButton(kit, {
      colour: 'red',
      legend: 'STOP',
      action: () => (motion = 0),
    }),
    -0.03,
  );
  mount(
    pushButton(kit, {
      colour: 'black',
      legend: 'CLOSE',
      symbol: '▼',
      action: () => enabled.value && (motion = -1),
    }),
    -0.14,
  );
  const key = selector(kit, {
    positions: 2,
    key: true,
    legend: 'OFF · ON',
    name: 'Shutter key switch',
    bound: {
      get value() {
        return enabled.value ? 1 : 0;
      },
      set: (n: number) => {
        enabled.value = n === 1;
        if (!enabled.value) motion = 0;
      },
    },
  });
  parts.add(key);
  key.object.position.set(0, 0.28, 0.102);
  key.object.scale.setScalar(0.8);
  station.add(key.object);
  group.add(station);
  // Its dock light, left of the opening.
  const light = createDockLight(kit);
  light.group.position.set(-W / 2 - 0.5, 2.2, 0);
  group.add(light.group);
  shutter.group.traverse((o) => (o.userData.live = true));
  light.group.traverse((o) => (o.userData.live = true));
  // Its sounds (the owner, 2026-10-26): while it runs, a recording of a
  // real electric shutter, its motor and its laths' clatter onto the
  // barrel; a clunk as it reaches either end.
  const drive = beginPart(kit, 'Shutter drive');
  const running = signal(false);
  drive.object.add(new Group());
  const roll = new Group();
  roll.position.set(0, H + 0.6, 0.33);
  group.add(roll);
  // A recording of a real electric shutter: motor and laths together,
  // running up and down with the motor's speed.
  const speed = signal(0);
  drive.holdWhile(running, shutterRun(speed), roll);
  parts.add(drive.part());
  let open = 0;
  let direction = 0;
  shutter.setOpen(open);
  return {
    object: group,
    parts,
    update(delta) {
      parts.update(delta);
      // The motor runs up to speed in about 0.8 s and down, braked, in
      // about 0.4 s (the owner, 2026-10-26); full speed about 0.2 m/s.
      const target = motion !== 0 ? 1 : 0;
      speed.value =
        target > speed.value
          ? Math.min(1, speed.value + delta / 0.8)
          : Math.max(0, speed.value - delta / 0.4);
      if (motion !== 0) direction = motion;
      open = Math.max(
        0,
        Math.min(1, open + (direction * speed.value * delta * 0.2) / H),
      );
      if (motion !== 0 && (open === 0 || open === 1)) {
        motion = 0;
        speed.value = 0;
      }
      // The brake's clunk as it comes to rest, however it stopped.
      const nowRunning = speed.value > 0.01;
      if (running.value && !nowRunning) partAudio.play(SHUTTER_STOP, roll);
      running.value = nowRunning;
      shutter.setOpen(open);
      light.set(open >= 1 ? 'green' : 'red');
    },
    status: () =>
      open >= 1
        ? 'open'
        : open <= 0
          ? 'shut'
          : `${Math.round(open * 100)}% open`,
  };
}

/**
 * A meter whose register counts up as the site draws: `rate` units an
 * hour, sped up so the last drums and digits are seen to move.
 */
function metering<T extends { group: Group }>(
  make: (kit: PanelKit) => T,
  lift: number,
  start: number,
  rate: number,
  show: (meter: T, reading: number, delta: number) => void,
  unit: string,
): (kit: PanelKit) => LiveExhibit {
  return (kit) => {
    const meter = make(kit);
    // Its origin moved to the middle of what the exhibit's size encloses.
    const holder = new Group();
    meter.group.position.y = lift;
    holder.add(meter.group);
    let reading = start;
    show(meter, reading, 0);
    return {
      object: holder,
      update(delta) {
        // Sixty times real time.
        reading += (rate / 3600) * delta * 60;
        show(meter, reading, delta);
      },
      status: () => `reads ${Math.floor(reading)} ${unit}`,
    };
  };
}

/**
 * A board of the marks a chemical tanker carries: both chemicals' Hazchem
 * plates across the top, below them the class 8 placard and the orange
 * plates, numbered for each chemical and plain. Facing +z, its middle at
 * the origin.
 */
function createDangerousGoodsBoard(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  // Its face 3 cm off the wall, clear of the wall's own face.
  t.box(group, t.paint('#3b3f43', 0.7), 2.6, 1.5, 0.03, 0, 0, 0.015);
  const at = (o: Object3D, x: number, y: number) => {
    o.position.set(x, y, 0.032);
    group.add(o);
  };
  for (const [i, chemical] of (['hypochlorite', 'acid'] as const).entries()) {
    const info = TANK_CHEMICAL[chemical];
    at(
      createHazchemPlate(kit, {
        eac: info.eac,
        un: info.un,
        phone: '01632 960 179',
        company: 'Chlorella Chemicals',
      }),
      i === 0 ? -0.62 : 0.62,
      0.33,
    );
    at(
      createOrangePlate(kit, { hazard: info.hazard, un: info.un }),
      i === 0 ? -0.55 : 0.05,
      -0.45,
    );
  }
  at(createClass8Placard(kit, 0.3), -1.05, -0.45);
  at(createOrangePlate(kit), 0.65, -0.45);
  const legend = (text: string, x: number, y: number) => {
    const label = createMicroLabel(kit, text, {
      height: 0.035,
      ink: '#f2f2ee',
    });
    label.position.set(x, y, 0.033);
    group.add(label);
  };
  legend('HYPOCHLORITE · HAZCHEM', -0.62, 0.68);
  legend('HYDROCHLORIC ACID · HAZCHEM', 0.62, 0.68);
  legend('ADR CLASS 8', -1.05, -0.66);
  legend('80 / 1791', -0.55, -0.66);
  legend('80 / 1789', 0.05, -0.66);
  legend('CAB FRONT', 0.65, -0.66);
  return group;
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Insulated roller shutter, its controller and dock light',
    reference:
      'After Bolton Gate’s insulated shutter, HAG Armourguard and Hörmann SB Decotherm: 100 mm laths, barrel box, geared motor and hand chain; an OPEN · STOP · CLOSE station with key switch',
    size: { w: 5.0, d: 0.8, h: 4.5, mount: 'wall', y: 2.25 },
    build: (kit) => {
      const live = shutterRig(kit);
      // Centred on its wall exhibit's middle, 2.25 m up.
      live.object.position.y = -2.25;
      const holder = new Group();
      holder.add(live.object);
      return { ...live, object: holder };
    },
  },
  still(
    'Dock traffic light',
    'Red over green, after the loading-bay type; inside for loaders, outside for drivers',
    { w: 0.3, d: 0.15, h: 0.5, mount: 'wall', y: 2.2 },
    (kit) => createDockLight(kit).group,
  ),
  still(
    'Dock leveller',
    'A hinged deck and lip bridging floor to lorry bed, after Stertil’s and ASSA ABLOY’s 6 t levellers',
    { w: 2.3, d: 3.0, h: 0.3, mount: 'floor' },
    createDockLeveller,
  ),
  still(
    'Dock shelter',
    'A padded frame round a lorry opening, after Hörmann’s and Stertil’s',
    { w: 4.2, d: 0.6, h: 5.2, mount: 'wall', y: 2.6 },
    (kit) => {
      const g = createDockShelter(kit, 3.5, 4.5);
      g.position.y = -2.6;
      const h = new Group();
      h.add(g);
      return h;
    },
  ),
  still(
    'Dock buffer',
    'Laminated rubber, on its steel plate',
    { w: 0.4, d: 0.2, h: 0.55, mount: 'wall', y: 0.9 },
    createDockBuffer,
  ),
  still(
    'Wheel chocks',
    'A pair of yellow rubber wedges',
    { w: 0.6, d: 0.5, h: 0.25, mount: 'floor' },
    (kit) => {
      const g = new Group();
      for (const x of [-0.17, 0.17]) {
        const c = createWheelChock(kit);
        c.position.x = x;
        g.add(c);
      }
      return g;
    },
  ),
  still(
    'Wheel guide',
    'A hazard-striped kerb, lining a lorry in to its bay',
    { w: 0.4, d: 2.2, h: 0.2, mount: 'floor' },
    (kit) => createWheelGuide(kit, 2),
  ),
  still(
    'Edge posts and chain',
    'Removable posts in floor sockets, yellow chain at 1.1 m and 0.6 m, guarding a drop',
    { w: 2.0, d: 0.3, h: 1.2, mount: 'floor' },
    (kit) => {
      const g = new Group();
      const a = { x: -0.75, z: 0 };
      const b = { x: 0.75, z: 0 };
      for (const p of [a, b]) {
        const post = createEdgePost(kit);
        post.position.set(p.x, 0, p.z);
        g.add(post);
      }
      for (const y of [1.1, 0.6]) g.add(createChainRun(kit, a, b, y));
      return g;
    },
  ),
  still(
    'Steel bollard',
    '168 mm tube, 1.2 m, yellow, on its base plate',
    { w: 0.4, d: 0.4, h: 1.25, mount: 'floor' },
    createBollard,
  ),
  still(
    'Convex safety mirror',
    '600 mm, on its pole, for a blind corner of the yard',
    { w: 0.8, d: 0.5, h: 3.0, mount: 'floor' },
    createSafetyMirror,
  ),
  still(
    'Pedestrian barrier',
    'Yellow steel, 1.1 m, between walkway and vehicles',
    { w: 2.3, d: 0.3, h: 1.15, mount: 'floor' },
    (kit) => createBarrier(kit, 2),
  ),
  still(
    'Wooden pallet',
    'The UK standard four-way pallet, 1200 × 1000 × 144 mm (BS ISO 6780)',
    { w: PALLET.w + 0.1, d: PALLET.d + 0.1, h: 0.2, mount: 'floor' },
    (kit) => createPallet(kit),
  ),
  still(
    'Stack of empty pallets',
    'Six UK pallets, waiting to go back',
    { w: PALLET.w + 0.1, d: PALLET.d + 0.1, h: 0.95, mount: 'floor' },
    (kit) => createPalletStack(kit, 6),
  ),
  still(
    'Pallet of goods',
    'Shrink-wrapped cartons on a UK pallet: cleaning supplies',
    { w: PALLET.w + 0.1, d: PALLET.d + 0.1, h: 1.5, mount: 'floor' },
    (kit) =>
      createPalletOfGoods(kit, {
        colour: '#3d7fb8',
        h: 1.2,
        label: 'CLEANING SUPPLIES',
      }),
  ),
  still(
    'Hand pallet truck',
    '2.5 t, forks 1150 mm, after the usual warehouse truck',
    { w: 0.8, d: 1.7, h: 1.25, mount: 'floor' },
    createPalletTruck,
  ),
  still(
    'Counterbalance forklift',
    'A small 1.5 t electric truck: chassis and counterweight, overhead guard, mast and forks',
    { w: 1.3, d: 3.2, h: 2.3, mount: 'floor' },
    createForklift,
  ),
  still(
    'Roll cage',
    '800 × 700 × 1700 mm, mesh sides on four castors',
    { w: 0.9, d: 0.8, h: 1.75, mount: 'floor' },
    createRollCage,
  ),
  still(
    'Sack truck',
    'Steel, on two wheels, its nose plate down',
    { w: 0.7, d: 0.5, h: 1.25, mount: 'floor' },
    createSackTruck,
  ),
  still(
    'Drum on a spill pallet',
    'A 205 L drum on a two-drum bunded pallet',
    { w: 1.35, d: 0.8, h: 1.25, mount: 'floor' },
    createDrumOnSpillPallet,
  ),
  still(
    'Dangerous goods marks on a chemical tanker',
    'What a tanker of the site’s chemicals shows (prompt 097): UK Hazchem plates on its sides and rear, 800 × 500 mm (sodium hypochlorite 2X, UN 1791; hydrochloric acid 2R, UN 1789), the ADR class 8 placard, the orange plates with hazard and UN numbers, and the plain orange plate on the cab’s front',
    { w: 2.6, d: 0.06, h: 1.5, mount: 'wall', y: 1.95 },
    createDangerousGoodsBoard,
  ),
  {
    title: 'Chemical delivery fill cabinet',
    reference:
      'Stainless, lockable, both inlets segregated on their own bunded trays: acid on a 2 inch dry-break coupling, hypochlorite on a 1½ inch coupling of another type (HSG179, PWTAG)',
    size: { w: 1.2, d: 0.5, h: 1.2, mount: 'wall', y: 1.2 },
    build: openable(createFillCabinet),
  },
  {
    title: 'Generator connection cabinet',
    reference:
      'Heavy steel, single-pole connectors of the Powerlock kind: L1 L2 L3 and earth',
    size: { w: 1.1, d: 0.45, h: 1.4, mount: 'wall', y: 1.2 },
    build: openable(createGeneratorCabinet),
  },
  {
    title: 'Electricity metering cabinet',
    reference:
      'A three-phase CT-operated meter after the Landis+Gyr E650 and Elster A1700 (600/5 A CTs, Cl. 0.5S) over its test terminal block, a 4G AMR modem and the sealed CT chamber, in a GRP cabinet 800 × 1200 × 320 mm',
    size: { w: 0.95, d: 1.2, h: 1.85, mount: 'wall', y: 0.9 },
    maker: 'kessler-moody',
    build: metering(
      createElectricityMeteringCabinet,
      0.3,
      1_284_337,
      180,
      (m, kwh, delta) => m.show(kwh, 180 + 20 * Math.sin(kwh / 3), delta),
      'kWh',
    ),
  },
  {
    title: 'Gas meter installation',
    reference:
      'DN80 in yellow-painted pipe: ECV, filter, slam-shut regulator with relief vent, a G100 rotary meter after the Elster RABO/RVG (160 m³/h) and a volume converter after the Elster EK205, outlet valve',
    size: { w: 2.9, d: 0.45, h: 2.1, mount: 'wall', y: 1.0 },
    maker: 'trager-feinstein',
    build: metering(
      createGasMeterTrain,
      0,
      408_215,
      110,
      (m, v, d) => m.show(v, d),
      'm³',
    ),
  },
  {
    title: 'Water meter set',
    reference:
      'DN100: gate valves, Y-strainer, an ultrasonic meter after the Kamstrup flowIQ 3100 (Q3 100 m³/h) and a dismantling joint, ductile iron in blue epoxy',
    size: { w: 2.5, d: 0.35, h: 0.85, mount: 'floor' },
    maker: 'trager-feinstein',
    build: metering(
      createWaterMeterSet,
      0,
      52_118.402,
      6,
      (m, v) => m.show(v),
      'm³',
    ),
  },
];
