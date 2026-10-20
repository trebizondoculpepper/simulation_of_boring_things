import {
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Material } from 'three';
import {
  block,
  ribbon,
  sign,
  startPoolRoom,
  surface,
  tiles,
} from './pool-styles/kit';
import type { PoolStage } from './pool-styles/kit';
import { rect } from '../game/pool-styles/geometry';
import type { Rect } from '../game/pool-styles/geometry';
import {
  CHAMBERS,
  DOCKS,
  FREIGHT_LIFT,
  RISERS,
  chamberFloor,
  floorAt,
  span,
  wallRuns,
  wallsAt,
} from '../game/plant/warren-plan';
import type { Chamber } from '../game/plant/warren-plan';
import { SERVICE_ZONE, packAll } from '../game/plant/packing';
import { majorRoutes } from '../game/plant/routes';
import { capacities } from '../game/plant/capacity';
import { placements } from '../game/plant/placement';
import { LEVEL_HEIGHT } from '../game/plant/placement';

/**
 * The plant rooms, blocked out (`src/game/plant/warren-plan.ts`): every
 * chamber on its level, grey, its name and its floor's use on its wall;
 * every machine of the inventory as a box at about its real size, where
 * the packing puts it (`packing.ts`), its walkway kept clear; the zone
 * under every ceiling kept for ducts, conduits and air conditioning shown
 * as a faint band; the risers and the freight lift as shafts; the roof's
 * platform open to the white over an endless field of skylights; and the
 * doors from each attraction's plant room through to its pool room's
 * Authorised Personnel Only door. Nothing is wired: it is for seeing
 * whether everything fits. `?room=plantrooms`.
 */

/** The colour of a chamber by its ring: the core warm, the edge cool, the outer pale. */
const RING_TINT: Record<string, string> = {
  core: '#c9c4b8',
  peripheral: '#b4bcc2',
  outer: '#d8d8d2',
  way: '#bfbfb9',
};

/** A machine's colour by what it is. */
function machineColour(id: string): string {
  if (id.startsWith('filters-')) return '#5d7f99';
  if (id.startsWith('balance-')) return '#4f8fa0';
  if (id.startsWith('boiler-') || id.startsWith('lthw')) return '#b5553a';
  if (id.startsWith('ahu-')) return '#8fa5a0';
  if (id.startsWith('ozone-')) return '#7b6aa6';
  if (/^(lv-board|supply|lighting|emergency|ups|panel-)/.test(id))
    return '#c9a227';
  if (/^(hypochlorite|acid|dosing)/.test(id)) return '#e2e2d0';
  if (id.startsWith('gas-')) return '#d9c03a';
  return '#9aa3a8';
}

/** A sloped or level floor over a chamber's rectangle. */
function floor(stage: PoolStage, c: Chamber, material: Material) {
  const r = c.rect;
  const corners: [number, number][] = [
    [r.minX, r.minZ],
    [r.maxX, r.minZ],
    [r.maxX, r.maxZ],
    [r.minX, r.maxZ],
  ];
  const p = corners.map(([x, z]) => [x, chamberFloor(c, x, z), z] as const);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [...p[0], ...p[2], ...p[1], ...p[0], ...p[3], ...p[2]],
      3,
    ),
  );
  geometry.setAttribute(
    'uv',
    new Float32BufferAttribute(
      [p[0], p[2], p[1], p[0], p[3], p[2]].flatMap(([x, , z]) => [x, z]),
      2,
    ),
  );
  geometry.computeVertexNormals();
  stage.world.add(new Mesh(geometry, material));
}

export function startPlantWarren(canvas: HTMLCanvasElement) {
  const bounds = rect(-45, 50, -50, 75);
  const ringOf = new Map(placements().map((p) => [p.room, p.ring]));
  const capacityOf = new Map(capacities().map((c) => [c.room, c]));
  const { placed } = packAll();
  const machineSolids = (y: number): Rect[] =>
    placed.filter((p) => Math.abs(p.y - y) < 2).map((p) => p.rect);
  const shafts = [...RISERS, FREIGHT_LIFT];
  const shaftSolids = (y: number): Rect[] =>
    shafts
      .filter(
        (s) => y <= LEVEL_HEIGHT[s.top] + 1 && y >= LEVEL_HEIGHT[s.bottom] - 4,
      )
      .map((s) => s.rect);
  return startPoolRoom(
    canvas,
    'plantrooms',
    {
      bounds,
      background: '#f4f5f3',
      fog: [40, 220],
      sky: ['#ffffff', '#9aa09c', 1.7],
    },
    (stage) => {
      const materials = new Map<string, Material>();
      const tinted = (colour: string) => {
        let m = materials.get(colour);
        if (!m)
          materials.set(
            colour,
            (m = tiles(stage, colour, { tile: 0.5, roughness: 0.7 })),
          );
        return m;
      };
      const band = stage.keep(
        new MeshBasicMaterial({
          color: '#e8873a',
          transparent: true,
          opacity: 0.16,
          side: DoubleSide,
          depthWrite: false,
        }),
      );
      for (const c of CHAMBERS) {
        const ring = c.room ? (ringOf.get(c.room) ?? 'way') : 'way';
        const material = tinted(RING_TINT[ring] ?? RING_TINT.way);
        floor(stage, c, material);
        const { high } = span(c);
        const r = c.rect;
        const outline = [
          [r.minX, r.minZ],
          [r.maxX, r.minZ],
          [r.maxX, r.maxZ],
          [r.minX, r.maxZ],
        ] as const;
        if (!c.open) {
          surface(stage, outline, high + c.height, material);
          // The zone under its ceiling kept for ducts, conduits and air conditioning.
          if (c.to === undefined) {
            const zone = new Mesh(
              new PlaneGeometry(r.maxX - r.minX, r.maxZ - r.minZ),
              band,
            );
            zone.rotation.x = Math.PI / 2;
            zone.position.set(
              (r.minX + r.maxX) / 2,
              high + c.height - SERVICE_ZONE,
              (r.minZ + r.maxZ) / 2,
            );
            stage.world.add(zone);
          }
          // Its name, and how much of its floor its machines need, on a wall.
          const cap = c.room ? capacityOf.get(c.room) : undefined;
          const lines = [c.name.toUpperCase()];
          if (cap && cap.required > 0)
            lines.push(
              `NEEDS ${Math.round(cap.required)} m² · HAS ${Math.round(cap.floor)} m² · ${Math.round(cap.used * 100)}%`,
            );
          if (c.to === undefined && r.maxX - r.minX > 3) {
            const plate = sign(
              stage,
              lines,
              Math.min(4, r.maxX - r.minX - 1),
              0.32 * lines.length,
              {
                background: '#1f2a33',
                ink: '#ffffff',
              },
            );
            plate.position.set(
              (r.minX + r.maxX) / 2,
              c.y + Math.min(c.height - 0.8, 2.6),
              r.minZ + 0.17,
            );
            stage.world.add(plate);
          }
        }
      }
      // Walls: each chamber's, between its doorways.
      const byChamber = new Map(CHAMBERS.map((c) => [c.id, c]));
      for (const w of wallRuns()) {
        const c = byChamber.get(w.chamber)!;
        const { low, high } = span(c);
        const top = c.open ? high + 1.1 : high + c.height;
        const line =
          w.along === 'x'
            ? [
                [w.from, w.at],
                [w.to, w.at],
              ]
            : [
                [w.at, w.from],
                [w.at, w.to],
              ];
        const ring = c.room ? (ringOf.get(c.room) ?? 'way') : 'way';
        if (c.open) {
          // The roof's railings.
          const steel = stage.keep(
            new MeshStandardMaterial({
              color: '#c8cdce',
              metalness: 0.5,
              roughness: 0.4,
            }),
          );
          for (const h of [0.5, 1.1])
            block(
              stage,
              w.along === 'x' ? w.to - w.from : 0.05,
              0.05,
              w.along === 'x' ? 0.05 : w.to - w.from,
              w.along === 'x' ? (w.from + w.to) / 2 : w.at,
              high + h,
              w.along === 'x' ? w.at : (w.from + w.to) / 2,
              steel,
            );
          continue;
        }
        ribbon(
          stage,
          line as never,
          low - 0.2,
          top,
          tinted(RING_TINT[ring] ?? RING_TINT.way),
        );
      }
      // The machines, where the packing puts them.
      for (const p of placed) {
        const box = block(
          stage,
          p.rect.maxX - p.rect.minX,
          p.size.h,
          p.rect.maxZ - p.rect.minZ,
          (p.rect.minX + p.rect.maxX) / 2,
          p.y + p.size.h / 2,
          (p.rect.minZ + p.rect.maxZ) / 2,
          tinted(machineColour(p.id)),
        );
        void box;
        const label = sign(
          stage,
          [p.name.replace(/:.*$/, '')],
          Math.min(2.4, p.rect.maxX - p.rect.minX),
          0.22,
          {
            background: '#f4f4ef',
          },
        );
        label.rotation.x = -Math.PI / 2;
        label.position.set(
          (p.rect.minX + p.rect.maxX) / 2,
          p.y + p.size.h + 0.01,
          (p.rect.minZ + p.rect.maxZ) / 2,
        );
        stage.world.add(label);
      }
      // The major pipes and cables, each traced from room to room in its
      // colour: heating hot water red, gas yellow, power on a galvanised
      // tray, chemicals lilac, make-up water green, drains black.
      const serviceLook: Record<
        string,
        { colour: string; r: number; tray?: boolean }
      > = {
        lthw: { colour: '#c0392b', r: 0.08 },
        gas: { colour: '#e6c229', r: 0.05 },
        power: { colour: '#9aa3a6', r: 0.04, tray: true },
        chemical: { colour: '#b39ddb', r: 0.025 },
        'make-up': { colour: '#2e9e5b', r: 0.05 },
        drain: { colour: '#222426', r: 0.06 },
      };
      const look = new Map<string, Material>();
      const up = new Vector3(0, 1, 0);
      for (const route of majorRoutes().routes) {
        const style = serviceLook[route.medium] ?? {
          colour: '#888888',
          r: 0.04,
        };
        let material = look.get(route.medium);
        if (!material)
          look.set(
            route.medium,
            (material = stage.keep(
              new MeshStandardMaterial({
                color: style.colour,
                roughness: 0.45,
                metalness: 0.2,
              }),
            )),
          );
        for (let i = 1; i < route.points.length; i++) {
          const a = new Vector3(...route.points[i - 1]);
          const b = new Vector3(...route.points[i]);
          const length = a.distanceTo(b);
          if (length < 1e-3) continue;
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const dir = b.clone().sub(a).normalize();
          const piece = style.tray
            ? new Mesh(
                new CylinderGeometry(style.r * 4, style.r * 4, length, 4, 1),
                material,
              )
            : new Mesh(
                new CylinderGeometry(style.r, style.r, length, 10),
                material,
              );
          piece.position.copy(mid);
          piece.quaternion.setFromUnitVectors(up, dir);
          if (style.tray) piece.scale.set(1, 1, 0.25);
          stage.world.add(piece);
          // A bend at each corner.
          const bend = new Mesh(
            new SphereGeometry(style.tray ? style.r * 2 : style.r * 1.2, 8, 6),
            material,
          );
          bend.position.copy(b);
          stage.world.add(bend);
        }
      }

      // The risers and the freight lift: shafts through the levels.
      const shaftMaterial = tinted('#5f6366');
      for (const s of shafts) {
        const bottom = LEVEL_HEIGHT[s.bottom] - 3.5;
        const top = LEVEL_HEIGHT[s.top] + 4;
        block(
          stage,
          s.rect.maxX - s.rect.minX,
          top - bottom,
          s.rect.maxZ - s.rect.minZ,
          (s.rect.minX + s.rect.maxX) / 2,
          (top + bottom) / 2,
          (s.rect.minZ + s.rect.maxZ) / 2,
          shaftMaterial,
        );
        for (const level of ['surface', 'treatment', 'basement'] as const) {
          const y = LEVEL_HEIGHT[level];
          if (y > LEVEL_HEIGHT[s.top] || y < LEVEL_HEIGHT[s.bottom]) continue;
          const plate = sign(stage, [s.name.toUpperCase()], 1, 0.25, {
            background: '#f2c230',
          });
          plate.position.set(
            (s.rect.minX + s.rect.maxX) / 2,
            y + 2,
            s.rect.maxZ + 0.02,
          );
          stage.world.add(plate);
        }
      }
      // The loading bay's docks: open shutters onto the white.
      const white = stage.keep(new MeshBasicMaterial({ color: '#ffffff' }));
      const bay = CHAMBERS.find((c) => c.id === 'loading-bay')!;
      for (const [a, b] of DOCKS) {
        const opening = new Mesh(new PlaneGeometry(b - a, 3.6), white);
        opening.position.set(
          (a + b) / 2,
          bay.y + 1.8 + 0.1,
          bay.rect.maxZ - 0.16,
        );
        opening.rotation.y = Math.PI;
        stage.world.add(opening);
        for (const x of [a - 0.3, b + 0.3])
          block(
            stage,
            0.25,
            0.4,
            0.3,
            x,
            bay.y + 1.0,
            bay.rect.maxZ - 0.3,
            tinted('#1d1d1d'),
          );
      }
      // The endless roof below the platform, its skylights glowing.
      const roof = CHAMBERS.find((c) => c.open)!;
      {
        const c2 = document.createElement('canvas');
        c2.width = c2.height = 64;
        const g = c2.getContext('2d')!;
        g.fillStyle = '#b9bcb8';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = '#f8fbff';
        g.fillRect(20, 20, 24, 24);
        const texture = stage.texture(new CanvasTexture(c2));
        texture.colorSpace = SRGBColorSpace;
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.repeat.set(200, 200);
        const sea = new Mesh(
          new PlaneGeometry(2400, 2400),
          stage.keep(
            new MeshStandardMaterial({ map: texture, roughness: 0.9 }),
          ),
        );
        sea.rotation.x = -Math.PI / 2;
        sea.position.set(0, roof.y - 0.6, 0);
        stage.world.add(sea);
      }
      return {
        solids: [],
        solidsAt: (y) => [
          ...wallsAt(y),
          ...machineSolids(y),
          ...shaftSolids(y),
        ],
        floorAt,
        start: { x: 20, z: 25, yaw: Math.PI, pitch: -0.1 },
      };
    },
  );
}
