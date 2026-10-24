import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Material, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { BUSBAR_TAP_OFF } from '../logic/enclosures';

/**
 * Voltara's plug-in tap-off unit for its busbar trunking, after the
 * cable-outlet units of Schneider's Canalis KS and Eaton's plug-in bus
 * (`BUSBAR_TAP_OFF`): a grey steel box hung under the bar, its plug-in
 * head on its top engaging one of the bar's outlets, its clamp lugs
 * gripping the bar's casing either side, its outgoing cable's gland on
 * its foot. Nothing in it switches: the circuit it feeds is protected by
 * the switch-fuse its cable runs down to. Its lid carries the maker's
 * badge, a 400 V warning and an engraved legend saying what it feeds.
 *
 * Its back on the wall at z = 0, its middle at y = 0, its front toward +z,
 * its width along the wall (x); the bar runs along x over it, its middle
 * `d / 2` out from the wall.
 */
export function createBusbarTapOff(
  kit: PanelKit,
  {
    rating = '63 A',
    legend = 'TAP-OFF',
    bar = 0.1,
  }: {
    rating?: string;
    legend?: string;
    /** The bar's width, m: the clamp lugs reach up its sides. */
    bar?: number;
  } = {},
) {
  const { w, h, d, gland } = BUSBAR_TAP_OFF;
  const group = new Group();
  group.name = 'Busbar tap-off unit';
  const livery = brandLivery(kit, 'voltara');
  const paint = (color: string, roughness = 0.5, metalness = 0.35) => {
    const m = new MeshStandardMaterial({ color, roughness, metalness });
    kit.materials.push(m);
    return m;
  };
  const box = (
    parent: Object3D,
    m: Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const label = (
    text: string,
    height: number,
    x: number,
    y: number,
    ink = '#1d1e1f',
    plate: string | null = null,
  ) => {
    const mesh = createMicroLabel(kit, text, { height, ink, plate });
    mesh.position.set(x, y, d + 0.0012);
    group.add(mesh);
    return mesh;
  };
  const grey = paint('#a9aca6', 0.55, 0.35);
  const seam = paint('#5c6062', 0.6, 0.3);
  const dark = paint('#2b2c2d', 0.6, 0.2);
  const yellow = paint('#f0c419', 0.6, 0.1);
  // Its body, and its lid's seam round its front.
  box(group, grey, w, h, d, 0, 0, d / 2);
  box(group, seam, w + 0.004, 0.006, d + 0.004, 0, h / 2 - 0.03, d / 2);
  // Its plug-in head on its top, up into the bar's outlet; its clamp lugs
  // up either side of the bar's casing.
  box(group, dark, 0.09, 0.02, 0.06, 0, h / 2 + 0.01, d / 2);
  for (const side of [-1, 1])
    box(
      group,
      seam,
      0.03,
      bar * 0.6,
      0.012,
      side * (w / 2 - 0.025),
      h / 2 + (bar * 0.6) / 2,
      d / 2 + side * (bar / 2 + 0.006),
    );
  // Its outgoing cable's gland, on its foot, 5 cm out from the wall.
  const g = new Mesh(
    new CylinderGeometry(0.017, 0.019, gland.h, 6),
    paint('#3a3c3d', 0.5, 0.5),
  );
  g.position.set(0, -h / 2 - gland.h / 2, 0.05);
  group.add(g);
  // Its badge, its warning, what it feeds and its rating.
  const badge = livery.badge(0.02);
  badge.position.set(-w / 2 + 0.045, h / 2 - 0.05, d + 0.001);
  group.add(badge);
  box(group, yellow, 0.04, 0.035, 0.002, w / 2 - 0.035, h / 2 - 0.055, d);
  label('400V', 0.008, w / 2 - 0.035, h / 2 - 0.06);
  label(legend, 0.014, 0, -0.03, '#f2f1ea', '#1d1e1f');
  label(`PLUG-IN TAP-OFF  ${rating}`, 0.008, 0, -0.07);
  return group;
}
