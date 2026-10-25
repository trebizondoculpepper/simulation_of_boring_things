import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { wrapOnto } from '../../core/views/wrap-label';
import { PIPE_SIZES } from './plant-tools';
import type { DN } from './plant-tools';

/**
 * A butterfly valve's designation, printed on white plaques laid round its
 * blue body (the owner, 2026-10-25: labels on the valve, not floating
 * beside it): its tag over its name, one plaque on each side of the body,
 * clear of the lever, which stands out from the body's other two sides.
 * Each plaque follows the body's curve (`wrapOnto`). In the valve's own
 * frame (`plantTools.butterflyValve`): its pipe along `axis` through the
 * origin, its lever up (or, on an upright pipe, toward +z).
 */
export function createValvePlaques(
  kit: PanelKit,
  dn: DN,
  axis: 'x' | 'y' | 'z',
  tag: string,
  name: string,
) {
  // The body's rim, and a plaque just proud of it.
  return createBodyPlaques(
    kit,
    PIPE_SIZES[dn].flange * 0.42 + 0.0015,
    axis,
    tag,
    name,
  );
}

/**
 * The same plaques round any valve's round body of `radius` (a ball
 * valve's bronze collar, say), its axis along `axis`, centred on the
 * origin: one on each side, away from what stands up out of it.
 */
export function createBodyPlaques(
  kit: PanelKit,
  radius: number,
  axis: 'x' | 'y' | 'z',
  tag: string,
  name: string,
) {
  const group = new Group();
  group.name = `${tag} plaques`;
  // "… valve" goes without saying on a valve.
  const words = name.replace(/\s+valve$/i, '');
  // Wrapped round the upright axis, then turned to the pipe's: on the
  // body's two sides away from the lever (which is up, or toward +z on an
  // upright pipe).
  const holder = new Group();
  group.add(holder);
  if (axis === 'x') holder.rotation.z = Math.PI / 2;
  if (axis === 'z') holder.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const plaque = createMicroLabel(kit, `${tag}\n${words}`, {
      height: 0.0095,
      ink: '#19242a',
      plate: '#f0ede3',
      // No more than a third of the way round.
      maxWidth: radius * 2.1,
    });
    // Where on the rim, before it is wrapped: for a pipe along x, the
    // body's horizontal sides lie along z; otherwise along x.
    if (axis === 'x') plaque.position.set(0, 0, side * radius);
    else plaque.position.set(side * radius, 0, 0);
    wrapOnto(plaque, [0, 0], radius);
    holder.add(plaque);
  }
  return group;
}
