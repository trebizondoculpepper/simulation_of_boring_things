import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { Object3D } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import {
  createPartSet,
  pushButton,
  selector,
} from '../../../components/core/parts/parts';
import { plantTools } from '../../../components/plant/views/plant-tools';
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
  let open = 0;
  shutter.setOpen(open);
  return {
    object: group,
    parts,
    update(delta) {
      parts.update(delta);
      // About 0.2 m/s, as a geared shutter runs.
      open = Math.max(0, Math.min(1, open + (motion * delta * 0.2) / H));
      if (open === 0 || open === 1) motion = 0;
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
];
