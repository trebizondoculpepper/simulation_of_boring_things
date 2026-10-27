import type { World } from '../../../game/world';
import { batteryMains, emergencyLit } from '../../../game/world';
import { batteryCanSupply } from '../../components/plant/logic/electrical-room';
import {
  ROOM_SWITCHES,
  roomLightsOn,
  zoneLit,
} from '../../../game/plant/lighting';
import { withIntake } from '../../../game/plant/site-intake';
import {
  ENTRY,
  PLATFORM,
  STOREY,
  bridgeDoor,
  deskSegments,
  rearStationPlaces,
  stationPlaces,
} from './control-room-prototype';
import type { Point } from './control-room-prototype';

/**
 * The bridge's light switch and emergency lighting (the owner,
 * 2026-10-27): a two-gang plate switch inside the corridor doors, MAIN
 * LIGHTS and EMERGENCY LIGHTS, its state the world's
 * (`lighting.switches.bridge`, `plant/lighting.ts`). Pure.
 */

const BRIDGE_ZONE = ROOM_SWITCHES.bridge.zone;

/** Whether the bridge's normal lights are on: the control room's lighting way live, and MAIN LIGHTS on. */
export const bridgeMainLit = (world: World) =>
  roomLightsOn(withIntake(world.plant, world.intake), world.lighting, 'bridge');

/**
 * Whether the bridge's emergency lighting (the glow under its consoles,
 * `underConsoleGlow`) is lit. It is maintained lighting on the central
 * battery system: switched on by EMERGENCY
 * LIGHTS, lit from the control room's lighting way or, without it, the
 * battery; and, whatever the switch, lit by the battery when the way's
 * supply fails (the system's relay, EN 50171, as `emergencyLit`), or in
 * the battery's test.
 */
export function bridgeEmergencyLit(world: World): boolean {
  if (emergencyLit(world, BRIDGE_ZONE)) return true;
  if (!world.lighting.switches.bridge.emergency) return false;
  const way = zoneLit(
    withIntake(world.plant, world.intake),
    world.lighting,
    BRIDGE_ZONE,
  );
  return way || batteryCanSupply(world.centralBattery, batteryMains(world));
}

/** Where the switch plate goes: on the west wall's inner face, to the right of the doorway as one comes in, its middle `height` over the floor. */
/**
 * Whether the bridge's light switch's supply is live, lighting its locator
 * LEDs (the owner, 2026-10-27): the control room's lighting way, or the
 * central battery able to supply.
 */
export const bridgeSwitchLive = (world: World): boolean =>
  zoneLit(withIntake(world.plant, world.intake), world.lighting, BRIDGE_ZONE) ||
  batteryCanSupply(world.centralBattery, batteryMains(world));

export const LIGHT_SWITCH = { height: 1.2, beyond: 0.3 } as const;

export function lightSwitchPlace() {
  const d = bridgeDoor();
  // Coming in (along `into`), the right hand is (−into.z, into.x).
  const right = { x: -d.into.z, z: d.into.x };
  const s = right.x * d.along.x + right.z * d.along.z > 0 ? 1 : -1;
  const off = d.width / 2 + LIGHT_SWITCH.beyond;
  return {
    x: d.x + d.along.x * off * s,
    y: STOREY + LIGHT_SWITCH.height,
    z: d.z + d.along.z * off * s,
    /** The plate's face's turn about y: its +z into the room. */
    yaw: Math.atan2(d.into.x, d.into.z),
    /** Metres along the west wall from its start. */
    along: ENTRY.at + off * s,
  };
}

/**
 * A glow under a console's edge (the owner, 2026-10-27: EMERGENCY LIGHTS
 * is "only a very dim light coming from under the consoles"): its edge on
 * plan from `a` to `b` at the floor it stands on (`y`), and `out`, the
 * unit way across the floor the light spills, away from the console.
 */
export interface ConsoleGlow {
  name: string;
  a: Point;
  b: Point;
  y: number;
  out: Point;
}

/** How far the glow spills across the floor from a console's foot, metres. */
export const GLOW_SPILL = 0.5;

/** An edge's way out from a footprint whose middle is `mid`. */
const outFrom = (a: Point, b: Point, mid: Point): Point => {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  let n = { x: -(b.z - a.z) / len, z: (b.x - a.x) / len };
  const m = { x: (a.x + b.x) / 2 - mid.x, z: (a.z + b.z) / 2 - mid.z };
  if (n.x * m.x + n.z * m.z < 0) n = { x: -n.x, z: -n.z };
  return n;
};

const middle = (ps: readonly Point[]): Point => ({
  x: ps.reduce((t, p) => t + p.x, 0) / ps.length,
  z: ps.reduce((t, p) => t + p.z, 0) / ps.length,
});

/**
 * The bridge's emergency lighting (the owner, 2026-10-27, replacing the
 * fittings first proposed): hidden strips at the feet of its consoles,
 * their light spilling a little way across the floor: along both long
 * edges of each of the operator's desk's segments (the operator's well
 * and the room's side), all round each forward station, and round each
 * rear station but for its side against the wall, on the stage.
 */
export function underConsoleGlow(): ConsoleGlow[] {
  const glows: ConsoleGlow[] = [];
  const edges = (
    name: string,
    corners: readonly Point[],
    y: number,
    skip: (i: number) => boolean = () => false,
  ) => {
    const mid = middle(corners);
    corners.forEach((a, i) => {
      if (skip(i)) return;
      const b = corners[(i + 1) % corners.length];
      glows.push({ name, a, b, y, out: outFrom(a, b, mid) });
    });
  };
  for (const seg of deskSegments()) {
    const corners = [seg.outer[0], seg.outer[1], seg.inner[1], seg.inner[0]];
    // Its long edges only: its ends meet its neighbours'.
    edges(
      `the desk's segment ${seg.side}`,
      corners,
      STOREY,
      (i) => i % 2 === 1,
    );
  }
  for (const st of stationPlaces()) edges(st.system, st.corners, STOREY);
  for (const r of rearStationPlaces())
    // Its first edge stands against the wall.
    edges(r.role, r.corners, STOREY + PLATFORM.height, (i) => i === 0);
  return glows;
}
