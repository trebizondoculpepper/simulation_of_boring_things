import {
  CylinderGeometry,
  Group,
  Mesh,
  Object3D,
  RepeatWrapping,
  RingGeometry,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createCanvasTexture } from '../../core/views/screens';

/**
 * Water falling from an open pipe end into water below: a column the
 * width the flow gives it, narrowing a little as it falls and speeds up,
 * its streaks running down it as falling water's do, and the white of its
 * splash where it lands. Its own frame: the pipe's end at the origin.
 * `set` takes the flow as a share of the pipe's full flow (0 dry) and how
 * far it falls; `foot` is where it lands, for the water it stirs
 * (`disturbed-water.ts`).
 */
export function createFallingWater(kit: PanelKit, radius: number) {
  const group = new Group();
  group.name = 'Falling water';
  group.userData.live = true;
  // The streaks: pale vertical runs, broken, on a clear ground; tiled
  // round and down the column and run downward as it falls.
  const { context: c, texture } = createCanvasTexture(64, 128);
  c.fillStyle = 'rgba(206,228,232,0.6)';
  c.fillRect(0, 0, 64, 128);
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let k = 0; k < 40; k++) {
    const x = rand() * 64;
    const y = rand() * 128;
    const h = 20 + rand() * 60;
    c.fillStyle = `rgba(252,254,254,${0.6 + rand() * 0.4})`;
    c.fillRect(x, y, 1 + rand() * 2.5, h);
    // Tiled down the column: a streak running off the bottom comes in at the top.
    c.fillRect(x, y - 128, 1 + rand() * 2.5, h);
  }
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const water = createPs1Material({
    color: '#e4f2f3',
    map: texture,
    transparent: true,
    opacity: 0.9,
    roughness: 0.1,
    depthWrite: false,
  });
  const foam = createPs1Material({
    color: '#f4fbfb',
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  kit.materials.push(water, foam);
  // Narrower at its foot than at the pipe, as it speeds up falling.
  const column = new Mesh(new CylinderGeometry(1, 0.78, 1, 14, 1, true), water);
  column.userData.live = true;
  group.add(column);
  const splash = new Mesh(new RingGeometry(0.3, 1, 20), foam);
  splash.rotation.x = -Math.PI / 2;
  splash.userData.live = true;
  group.add(splash);
  const foot = new Object3D();
  foot.name = 'Falling water foot';
  group.add(foot);
  let time = 0;
  let share = 0;
  let fall = 1;
  return {
    group,
    /** Where it lands. */
    foot,
    /** How much is falling, 0 to 1. */
    share: () => share,
    set(flowShare: number, drop: number) {
      share = Math.max(0, Math.min(1, flowShare));
      fall = Math.max(0.01, drop);
    },
    update(delta: number) {
      time += delta;
      const on = share > 0.002;
      column.visible = splash.visible = on;
      foot.position.y = -fall;
      if (!on) return;
      const r = radius * (0.3 + 0.7 * Math.sqrt(share));
      column.scale.set(r, fall, r);
      column.position.y = -fall / 2;
      // Its streaks running down, faster than walking pace, a few times round.
      texture.repeat.set(2, Math.max(1, fall * 1.5));
      texture.offset.y = (time * 2.4) % 1;
      const s =
        r * (2.2 + 0.35 * Math.sin(time * 9) + 0.2 * Math.sin(time * 23));
      splash.scale.set(s, s, 1);
      splash.position.y = -fall + 0.005;
      foam.opacity = 0.6 + 0.2 * Math.sin(time * 17);
    },
  };
}
