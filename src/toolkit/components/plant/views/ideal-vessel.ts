import { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { plantTools } from './plant-tools';

/**
 * An ideal vessel (mission 106): the idealised pool or balance tank of a
 * working schematic, a perfect store of water whose level and temperature
 * are the model's, drawn as what it is, not as a real pool: an open-topped
 * box in the experimental sources' livery (white, with the blue band and
 * IDEAL in stencil), its water standing at the model's level inside, a
 * flanged nozzle at each of its ports, and a backlit display on a post
 * saying what it holds. `show` writes the display only when its lines
 * change.
 *
 * In its own frame: on the floor (y = 0), `w` along x and `d` along z, its
 * front toward +z.
 */
export function createIdealVessel(
  kit: PanelKit,
  {
    w,
    d,
    h,
    water,
    name,
    ports,
  }: {
    w: number;
    d: number;
    h: number;
    /** Its water's level, m above the floor. */
    water: number;
    name: string;
    /** Each port: where its flange is, the way it faces, and its pipe's outside diameter. */
    ports: readonly {
      at: readonly [number, number, number];
      out: readonly [number, number, number];
      od: number;
    }[];
  },
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = name;
  const white = t.paint('#eef0ee', 0.45);
  const blue = t.paint('#1f5fa6', 0.45);
  const wall = 0.08;
  // Four walls and a floor, open at the top.
  t.box(group, white, w, 0.1, d, 0, 0.05, 0);
  t.box(group, white, w, h, wall, 0, h / 2, d / 2 - wall / 2);
  t.box(group, white, w, h, wall, 0, h / 2, -d / 2 + wall / 2);
  t.box(group, white, wall, h, d, w / 2 - wall / 2, h / 2, 0);
  t.box(group, white, wall, h, d, -w / 2 + wall / 2, h / 2, 0);
  // The band round its top, and its cap.
  for (const [bw, bd, z, x] of [
    [w + 0.01, 0.01, d / 2 + 0.005, 0],
    [w + 0.01, 0.01, -d / 2 - 0.005, 0],
    [0.01, d + 0.01, 0, w / 2 + 0.005],
    [0.01, d + 0.01, 0, -w / 2 - 0.005],
  ] as const)
    t.box(group, blue, bw, 0.14, bd, x, h - 0.16, z);
  t.box(group, t.paint('#d9dcd9', 0.4), w + 0.02, 0.03, d + 0.02, 0, h, 0);
  // Its water, standing at the model's level: a still surface.
  const surface = new MeshStandardMaterial({
    color: '#2f8fc9',
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  kit.materials.push(surface);
  const top = new Mesh(new PlaneGeometry(w - 2 * wall, d - 2 * wall), surface);
  top.rotation.x = -Math.PI / 2;
  top.position.y = Math.min(water, h - 0.05);
  group.add(top);
  // The stencilled IDEAL and its name on its front.
  const front = t.printed(
    Math.min(w * 0.9, 2.4),
    0.5,
    (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch);
      c.fillStyle = '#1f5fa6';
      c.textAlign = 'center';
      c.font = `bold ${ch * 0.44}px ${SANS}`;
      c.fillText('IDEAL', cw / 2, ch * 0.45);
      c.font = `bold ${ch * 0.2}px ${SANS}`;
      c.fillStyle = '#16191b';
      c.fillText(name.toUpperCase(), cw / 2, ch * 0.82);
    },
    512,
  );
  (front.mesh.material as { transparent?: boolean }).transparent = true;
  front.mesh.position.set(0, h * 0.55, d / 2 + 0.003);
  group.add(front.mesh);
  // Its nozzles.
  const grey = t.paint('#55616a', 0.5);
  for (const p of ports) {
    const len = 0.12;
    const axis =
      Math.abs(p.out[0]) > 0.5 ? 'x' : Math.abs(p.out[1]) > 0.5 ? 'y' : 'z';
    const mid = [0, 1, 2].map((k) => p.at[k] - (p.out[k] * len) / 2) as [
      number,
      number,
      number,
    ];
    t.cyl(group, grey, p.od / 2 + 0.008, len, ...mid, axis, 20);
    t.cyl(group, grey, p.od / 2 + 0.04, 0.02, ...p.at, axis, 20);
  }
  // The display on a post at its front right corner.
  const steel = t.paint('#55616a', 0.5);
  const postX = w / 2 - 0.3;
  const postZ = d / 2 + 0.25;
  t.box(group, steel, 0.06, 1.3, 0.06, postX, 0.65, postZ);
  t.box(
    group,
    t.paint('#31383b', 0.55),
    0.56,
    0.2,
    0.04,
    postX,
    1.4,
    postZ + 0.04,
  );
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.0105,
    backlight: true,
  });
  lcd.group.position.set(postX, 1.4, postZ + 0.062);
  group.add(lcd.group);
  const label = createMicroLabel(kit, name.toUpperCase(), {
    height: 0.024,
    maxWidth: 0.54,
    ink: '#f2f2ea',
    plate: '#25343a',
  });
  label.position.set(postX, 1.55, postZ + 0.062);
  group.add(label);
  let shown = '';
  return {
    group,
    /** Its display's two lines. */
    show(lines: readonly string[]) {
      const key = lines.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show([...lines]);
    },
  };
}
