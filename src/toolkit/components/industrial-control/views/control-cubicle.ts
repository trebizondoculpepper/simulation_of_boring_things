import { Group, Mesh, TorusGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import type { BrandId } from '../../core/logic/brands';
import { createPartSet } from '../../core/parts/parts';
import { SWING_HANDLE, swingHandle } from '../../core/parts/swing-handle';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { panelMakerMark } from '../../core/views/panel-maker-mark';

/**
 * A free-standing control cubicle, after the grey switchgear and control
 * panel enclosures in Benfield Control Systems' photographs (see
 * `doc/research/benfield-mimic-annunciator-reference.md`), as Penfold
 * Controls builds them: a light grey powder-coated steel cabinet (RAL
 * 7035) on a black plinth, two hinged doors, each with a swing handle on
 * its free edge driving a three-point latch, lifting eyes on the roof and
 * the maker's badge on each door. Its mimic is drawn straight on the doors:
 * each door's `face` is a group at the door's middle, on its front, for
 * the lamps, switches and line strips mounted through it.
 *
 * In metres: its front's foot at the origin, facing +z.
 */

/** RAL 7035, light grey: the cubicle's powder coat. */
export const PENFOLD_GREY = '#c5c7c4';

export interface CubicleDoor {
  /** Mounting group on the door's front face, at its middle. */
  face: Group;
  width: number;
  height: number;
  handle: ReturnType<typeof swingHandle>;
}

export function createControlCubicle(
  kit: PanelKit,
  {
    width = 1.6,
    height = 2.0,
    depth = 0.5,
    doors: count = 2,
    maker = 'penfold',
    title,
    fascia = 0,
  }: {
    width?: number;
    height?: number;
    depth?: number;
    doors?: number;
    maker?: BrandId;
    /** Engraved on the plate over the doors: "POOL WATER TREATMENT". */
    title?: string;
    /** The height of a fixed panel across the top, over the doors, for a mimic board. */
    fascia?: number;
  } = {},
) {
  const t = tools(kit);
  const livery = brandLivery(kit, maker);
  const group = new Group();
  group.name = `${livery.brand.name} control cubicle`;
  const grey = t.paint(PENFOLD_GREY, 0.55);
  const plinthH = 0.1;
  const body = height - plinthH;
  // The plinth and the carcass.
  t.box(
    group,
    t.paint('#1b1c1d', 0.7),
    width - 0.02,
    plinthH,
    depth - 0.04,
    0,
    plinthH / 2,
    -depth / 2,
  );
  t.box(
    group,
    grey,
    width,
    body,
    depth - 0.02,
    0,
    plinthH + body / 2,
    -depth / 2 - 0.01,
  );
  // The roof's lifting eyes, one at each corner.
  const zinc = t.paint('#b9bdbf', 0.3, 0.8);
  for (const x of [-width / 2 + 0.08, width / 2 - 0.08])
    for (const z of [-0.08, -depth + 0.08]) {
      const eye = new Mesh(new TorusGeometry(0.022, 0.006, 8, 16), zinc);
      eye.position.set(x, height + 0.026, z);
      group.add(eye);
      t.cyl(group, zinc, 0.012, 0.008, x, height + 0.004, z, 'y', 12);
    }
  // The doors, each a leaf proud of the frame with a gap round it.
  const parts = createPartSet();
  const frame = 0.03;
  const leafW = (width - frame * 2 - (count - 1) * 0.004) / count;
  const leafH = body - frame * 2 - (fascia ? fascia + frame : 0);
  const doors: CubicleDoor[] = [];
  for (let i = 0; i < count; i++) {
    const x = -width / 2 + frame + leafW / 2 + i * (leafW + 0.004);
    const y = plinthH + frame + leafH / 2;
    t.box(
      group,
      t.paint('#3a3c3d', 0.8),
      leafW + 0.003,
      leafH + 0.003,
      0.001,
      x,
      y,
      0.0005,
    );
    t.box(group, grey, leafW, leafH, 0.02, x, y, 0.01);
    const face = new Group();
    face.position.set(x, y, 0.02);
    group.add(face);
    // Its hinges on the outer edge; the handle on the free edge, at
    // about 1.1 m from the floor.
    const hingeSide = count === 1 ? -1 : i < count / 2 ? -1 : 1;
    for (const hy of [-leafH / 2 + 0.2, 0, leafH / 2 - 0.2])
      t.cyl(
        face,
        t.paint('#2b2c2d', 0.5),
        0.008,
        0.08,
        hingeSide * (leafW / 2 + 0.006),
        hy,
        -0.004,
        'y',
        10,
      );
    const handle = parts.add(
      swingHandle(kit, { name: `Door ${i + 1} handle` }),
    );
    // At about 1.1 m, or as high as a low door allows.
    const handleY = Math.min(
      1.1 - y,
      leafH / 2 - SWING_HANDLE.housing / 2 - 0.08,
    );
    handle.object.position.set(
      -hingeSide * (leafW / 2 - SWING_HANDLE.width / 2 - 0.04),
      handleY,
      0,
    );
    face.add(handle.object);
    // The maker's mark, top right of the last door.
    if (i === count - 1)
      panelMakerMark(kit, face, {
        width: leafW,
        height: leafH,
        z: 0,
        maker,
        size: 0.022,
        inset: 0.04,
      });
    doors.push({ face, width: leafW, height: leafH, handle });
  }
  // The fixed top panel, flush with the doors.
  const fasciaFace = new Group();
  if (fascia) {
    const y = height - frame - fascia / 2;
    t.box(
      group,
      t.paint('#3a3c3d', 0.8),
      width - frame * 2 + 0.003,
      fascia + 0.003,
      0.001,
      0,
      y,
      0.0005,
    );
    t.box(group, grey, width - frame * 2, fascia, 0.02, 0, y, 0.01);
    fasciaFace.position.set(0, y, 0.02);
    group.add(fasciaFace);
  }
  if (title) {
    const plate = createEngravedPlate(kit, [title], {
      colour: 'white',
      width: Math.min(1.1, width - 0.2),
      height: 0.07,
    });
    plate.position.set(0, height - 0.12, 0.022);
    group.add(plate);
  }
  return { group, doors, parts, fasciaFace };
}
