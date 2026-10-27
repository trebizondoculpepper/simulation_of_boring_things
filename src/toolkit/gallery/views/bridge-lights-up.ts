import { Group, Light, Mesh, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import type { Part } from '../../components/core/parts/parts';
import {
  LIGHTS_UP,
  clockwiseAngle,
  entranceGlow,
  fillLevel,
  lightsUpTotal,
  playsEntrance,
  sweepLevel,
  sweepSpan,
  sweepStarts,
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
  /** The walker in, playing `entrance` (null: none, the lights as their switches say; `'held'`: the first view, waiting for the doors, the room kept as seen from outside). */
  enter(entrance: Entrance | 'held' | null): void;
  /** A held first view begun (the corridor doors shut behind the walker): `entrance` from now. */
  begin(entrance: Entrance): void;
  /** The entrance's main lights to begin `at` seconds into it (known once its displays boot). */
  setLightsAt(at: number): void;
  leave(): void;
  /** Back to the bridge as first found. */
  reset(): void;
  /** The entrance's share of the under-console glow now (`entranceGlow`), 0 outside it. */
  glow(): number;
} {
  const object = new Group();
  object.name = 'Bridge lights coming up (presentation)';
  const openedHere = pageOpenedOnBridge();
  // Each light and lit material of a stage (an item of the sweep), its
  // start after the main lights begin (`sweepStarts`: clockwise, the dome
  // last); the fill following their mean.
  type Levels = { items: number[]; fill: number };
  let starts: number[] = [];
  let span = 0;
  const levelsAt = (t: number, at: number): Levels => {
    const items = starts.map((s) => sweepLevel(t, at, s));
    return { items, fill: fillLevel(items) };
  };
  const darkLevels = (): Levels => ({
    items: starts.map(() => 0),
    fill: LIGHTS_UP.floor,
  });
  // The walker in the room: from the page opened here, or once entered.
  let present = openedHere;
  // Rising (`t` seconds into the sequence, its main lights beginning at
  // `at`), or falling from `from`.
  let t = Infinity;
  let at = 0;
  let falling: { from: Levels; f: number } | null = null;
  let out = !openedHere;
  let current: Levels = { items: [], fill: openedHere ? 1 : LIGHTS_UP.floor };
  let first = true;
  // The entrance under way, if any, its glow its own; and the entrance's
  // own clock, seconds since the walker came in, which runs whether or
  // not MAIN LIGHTS is yet on.
  let entrance: Entrance | null = null;
  // A first view held until the corridor doors shut behind the walker.
  let held = false;
  let since = Infinity;
  let lights: { light: Light; item: number | null }[] | null = null;
  let glows: { m: Glow; item: number }[] = [];
  const collect = () => {
    let root: Object3D = object;
    while (root.parent) root = root.parent;
    if (root === object) return;
    root.updateMatrixWorld(true);
    const found: { light: Light; item: number | null }[] = [];
    // Each item: its stage and where it is (summed, to average).
    const items: { stage: LightStage; x: number; z: number; n: number }[] = [];
    const mats = new Map<Glow, number>();
    const p = new Vector3();
    root.traverse((o) => {
      if (o instanceof Light) {
        if (
          o.name === 'Torch' ||
          o.userData.daylight ||
          o.userData.ownSwitching
        )
          return;
        const stage = o.userData.bridgeLightStage as LightStage | undefined;
        if (!stage) {
          found.push({ light: o, item: null });
          return;
        }
        o.getWorldPosition(p);
        items.push({ stage, x: p.x, z: p.z, n: 1 });
        found.push({ light: o, item: items.length - 1 });
      } else if (o instanceof Mesh) {
        const ms = (
          Array.isArray(o.material) ? o.material : [o.material]
        ) as Material[];
        for (const m of ms) {
          const stage = m.userData.bridgeLightStage as LightStage | undefined;
          if (!stage || !('emissiveIntensity' in m)) continue;
          o.getWorldPosition(p);
          let k = mats.get(m as Glow);
          if (k === undefined) {
            items.push({ stage, x: 0, z: 0, n: 0 });
            k = items.length - 1;
            mats.set(m as Glow, k);
          }
          items[k].x += p.x;
          items[k].z += p.z;
          items[k].n += 1;
        }
      }
    });
    // Round the room's middle: the dome's, else all of them.
    const domes = items.filter((it) => it.stage === 'dome');
    const about = domes.length ? domes : items;
    const n = about.reduce((a, it) => a + it.n, 0) || 1;
    const cx = about.reduce((a, it) => a + it.x, 0) / n;
    const cz = about.reduce((a, it) => a + it.z, 0) / n;
    starts = sweepStarts(
      items.map((it) => ({
        angle: clockwiseAngle(it.x / (it.n || 1), it.z / (it.n || 1), cx, cz),
        dome: it.stage === 'dome',
      })),
    );
    span = sweepSpan(starts);
    if (entrance) entrance.span = span;
    lights = found;
    glows = [...mats].map(([m, item]) => ({ m, item }));
    current = out ? darkLevels() : levelsAt(t, at);
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
    enter(arrival) {
      enteredBefore = true;
      present = true;
      // Held: dark, but for the glow, until `begin` (the owner, 2026-10-27:
      // "walk into a mysterious space for a bit").
      held = arrival === 'held';
      const next = held ? null : (arrival as Entrance | null);
      entrance = next;
      if (next && lights) next.span = span;
      since = next ? 0 : Infinity;
      if (held || !mainLit()) {
        // Held, or found with MAIN LIGHTS off: dark but for the glow, until the
        // switch is thrown (by hand, or by the bridge itself outside the
        // first view, `AUTO_LIGHTS_ON_MS`).
        falling = null;
        out = true;
        current = darkLevels();
      } else if (next) rise(0, next.lightsAt);
      else rise(Infinity);
    },
    begin(next) {
      held = false;
      entrance = next;
      if (lights) next.span = span;
      since = 0;
      if (mainLit()) rise(0, next.lightsAt);
    },
    setLightsAt(lightsAt) {
      if (!entrance) return;
      entrance.lightsAt = lightsAt;
      if (!out && !falling) at = lightsAt;
    },
    leave() {
      present = false;
      held = false;
      entrance = null;
      fall();
    },
    /** Back to the bridge as first found (the CONTROL ROOM MODE plate's RESET): dark but for its emergency glow. */
    reset() {
      if (present) return;
      entrance = null;
      falling = null;
      out = true;
      current = darkLevels();
    },
    // Waiting under its emergency lights alone, seen from the corridor
    // (the owner, 2026-10-27); in an entrance, its own curve until the
    // main lights are up.
    glow: () =>
      entrance && !falling
        ? entranceGlow(since, entrance)
        : !present || held
          ? 1
          : 0,
    update(delta) {
      if (!lights) collect();
      if (!lights) return;
      const on = mainLit();
      // Opened here with MAIN LIGHTS off: dark from the first frame.
      if (first && !on) {
        out = true;
        current = darkLevels();
      }
      first = false;
      since += delta;
      // MAIN LIGHTS switched on with the walker here: the rise, at once
      // (in the entrance, the glow keeps its own time).
      if (on && present && !held && (out || falling)) rise(0);
      // Switched off, or its way gone: down.
      if (!on && !out) fall();
      if (falling) {
        falling.f = Math.max(0, falling.f - delta / LIGHTS_UP.out);
        const { from, f } = falling;
        current = {
          items: from.items.map((l) => l * f),
          fill: LIGHTS_UP.floor + (from.fill - LIGHTS_UP.floor) * f,
        };
        if (f === 0) {
          falling = null;
          out = true;
        }
      } else if (out) current = darkLevels();
      else {
        t += delta;
        current = levelsAt(t, at);
        if (t >= lightsUpTotal(at, span)) {
          if (entrance && entranceGlow(since, entrance) === 0) entrance = null;
          return;
        }
      }
      // After the lighting way has set them this frame: scaled.
      for (const { light, item } of lights)
        light.intensity *= item === null ? current.fill : current.items[item];
      for (const { m, item } of glows)
        m.emissiveIntensity *= current.items[item];
    },
  };
}
