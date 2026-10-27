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
  RAMP,
  STOREY,
  bridgeDoor,
  edgeAt,
  inward,
  rampHeightAt,
  roomPolygon,
  sides,
} from './control-room-prototype';

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
 * Whether the bridge's emergency fittings are lit. They are maintained
 * fittings on the central battery system: switched on by EMERGENCY
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

/** A strip of low-level emergency light: from `a` to `b`, metres, its y the floor or tread it lies along. */
export interface EmergencyStrip {
  name: string;
  a: { x: number; y: number; z: number };
  b: { x: number; y: number; z: number };
}

/** An emergency luminaire on a wall: its middle and its face's turn. */
export interface EmergencyLuminaire {
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/**
 * The proposal for the bridge's emergency lighting (for the owner to
 * confirm): a slim luminaire over the corridor doors inside; one high on
 * each aft wall near the back corner, over the stage; and low-level
 * strips on the nosing of each of the stage's steps and along the open
 * edge of each ramp, up its slope.
 */
export function emergencyPlan(): {
  luminaires: EmergencyLuminaire[];
  strips: EmergencyStrip[];
} {
  const room = roomPolygon();
  const door = bridgeDoor();
  const luminaires: EmergencyLuminaire[] = [
    {
      name: 'over the corridor doors',
      x: door.x + door.into.x * 0.04,
      y: STOREY + door.height + 0.25,
      z: door.z + door.into.z * 0.04,
      yaw: Math.atan2(door.into.x, door.into.z),
    },
  ];
  for (const side of [3, 4] as const) {
    const [a, b] = sides(room)[side];
    const n = inward(a, b);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    // 1.2 m from the back corner (side 3 ends there, side 4 starts there).
    const t = side === 3 ? (len - 1.2) / len : 1.2 / len;
    luminaires.push({
      name: `on the ${side === 3 ? 'east' : 'west'} aft wall`,
      x: a.x + (b.x - a.x) * t + n.x * 0.04,
      y: STOREY + PLATFORM.height + 3.2,
      z: a.z + (b.z - a.z) * t + n.z * 0.04,
      yaw: Math.atan2(n.x, n.z),
    });
  }
  const strips: EmergencyStrip[] = [];
  // Each step's nosing, its tread's front edge.
  const { risers, going, stepWidth, height } = PLATFORM;
  const half = stepWidth / 2 - 0.05;
  const edge = edgeAt(0);
  for (let k = 1; k <= risers; k++) {
    const z = edge - (risers - k) * going - 0.02;
    const y = STOREY + (k * height) / risers;
    strips.push({
      name: `step ${k}'s nosing`,
      a: { x: -half, y, z },
      b: { x: half, y, z },
    });
  }
  // Each ramp's open edge, up its slope, in short pieces.
  for (const s of [-1, 1]) {
    const pts: { x: number; y: number; z: number }[] = [];
    for (let x = RAMP.low - 0.2; x >= RAMP.end + 0.1; x -= 0.5) {
      const z = edgeAt(x) - RAMP.depth + 0.08;
      const y = rampHeightAt(s * x, z + 0.02) ?? STOREY;
      pts.push({ x: s * x, y, z });
    }
    pts.slice(1).forEach((b, i) =>
      strips.push({
        name: `the ${s > 0 ? 'east' : 'west'} ramp's edge`,
        a: pts[i],
        b,
      }),
    );
  }
  return { luminaires, strips };
}
