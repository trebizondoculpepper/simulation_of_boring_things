import { CylinderGeometry, Group, Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';

/**
 * Passive sampling connection: a bolted PP saddle on a horizontal PVC main,
 * with a threaded reducing boss and compression nut around the rising tube.
 * Based on GF's threaded clamp saddles; dimensions are a simplified assembly,
 * not a manufacturer's drawing. Origin is the main's centre, axis along x.
 */
export function createSampleTakeoff(
  kit: PanelKit,
  mainOd: number,
  tubeOd: number,
) {
  const group = new Group();
  group.name = 'Certikind sampling saddle and compression connector';
  const t = tools(kit);
  const pp = t.paint('#284b69', 0.65);
  const steel = t.paint('#afb8bb', 0.3, 0.75);
  const r = mainOd / 2;
  const length = 0.065;
  // Open ends leave the existing main visible, with no coincident surfaces.
  const collar = new Mesh(
    new CylinderGeometry(r + 0.006, r + 0.006, length, 24, 1, true),
    pp,
  );
  collar.rotation.z = Math.PI / 2;
  group.add(collar);
  for (const side of [-1, 1]) {
    t.box(group, pp, length, 0.014, 0.025, 0, 0, side * (r + 0.008));
    for (const x of [-0.022, 0.022]) {
      t.cyl(group, steel, 0.003, 0.028, x, 0, side * (r + 0.008));
      t.cyl(group, steel, 0.005, 0.005, x, 0.012, side * (r + 0.008), 'y', 6);
    }
  }
  // The tube passes through both fittings into the main; these surround it.
  t.cyl(group, pp, 0.018, 0.03, 0, r + 0.015);
  t.cyl(group, steel, 0.013, 0.016, 0, r + 0.034, 0, 'y', 6);
  t.cyl(group, steel, tubeOd / 2 + 0.004, 0.012, 0, r + 0.048, 0, 'y', 6);
  t.label(group, 'CERTIKIND', 0, r * 0.45, r + 0.009, 0.006, '#e9eef1');
  return group;
}
