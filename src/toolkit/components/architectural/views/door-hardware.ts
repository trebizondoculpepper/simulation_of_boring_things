import { createLabelTexture } from '../../core/views/screens';
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';

/** Rounded stainless commercial door furniture; dimensions are metres. */
export function createDoorHardware(
  kit: PanelKit,
  kind: 'lever' | 'pull' | 'panic',
) {
  const group = new Group();
  group.name = `Industrial ${kind} door hardware`;
  const steel = kitPaint(kit, '#b9c0c2', 0.8),
    dark = kitPaint(kit, '#4b5358', 0.3);
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m = steel,
  ) => {
    const o = new Mesh(new BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  const disc = (r: number, h: number, x: number, y: number, z: number) => {
    const o = new Mesh(new CylinderGeometry(r, r, h, 24), steel);
    o.rotation.x = Math.PI / 2;
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  const tube = (points: number[][], radius: number) => {
    const curve = new CatmullRomCurve3(
      points.map((p) => new Vector3(...(p as [number, number, number]))),
    );
    const o = new Mesh(new TubeGeometry(curve, 24, radius, 10, false), steel);
    group.add(o);
    return o;
  };
  if (kind === 'lever') {
    // ARRONE AR361-type 19 mm tubular return-to-door lever on a round rose.
    disc(0.026, 0.008, 0, 0, 0.004);
    disc(0.011, 0.04, 0, 0, 0.027);
    tube(
      [
        [0, 0, 0.047],
        [-0.025, -0.005, 0.055],
        [-0.08, -0.01, 0.055],
        [-0.12, -0.01, 0.05],
        [-0.13, -0.01, 0.027],
      ],
      0.0095,
    );
    disc(0.019, 0.006, 0, -0.065, 0.004);
    box(0.004, 0.014, 0.002, 0, -0.065, 0.008, dark);
    for (const y of [-0.018, 0.018]) disc(0.0018, 0.001, 0, y, 0.009);
  } else if (kind === 'pull') {
    // 300 mm centres and 19 mm tube, after ARRONE straight pull furniture.
    for (const y of [-0.15, 0.15]) disc(0.018, 0.006, 0, y, 0.003);
    tube(
      [
        [0, -0.15, 0.01],
        [0, -0.15, 0.04],
        [0, -0.125, 0.055],
        [0, 0.125, 0.055],
        [0, 0.15, 0.04],
        [0, 0.15, 0.01],
      ],
      0.0095,
    );
  } else {
    // Briton 378M-type silver rim panic latch, site-cut tubular crossbar.
    box(0.055, 0.165, 0.037, -0.43, 0, 0.02);
    box(0.055, 0.148, 0.037, 0.43, 0, 0.02);
    box(0.038, 0.04, 0.016, 0.466, 0, 0.022, dark);
    tube(
      [
        [-0.43, 0, 0.04],
        [-0.4, -0.015, 0.075],
        [0, -0.015, 0.075],
        [0.4, -0.015, 0.075],
        [0.43, 0, 0.04],
      ],
      0.01,
    );
    const art = createLabelTexture('PUSH BAR TO OPEN', {
      ink: '#fffdf0',
      plate: '#267d42',
    });
    kit.textures.push(art.texture);
    const material = new MeshBasicMaterial({ map: art.texture });
    kit.materials.push(material);
    const label = new Mesh(new PlaneGeometry(0.5, 0.035), material);
    label.raycast = () => {};
    label.position.set(0, -0.1, 0.008);
    group.add(label);
  }
  return group;
}

export function installDoorHardware(
  kit: PanelKit,
  parent: Object3D,
  kind: 'lever' | 'pull' | 'panic',
  x: number,
  y: number,
  z: number,
) {
  const hardware = createDoorHardware(kit, kind);
  hardware.position.set(x, y, z);
  parent.add(hardware);
  return hardware;
}
