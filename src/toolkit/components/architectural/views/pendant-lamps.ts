import {
  BackSide,
  BufferGeometry,
  Color,
  CylinderGeometry,
  FrontSide,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { buildTiled } from '../../core/views/instancer';

/**
 * Industrial pendant lamps after Lamp Copper's "Astra Vintage Industrial
 * Brilliant Pendant Light" (lampcopper.com; iron body, aluminium fittings,
 * hung on chain): a chamfered square cast gear housing with a flanged
 * band, a round collar, a weathered iron dome like a jet engine's nozzle,
 * copper-coloured inside, and a wire guard cage under the bulb. Their
 * model F is 80 cm across and 80 cm tall; `size` scales from that.
 *
 * Every lamp's parts are drawn as instanced meshes, a few draw calls for
 * the whole hall. Built in metres.
 */

export interface PendantPlace {
  x: number;
  z: number;
  /** The height of the dome's rim. */
  y: number;
  /** The height the chain hangs from. */
  top: number;
  /** The lamp's diameter, metres: 0.8 for model F, 0.6 for model E. */
  size: number;
}

export function createPendantLamps(
  places: readonly PendantPlace[],
  bulbGlow: MeshBasicMaterial,
) {
  const group = new Group();
  group.name = 'Pendant lamps';
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const iron = new MeshStandardMaterial({
    color: '#6d6a64',
    roughness: 0.62,
    metalness: 0.7,
    side: FrontSide,
  });
  const castIron = new MeshStandardMaterial({
    color: '#5e5c58',
    roughness: 0.7,
    metalness: 0.6,
  });
  const wire = new MeshStandardMaterial({
    color: '#3f3a34',
    roughness: 0.6,
    metalness: 0.6,
  });
  const chain = new MeshStandardMaterial({
    color: '#8b8d8f',
    roughness: 0.4,
    metalness: 0.8,
  });
  // The dome's copper lining, lit by the bulb: brightened with the lamps.
  const lining = new MeshBasicMaterial({
    color: new Color(1.2, 0.62, 0.3),
    side: BackSide,
  });
  lining.toneMapped = false;
  materials.push(iron, castIron, wire, chain, lining);

  /** Instances of one part, by a transform for each lamp. */
  const parts: {
    geometry: BufferGeometry;
    material: Material;
    matrices: Matrix4[];
  }[] = [];
  const part = (geometry: BufferGeometry, material: Material) => {
    geometries.push(geometry);
    const entry = { geometry, material, matrices: [] as Matrix4[] };
    parts.push(entry);
    return entry;
  };
  const q = new Quaternion();
  const put = (
    entry: ReturnType<typeof part>,
    x: number,
    y: number,
    z: number,
    s: number,
    rotation?: Quaternion,
    sy = s,
  ) =>
    entry.matrices.push(
      new Matrix4().compose(
        new Vector3(x, y, z),
        rotation ?? q,
        new Vector3(s, sy, s),
      ),
    );

  // Unit parts, for a lamp 1 m across; each lamp scales them by its size.
  const housing = part(
    new CylinderGeometry(0.33, 0.33, 0.24, 8).rotateY(Math.PI / 8),
    castIron,
  );
  const flange = part(
    new CylinderGeometry(0.37, 0.37, 0.05, 8).rotateY(Math.PI / 8),
    castIron,
  );
  const housingTop = part(
    new CylinderGeometry(0.2, 0.3, 0.08, 8).rotateY(Math.PI / 8),
    castIron,
  );
  const housingFoot = part(
    new CylinderGeometry(0.26, 0.31, 0.06, 8).rotateY(Math.PI / 8),
    castIron,
  );
  const collar = part(new CylinderGeometry(0.17, 0.19, 0.16, 20), iron);
  const collarRing = part(new CylinderGeometry(0.2, 0.2, 0.03, 20), iron);
  const hook = part(new TorusGeometry(0.035, 0.009, 6, 12), chain);
  // The dome, a half sphere opening downward, and its lining.
  const dome = part(
    new SphereGeometry(0.5, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    iron,
  );
  const domeLining = part(
    new SphereGeometry(0.49, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    lining,
  );
  const rim = part(
    new TorusGeometry(0.505, 0.012, 6, 32).rotateX(Math.PI / 2),
    iron,
  );
  // The guard cage: a ring at the rim, a smaller one below, a bottom ring
  // and ribs between them.
  const cageRing = part(
    new TorusGeometry(1, 0.012, 5, 32).rotateX(Math.PI / 2),
    wire,
  );
  const rib = part(new CylinderGeometry(0.006, 0.006, 1, 4), wire);
  const bulb = part(new SphereGeometry(0.06, 10, 8), bulbGlow);
  const link = part(new TorusGeometry(0.02, 0.005, 4, 8), chain);

  const linkTurn = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    Math.PI / 2,
  );
  const ribTurn = new Quaternion();
  for (const p of places) {
    const s = p.size;
    const { x, z } = p;
    const rimY = p.y;
    // From the rim up: the dome, the collar, the housing, the hook.
    put(dome, x, rimY, z, s, undefined, s * 0.82);
    put(domeLining, x, rimY, z, s, undefined, s * 0.8);
    put(rim, x, rimY, z, s);
    const domeTop = rimY + 0.41 * s;
    put(collar, x, domeTop + 0.06 * s, z, s);
    put(collarRing, x, domeTop + 0.13 * s, z, s);
    const housingY = domeTop + 0.27 * s;
    put(housingFoot, x, housingY - 0.13 * s, z, s);
    put(housing, x, housingY, z, s);
    put(flange, x, housingY + 0.02 * s, z, s);
    put(housingTop, x, housingY + 0.16 * s, z, s);
    const hookY = housingY + 0.23 * s;
    put(hook, x, hookY, z, s);
    // The chain, link by link, to the ceiling.
    const pitch = 0.035;
    const links = Math.max(0, Math.floor((p.top - hookY - 0.03) / pitch));
    for (let i = 0; i < links; i++) {
      const y = hookY + 0.04 + i * pitch;
      entryLink(x, y, z, i % 2 === 1);
    }
    // The cage.
    put(cageRing, x, rimY - 0.02 * s, z, 0.5 * s, undefined, s);
    const lowY = rimY - 0.22 * s;
    put(cageRing, x, lowY, z, 0.4 * s, undefined, s);
    put(cageRing, x, rimY - 0.12 * s, z, 0.46 * s, undefined, s);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const r0 = 0.5 * s;
      const r1 = 0.4 * s;
      const top = new Vector3(
        x + Math.cos(a) * r0,
        rimY - 0.02 * s,
        z + Math.sin(a) * r0,
      );
      const bottom = new Vector3(
        x + Math.cos(a) * r1,
        lowY,
        z + Math.sin(a) * r1,
      );
      const dir = top.clone().sub(bottom);
      const length = dir.length();
      ribTurn.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
      rib.matrices.push(
        new Matrix4().compose(
          top.clone().add(bottom).multiplyScalar(0.5),
          ribTurn.clone(),
          new Vector3(s, length, s),
        ),
      );
    }
    // The bottom of the cage: two bars across.
    for (const turn of [0, Math.PI / 2]) {
      ribTurn.setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2);
      const across = new Quaternion()
        .setFromAxisAngle(new Vector3(0, 1, 0), turn)
        .multiply(ribTurn);
      rib.matrices.push(
        new Matrix4().compose(
          new Vector3(x, lowY, z),
          across,
          new Vector3(s, 0.8 * s, s),
        ),
      );
    }
    put(bulb, x, rimY + 0.12 * s, z, s);
  }
  function entryLink(x: number, y: number, z: number, turned: boolean) {
    link.matrices.push(
      new Matrix4().compose(
        new Vector3(x, y, z),
        turned ? linkTurn : q,
        new Vector3(1, 1, 1),
      ),
    );
  }

  // Tiled for culling; the chain, the cage and the bulb are fine details,
  // not drawn from far off.
  const details = new Map<object, number>([
    [link, 35],
    [hook, 35],
    [cageRing, 40],
    [rib, 40],
  ]);
  const built: { mesh: InstancedMesh; detail?: number }[] = [];
  for (const entry of parts) {
    if (!entry.matrices.length) continue;
    for (const mesh of buildTiled(
      group,
      entry.geometry,
      entry.material,
      entry.matrices,
    ))
      built.push({ mesh, detail: details.get(entry) });
  }
  return {
    group,
    /** The instanced meshes, and the distance (metres) beyond which each is hidden. */
    built,
    /** The dome's lining, to colour and brighten with the lamps. */
    lining,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
