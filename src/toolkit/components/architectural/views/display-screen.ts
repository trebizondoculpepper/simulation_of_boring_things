import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TextureLoader,
} from 'three';
import type { Texture } from 'three';
import {
  DISPLAY_55,
  cropToFill,
  displaySize,
  pictureSize,
  slideAt,
} from '../logic/display-screen';
import type { Orientation } from '../logic/display-screen';

/**
 * A wall-hung 55-inch display (`../logic/display-screen.ts`), facing +z,
 * its back on the wall at z = 0 and its middle at its origin: a slim
 * black case, its picture self-lit, and a small red status lamp in its
 * bottom right-hand corner. It shows a slideshow if given one, else it is
 * black (off).
 */
export function createDisplayScreen(
  orientation: Orientation = 'portrait',
  slideshow?: Slideshow,
) {
  const group = new Group();
  group.name = `55-inch display (${orientation})`;
  const { w, h } = displaySize(orientation);
  const { depth, bezel } = DISPLAY_55;
  const body = new Mesh(
    new BoxGeometry(w, h, depth),
    new MeshStandardMaterial({ color: '#141516', roughness: 0.5 }),
  );
  body.position.z = depth / 2;
  group.add(body);
  const picture = pictureSize(orientation);
  const screen = new Mesh(
    new PlaneGeometry(picture.w, picture.h),
    slideshow?.material ??
      new MeshStandardMaterial({
        color: '#050607',
        roughness: 0.12,
        metalness: 0.2,
      }),
  );
  screen.name = 'display picture';
  screen.position.z = depth + 0.001;
  screen.userData.live = true;
  if (slideshow) screen.onBeforeRender = slideshow.tick;
  group.add(screen);
  // The status lamp: a red pinpoint in the bezel's bottom right corner.
  const lamp = new Mesh(
    new CylinderGeometry(0.003, 0.003, 0.002, 12),
    new MeshBasicMaterial({ color: '#ff2a1a' }),
  );
  lamp.name = 'display status lamp';
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(w / 2 - bezel / 2, -h / 2 + bezel / 2, depth + 0.001);
  group.add(lamp);
  return group;
}

/** A run of pictures shown on one or more displays, all alike. */
export interface Slideshow {
  material: MeshBasicMaterial;
  /** Brings the picture up to date: each display calls it as it is drawn. */
  tick(): void;
}

/**
 * A slideshow: `urls` in turn, each held `period` seconds by the clock,
 * cropped to fill a picture of `orientation`, self-lit as a screen is.
 * Loaded one ahead; those passed are let go. Until a picture has come, the
 * screen keeps the last one.
 */
export function createSlideshow(
  urls: readonly string[],
  period: number,
  orientation: Orientation = 'portrait',
): Slideshow {
  const material = new MeshBasicMaterial({ color: '#050607' });
  if (typeof Image === 'undefined' || !urls.length)
    return { material, tick: () => {} };
  const loader = new TextureLoader();
  const cache = new Map<number, Texture>();
  const { w, h } = pictureSize(orientation);
  const photo = (i: number) => {
    let tex = cache.get(i);
    if (!tex) {
      tex = loader.load(urls[i], (t) => {
        const img = t.image as { width: number; height: number };
        const crop = cropToFill(img.width / img.height, w / h);
        t.repeat.set(crop.repeat[0], crop.repeat[1]);
        t.offset.set(crop.offset[0], crop.offset[1]);
      });
      tex.colorSpace = SRGBColorSpace;
      cache.set(i, tex);
    }
    return tex;
  };
  let shown = -1;
  const tick = () => {
    const i = slideAt(performance.now() / 1000, urls.length, period);
    if (i === shown) return;
    const next = photo(i);
    if (!next.image) return;
    shown = i;
    material.map = next;
    material.color.set('#ffffff');
    material.needsUpdate = true;
    const ahead = (i + 1) % urls.length;
    photo(ahead);
    for (const [j, tex] of cache)
      if (j !== i && j !== ahead) {
        tex.dispose();
        cache.delete(j);
      }
  };
  return { material, tick };
}
