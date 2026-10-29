import {
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  CircleGeometry,
  BoxGeometry,
} from 'three';
import type { BinShape } from '../logic/bin-toss';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/** The bin's size, metres: across its rim and its foot, and its height. */
const TOP = 0.56;
const FOOT = 0.48;
const HIGH = 0.7;
/** Its walls' thickness. */
const WALL = 0.012;

/** Its inside, for things thrown into it (`bin-toss.ts`). */
export const WASTE_BIN_SHAPE: BinShape = {
  halfX: FOOT / 2 - 0.08,
  halfZ: FOOT / 2 - 0.08,
  floor: 0.04,
  rim: HIGH,
  layer: 0.03,
  heap: 0.08,
};

/**
 * A commercial waste bin, round, grey and moulded (the kind of the
 * Rubbermaid Brute; the owner, 2026-10-29): tapered, with four venting
 * channels down its sides so a full liner lifts out, two handles under
 * its rim, a black liner folded over the rim, and its maker's name
 * moulded on its front. The maker is ours (Rubbermate), as every brand in
 * the game is. Its origin is the middle of its foot; metres.
 */
export function createWasteBin(kit: PanelKit) {
  const group = new Group();
  group.name = 'Waste bin';
  const grey = kitPaint(kit, '#6f7578');
  const bodyMaterial = new MeshStandardMaterial({
    color: '#767c7f',
    roughness: 0.75,
    side: DoubleSide,
  });
  kit.materials.push(bodyMaterial);
  const liner = kitPaint(kit, '#141516');
  // The body: a tapered tub, open at the top, seen inside and out.
  const body = new Mesh(
    new CylinderGeometry(TOP / 2, FOOT / 2, HIGH, 32, 1, true),
    bodyMaterial,
  );
  body.position.y = HIGH / 2;
  group.add(body);
  const floor = new Mesh(new CircleGeometry(FOOT / 2 - WALL, 32), liner);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = WASTE_BIN_SHAPE.floor;
  group.add(floor);
  // The rim, rolled.
  const rim = new Mesh(new TorusGeometry(TOP / 2, 0.014, 8, 40), grey);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = HIGH;
  group.add(rim);
  // The liner, folded over the rim and hanging a hand's breadth down.
  const fold = new Mesh(
    new CylinderGeometry(TOP / 2 + 0.018, TOP / 2 + 0.012, 0.09, 32, 1, true),
    liner,
  );
  fold.position.y = HIGH - 0.035;
  group.add(fold);
  // Four venting channels down its sides, and its foot's ring.
  const slope = Math.atan2((TOP - FOOT) / 2, HIGH);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const r = (TOP + FOOT) / 4 + 0.004;
    const rib = new Mesh(new BoxGeometry(0.045, HIGH * 0.82, 0.016), grey);
    rib.position.set(Math.sin(a) * r, HIGH * 0.45, Math.cos(a) * r);
    rib.rotation.set(0, a, 0);
    rib.rotateX(-slope);
    group.add(rib);
  }
  const foot = new Mesh(new TorusGeometry(FOOT / 2, 0.012, 6, 32), grey);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = 0.012;
  group.add(foot);
  // Two handles under the rim, at its sides.
  for (const side of [-1, 1]) {
    const handle = new Mesh(new BoxGeometry(0.03, 0.035, 0.12), grey);
    handle.position.set(side * (TOP / 2 + 0.012), HIGH - 0.09, 0);
    group.add(handle);
  }
  // The maker's name, moulded on the front.
  const { context: c, texture } = createCanvasTexture(512, 128);
  c.fillStyle = '#767c7f';
  c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#4c5154';
  c.font = 'bold 64px Arial, Helvetica, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('RUBBERMATE', 256, 52, 480);
  c.font = '30px Arial, Helvetica, sans-serif';
  c.fillText('121 L · COMMERCIAL', 256, 104, 480);
  texture.needsUpdate = true;
  kit.textures.push(texture);
  const nameMaterial = new MeshStandardMaterial({
    map: texture,
    roughness: 0.75,
  });
  kit.materials.push(nameMaterial);
  /** The wall's radius at height `y`, and a hair proud of it. */
  const at = (y: number) => FOOT / 2 + ((TOP - FOOT) / 2) * (y / HIGH) + 0.002;
  const nameY = HIGH - 0.2;
  const name = new Mesh(
    new CylinderGeometry(
      at(nameY + 0.05),
      at(nameY - 0.05),
      0.1,
      16,
      1,
      true,
      -0.45,
      0.9,
    ),
    nameMaterial,
  );
  name.position.y = nameY;
  group.add(name);
  return {
    group,
    shape: WASTE_BIN_SHAPE,
    footprint: { x: TOP, z: TOP },
  };
}
