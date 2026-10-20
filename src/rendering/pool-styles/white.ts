import {
  BoxGeometry,
  DoubleSide,
  PlaneGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Material, Sprite } from 'three';
import {
  block,
  circle,
  halo,
  handrail,
  plasticChair,
  pool,
  ribbon,
  sign,
  startPoolRoom,
  surface,
  tiles,
  water,
} from './kit';
import type { PoolStage } from './kit';
import {
  BAYS,
  BOARD,
  BOUNDS,
  CEILING,
  GOING,
  OUTLINE,
  PLATFORM,
  PLATFORM_Y,
  POOL,
  RISER,
  STAIR,
  STAIR_RUNS,
  TOWER,
  bayScreen,
  floorAt,
  solids,
} from '../../game/pool-styles/white-plan';

/**
 * The White Room (`doc/design/pool-styles.md`, style 4): the bright,
 * white, misty dreamcore room. White tile on every surface, white light
 * from a ceiling of square lamps, and a white haze thick enough that the far
 * side fades and no corner shows. A straight white stair climbs the west
 * wall, landing above landing, to a platform on a white tower and a
 * diving board out over a round pool too deep to see the bottom of. On
 * the ground floor, each alone in its bay, a drinking fountain and one
 * plastic chair. The parody: the haze is plainly steam (the pool is at
 * 41 °C, the plant room's fault), and every single object is labelled as
 * an exhibit. Laid out from `src/game/pool-styles/white-plan.ts`.
 */

/** A box whose tiles are laid in metres on every face. */
function tiledBox(
  stage: PoolStage,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  material: Material,
) {
  const geometry = new BoxGeometry(w, h, d);
  const uv = geometry.getAttribute('uv');
  // BoxGeometry's faces, four vertices each: ±x (d by h), ±y (w by d), ±z (w by h).
  const sizes: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, uv.getX(i) * sizes[f][0], uv.getY(i) * sizes[f][1]);
    }
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  stage.world.add(mesh);
  return mesh;
}

/**
 * A square ceiling light at (x, z): its panel flush in the ceiling and a
 * soft glow hung clear below it, so the ceiling does not cut it in half.
 */
function ceilingLamp(
  stage: PoolStage,
  x: number,
  z: number,
  material: Material,
) {
  const panel = new Mesh(new PlaneGeometry(0.6, 0.6), material);
  panel.rotation.x = Math.PI / 2;
  panel.position.set(x, CEILING - 0.01, z);
  stage.world.add(panel);
  const glow = halo(stage, '255, 255, 255', 1.1);
  glow.position.set(x, CEILING - 0.45, z);
  stage.world.add(glow);
}

/** A gallery label on a small white plinth, at (x, z), facing `yaw`. */
function exhibitLabel(
  stage: PoolStage,
  x: number,
  z: number,
  yaw: number,
  lines: readonly string[],
  plinth: Material,
) {
  const group = new Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  stage.world.add(group);
  block(stage, 0.36, 1.05, 0.28, 0, 0.525, 0, plinth, group);
  const card = sign(stage, lines, 0.32, 0.16, {
    background: '#fbfbf8',
    ink: '#3a3a38',
    font: 'Georgia, "Times New Roman", serif',
  });
  // Laid on the plinth's sloping top, toward the reader.
  card.position.set(0, 1.07, 0.02);
  card.rotation.x = -Math.PI / 3;
  group.add(card);
}

export function startWhiteRoom(canvas: HTMLCanvasElement) {
  return startPoolRoom(
    canvas,
    'pool_white',
    {
      bounds: BOUNDS,
      background: '#eef2f0',
      fog: [6, 34],
      sky: ['#ffffff', '#e2ebe8', 2.4],
      exposure: 1.15,
    },
    (stage) => {
      const white = tiles(stage, '#f5f7f5');
      const lampMaterial = stage.keep(
        new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide }),
      );
      const floorTiles = tiles(stage, '#eef1ee', { roughness: 0.18 });
      const ceilingTiles = tiles(stage, '#f7f9f8');
      const stairTiles = tiles(stage, '#f4f6f4', { tile: 0.1 });

      // The room: its floor round the pool, its walls, its ceiling of light.
      const edge = circle(POOL.x, POOL.z, POOL.r, 64);
      surface(stage, OUTLINE, 0, floorTiles, [edge]);
      ribbon(stage, OUTLINE, -0.2, CEILING, white, true);
      surface(stage, OUTLINE, CEILING, ceilingTiles);
      for (let x = -12; x <= 12; x += 4)
        for (let z = -12; z <= 12; z += 4)
          if (Math.hypot(x, z) < 17) ceilingLamp(stage, x, z, lampMaterial);

      // The pool: pale water over a basin so deep the haze hides its floor.
      const poolWater = water(stage, '#d6ecea', 0.5);
      pool(stage, edge, 0, POOL.depth, white, poolWater);

      // The stair: solid white steps up the west wall, landing above landing.
      const width = STAIR.maxX - STAIR.minX;
      const cx = (STAIR.minX + STAIR.maxX) / 2;
      for (const run of STAIR_RUNS) {
        if (run.y0 === run.y1) {
          tiledBox(
            stage,
            width,
            run.y0,
            run.from - run.to,
            cx,
            run.y0 / 2,
            (run.from + run.to) / 2,
            stairTiles,
          );
          continue;
        }
        const steps = Math.round((run.y1 - run.y0) / RISER);
        for (let i = 0; i < steps; i++) {
          const top = run.y0 + (i + 1) * RISER;
          const z = run.from - (i + 0.5) * GOING;
          tiledBox(stage, width, top, GOING, cx, top / 2, z, stairTiles);
        }
      }
      // Its rail, up the open side, over every flight and landing.
      const rail: [number, number, number][] = [];
      for (const run of STAIR_RUNS) {
        rail.push([STAIR.maxX - 0.08, run.y0, run.from]);
        rail.push([STAIR.maxX - 0.08, run.y1, run.to]);
      }
      handrail(stage, rail, { pitch: 1.2 });

      // The tower and its platform, and the diving board out over the pool.
      const t = TOWER;
      tiledBox(
        stage,
        t.maxX - t.minX,
        PLATFORM_Y,
        t.maxZ - t.minZ,
        (t.minX + t.maxX) / 2,
        PLATFORM_Y / 2,
        (t.minZ + t.maxZ) / 2,
        white,
      );
      for (const p of PLATFORM)
        tiledBox(
          stage,
          p.maxX - p.minX,
          0.3,
          p.maxZ - p.minZ,
          (p.minX + p.maxX) / 2,
          PLATFORM_Y - 0.15,
          (p.minZ + p.maxZ) / 2,
          stairTiles,
        );
      handrail(stage, [
        [t.minX + 0.1, PLATFORM_Y, t.maxZ - 0.08],
        [t.maxX - 0.08, PLATFORM_Y, t.maxZ - 0.08],
        [t.maxX - 0.08, PLATFORM_Y, BOARD.z + BOARD.width],
      ]);
      handrail(stage, [
        [t.maxX - 0.08, PLATFORM_Y, BOARD.z - BOARD.width],
        [t.maxX - 0.08, PLATFORM_Y, t.minZ + 0.08],
        [STAIR.minX + 0.1, PLATFORM_Y, t.minZ + 0.08],
      ]);
      const vinyl = stage.keep(
        new MeshStandardMaterial({ color: '#f1f0e9', roughness: 0.55 }),
      );
      const steel = stage.keep(
        new MeshStandardMaterial({
          color: '#d7dbdc',
          metalness: 0.85,
          roughness: 0.22,
        }),
      );
      const length = BOARD.to - BOARD.from;
      block(
        stage,
        length + 0.6,
        0.06,
        BOARD.width,
        BOARD.from + length / 2 - 0.3,
        BOARD.y,
        BOARD.z,
        vinyl,
      );
      // Its stand: the fulcrum and the anchor on the platform.
      block(
        stage,
        0.5,
        0.12,
        BOARD.width + 0.1,
        BOARD.from + 0.9,
        PLATFORM_Y + 0.06,
        BOARD.z,
        steel,
      );
      block(
        stage,
        0.3,
        0.12,
        BOARD.width + 0.1,
        BOARD.from - 0.2,
        PLATFORM_Y + 0.06,
        BOARD.z,
        steel,
      );

      // The bays: a curved screen behind each single thing.
      const plinth = stage.keep(
        new MeshStandardMaterial({ color: '#fbfbf9', roughness: 0.5 }),
      );
      for (const bay of BAYS) {
        const screen = bayScreen(bay);
        ribbon(stage, screen, 0, 3.2, white);
        // Its back, so it is a screen and not a sheet.
        ribbon(stage, [...screen].reverse(), 0, 3.2, white);
        const yaw = bay.facing;
        if (bay.id === 'chair') {
          plasticChair(stage, bay.x, 0, bay.z, Math.PI - yaw);
          exhibitLabel(
            stage,
            bay.x + 1.2,
            bay.z - 0.6,
            Math.PI - yaw,
            ['Chair.', 'Polypropylene. On loan.'],
            plinth,
          );
        } else {
          // A stainless drinking fountain on a white column.
          const fountain = new Group();
          fountain.position.set(bay.x, 0, bay.z);
          fountain.rotation.y = Math.PI - yaw;
          stage.world.add(fountain);
          const col = new Mesh(
            new CylinderGeometry(0.14, 0.18, 0.85, 20),
            plinth,
          );
          col.position.y = 0.425;
          fountain.add(col);
          const bowl = new Mesh(
            new CylinderGeometry(0.26, 0.16, 0.12, 24),
            steel,
          );
          bowl.position.y = 0.91;
          fountain.add(bowl);
          const spout = new Mesh(
            new CylinderGeometry(0.015, 0.015, 0.12, 8),
            steel,
          );
          spout.position.set(0, 1.0, -0.08);
          fountain.add(spout);
          exhibitLabel(
            stage,
            bay.x - 0.6,
            bay.z + 1.2,
            Math.PI - yaw,
            ['Drinking Fountain.', 'Stainless steel. Not in use.'],
            plinth,
          );
        }
      }

      // The diving board's own label, at the tower's foot, facing the room.
      exhibitLabel(
        stage,
        -3.6,
        -2.6,
        Math.PI * 0.75,
        ['Diving Board, 1983.', 'Concrete, steel, vinyl.'],
        plinth,
      );

      // The pool's temperature, on a plaque by its edge: the cause of it all.
      const plaque = new Group();
      plaque.position.set(POOL.x + 3.6, 0, POOL.z + POOL.r + 0.9);
      stage.world.add(plaque);
      block(stage, 0.06, 1.4, 0.06, 0, 0.7, 0, steel, plaque);
      const reading = sign(stage, ['POOL TEMPERATURE', '41 °C'], 0.6, 0.34, {
        background: '#ffffff',
        ink: '#2c3a3a',
      });
      reading.position.set(0, 1.45, 0.04);
      plaque.add(reading);
      const notice = sign(
        stage,
        ['PLEASE DO NOT', 'DIVE INTO THE STEAM'],
        0.6,
        0.2,
        { background: '#ffffff', ink: '#7a3a2a' },
      );
      notice.position.set(0, 1.12, 0.04);
      plaque.add(notice);

      // A steam vent in the floor by the pool, and the steam itself rising
      // off the water and the vent, the haze's source in plain sight.
      const grate = stage.keep(new MeshBasicMaterial({ color: '#c6cbca' }));
      const vent = { x: POOL.x - 3.4, z: POOL.z + POOL.r + 1.4 };
      for (let i = 0; i < 6; i++)
        block(
          stage,
          0.9,
          0.02,
          0.04,
          vent.x,
          0.01,
          vent.z - 0.25 + i * 0.1,
          grate,
        );
      const puffs: {
        sprite: Sprite;
        x: number;
        z: number;
        phase: number;
        speed: number;
        material: Material;
      }[] = [];
      const seed = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;
      for (let i = 0; i < 26; i++) {
        const fromVent = i < 6;
        const a = Math.abs(seed(i + 1)) * Math.PI * 2;
        const r = Math.sqrt(Math.abs(seed(i + 7))) * (POOL.r - 0.6);
        const sprite = halo(stage, '255, 255, 255', 2);
        const material = stage.keep((sprite.material as Material).clone());
        sprite.material = material as typeof sprite.material;
        stage.world.add(sprite);
        puffs.push({
          sprite,
          x: fromVent
            ? vent.x + (seed(i + 3) - 0.5) * 0.4
            : POOL.x + r * Math.cos(a),
          z: fromVent
            ? vent.z + (seed(i + 5) - 0.5) * 0.3
            : POOL.z + r * Math.sin(a),
          phase: Math.abs(seed(i + 11)),
          speed: fromVent ? 0.18 : 0.08 + Math.abs(seed(i + 13)) * 0.05,
          material,
        });
      }

      return {
        floorAt,
        solids: solids(),
        start: { x: 2, z: 11, yaw: -0.15, pitch: 0.05 },
        update(_delta, time) {
          for (const puff of puffs) {
            // Each rises, swelling and thinning, and begins again.
            const s = (time * puff.speed + puff.phase) % 1;
            puff.sprite.position.set(
              puff.x + Math.sin(time * 0.3 + puff.phase * 6) * 0.3,
              0.2 + s * 7,
              puff.z,
            );
            puff.sprite.scale.setScalar(1 + s * 3.2);
            (puff.material as MeshBasicMaterial).opacity =
              Math.sin(Math.PI * s) * 0.16;
          }
        },
      };
    },
  );
}
