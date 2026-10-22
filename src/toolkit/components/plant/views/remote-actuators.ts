import { Group, MeshBasicMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/** Trial motor actuators: physical service body, separate powered head and position feedback. */
export function createRemoteValve(kit: PanelKit, medium: 'gas' | 'water') {
  const t = tools(kit);
  const group = new Group();
  group.name =
    medium === 'gas'
      ? 'Brass gas safety shutoff with motor head'
      : 'Brass motorized water valve';
  const brass = t.paint('#ad8b4d', 0.48, 0.55);
  const blue = t.paint(medium === 'gas' ? '#4c92ba' : '#51a5c4', 0.6);
  const dark = t.paint('#25343a', 0.5);
  t.cyl(group, brass, 0.12, 0.52, 0, 0.74, 0, 'x', 16);
  for (const x of [-0.25, 0.25])
    t.cyl(group, brass, 0.17, 0.06, x, 0.74, 0, 'x', 16);
  t.cyl(group, dark, 0.09, 0.09, 0, 0.9, 0, 'y', 12);
  t.box(group, blue, 0.48, 0.28, 0.37, 0, 1.12, 0);
  t.box(group, blue, 0.33, 0.09, 0.29, 0, 1.3, 0);
  t.cyl(group, dark, 0.035, 0.07, 0, 1.15, -0.22, 'z', 12);
  const maker = createMicroLabel(
    kit,
    medium === 'gas' ? 'GAS-SAFE  NC' : 'AQUAVOLT  2-WAY',
    {
      height: 0.018,
      ink: '#f5f6ed',
      plate: '#25343a',
      maxWidth: 0.35,
    },
  );
  maker.position.set(0, 1.13, 0.195);
  group.add(maker);
  const lamp = new MeshBasicMaterial({ color: '#7c2520' });
  kit.materials.push(lamp);
  const indicator = t.cyl(group, lamp, 0.018, 0.006, 0.16, 1.27, 0.19, 'z', 12);
  indicator.userData.live = true;
  return {
    group,
    show(open: boolean) {
      lamp.color.set(open ? '#50d879' : '#d24a38');
    },
  };
}

/** A motor-operated breaker; its auxiliary motor feed is distinct from the switched supply. */
export function createRemoteBreaker(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Voltara motor-operated breaker';
  const shell = t.paint('#353d42', 0.62);
  const face = t.paint('#c9c7ba', 0.7);
  t.box(group, shell, 0.46, 0.72, 0.27, 0, 0.88, 0);
  t.box(group, face, 0.35, 0.51, 0.012, 0, 0.94, 0.145);
  const title = createMicroLabel(kit, 'VOLTARA\nMOTOR BREAKER', {
    height: 0.018,
    ink: '#21292d',
    maxWidth: 0.3,
  });
  title.position.set(0, 1.09, 0.155);
  group.add(title);
  const lamp = new MeshBasicMaterial({ color: '#7c2520' });
  kit.materials.push(lamp);
  const indicator = t.cyl(group, lamp, 0.025, 0.008, 0, 0.89, 0.16, 'z', 12);
  indicator.userData.live = true;
  const status = createMicroLabel(kit, 'CLOSED / OPEN', {
    height: 0.014,
    ink: '#263238',
    maxWidth: 0.26,
  });
  status.position.set(0, 0.79, 0.155);
  group.add(status);
  return {
    group,
    show(closed: boolean) {
      lamp.color.set(closed ? '#50d879' : '#d24a38');
    },
  };
}
