import './styles/main.css';
import { Plane, Vector3 } from 'three';
import {
  EQUIPMENT_ROOMS,
  ROOMS,
  resolveRoomId,
} from './toolkit/gallery/logic/dev-room-links';
import type {
  EquipmentRoomId,
  RoomId,
} from './toolkit/gallery/logic/dev-room-links';
import {
  jointOf,
  openJoint,
  throughDoor,
} from './toolkit/gallery/logic/door-joins';
import { firstPersonOn } from './toolkit/controls/input/first-person';
import { rendererOn } from './toolkit/components/core/parts/render-style';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Scene canvas is missing.');
const directory = document.querySelector<HTMLElement>('#room-index');
const app = document.querySelector<HTMLElement>('#app');
if (!directory || !app) throw new Error('Room page is incomplete.');

const showError = (error: unknown) => {
  const message = document.querySelector<HTMLParagraphElement>('#error');
  if (message) {
    message.hidden = false;
    message.textContent =
      'The game could not start. Please use a browser with WebGL 2 enabled.';
  }
  console.error(error);
};

// Rooms retain their apparatus state while only the current room draws.
type RoomHandle = (() => void) & {
  enter?: (from: string | null, room: string) => void;
  suspend?: () => void;
  resume?: () => void;
};
const rooms = new Map<string, { root: HTMLElement; handle: RoomHandle }>();
let current: string | undefined;
let revision = 0;
const resetEffects = async () => {
  const { ps1Uniforms } =
    await import('./toolkit/components/core/parts/ps1-material');
  ps1Uniforms.roomLight.value = 1;
  ps1Uniforms.plantLight.value = 1;
  ps1Uniforms.channels.value.set(1, 1, 1);
  ps1Uniforms.warp.value = 0;
  ps1Uniforms.warpField.value.set(0, 0, 0, 0);
  ps1Uniforms.precision.value.set(0, 0, 0);
  ps1Uniforms.pi.value = Math.PI;
  ps1Uniforms.linearTarget.value = 0;
};
/** The function that starts `room`, loaded on demand. */
const starter = async (
  room: RoomId,
): Promise<(canvas: HTMLCanvasElement) => RoomHandle> => {
  if (room === 'facility') {
    const { startFacilityWorld } = await import('./rendering/facility-world');
    return (surface) => {
      const hud = document.createElement('p');
      hud.className = 'room-name';
      hud.setAttribute('aria-live', 'polite');
      surface.parentElement?.append(hud);
      return startFacilityWorld(surface, hud);
    };
  }
  if (room === 'dev_corridor' || room === 'dev_courtyard')
    // One world: the courtyard is walked into from the corridor.
    return (await import('./rendering/dev-corridor-room')).startDevCorridorRoom;
  if (room === 'dev1')
    return (await import('./toolkit/gallery/rooms/racks-room')).startRacksRoom;
  if (room === 'dev2')
    return (await import('./toolkit/gallery/rooms/fittings-room'))
      .startFittingsRoom;
  if (room === 'dev3')
    return (await import('./toolkit/gallery/rooms/architectural-room'))
      .startArchitecturalGalleryRoom;
  if (room === 'dev4')
    return (await import('./toolkit/gallery/rooms/repair-room'))
      .startRepairRoom;
  if (room === 'dev5')
    return (await import('./toolkit/gallery/rooms/bin-room')).startBinRoom;
  if (room === 'dev6')
    return (await import('./toolkit/gallery/rooms/settling-room'))
      .startSettlingRoom;
  if (room === 'dev7')
    return (await import('./toolkit/gallery/rooms/tones-room')).startTonesRoom;
  if (room === 'dev8')
    return (await import('./toolkit/gallery/rooms/brands-room'))
      .startBrandsRoom;
  if (room === 'dev9')
    return (await import('./toolkit/gallery/rooms/fires-room')).startFiresRoom;
  if (room === 'dev11')
    return (await import('./toolkit/gallery/rooms/pool-room')).startPoolRoom;
  if (room === 'dev10' || room === 'dev12') {
    const { startEquipmentRoom } =
      await import('./toolkit/gallery/rooms/plant-room');
    return (surface) => startEquipmentRoom(surface, room);
  }
  if (EQUIPMENT_ROOMS.includes(room as EquipmentRoomId)) {
    const { startEquipmentRoom } =
      await import('./toolkit/gallery/rooms/plant-room');
    return (surface) => startEquipmentRoom(surface, room as EquipmentRoomId);
  }
  return (await import('./toolkit/gallery/rooms/controls-room'))
    .startControlsRoom;
};
/** The corridor and the courtyard are one world, kept as one. */
const keyOf = (room: RoomId) =>
  room === 'dev_courtyard' ? 'dev_corridor' : room;
/** Build `room` on a canvas of its own, hidden, if it is not built yet. */
const mount = (
  room: RoomId,
  start: (canvas: HTMLCanvasElement) => RoomHandle,
) => {
  const key = keyOf(room);
  let loaded = rooms.get(key);
  if (loaded) return loaded;
  const root = document.createElement('section');
  root.setAttribute('aria-label', `Room ${room}`);
  Object.assign(root.style, { position: 'absolute', inset: '0' });
  root.hidden = true;
  const surface = canvas.cloneNode() as HTMLCanvasElement;
  surface.id = `scene-${key}`;
  surface.hidden = false;
  surface.style.display = 'block';
  surface.setAttribute('aria-label', `Room ${room}`);
  canvas.parentElement!.append(root);
  root.append(surface);
  canvas.hidden = true;
  canvas.style.display = 'none';
  canvas.id = 'scene-template';
  loaded = { root, handle: start(surface) };
  rooms.set(key, loaded);
  return loaded;
};
const surfaceOf = (key: string) =>
  rooms.get(key)?.root.querySelector('canvas') ?? null;

const openRoom = async () => {
  const ownRevision = ++revision;
  const params = new URLSearchParams(location.search);
  if (!params.has('room')) {
    if (document.pointerLockElement) document.exitPointerLock();
    window.dispatchEvent(new Event('blur'));
    stopSeeing();
    if (current) {
      const old = rooms.get(current);
      old?.handle.suspend?.();
      if (old) old.root.hidden = true;
    }
    current = undefined;
    app.hidden = true;
    directory.hidden = false;
    document.title = 'Pool Plant — Rooms';
    return;
  }
  const room = resolveRoomId(params.get('room')) ?? 'facility';
  const start = await starter(room);
  await resetEffects();
  if (ownRevision !== revision) return;
  directory.hidden = true;
  app.hidden = false;
  document.title = 'Pool Plant';
  if (document.pointerLockElement) document.exitPointerLock();
  window.dispatchEvent(new Event('blur'));
  stopSeeing();
  if (current) {
    const old = rooms.get(current)!;
    old.handle.suspend?.();
    old.root.hidden = true;
  }
  const key = keyOf(room);
  current = key;
  const loaded = mount(room, start);
  showOnTop(key);
  loaded.root.hidden = false;
  loaded.handle.enter?.(params.get('from'), room);
  loaded.handle.resume?.();
};
// ---- Seeing through a doorway into another room --------------------------
// Each room is drawn by its own renderer on its own canvas. While a door
// from the room shown to another room is open (`openJoint`), that room is
// built if need be and drawn on its canvas underneath, its camera carried
// through the doorway (`throughDoor`) so it is seen as if the two rooms
// were one, cut off at its doorway's plane; the room on top draws its
// doorway as nothing at all, so the room underneath shows through it, and
// cuts the doorway through its walls so it can be walked through. Walking
// over the threshold hands over (`handOver`): the room beyond comes on top,
// its eye where the walker's was, its door where the other was, and the
// room left behind is drawn underneath in its turn.
const zOf = (key: string, z: string) => {
  const entry = rooms.get(key);
  if (entry) entry.root.style.zIndex = z;
};
const showOnTop = (key: string) => {
  for (const [id, entry] of rooms) {
    entry.root.hidden = id !== key;
    entry.root.style.zIndex = id === key ? '1' : '';
    entry.root.style.pointerEvents = '';
    const surface = entry.root.querySelector('canvas');
    if (surface) surface.id = id === key ? 'scene' : `scene-${id}`;
  }
};
let seeing: { top: RoomId; under: RoomId } | null = null;
const loading = new Set<string>();
const stopSeeing = (hide = true) => {
  if (!seeing) return;
  const { top, under } = seeing;
  seeing = null;
  const topSurface = surfaceOf(keyOf(top));
  const underSurface = surfaceOf(keyOf(under));
  jointOf(top, under)?.see(false);
  jointOf(under, top)?.peek(false);
  const topWalk = topSurface && firstPersonOn(topSurface);
  if (topWalk) topWalk.openings = () => [];
  const topDraw = topSurface && rendererOn(topSurface);
  if (topDraw) topDraw.after = null;
  const underDraw = underSurface && rendererOn(underSurface);
  if (underDraw) {
    underDraw.paused = false;
    underDraw.renderer.clippingPlanes = [];
  }
  const underWalk = underSurface && firstPersonOn(underSurface);
  underWalk?.follow(null);
  const entry = rooms.get(keyOf(under));
  if (entry && hide) {
    entry.root.hidden = true;
    entry.root.style.zIndex = '';
    entry.root.style.pointerEvents = '';
  }
};
const startSeeing = (top: RoomId, under: RoomId) => {
  const topSurface = surfaceOf(keyOf(top));
  const underSurface = surfaceOf(keyOf(under));
  const near = jointOf(top, under);
  const far = jointOf(under, top);
  if (!topSurface || !underSurface || !near || !far) return false;
  const topWalk = firstPersonOn(topSurface);
  const underWalk = firstPersonOn(underSurface);
  const topDraw = rendererOn(topSurface);
  const underDraw = rendererOn(underSurface);
  if (!topWalk || !underWalk || !topDraw || !underDraw) return false;
  const entry = rooms.get(keyOf(under))!;
  entry.handle.suspend?.();
  entry.root.hidden = false;
  entry.root.style.zIndex = '0';
  entry.root.style.pointerEvents = 'none';
  zOf(keyOf(top), '1');
  // Its eye carried through the doorway, each frame, as the walker moves.
  underWalk.follow(() => {
    const eye = topWalk.pose();
    const there = throughDoor(near.frame, far.frame, eye);
    return { ...eye, ...there };
  });
  // Cut off at its doorway: nothing of it on this side is seen.
  const inward = new Vector3(
    Math.sin(far.frame.yaw),
    0,
    Math.cos(far.frame.yaw),
  );
  underDraw.renderer.clippingPlanes = [
    new Plane().setFromNormalAndCoplanarPoint(
      inward,
      new Vector3(far.frame.x, 0, far.frame.z),
    ),
  ];
  // Drawn just after the room on top, with its eye as it is this frame.
  underDraw.paused = true;
  topDraw.after = (time) => underDraw.loop?.(time);
  near.see(true);
  far.peek(true);
  topWalk.openings = () => [near.opening()];
  seeing = { top, under };
  return true;
};
const checkDoors = () => {
  if (!current || app.hidden) return stopSeeing();
  const top = current as RoomId;
  const to = openJoint(top);
  if (seeing && (seeing.top !== top || seeing.under !== to)) stopSeeing();
  if (!to || seeing) return;
  if (!rooms.has(keyOf(to))) {
    // Built the first time its door is opened; meanwhile, a dark lobby.
    if (loading.has(to)) return;
    loading.add(to);
    void starter(to)
      .then((start) => mount(to, start))
      .catch(showError)
      .finally(() => loading.delete(to));
    return;
  }
  startSeeing(top, to);
};
const watchDoors = () => {
  requestAnimationFrame(watchDoors);
  checkDoors();
};
requestAnimationFrame(watchDoors);
/** Walked through from `from` into `to`, seen through: hand over at once. */
const handOver = (to: RoomId, from: RoomId) => {
  if (!seeing || seeing.top !== from || seeing.under !== to) return false;
  const near = jointOf(from, to);
  const far = jointOf(to, from);
  const fromSurface = surfaceOf(keyOf(from));
  const toSurface = surfaceOf(keyOf(to));
  const fromWalk = fromSurface && firstPersonOn(fromSurface);
  const toWalk = toSurface && firstPersonOn(toSurface);
  const entry = rooms.get(keyOf(to));
  if (!near || !far || !fromWalk || !toWalk || !entry) return false;
  const eye = fromWalk.pose();
  const there = throughDoor(near.frame, far.frame, eye);
  const angle = near.angle();
  stopSeeing(false);
  rooms.get(keyOf(from))?.handle.suspend?.();
  current = keyOf(to);
  showOnTop(keyOf(to));
  entry.handle.enter?.(from, to);
  // Where the walker was, as the doorway carries it, the door with it.
  toWalk.place(there.x, there.z, there.yaw, eye.pitch, eye.y);
  far.swingTo(-angle);
  entry.handle.resume?.();
  // The room left behind is drawn underneath from the next frame.
  startSeeing(to, from);
  return true;
};
const travel = (event: Event) => {
  const { to, from, through } = (
    event as CustomEvent<{ to: string; from: string; through?: boolean }>
  ).detail;
  if (!ROOMS.includes(to as RoomId)) return;
  const url = new URL(location.href);
  url.search = '';
  url.searchParams.set('room', to);
  url.searchParams.set('from', from);
  history.pushState(null, '', url);
  if (through && handOver(to as RoomId, from as RoomId)) return;
  void openRoom().catch(showError);
};
const popstate = () => {
  void openRoom().catch(showError);
};
// Development only, binding no input: run `seconds` of the current room's
// frames (where the browser is not drawing, as in a hidden tab) and give
// the last as a PNG data URL.
let shotClock = 1e6;
(window as unknown as { devShot: unknown }).devShot = (seconds = 0) => {
  const shown = () =>
    current ? (rooms.get(current)?.root.querySelector('canvas') ?? null) : null;
  let surface = shown();
  let entry = surface ? rendererOn(surface) : null;
  if (!entry?.loop) return null;
  for (let t = 0; t <= seconds; t += 1 / 30) {
    const time = (shotClock += 1000 / 30);
    checkDoors();
    entry.loop?.(time);
    entry.after?.(time);
    // A doorway walked through hands over to the room beyond.
    const now = shown();
    if (now && now !== surface) {
      surface = now;
      entry = rendererOn(surface) ?? entry;
    }
  }
  // The room seen through a doorway, under the room on top.
  const under = seeing ? surfaceOf(keyOf(seeing.under)) : null;
  const picture = document.createElement('canvas');
  picture.width = surface!.width;
  picture.height = surface!.height;
  const context = picture.getContext('2d')!;
  if (under) context.drawImage(under, 0, 0, picture.width, picture.height);
  context.drawImage(surface!, 0, 0);
  return picture.toDataURL('image/png');
};
// Development only: which room is seen through which doorway, and how.
(window as unknown as { devSeeing: unknown }).devSeeing = () => {
  if (!seeing) return null;
  const under = surfaceOf(keyOf(seeing.under));
  const draw = under && rendererOn(under);
  return {
    ...seeing,
    planes: draw?.renderer.clippingPlanes.map((p) => [
      ...p.normal.toArray(),
      p.constant,
    ]),
    paused: draw?.paused,
  };
};
window.addEventListener('dev-room', travel);
window.addEventListener('popstate', popstate);
void openRoom().catch(showError);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    revision++;
    for (const entry of rooms.values()) {
      entry.handle();
      entry.root.remove();
    }
    canvas.hidden = false;
    canvas.style.display = 'block';
    canvas.id = 'scene';
    window.removeEventListener('dev-room', travel);
    window.removeEventListener('popstate', popstate);
  });
