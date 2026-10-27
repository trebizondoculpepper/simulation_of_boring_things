import { describe, expect, it } from 'vite-plus/test';
import {
  BRIDGE_FIN,
  CONFERENCE,
  CORNER_FILLET,
  ENTRY,
  PLATFORM,
  READY_ROOM_RESERVE,
  REAR_CONSOLE,
  REAR_SCREEN,
  REAR_STATIONS,
  STATIONS,
  STOREY,
  WALL_PANELS,
  inward,
  backWallScreenPlaces,
  bridgePanelPlaces,
  chairPlaces,
  deskScreenPlaces,
  deskSegments,
  inReadyRoomReserve,
  plaquePlaces,
  protoSolids,
  readyRoomReserve,
  rearStationPlaces,
  roomPolygon,
  sides,
  stationPlaces,
  stationScreenPlaces,
  upstandScreens,
  viewscreenPlace,
} from './control-room-prototype';
import { stationNamed } from './station-schematics';
import { overviewById } from './schematic-overviews';
import { overlaps } from '../../controls/logic/walk-collision';

describe('the bridge’s schematic screens (mission 095)', () => {
  it('give every forward and rear station a screen of its own browser', () => {
    const places = stationScreenPlaces();
    expect(places.map((p) => p.station)).toEqual([
      ...STATIONS,
      ...REAR_STATIONS.map((r) => r.role),
    ]);
    for (const p of places)
      expect(stationNamed(p.station), p.station).toBeDefined();
  });

  it('fill every opening in the desk’s upstands, each with a known station', () => {
    const places = deskScreenPlaces();
    const expected = deskSegments().reduce(
      (t, s) =>
        t +
        upstandScreens(
          Math.hypot(s.outer[1].x - s.outer[0].x, s.outer[1].z - s.outer[0].z),
        ),
      0,
    );
    expect(places).toHaveLength(expected);
    for (const p of places) {
      expect(stationNamed(p.station)).toBeDefined();
      expect(p.size.w).toBeGreaterThan(0.3);
      expect(p.size.h).toBeGreaterThan(0.2);
      // Within the upstand's face, 0.9 to 1.45 m over the floor.
      expect(p.y - STOREY - p.size.h / 2).toBeGreaterThan(0.9);
      expect(p.y - STOREY + p.size.h / 2).toBeLessThan(1.45);
    }
  });

  it('keep the forward stations’ upper screens low, under the seated view of the big wall', () => {
    for (const p of stationScreenPlaces().slice(0, STATIONS.length))
      expect(p.y - STOREY + (p.size.h / 2) * Math.cos(p.tilt)).toBeLessThan(
        1.6,
      );
  });
});

describe('the bridge’s back walls (the owner, 2026-10-27)', () => {
  const places = backWallScreenPlaces();
  const lengthOf = (side: number) => {
    const [a, b] = sides(roomPolygon())[side];
    return Math.hypot(b.x - a.x, b.z - a.z);
  };
  // The light strip's hood over the aft consoles, over the stage.
  const hood = 2.55;

  it('carry displays where the conference table looked out, each showing designs that exist', () => {
    expect(places.length).toBeGreaterThanOrEqual(4);
    for (const p of places) {
      expect([3, 4]).toContain(p.side);
      if ('station' in p.show)
        expect(stationNamed(p.show.station), p.title).toBeDefined();
      else
        for (const id of p.show.overviews)
          expect(overviewById(id), `${p.title}: ${id}`).toBeDefined();
      // On its wall, clear of its corners' fillets.
      expect(p.along[0]).toBeGreaterThan(CORNER_FILLET);
      expect(p.along[1]).toBeLessThan(lengthOf(p.side) - CORNER_FILLET);
      // Under the hood or over it, never across it.
      const bottom = p.middle - p.h / 2;
      const top = p.middle + p.h / 2;
      expect(top < hood || bottom > hood + 0.15, p.title).toBe(true);
      expect(bottom).toBeGreaterThan(0.6);
      expect(p.y + p.h / 2).toBeLessThan(STOREY + 8.5);
    }
  });

  it('keeps the displays clear of each other and of the rear stations’ screens', () => {
    const rear = REAR_STATIONS.map((r) => {
      const at = r.at * lengthOf(r.side);
      return {
        side: r.side,
        along: [at - REAR_CONSOLE.w / 2, at + REAR_CONSOLE.w / 2],
        low: REAR_SCREEN.middle - REAR_SCREEN.h / 2,
        high: REAR_SCREEN.middle + REAR_SCREEN.h / 2,
      };
    });
    const spans = [
      ...places.map((p) => ({
        side: p.side as number,
        along: p.along,
        low: p.middle - p.h / 2,
        high: p.middle + p.h / 2,
      })),
      ...rear,
    ];
    spans.forEach((a, i) =>
      spans.slice(i + 1).forEach((b) => {
        if (a.side !== b.side) return;
        const apart =
          a.along[1] <= b.along[0] ||
          b.along[1] <= a.along[0] ||
          a.high <= b.low ||
          b.high <= a.low;
        expect(apart).toBe(true);
      }),
    );
  });

  it('hangs every wall screen and panel 10 mm or more clear of the wall’s fins', () => {
    const room = roomPolygon();
    const off = (side: number, x: number, z: number) => {
      const [a, b] = sides(room)[side];
      const n = inward(a, b);
      return (x - a.x) * n.x + (z - a.z) * n.z;
    };
    // The back walls' displays and the rear stations' screens (their
    // bodies in front of their holders), and the wall panels.
    for (const p of backWallScreenPlaces())
      expect(off(p.side, p.x, p.z), p.title).toBeGreaterThanOrEqual(
        BRIDGE_FIN.depth + 0.01 - 1e-9,
      );
    stationScreenPlaces()
      .slice(STATIONS.length)
      .forEach((p, i) =>
        expect(
          off(REAR_STATIONS[i].side, p.x, p.z),
          p.station,
        ).toBeGreaterThanOrEqual(BRIDGE_FIN.depth + 0.01 - 1e-9),
      );
    const panels = bridgePanelPlaces();
    for (const w of WALL_PANELS) {
      const p = panels.find((q) => q.code === w.code)!;
      expect(off(w.side, p.x, p.z), w.code).toBeGreaterThanOrEqual(
        BRIDGE_FIN.depth + 0.01 - 1e-9,
      );
    }
  });

  it('leaves the stage open floor, no table or chairs where the conference table stood', () => {
    const y = STOREY + PLATFORM.height;
    for (const x of [-2.5, -1, 0, 1, 2.5])
      expect(
        protoSolids(y, 'bridge', true).some((s) =>
          overlaps(s, x, CONFERENCE.z, 0.3),
        ),
      ).toBe(false);
    for (const c of chairPlaces()) expect(c.z).toBeLessThan(CONFERENCE.z - 2);
  });
});

describe('the reserve for a captain’s ready room (the owner, 2026-10-27)', () => {
  it('is the east side wall, which has nothing on it', () => {
    const { a, b } = readyRoomReserve();
    expect(Math.min(a.x, b.x)).toBeGreaterThan(10);
    expect(WALL_PANELS.map((p) => p.side)).not.toContain(
      READY_ROOM_RESERVE.side,
    );
    expect(ENTRY.side).not.toBe(READY_ROOM_RESERVE.side);
    expect(REAR_STATIONS.map((r) => r.side as number)).not.toContain(
      READY_ROOM_RESERVE.side,
    );
  });

  it('stays empty: no panel, screen, station, chair or plaque on it or before it', () => {
    const things: [string, number, number][] = [
      ...bridgePanelPlaces().map((p): [string, number, number] => [
        p.code,
        p.x,
        p.z,
      ]),
      ...[...stationScreenPlaces(), ...deskScreenPlaces()].map(
        (p): [string, number, number] => [p.station, p.x, p.z],
      ),
      ...backWallScreenPlaces().map((p): [string, number, number] => [
        p.title,
        p.x,
        p.z,
      ]),
      ...stationPlaces().flatMap((s) =>
        s.corners.map((c): [string, number, number] => [s.system, c.x, c.z]),
      ),
      ...rearStationPlaces().flatMap((r) =>
        r.corners.map((c): [string, number, number] => [r.role, c.x, c.z]),
      ),
      ...chairPlaces().map((c): [string, number, number] => [
        'a chair',
        c.x,
        c.z,
      ]),
      ...plaquePlaces().map((p): [string, number, number] => [
        p.role,
        p.x,
        p.z,
      ]),
    ];
    const v = viewscreenPlace();
    things.push(['the viewscreen', v.x, v.z]);
    for (const [name, x, z] of things)
      expect(inReadyRoomReserve(x, z), name).toBe(false);
  });

  it('keeps the floor before it open, for the door to come', () => {
    const { a, b, n } = readyRoomReserve();
    const mid = {
      x: (a.x + b.x) / 2 + n.x * 0.8,
      z: (a.z + b.z) / 2 + n.z * 0.8,
    };
    expect(inReadyRoomReserve(mid.x, mid.z)).toBe(true);
    expect(
      protoSolids(STOREY, 'bridge', true).some((s) =>
        overlaps(s, mid.x, mid.z, 0.45),
      ),
    ).toBe(false);
  });
});
