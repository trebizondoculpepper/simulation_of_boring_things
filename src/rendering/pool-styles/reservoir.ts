import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  RingGeometry,
  SRGBColorSpace,
} from 'three';
import type { Material } from 'three';
import {
  block,
  column,
  halo,
  handrail,
  sign,
  startPoolRoom,
  surface,
  tiles,
  twoToneWall,
} from './kit';
import type { PoolStage } from './kit';
import {
  BOARDWALK,
  BOUNDS,
  CEILING,
  COLUMNS,
  DEPTH,
  DEPTH_MARKS,
  LANDINGS,
  LANE_ROPES,
  LIFEGUARD_CHAIR,
  SLIT,
  SLITS,
  WALK_LINE,
  WALK_WIDTH,
  markedColumns,
  waterSolids,
} from '../../game/pool-styles/reservoir-plan';
import type { Point } from '../../game/pool-styles/geometry';
import { METRE } from '../../toolkit/components/core/logic/units';

/**
 * The Reservoir (`doc/design/pool-styles.md`, style 3): a vast dark hall
 * flooded wall to wall, its huge round columns rising out of still black
 * water into the dark, crossed by a timber boardwalk between the landings
 * at its two doors. Light comes only from slits high in its walls and a
 * few dim lamps on its columns. It is a municipal reservoir pretending to
 * be a pool: lane ropes are strung across it, its columns are marked with
 * depths (0.5 m, 1.0 m, 2.0 m), a board says a lifeguard is on duty, and
 * the lifeguard's chair stands in the water, so tall its seat is lost in
 * the dark. Plan in `src/game/pool-styles/reservoir-plan.ts`.
 */

/** Old engineering brick, a running bond, its courses in metres. */
function brick(stage: PoolStage, colour = '#4a3a2e') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#1d1814';
  c.fillRect(0, 0, 256, 256);
  // Bricks 0.225 by 0.075 m: a metre square is about 4.4 by 13 of them.
  const rows = 13,
    cols = 4;
  const h = 256 / rows,
    w = 256 / cols;
  for (let r = 0; r < rows; r++)
    for (let k = -1; k < cols; k++) {
      const shade = 0.75 + (((r * 31 + k * 17) % 7) / 7) * 0.35;
      const base = parseInt(colour.slice(1), 16);
      const rr = Math.min(255, ((base >> 16) & 255) * shade);
      const gg = Math.min(255, ((base >> 8) & 255) * shade);
      const bb = Math.min(255, (base & 255) * shade);
      c.fillStyle = `rgb(${rr | 0}, ${gg | 0}, ${bb | 0})`;
      const x = k * w + (r % 2 ? w / 2 : 0);
      c.fillRect(x + 2, r * h + 2, w - 4, h - 3);
    }
  const texture = stage.texture(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return stage.keep(
    new MeshStandardMaterial({ map: texture, roughness: 0.85 }),
  );
}

export function startReservoirRoom(canvas: HTMLCanvasElement) {
  return startPoolRoom(
    canvas,
    'pool_reservoir',
    {
      bounds: BOUNDS,
      background: '#050b0a',
      fog: [6, 30],
      sky: ['#9fb6b0', '#0a1210', 0.4],
      exposure: 1.4,
    },
    (stage) => {
      const { world } = stage;
      const b = BOUNDS;
      const outline: Point[] = [
        [b.minX, b.minZ],
        [b.maxX, b.minZ],
        [b.maxX, b.maxZ],
        [b.minX, b.maxZ],
      ];

      // The hall: black tile below, dark tile above, a dark floor far
      // down under the water and a ceiling lost in the dark.
      const black = tiles(stage, '#121716', { tile: 0.125, roughness: 0.3 });
      const dark = tiles(stage, '#2a3533', { tile: 0.25, roughness: 0.5 });
      twoToneWall(stage, outline, -DEPTH, 2.4, CEILING, black, dark, true);
      surface(stage, outline, -DEPTH, tiles(stage, '#0f1615'));
      surface(stage, outline, CEILING, dark);

      // The water: still, black-green, a dark mirror.
      const still = stage.keep(
        new MeshStandardMaterial({
          color: '#0b231e',
          transparent: true,
          opacity: 0.93,
          roughness: 0.04,
          metalness: 0.45,
          side: DoubleSide,
          depthWrite: false,
        }),
      );
      surface(stage, outline, -0.12, still);

      // The landings: tiled platforms standing up out of the water.
      const deck = tiles(stage, '#8f9a92', { tile: 0.125 });
      for (const l of LANDINGS)
        block(
          stage,
          l.maxX - l.minX,
          DEPTH,
          l.maxZ - l.minZ,
          (l.minX + l.maxX) / 2,
          -DEPTH / 2,
          (l.minZ + l.maxZ) / 2,
          deck,
        );

      // The boardwalk: timber planks on posts, a rope rail on its
      // outer edge, doglegging between the columns.
      const timber = stage.keep(
        new MeshStandardMaterial({ color: '#5b4733', roughness: 0.8 }),
      );
      const oldTimber = stage.keep(
        new MeshStandardMaterial({ color: '#3f3125', roughness: 0.9 }),
      );
      for (const w of BOARDWALK) {
        const along = w.maxX - w.minX > w.maxZ - w.minZ;
        const length = along ? w.maxX - w.minX : w.maxZ - w.minZ;
        const n = Math.round(length / 0.25);
        for (let i = 0; i < n; i++) {
          const u = (i + 0.5) * (length / n);
          if (along)
            block(
              stage,
              length / n - 0.02,
              0.06,
              WALK_WIDTH,
              w.minX + u,
              -0.03,
              (w.minZ + w.maxZ) / 2,
              i % 3 ? timber : oldTimber,
            );
          else
            block(
              stage,
              WALK_WIDTH,
              0.06,
              length / n - 0.02,
              (w.minX + w.maxX) / 2,
              -0.03,
              w.minZ + u,
              i % 3 ? timber : oldTimber,
            );
        }
        // Its posts down into the water, every two metres each side.
        for (let u = 0.3; u < length; u += 2)
          for (const side of [-1, 1]) {
            const x = along
              ? w.minX + u
              : (w.minX + w.maxX) / 2 + side * (WALK_WIDTH / 2 - 0.1);
            const z = along
              ? (w.minZ + w.maxZ) / 2 + side * (WALK_WIDTH / 2 - 0.1)
              : w.minZ + u;
            const post = new Mesh(
              new CylinderGeometry(0.08, 0.08, DEPTH, 8),
              oldTimber,
            );
            post.position.set(x, -DEPTH / 2 - 0.06, z);
            world.add(post);
          }
      }
      // Its rails, both sides, following its line.
      for (const side of [-1, 1]) {
        const rail: [number, number, number][] = [];
        for (let i = 0; i < WALK_LINE.length; i++) {
          const [x, z] = WALK_LINE[i];
          const [px, pz] = WALK_LINE[Math.max(0, i - 1)];
          const [nx, nz] = WALK_LINE[Math.min(WALK_LINE.length - 1, i + 1)];
          // Offset by the mitre of its two legs.
          const ax = x - px || nx - x,
            az = z - pz || nz - z;
          const bx = nx - x || x - px,
            bz = nz - z || z - pz;
          const la = Math.hypot(ax, az) || 1,
            lb = Math.hypot(bx, bz) || 1;
          const ox = -(az / la + bz / lb),
            oz = ax / la + bx / lb;
          const lo = Math.hypot(ox, oz) || 1;
          const mitre =
            (WALK_WIDTH / 2 - 0.05) /
            Math.max(
              0.5,
              Math.abs((ox / lo) * (-az / la) + (oz / lo) * (ax / la)),
            );
          rail.push([
            x + side * (ox / lo) * mitre,
            0,
            z + side * (oz / lo) * mitre,
          ]);
        }
        // Straight runs, not curves: one rail a leg.
        for (let i = 1; i < rail.length; i++) {
          const [ax, , az] = rail[i - 1];
          const [bx, , bz] = rail[i];
          handrail(
            stage,
            [
              [ax, 0, az],
              [(ax + bx) / 2, 0, (az + bz) / 2],
              [bx, 0, bz],
            ],
            { height: 0.9, pitch: 2 },
          );
        }
      }

      // The columns: a forest of them, brick and dark tile, some tapering.
      const brickMaterial = brick(stage);
      const tileColumn = tiles(stage, '#232b29', {
        tile: 0.125,
        roughness: 0.35,
      });
      for (const c of COLUMNS)
        column(
          stage,
          c.x,
          c.z,
          c.r,
          -DEPTH,
          CEILING,
          c.brick ? brickMaterial : tileColumn,
          c.top,
        );

      // Depth marks, painted on the columns nearest the boardwalk.
      markedColumns().forEach((c, i) => {
        const mark = sign(stage, [DEPTH_MARKS[i]], 1.2, 0.5, {
          background: '#e9e4d2',
          ink: '#141414',
        });
        // On the column's face toward the boardwalk's nearest leg.
        const w = BOARDWALK.reduce((best, r) => {
          const d = (q: typeof r) =>
            Math.hypot(
              Math.max(q.minX - c.x, 0, c.x - q.maxX),
              Math.max(q.minZ - c.z, 0, c.z - q.maxZ),
            );
          return d(r) < d(best) ? r : best;
        });
        const tx = Math.min(Math.max(c.x, w.minX), w.maxX) - c.x;
        const tz = Math.min(Math.max(c.z, w.minZ), w.maxZ) - c.z;
        const yaw = Math.atan2(tx, tz);
        mark.position.set(
          c.x + Math.sin(yaw) * (c.r + 0.03),
          1.4,
          c.z + Math.cos(yaw) * (c.r + 0.03),
        );
        mark.rotation.y = yaw;
        world.add(mark);
      });

      // The lane ropes: red and white floats on a line, wall to wall.
      const red = stage.keep(
        new MeshStandardMaterial({ color: '#b8352b', roughness: 0.5 }),
      );
      const white = stage.keep(
        new MeshStandardMaterial({ color: '#e7e6df', roughness: 0.5 }),
      );
      for (const z of LANE_ROPES)
        for (let x = b.minX + 0.3, i = 0; x < b.maxX - 0.3; x += 0.32, i++) {
          if (COLUMNS.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.1))
            continue;
          const float = new Mesh(
            new CylinderGeometry(0.09, 0.09, 0.28, 10),
            Math.floor(i / 6) % 2 ? red : white,
          );
          float.rotation.z = Math.PI / 2;
          float.position.set(x, -0.1, z);
          world.add(float);
        }

      // The lifeguard's high chair, absurdly tall, in the water.
      {
        const steel = stage.keep(
          new MeshStandardMaterial({
            color: '#d9d9d2',
            roughness: 0.4,
            metalness: 0.3,
          }),
        );
        const { x, z, seat } = LIFEGUARD_CHAIR;
        const chair = new Group();
        chair.position.set(x, 0, z);
        world.add(chair);
        const height = seat + DEPTH;
        for (const [lx, lz] of [
          [-0.45, -0.45],
          [0.45, -0.45],
          [-0.45, 0.45],
          [0.45, 0.45],
        ] as const) {
          const leg = new Mesh(
            new CylinderGeometry(0.05, 0.05, height, 8),
            steel,
          );
          leg.position.set(lx, height / 2 - DEPTH, lz);
          chair.add(leg);
        }
        // Its ladder's rungs, up the front, every 0.3 m, into the dark.
        for (let y = 0.3; y < seat; y += 0.3)
          block(stage, 0.9, 0.04, 0.04, 0, y, 0.45, steel, chair);
        for (let y = 2; y < seat; y += 3) {
          block(stage, 0.9, 0.04, 0.04, 0, y, -0.45, steel, chair);
          block(stage, 0.04, 0.04, 0.9, -0.45, y, 0, steel, chair);
          block(stage, 0.04, 0.04, 0.9, 0.45, y, 0, steel, chair);
        }
        block(stage, 1.0, 0.08, 1.0, 0, seat, 0, steel, chair);
        block(stage, 1.0, 0.7, 0.06, 0, seat + 0.4, -0.5, steel, chair);
      }

      // The board at the west landing: a lifeguard is on duty.
      {
        const board = sign(stage, ['LIFEGUARD', 'ON DUTY'], 1.0, 0.7, {
          background: '#c23a2c',
          ink: '#ffffff',
        });
        const l = LANDINGS[0];
        board.position.set(l.minX + 1.4, 1.6, l.minZ + 0.4);
        world.add(board);
        const post = new Mesh(
          new CylinderGeometry(0.04, 0.04, 1.6, 8),
          stage.keep(
            new MeshStandardMaterial({ color: '#888c8a', metalness: 0.5 }),
          ),
        );
        post.position.set(l.minX + 1.4, 0.8, l.minZ + 0.35);
        world.add(post);
        const notice = sign(
          stage,
          ['RESERVOIR', 'BATHING BY PERMIT ONLY', 'NO DIVING'],
          1.1,
          0.55,
          {
            background: '#e9e6da',
            ink: '#1d3557',
          },
        );
        notice.position.set(l.maxX - 1.2, 1.5, l.maxZ - 0.17);
        notice.rotation.y = Math.PI;
        world.add(notice);
      }

      // Slits high in the walls, the cold light coming in.
      const daylight = stage.keep(
        new MeshBasicMaterial({ color: '#dfeef0', side: DoubleSide }),
      );
      for (const slit of SLITS) {
        const h = SLIT.top - SLIT.bottom;
        const pane = new Mesh(new PlaneGeometry(SLIT.width, h), daylight);
        const y = (SLIT.top + SLIT.bottom) / 2;
        if (slit.side === 'north') pane.position.set(slit.at, y, b.minZ + 0.02);
        else {
          pane.rotation.y = Math.PI / 2;
          pane.position.set(
            slit.side === 'west' ? b.minX + 0.02 : b.maxX - 0.02,
            y,
            slit.at,
          );
        }
        world.add(pane);
        const glow = halo(stage, '214, 236, 240', 6);
        glow.position.copy(pane.position);
        world.add(glow);
        const light = new PointLight('#cfe6ea', 0.9, 18 * METRE, 0);
        light.position.copy(pane.position);
        if (slit.side === 'north') light.position.z += 1;
        else light.position.x += slit.side === 'west' ? 1 : -1;
        world.add(light);
      }

      // A few dim lamps on columns along the boardwalk, warm and failing.
      const lampGlass = stage.keep(new MeshBasicMaterial({ color: '#ffd9a0' }));
      markedColumns().forEach((c, i) => {
        const lamp = new Mesh(
          new CylinderGeometry(0.12, 0.12, 0.25, 12),
          lampGlass,
        );
        const yaw = (i * 2.1) % (Math.PI * 2);
        lamp.position.set(
          c.x + Math.sin(yaw) * (c.r + 0.1),
          3.2,
          c.z + Math.cos(yaw) * (c.r + 0.1),
        );
        world.add(lamp);
        const glow = halo(stage, '255, 214, 160', 1.6);
        glow.position.copy(lamp.position);
        world.add(glow);
        const light = new PointLight('#ffc98a', 0.9, 11 * METRE, 0);
        light.position.copy(lamp.position);
        world.add(light);
      });

      // Low lamps at the boardwalk's corners, to see the way by.
      for (const [x, z] of WALK_LINE.slice(1, -1)) {
        const bollard = new Mesh(
          new CylinderGeometry(0.06, 0.06, 0.5, 10),
          oldTimber,
        );
        bollard.position.set(
          x + WALK_WIDTH / 2 - 0.12,
          0.25,
          z + WALK_WIDTH / 2 - 0.12,
        );
        world.add(bollard);
        const lamp = new Mesh(
          new CylinderGeometry(0.08, 0.08, 0.1, 10),
          lampGlass,
        );
        lamp.position.set(bollard.position.x, 0.55, bollard.position.z);
        world.add(lamp);
        const glow = halo(stage, '255, 214, 160', 1.1);
        glow.position.copy(lamp.position);
        world.add(glow);
        const light = new PointLight('#ffc98a', 0.6, 7 * METRE, 0);
        light.position.set(x, 0.8, z);
        world.add(light);
      }

      // Drips: rings spreading slowly on the black water, here and there.
      const ringMaterial = stage.keep(
        new MeshBasicMaterial({
          color: '#7fa59c',
          transparent: true,
          opacity: 0,
          side: DoubleSide,
          depthWrite: false,
        }),
      );
      const drips = Array.from({ length: 5 }, (_, i) => {
        const ring = new Mesh(
          new RingGeometry(0.9, 1, 32),
          (ringMaterial as Material).clone() as MeshBasicMaterial,
        );
        stage.keep(ring.material as Material);
        ring.rotation.x = -Math.PI / 2;
        world.add(ring);
        return { ring, phase: i * 1.7, x: 0, z: 0 };
      });
      const place = (d: (typeof drips)[number], cycle: number) => {
        const h = Math.sin((cycle + d.phase) * 91.7) * 43758.5;
        const f = h - Math.floor(h);
        d.x = b.minX + 4 + f * (b.maxX - b.minX - 8);
        d.z = b.minZ + 4 + ((f * 7.3) % 1) * (b.maxZ - b.minZ - 12);
      };

      return {
        solids: [
          ...waterSolids(),
          ...COLUMNS.map((c) => ({
            minX: c.x - c.r,
            maxX: c.x + c.r,
            minZ: c.z - c.r,
            maxZ: c.z + c.r,
          })),
        ],
        start: { x: -14, z: 11, yaw: Math.PI / 2, pitch: 0.05 },
        update(_delta, time) {
          for (const d of drips) {
            const period = 7;
            const t = (time + d.phase) / period;
            const cycle = Math.floor(t);
            const s = t - cycle;
            if (s < 0.02) place(d, cycle);
            d.ring.position.set(d.x, -0.1, d.z);
            d.ring.scale.setScalar(0.1 + s * 2.2);
            (d.ring.material as MeshBasicMaterial).opacity = 0.35 * (1 - s);
          }
        },
      };
    },
  );
}
