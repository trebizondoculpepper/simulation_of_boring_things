import {
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  BoxGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPoolUniforms } from '../../components/pool/views/pool-surfaces';
import { rippleWater } from './round-room-light';
import { poolWaterMaterial } from './pool-hall';
import {
  DROP_M,
  G,
  due,
  fallen,
  outflowOf,
  ringReach,
  ringsPerSecond,
} from '../logic/museum-6-outflow';

/**
 * Hall 6's tank, the parts that show its water moving (the owner,
 * 2026-10-29): its open water surface, the pools' own, the water leaving
 * the fill pipe's open end (drops, or a stream as wide as the flow makes
 * it), the splash where it lands, and the tundish in the floor it drains
 * to. Everything here shows the model's numbers; none of it holds state
 * the model does not.
 */

const live = <T extends { userData: Record<string, unknown> }>(o: T) => {
  o.userData.live = true;
  return o;
};

/**
 * The tank's water surface, `w` by `d` metres, centred on its group's
 * origin; set its height with `show` (hidden when the tank is empty).
 */
export function createTankSurface(w: number, d: number) {
  const shape = new Shape()
    .moveTo(-w / 2, -d / 2)
    .lineTo(w / 2, -d / 2)
    .lineTo(w / 2, d / 2)
    .lineTo(-w / 2, d / 2)
    .closePath();
  const water = live(
    new Mesh(
      new ShapeGeometry(shape).rotateX(Math.PI / 2),
      poolWaterMaterial(),
    ),
  );
  water.name = 'Tank water surface';
  water.renderOrder = 1;
  rippleWater(water, createPoolUniforms(1, 0, []));
  return {
    object: water,
    /** Its height above the group's origin, metres, or hidden. */
    show(y: number, wet: boolean) {
      water.visible = wet;
      water.position.y = y;
    },
  };
}

const RINGS = 16;
const DROPS = 32;
const SPRAY = 40;

/**
 * The water out of a pipe's open end, its mouth at the group's origin
 * pointing down, of bore `bore`, a stream filling it at `fullM3h`; each
 * frame `update` takes the flow, m³/h, and the height of what it lands
 * on below the mouth, metres (a positive number).
 */
export function createOutflow(bore: number, fullM3h: number) {
  const group = live(new Group());
  group.name = 'Water from the fill pipe';
  const waterLook = new MeshPhysicalMaterial({
    color: '#cfe8f2',
    transparent: true,
    opacity: 0.72,
    roughness: 0.05,
    clearcoat: 1,
    depthWrite: false,
  });
  // The stream: an open cylinder, its top at the mouth, scaled to its width and fall.
  const stream = live(
    new Mesh(
      new CylinderGeometry(0.5, 0.5, 1, 24, 1, true).translate(0, -0.5, 0),
      waterLook,
    ),
  );
  stream.renderOrder = 2;
  stream.visible = false;
  group.add(stream);
  // The pipe's open end, dark up its bore.
  const bored = live(
    new Mesh(
      new CircleGeometry(bore / 2, 24).rotateX(Math.PI / 2),
      new MeshBasicMaterial({ color: '#101314' }),
    ),
  );
  bored.position.y = 0.002;
  group.add(bored);
  // The foam where it lands.
  const foamLook = new MeshBasicMaterial({
    color: '#f4fbff',
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const foam = live(
    new Mesh(new CircleGeometry(0.5, 24).rotateX(-Math.PI / 2), foamLook),
  );
  foam.renderOrder = 3;
  foam.visible = false;
  group.add(foam);
  // The drops, and the spray thrown up where a stream lands: instances of one sphere each.
  const drops = live(
    new InstancedMesh(new SphereGeometry(DROP_M / 2, 8, 6), waterLook, DROPS),
  );
  drops.count = 0;
  drops.renderOrder = 2;
  drops.frustumCulled = false;
  group.add(drops);
  const spray = live(
    new InstancedMesh(new SphereGeometry(0.004, 6, 4), waterLook, SPRAY),
  );
  spray.count = 0;
  spray.renderOrder = 2;
  spray.frustumCulled = false;
  group.add(spray);
  // The rings spreading from each splash.
  const ringGeometry = new RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2);
  const rings = Array.from({ length: RINGS }, () => {
    const mesh = live(
      new Mesh(
        ringGeometry,
        new MeshBasicMaterial({
          color: '#eaf8ff',
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      ),
    );
    mesh.renderOrder = 3;
    mesh.visible = false;
    group.add(mesh);
    return { mesh, age: 0, life: 0.6, from: 0, reach: 0 };
  });
  let nextRing = 0;
  const ring = (from: number, reach: number, life: number) => {
    const r = rings[nextRing];
    nextRing = (nextRing + 1) % RINGS;
    Object.assign(r, { age: 0, life, from, reach });
    r.mesh.visible = true;
  };
  const falling: number[] = [];
  const thrown: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
  }[] = [];
  let dropCarry = 0;
  let ringCarry = 0;
  let sprayCarry = 0;
  const m = new Matrix4();

  return {
    group,
    update(delta: number, m3h: number, drop: number) {
      const h = Math.min(delta, 0.1);
      const out = outflowOf(m3h, bore, fullM3h);
      const land = -drop;
      // Drops: as many as fall due, each falling freely to the surface, a ring where it lands.
      if (out.kind === 'drops') {
        const d = due(out.shownPerSecond, h, dropCarry);
        dropCarry = d.carry;
        for (let i = 0; i < d.count && falling.length < DROPS; i++)
          falling.push(0);
      } else dropCarry = 0;
      for (let i = falling.length - 1; i >= 0; i--) {
        falling[i] += h;
        if (fallen(falling[i]) >= drop) {
          falling.splice(i, 1);
          ring(DROP_M, ringReach(DROP_M), 0.5);
        }
      }
      drops.count = falling.length;
      falling.forEach((t, i) =>
        drops.setMatrixAt(i, m.makeTranslation(0, -fallen(t), 0)),
      );
      if (falling.length) drops.instanceMatrix.needsUpdate = true;
      // The stream, from the mouth to the surface, its foam and rings and spray where it lands.
      const flowing = out.kind === 'stream';
      stream.visible = flowing;
      foam.visible = flowing;
      if (out.kind === 'stream') {
        const w = out.diameter;
        stream.scale.set(w, Math.max(drop, 0.001), w);
        const jitter = 1 + 0.08 * Math.sin(performance.now() / 37);
        const spread = w * (1.1 + 0.6 * out.share) * jitter + 0.004;
        foam.scale.set(spread, 1, spread);
        foam.position.y = land + 0.003;
        foamLook.opacity = 0.2 + 0.4 * out.share;
        const r = due(ringsPerSecond(out.share), h, ringCarry);
        ringCarry = r.carry;
        for (let i = 0; i < r.count; i++) ring(w / 2, ringReach(w), 0.7);
        const s = due(out.share * 120, h, sprayCarry);
        sprayCarry = s.carry;
        for (let i = 0; i < s.count && thrown.length < SPRAY; i++) {
          const a = Math.random() * Math.PI * 2;
          const speed = 0.4 + 1.6 * out.share * Math.random();
          thrown.push({
            x: (Math.cos(a) * w) / 2,
            y: land,
            z: (Math.sin(a) * w) / 2,
            vx: Math.cos(a) * speed * 0.5,
            vy: speed,
            vz: Math.sin(a) * speed * 0.5,
          });
        }
      } else ringCarry = sprayCarry = 0;
      for (let i = thrown.length - 1; i >= 0; i--) {
        const p = thrown[i];
        p.vy -= G * h;
        p.x += p.vx * h;
        p.y += p.vy * h;
        p.z += p.vz * h;
        if (p.y < land) thrown.splice(i, 1);
      }
      spray.count = thrown.length;
      thrown.forEach((p, i) =>
        spray.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)),
      );
      if (thrown.length) spray.instanceMatrix.needsUpdate = true;
      for (const r of rings) {
        if (!r.mesh.visible) continue;
        r.age += h;
        const k = r.age / r.life;
        if (k >= 1) {
          r.mesh.visible = false;
          continue;
        }
        const radius = r.from + r.reach * Math.sqrt(k);
        r.mesh.scale.set(radius, 1, radius);
        r.mesh.position.y = land + 0.002;
        (r.mesh.material as MeshBasicMaterial).opacity = 0.7 * (1 - k);
      }
    },
  };
}

/**
 * A tundish in the floor (the owner, 2026-10-29): a stainless funnel let
 * into the floor, its opening `w` by `d` metres with a chamfered lip,
 * its sides sloping `depth` down to a square outlet, under a flush
 * stainless grille. The floor is one plane, so the hole is made in
 * depth: the funnel and grille are drawn first, then an invisible mask
 * over the opening writes the floor's depth there, so the floor (drawn
 * after) is not drawn over them, while whatever stands nearer still is.
 */
export function createTundish(w = 0.7, d = 0.5, depth = 0.3) {
  const group = live(new Group());
  group.name = 'Tundish';
  const steel = new MeshStandardMaterial({
    color: '#a3a9ac',
    metalness: 0.6,
    roughness: 0.35,
    side: DoubleSide,
  });
  const dark = new MeshBasicMaterial({ color: '#0b0c0d' });
  const lip = 0.03;
  const chamfer = 0.04;
  const out = 0.08;
  // The lip, its chamfer, the funnel and the outlet's throat, as rings of quads.
  const rings: [number, number, number][] = [
    [w / 2, d / 2, 0],
    [w / 2 - chamfer, d / 2 - chamfer, -lip],
    [out, out, -depth],
    [out, out, -depth - 0.04],
  ];
  const corner = (hw: number, hd: number, y: number, k: number) => {
    const cs = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ][k % 4];
    return [cs[0], y, cs[1]];
  };
  const position: number[] = [];
  for (let r = 0; r + 1 < rings.length; r++)
    for (let k = 0; k < 4; k++) {
      const a = corner(...rings[r], k);
      const b = corner(...rings[r], k + 1);
      const c = corner(...rings[r + 1], k + 1);
      const e = corner(...rings[r + 1], k);
      position.push(...a, ...b, ...c, ...a, ...c, ...e);
    }
  const funnelGeometry = new BufferGeometry();
  funnelGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(position, 3),
  );
  funnelGeometry.computeVertexNormals();
  const funnel = live(
    new Mesh(
      funnelGeometry,
      new MeshStandardMaterial({
        color: '#6c7377',
        metalness: 0.5,
        roughness: 0.3,
        side: DoubleSide,
      }),
    ),
  );
  funnel.renderOrder = -2;
  const throat = live(
    new Mesh(new PlaneGeometry(out * 2, out * 2).rotateX(-Math.PI / 2), dark),
  );
  throat.position.y = -depth - 0.04;
  throat.renderOrder = -2;
  // The grille: a frame round the opening and bars across it, their tops 3 mm proud.
  const bars: BufferGeometry[] = [];
  const top = 0.003;
  const barD = 0.025;
  for (const z of [-d / 2 + 0.01, d / 2 - 0.01])
    bars.push(new BoxGeometry(w, barD, 0.02).translate(0, top - barD / 2, z));
  for (const x of [-w / 2 + 0.01, w / 2 - 0.01])
    bars.push(new BoxGeometry(0.02, barD, d).translate(x, top - barD / 2, 0));
  for (let x = -w / 2 + 0.035; x < w / 2 - 0.02; x += 0.04)
    bars.push(
      new BoxGeometry(0.005, barD, d - 0.02).translate(x, top - barD / 2, 0),
    );
  for (const z of [-d / 6, d / 6])
    bars.push(
      new BoxGeometry(w - 0.02, 0.006, 0.006).translate(0, top - 0.015, z),
    );
  const grille = live(new Mesh(mergeGeometries(bars), steel));
  grille.renderOrder = -2;
  // The mask, just above the floor, writing depth only.
  const mask = live(
    new Mesh(
      new PlaneGeometry(w, d).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ colorWrite: false }),
    ),
  );
  mask.position.y = 0.0005;
  mask.renderOrder = -1;
  group.add(funnel, throat, grille, mask);
  return { group, grille };
}
