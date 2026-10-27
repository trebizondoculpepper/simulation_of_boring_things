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
