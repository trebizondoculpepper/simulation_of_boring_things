import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  SRGBColorSpace,
  Shape,
  ShapeGeometry,
  TorusGeometry,
  DoubleSide,
} from 'three';
import type { Material } from 'three';
import {
  block,
  downlight,
  halo,
  porthole,
  sign,
  startPoolRoom,
  surface,
  tiles,
  water,
} from './kit';
import type { PoolStage } from './kit';
import {
  BOUNDS,
  CHAMBERS,
  CORRIDOR,
  MOUTHS,
  START,
  STAIR,
  TUNNELS,
  floorAt,
  sideOf,
  solids,
  stations,
} from '../../game/pool-styles/tunnel-plan';
import type {
  Mouth,
  Station,
  Tunnel,
} from '../../game/pool-styles/tunnel-plan';
import type { Point } from '../../game/pool-styles/geometry';

/**
 * The Porthole Tunnel (`doc/design/pool-styles.md`, style 2), drawn from
 * its plan (`src/game/pool-styles/tunnel-plan.ts`): barrel-vaulted
 * tunnels tiled from floor to crown, their floors curving into their
 * walls, oval porthole lamps down both sides at a steady pitch and a
 * green band at hand height; a channel of water down one, water
 * underfoot in another, which bends, narrows to barely a walker's width
 * and widens again; a stairway climbing to a short upper tunnel and back
 * down; a flooded hotel corridor, carpet under the water, its numbered
 * doors locked and a pool ring drifting along it; four tiled chambers
 * where they meet, opened in their mouths. The parody is a transport
 * system's signage: WAY OUT both ways, MIND THE STEP where there is none,
 * stencilled tunnel numbers, a width restriction.
 */

const CREAM = '#e7e2c8';
const GREEN = '#2f5b48';

/** A tunnel's cross-section at width `w`: its floor curving into its walls and over its vault, as (across, up) points round a loop. */
function profile(w: number, channel = 0): Point[] {
  const half = w / 2;
  const cove = Math.min(0.3, w / 4);
  const spring = Math.max(1.4, 2.3 - half);
  const points: Point[] = [];
  // Left cove, wall, vault, right wall, right cove.
  for (let i = 0; i <= 4; i++) {
    const a = -Math.PI / 2 - (i / 4) * (Math.PI / 2);
    points.push([-half + cove + cove * Math.cos(a), cove + cove * Math.sin(a)]);
  }
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    points.push([half * Math.cos(a), spring + half * Math.sin(a)]);
  }
  for (let i = 0; i <= 4; i++) {
    const a = -(i / 4) * (Math.PI / 2);
    points.push([half - cove + cove * Math.cos(a), cove + cove * Math.sin(a)]);
  }
  // Back along the floor, dipping into the channel if it has one.
  if (channel) {
    const c = channel / 2;
    points.push([c, 0], [c, -0.4], [-c, -0.4], [-c, 0]);
  }
  points.push([-half + cove, 0]);
  return points;
}

/** The floor a tunnel is drawn at: its walking floor, lowered gently where water lies underfoot. */
function drawnFloor(tunnel: Tunnel, s: number, length: number) {
  const floor = tunnel.floor(s, length);
  const wet = tunnel.wet;
  if (!wet) return floor;
  const into = Math.min(s - wet.from + 1, wet.to - s + 1, 1);
  return floor - wet.depth * Math.max(0, Math.min(1, into));
}

/** Sweep a cross-section (made for each station) along a tunnel's stations, its tiles in metres. */
function sweep(
  stage: PoolStage,
  list: readonly Station[],
  section: (st: Station) => readonly Point[],
  base: (st: Station) => number,
  material: Material,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let n = 0;
  for (const st of list) {
    const points = section(st);
    n = points.length;
    let u = 0;
    points.forEach(([across, up], j) => {
      if (j) u += Math.hypot(across - points[j - 1][0], up - points[j - 1][1]);
      positions.push(
        st.x + st.rx * across,
        base(st) + up,
        st.z + st.rz * across,
      );
      uvs.push(u, st.s);
    });
  }
  for (let i = 1; i < list.length; i++)
    for (let j = 1; j < n; j++) {
      const a = (i - 1) * n + j - 1,
        b = (i - 1) * n + j,
        c = i * n + j,
        d = i * n + j - 1;
      index.push(a, b, c, a, c, d);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, material);
  stage.world.add(mesh);
  return mesh;
}

/** A canvas-patterned material, `size` metres a repeat. */
function patterned(
  stage: PoolStage,
  draw: (c: CanvasRenderingContext2D, px: number) => void,
  size: number,
  roughness = 0.8,
) {
  const px = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  draw(canvas.getContext('2d')!, px);
  const texture = stage.texture(new CanvasTexture(canvas));
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / size, 1 / size);
  return stage.keep(
    new MeshStandardMaterial({ map: texture, roughness, side: DoubleSide }),
  );
}

/** A flat panel in a wall's (u, v) plane, put onto that wall. */
function onWall(
  stage: PoolStage,
  mesh: Mesh,
  along: 'x' | 'z',
  at: number,
  u: number,
  v: number,
  inward: number,
) {
  // Facing into the room: +z for a north wall (inward +1), and so on.
  if (along === 'x') {
    mesh.position.set(u, v, at + inward * 0.02);
    mesh.rotation.y = inward > 0 ? 0 : Math.PI;
  } else {
    mesh.position.set(at + inward * 0.02, v, u);
    mesh.rotation.y = inward > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
  stage.world.add(mesh);
}

export function startTunnelRoom(canvas: HTMLCanvasElement) {
  return startPoolRoom(
    canvas,
    'pool_tunnel',
    {
      bounds: BOUNDS,
      background: '#0b0e0c',
      fog: [4, 26],
      sky: ['#fff6e2', '#3a3f36', 0.7],
    },
    (stage) => {
      const cream = tiles(stage, CREAM);
      const green = tiles(stage, GREEN);
      const deep = water(stage, '#2a6f68', 0.82);
      const shallow = water(stage, '#5f9c8e', 0.55);

      // ---- The tunnels ------------------------------------------------------
      for (const tunnel of TUNNELS) {
        const list = stations(tunnel);
        const length = list.at(-1)!.s;
        const width = (st: Station) => tunnel.width(st.s, length);
        const base = (st: Station) => drawnFloor(tunnel, st.s, length);
        sweep(
          stage,
          list,
          (st) => profile(width(st), tunnel.channel),
          base,
          cream,
        );
        // The green band at hand height, down both walls.
        for (const side of [1, -1])
          sweep(
            stage,
            list,
            (st) => {
              const u = side * (width(st) / 2 - 0.012);
              return [
                [u, 0.95],
                [u, 1.07],
              ];
            },
            base,
            green,
          );
        if (tunnel.channel) {
          const c = tunnel.channel / 2;
          sweep(
            stage,
            list,
            () => [
              [-c, -0.1],
              [c, -0.1],
            ],
            base,
            deep,
          );
        }
        if (tunnel.wet) {
          const wet = tunnel.wet;
          sweep(
            stage,
            list.filter((st) => st.s >= wet.from && st.s <= wet.to + 1),
            (st) => [
              [-width(st) / 2 + 0.05, wet.depth - 0.03],
              [width(st) / 2 - 0.05, wet.depth - 0.03],
            ],
            base,
            shallow,
          );
        }
        // The stairway's steps, on its climbs.
        if (tunnel.id === 'stairway') {
          const going = STAIR.run / (STAIR.rise / 0.16);
          const steps = Math.round(STAIR.rise / 0.16);
          for (const up of [true, false])
            for (let k = 0; k < steps; k++) {
              const s = up ? (k + 0.5) * going : length - (k + 0.5) * going;
              const st = list.reduce((a, b) =>
                Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a,
              );
              const top = (k + 1) * 0.16;
              const tread = block(
                stage,
                width(st) - 0.08,
                top,
                going,
                0,
                top / 2,
                0,
                cream,
              );
              tread.position.set(st.x, top / 2, st.z);
              // Its width across the stair.
              tread.rotation.y = Math.atan2(-st.rz, st.rx);
            }
        }
        // Portholes down both walls every 3 m, and the tunnel's number.
        for (const st of list) {
          const s = st.s;
          if (s < 1.5 || s > length - 1.5) continue;
          if (Math.abs(((s - 1.5) % 3) - 0) > 0.13) continue;
          for (const side of [1, -1]) {
            const half = width(st) / 2 - 0.03;
            const nx = -side * st.rx,
              nz = -side * st.rz;
            porthole(
              stage,
              st.x + side * st.rx * half,
              base(st) + 1.6,
              st.z + side * st.rz * half,
              Math.atan2(nx, nz),
              { w: 0.32, h: 0.5 },
            );
          }
        }
        for (const at of [0.25, 0.7]) {
          const st = list[Math.round(at * (list.length - 1))];
          const plate = sign(stage, [tunnel.number], 0.5, 0.18, {
            background: CREAM,
            ink: '#2a2a24',
            font: 'bold "Courier New", Courier, monospace',
          });
          const half = width(st) / 2 - 0.015;
          plate.position.set(
            st.x + st.rx * half,
            base(st) + 0.55,
            st.z + st.rz * half,
          );
          plate.rotation.y = Math.atan2(-st.rx, -st.rz);
          stage.world.add(plate);
        }
      }

      // ---- The chambers ------------------------------------------------------
      const mouthOutline = (m: Mouth): Point[] => {
        const half = m.width / 2;
        if (m.kind === 'corridor')
          return [
            [m.at - half, CORRIDOR.floor],
            [m.at + half, CORRIDOR.floor],
            [m.at + half, CORRIDOR.floor + CORRIDOR.height],
            [m.at - half, CORRIDOR.floor + CORRIDOR.height],
          ];
        if (m.kind === 'arch') {
          const points: Point[] = [
            [m.at - half, 0],
            [m.at + half, 0],
          ];
          for (let i = 0; i <= 16; i++) {
            const a = (i / 16) * Math.PI;
            points.push([m.at + half * Math.cos(a), 1.9 + half * Math.sin(a)]);
          }
          return points;
        }
        // A tunnel's mouth: its own cross-section, at its floor there.
        const tunnel = TUNNELS.find((t) => {
          const [a, b] = [t.corners[0], t.corners.at(-1)!];
          const s = sideOf(
            CHAMBERS.find((c) => c.id === m.chamber)!.rect,
            m.side,
          );
          const hit = (p: Point) =>
            s.along === 'x'
              ? Math.abs(p[1] - s.at) < 1e-6 && Math.abs(p[0] - m.at) < 1e-6
              : Math.abs(p[0] - s.at) < 1e-6 && Math.abs(p[1] - m.at) < 1e-6;
          return hit(a) || hit(b);
        })!;
        const list = stations(tunnel);
        const length = list.at(-1)!.s;
        const s = sideOf(
          CHAMBERS.find((c) => c.id === m.chamber)!.rect,
          m.side,
        );
        const end = list.reduce((p, q) =>
          Math.hypot(
            (s.along === 'x' ? q.x : q.z) - m.at,
            (s.along === 'x' ? q.z : q.x) - s.at,
          ) <
          Math.hypot(
            (s.along === 'x' ? p.x : p.z) - m.at,
            (s.along === 'x' ? p.z : p.x) - s.at,
          )
            ? q
            : p,
        );
        const y = drawnFloor(tunnel, end.s, length);
        return profile(tunnel.width(end.s, length)).map(
          ([u, v]) => [m.at + u, y + v] as Point,
        );
      };
      const shapeOf = (outline: readonly Point[]) => {
        const shape = new Shape();
        shape.moveTo(outline[0][0], outline[0][1]);
        for (const [u, v] of outline.slice(1)) shape.lineTo(u, v);
        shape.closePath();
        return shape;
      };
      for (const c of CHAMBERS) {
        const r = c.rect;
        const outline: Point[] = [
          [r.minX, r.minZ],
          [r.maxX, r.minZ],
          [r.maxX, r.maxZ],
          [r.minX, r.maxZ],
        ];
        surface(stage, outline, 0, cream);
        surface(stage, outline, c.height, cream);
        for (const side of ['north', 'south', 'east', 'west'] as const) {
          // The wall the stairhead and the east vestibule share, once.
          if (c.id === 'east' && side === 'west') continue;
          const s = sideOf(r, side);
          const inward = side === 'north' || side === 'west' ? 1 : -1;
          // The walls the doors are in stand at the room's bounds' faces.
          const onBounds =
            (side === 'west' && s.at === BOUNDS.minX) ||
            (side === 'east' && s.at === BOUNDS.maxX);
          const line = onBounds ? s.at + inward * 0.15 : s.at;
          const shape = shapeOf([
            [s.from, -0.6],
            [s.to, -0.6],
            [s.to, c.height],
            [s.from, c.height],
          ]);
          const mouths = MOUTHS.filter(
            (m) => m.chamber === c.id && m.side === side,
          );
          for (const m of mouths) shape.holes.push(shapeOf(mouthOutline(m)));
          const wall = new Mesh(new ShapeGeometry(shape, 12), cream);
          if (s.along === 'x') wall.position.z = line;
          else {
            wall.rotation.y = -Math.PI / 2;
            wall.position.x = line;
          }
          stage.world.add(wall);
          // The green band, between its mouths.
          const gaps = mouths
            .map((m) => [m.at - m.width / 2, m.at + m.width / 2] as const)
            .sort((a, b) => a[0] - b[0]);
          let from = s.from;
          const band = (a: number, b: number) => {
            if (b - a < 0.05) return;
            const strip = new Mesh(new PlaneGeometry(b - a, 0.12), green);
            onWall(stage, strip, s.along, line, (a + b) / 2, 1.01, inward);
          };
          for (const [a, b] of gaps) {
            band(from, a);
            from = b;
          }
          band(from, s.to);
        }
        // Its lamp, and a glow in each of its mouths.
        const light = new PointLight('#ffe2b0', 5, 9, 1.6);
        light.position.set(
          (r.minX + r.maxX) / 2,
          c.height - 0.6,
          (r.minZ + r.maxZ) / 2,
        );
        stage.world.add(light);
        downlight(
          stage,
          (r.minX + r.maxX) / 2,
          c.height,
          (r.minZ + r.maxZ) / 2,
          0.5,
          true,
        );
      }

      // ---- Signs ----------------------------------------------------------------
      const yellow = { background: '#f2c230', ink: '#111111' };
      const wayOut = (text: string, x: number) => {
        const plate = sign(stage, [text], 1.3, 0.32, yellow);
        onWall(stage, plate, 'x', 4, x, 2.5, -1);
      };
      // Seen from the chamber, each pointing away from the other.
      wayOut('WAY OUT →', 21.6);
      wayOut('← WAY OUT', 24.4);
      {
        const plate = sign(stage, ['WAY OUT ↑'], 1.3, 0.32, yellow);
        onWall(stage, plate, 'x', 4, 50.5, 2.5, -1);
        const back = sign(stage, ['↑ WAY OUT'], 1.3, 0.32, yellow);
        onWall(stage, back, 'x', 4, 47.5, 2.5, -1);
      }
      // MIND THE STEP, low on the channel tunnel's wall, where it is flat.
      {
        const plate = sign(stage, ['MIND THE STEP'], 0.9, 0.2, yellow);
        plate.position.set(9, 0.45, 1 + 1.585);
        plate.rotation.y = Math.PI;
        stage.world.add(plate);
      }
      // The width restriction, before the long tunnel narrows.
      {
        const long = TUNNELS.find((t) => t.id === 'long')!;
        const list = stations(long);
        const st = list.reduce((a, b) =>
          Math.abs(b.s - 19) < Math.abs(a.s - 19) ? b : a,
        );
        const plate = sign(
          stage,
          ['WIDTH RESTRICTION', '0.8 m AHEAD'],
          0.8,
          0.4,
          {
            background: '#ffffff',
            ink: '#b3221a',
          },
        );
        plate.position.set(
          st.x - st.rx * 1.585,
          1.0 + 1.2,
          st.z - st.rz * 1.585,
        );
        plate.rotation.y = Math.atan2(st.rx, st.rz);
        stage.world.add(plate);
      }
      {
        const plate = sign(
          stage,
          ['T-09 · STAIRS', '20 STEPS UP · 20 DOWN'],
          1.2,
          0.36,
          yellow,
        );
        onWall(stage, plate, 'x', -2, 49, 2.7, 1);
      }
      {
        const plate = sign(stage, ['TUNNELS', 'T-07 → T-09'], 1.2, 0.4, {
          background: GREEN,
          ink: '#f1ecd8',
        });
        onWall(stage, plate, 'x', -2, -1, 2.4, 1);
      }

      // ---- The flooded hotel corridor -------------------------------------------
      const cr = CORRIDOR.rect;
      const carpet = patterned(
        stage,
        (c, px) => {
          c.fillStyle = '#6b1f24';
          c.fillRect(0, 0, px, px);
          c.strokeStyle = '#a8803e';
          c.lineWidth = 6;
          for (let i = 0; i < 4; i++) {
            c.beginPath();
            c.arc(
              (i % 2) * px * 0.5 + px * 0.25,
              Math.floor(i / 2) * px * 0.5 + px * 0.25,
              px * 0.16,
              0,
              Math.PI * 2,
            );
            c.stroke();
          }
        },
        0.8,
      );
      const paper = patterned(
        stage,
        (c, px) => {
          c.fillStyle = '#c9b98c';
          c.fillRect(0, 0, px, px);
          c.fillStyle = '#b3a173';
          for (let x = 0; x < px; x += 32) c.fillRect(x, 0, 12, px);
        },
        0.5,
      );
      const panel = stage.keep(
        new MeshStandardMaterial({
          color: '#5a3d26',
          roughness: 0.6,
          side: DoubleSide,
        }),
      );
      const ceiling = stage.keep(
        new MeshStandardMaterial({
          color: '#efe9db',
          roughness: 0.9,
          side: DoubleSide,
        }),
      );
      const floor = CORRIDOR.floor;
      const top = floor + CORRIDOR.height;
      const corners: Point[] = [
        [cr.minX, cr.minZ],
        [cr.maxX, cr.minZ],
        [cr.maxX, cr.maxZ],
        [cr.minX, cr.maxZ],
      ];
      surface(stage, corners, floor, carpet);
      surface(stage, corners, top, ceiling);
      surface(stage, corners, -0.06, water(stage, '#6f8f93', 0.42));
      for (const [z, inward] of [
        [cr.minZ, 1],
        [cr.maxZ, -1],
      ] as const) {
        const length = cr.maxX - cr.minX;
        const dado = new Mesh(new PlaneGeometry(length, 0.9), panel);
        onWall(
          stage,
          dado,
          'x',
          z,
          (cr.minX + cr.maxX) / 2,
          floor + 0.45,
          inward,
        );
        const upper = new Mesh(
          new PlaneGeometry(length, CORRIDOR.height - 0.9),
          paper,
        );
        onWall(
          stage,
          upper,
          'x',
          z,
          (cr.minX + cr.maxX) / 2,
          floor + 0.9 + (CORRIDOR.height - 0.9) / 2,
          inward,
        );
      }
      // The steps down into it from either chamber.
      for (const x of [cr.minX, cr.maxX]) {
        const riser = new Mesh(
          new PlaneGeometry(cr.maxZ - cr.minZ, -floor),
          cream,
        );
        riser.rotation.y = Math.PI / 2;
        riser.position.set(x, floor / 2, (cr.minZ + cr.maxZ) / 2);
        stage.world.add(riser);
      }
      for (let x = cr.minX + 2; x < cr.maxX; x += 4)
        downlight(stage, x, top, 1, 0.25, true);
      // Its doors, numbered, all locked.
      const leaf = stage.keep(
        new MeshStandardMaterial({ color: '#3d2a1c', roughness: 0.55 }),
      );
      const brass = {
        background: '#b8913f',
        ink: '#1e1408',
        font: 'bold Georgia, serif',
      };
      for (const door of CORRIDOR.doors) {
        const z = door.side === 'north' ? cr.minZ : cr.maxZ;
        const inward = door.side === 'north' ? 1 : -1;
        const group = new Group();
        group.position.set(door.x, floor, z + inward * 0.03);
        group.rotation.y = inward > 0 ? 0 : Math.PI;
        block(stage, 1.0, 2.1, 0.05, 0, 1.05, 0, panel, group);
        block(stage, 0.86, 2.0, 0.06, 0, 1.0, 0.01, leaf, group);
        block(
          stage,
          0.12,
          0.03,
          0.06,
          0.32,
          1.0,
          0.06,
          stage.keep(
            new MeshStandardMaterial({
              color: '#c9a94f',
              metalness: 0.8,
              roughness: 0.3,
            }),
          ),
          group,
        );
        const plate = sign(stage, [door.number], 0.18, 0.08, brass);
        plate.position.set(0, 1.62, 0.05);
        group.add(plate);
        if (door.number === '404') {
          const hanger = sign(stage, ['PLEASE DO NOT', 'DISTURB'], 0.12, 0.26, {
            background: '#f2ead8',
            ink: '#6b1f24',
          });
          hanger.position.set(0.32, 0.82, 0.08);
          group.add(hanger);
        }
        stage.world.add(group);
      }
      // A pool ring, drifting.
      const ring = new Mesh(
        new TorusGeometry(0.34, 0.11, 12, 28),
        stage.keep(
          new MeshStandardMaterial({ color: '#f07a2a', roughness: 0.4 }),
        ),
      );
      ring.rotation.x = Math.PI / 2;
      stage.world.add(ring);

      // A glow beyond each tunnel's far reaches, so its archways promise light.
      for (const [x, y, z] of [
        [23, 1.4, -15],
        [40, 1.4, -17],
        [57, 1.4, -6],
        [49, 4.5, -11],
      ] as const) {
        const glow = halo(stage, '255, 236, 200', 3);
        glow.position.set(x, y, z);
        stage.world.add(glow);
      }

      return {
        floorAt,
        solids: solids(),
        start: START,
        update(_delta, time) {
          const t = time * 0.05;
          ring.position.set(
            35 + Math.sin(t) * 7,
            -0.03 + Math.sin(time * 1.3) * 0.015,
            1 + Math.sin(t * 1.7) * 0.4,
          );
          ring.rotation.z = time * 0.1;
        },
      };
    },
  );
}
