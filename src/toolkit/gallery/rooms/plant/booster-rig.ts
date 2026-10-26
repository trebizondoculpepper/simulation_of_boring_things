import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { plantTools } from '../../../components/plant/views/plant-tools';
import { createBoosterSet } from '../../../components/plant/views/booster-set';
import { BOOSTER } from '../../../components/plant/logic/booster-set';
import {
  actOnChangeover,
  changeoverFlow,
  newBoosterChangeover,
  stepChangeover,
} from '../../../components/plant/logic/booster-changeover';
import type { BoosterChangeover } from '../../../components/plant/logic/booster-changeover';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The make-up booster set, modelled: an ideal clean water source into its suction, its discharge into an ideal sink. Choose its duty pump with DUTY 1 or DUTY 2: the running pump coasts down, its valves drive shut, the other pump’s open and it runs up, so only the pump running ever has its valves open and nothing can run back through the standby. RUN and STOP start and stop the duty pump.';

/**
 * Dev42, the booster set's rig (the owner, 2026-10-26): the Grundflow
 * set the wet hall uses, its duty changeover modelled
 * (`booster-changeover.ts`), between an ideal clean water source and an
 * ideal sink, each drum showing what flows. Fresh each time it is built.
 */

let set: BoosterChangeover = newBoosterChangeover();
export function prepareRoom() {
  set = newBoosterChangeover();
}
// For trying it from the console: `boosterRig.act({ act: 'duty', pump: 1 })`.
if (typeof window !== 'undefined')
  (window as unknown as { boosterRig?: unknown }).boosterRig = {
    get state() {
      return set;
    },
    act: (a: Parameters<typeof actOnChangeover>[1]) =>
      (set = actOnChangeover(set, a)),
  };

function rig(kit: PanelKit): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Booster set rig';
  const B = BOOSTER;
  const booster = createBoosterSet(kit, {
    read: () => {
      const flow = changeoverFlow(set);
      return {
        powered: true,
        tripped: false,
        running: flow > 0,
        flow,
        breakTank: 1,
      };
    },
    reset: () => {},
    changeover: {
      state: () => set,
      act: (a) => (set = actOnChangeover(set, a)),
    },
  });
  object.add(booster.object);
  // The ideal source drum west of its suction, the ideal sink east of
  // its discharge, each joined to its manifold by a short pipe.
  const y = B.manifoldY;
  const drum = (x: number, z: number, colour: string, name: string) => {
    t.cyl(object, t.paint(colour, 0.45), 0.35, 1.0, x, 0.5, z, 'y', 32);
    t.cyl(object, t.paint('#e8ecee', 0.4), 0.36, 0.05, x, 1.0, z, 'y', 32);
    const label = createMicroLabel(kit, name, {
      height: 0.04,
      maxWidth: 0.6,
      ink: '#f2f2ea',
      plate: '#25343a',
    });
    label.position.set(x, 0.75, z + 0.36);
    object.add(label);
  };
  const westX = -B.w / 2 - 0.9;
  const eastX = B.w / 2 + 0.9;
  drum(westX, B.suctionZ, '#2b7fc4', 'CLEAN WATER: IDEAL SOURCE');
  drum(eastX, B.dischargeZ, '#9fd0ea', 'IDEAL SINK');
  object.add(
    createPipe('stainless', 0.089, [
      [westX + 0.35, y, B.suctionZ],
      [-B.w / 2, y, B.suctionZ],
    ]),
    createPipe('stainless', 0.076, [
      [B.w / 2, y, B.dischargeZ],
      [eastX - 0.35, y, B.dischargeZ],
    ]),
  );
  return {
    object,
    parts: booster.parts,
    update(delta) {
      set = stepChangeover(set, delta);
      booster.update?.(delta);
    },
    dispose() {
      booster.dispose?.();
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Make-up booster set: duty changeover',
    reference:
      'Grundflow twin-pump set, each pump’s suction and discharge valves motorised, between an ideal clean water source and an ideal sink',
    size: { w: BOOSTER.w + 2.6, d: 1.4, h: 1.6, mount: 'floor' as const },
    build: rig,
  },
];
