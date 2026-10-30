import { describe, expect, it } from 'vite-plus/test';
import {
  DOOR_STACK,
  doorPanels,
  doorTravel,
  landingArrival,
  LIFT_CAR,
  LIFT_DOOR,
  PANEL_WIDTH,
  liftDoorway,
  liftLocal,
  liftWorld,
  lookingOut,
} from './lift-doorway';
import {
  CORRIDOR_LIFT,
  corridorArrival,
  LIFT_OPENING,
  wallPieces,
} from './main-corridor';
import {
  BRIDGE_LIFT,
  CORNER_FILLET,
  ENTRY,
  bridgeWallGaps,
  bridgeWallPieces,
} from './control-room-prototype';
import { lightSwitchPlace } from './bridge-lighting';
import { hallArches, hallLiftOpening, MUSEUM_WALL } from './museum-plan';

const ahead = (yaw: number) => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });

describe('a lift doorway (mission 108)', () => {
  it('turns local and room points back and forth', () => {
    const place = { x: 17.9, z: 0, yaw: 0 };
    expect(liftWorld(place, 0, 1)).toEqual({ x: 17.9, z: 1 });
    const turned = { x: 3, z: 4, yaw: Math.PI / 2 };
    const p = liftWorld(turned, 0.5, 1.2);
    const back = liftLocal(turned, p.x, p.z);
    expect(back.u).toBeCloseTo(0.5);
    expect(back.v).toBeCloseTo(1.2);
  });
  it('a north-wall landing: its leaves behind the face, through means north of it', () => {
    const d = liftDoorway({ x: 17.9, z: 0, yaw: 0 });
    expect(d.leaf.maxZ).toBeCloseTo(0);
    expect(d.leaf.minZ).toBeCloseTo(-LIFT_DOOR.depth);
    expect(d.leaf.maxX - d.leaf.minX).toBeCloseTo(LIFT_DOOR.clear);
    expect(d.through(17.9, -0.2)).toBe(true);
    expect(d.through(17.9, 0.2)).toBe(false);
    expect(d.through(20, -0.2)).toBe(false);
    expect(d.inDoorway(17.9, 0.2)).toBe(true);
    expect(d.inDoorway(17.9, 1.5)).toBe(false);
  });
  it('arrives facing into the room, and looks out the other way', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const place = { x: 1, z: 2, yaw };
      const a = landingArrival(place);
      const into = liftLocal(place, a.x, a.z);
      expect(into.v).toBeCloseTo(1.5);
      const f = ahead(a.yaw);
      const step = liftLocal(place, a.x + f.x, a.z + f.z);
      expect(step.v).toBeCloseTo(2.5);
      const o = ahead(lookingOut(place));
      expect(liftLocal(place, place.x + o.x, place.z + o.z).v).toBeCloseTo(-1);
    }
  });
});

describe('the four-panel centre-opening doors (the owner, 2026-10-30)', () => {
  it('a sensible opening in a car wide enough to hide the stack', () => {
    expect(LIFT_DOOR.clear).toBeGreaterThanOrEqual(1.1);
    expect(LIFT_CAR.w).toBeGreaterThanOrEqual(2.0);
    expect(DOOR_STACK).toBeLessThanOrEqual(LIFT_CAR.w / 2);
  });
  it('the operator eases in and out', () => {
    expect(doorTravel(0)).toBe(0);
    expect(doorTravel(1)).toBe(1);
    expect(doorTravel(0.5)).toBeCloseTo(0.5);
    expect(doorTravel(0.1)).toBeLessThan(0.1);
    expect(doorTravel(-1)).toBe(0);
    expect(doorTravel(2)).toBe(1);
  });
  it('shut, the fast panels meet in the middle and the slow lap the frame', () => {
    const { fast, slow } = doorPanels(0);
    expect(fast - PANEL_WIDTH / 2).toBeCloseTo(0);
    expect(slow + PANEL_WIDTH / 2).toBeCloseTo(
      LIFT_DOOR.clear / 2 + LIFT_DOOR.lap,
    );
    // The fast panel laps the slow.
    expect(fast + PANEL_WIDTH / 2).toBeGreaterThan(slow - PANEL_WIDTH / 2);
  });
  it('the fast panel travels twice as far as the slow, and both stack clear of the opening', () => {
    for (const k of [0.25, 0.5, 0.8, 1]) {
      const a = doorPanels(0);
      const b = doorPanels(k);
      expect(b.fast - a.fast).toBeCloseTo(2 * (b.slow - a.slow));
    }
    const open = doorPanels(1);
    expect(open.fast).toBeCloseTo(open.slow);
    expect(open.fast - PANEL_WIDTH / 2).toBeCloseTo(LIFT_DOOR.clear / 2);
    expect(open.fast + PANEL_WIDTH / 2).toBeCloseTo(DOOR_STACK);
  });
});

describe('the freight lift’s landings (mission 108)', () => {
  it('B2: a gap in the corridor’s north wall, in the free stretch, and the way back out of the car', () => {
    const half = LIFT_OPENING / 2;
    expect(CORRIDOR_LIFT.at - half).toBeGreaterThan(12.2);
    expect(CORRIDOR_LIFT.at + half).toBeLessThan(23.6);
    const pieces = wallPieces('north');
    expect(
      pieces.some(
        ([a, b]) =>
          a < CORRIDOR_LIFT.at + half - 1e-6 &&
          b > CORRIDOR_LIFT.at - half + 1e-6,
      ),
    ).toBe(false);
    const a = corridorArrival('freight_lift')!;
    expect(a.x).toBeCloseTo(CORRIDOR_LIFT.x);
    expect(a.z).toBeCloseTo(1.5);
  });
  it('3: in the middle of the bridge’s east wall, the doors stacking behind solid wall within its corner fillets', () => {
    expect(BRIDGE_LIFT.side).not.toBe(ENTRY.side);
    const gaps = bridgeWallGaps(BRIDGE_LIFT.side);
    expect(gaps).toHaveLength(1);
    const pieces = bridgeWallPieces(BRIDGE_LIFT.side);
    expect(pieces).toHaveLength(2);
    const len = pieces[1][1];
    const at = (gaps[0].from + gaps[0].to) / 2;
    expect(at).toBeCloseTo(len / 2);
    expect(at - DOOR_STACK).toBeGreaterThan(CORNER_FILLET);
    expect(at + DOOR_STACK).toBeLessThan(len - CORNER_FILLET);
    // The corridor's doorway keeps the west wall to itself.
    expect(bridgeWallGaps(ENTRY.side)).toHaveLength(1);
    const along = lightSwitchPlace().along;
    expect(along).toBeGreaterThan(0);
  });
  it('B2: the doors stack behind solid wall either side', () => {
    const pieces = wallPieces('north');
    for (const s of [-1, 1]) {
      const edge = CORRIDOR_LIFT.at + (s * LIFT_OPENING) / 2;
      const end = CORRIDOR_LIFT.at + s * DOOR_STACK;
      expect(
        pieces.some(
          ([a, b]) => a <= Math.min(edge, end) && b >= Math.max(edge, end),
        ),
      ).toBe(true);
    }
  });
  it('4: the doors stack behind solid wall either side, clear of the doorway from Hall 9', () => {
    const lift = hallLiftOpening('museum0')!;
    const t = MUSEUM_WALL / 2;
    expect(lift.u - DOOR_STACK).toBeGreaterThan(lift.wall.from + t);
    expect(lift.u + DOOR_STACK).toBeLessThan(lift.wall.to - t);
    for (const a of hallArches('museum0'))
      if (a.axis === lift.wall.axis && a.at.x === lift.wall.line) {
        const u = a.at.z;
        expect(Math.abs(u - lift.u) - a.w / 2 - DOOR_STACK).toBeGreaterThan(0);
      }
  });
});
