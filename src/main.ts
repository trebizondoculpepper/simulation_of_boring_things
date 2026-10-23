import './styles/main.css';
import { Plane, Vector3 } from 'three';
import {
  EQUIPMENT_ROOMS,
  DEV_ROOM_NAMES,
  ROOMS,
  resolveRoomId,
} from './toolkit/gallery/logic/dev-room-links';
import type {
  EquipmentRoomId,
  RoomId,
} from './toolkit/gallery/logic/dev-room-links';
import {
  jointOf,
  lazyNeighbours,
  openDoorJoint,
  nearestJoint,
  openJoint,
  throughDoor,
} from './toolkit/gallery/logic/door-joins';
import { firstPersonOn } from './toolkit/controls/input/first-person';
import { paused } from './toolkit/controls/logic/paused';
import { renderScale } from './toolkit/settings/logic/settings';
import { METRE } from './toolkit/components/core/logic/units';
import {
  inertClip,
  rendererOn,
} from './toolkit/components/core/parts/render-style';
import { worldStore } from './toolkit/save/world-store';
import { GAS_ZONE_IDS } from './game/plant/gas';
import type { PoolId } from './game/plant/pools';
import { buildLine, versionLabel } from './game/version';
import { createTitleScreen } from './toolkit/title/title-screen';
import { OLYMPIC_ORBIT, orbitPose } from './toolkit/title/logic/title-orbit';
import { GEAR_ICON, createPauseMenu } from './toolkit/settings/pause-menu';
import { settings } from './toolkit/settings/settings-store';
import { effect } from '@preact/signals-core';
import { partAudio } from './toolkit/components/core/audio/part-audio';
import { renderPlantManual } from './toolkit/manual/plant-manual';

// Which build this is, until the title screen shows it.
console.info(`Pool Plant ${versionLabel()}`);

// Scenarios, several at once (`?scenario=cold,ozone-leak`). A cold start
// (`cold`): the whole plant off as the game starts,
// FULL OFF, so every room is dark but for daylight, and the torch (F) the
// only light.
const scenarios = (new URLSearchParams(location.search).get('scenario') ?? '')
  .split(',')
  .filter(Boolean);
for (const scenario of scenarios) {
  const world = worldStore('dev');
  if (scenario === 'cold') world.dispatch({ type: 'plant/full-off' });
  // Gas leaks, for trying the gas detection (`game/plant/gas.ts`): acid
  // delivered into the hypochlorite, a weeping hypochlorite fitting, and
  // a leaking ozone generator in the Olympic pool's plant room. `?scenario=
  // gas-clear` stops them, though the air takes its time to clear.
  if (scenario === 'misdelivery')
    world.dispatch({ type: 'gas/act', zone: 'hypo_store', act: 'misdeliver' });
  if (scenario === 'chlorine-leak')
    world.dispatch({ type: 'gas/leak', zone: 'hypo_store', gramsPerHour: 2 });
  if (scenario === 'ozone-leak')
    world.dispatch({
      type: 'gas/leak',
      zone: 'plant_pool_02',
      gramsPerHour: 2,
    });
  // `drain-pool_01`: a pool drained down (its make-up shut, its drain-down
  // open), to the sewer at the consented rate; with `skip-…` to see it part
  // drained or empty. `fill-pool_01` shuts the drain-down and opens the make-up.
  const drain = /^(drain|fill)-(pool_0[1-4])$/.exec(scenario);
  if (drain) {
    const pool = drain[2] as PoolId;
    const draining = drain[1] === 'drain';
    world.dispatch({ type: 'pool/make-up', pool, open: !draining });
    world.dispatch({ type: 'pool/drain-down', pool, open: draining });
  }
  // `skip-600`: the world run on ten minutes at once.
  const skip = /^skip-(\d+)$/.exec(scenario);
  if (skip) world.dispatch({ type: 'time/skip', seconds: Number(skip[1]) });
  if (scenario === 'gas-clear')
    for (const zone of GAS_ZONE_IDS)
      world.dispatch({ type: 'gas/leak', zone, gramsPerHour: 0 });
}

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Scene canvas is missing.');
const directory = document.querySelector<HTMLElement>('#room-index');
const directoryShell =
  directory?.querySelector<HTMLElement>('.directory-shell');
const app = document.querySelector<HTMLElement>('#app');
if (!directory || !directoryShell || !app)
  throw new Error('Room page is incomplete.');

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
  setDryOnly?: (enabled: boolean) => void;
  setVisual?: (enabled: boolean) => void;
};
const rooms = new Map<string, { root: HTMLElement; handle: RoomHandle }>();
let current: string | undefined;
let revision = 0;
const positionOverlay = document.createElement('div');
positionOverlay.className = 'pool-settings-copy';
positionOverlay.classList.add('location-overlay');
const roomName = document.createElement('span');
const positionButton = document.createElement('button');
positionButton.type = 'button';
positionButton.textContent = '📍';
positionButton.title = 'Copy a link to this view';
positionButton.setAttribute('aria-label', 'Copy a link to this view');
positionButton.className = 'location-pin-button';
// The player's settings that are the app's to apply: the master volume,
// and whether the on-screen controls are shown. (Look, field of view and
// graphics quality are applied where they are used.)
effect(() => {
  const s = settings.value;
  partAudio.setVolume(s.volume);
  document.body.classList.toggle('hide-onscreen-controls', !s.onScreenControls);
});
// The pause menu: Esc once the mouse is free, a gamepad's Start, or the
// gear among each room's view tools. The world saves itself as it runs
// (Minecraft's way); Save is for reassurance, and Quit to Title saves first.
// Until the title screen exists, the title is the room list.
const pauseMenu = createPauseMenu({
  save: () => worldStore('dev').save(),
  holding: worldStore('dev').holding,
  quitToTitle() {
    worldStore('dev').save();
    goTo('');
  },
  // Not on the title screen or the room list: only in a room.
  canOpen: () => current !== undefined,
  devPanel: () => goTo('?dev'),
});
const settingsButton = document.createElement('button');
settingsButton.type = 'button';
settingsButton.className = 'hud-button hud-settings';
settingsButton.innerHTML = GEAR_ICON;
settingsButton.title = 'Menu (Esc)';
settingsButton.setAttribute('aria-label', 'Menu');
settingsButton.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
settingsButton.addEventListener('click', () => pauseMenu.open());

/** Go to a page of the app (`?room=…`, `?dev`, or '' for the title) without reloading. */
const goTo = (search: string) => {
  const url = new URL(location.href);
  url.search = search;
  history.pushState(null, '', url);
  void openRoom().catch(showError);
};

// The title screen (`doc/plans/title-screen.md`), the front page; the
// developers' room list is at `?dev`. New game starts in the footbath (for
// now in the shared world: the game's own save is stage 5); Continue
// waits for that save. Settings and Instructions are the pause menu's
// tabs, opened without its Game tab.
const titleScreen = createTitleScreen({
  newGame: () => goTo('?room=pool_04'),
  continueGame: () => {},
  canContinue: () => false,
  noContinue: 'Continue arrives with the game’s own save',
  settings: () => pauseMenu.open('Graphics', { inGame: false }),
  instructions: () => pauseMenu.open('Controls', { inGame: false }),
  covered: () => pauseMenu.isOpen,
  build: buildLine(),
});
const positionStatus = document.createElement('span');
positionStatus.setAttribute('role', 'status');
positionOverlay.append(roomName, positionStatus);
positionOverlay.hidden = true;
document.body.append(positionOverlay);
positionButton.addEventListener('click', async () => {
  const id = resolveRoomId(new URLSearchParams(location.search).get('room'));
  const surface = current ? surfaceOf(current) : null;
  const control = surface ? firstPersonOn(surface) : null;
  if (!id || !control) {
    positionStatus.textContent = 'Position unavailable in this view';
    return;
  }
  const { metre } = control;
  const pose = control.pose();
  const degrees = ((((pose.yaw * 180) / Math.PI) % 360) + 360) % 360;
  const url = new URL(location.href);
  url.search = new URLSearchParams({
    room: id,
    x: (pose.x / metre).toFixed(2),
    y: (pose.y / metre).toFixed(2),
    z: (pose.z / metre).toFixed(2),
    yaw: degrees.toFixed(1),
    pitch: ((pose.pitch * 180) / Math.PI).toFixed(1),
    zoom: control.zoom.toFixed(3),
  }).toString();
  positionButton.disabled = true;
  try {
    await navigator.clipboard.writeText(url.href);
    positionStatus.textContent = 'Link copied';
  } catch {
    positionStatus.textContent =
      'Could not copy. Allow clipboard access and try again.';
  } finally {
    positionButton.disabled = false;
  }
});
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
  if (room === 'CR_A_UP' || room === 'CR_A_ROUND') {
    return (await import('./toolkit/gallery/rooms/dry-stair-room'))
      .startDryStairRoom;
  }
  if (room === 'white_corridor_1')
    return (await import('./toolkit/gallery/rooms/white-corridor-room'))
      .startWhiteCorridorRoom;
  if (room === 'green_room_1')
    return (await import('./toolkit/gallery/rooms/white-corridor-room'))
      .startGreenRoom;
  if (room === 'CR_GREEN_STAIR')
    return (await import('./toolkit/gallery/rooms/white-corridor-room'))
      .startDiamondStairRoom;
  if (room === 'pipes_n_dreams')
    return (await import('./toolkit/gallery/rooms/pipes-n-dreams-room'))
      .startPipesRoom;
  if (
    room === 'plant_room_tiny' ||
    room === 'plant_room_small' ||
    room === 'plant_room_medium' ||
    room === 'plant_room_large'
  ) {
    const { startPlantRoomShell } =
      await import('./toolkit/gallery/rooms/plant-room-shell-room');
    const size = room.replace('plant_room_', '') as
      | 'tiny'
      | 'small'
      | 'medium'
      | 'large';
    return (surface) => startPlantRoomShell(surface, size);
  }
  if (
    room === 'plant_pool_01' ||
    room === 'plant_pool_02' ||
    room === 'plant_pool_03' ||
    room === 'plant_pool_04'
  ) {
    // Each pool hall's own plant room, of the size its door says.
    const [{ startPlantRoomShell }, { POOL_HALLS }] = await Promise.all([
      import('./toolkit/gallery/rooms/plant-room-shell-room'),
      import('./toolkit/gallery/logic/pool-halls'),
    ]);
    const hall = room.replace('plant_', '') as
      | 'pool_01'
      | 'pool_02'
      | 'pool_03'
      | 'pool_04';
    const size = POOL_HALLS[hall].plantDoor!.size;
    return (surface) => startPlantRoomShell(surface, size, hall);
  }
  if (room === 'wet_hall')
    return (await import('./toolkit/gallery/rooms/shell-room')).startWetHall;
  if (
    room === 'boiler_house' ||
    room === 'loading_bay' ||
    room === 'hypo_store' ||
    room === 'acid_store' ||
    room === 'switch_room' ||
    room === 'air_plant' ||
    room === 'control_room' ||
    room === 'engineers_office'
  ) {
    const { startShellRoom } =
      await import('./toolkit/gallery/rooms/shell-room');
    return (surface) => startShellRoom(surface, room);
  }
  if (room === 'main_corridor')
    return (await import('./toolkit/gallery/rooms/main-corridor-room'))
      .startMainCorridorRoom;
  if (room === 'corridor_lab')
    return (await import('./toolkit/gallery/rooms/corridor-lab-room'))
      .startCorridorLabRoom;
  if (room === 'ceiling_lab')
    return (await import('./toolkit/gallery/rooms/ceiling-lab-room'))
      .startCeilingLabRoom;
  if (
    room === 'pool_01' ||
    room === 'pool_02' ||
    room === 'pool_03' ||
    room === 'pool_04'
  ) {
    const { startPoolHallRoom } =
      await import('./toolkit/gallery/rooms/pool-hall-room');
    return (surface) => startPoolHallRoom(surface, room);
  }
  if (room === 'pool_02_gallery') {
    const { startPoolHallRoom } =
      await import('./toolkit/gallery/rooms/pool-hall-room');
    return (surface) =>
      startPoolHallRoom(surface, 'pool_02', { inGallery: true });
  }
  if (room === 'donut_pool_1')
    return (await import('./toolkit/gallery/rooms/donut-pool-room'))
      .startDonutPoolRoom;
  if (room === 'CR_A_ARCH' || room === 'CR_A_STEPS')
    return (await import('./toolkit/gallery/rooms/arched-rooms'))
      .startArchedRooms;
  if (room === 'PR_A') {
    const { startPoolRoom } = await import('./toolkit/gallery/rooms/pool-room');
    return (surface) => startPoolRoom(surface, 'PR_A');
  }
  if (room === 'shared_plant_layout')
    return (await import('./rendering/shared-plant-layout'))
      .startSharedPlantLayout;
  if (room.startsWith('plant_fit_')) {
    const { startPlantFitRoom } = await import('./rendering/plant-fit-room');
    const side = Number(room.slice('plant_fit_'.length));
    return (surface) => startPlantFitRoom(surface, side);
  }
  if (room === 'plant_corridor') {
    return (await import('./rendering/plant-corridor-room'))
      .startPlantCorridorRoom;
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
  if (room === 'dev16')
    return (await import('./toolkit/gallery/rooms/water-room')).startWaterRoom;
  if (room === 'dev11')
    return (await import('./toolkit/gallery/rooms/pool-room')).startPoolRoom;
  if (
    room === 'dev10' ||
    room === 'dev12' ||
    room === 'dev13' ||
    room === 'dev14' ||
    room === 'dev15' ||
    room === 'dev17' ||
    room === 'dev18' ||
    room === 'dev19' ||
    room === 'dev19b' ||
    room === 'dev19c' ||
    room === 'dev19d' ||
    room === 'dev20' ||
    room === 'dev21' ||
    room === 'dev22' ||
    room === 'dev23' ||
    room === 'dev24' ||
    room === 'dev25'
  ) {
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
  room === 'dev_courtyard'
    ? 'dev_corridor'
    : room === 'CR_A_ROUND'
      ? 'CR_A_UP'
      : room === 'CR_A_STEPS'
        ? 'CR_A_ARCH'
        : room;
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

/**
 * A room asked for by another, which needs it running unseen: the
 * security office's monitor, say, which watches dev16's camera. It is
 * built hidden if it is not built yet, and runs what it must while
 * nobody is in it (`pool-plant:run-room`, its detail the room's id).
 */
const runUnseen = async (room: RoomId) => {
  if (rooms.has(keyOf(room))) return;
  const start = await starter(room);
  if (!rooms.has(keyOf(room))) mount(room, start);
};
window.addEventListener('pool-plant:run-room', (event) => {
  const room = resolveRoomId((event as CustomEvent<string>).detail);
  if (room) void runUnseen(room);
});
// ---- The title's backdrop -------------------------------------------------
// Behind the title screen, a room of the game, live, seen from high up
// where the player never goes, at a quarter of the resolution and blurred
// (`doc/plans/title-screen.md`, stage 8: the Olympic hall). The camera
// neither pans nor tilts: it makes a very slow partial orbit about the
// room's middle, simple harmonic motion through an arc of 1° in all,
// 10 seconds to a cycle, always looking at the middle, so the room turns
// gently in depth (the owner's specification). The game is paused under
// it, so the room takes no input and the world's clock stands still.
const TITLE_ROOM: RoomId = 'pool_02';
let titleBackdrop: { stop(): void } | null = null;
const startTitleBackdrop = async () => {
  if (titleBackdrop) return;
  let stopped = false;
  let finish = () => {};
  titleBackdrop = {
    stop() {
      stopped = true;
      finish();
    },
  };
  const start = await starter(TITLE_ROOM);
  if (stopped) return;
  const entry = mount(TITLE_ROOM, start);
  const surface = surfaceOf(keyOf(TITLE_ROOM));
  const walk = surface && firstPersonOn(surface);
  const draw = surface && rendererOn(surface);
  if (!walk || !draw) return;
  paused.value = true;
  app.hidden = false;
  entry.root.hidden = false;
  entry.root.style.zIndex = '1';
  entry.root.style.pointerEvents = 'none';
  // A quarter of the resolution each way: the room's own, less the
  // player's render quality, divided by four.
  const full =
    draw.renderer.getPixelRatio() / renderScale(settings.value.renderLevel);
  draw.renderer.setPixelRatio(full / 4);
  document.body.classList.add('on-title');
  const t0 = performance.now();
  let frame = 0;
  const fly = (now: number) => {
    frame = requestAnimationFrame(fly);
    // The orbit's pose now (`title-orbit.ts`).
    const p = orbitPose(OLYMPIC_ORBIT, (now - t0) / 1000);
    walk.place(p.x * METRE, p.z * METRE, p.yaw, p.pitch, p.y * METRE);
  };
  frame = requestAnimationFrame(fly);
  finish = () => {
    cancelAnimationFrame(frame);
    draw.renderer.setPixelRatio(full);
    document.body.classList.remove('on-title');
    paused.value = false;
    entry.root.style.pointerEvents = '';
    entry.root.style.zIndex = '';
    if (current !== keyOf(TITLE_ROOM)) entry.root.hidden = true;
  };
};
const stopTitleBackdrop = () => {
  titleBackdrop?.stop();
  titleBackdrop = null;
};

const openRoom = async () => {
  const ownRevision = ++revision;
  // A room that does not exist (a broken or old link) goes to the title
  // screen, the default page, its address tidied to the front page's.
  if (
    new URLSearchParams(location.search).has('room') &&
    !resolveRoomId(new URLSearchParams(location.search).get('room'))
  ) {
    const url = new URL(location.href);
    url.search = '';
    history.replaceState(null, '', url);
  }
  const params = new URLSearchParams(location.search);
  if (!params.has('room')) {
    if (document.pointerLockElement) document.exitPointerLock();
    window.dispatchEvent(new Event('blur'));
    stopSeeing();
    stopDryPeek();
    if (current) {
      const old = rooms.get(current);
      old?.handle.suspend?.();
      if (old) old.root.hidden = true;
    }
    current = undefined;
    app.hidden = true;
    positionOverlay.hidden = true;
    // The developers' panel, the room list, at `?dev` (a tool, not part
    // of the game); otherwise the title screen.
    if (params.has('manual')) {
      stopTitleBackdrop();
      titleScreen.hide();
      directoryShell.hidden = true;
      directory.querySelector('.plant-manual')?.remove();
      const manualWorld = worldStore('dev').world.value;
      directory.append(
        renderPlantManual(
          manualWorld.identifiedPlant,
          manualWorld.installedValves,
          manualWorld.plant.feeders,
        ),
      );
      directory.hidden = false;
      document.title = 'The Pool — Plant manual';
    } else if (params.has('dev')) {
      stopTitleBackdrop();
      titleScreen.hide();
      directoryShell.hidden = false;
      directory.querySelector('.plant-manual')?.remove();
      directory.hidden = false;
      document.title = 'The Pool — Dev panel';
    } else {
      directory.hidden = true;
      directoryShell.hidden = false;
      directory.querySelector('.plant-manual')?.remove();
      titleScreen.show();
      void startTitleBackdrop().catch(showError);
    }
    return;
  }
  // Known to exist: an unknown one went to the title above.
  const room = resolveRoomId(params.get('room'))!;
  const start = await starter(room);
  await resetEffects();
  if (ownRevision !== revision) return;
  directory.hidden = true;
  stopTitleBackdrop();
  titleScreen.hide();
  app.hidden = false;
  document.title = 'The Pool';
  if (document.pointerLockElement) document.exitPointerLock();
  window.dispatchEvent(new Event('blur'));
  stopSeeing();
  stopDryPeek();
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
  const surface = surfaceOf(key);
  const control = surface ? firstPersonOn(surface) : null;
  const number = (name: string) => {
    const raw = params.get(name);
    if (raw === null || raw.trim() === '') return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  const x = number('x'),
    z = number('z');
  if (control && x !== null && z !== null) {
    const pose = control.pose();
    const y = number('y');
    const yaw = number('yaw'),
      pitch = number('pitch');
    control.place(
      x * control.metre,
      z * control.metre,
      yaw === null ? pose.yaw : (yaw * Math.PI) / 180,
      pitch === null ? pose.pitch : (pitch * Math.PI) / 180,
      y === null ? undefined : y * control.metre,
    );
    const zoom = number('zoom');
    if (zoom !== null) control.zoom = zoom;
  }
  loaded.handle.resume?.();
  if (peekBack(keyOf(room))) void startDryPeek().catch(showError);
  void preloadCluster().catch(showError);
};
window.addEventListener('pool-plant:coordinate-hop', (event) => {
  const pose = (
    event as CustomEvent<{
      room: RoomId;
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      zoom: number;
    }>
  ).detail;
  if (!ROOMS.includes(pose.room)) return;
  const url = new URL(location.href);
  url.search = new URLSearchParams({
    room: pose.room,
    x: pose.x.toFixed(2),
    y: pose.y.toFixed(2),
    z: pose.z.toFixed(2),
    yaw: pose.yaw.toFixed(1),
    pitch: pose.pitch.toFixed(1),
    zoom: pose.zoom.toFixed(3),
  }).toString();
  history.pushState(null, '', url);
  void openRoom().catch(showError);
});
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
  const id = resolveRoomId(new URLSearchParams(location.search).get('room'));
  roomName.textContent = id ? DEV_ROOM_NAMES[id] : key;
  positionStatus.textContent = '';
  positionOverlay.hidden = false;
  // The pin, at the top right with the room's other view tools.
  const tools = surfaceOf(key)?.parentElement?.querySelector(
    '[aria-label="View tools"]',
  );
  if (tools) {
    tools.prepend(positionButton);
    tools.append(settingsButton);
  } else positionOverlay.append(positionButton, settingsButton);
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
    // Back to the plane that clips nothing: never none, so no recompile.
    underDraw.renderer.clippingPlanes = [inertClip()];
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
/** Rooms built for the pool loop's lazy joints, let go when not next door. */
const lazilyBuilt = new Set<RoomId>();
/**
 * Let a room go that is neither shown nor drawn under the one shown: free
 * its renderer and scene, to be built afresh if it is wanted again.
 */
const release = (room: RoomId) => {
  const key = keyOf(room);
  const entry = rooms.get(key);
  if (!entry || key === current) return;
  entry.handle();
  entry.root.remove();
  rooms.delete(key);
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
/** Build `room`, hidden, if it is neither built nor being built; whether it is built now. */
const ensureBuilt = (room: RoomId) => {
  if (rooms.has(keyOf(room))) return true;
  if (loading.has(room)) return false;
  loading.add(room);
  void starter(room)
    .then((start) => mount(room, start))
    .catch(showError)
    .finally(() => loading.delete(room));
  return false;
};
const checkDoors = () => {
  if (!current || app.hidden) return stopSeeing();
  const top = current as RoomId;
  // The pool loop: both rooms either side of this one built, unseen; any
  // built before that are no longer either side, let go.
  // Through an open plant room door, that room is built and seen, and the
  // loop's rooms either side let go.
  const door = openDoorJoint(top);
  const beside = door ? [door] : lazyNeighbours(top);
  // This room too, once left, if it is one of the loop's.
  if (beside.length || door) lazilyBuilt.add(top);
  for (const room of beside) {
    lazilyBuilt.add(room);
    ensureBuilt(room);
  }
  for (const room of lazilyBuilt)
    if (
      keyOf(room) !== current &&
      !beside.includes(room) &&
      seeing?.under !== room
    ) {
      lazilyBuilt.delete(room);
      release(room);
    }
  const to = openJoint(top);
  if (seeing && (seeing.top !== top || seeing.under !== to)) stopSeeing();
  if (seeing) return;
  if (!to) {
    // No door open: build the room behind the door nearest the walker, so
    // that it is ready to be seen the moment that door opens.
    const surface = surfaceOf(keyOf(top));
    const eye = surface && firstPersonOn(surface)?.pose();
    const nearest = eye && nearestJoint(top, eye.x, eye.z);
    if (nearest) ensureBuilt(nearest);
    return;
  }
  // Built the first time its door is opened, if not before; meanwhile, a dark lobby.
  if (!ensureBuilt(to)) return;
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
  toWalk.place(there.x, there.z, there.yaw, eye.pitch, there.y ?? eye.y);
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
/**
 * The rooms off PR_A that draw it through their opening, by PR_A's own
 * renderer following their walker: for each, whether a pose looks away
 * from PR_A, so the hall's expensive geometry can be left out.
 */
const PEEKS: Partial<Record<string, (yaw: number) => boolean>> = {
  // West of the hall, looking west.
  CR_A_UP: (yaw) => Math.sin(yaw) <= 0,
  // South of the hall, looking south.
  CR_A_ARCH: (yaw) => Math.cos(yaw) <= 0,
  // North of the hall, looking north.
  // North of the round room, west of the hall: looking north.
  white_corridor_1: (yaw) => Math.cos(yaw) >= 0,
};
const peekBack = (room: string) => PEEKS[room];
/** The room the hall is being drawn from, while it is. */
let dryPeek: string | null = null;
const stopDryPeek = () => {
  if (!dryPeek) return;
  const from = dryPeek;
  dryPeek = null;
  const pool = surfaceOf('PR_A');
  const stair = surfaceOf(from);
  if (stair instanceof HTMLCanvasElement) stair.style.opacity = '1';
  const poolDraw = pool && rendererOn(pool);
  if (poolDraw) poolDraw.paused = false;
  rooms.get('PR_A')?.handle.setDryOnly?.(false);
  rooms.get(from)?.handle.setVisual?.(true);
  const stairDraw = stair && rendererOn(stair);
  if (stairDraw) stairDraw.after = null;
  if (pool) firstPersonOn(pool)?.follow(null);
  const poolRoot = rooms.get('PR_A')?.root;
  if (poolRoot && current !== 'PR_A') poolRoot.hidden = true;
};
const startDryPeek = async () => {
  const from = current;
  const away = from && peekBack(from);
  if (!from || !away) return;
  const start = await starter('PR_A');
  const pool = mount('PR_A', start);
  if (current !== from) return;
  const stairSurface = surfaceOf(from);
  const poolSurface = surfaceOf('PR_A');
  const stairWalk = stairSurface && firstPersonOn(stairSurface);
  const poolWalk = poolSurface && firstPersonOn(poolSurface);
  const stairDraw = stairSurface && rendererOn(stairSurface);
  const poolDraw = poolSurface && rendererOn(poolSurface);
  if (!stairWalk || !poolWalk || !stairDraw || !poolDraw) return;
  pool.root.hidden = false;
  pool.root.style.zIndex = '1';
  pool.root.style.pointerEvents = 'none';
  rooms.get(from)!.root.style.zIndex = '2';
  if (stairSurface instanceof HTMLCanvasElement)
    stairSurface.style.opacity = '0';
  rooms.get(from)!.handle.setVisual?.(false);
  poolWalk.follow(() => stairWalk.pose());
  poolDraw.paused = true;
  stairDraw.after = (time) => {
    // One renderer draws the staircase on both sides of the threshold.
    // Hide the expensive pool geometry only when looking away from PR_A.
    pool.handle.setDryOnly?.(away(stairWalk.pose().yaw));
    poolDraw.loop?.(time);
  };
  dryPeek = from;
};
// ---- Building the rooms round PR_A before they are walked into ----------
// The rooms round PR_A are each a scene of their own, walked between across
// thresholds (`pool-plant:room-zone`). Building one (its canvas, WebGL
// context, scene and passes) and compiling its shaders on its first frame
// took the best part of half a second, so crossing into a room for the
// first time froze the walk. Instead, once the walker is in any of them,
// the others are built here, hidden, one at a time when the page is idle,
// and each draws a frame or two unseen so its shaders are compiled too.
/** The rooms round PR_A, by the key each is built under (`keyOf`). */
const PR_A_CLUSTER: readonly RoomId[] = [
  'PR_A',
  'CR_A_UP',
  'CR_A_ARCH',
  'white_corridor_1',
  'green_room_1',
  'CR_GREEN_STAIR',
];
const inCluster = (key: string | undefined) =>
  PR_A_CLUSTER.some((room) => keyOf(room) === key);
const idle = () =>
  new Promise<void>((resolve) =>
    'requestIdleCallback' in window
      ? requestIdleCallback(() => resolve(), { timeout: 1500 })
      : setTimeout(resolve, 300),
  );
const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
/** Draw a hidden room's frames unseen for a moment, compiling its shaders. */
const warm = async (key: string) => {
  const loaded = rooms.get(key);
  if (!loaded || !loaded.root.hidden) return;
  const { root } = loaded;
  root.style.visibility = 'hidden';
  root.style.pointerEvents = 'none';
  root.hidden = false;
  await nextFrame();
  await nextFrame();
  await nextFrame();
  root.style.visibility = '';
  root.style.pointerEvents = '';
  // Unless the walker has crossed into it meanwhile.
  if (current !== key) root.hidden = true;
};
let preloading = false;
const preloadCluster = async () => {
  if (preloading) return;
  preloading = true;
  try {
    for (const room of PR_A_CLUSTER) {
      if (!inCluster(current)) return;
      // PR_A is built by the dry stair's peek, when the walker is there.
      if (rooms.has(keyOf(room))) continue;
      await idle();
      if (!inCluster(current) || rooms.has(keyOf(room))) continue;
      const start = await starter(room);
      if (rooms.has(keyOf(room))) continue;
      mount(room, start);
      await idle();
      await warm(keyOf(room));
    }
  } finally {
    preloading = false;
  }
};
let zoneTransferPending = false;
window.addEventListener('pool-plant:room-zone', (event) => {
  const id = (event as CustomEvent<RoomId>).detail;
  if (
    (id !== 'PR_A' &&
      id !== 'CR_A_UP' &&
      id !== 'CR_A_ROUND' &&
      id !== 'CR_A_ARCH' &&
      id !== 'CR_A_STEPS' &&
      id !== 'white_corridor_1' &&
      id !== 'green_room_1' &&
      id !== 'CR_GREEN_STAIR') ||
    zoneTransferPending
  )
    return;
  if (current === keyOf(id)) {
    const url = new URL(location.href);
    if (url.searchParams.get('room') !== id) {
      url.searchParams.set('room', id);
      history.replaceState(null, '', url);
      // CR_A_UP and CR_A_ROUND use one mounted scene. showOnTop would hide
      // PR_A's shared render canvas, leaving the transparent stair canvas
      // with no image when the walker crosses this internal boundary.
      roomName.textContent = DEV_ROOM_NAMES[id];
      positionStatus.textContent = '';
    }
    return;
  }
  const control = current ? firstPersonOn(surfaceOf(current)!) : null;
  const pose = control?.pose();
  const zoom = control?.zoom;
  const url = new URL(location.href);
  url.searchParams.set('room', id);
  if (control) {
    const pose = control.pose();
    const metre = control.metre;
    url.searchParams.set('x', (pose.x / metre).toFixed(2));
    url.searchParams.set('y', (pose.y / metre).toFixed(2));
    url.searchParams.set('z', (pose.z / metre).toFixed(2));
    url.searchParams.set(
      'yaw',
      (((pose.yaw * 180) / Math.PI + 360) % 360).toFixed(1),
    );
    url.searchParams.set('pitch', ((pose.pitch * 180) / Math.PI).toFixed(1));
    url.searchParams.set('zoom', control.zoom.toFixed(3));
  }
  history.replaceState(null, '', url);
  zoneTransferPending = true;
  void starter(id)
    .then((start) => {
      stopDryPeek();
      const loaded = mount(id, start);
      const old = current ? rooms.get(current) : null;
      old?.handle.suspend?.();
      if (old) old.root.hidden = true;
      current = keyOf(id);
      showOnTop(current);
      loaded.root.hidden = false;
      loaded.handle.enter?.(null, id);
      const nextSurface = surfaceOf(current);
      const next = nextSurface ? firstPersonOn(nextSurface) : null;
      if (next && pose) {
        next.place(pose.x, pose.z, pose.yaw, pose.pitch, pose.y);
        if (zoom !== undefined) next.zoom = zoom;
      }
      loaded.handle.resume?.();
      if (peekBack(current)) void startDryPeek().catch(showError);
      void preloadCluster().catch(showError);
    })
    .catch(showError)
    .finally(() => {
      zoneTransferPending = false;
    });
});
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
