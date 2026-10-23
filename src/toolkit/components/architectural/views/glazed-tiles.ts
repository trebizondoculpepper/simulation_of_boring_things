import { RepeatWrapping } from 'three';
import type { Texture } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Glazed wall tiles, as a texture: square tiles in their grout, each a
 * shade of its own, four by four to the texture, which repeats. `repeat`
 * sets it to tile a surface `w` by `h` metres at `tile` metres a tile.
 */
export function glazedTiles(
  kit: PanelKit,
  {
    colour = '#eef1ee',
    grout = '#b9c1bf',
  }: { colour?: string; grout?: string } = {},
) {
  const px = 256;
  const n = 4;
  const { context: c, texture } = createCanvasTexture(px, px);
  c.fillStyle = grout;
  c.fillRect(0, 0, px, px);
  const cell = px / n;
  let seed = 3;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      c.fillStyle = colour;
      c.globalAlpha = 1;
      c.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
      // Each tile a little lighter or darker than the next.
      c.fillStyle = rand() < 0.5 ? '#ffffff' : '#000000';
      c.globalAlpha = rand() * 0.05;
      c.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
    }
  c.globalAlpha = 1;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  kit.textures.push(texture);
  return {
    texture,
    /** This texture, cloned to tile a surface `w` by `h` metres. */
    repeat(w: number, h: number, tile = 0.15): Texture {
      const t = texture.clone();
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(w / (tile * n), h / (tile * n));
      t.needsUpdate = true;
      kit.textures.push(t);
      return t;
    },
  };
}
