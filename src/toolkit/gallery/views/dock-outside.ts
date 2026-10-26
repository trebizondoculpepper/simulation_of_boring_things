import {
  CanvasTexture,
  CircleGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  BoxGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createSkyDome } from '../../../scene/sky-dome';
import { createSkyChanger } from '../../../game/skies';

/**
 * What the loading dock's openings look out on (prompt 073): tarmac as far
 * as the eye can see, about 1.2 m below the dock's floor, under a plain
 * overcast sky (the standard sky dome); the dock's outside wall carried
 * down to the tarmac below its openings. No buildings: the roadways
 * beyond are another plane of existence. Nothing here is walked on until
 * the goods yard (prompt 080). Metres, the dock's middle at the origin,
 * its floor at y = 0, its outside wall at z = `wallZ` (north, −z).
 */
export const YARD_LEVEL = -1.2;

export function createDockOutside(
  kit: PanelKit,
  {
    wallZ,
    width,
    thickness,
    openings = [],
  }: {
    wallZ: number;
    width: number;
    thickness: number;
    /** The lorry openings, each its middle and width along the wall. */
    openings?: readonly { at: number; w: number }[];
  },
) {
  const group = new Group();
  group.name = 'the goods yard, seen from the dock';
  // The sky: the standard dome, inside the camera's 80 m reach, overcast.
  const sky = createSkyDome(70);
  sky.set(createSkyChanger('overcast').step(0), 0, 0);
  group.add(sky.dome);
  // The tarmac: a grey, faintly speckled plane out to the dome.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#6a6b6d';
  g.fillRect(0, 0, 256, 256);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) {
    const v = 80 + Math.floor(rnd() * 60);
    g.fillStyle = `rgb(${v},${v},${v + 2})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.repeat.set(60, 60);
  kit.textures.push(map);
  // Lit by the day, not by the dock's lamps: drawn at its daylight shade.
  const tarmac = new MeshBasicMaterial({ map, color: '#c9c9c9' });
  kit.materials.push(tarmac);
  const ground = new Mesh(new CircleGeometry(69, 48), tarmac);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, YARD_LEVEL, wallZ - 30);
  group.add(ground);
  // The dock's outside wall below its floor, down to the tarmac: brick
  // red engineering brick under the openings, the dock's face.
  const brick = new MeshStandardMaterial({ color: '#6b4a3c', roughness: 0.9 });
  kit.materials.push(brick);
  // In pieces, round the channels' openings down to the tarmac.
  const cuts = [...openings].sort((p, q) => p.at - q.at);
  let from = -width / 2 - thickness;
  for (const o of [...cuts, { at: width / 2 + thickness, w: 0 }]) {
    const to = o.at - o.w / 2;
    if (to - from > 0.01) {
      const face = new Mesh(
        new BoxGeometry(to - from, -YARD_LEVEL, thickness),
        brick,
      );
      face.position.set((from + to) / 2, YARD_LEVEL / 2, wallZ + thickness / 2);
      group.add(face);
    }
    from = o.at + o.w / 2;
  }
  return { group };
}
