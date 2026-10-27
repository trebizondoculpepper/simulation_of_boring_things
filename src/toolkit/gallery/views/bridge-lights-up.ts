import { Group, Light, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import type { Part } from '../../components/core/parts/parts';
import {
  LIGHTS_UP,
  entranceGlow,
  lightsUpLevels,
  lightsUpTotal,
  playsEntrance,
} from '../logic/bridge-lights-up';
import type { Entrance, LightStage } from '../logic/bridge-lights-up';

/** Whether the bridge has been entered yet in this page's life. */
let enteredBefore = false;

/** Whether the page was opened (or reloaded) on the bridge. */
export function pageOpenedOnBridge() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const url = new URL(nav?.name ?? location.href);
    return url.searchParams.get('room') === 'bridge';
  } catch {
    return false;
  }
}

type Glow = Material & { emissiveIntensity: number };

/**
 * The bridge's lights (the owner, 2026-10-27; `logic/bridge-lights-up.ts`):
 * a part with nothing to see that, each frame after the room's lighting
 * way has set its lights (`room-lights.ts`), scales them. Dark when the
 * walker comes in from the corridor, its controls and displays glowing as
 * ever (they are not light fittings), then the coves round the dome, the
 * dome, the walls' and ribs' coves and the aft strip coming up in turn;
 * the same rise, without the darkness first, when MAIN LIGHTS is switched
 * on (`mainLit`: the world's way and the switch); faded down when it is
 * switched off, or the way fails. Each light and fitting tagged
 * `userData.bridgeLightStage` follows its stage; every other light in the
 * scene (the fills) the fill's share. The player's torch, daylight and
 * lights switched on their own (`userData.ownSwitching`: the emergency
 * lighting) are left alone. Not in the world: a visit's presentation,
 * played again on each visit; the main lights going out behind a walker
 * leaving, so the room waits under its emergency glow alone (`glow`, 1
 * while the walker is away: presentation, not the EMERGENCY LIGHTS
 * switch; the owner, 2026-10-27).
 */
export function createBridgeLightsUp(mainLit: () => boolean): Part & {
  /** Whether an entry from `from` would play an entrance (walked in from the corridor, not the page opened here). */
  plays(from: string | null): boolean;
  /** The walker in, playing `entrance` (null: none, the lights as their switches say). */
  enter(entrance: Entrance | null): void;
  leave(): void;
  /** Back to the bridge as first found. */
  reset(): void;
  /** The entrance's share of the under-console glow now (`entranceGlow`), 0 outside it. */
  glow(): number;
} {
  const object = new Group();
  object.name = 'Bridge lights coming up (presentation)';
  const openedHere = pageOpenedOnBridge();
  type Levels = Record<LightStage | 'fill', number>;
  const dark = lightsUpLevels(0);
  // The walker in the room: from the page opened here, or once entered.
  let present = openedHere;
  // Rising (`t` seconds into the sequence, its main lights beginning at
  // `at`), or falling from `from`.
  let t = Infinity;
  let at = 0;
  let falling: { from: Levels; f: number } | null = null;
  let out = !openedHere;
  let current: Levels = openedHere ? lightsUpLevels(Infinity) : dark;
  let first = true;
  // The entrance under way, if any, its glow its own; and the entrance's
  // own clock, seconds since the walker came in, which runs whether or
  // not MAIN LIGHTS is yet on.
  let entrance: Entrance | null = null;
  let since = Infinity;
  let lights: { light: Light; stage: LightStage | 'fill' }[] | null = null;
  let glows: { m: Glow; stage: LightStage }[] = [];
  const collect = () => {
    let root: Object3D = object;
    while (root.parent) root = root.parent;
    if (root === object) return;
    const found: { light: Light; stage: LightStage | 'fill' }[] = [];
    const mats = new Map<Glow, LightStage>();
    root.traverse((o) => {
      if (o instanceof Light) {
        if (
          o.name === 'Torch' ||
          o.userData.daylight ||
          o.userData.ownSwitching
        )
          return;
        found.push({
          light: o,
          stage: (o.userData.bridgeLightStage as LightStage) ?? 'fill',
        });
      } else if (o instanceof Mesh) {
        const ms = (
          Array.isArray(o.material) ? o.material : [o.material]
        ) as Material[];
        for (const m of ms) {
          const stage = m.userData.bridgeLightStage as LightStage | undefined;
          if (stage && 'emissiveIntensity' in m) mats.set(m as Glow, stage);
        }
      }
    });
    lights = found;
    glows = [...mats].map(([m, stage]) => ({ m, stage }));
  };
  const rise = (from: number, start = 0) => {
    falling = null;
    out = false;
    t = from;
    at = start;
  };
  const fall = () => {
    if (out || falling) return;
    falling = { from: current, f: 1 };
  };
  return {
    object,
    uses: new Map(),
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
    plays: (from) => playsEntrance(from, openedHere && !enteredBefore),
    enter(next) {
      enteredBefore = true;
      present = true;
      entrance = next;
      since = next ? 0 : Infinity;
      if (!mainLit()) {
        // Found with MAIN LIGHTS off: dark but for the glow, until the
        // switch is thrown (by hand, or by the bridge itself outside the
        // first view, `AUTO_LIGHTS_ON_MS`).
        falling = null;
        out = true;
        current = dark;
      } else if (next) rise(0, next.lightsAt);
      else rise(Infinity);
    },
    leave() {
      present = false;
      entrance = null;
      fall();
    },
    /** Back to the bridge as first found (the CONTROL ROOM MODE plate's RESET): dark but for its emergency glow. */
    reset() {
      if (present) return;
      entrance = null;
      falling = null;
      out = true;
      current = dark;
    },
    // Waiting under its emergency lights alone, seen from the corridor
    // (the owner, 2026-10-27); in an entrance, its own curve until the
    // main lights are up.
    glow: () =>
      entrance && !falling ? entranceGlow(since, entrance) : !present ? 1 : 0,
    update(delta) {
      if (!lights) collect();
      if (!lights) return;
      const on = mainLit();
      // Opened here with MAIN LIGHTS off: dark from the first frame.
      if (first && !on) {
        out = true;
        current = dark;
      }
      first = false;
      since += delta;
      // MAIN LIGHTS switched on with the walker here: the rise, at once
      // (in the entrance, the glow keeps its own time).
      if (on && present && (out || falling)) rise(0);
      // Switched off, or its way gone: down.
      if (!on && !out) fall();
      if (falling) {
        falling.f = Math.max(0, falling.f - delta / LIGHTS_UP.out);
        const { from, f } = falling;
        current = {
          rings: from.rings * f,
          dome: from.dome * f,
          walls: from.walls * f,
          aft: from.aft * f,
          fill: dark.fill + (from.fill - dark.fill) * f,
        };
        if (f === 0) {
          falling = null;
          out = true;
        }
      } else if (out) current = dark;
      else {
        t += delta;
        current = lightsUpLevels(t, at);
        if (t >= lightsUpTotal(at)) {
          if (entrance && entranceGlow(since, entrance) === 0) entrance = null;
          return;
        }
      }
      // After the lighting way has set them this frame: scaled.
      for (const { light, stage } of lights) light.intensity *= current[stage];
      for (const { m, stage } of glows) m.emissiveIntensity *= current[stage];
    },
  };
}
