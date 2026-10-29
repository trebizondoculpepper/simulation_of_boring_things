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
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
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
/** The thinnest a stream is drawn, metres across. */
const STREAM_DRAWN_M = 0.007;
/** How far down a stream its streak pattern repeats, metres. */
const STREAK_M = 0.35;

/**
 * Streaks of air down a falling stream: drawn once, a white canvas with
 * brighter and fainter vertical lines, its alpha the same pattern.
 */
function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#d4d4d4';
    g.fillRect(0, 0, 64, 128);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60; i++) {
      const v = 235 + Math.floor(rnd() * 20);
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(rnd() * 64, rnd() * 128, 1 + rnd() * 3, 10 + rnd() * 50);
    }
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}
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
  // The stream: an open cylinder, its top at the mouth, scaled to its width
  // and fall, white with entrained air and streaked, the streaks running
  // down it (the owner, 2026-10-29: a clear, glassy stream was barely seen).
  const streaks = streakTexture();
  const streamLook = new MeshStandardMaterial({
    color: '#ffffff',
    map: streaks,
    alphaMap: streaks,
    transparent: true,
    opacity: 1,
    roughness: 0.25,
    metalness: 0,
    emissive: '#b9d3df',
    emissiveIntensity: 0.8,
    depthWrite: false,
  });
  const stream = live(
    new Mesh(
      new CylinderGeometry(0.5, 0.5, 1, 24, 1, true).translate(0, -0.5, 0),
      streamLook,
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
        // Never drawn thinner than STREAM_DRAWN_M, so the thinnest still shows.
        const drawn = Math.max(w, STREAM_DRAWN_M);
        const fall = Math.max(drop, 0.001);
        stream.scale.set(drawn, fall, drawn);
        // The streaks repeat every STREAK_M down the stream and run at its speed.
        streaks.repeat.set(1, fall / STREAK_M);
        streaks.offset.y =
          (streaks.offset.y + (h * (1 + Math.sqrt(2 * G * fall))) / STREAK_M) %
          1;
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
 * A tundish in the floor (the owner, 2026-10-29: "a proper tundish, an
 * angular cut into the floor covered by a grille"): a stainless funnel
 * let into the floor, its opening `w` by `d` metres inside a bright
 * stainless kerb, a 45° chamfer down from the kerb to a rebate the grille
 * sits in, then the funnel's sides sloping `depth` down to a square
 * outlet, lit at the top and darkening into the throat so the cut reads
 * through the open grille. The floor is one plane, so the hole is made in
 * depth: the funnel and grille are drawn first, then an invisible mask
 * over the opening writes the floor's depth there, so the floor (drawn
 * after) is not drawn over them, while whatever stands nearer still is.
 */
export function createTundish(w = 0.7, d = 0.5, depth = 0.3) {
  const group = live(new Group());
  group.name = 'Tundish';
  const steel = new MeshStandardMaterial({
    color: '#c9cfd2',
    metalness: 0.7,
    roughness: 0.25,
    side: DoubleSide,
  });
  const dark = new MeshBasicMaterial({ color: '#050606' });
  const chamfer = 0.045;
  const seat = 0.03;
  const out = 0.08;
  // The chamfer, the rebate's wall, the funnel and the outlet's throat, as
  // rings of quads, each ring with its shade (light at the kerb, dark below).
  const rings: [number, number, number, number][] = [
    [w / 2, d / 2, 0, 0.95],
    [w / 2 - chamfer, d / 2 - chamfer, -chamfer, 0.8],
    [w / 2 - chamfer, d / 2 - chamfer, -chamfer - seat, 0.55],
    [out, out, -depth, 0.12],
    [out, out, -depth - 0.04, 0.04],
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
  const colour: number[] = [];
  for (let r = 0; r + 1 < rings.length; r++)
    for (let k = 0; k < 4; k++) {
      const [hw0, hd0, y0, s0] = rings[r];
      const [hw1, hd1, y1, s1] = rings[r + 1];
      const a = corner(hw0, hd0, y0, k);
      const b = corner(hw0, hd0, y0, k + 1);
      const c = corner(hw1, hd1, y1, k + 1);
      const e = corner(hw1, hd1, y1, k);
      position.push(...a, ...b, ...c, ...a, ...c, ...e);
      // The two long sides a shade darker than the ends, so the angles show.
      const side = k % 2 === 0 ? 1 : 0.8;
      for (const v of [s0, s0, s1, s0, s1, s1]) {
        const g = v * side;
        colour.push(g, g, g);
      }
    }
  const funnelGeometry = new BufferGeometry();
  funnelGeometry.setAttribute(
    'position',
    new Float32BufferAttribute(position, 3),
  );
  funnelGeometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  funnelGeometry.computeVertexNormals();
  const funnel = live(
    new Mesh(
      funnelGeometry,
      new MeshStandardMaterial({
        color: '#b4bbbf',
        vertexColors: true,
        metalness: 0.55,
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
  // The grille, set in the rebate below the chamfer: a frame and bars
  // across it, open enough to see the funnel through.
  const gw = w - 2 * chamfer;
  const gd = d - 2 * chamfer;
  const top = -chamfer - 0.002;
  const barD = 0.022;
  const bars: BufferGeometry[] = [];
  for (const z of [-gd / 2 + 0.01, gd / 2 - 0.01])
    bars.push(new BoxGeometry(gw, barD, 0.02).translate(0, top - barD / 2, z));
  for (const x of [-gw / 2 + 0.01, gw / 2 - 0.01])
    bars.push(new BoxGeometry(0.02, barD, gd).translate(x, top - barD / 2, 0));
  for (let x = -gw / 2 + 0.05; x < gw / 2 - 0.03; x += 0.05)
    bars.push(
      new BoxGeometry(0.006, barD, gd - 0.02).translate(x, top - barD / 2, 0),
    );
  bars.push(
    new BoxGeometry(gw - 0.02, 0.008, 0.008).translate(0, top - 0.016, 0),
  );
  const grille = live(new Mesh(mergeGeometries(bars), steel));
  grille.renderOrder = -2;
  // The kerb: a bright stainless band on the floor round the cut.
  const kerbW = 0.035;
  const kerb = live(
    new Mesh(
      mergeGeometries([
        new BoxGeometry(w + 2 * kerbW, 0.004, kerbW).translate(
          0,
          0.002,
          -d / 2 - kerbW / 2,
        ),
        new BoxGeometry(w + 2 * kerbW, 0.004, kerbW).translate(
          0,
          0.002,
          d / 2 + kerbW / 2,
        ),
        new BoxGeometry(kerbW, 0.004, d).translate(-w / 2 - kerbW / 2, 0.002, 0),
        new BoxGeometry(kerbW, 0.004, d).translate(w / 2 + kerbW / 2, 0.002, 0),
      ]),
      steel,
    ),
  );
  // The mask, just above the floor, writing depth only.
  const mask = live(
    new Mesh(
      new PlaneGeometry(w, d).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ colorWrite: false }),
    ),
  );
  mask.position.y = 0.0005;
  mask.renderOrder = -1;
  group.add(funnel, throat, grille, kerb, mask);
  return { group, grille };
}
