import {
  AmbientLight,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Group, Object3D } from 'three';
import {
  LOOP_CEILING,
  LOOP_HALF,
  LOOP_OUTER_BOUNDS,
  LOOP_ZONES,
  doorway,
  onSide,
  visibleZones,
  arrivalAt,
  walkedThrough,
  zoneAt,
} from '../game/dev-corridor-plan';
import type { LoopSide } from '../game/dev-corridor-plan';
import {
  anchor,
  carry,
  inCourtyard,
  inJoinedDoorway,
  joinedWalls,
  toWorld,
} from '../game/courtyard-join';
import type { Anchor } from '../game/courtyard-join';
import { registerJoint } from '../toolkit/gallery/logic/door-joins';
import { createDevCorridor } from '../scene/dev-corridor';
import {
  devPortals,
  devWalls,
  enterDevRoom,
} from '../toolkit/gallery/logic/dev-room-links';
import { COURTYARD_VIEWS, createDevCourtyardRoom } from './dev-courtyard-room';
import { METRE } from '../toolkit/components/core/logic/units';
import type { Footprint } from '../toolkit/controls/logic/walk-collision';
import {
  createPanelKit,
  disposeKit,
} from '../toolkit/components/core/views/eighties-controls';
import { createPortals } from '../toolkit/gallery/views/portals';
import { createFirstPerson } from '../toolkit/controls/input/first-person';
import { partAudio } from '../toolkit/components/core/audio/part-audio';
import { ps1Uniforms } from '../toolkit/components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../toolkit/components/core/parts/render-style';

/** How many real lights light the corridor: the battens nearest in view. */
export const CORRIDOR_LIGHTS = 6;

/** The views to start from, by name (`?view=`), metres and radians. */
export const CORRIDOR_VIEWS: Record<
  string,
  { x: number; z: number; yaw: number; pitch: number }
> = {
  start: { ...onSide('north', -20), yaw: Math.PI / 2, pitch: 0 },
  a: { ...onSide('north', 0), yaw: -Math.PI / 2, pitch: 0 },
  b: { ...onSide('east', 0), yaw: Math.PI, pitch: 0 },
  c: { ...onSide('south', 0), yaw: Math.PI / 2, pitch: 0 },
  d: { ...onSide('west', 0), yaw: 0, pitch: 0 },
  nw: { x: -LOOP_HALF, z: -LOOP_HALF, yaw: (3 * Math.PI) / 4, pitch: 0 },
  ne: { x: LOOP_HALF, z: -LOOP_HALF, yaw: (-3 * Math.PI) / 4, pitch: 0 },
  se: { x: LOOP_HALF, z: LOOP_HALF, yaw: -Math.PI / 4, pitch: 0 },
  sw: { x: -LOOP_HALF, z: LOOP_HALF, yaw: Math.PI / 4, pitch: 0 },
  courtyard: { ...onSide('south', 0), yaw: 0, pitch: 0.05 },
};

/**
 * dev_corridor (which took over dev7): the corridor that loops round a
 * 50 m square, the hub of the dev rooms (`src/scene/dev-corridor.ts`), and
 * the courtyard inside it (dev_courtyard, `dev-courtyard-room.ts`), joined
 * so that one walks from one to the other through a door (prompt 009,
 * stage B): one renderer, one camera, one controller, and a scene for each
 * room (each lit only by its own lights), the courtyard drawn after the
 * corridor, with the corridor's depth, while it can be seen: while the
 * player is in it, or its door is open. The courtyard does not fit inside
 * the loop as drawn, so it stands behind whichever inner door is in use
 * (`src/game/courtyard-join.ts`) and is moved behind another, with the
 * player if they are in it, when another is opened (which only ever
 * happens unseen). Only the corridor's zones that can be seen from where
 * the player stands are drawn (`visibleZones`), and the corridor is lit by
 * a few real lights moved to the battens nearest the player in view; the
 * rest only glow. Its spring doors open and swing shut; opening one snaps
 * every other shut at once, silently, so only one is ever open. Its outer
 * doors still go to their rooms, each drawn on its own.
 */
export function startDevCorridorRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  // The corridor, then the courtyard over it, each drawn by hand.
  renderer.autoClear = false;
  renderer.info.autoReset = false;
  renderer.shadowMap.enabled = true;
  const freeEnvironment = useEnvironment(renderer, scene, 0.2);
  renderer.setClearColor('#101213');
  // Far enough for the courtyard's sky.
  const camera = new PerspectiveCamera(62, 1, 0.05, 400 * m);
  scene.add(
    new AmbientLight('#e9ece9', 0.45),
    new HemisphereLight('#f2f2ec', '#55574f', 0.35),
  );
  const kit = createPanelKit();
  /** Where the player is, metres: set each frame, read by the doors. */
  const here = { x: 0, z: 0 };
  const corridor = createDevCorridor(kit);
  corridor.group.scale.setScalar(m);
  scene.add(corridor.group);
  // A few real lights, moved each frame to the battens nearest the player
  // in the zones in view: never more lights, however long the corridor.
  const lights = Array.from({ length: CORRIDOR_LIGHTS }, () => {
    const light = new PointLight('#f4f5ec', 0, 10 * m, 2);
    scene.add(light);
    return light;
  });
  const bounds: Footprint = {
    minX: LOOP_OUTER_BOUNDS.minX * m,
    maxX: LOOP_OUTER_BOUNDS.maxX * m,
    minZ: LOOP_OUTER_BOUNDS.minZ * m,
    maxZ: LOOP_OUTER_BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, LOOP_CEILING * m);

  // ---- The courtyard, behind an inner door --------------------------------
  const courtyard = createDevCourtyardRoom(renderer, kit, m);
  courtyard.place(anchor('south'));
  const innerDoors = new Map(
    corridor.doors
      .filter((d) => d.door.wall === 'inner')
      .map((d) => [d.door.side, d] as const),
  );
  /** The corridor's door to the courtyard where it stands now. */
  const joined = () => innerDoors.get(courtyard.placed.side)!;
  /** What the player walks into: the corridor's and the courtyard's walls. */
  const solids = () => {
    const open = joined().part.door.open ? courtyard.placed.side : null;
    return [
      ...outer,
      ...joinedWalls(courtyard.placed, open).map((w) => ({
        minX: w.minX * m,
        maxX: w.maxX * m,
        minZ: w.minZ * m,
        maxZ: w.maxZ * m,
      })),
    ];
  };
  /** Which rooms are drawn this frame. */
  const drawn = { corridor: true, courtyard: false };
  const portals = createPortals(
    'dev_corridor',
    devPortals('dev_corridor', bounds, m),
    0,
    m,
  );
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usable = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const groups: Object3D[] = [];
    if (drawn.corridor) groups.push(portals.group, corridor.group);
    if (drawn.courtyard) groups.push(courtyard.root);
    // Only what is shown: not the corridor's hidden zones, nor the
    // courtyard's door where the corridor's stands.
    const shown = (o: Object3D) => {
      for (let p: Object3D | null = o; p; p = p.parent)
        if (!p.visible) return false;
      return true;
    };
    const hit = raycaster
      .intersectObjects(groups, true)
      .find((h) => h.object.name !== 'sky' && shown(h.object));
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use =
        portals.uses.get(o as Mesh) ??
        corridor.parts.uses.get(o) ??
        courtyard.parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  /** Where to stand having come from `previous`: in front of its door. */
  const arrival = (previous: string | null) => {
    const door = corridor.doors.find((d) => d.room === previous);
    if (!door) return null;
    const at = arrivalAt(door.door);
    return { ...at, x: at.x * m, z: at.z * m };
  };
  const params = new URLSearchParams(location.search);
  const pose = (name: string | null) => {
    const view = CORRIDOR_VIEWS[name ?? ''];
    return view && { ...view, x: view.x * m, z: view.z * m };
  };
  /** A pose in the courtyard's frame, metres, where it stands now. */
  const inYard = (view: {
    x: number;
    z: number;
    yaw: number;
    pitch: number;
  }) => {
    const at = toWorld(courtyard.placed, view.x, view.z);
    return {
      x: at.x * m,
      z: at.z * m,
      yaw: view.yaw - courtyard.placed.yaw,
      pitch: view.pitch,
    };
  };
  const yardPose = (name: string | null) => {
    const view = COURTYARD_VIEWS[name ?? ''];
    return view && inYard(view);
  };
  const startRoom = new URLSearchParams(location.search).get('room');
  const startPose = (name: string | null) =>
    startRoom === 'dev_courtyard'
      ? (yardPose(name) ?? yardPose('start')!)
      : pose(name);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      startPose(params.get('view')) ??
      arrival(params.get('from')) ??
      pose('start')!,
    solids,
    use: (x, y) => usable(x, y)?.(),
    aimed: () => Boolean(usable(0, 0)),
  });

  /**
   * Show only the zones in view from (x, z), metres; from the courtyard,
   * those in view from its door.
   */
  let shown = '';
  /** The zones in view last frame. */
  let inView = visibleZones(0, 0);
  const showZones = (x: number, z: number) => {
    const seen = visibleZones(x, z);
    inView = seen;
    if (!drawn.corridor) return seen;
    const key = [...seen].sort().join();
    if (key === shown) return seen;
    shown = key;
    for (const id of LOOP_ZONES)
      corridor.zones.get(id)!.group.visible = seen.has(id);
    return seen;
  };
  /** Light the battens nearest (x, z) in the zones in view. */
  const fittings = corridor.fittings.map((f) => ({
    ...f,
    zone: zoneAt(f.x, f.z) ?? 'north.middle',
  }));
  const placeLights = (x: number, z: number, seen: Set<string>) => {
    const near = fittings
      .filter((f) => seen.has(f.zone))
      .sort(
        (p, q) => Math.hypot(p.x - x, p.z - z) - Math.hypot(q.x - x, q.z - z),
      )
      .slice(0, lights.length);
    lights.forEach((light, i) => {
      const f = near[i];
      light.intensity = f ? 3 * m * m : 0;
      if (f) light.position.set(f.x * m, (LOOP_CEILING - 0.15) * m, f.z * m);
    });
  };

  /**
   * Walking through an open outer door goes to its dev room. Each is a
   * joint (`registerJoint`): while the app draws the room beyond
   * underneath, seen through the doorway (`see`), the door is walked
   * through, over its threshold, and the room takes over without a break;
   * otherwise it goes on reaching the doorway, the room drawn on its own.
   * The inner doors are walked through into the courtyard.
   */
  let leaving = false;
  const outerDoors = corridor.doors
    .filter((d) => d.door.wall === 'outer' && d.room)
    .map((d) => {
      const found: Object3D[] = [];
      d.part.object.traverse((o) => {
        if (o.userData.live) found.push(o);
      });
      const leaf: Object3D | null = found[0] ?? null;
      return { ...d, room: d.room!, leaf, seeing: false, was: -Infinity };
    });
  const withdrawJoints = outerDoors.map((d) => {
    const way = doorway(d.door);
    return registerJoint('dev_corridor', d.room, {
      frame: { x: way.x * m, z: way.z * m, yaw: d.yaw },
      open: () => d.part.door.open,
      angle: () => d.part.door.angle,
      swingTo: (angle) => d.part.door.swingTo(angle),
      opening: () => {
        // Through the outer wall and well beyond, the doorway's width.
        const across = { x: Math.abs(way.out.z), z: Math.abs(way.out.x) };
        const ends = [-0.4, 3].map((k) => ({
          x: way.x + way.out.x * k,
          z: way.z + way.out.z * k,
        }));
        return {
          minX: (Math.min(ends[0].x, ends[1].x) - across.x * 0.5) * m,
          maxX: (Math.max(ends[0].x, ends[1].x) + across.x * 0.5) * m,
          minZ: (Math.min(ends[0].z, ends[1].z) - across.z * 0.5) * m,
          maxZ: (Math.max(ends[0].z, ends[1].z) + across.z * 0.5) * m,
        };
      },
      see: (on) => {
        d.seeing = on;
        if (d.lobby) d.lobby.visible = !on;
        if (d.hole) d.hole.visible = on;
      },
      peek: (on) => {
        if (d.leaf) d.leaf.visible = !on;
        if (d.lobby) d.lobby.visible = !on && !d.seeing;
      },
    });
  });
  const goThrough = (x: number, z: number) => {
    for (const d of outerDoors) {
      const way = doorway(d.door);
      // How far out through the doorway, metres, and how far to one side.
      const out = (x - way.x) * way.out.x + (z - way.z) * way.out.z;
      const aside = Math.abs((x - way.x) * way.out.z - (z - way.z) * way.out.x);
      const was = d.was;
      d.was = out;
      const inDoorway = aside <= 0.5 && out >= -0.6 && out <= 0.6;
      d.part.hold(inDoorway && d.part.door.open);
      if (leaving || !d.part.door.open) continue;
      if (d.seeing) {
        if (aside <= 0.5 && was < 0 && out >= 0) {
          leaving = true;
          enterDevRoom(d.room, 'dev_corridor', true);
          return;
        }
      } else if (walkedThrough(d.door, x, z)) {
        leaving = true;
        enterDevRoom(d.room, 'dev_corridor');
        return;
      }
    }
  };

  /** Move the courtyard behind the corridor's inner door on `side`. */
  const moveCourtyard = (side: LoopSide) => {
    const from = courtyard.placed;
    const to: Anchor = anchor(side);
    if (inCourtyard(from, here.x, here.z)) {
      // With the player in it, so nothing they can see changes.
      const w = walk.walker;
      const p = carry(from, to, { x: here.x, z: here.z, yaw: w.yaw });
      w.x = p.x * m;
      w.z = p.z * m;
      w.yaw = p.yaw;
      here.x = p.x;
      here.z = p.z;
    }
    courtyard.place(to);
  };
  /**
   * The doors between the rooms. An inner door opened elsewhere brings
   * the courtyard behind it (unseen: every other door snaps shut). One of
   * the courtyard's own doors opened brings the courtyard, and the player
   * in it, behind that side's inner door, and opens that instead, into
   * the courtyard, towards them: it is the door between the two.
   */
  const courtyardDoors = () => {
    for (const d of courtyard.doors) {
      if (d.side === courtyard.placed.side || !d.part.door.open) continue;
      moveCourtyard(d.side);
      innerDoors.get(d.side)!.part.door.push(1);
      return;
    }
    for (const [side, d] of innerDoors)
      if (side !== courtyard.placed.side && d.part.door.open) {
        moveCourtyard(side);
        return;
      }
  };

  /** Only one door open at a time: opening one snaps every other shut. */
  const allDoors = [...corridor.doors, ...courtyard.doors];
  const wasOpen = new Set<(typeof allDoors)[number]>();
  const oneDoorOpen = () => {
    for (const d of allDoors) {
      const open = d.part.door.open;
      if (open && !wasOpen.has(d)) {
        for (const other of allDoors)
          if (other !== d && other.part.door.open) {
            other.part.door.snapShut();
            wasOpen.delete(other);
          }
        wasOpen.add(d);
      } else if (!open) wasOpen.delete(d);
    }
  };

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  let last = 0;
  const frame = (time: number) => {
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    here.x = walk.walker.x / m;
    here.z = walk.walker.z / m;
    courtyardDoors();
    oneDoorOpen();
    const placed = courtyard.placed;
    // Its door is held open while the player passes through it.
    joined().part.hold(inJoinedDoorway(placed, here.x, here.z));
    corridor.parts.update(delta);
    courtyard.update(delta, time / 1000, camera);
    const inside = !walk.following && inCourtyard(placed, here.x, here.z);
    const through = joined().part.door.open;
    drawn.corridor = !inside || through;
    drawn.courtyard = inside || through;
    // From the courtyard, the corridor is seen as from its door; seen
    // through another room's door, from the eye carried through it.
    const d = doorway({ side: placed.side, t: 0, wall: 'inner' });
    const [vx, vz] = walk.following
      ? [camera.position.x / m, camera.position.z / m]
      : inside
        ? [d.x - d.out.x * 0.5, d.z - d.out.z * 0.5]
        : [here.x, here.z];
    const seen = showZones(vx, vz);
    placeLights(vx, vz, seen);
    goThrough(here.x, here.z);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.info.reset();
    renderer.clear();
    if (drawn.corridor) renderer.render(scene, camera);
    if (drawn.courtyard) renderer.render(courtyard.scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });

  (window as unknown as { devCorridor: unknown }).devCorridor = {
    /** Which rooms are drawn, and which door the courtyard is behind. */
    where: () => ({
      ...drawn,
      inCourtyard: inCourtyard(courtyard.placed, here.x, here.z),
      courtyardBehind: courtyard.placed.side,
    }),
    /** Stand at a named view: start, a to d, nw, ne, se, sw, courtyard. */
    view(name: string) {
      const p = pose(name);
      if (p) walk.place(p.x, p.z, p.yaw, p.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** The zones drawn from where the player stands. */
    zones: () => [...inView],
    /** The doors: each one's room, and whether it is open. */
    doors: () =>
      corridor.doors.map((d) => ({
        room: d.room,
        side: d.door.side,
        t: d.door.t,
        open: d.part.door.open,
      })),
    /** Push door `n` (in `doors()` order) open. */
    open(n: number) {
      corridor.doors[n]?.part.door.push(1);
    },
    /** A frame's draw calls and triangles, both rooms'. */
    stats: () => ({ ...renderer.info.render }),
    /**
     * Run `seconds` of frames at once (where the browser is not drawing,
     * as in a hidden tab) and give the last as a PNG data URL.
     */
    shot(seconds = 0, width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      let time = last || 1000;
      for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
      const url = canvas.toDataURL('image/png');
      resize();
      return url;
    },
  };

  (window as unknown as { devCourtyard: unknown }).devCourtyard = {
    ...courtyard.hooks,
    /** Stand at a named view in the courtyard: start, up, smoking, pedestal. */
    view(name: string) {
      const p = yardPose(name);
      if (p) walk.place(p.x, p.z, p.yaw, p.pitch);
    },
    /** Stand at (x, z) in the courtyard's own frame, metres. */
    place(x: number, z: number, yaw = 0, pitch = 0) {
      const p = inYard({ x, z, yaw, pitch });
      walk.place(p.x, p.z, p.yaw, p.pitch);
    },
    /**
     * Push open its door to the corridor's `side` from inside, as a use
     * would (the corridor's own door, where it stands behind that one).
     */
    open(side: LoopSide) {
      if (side === courtyard.placed.side)
        innerDoors.get(side)!.part.door.push(1);
      else courtyard.doors.find((d) => d.side === side)?.part.door.push(-1);
    },
    stats: () => ({ ...renderer.info.render }),
    shot: (seconds = 0, width = 1280, height = 720) =>
      (
        window as unknown as {
          devCorridor: { shot(s: number, w: number, h: number): string };
        }
      ).devCorridor.shot(seconds, width, height),
  };

  const dispose = () => {
    for (const w of withdrawJoints) w();
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    corridor.parts.dispose();
    courtyard.dispose();
    disposeKit(kit, scene as unknown as Group);
    disposeKit(kit, courtyard.scene as unknown as Group);
    for (const each of [scene, courtyard.scene])
      each.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devCorridor?: unknown }).devCorridor;
    delete (window as unknown as { devCourtyard?: unknown }).devCourtyard;
  };
  return Object.assign(dispose, {
    /**
     * Arrive from room `previous`, or (`room` dev_courtyard, as `?room=`
     * asks) in the courtyard.
     */
    enter(previous: string | null, room?: string) {
      leaving = false;
      const name = new URLSearchParams(location.search).get('view');
      const view =
        room === 'dev_courtyard'
          ? (yardPose(name) ?? yardPose('start'))
          : pose(name);
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      // Back through a door: it is shut behind the player now.
      for (const d of allDoors) d.part.door.snapShut();
      for (const d of outerDoors) d.was = -Infinity;
      const at = arrival(previous);
      if (at) walk.place(at.x, at.z, at.yaw, at.pitch);
    },
    suspend() {
      corridor.parts.setAudible(false);
      courtyard.parts.setAudible(false);
    },
    resume() {
      corridor.parts.setAudible(true);
      courtyard.parts.setAudible(true);
    },
  });
}
