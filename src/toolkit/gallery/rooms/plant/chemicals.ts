import {
  CHEMICAL_COLOUR,
  createBundedTank,
  createFillCabinet,
  createIbcOnSpillPallet,
  createPpeCabinet,
  createSafetyShower,
  createSpillKit,
  createStoreSigns,
  createStoreVentilation,
  STORE_DETECTION,
} from '../../../components/plant/views/chemicals-storage';
import { createGasZone } from '../../../components/general-safety/parts/gas-parts';
import { CHLORINE } from '../../../components/general-safety/logic/gas-detection';
import { createGasStation } from '../../views/gas-station';
import type { Object3D } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createPartSet } from '../../../components/core/parts/parts';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { FILL_CABINET } from '../../../components/plant/views/chemicals-storage';
import { Group } from 'three';
import {
  createCamlockAdaptor,
  createCamlockCoupler,
  createGuilleminHalf,
  createHoseEnd,
} from '../../../components/plant/views/chemical-couplings';
import { plantTools } from '../../../components/plant/views/plant-tools';

/** The fill cabinet, its door opened and shut with Use. */
function fillCabinet(kit: PanelKit): LiveExhibit {
  const object = createFillCabinet(kit);
  const door = object.userData.door as Object3D;
  const parts = createPartSet();
  let target = 0;
  let open = 0;
  object.traverse((o) => parts.uses.set(o, () => (target = target ? 0 : 1)));
  door.traverse((o) => (o.userData.live = true));
  return {
    object,
    parts,
    update(delta) {
      open =
        open < target
          ? Math.min(target, open + delta * 1.2)
          : Math.max(target, open - delta * 1.2);
      door.rotation.y = open * 1.75;
    },
  };
}

/**
 * The delivery couplings, old and new, on a bench (the owner, 2026-10-30):
 * the old fill point's brass 2" camlock, adaptor and coupler, as Hall 8's
 * case shows them; the hypochlorite's polypropylene 2" camlock, its hose
 * end beside its adaptor; the acid's 1½" Guillemin, a pair locked
 * together and a hose end. Use opens and shuts the camlocks' cam arms.
 */
function couplingsBench(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Delivery couplings, old and new';
  const top = 0.9;
  const wood = t.paint('#6b5a44', 0.7);
  t.box(object, wood, 1.6, 0.04, 0.6, 0, top - 0.02, 0);
  for (const x of [-0.75, 0.75])
    for (const z of [-0.25, 0.25])
      t.box(
        object,
        t.paint('#3a3d3f', 0.5),
        0.04,
        top - 0.04,
        0.04,
        x,
        (top - 0.04) / 2,
        z,
      );
  const parts = createPartSet();
  const couplers: ReturnType<typeof createCamlockCoupler>[] = [];
  let target = 0;
  let open = 0;
  /** A hose end lying across the bench, its coupling's face towards +x. */
  const hoseAt = (
    x: number,
    z: number,
    bore: number,
    coupling: { object: Group; shank: number },
  ) => {
    const hose = new Group();
    hose.position.set(x, top + 0.035 * (bore / 2), z);
    hose.rotation.y = Math.PI / 2;
    hose.add(
      coupling.object,
      createHoseEnd(kit, { bore, length: 0.3, shank: coupling.shank }),
    );
    object.add(hose);
  };
  /** An adaptor standing on its foot, its face up. */
  const adaptorAt = (x: number, z: number, adaptor: Group) => {
    adaptor.position.set(x, top, z);
    adaptor.rotation.x = -Math.PI / 2;
    object.add(adaptor);
  };
  // 1997: brass, the same at both fill points.
  const old = createCamlockCoupler(kit, { size: 2, material: 'brass' });
  couplers.push(old);
  hoseAt(-0.55, 0.1, 2, old);
  adaptorAt(
    -0.62,
    -0.15,
    createCamlockAdaptor(kit, { size: 2, material: 'brass' }),
  );
  adaptorAt(
    -0.45,
    -0.15,
    createCamlockAdaptor(kit, { size: 2, material: 'brass' }),
  );
  // Now: the hypochlorite's polypropylene camlock.
  const hypo = createCamlockCoupler(kit, {
    size: 2,
    material: 'polypropylene',
  });
  couplers.push(hypo);
  hoseAt(-0.05, 0.1, 2, hypo);
  adaptorAt(
    -0.05,
    -0.15,
    createCamlockAdaptor(kit, { size: 2, material: 'polypropylene' }),
  );
  // And the acid's Guillemin: a hose end, and a pair locked together.
  hoseAt(0.45, 0.1, 1.5, createGuilleminHalf(kit, { size: 1.5 }));
  const a = createGuilleminHalf(kit, { size: 1.5 });
  const b = createGuilleminHalf(kit, { size: 1.5 });
  const pair = new Group();
  pair.position.set(0.5, top + 0.035, -0.15);
  pair.rotation.y = Math.PI / 2;
  a.object.position.z = -a.face;
  b.object.position.z = b.face;
  b.object.rotation.set(0, Math.PI, Math.PI / 2);
  pair.add(a.object, b.object);
  object.add(pair);
  for (const [x, text] of [
    [-0.53, '1997: BRASS 2" CAMLOCK, BOTH POINTS'],
    [-0.05, 'HYPOCHLORITE: PP 2" CAMLOCK'],
    [0.47, 'ACID: PP 1½" GUILLEMIN'],
  ] as const)
    t.label(
      object,
      text,
      x,
      top + 0.002,
      0.27,
      0.014,
      '#111111',
      '#f2efe6',
    ).rotation.x = -Math.PI / 2;
  object.traverse((o) => parts.uses.set(o, () => (target = target ? 0 : 1)));
  // The arms move: never merged away.
  for (const c of couplers) c.object.traverse((o) => (o.userData.live = true));
  return {
    object,
    parts,
    update(delta) {
      if (open === target) return;
      open =
        open < target
          ? Math.min(target, open + delta * 2)
          : Math.max(target, open - delta * 2);
      for (const c of couplers) c.setOpen(open);
    },
  };
}

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Bunded hypochlorite and acid storage, fill points and safety equipment';

/**
 * The chemical store's equipment, in the order it is shown, each after a
 * real product (`doc/research/plant-products-chemicals-dosing.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Sodium hypochlorite bulk tank',
    reference:
      'After Enduramaxx 1000 L dosing tank (Ø1000 × 1600) in its 1100 L bund (Ø1580 × 770)',
    size: { w: 1.75, d: 1.75, h: 2.0, mount: 'floor' },
    build: (kit) =>
      createBundedTank(kit, {
        chemical: 'SODIUM HYPOCHLORITE',
        detail: '14–15 % available chlorine · UN 1791',
        colour: CHEMICAL_COLOUR.hypochlorite,
        tag: 'CT-101 HYPOCHLORITE',
      }),
  },
  {
    title: 'Acid IBC on spill pallet',
    reference:
      'After Denios Classic-line PE pallet for 1 IBC (1910 × 1280 × 860) and a 1000 L IBC',
    size: { w: 2.0, d: 1.4, h: 2.2, mount: 'floor' },
    build: createIbcOnSpillPallet,
  },
  {
    title: 'Chemical spill kit',
    reference: 'After Ecospill C1220120, 120 L chemical kit in a wheeled bin',
    size: { w: 0.65, d: 0.75, h: 1.0, mount: 'floor' },
    build: createSpillKit,
  },
  {
    title: 'Safety shower and eyewash',
    reference:
      'After Hughes EXP-18GS/45G (464 × 748 × 2237, EN 15154, 76 + 12 L/min)',
    size: { w: 1.25, d: 1.4, h: 2.3, mount: 'floor' },
    build: createSafetyShower,
  },
  {
    title: 'Delivery fill cabinet',
    reference:
      'Lockable stainless cabinet, 2" and 1½" couplings, tank-full alarm',
    size: {
      w: FILL_CABINET.w,
      d: FILL_CABINET.d,
      h: FILL_CABINET.h,
      mount: 'wall',
      y: 1.2,
    },
    build: fillCabinet,
  },
  {
    title: 'Delivery couplings, old and new',
    reference:
      'After EN 14420-7 camlocks (brass, 1997; polypropylene, now) and an NF E 29-572 Guillemin; Use opens the cam arms',
    size: { w: 1.6, d: 0.6, h: 1.0, mount: 'floor' },
    build: couplingsBench,
  },
  {
    title: 'PPE cabinet',
    reference: 'After the small yellow chemical PPE cabinets (500 × 300 × 700)',
    size: { w: 0.6, d: 0.35, h: 1.25, mount: 'wall', y: 1.3 },
    build: createPpeCabinet,
  },
  {
    title: 'Extract and chlorine detection',
    reference:
      'After Vent-Axia ACM150 in-line fan, Crowcon Xgard Bright Cl₂ detector and Klaxon Sonos sounder-beacon; working, on its own air',
    size: { w: 1.0, d: 0.3, h: 2.2, mount: 'wall', y: 1.25 },
    build: (kit) => {
      // Its own store's air, for trying the alarm: `devChemicals.gas`.
      const zone = createGasZone(CHLORINE);
      if (typeof window !== 'undefined')
        (window as unknown as { devChemicals: unknown }).devChemicals = {
          gas: zone,
        };
      const station = createGasStation(
        kit,
        createStoreVentilation(kit),
        STORE_DETECTION,
        { ...zone, lens: 'amber' },
      );
      return { ...station, update: (delta) => zone.step(delta) };
    },
  },
  {
    title: 'Store signs',
    reference: 'GHS labels, segregation rule, entry and PPE signs',
    size: { w: 1.6, d: 0.05, h: 1.0, mount: 'wall', y: 1.5 },
    build: createStoreSigns,
  },
];
