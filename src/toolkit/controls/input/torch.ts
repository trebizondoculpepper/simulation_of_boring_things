import { Object3D, SpotLight } from 'three';
import { TORCH, followAim, torch } from '../logic/torch';
import type { Aim } from '../logic/torch';

/**
 * The torch's light in a room (`logic/torch.ts`): a spotlight held low in
 * the right hand, its beam easing after the eye. It stays in the room's
 * scene whether on or off, its brightness put to nothing when off, so
 * that switching it never changes the scene's count of lights (which
 * would have every material rebuilt, a stutter at the switch).
 */
export function createTorchLight(metre: number) {
  const light = new SpotLight(
    TORCH.colour,
    0,
    TORCH.range * metre,
    TORCH.angle,
    TORCH.penumbra,
    2,
  );
  light.name = 'Torch';
  const target = new Object3D();
  target.name = 'Torch target';
  light.target = target;
  let aim: Aim | null = null;
  return {
    light,
    target,
    /** Its beam `delta` seconds on, held by an eye at `eye` looking along `look`. */
    update(eye: { x: number; y: number; z: number }, look: Aim, delta: number) {
      aim = aim ? followAim(aim, look, delta) : { ...look };
      light.intensity = torch.on ? TORCH.intensity * metre * metre : 0;
      // In the hand: to the right of the eye, below it, and ahead.
      const { right, down, forward } = TORCH.hand;
      const sx = Math.sin(look.yaw);
      const cz = -Math.cos(look.yaw);
      light.position.set(
        eye.x + (sx * forward - cz * right) * metre,
        eye.y - down * metre,
        eye.z + (cz * forward + sx * right) * metre,
      );
      // Along its own, lagging, aim.
      const d = 10 * metre;
      target.position.set(
        light.position.x + Math.sin(aim.yaw) * Math.cos(aim.pitch) * d,
        light.position.y + Math.sin(aim.pitch) * d,
        light.position.z - Math.cos(aim.yaw) * Math.cos(aim.pitch) * d,
      );
    },
  };
}
