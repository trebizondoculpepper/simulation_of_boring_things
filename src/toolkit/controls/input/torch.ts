import { CanvasTexture, Object3D, SRGBColorSpace, SpotLight } from 'three';
import { TORCH, beamAt, followAim, torch } from '../logic/torch';
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
  light.map = beamTexture();
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

/**
 * The pattern the torch throws (`beamAt`), drawn once: a cheap torch's
 * uneven pool of light, warmer toward the edge as an incandescent bulb's
 * is. Drawn once, the first time, and shared by every room's torch.
 * None without a page to draw on.
 */
let drawn: CanvasTexture | null = null;
function beamTexture() {
  if (drawn) return drawn;
  if (typeof document === 'undefined') return null;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d');
  if (!c || typeof c.createImageData !== 'function') return null;
  const image = c.createImageData(size, size);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size) * 2 - 1;
      const y = ((j + 0.5) / size) * 2 - 1;
      const v = beamAt(x, y);
      // Warmer, yellower toward the rim.
      const warm = Math.min(1, Math.hypot(x, y) * 1.2);
      const k = (j * size + i) * 4;
      image.data[k] = 255 * v;
      image.data[k + 1] = 255 * v * (1 - 0.1 * warm);
      image.data[k + 2] = 255 * v * (1 - 0.32 * warm);
      image.data[k + 3] = 255;
    }
  c.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  drawn = texture;
  return texture;
}
