import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_WIDTH,
  LINKS,
  PLANT_ZONES,
  POOLS,
  POOL_ZONES,
  SLIDES,
  SKYLIGHTS,
  SLIDE_RADIUS,
  TIKI_BAR,
  STAFF_DOORS,
  WALL_HOLES,
  WINDOWS,
  arches,
  archCurve,
  ARCADE_TOP,
  vaultHeightAt,
  HALL_COLUMNS,
  COLUMN_RADIUS,
  bankPlants,
  boardPlace,
  distanceToCourse,
  riverLine,
  doorPlace,
  floorAt,
  lamps,
  loungerRect,
  loungers,
  gapsIn,
  plantDoor,
  poolAt,
  sharedSide,
  sideOf,
  wallRuns,
  zoneAt,
  zoneById,
  zoneFloor,
} from './poolrooms-plan';
import type { Rect } from './poolrooms-plan';

const overlap = (a: Rect, b: Rect) =>
  a.minX < b.maxX && b.minX < a.maxX && a.minZ < b.maxZ && b.minZ < a.maxZ;

describe('the pool rooms, laid out', () => {
  it('has a main pool, children’s pools, a spa, a slide and footbaths, on four levels', () => {
    const kinds = new Set(POOL_ZONES.map((z) => z.kind));
    for (const kind of ['hall', 'terraces', 'spa', 'grotto', 'gallery'])
      expect(kinds).toContain(kind);
    expect(SLIDES.length).toBeGreaterThan(0);
    expect(
      POOLS.filter((p) => p.zone === 'gallery' && p.depth < 0.2),
    ).toHaveLength(2);
    const levels = new Set(
      POOL_ZONES.filter((z) => z.to === undefined).map((z) => z.y),
    );
    expect(levels.size).toBe(4);
  });

  it('is consistent within itself: no two zones overlap in plan', () => {
    for (const a of POOL_ZONES)
      for (const b of POOL_ZONES)
        if (a !== b)
          expect(overlap(a.rect, b.rect), `${a.id} and ${b.id}`).toBe(false);
  });

  it('joins every zone to every other, from the footbath gallery', () => {
    const reached = new Set(['gallery']);
    for (let changed = true; changed;) {
      changed = false;
      for (const { a, b } of LINKS)
        if (reached.has(a) !== reached.has(b)) {
          reached.add(a);
          reached.add(b);
          changed = true;
        }
    }
    expect([...reached].sort()).toEqual(POOL_ZONES.map((z) => z.id).sort());
  });

  it('opens each link in a wall both zones share, the floors meeting there', () => {
    for (const link of LINKS) {
      const a = zoneById(link.a);
      const b = zoneById(link.b);
      const side = sharedSide(a.rect, b.rect);
      expect(side, `${link.a}–${link.b}`).not.toBeNull();
      const s = sideOf(a.rect, side!);
      expect(link.from).toBeGreaterThanOrEqual(s.from);
      expect(link.to).toBeLessThanOrEqual(s.to);
      const mid = (link.from + link.to) / 2;
      const [x, z] = s.along === 'x' ? [mid, s.at] : [s.at, mid];
      expect(zoneFloor(a, x, z)).toBeCloseTo(zoneFloor(b, x, z), 6);
      expect(gapsIn(a, side!)).toContainEqual([link.from, link.to]);
    }
  });

  it('climbs by stairs and ramps gentle enough to walk', () => {
    for (const zone of POOL_ZONES.filter((z) => z.to !== undefined)) {
      const r = zone.rect;
      const run = zone.along === 'x' ? r.maxX - r.minX : r.maxZ - r.minZ;
      expect(Math.abs(zone.to! - zone.y) / run).toBeLessThan(
        Math.tan((35 * Math.PI) / 180),
      );
    }
  });

  it('walks a walker from the gallery, over the footbaths, to the hall and up the stair', () => {
    expect(floorAt(0, 52, 0)).toBe(0);
    expect(floorAt(0, 45, 0)).toBeCloseTo(-0.15, 6);
    expect(floorAt(-28, -3, 0)).toBeGreaterThan(0);
    expect(floorAt(-28, -3, 0)).toBeLessThan(4);
    expect(floorAt(-45, 8, 4)).toBe(4);
    expect(zoneAt(-54, -60, 9)?.id).toBe('spa');
    expect(floorAt(-20, -60, -4)).toBe(-4);
  });

  it('puts an Authorised Personnel Only door in every zone but its stairs, each to a grey room of its own', () => {
    const rooms = POOL_ZONES.filter(
      (z) => z.kind !== 'stair' && z.id !== 'river-landing',
    );
    expect(STAFF_DOORS.map((d) => d.zone).sort()).toEqual(
      rooms.map((z) => z.id).sort(),
    );
    expect(new Set(STAFF_DOORS.map((d) => d.to)).size).toBe(STAFF_DOORS.length);
    for (const door of STAFF_DOORS) {
      const zone = zoneById(door.zone);
      const s = sideOf(zone.rect, door.side);
      expect(door.at - DOOR_WIDTH / 2).toBeGreaterThan(s.from);
      expect(door.at + DOOR_WIDTH / 2).toBeLessThan(s.to);
      for (const [a, b] of gapsIn(zone, door.side))
        expect(
          door.at + DOOR_WIDTH / 2 < a || door.at - DOOR_WIDTH / 2 > b,
        ).toBe(true);
      // Whoever comes back through it arrives inside its zone.
      const { arrive } = doorPlace(zone, door.side, door.at);
      expect(
        zoneAt(arrive.x, arrive.z, zoneFloor(zone, arrive.x, arrive.z))?.id,
      ).toBe(zone.id);
      expect(poolAt(zone, arrive.x, arrive.z)).toBeNull();
    }
  });

  it('stands the grey rooms out of the pool rooms’ world, each with its door back', () => {
    for (const plant of PLANT_ZONES) {
      for (const zone of POOL_ZONES)
        expect(overlap(plant.rect, zone.rect)).toBe(false);
      const { arrive } = plantDoor(plant);
      expect(zoneAt(arrive.x, arrive.z)?.id).toBe(plant.id);
    }
  });

  it('slides from the spa down into the grotto’s splash pool', () => {
    for (const slide of SLIDES) {
      const [sx, sy] = slide.path[0];
      const [ex, ey, ez] = slide.path.at(-1)!;
      const from = zoneById(slide.from);
      const to = zoneById(slide.to);
      expect(Math.abs(sx - from.rect.maxX)).toBeLessThan(2.5);
      expect(sy).toBeGreaterThan(from.y);
      const splash = zoneAt(ex, ez, ey);
      expect(splash?.id).toBe(to.id);
      expect(poolAt(to, ex, ez)?.wade).toBe(true);
      // Always downhill.
      for (let i = 1; i < slide.path.length; i++)
        expect(slide.path[i][1]).toBeLessThan(slide.path[i - 1][1]);
    }
  });

  it('stands a water treatment display board by every swimming pool, on its deck', () => {
    const boarded = POOLS.filter((p) => p.board);
    expect(boarded.length).toBeGreaterThanOrEqual(8);
    for (const pool of boarded) {
      const at = boardPlace(pool);
      const zone = zoneById(pool.zone);
      expect(zoneAt(at.x, at.z, at.y)?.id).toBe(zone.id);
      expect(poolAt(zone, at.x, at.z)).toBeNull();
    }
  });

  it('walls every zone, leaving its openings (a stair opens its whole width at each end)', () => {
    const runs = wallRuns();
    for (const zone of POOL_ZONES)
      expect(
        runs.filter((r) => r.zone === zone.id).length,
      ).toBeGreaterThanOrEqual(2);
    expect(runs.some((r) => r.zone === 'lane' && r.side === 'south')).toBe(
      false,
    );
  });
  it('cuts the slide its holes through the walls it passes, clear of their floors and ceilings', () => {
    for (const hole of WALL_HOLES) {
      const zone = zoneById(hole.zone);
      const s = sideOf(zone.rect, hole.side);
      expect(hole.from).toBeGreaterThan(s.from);
      expect(hole.to).toBeLessThan(s.to);
      // A culvert may run below the floor, where its water goes.
      expect(hole.bottom).toBeGreaterThanOrEqual(zone.y - 1);
      expect(hole.top).toBeLessThanOrEqual(zone.y + zone.height);
      expect(hole.to - hole.from).toBeGreaterThanOrEqual(2 * SLIDE_RADIUS);
    }
  });
  it('arches every opening and the hall’s arcades, under their ceilings: round where there is height, flattened where not', () => {
    const list = arches();
    expect(list.length).toBe(LINKS.length + 12);
    for (const arch of list) {
      const radius = (arch.to - arch.from) / 2;
      expect(arch.spring - arch.floor).toBeGreaterThanOrEqual(2.1 - 1e-9);
      if (arch.style !== 'pointed')
        expect(arch.rise).toBeLessThanOrEqual(radius + 1e-9);
      expect(arch.spring + arch.rise).toBeLessThan(arch.top);
    }
    // The arcades, in the tall chapel, pointed and gothic.
    for (const arch of list.filter((a) => a.kind === 'arcade')) {
      expect(arch.style).toBe('pointed');
      expect(arch.rise).toBeGreaterThan((arch.to - arch.from) / 2);
    }
    for (const link of LINKS) {
      const arch = list.find((x) => x.from === link.from && x.to === link.to)!;
      for (const zone of [zoneById(link.a), zoneById(link.b)])
        expect(arch.spring + arch.rise).toBeLessThanOrEqual(
          Math.max(zone.y, zone.to ?? zone.y) + zone.height,
        );
    }
  });
  it('winds its river from wall to wall, a flat deck either side, never meeting itself', () => {
    const river = POOLS.find((p) => p.course)!;
    const zone = zoneById(river.zone);
    const line = riverLine(river);
    const half = river.width! / 2;
    for (const p of line) {
      expect(zoneFloor(zone, p.x, p.z)).toBe(zone.y);
      // A deck at least a metre and a half wide on both banks, away from the walls it runs through.
      if (p.z > zone.rect.minZ + 3 && p.z < zone.rect.maxZ - 3)
        for (const side of [1, -1]) {
          const x = p.x + side * p.nx * (half + 1.5);
          const z = p.z + side * p.nz * (half + 1.5);
          expect(x).toBeGreaterThan(zone.rect.minX);
          expect(x).toBeLessThan(zone.rect.maxX);
          expect(zoneAt(x, z, 0)?.id).toBe(zone.id);
        }
    }
    // Reaches far apart along it stay far apart across the room.
    for (let i = 0; i < line.length; i++)
      for (let j = i + 20; j < line.length; j++)
        expect(
          Math.hypot(line[i].x - line[j].x, line[i].z - line[j].z),
        ).toBeGreaterThan(2 * half + 1.5);
    // Its water to wade, waist deep.
    expect(floorAt(line[10].x, line[10].z, 0)).toBeCloseTo(-river.depth, 6);
    expect(distanceToCourse(river, line[10].x, line[10].z)).toBeLessThan(0.01);
  });

  it('plants its banks with fake plants, on the deck, clear of the water', () => {
    const plants = bankPlants();
    expect(plants.length).toBeGreaterThan(10);
    const river = POOLS.find((p) => p.course)!;
    const zone = zoneById(river.zone);
    expect(new Set(plants.map((p) => p.kind)).size).toBe(3);
    for (const plant of plants) {
      expect(zoneAt(plant.x, plant.z, 0)?.id).toBe(zone.id);
      expect(poolAt(zone, plant.x, plant.z)).toBeNull();
      expect(distanceToCourse(river, plant.x, plant.z)).toBeGreaterThan(
        river.width! / 2 + 0.5,
      );
    }
  });
  it('lets daylight in by skylights in the ceilings, clear of the hall’s columns', () => {
    for (const sky of SKYLIGHTS) {
      const zone = zoneById(sky.zone);
      const r = sky.rect;
      expect(r.minX).toBeGreaterThan(zone.rect.minX);
      expect(r.maxX).toBeLessThan(zone.rect.maxX);
      expect(r.minZ).toBeGreaterThan(zone.rect.minZ);
      expect(r.maxZ).toBeLessThan(zone.rect.maxZ);
      if (sky.zone === 'hall')
        for (const [x, z] of HALL_COLUMNS)
          expect(
            x + COLUMN_RADIUS > r.minX &&
              x - COLUMN_RADIUS < r.maxX &&
              z + COLUMN_RADIUS > r.minZ &&
              z - COLUMN_RADIUS < r.maxZ,
          ).toBe(false);
    }
  });

  it('opens windows only in walls, never across an opening, a door or another window', () => {
    for (const w of WINDOWS) {
      const zone = zoneById(w.zone);
      const s = sideOf(zone.rect, w.side);
      expect(w.from).toBeGreaterThan(s.from);
      expect(w.to).toBeLessThan(s.to);
      expect(w.sill).toBeGreaterThan(0.5);
      expect(w.head).toBeLessThan(zone.height);
      // Clear of every opening, or high over its arch (the rose over the lane).
      for (const [a, b] of gapsIn(zone, w.side)) {
        const arch = arches().find(
          (x) => x.kind === 'link' && x.from === a && x.to === b,
        )!;
        expect(
          w.to <= a ||
            w.from >= b ||
            zone.y + w.sill > arch.spring + arch.rise + 0.5,
        ).toBe(true);
      }
      for (const door of STAFF_DOORS.filter(
        (d) => d.zone === w.zone && d.side === w.side,
      ))
        expect(
          door.at + DOOR_WIDTH / 2 < w.from ||
            door.at - DOOR_WIDTH / 2 > w.to ||
            w.sill > 2.3,
        ).toBe(true);
      for (const other of WINDOWS)
        if (other !== w && other.zone === w.zone && other.side === w.side)
          expect(w.to <= other.from || w.from >= other.to).toBe(true);
    }
  });

  it('lights every zone but the stairs’ ends with lamps that stand in it, under its ceiling and out of its water', () => {
    const list = lamps();
    expect(list.length).toBeGreaterThan(30);
    for (const lamp of list) {
      const zone = zoneById(lamp.zone);
      const r = zone.rect;
      expect(lamp.x).toBeGreaterThanOrEqual(r.minX);
      expect(lamp.x).toBeLessThanOrEqual(r.maxX);
      expect(lamp.z).toBeGreaterThanOrEqual(r.minZ);
      expect(lamp.z).toBeLessThanOrEqual(r.maxZ);
      expect(lamp.y).toBeLessThan(
        Math.max(zone.y, zone.to ?? zone.y) + zone.height,
      );
      expect(lamp.y).toBeGreaterThan(zoneFloor(zone, lamp.x, lamp.z) + 1.5);
      if (lamp.kind === 'post') {
        expect(poolAt(zone, lamp.x, lamp.z)).toBeNull();
        for (const plant of bankPlants())
          expect(
            Math.hypot(plant.x - lamp.x, plant.z - lamp.z),
          ).toBeGreaterThan(0.9);
      }
      if (lamp.kind === 'sconce') {
        const s = sideOf(r, lamp.side!);
        expect(s.along === 'x' ? lamp.z : lamp.x).toBe(s.at);
      }
    }
    expect(new Set(list.map((l) => l.zone))).toContain('grotto');
  });
  it('lights the river room by four great skylights, its ceiling’s quadrants', () => {
    const skylights = SKYLIGHTS.filter((k) => k.zone === 'meander');
    expect(skylights).toHaveLength(4);
    const zone = zoneById('meander');
    const area = (r: Rect) => (r.maxX - r.minX) * (r.maxZ - r.minZ);
    const glazed = skylights.reduce((sum, k) => sum + area(k.rect), 0);
    expect(glazed / area(zone.rect)).toBeGreaterThan(0.6);
    for (const a of skylights)
      for (const b of skylights)
        if (a !== b) expect(overlap(a.rect, b.rect)).toBe(false);
  });

  it('sets sun loungers out in groups on the river room’s decks, none in another’s way', () => {
    const list = loungers();
    expect(list.length).toBeGreaterThanOrEqual(6);
    const river = POOLS.find((p) => p.course)!;
    const posts = lamps().filter((l) => l.kind === 'post');
    list.forEach((l, i) => {
      const r = loungerRect(l);
      expect(distanceToCourse(river, l.x, l.z)).toBeGreaterThan(
        river.width! / 2 + 0.5,
      );
      list.forEach((o, j) => {
        if (i !== j) expect(overlap(r, loungerRect(o))).toBe(false);
      });
      for (const plant of bankPlants())
        expect(
          plant.x > r.minX - 0.3 &&
            plant.x < r.maxX + 0.3 &&
            plant.z > r.minZ - 0.3 &&
            plant.z < r.maxZ + 0.3,
        ).toBe(false);
      for (const post of posts)
        expect(
          post.x > r.minX - 0.3 &&
            post.x < r.maxX + 0.3 &&
            post.z > r.minZ - 0.3 &&
            post.z < r.maxZ + 0.3,
        ).toBe(false);
    });
  });

  it('keeps a tiki bar on the deck by the river, closed, clear of the water, the plants and the staff door', () => {
    const bar = TIKI_BAR.rect;
    const river = POOLS.find((p) => p.course)!;
    const zone = zoneById('meander');
    for (const [x, z] of [
      [bar.minX, bar.minZ],
      [bar.maxX, bar.minZ],
      [bar.minX, bar.maxZ],
      [bar.maxX, bar.maxZ],
    ] as const) {
      expect(zoneAt(x, z, 0)?.id).toBe(zone.id);
      expect(distanceToCourse(river, x, z)).toBeGreaterThan(
        river.width! / 2 + 1,
      );
    }
    for (const plant of bankPlants())
      expect(
        plant.x > bar.minX - 0.5 &&
          plant.x < bar.maxX + 0.5 &&
          plant.z > bar.minZ - 0.5 &&
          plant.z < bar.maxZ + 0.5,
      ).toBe(false);
    const door = STAFF_DOORS.find((d) => d.zone === 'meander')!;
    expect(Math.abs(door.at - (bar.minZ + bar.maxZ) / 2)).toBeGreaterThan(3);
    // Its front toward the river: the water lies north of it.
    expect(
      distanceToCourse(river, (bar.minX + bar.maxX) / 2, bar.minZ - 3),
    ).toBeLessThan(
      distanceToCourse(river, (bar.minX + bar.maxX) / 2, bar.maxZ),
    );
  });
  it('draws an arch’s head from jamb to jamb: round, pointed, or flattened', () => {
    for (const style of ['round', 'pointed', 'flat'] as const) {
      const rise =
        style === 'pointed' ? 3 * Math.sqrt(3) : style === 'round' ? 3 : 1.5;
      const curve = archCurve(0, 6, 4, rise, style);
      expect(curve[0][0]).toBeCloseTo(0, 6);
      expect(curve[0][1]).toBeCloseTo(4, 6);
      expect(curve.at(-1)![0]).toBeCloseTo(6, 6);
      expect(curve.at(-1)![1]).toBeCloseTo(4, 6);
      expect(Math.max(...curve.map(([, v]) => v))).toBeCloseTo(4 + rise, 6);
    }
  });

  it('makes the main hall a gothic water chapel: tall, vaulted, its openings pointed', () => {
    const chapel = zoneById('hall');
    expect(chapel.name).toBe('The water chapel');
    expect(vaultHeightAt(0)).toBeCloseTo(ARCADE_TOP + 18, 1);
    expect(vaultHeightAt(16)).toBeCloseTo(ARCADE_TOP, 6);
    expect(vaultHeightAt(0)!).toBeLessThan(chapel.height);
    expect(
      WINDOWS.filter((w) => w.zone === 'hall' && w.shape === 'lancet').length,
    ).toBeGreaterThan(12);
    expect(
      WINDOWS.filter((w) => w.zone === 'hall' && w.shape === 'rose'),
    ).toHaveLength(1);
    expect(SKYLIGHTS.filter((k) => k.zone === 'hall')).toHaveLength(0);
  });

  it('makes the chapel’s floor its pool, wall to wall, with a ledge to walk round', () => {
    const chapel = zoneById('hall');
    const main = POOLS.find((p) => p.board === 'MAIN POOL')!;
    expect(main.zone).toBe('hall');
    expect(main.rect.minX - chapel.rect.minX).toBeLessThanOrEqual(1.5);
    expect(chapel.rect.maxZ - main.rect.maxZ).toBeLessThanOrEqual(1.5);
    // Every pier stands in the water.
    for (const [x, z] of HALL_COLUMNS)
      expect(poolAt(chapel, x, z)).not.toBeNull();
    // Each opening and door of the chapel reaches the ledge.
    for (const link of LINKS.filter((l) => l.a === 'hall' || l.b === 'hall')) {
      const other = zoneById(link.a === 'hall' ? link.b : link.a);
      const side = sharedSide(chapel.rect, other.rect)!;
      const s = sideOf(chapel.rect, side);
      const inward = {
        north: [0, 1],
        south: [0, -1],
        west: [1, 0],
        east: [-1, 0],
      }[side];
      const mid = (link.from + link.to) / 2;
      // Some way along its opening, clear of the lane's water, a step in.
      const along =
        link.from + 0.3 < -1.25 || link.from > 1.25 ? link.from + 0.3 : mid;
      const [x, z] = s.along === 'x' ? [along, s.at] : [s.at, along];
      expect(
        poolAt(chapel, x + inward[0] * 0.7, z + inward[1] * 0.7),
      ).toBeNull();
    }
  });
});
