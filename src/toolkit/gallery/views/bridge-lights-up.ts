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
 * The bridge's entrance (the owner, 2026-10-27; `logic/bridge-lights-up.ts`):
 * a part with nothing to see that, each frame after the room's lighting
 * way has set its lights (`room-lights.ts`), scales them: dark when the
 * walker comes in from the corridor, its controls and displays glowing as
 * ever (they are not light fittings), then the coves round the dome, the
 * dome, the walls' and ribs' coves and the aft strip coming up in turn.
 * Each light and fitting tagged `userData.bridgeLightStage` follows its
 * stage; every other light in the scene (the fills) the fill's share. The
 * player's torch and daylight are left alone. Not in the world: a visit's
 * presentation, played again on each visit; the lights going out behind
 * a walker leaving, so the room waits dark.
 */
export function createBridgeLightsUp(): Part & {
  enter(from: string | null): void;
  leave(): void;
} {
  const object = new Group();
  object.name = 'Bridge lights coming up (presentation)';
  const openedHere = pageOpenedOnBridge();
  // Seconds since arriving: lit at once on the page opened here; else
  // dark until the walker comes in.
  let t = openedHere ? Infinity : 0;
  let waiting = !openedHere;
  // Going out behind a leaving walker: the share left, falling to none.
  let fading: number | null = null;
  let lights: { light: Light; stage: LightStage | 'fill' }[] | null = null;
  let glows: { m: Glow; stage: LightStage }[] = [];
  const collect = () => {
    let root: Object3D = object;
    while (root.parent) root = root.parent;
    if (root === object) return;
    const found: typeof lights = [];
    const mats = new Map<Glow, LightStage>();
    root.traverse((o) => {
      if (o instanceof Light) {
        if (o.name === 'Torch' || o.userData.daylight) return;
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
  return {
    object,
    uses: new Map(),
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
    enter(from) {
      const play = playsEntrance(from, openedHere && !enteredBefore);
      enteredBefore = true;
      fading = null;
      waiting = false;
      t = play ? 0 : Infinity;
    },
    leave() {
      if (!waiting) fading = 1;
    },
    update(delta) {
      if (!lights) collect();
      if (!lights) return;
      let levels: Record<LightStage | 'fill', number>;
      if (fading !== null) {
        fading = Math.max(0, fading - delta / LIGHTS_UP.out);
        const f = fading;
        const full = lightsUpLevels(Math.min(t, lightsUpTotal()));
        levels = {
          rings: full.rings * f,
          dome: full.dome * f,
          walls: full.walls * f,
          aft: full.aft * f,
          fill: LIGHTS_UP.floor + (full.fill - LIGHTS_UP.floor) * f,
        };
        if (f === 0) {
          fading = null;
          waiting = true;
          t = 0;
        }
      } else if (waiting) levels = lightsUpLevels(0);
      else {
        t += delta;
        if (t >= lightsUpTotal()) return;
        levels = lightsUpLevels(t);
      }
      // After the lighting way has set them this frame: scaled.
      for (const { light, stage } of lights) light.intensity *= levels[stage];
      for (const { m, stage } of glows) m.emissiveIntensity *= levels[stage];
    },
  };
}
