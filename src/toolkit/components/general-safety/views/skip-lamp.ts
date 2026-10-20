import { ParticleSprite } from '../../core/views/particles';
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { kitPaint } from '../../core/views/eighties-controls';
import { createCanvasTexture } from '../../core/views/screens';

/** The amber of a lit lamp, and of its unlit lens. */
const AMBER = '#ffae1a';
const AMBER_DARK = '#c9700c';

/** A soft round glow, drawn once and shared. */
let halo: ReturnType<typeof createCanvasTexture> | null = null;
const haloTexture = () => {
  if (!halo) {
    halo = createCanvasTexture(64, 64);
    const g = halo.context.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,190,80,1)');
    g.addColorStop(0.3, 'rgba(255,160,30,0.45)');
    g.addColorStop(1, 'rgba(255,140,0,0)');
    halo.context.fillStyle = g;
    halo.context.fillRect(0, 0, 64, 64);
  }
  return halo.texture;
};

/** The battery body's outline, radius against height, metres. */
const BODY: [number, number][] = [
  [0, 0],
  [0.052, 0],
  [0.056, 0.006],
  [0.056, 0.115],
  [0.06, 0.12],
  [0.06, 0.135],
  [0.05, 0.142],
  [0, 0.142],
];

/**
 * The lens's outline: a ribbed amber Fresnel dome in two tiers, a bulge
 * and a narrower top, each ringed with ribs.
 */
const lensOutline = () => {
  const points: Vector2[] = [new Vector2(0, 0.14)];
  const tier = (from: number, to: number, radius: number, ribs: number) => {
    for (let i = 0; i <= ribs * 4; i++) {
      const t = i / (ribs * 4);
      const rib = Math.sin(t * ribs * Math.PI * 2) * 0.0025;
      points.push(new Vector2(radius + rib, from + (to - from) * t));
    }
  };
  points.push(new Vector2(0.047, 0.142));
  tier(0.146, 0.2, 0.052, 6);
  points.push(new Vector2(0.044, 0.206));
  tier(0.21, 0.255, 0.046, 5);
  points.push(new Vector2(0.04, 0.26), new Vector2(0, 0.262));
  return points;
};

/**
 * A skip lamp as UK hire firms hang them: a flashing amber road lamp after
 * the ProSolve Ecolite (also sold by Dorman and others), the long-life
 * lamp hung on cones, scaffolds and skips: a yellow polypropylene battery
 * body 112 mm across, its single 6 V lantern battery inside, under a
 * ribbed amber dome lens seen all the way round, about 260 mm tall
 * overall, hung by a plastic-coated strap looped from either side of its
 * body. Its origin is the top of the strap's loop, where it hangs from a
 * skip's lifting lug (lying along z); the lamp hangs below it, upright.
 * `setLit` flashes it: the lens burns and a halo glows round it. Its lens
 * and halo are its own, freed by `dispose`; the rest is the kit's.
 */
export function createSkipLamp(kit: PanelKit) {
  const group = new Group();
  group.name = 'Skip lamp';
  const lamp = new Group();
  // The body's middle hangs this far below the top of the strap.
  lamp.position.y = -0.19;
  group.add(lamp);
  const yellow = kitPaint(kit, '#f2c014');
  const body = new Mesh(
    new LatheGeometry(
      BODY.map(([r, y]) => new Vector2(r, y)),
      32,
    ),
    yellow,
  );
  lamp.add(body);
  // The lens: one material of its own, so each lamp flashes alone.
  const lens = new MeshStandardMaterial({
    color: AMBER_DARK,
    emissive: AMBER,
    emissiveIntensity: 0,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
  });
  const dome = new Mesh(new LatheGeometry(lensOutline(), 32), lens);
  lamp.add(dome);
  // The strap, from a lug either side of the body up over the skip's lug.
  const strap = new CatmullRomCurve3(
    [
      new Vector3(-0.058, 0.07, 0),
      new Vector3(-0.062, 0.13, 0),
      new Vector3(-0.045, 0.17, 0),
      new Vector3(0, 0.19, 0),
      new Vector3(0.045, 0.17, 0),
      new Vector3(0.062, 0.13, 0),
      new Vector3(0.058, 0.07, 0),
    ],
    false,
    'catmullrom',
    0.4,
  );
  const loop = new Mesh(new TubeGeometry(strap, 32, 0.004, 6, false), yellow);
  loop.scale.z = 2.5;
  lamp.add(loop);
  const glow = new ParticleSprite(
    new SpriteMaterial({
      map: haloTexture(),
      blending: AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    }),
  );
  glow.scale.setScalar(0.45);
  glow.position.set(0, 0.2, 0);
  lamp.add(glow);
  let lit = false;
  return {
    group,
    setLit(on: boolean) {
      if (on === lit) return;
      lit = on;
      lens.emissiveIntensity = on ? 2.6 : 0.08;
      lens.color.set(on ? AMBER : AMBER_DARK);
      glow.material.opacity = on ? 0.85 : 0;
    },
    dispose() {
      lens.dispose();
      glow.material.dispose();
    },
  };
}
