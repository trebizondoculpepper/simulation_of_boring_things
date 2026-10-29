import {
  Box3,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { tools as toolsOf } from '../../../components/core/views/fitting-tools';
import { EXTRA_FINDS } from '../../logic/skimmer-extras';
import type { ExtraFind, ExtraFindId } from '../../logic/skimmer-extras';

type Tools = ReturnType<typeof toolsOf>;

const MODELS = import.meta.glob(
  '../../../../../resources/models/skimmer/*.glb',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const urlOf = (file: string) =>
  Object.entries(MODELS).find(([k]) => k.endsWith(`/${file}`))?.[1];

/**
 * The skimmer's further finds (`logic/skimmer-extras.ts`) as things: four
 * loaded from their models, the goggles and the crisp packet modelled
 * here. Each is brought to its true size, its origin the middle of its
 * underside, so it lies on the deck at y = 0; the frog lies belly up.
 * `ready` resolves once the models are in; `propOf` makes a fresh one.
 */
export function createExtraFinds(t: Tools) {
  const loaded = new Map<ExtraFindId, Object3D>();
  const loader = new GLTFLoader();
  /** `object` at `size` metres on its longest side, standing on y = 0, centred. */
  const fit = (object: Object3D, size: number) => {
    const g = new Group();
    g.add(object);
    g.updateMatrixWorld(true);
    let box = new Box3().setFromObject(g);
    const s = box.getSize(new Vector3());
    object.scale.multiplyScalar(size / Math.max(s.x, s.y, s.z, 1e-6));
    g.updateMatrixWorld(true);
    box = new Box3().setFromObject(g);
    const c = box.getCenter(new Vector3());
    object.position.sub(new Vector3(c.x, box.min.y, c.z));
    return g;
  };
  const ready = Promise.all(
    EXTRA_FINDS.filter((f) => f.model).map(async (f) => {
      const url = urlOf(f.model!);
      if (!url) return;
      const gltf = await loader.loadAsync(url);
      const scene = gltf.scene;
      // Dead: on its back.
      if (f.id === 'dead-frog') scene.rotation.z = Math.PI;
      loaded.set(f.id, fit(scene, f.size));
    }),
  ).then(() => {});

  const paint = (colour: string, rough = 0.6) => t.paint(colour, rough);
  /** Swimming goggles, the strap snapped and trailing. */
  const goggles = (f: ExtraFind) => {
    const g = new Group();
    const frame = paint('#1d5fa8', 0.4);
    const lens = paint('#2a3a44', 0.15);
    for (const x of [-0.035, 0.035]) {
      const cup = new Mesh(new SphereGeometry(0.024, 14, 8), frame);
      cup.scale.set(1, 0.55, 0.75);
      cup.position.set(x, 0.012, 0);
      g.add(cup);
      const glass = new Mesh(
        new CylinderGeometry(0.019, 0.019, 0.003, 16),
        lens,
      );
      glass.rotation.x = Math.PI / 2;
      glass.position.set(x, 0.012, 0.017);
      g.add(glass);
    }
    const bridge = new Mesh(
      new CylinderGeometry(0.003, 0.003, 0.024, 6),
      frame,
    );
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.014, 0.01);
    g.add(bridge);
    // The strap, a broken loop.
    const strap = new Mesh(
      new TorusGeometry(0.05, 0.003, 4, 24, Math.PI * 1.6),
      paint('#141414', 0.9),
    );
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, 0.006, -0.03);
    g.add(strap);
    return fit(g, f.size);
  };
  /** An empty crisp packet, flattened, crimped at its ends, a little bent. */
  const crispPacket = (f: ExtraFind) => {
    const g = new Group();
    const body = new Mesh(
      new RoundedBoxGeometry(0.12, 0.016, 0.15, 2, 0.007),
      paint('#c23b2b', 0.35),
    );
    body.position.y = 0.008;
    g.add(body);
    // The crimped seals across its ends.
    for (const z of [-0.079, 0.079])
      t.box(g, paint('#d9d4c8', 0.4), 0.12, 0.003, 0.012, 0, 0.008, z);
    const label = t.printed(0.08, 0.05, (c, w, h) => {
      c.fillStyle = '#f2c230';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#7a1d14';
      c.font = `bold ${h * 0.4}px Arial, Helvetica, sans-serif`;
      c.textAlign = 'center';
      c.fillText('CRISPINS', w / 2, h * 0.5, w * 0.9);
      c.font = `${h * 0.22}px Arial, Helvetica, sans-serif`;
      c.fillText('ready salted', w / 2, h * 0.82, w * 0.9);
    });
    label.mesh.rotation.x = -Math.PI / 2;
    label.mesh.position.y = 0.0165;
    g.add(label.mesh);
    // Bent, as a packet emptied and dropped is.
    g.rotation.x = 0.15;
    return fit(g, f.size);
  };

  return {
    ready,
    /** A fresh one of `f`, or null while its model is still loading. */
    propOf(f: ExtraFind): Group | null {
      let g: Group | null;
      if (f.id === 'goggles') g = goggles(f);
      else if (f.id === 'crisp-packet') g = crispPacket(f);
      else {
        const model = loaded.get(f.id);
        g = model ? (cloneSkinned(model) as Group) : null;
      }
      if (g) g.name = f.id;
      return g;
    },
  };
}
