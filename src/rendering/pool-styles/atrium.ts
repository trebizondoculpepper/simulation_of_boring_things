import {
  BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import {
  block,
  downlight,
  lineSolids,
  plasticChair,
  pool,
  porthole,
  ribbon,
  sign,
  startPoolRoom,
  surface,
  tiles,
  twoToneWall,
  water,
} from './kit';
import type { PoolStage } from './kit';
import {
  BOUNDS,
  HEIGHT,
  OUTLINE,
  POOLS,
  SLIDES,
  STAIRS,
  TIERS,
  floorAt,
  frontRuns,
} from '../../game/pool-styles/atrium-plan';
import type { Slide } from '../../game/pool-styles/atrium-plan';
import type { Point, Rect } from '../../game/pool-styles/geometry';

/**
 * The Slide Atrium (`doc/design/pool-styles.md`, style 5; laid out in
 * `src/game/pool-styles/atrium-plan.ts`): the water park with no
 * visitors. A tall white-tiled atrium with a dark band round its foot,
 * three galleries stepping up and back along three of its walls behind
 * white railings, kidney splash pools on its ground floor, and the only
 * saturated colour in the pool rooms: red, yellow and blue open-trough
 * slides weaving down through it. The red and the yellow can be ridden
 * from their mouths into the splash pools; the blue goes round and back
 * to its own mouth and is closed; a short one ends in mid-air. Queue
 * barriers zig-zag to nowhere, a height sign's arm stands far too high.
 */

const SLIDE_COLOURS = { red: '#d8322a', yellow: '#f2c21b', blue: '#2f6fd0' };
const TROUGH = 0.55;

/**
 * An open trough swept along `curve`: a half-pipe of radius `r`, open to
 * the sky, its inside and outside both drawn.
 */
function trough(
  curve: CatmullRomCurve3,
  r: number,
  material: Material,
  segments = 220,
  sides = 14,
) {
  const positions: number[] = [];
  const index: number[] = [];
  const up = new Vector3(0, 1, 0);
  let side = new Vector3(1, 0, 0);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const s = new Vector3().crossVectors(tangent, up);
    if (s.lengthSq() > 1e-6) side = s.normalize();
    const lift = new Vector3().crossVectors(side, tangent).normalize();
    for (let k = 0; k <= sides; k++) {
      const a = (Math.PI * k) / sides;
      const q = p
        .clone()
        .addScaledVector(side, r * Math.cos(a))
        .addScaledVector(lift, -r * Math.sin(a) + r * 0.35);
      positions.push(q.x, q.y, q.z);
    }
  }
  for (let i = 0; i < segments; i++)
    for (let k = 0; k < sides; k++) {
      const a = i * (sides + 1) + k;
      const b = a + sides + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return new Mesh(geometry, material);
}

/** A white railing along points (x, z) at height `y`: its rail, and posts. */
function whiteRail(
  stage: PoolStage,
  points: readonly Point[],
  y: number,
  white: Material,
  height = 1.05,
) {
  if (points.length < 2) return;
  const curve = new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x, y + height, z)),
    false,
    'catmullrom',
    0,
  );
  stage.world.add(
    new Mesh(
      new TubeGeometry(curve, Math.max(8, points.length * 2), 0.035, 8),
      white,
    ),
  );
  const mid = new CatmullRomCurve3(
    points.map(([x, z]) => new Vector3(x, y + height * 0.5, z)),
    false,
    'catmullrom',
    0,
  );
  stage.world.add(
    new Mesh(
      new TubeGeometry(mid, Math.max(8, points.length * 2), 0.02, 6),
      white,
    ),
  );
  const length = curve.getLength();
  const n = Math.max(1, Math.round(length / 1.2));
  for (let i = 0; i <= n; i++) {
    const p = curve.getPointAt(i / n);
    const post = new Mesh(new CylinderGeometry(0.03, 0.03, height, 8), white);
    post.position.set(p.x, y + height / 2, p.z);
    stage.world.add(post);
  }
}

const rectSolid = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): Rect => ({
  minX,
  maxX,
  minZ,
  maxZ,
});

export function startAtriumRoom(canvas: HTMLCanvasElement) {
  return startPoolRoom(
    canvas,
    'pool_atrium',
    {
      bounds: BOUNDS,
      background: '#e7ece9',
      fog: [35, 110],
      sky: ['#ffffff', '#b7c2bd', 1.55],
      exposure: 1.05,
    },
    (stage) => {
      const white = tiles(stage, '#f0f2ee');
      const dark = tiles(stage, '#1e4a44');
      const basin = tiles(stage, '#bfe6e6');
      const pale = water(stage, '#3fb0bd', 0.72);
      const rail = stage.keep(
        new MeshStandardMaterial({ color: '#f7f7f4', roughness: 0.35 }),
      );
      const solids: Rect[] = [];

      // ---- The atrium: floor, ceiling, walls --------------------------------
      surface(
        stage,
        OUTLINE,
        0,
        white,
        POOLS.map((p) => p.outline),
      );
      for (const p of POOLS) pool(stage, p.outline, 0, p.depth, basin, pale);
      surface(stage, OUTLINE, HEIGHT, white);
      twoToneWall(stage, OUTLINE, 0, 1.4, HEIGHT, dark, white, true);
      // A dark stripe round the atrium at each gallery's floor.
      for (const t of TIERS)
        ribbon(stage, OUTLINE, t.y - 0.02, t.y + 0.35, dark, true);
      // The walls, as solids: straight on the west, east and south, curved
      // round the north corners.
      const t = 0.2;
      solids.push(
        rectSolid(
          BOUNDS.minX - t,
          BOUNDS.minX + t,
          BOUNDS.minZ + 4,
          BOUNDS.maxZ,
        ),
        rectSolid(
          BOUNDS.maxX - t,
          BOUNDS.maxX + t,
          BOUNDS.minZ + 4,
          BOUNDS.maxZ,
        ),
        rectSolid(BOUNDS.minX, BOUNDS.maxX, BOUNDS.maxZ - t, BOUNDS.maxZ + t),
        rectSolid(
          BOUNDS.minX + 4,
          BOUNDS.maxX - 4,
          BOUNDS.minZ - t,
          BOUNDS.minZ + t,
        ),
        ...lineSolids(
          OUTLINE.filter(([, z]) => z < BOUNDS.minZ + 4.01),
          0.4,
        ),
      );

      // ---- The galleries: floors, faces and railings ---------------------------
      TIERS.forEach((tier, i) => {
        const below = i === 0 ? 0 : TIERS[i - 1].y;
        surface(stage, tier.outline, tier.y, white);
        // Its face, from the floor below up to its own, dark at its foot.
        twoToneWall(stage, tier.front, below, below + 1.2, tier.y, dark, white);
        // The lip of its floor.
        ribbon(stage, tier.front, tier.y - 0.25, tier.y + 0.02, dark);
        for (const run of frontRuns(i)) {
          whiteRail(stage, run, tier.y, rail);
          solids.push(...lineSolids(run, 0.3));
        }
      });

      // ---- The stairs -----------------------------------------------------
      for (const s of STAIRS) {
        const steps = Math.round((s.y1 - s.y0) / 0.2);
        const run = (s.rect.maxZ - s.rect.minZ) / steps;
        const w = s.rect.maxX - s.rect.minX;
        const cx = (s.rect.minX + s.rect.maxX) / 2;
        for (let k = 0; k < steps; k++) {
          const top = s.y0 + (k + 1) * 0.2;
          const z = s.rect.maxZ - (k + 0.5) * run;
          block(stage, w, top - s.y0, run, cx, (top + s.y0) / 2, z, white);
        }
        for (const x of [s.rect.minX, s.rect.maxX]) {
          const line: Point[] = [
            [x, s.rect.maxZ],
            [x, s.rect.minZ],
          ];
          // The rail climbing with the flight.
          const curve = new CatmullRomCurve3([
            new Vector3(x, s.y0 + 1.0, s.rect.maxZ),
            new Vector3(x, s.y1 + 1.0, s.rect.minZ),
          ]);
          stage.world.add(new Mesh(new TubeGeometry(curve, 8, 0.035, 8), rail));
          for (let k = 0; k <= 6; k++) {
            const z = s.rect.maxZ - ((s.rect.maxZ - s.rect.minZ) * k) / 6;
            const y = s.y0 + ((s.y1 - s.y0) * k) / 6;
            const post = new Mesh(new CylinderGeometry(0.03, 0.03, 1, 8), rail);
            post.position.set(x, y + 0.5, z);
            stage.world.add(post);
          }
          solids.push(...lineSolids(line, 0.2));
        }
      }

      // ---- The slides -------------------------------------------------------
      const slideMaterial = (colour: string) =>
        stage.keep(
          new MeshStandardMaterial({
            color: colour,
            roughness: 0.28,
            metalness: 0.05,
            side: DoubleSide,
          }),
        );
      const slideMaterials: Record<keyof typeof SLIDE_COLOURS, Material> = {
        red: slideMaterial(SLIDE_COLOURS.red),
        yellow: slideMaterial(SLIDE_COLOURS.yellow),
        blue: slideMaterial(SLIDE_COLOURS.blue),
      };
      const support = stage.keep(
        new MeshStandardMaterial({
          color: '#c9cdcb',
          metalness: 0.5,
          roughness: 0.4,
        }),
      );
      const curves = new Map<string, CatmullRomCurve3>();
      for (const slide of SLIDES) {
        const curve = new CatmullRomCurve3(
          slide.path.map(([x, y, z]) => new Vector3(x, y, z)),
          slide.closed,
        );
        curves.set(slide.id, curve);
        stage.world.add(trough(curve, TROUGH, slideMaterials[slide.colour]));
        // Its supports: slim posts from whatever floor is under it.
        for (let i = 2; i < 12; i += 3) {
          const p = curve.getPointAt(i / 12);
          const floor = Math.max(0, floorAt(p.x, p.z, p.y));
          const h = p.y - TROUGH * 0.8 - floor;
          if (h < 0.8) continue;
          const post = new Mesh(
            new CylinderGeometry(0.06, 0.06, h, 8),
            support,
          );
          post.position.set(p.x, floor + h / 2, p.z);
          stage.world.add(post);
          if (floor === 0)
            solids.push(
              rectSolid(p.x - 0.12, p.x + 0.12, p.z - 0.12, p.z + 0.12),
            );
        }
        mouth(stage, slide, curve, slideMaterials[slide.colour], rail);
      }

      // ---- The parody: queues, a height sign, closed signs ------------------------
      queue(stage, solids, TIERS[0].y);
      heightSign(stage, solids, TIERS[0].y);
      // The blue's mouth chained shut.
      {
        const [x, y, z] = SLIDES.find((s) => s.closed)!.path[0];
        const chain = new CatmullRomCurve3([
          new Vector3(x - 0.9, y + 0.5, z + 0.6),
          new Vector3(x, y + 0.2, z + 0.6),
          new Vector3(x + 0.9, y + 0.5, z + 0.6),
        ]);
        stage.world.add(
          new Mesh(
            new TubeGeometry(chain, 16, 0.025, 6),
            stage.keep(
              new MeshStandardMaterial({
                color: '#d3b33a',
                metalness: 0.7,
                roughness: 0.3,
              }),
            ),
          ),
        );
        const closed = sign(stage, ['RIDE CLOSED'], 0.7, 0.24, {
          background: '#c62c22',
          ink: '#ffffff',
        });
        closed.position.set(x, y + 0.05, z + 0.62);
        stage.world.add(closed);
      }
      // The short slide's mouth: open, and nobody stops you.
      {
        const [x, y, z] = SLIDES.find((s) => s.id === 'short')!.path[0];
        const plate = sign(stage, ['EXPRESS', 'NO WAITING'], 0.7, 0.32, {
          background: '#2f6fd0',
          ink: '#ffffff',
        });
        plate.position.set(x + 0.45, y + 1.8, z);
        plate.rotation.y = Math.PI / 2;
        stage.world.add(plate);
      }

      // ---- White plastic chairs, abandoned ---------------------------------------
      plasticChair(stage, 7.4, 0, 9.6, 2.4);
      plasticChair(stage, 8.2, 0, 10.4, 2.1);
      plasticChair(stage, -9.6, 0, 6.4, -1.4);
      // One facing the wall.
      plasticChair(stage, -1, 0, 11.3, 0);
      for (const [x, z] of [
        [7.4, 9.6],
        [8.2, 10.4],
        [-9.6, 6.4],
        [-1, 11.3],
      ])
        solids.push(rectSolid(x - 0.3, x + 0.3, z - 0.3, z + 0.3));

      // ---- Light: downlights in the ceiling and on each gallery's soffit; portholes ---
      for (let x = -8; x <= 8; x += 4)
        for (let z = -8; z <= 10; z += 3) downlight(stage, x, HEIGHT, z, 0.32);
      // Portholes: in the south wall, the first gallery's face, and the
      // side walls (low by the pools, high over the top gallery).
      for (let x = -10; x <= 10; x += 3.3)
        porthole(stage, x, 2.2, BOUNDS.maxZ - 0.05, Math.PI);
      for (const x of [-3.5, 3.5])
        porthole(stage, x, 2.2, BOUNDS.minZ + TIERS[0].inset + 0.05, 0);
      for (const z of [5, 8]) {
        porthole(stage, BOUNDS.minX + 0.05, 2.2, z, Math.PI / 2);
        porthole(stage, BOUNDS.maxX - 0.05, 2.2, z, -Math.PI / 2);
      }
      for (const z of [-4, 0]) {
        porthole(stage, BOUNDS.minX + 0.05, 13.1, z, Math.PI / 2, {
          w: 0.3,
          h: 0.45,
        });
        porthole(stage, BOUNDS.maxX - 0.05, 13.1, z, -Math.PI / 2, {
          w: 0.3,
          h: 0.45,
        });
      }
      for (const [x, y, z] of [
        [0, 9, 2],
        [0, 3, 6],
      ]) {
        const light = new PointLight('#fff4e2', 18, 22, 1.4);
        light.position.set(x, y, z);
        stage.world.add(light);
      }

      return {
        floorAt,
        solids,
        start: { x: 0, z: 10, yaw: 0, pitch: 0.15 },
      };

      /** A slide's mouth on its gallery: a coloured gate, a SLIDE plate, and, if open, its ride. */
      function mouth(
        stage2: PoolStage,
        slide: Slide,
        curve: CatmullRomCurve3,
        material: Material,
        white2: Material,
      ) {
        const [x, y, z] = slide.path[0];
        const gate = new Group();
        gate.position.set(x, y - 0.6, z);
        const ahead = curve.getTangentAt(0);
        gate.rotation.y = Math.atan2(ahead.x, ahead.z);
        stage2.world.add(gate);
        block(stage2, 0.12, 2.3, 0.12, -0.75, 1.15, 0, material, gate);
        block(stage2, 0.12, 2.3, 0.12, 0.75, 1.15, 0, material, gate);
        block(stage2, 1.62, 0.3, 0.14, 0, 2.3, 0, material, gate);
        const plate = sign(
          stage2,
          [slide.rideable ? 'SLIDE · SIT · FEET FIRST' : 'SLIDE'],
          1.4,
          0.2,
          {
            background: '#ffffff',
            ink: '#222222',
          },
        );
        plate.position.set(0, 2.3, -0.08);
        plate.rotation.y = Math.PI;
        gate.add(plate);
        void white2;
        if (slide.rideable) {
          // The way in: the gate itself, used, sends you down.
          const pad = block(
            stage2,
            1.4,
            0.06,
            0.9,
            0,
            0.03,
            -0.3,
            material,
            gate,
          );
          for (const part of [pad, ...gate.children])
            stage2.usable(part, () => stage2.ride(curve, 7.5));
        }
      }
    },
  );
}

/** Queue barriers on a gallery: posts and straps zig-zagging to the wall, and nowhere. */
function queue(stage: PoolStage, solids: Rect[], y: number) {
  const chrome = stage.keep(
    new MeshStandardMaterial({
      color: '#d7dcdd',
      metalness: 0.85,
      roughness: 0.2,
    }),
  );
  const strap = stage.keep(
    new MeshStandardMaterial({
      color: '#2a3f8f',
      roughness: 0.5,
      side: DoubleSide,
    }),
  );
  // On the first gallery's open strip, in front of the second's face.
  const rows = [-7.6, -6.9, -6.2];
  const x0 = 2.4,
    x1 = 6.6;
  const post = (x: number, z: number) => {
    const p = new Mesh(new CylinderGeometry(0.03, 0.03, 0.95, 10), chrome);
    p.position.set(x, y + 0.475, z);
    stage.world.add(p);
    const base = new Mesh(new CylinderGeometry(0.16, 0.18, 0.04, 16), chrome);
    base.position.set(x, y + 0.02, z);
    stage.world.add(base);
  };
  rows.forEach((z, i) => {
    // Each row's strap leaves its gap at alternate ends.
    const from = i % 2 ? x0 + 1.1 : x0;
    const to = i % 2 ? x1 : x1 - 1.1;
    post(from, z);
    post(to, z);
    post((from + to) / 2, z);
    block(stage, to - from, 0.06, 0.01, (from + to) / 2, y + 0.88, z, strap);
    solids.push(
      ...lineSolids(
        [
          [from, z],
          [to, z],
        ],
        0.15,
      ),
    );
  });
  const end = sign(
    stage,
    ['QUEUE HERE', 'APPROX. WAIT FROM THIS POINT: 45 MIN'],
    0.8,
    0.3,
    {
      background: '#2a3f8f',
      ink: '#ffffff',
    },
  );
  end.position.set(x0 + 0.5, y + 1.3, rows.at(-1)! + 0.05);
  stage.world.add(end);
}

/** The height-restriction sign: its arm far too high for anyone. */
function heightSign(stage: PoolStage, solids: Rect[], y: number) {
  const x = -3.4,
    z = -7.4;
  const yellow = stage.keep(
    new MeshStandardMaterial({ color: '#f2c21b', roughness: 0.5 }),
  );
  const black = stage.keep(
    new MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.5 }),
  );
  const pole = new Mesh(new CylinderGeometry(0.05, 0.05, 5.2, 10), yellow);
  pole.position.set(x, y + 2.6, z);
  stage.world.add(pole);
  for (let k = 0; k < 13; k++)
    block(stage, 0.11, 0.2, 0.11, x, y + 0.2 + k * 0.4, z, black);
  block(stage, 1.1, 0.12, 0.12, x + 0.55, y + 4.9, z, yellow);
  const plate = sign(
    stage,
    ['YOU MUST BE', 'THIS TALL', 'TO RIDE'],
    0.55,
    0.45,
    {
      background: '#f2c21b',
      ink: '#1b1b1b',
    },
  );
  plate.position.set(x, y + 1.6, z + 0.07);
  stage.world.add(plate);
  solids.push(rectSolid(x - 0.15, x + 0.15, z - 0.15, z + 0.15));
}
