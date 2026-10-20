import { DOORS, roomById, sharedWall } from './facility-plan';
import type { PlanFootprint } from './facility-plan';

export interface Portal {
  id: string;
  rooms: readonly [string, string];
  x: number;
  z: number;
  width: number;
  /** The doorway spans x or z. */
  axis: 'x' | 'z';
  floorY: number;
  public: boolean;
  /** `open`: a stair or other way through with no door at all. */
  kind: 'swing' | 'frosted-slide' | 'open';
}

export const PORTALS: readonly Portal[] = [
  ...DOORS.map((door, index): Portal => {
    const a = roomById(door.rooms[0]);
    const b = roomById(door.rooms[1]);
    // The stair between the corridors: always open, so each corridor
    // sees the other down or up the flight.
    if (door.stair)
      return {
        id: `door:${index}`,
        rooms: door.rooms,
        x: door.at,
        z: -3.35,
        width: door.width,
        axis: 'x' as const,
        floorY: -3,
        public: false,
        kind: 'open',
      };
    const wall = sharedWall(a, b);
    if (!wall) throw new Error(`No wall for ${door.rooms.join(' / ')}`);
    const axis: Portal['axis'] =
      wall.side === 'north' || wall.side === 'south' ? 'x' : 'z';
    return {
      id: `door:${index}`,
      rooms: door.rooms,
      x: axis === 'x' ? door.at : wall.line,
      z: axis === 'z' ? door.at : wall.line,
      width: door.width,
      axis,
      floorY: a.floorY ?? 0,
      public: a.zone === 'public' && b.zone === 'public',
      kind:
        door.rooms.includes('reception') && door.rooms.includes('changing')
          ? 'frosted-slide'
          : 'swing',
    };
  }),
  {
    id: 'door:entrance',
    rooms: ['reception', 'outside'],
    x: 112,
    z: 25,
    width: 3,
    axis: 'z',
    floorY: 0,
    public: true,
    kind: 'swing',
  },
];

export interface DoorState {
  open: number;
  hold: number;
}

export function nearDoor(portal: Portal, x: number, z: number, floorY: number) {
  if (Math.abs(floorY - portal.floorY) > 1.1) return false;
  const across =
    portal.axis === 'x' ? Math.abs(z - portal.z) : Math.abs(x - portal.x);
  const along =
    portal.axis === 'x' ? Math.abs(x - portal.x) : Math.abs(z - portal.z);
  return across < 1.8 && along < portal.width / 2 + 0.55;
}

/** Automatic closer holds open while someone is nearby, then eases shut. */
export function advanceDoor(
  portal: Portal,
  state: DoorState,
  x: number,
  z: number,
  floorY: number,
  delta: number,
) {
  const near = nearDoor(portal, x, z, floorY);
  const hold = near ? 1.4 : Math.max(0, state.hold - delta);
  const target = hold > 0 ? 1 : 0;
  const speed = target > state.open ? 2.6 : 0.85;
  const open = Math.max(
    0,
    Math.min(1, state.open + Math.sign(target - state.open) * speed * delta),
  );
  return {
    open: Math.abs(open - target) < speed * delta ? target : open,
    hold,
  };
}

export function doorFootprint(portal: Portal): PlanFootprint {
  const half = portal.width / 2;
  return portal.axis === 'x'
    ? {
        minX: portal.x - half,
        maxX: portal.x + half,
        minZ: portal.z - 0.1,
        maxZ: portal.z + 0.1,
      }
    : {
        minX: portal.x - 0.1,
        maxX: portal.x + 0.1,
        minZ: portal.z - half,
        maxZ: portal.z + half,
      };
}

/** Frosted glazing needs its neighbour to produce a real blurred view. */
export function visibleRooms(
  current: string,
  states: ReadonlyMap<string, DoorState>,
) {
  const visible = new Set<string>();
  if (current !== 'outside') visible.add(current);
  for (const portal of PORTALS) {
    if (
      !portal.rooms.includes(current) ||
      ((states.get(portal.id)?.open ?? 0) < 0.08 && portal.kind === 'swing')
    )
      continue;
    const other =
      portal.rooms[0] === current ? portal.rooms[1] : portal.rooms[0];
    if (other !== 'outside') visible.add(other);
  }
  return visible;
}
