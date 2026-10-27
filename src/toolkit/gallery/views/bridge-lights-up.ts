import { Group, Light, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import type { Part } from '../../components/core/parts/parts';
import {
  LIGHTS_UP,
  lightsUpLevels,
  lightsUpTotal,
  playsEntrance,
} from '../logic/bridge-lights-up';
import type { LightStage } from '../logic/bridge-lights-up';

/** Whether the bridge has been entered yet in this page's life. */
let enteredBefore = false;

/** Whether the page was opened (or reloaded) on the bridge. */
function pageOpenedOnBridge() {
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
 * played again on each visit; the lights going out behind a walker
 * leaving, so the room waits dark.
 */
export function createBridgeLightsUp(mainLit: () => boolean): Part & {
  enter(from: string | null): void;
  leave(): void;
} {
  const object = new Group();
  object.name = 'Bridge lights coming up (presentation)';
  const openedHere = pageOpenedOnBridge();
  type Levels = Record<LightStage | 'fill', number>;
  const dark = lightsUpLevels(0);
  // The walker in the room: from the page opened here, or once entered.
  let present = openedHere;
  // Rising (`t` seconds into the sequence), or falling from `from`.
  let t = Infinity;
  let falling: { from: Levels; f: number } | null = null;
  let out = !openedHere;
  let current: Levels = openedHere ? lightsUpLevels(Infinity) : dark;
  let first = true;
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
  const rise = (from: number) => {
    falling = null;
    out = false;
    t = from;
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
    enter(from) {
      const play = playsEntrance(from, openedHere && !enteredBefore);
      enteredBefore = true;
      present = true;
      if (!mainLit()) {
        falling = null;
        out = true;
        current = dark;
      } else rise(play ? 0 : Infinity);
    },
    leave() {
      present = false;
      fall();
    },
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
      // MAIN LIGHTS switched on with the walker here: the rise, at once.
      if (on && present && (out || falling)) rise(LIGHTS_UP.dark);
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
        current = lightsUpLevels(t);
        if (t >= lightsUpTotal()) return;
      }
      // After the lighting way has set them this frame: scaled.
      for (const { light, stage } of lights) light.intensity *= current[stage];
      for (const { m, stage } of glows) m.emissiveIntensity *= current[stage];
    },
  };
}
