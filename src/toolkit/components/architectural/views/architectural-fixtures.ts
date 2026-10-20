import { createFloorCableProtector } from './floor-cable-protector';
import { installDoorHardware } from './door-hardware';
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  LineCurve3,
  Vector3,
} from 'three';
import { Color } from 'three';
import type { Material, MeshBasicMaterial, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import type { ArchitecturalKind } from '../logic/architectural-fittings';

/** A lit luminaire lens's colour at full brightness. */
const LENS = new Color();

/** Catalogue-sized passive building fittings, shared by installed rooms and galleries. */
export function createArchitecturalFixture(
  kit: PanelKit,
  kind: ArchitecturalKind,
  legend = '',
  length = 3,
) {
  const group = new Group();
  const steel = kitPaint(kit, '#aeb5b4', 0.45),
    dark = kitPaint(kit, '#3c4548'),
    pale = kitPaint(kit, '#d0d5d2');
  const box = (
    parent: Object3D,
    m: Material,
    w: number,
    h: number,
    d: number,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const label = (
    text: string,
    x: number,
    y: number,
    z: number,
    height = 0.012,
    width = 1,
  ) => {
    const mark = createMicroLabel(kit, text, {
      height,
      maxWidth: width,
      ink: '#f5f6ed',
    });
    mark.position.set(x, y, z);
    group.add(mark);
  };
  let lens: Mesh | undefined;
  let lensOn: MeshBasicMaterial | undefined;
  let lensOff: Material | undefined;
  if (kind === 'cableprotector') {
    group.add(
      createFloorCableProtector(
        kit,
        new LineCurve3(
          new Vector3(-length / 2, 0, 0),
          new Vector3(length / 2, 0, 0),
        ),
      ),
    );
  } else if (kind === 'lever' || kind === 'pull' || kind === 'panic') {
    installDoorHardware(kit, group, kind, 0, 0, 0);
  } else if (kind === 'pipe') {
    const tube = new Mesh(
      new CylinderGeometry(0.021, 0.021, length, 12),
      steel,
    );
    group.add(tube);
    for (const y of [-length / 2 + 0.025, length / 2 - 0.025]) {
      const coupling = new Mesh(
        new CylinderGeometry(0.027, 0.027, 0.045, 12),
        steel,
      );
      coupling.position.y = y;
      group.add(coupling);
    }
  } else if (kind === 'luminaire') {
    box(group, pale, 1.6, 0.09, 0.09);
    lensOn = kitGlow(kit, '#edf1e5');
    LENS.copy(lensOn.color);
    lensOff = kitPaint(kit, '#b7bdb2');
    lens = box(group, lensOn, 1.55, 0.025, 0.08, 0, -0.05, 0);
    // Lit by changing its paint: not merged with the still parts.
    lens.userData.live = true;
    for (const x of [-0.69, 0.69])
      box(group, steel, 0.025, 0.035, 0.1, x, -0.025, 0);
  } else if (kind === 'heater') {
    box(group, steel, 1.52, 0.064, 0.282);
    for (const z of [-0.07, 0.07])
      box(group, dark, 1.47, 0.012, 0.12, 0, -0.038, z);
    for (const x of [-0.55, 0.55])
      box(group, steel, 0.04, 0.18, 0.04, x, 0.12, 0);
  } else if (kind === 'grille') {
    box(group, dark, 1.2, 0.6, 0.055, 0, 0, 0.025);
    for (const x of [-0.615, 0.615])
      box(group, steel, 0.03, 0.66, 0.04, x, 0, 0.06);
    for (const y of [-0.315, 0.315])
      box(group, steel, 1.26, 0.03, 0.04, 0, y, 0.06);
    for (let y = -0.27; y <= 0.27; y += 0.04)
      box(group, steel, 1.2, 0.018, 0.035, 0, y, 0.065);
  } else if (kind === 'ladder') {
    for (const x of [-0.15, 0.15]) box(group, steel, 0.025, 0.1, 3, x, 0, 0);
    for (let z = -1.35; z < 1.5; z += 0.3)
      box(group, steel, 0.3, 0.021, 0.042, 0, -0.035, z);
  } else if (kind === 'conduit') {
    box(group, steel, 0.02, 1, 0.02, 0, 0.5, 0.02);
    for (const y of [0.12, 0.85])
      box(group, steel, 0.05, 0.025, 0.035, 0, y, 0.025);
  } else if (kind === 'utilitydoor' || kind === 'escapedoor') {
    const leaf = kitPaint(kit, '#727f88', 0.25);
    box(group, leaf, 1.1, 2.13, 0.045, 0, 1.065, 0.04);
    for (const x of [-0.59, 0.59])
      box(group, steel, 0.07, 2.2, 0.11, x, 1.1, 0.04);
    box(group, steel, 1.25, 0.07, 0.11, 0, 2.22, 0.04);
    box(group, steel, 1.05, 0.3, 0.012, 0, 0.19, 0.07);
    box(group, dark, 0.18, 0.76, 0.015, -0.22, 1.15, 0.07);
    installDoorHardware(
      kit,
      group,
      kind === 'escapedoor' ? 'panic' : 'lever',
      kind === 'escapedoor' ? 0 : 0.43,
      1.05,
      0.064,
    );
    label(legend, 0, 1.75, 0.073, 0.045);
  } else if (kind === 'loadingdoor') {
    for (const x of [-3.08, 3.08])
      box(group, steel, 0.16, 5.2, 0.16, x, 2.6, 0.1);
    box(group, steel, 6.4, 0.2, 0.22, 0, 5.15, 0.15);
    for (let i = 0; i < 4; i++) {
      const x = -2.25 + i * 1.5;
      box(group, steel, 1.488, 5, 0.055, x, 2.5, 0.09);
      for (const y of [0.08, 2.5, 4.92])
        box(group, steel, 1.44, 0.065, 0.055, x, y, 0.14);
      for (const dx of [-0.7, 0.7])
        box(group, steel, 0.055, 4.9, 0.04, x + dx, 2.5, 0.14);
      for (const y of [0.5, 2.5, 4.5])
        box(group, dark, 0.045, 0.16, 0.055, x - 0.75, y, 0.16);
    }
    for (const x of [-0.17, 0.17]) {
      installDoorHardware(kit, group, 'pull', x, 1.15, 0.13);
      box(group, steel, 0.018, 4.65, 0.025, x, 2.45, 0.19);
    }
  } else if (kind === 'testvalve') {
    box(group, steel, 0.055, 0.13, 0.055, 0, 0, 0.04);
    box(group, dark, 0.025, 0.08, 0.02, 0, 0.06, 0.08);
    const wheel = box(
      group,
      kitPaint(kit, '#cf7b20'),
      0.13,
      0.024,
      0.025,
      0,
      0,
      0.1,
    );
    label('ALARM TEST', 0, -0.11, 0.07, 0.012, 0.25);
    return {
      group,
      actuator: wheel,
      set(on: boolean | number) {
        wheel.rotation.z = on ? Math.PI / 2 : 0;
      },
    };
  }
  return {
    group,
    actuator: undefined,
    /** Lit or not, or how brightly, 0 to 1 (a luminaire's lens). */
    set(on: boolean | number) {
      if (!lens) return;
      const level = typeof on === 'number' ? on : on ? 1 : 0;
      lens.material = level > 0 ? lensOn! : lensOff!;
      if (level > 0) lensOn!.color.copy(LENS).multiplyScalar(0.2 + 0.8 * level);
    },
  };
}
