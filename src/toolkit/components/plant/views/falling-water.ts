import { CylinderGeometry, Group, Mesh, RingGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPs1Material } from '../../core/parts/ps1-material';

/**
 * Water falling from an open pipe end into water below: a column the
 * width the flow gives it, and the white of its splash where it lands.
 * Its own frame: the pipe's end at the origin. `set` takes the flow as a
 * share of the pipe's full flow (0 dry) and how far it falls.
 */
export function createFallingWater(kit: PanelKit, radius: number) {
  const group = new Group();
  group.name = 'Falling water';
  group.userData.live = true;
  const water = createPs1Material({
    color: '#d6ecef',
    transparent: true,
    opacity: 0.55,
    roughness: 0.1,
    depthWrite: false,
  });
  const foam = createPs1Material({
    color: '#f4fbfb',
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  kit.materials.push(water, foam);
  const column = new Mesh(new CylinderGeometry(1, 1, 1, 14, 1, true), water);
  column.userData.live = true;
  group.add(column);
  const splash = new Mesh(new RingGeometry(0.3, 1, 20), foam);
  splash.rotation.x = -Math.PI / 2;
  splash.userData.live = true;
  group.add(splash);
  let time = 0;
  let share = 0;
  let fall = 1;
  return {
    group,
    set(flowShare: number, drop: number) {
      share = Math.max(0, Math.min(1, flowShare));
      fall = Math.max(0.01, drop);
    },
    update(delta: number) {
      time += delta;
      const on = share > 0.002;
      column.visible = splash.visible = on;
      if (!on) return;
      const r = radius * (0.3 + 0.7 * Math.sqrt(share));
      column.scale.set(r, fall, r);
      column.position.y = -fall / 2;
      const s = r * (2.2 + 0.25 * Math.sin(time * 9));
      splash.scale.set(s, s, 1);
      splash.position.y = -fall + 0.005;
      water.opacity = 0.45 + 0.1 * Math.sin(time * 13);
    },
  };
}
