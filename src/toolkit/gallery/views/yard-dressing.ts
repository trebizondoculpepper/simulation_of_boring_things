import {
  addSkipGraffiti,
  createSkip,
} from '../../components/site-dressing/views/skip';
import { dressSkip } from '../../components/site-dressing/logic/skip-dressing';
import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import { createSafetySign } from '../../components/general-safety/views/safety-signs';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import {
  createCardboardStack,
  createCigaretteBin,
  createCone,
  createCrateStack,
  createGritBin,
  createLpgCage,
  createPalletStack,
  createSadPlanter,
  createWheelieBin,
} from '../../components/loading-dock/views/yard-kit';
import { INTAKE, YARD, YARD_DRESSING } from '../logic/dock-yard';

/**
 * The goods yard's dressing (prompt 083; the owner, 2026-10-26): bins, a
 * skip, a cage of spent forklift propane, cardboard, crates, cones, a
 * grit bin, sad planters and a cigarette bin by the door; a headroom sign
 * over each lorry opening and a keep-clear sign on the fire exit's outside.
 * Set decoration. The dock's frame, metres; the yard at `YARD.level`.
 */
export function createYardDressing(
  kit: PanelKit,
  openings: readonly { at: number; w: number; h: number }[],
  doorX: number,
) {
  const group = new Group();
  group.name = 'Goods yard dressing';
  const make = {
    planter: (k: number) => createSadPlanter(kit, k),
    'bin-general': () => createWheelieBin(kit, '#2f6b33', 'GENERAL WASTE'),
    'bin-recycling': () => createWheelieBin(kit, '#1d4f9e', 'MIXED RECYCLING'),
    cardboard: () => createCardboardStack(kit),
    crates: () => createCrateStack(kit, 5, '#2a6fa8'),
    'crates-green': () => createCrateStack(kit, 4, '#3b7a3a'),
    lpg: () => createLpgCage(kit),
    grit: () => createGritBin(kit),
    skip: () => {
      // The game's skip (from the Encabulator): a random hire firm's name,
      // a random tag or two of graffiti (the owner, 2026-10-26).
      const skip = createSkip(kit);
      addSkipGraffiti(kit, skip.group, dressSkip(Math.random).tags);
      return skip.group;
    },
    cone: () => createCone(kit),
    pallets: () => createPalletStack(kit, 5),
  } as const;
  YARD_DRESSING.forEach((p, k) => {
    const thing = make[p.kind](k);
    thing.position.set(p.x, YARD.level, p.z);
    thing.rotation.y = p.yaw;
    group.add(thing);
  });
  // The cigarette bin on the wall above the planters.
  const ash = createCigaretteBin(kit);
  ash.position.set(6.45, YARD.level + 1.1, INTAKE.wallZ);
  ash.rotation.y = Math.PI;
  group.add(ash);
  // A headroom sign over each lorry opening, on the outside face.
  for (const o of openings) {
    const sign = createMicroLabel(kit, `MAX HEADROOM ${o.h.toFixed(1)} m`, {
      height: 0.09,
      ink: '#111111',
      plate: '#e3b51f',
    });
    sign.position.set(o.at, o.h + 0.35, INTAKE.wallZ - 0.01);
    sign.rotation.y = Math.PI;
    group.add(sign);
  }
  // The fire exit's outside: keep clear.
  const keep = createSafetySign(kit, ['exit'], ['Fire exit', 'Keep clear']);
  keep.position.set(doorX, 1.6, INTAKE.wallZ - 0.06);
  keep.rotation.y = Math.PI;
  group.add(keep);
  markComponent(group, { decorative: true });
  return group;
}
