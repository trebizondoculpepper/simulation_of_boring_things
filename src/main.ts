import { frameLayout } from './toolkit/settings/logic/graphics';
import {
  reportError,
  startErrorReporting,
} from './toolkit/errors/error-reporting';
import { bindTitleShortcuts } from './toolkit/controls/input/title-shortcuts';
import { createJacuzziAmbience } from './toolkit/gallery/views/jacuzzi-ambience';
import { jacuzziApproachGain } from './toolkit/gallery/logic/jacuzzi-acoustics';
import './styles/main.css';
import { createRoomModuleCache } from './toolkit/gallery/logic/room-module-cache';
import { Plane, Vector2, Vector3 } from 'three';
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
import { isMuseumHall } from './toolkit/gallery/logic/museum-plan';
import {
  jointOf,
  lazyNeighbours,
  openDoorJoint,
  nearestJoint,
  openJoint,
  throughDoor,
} from './toolkit/gallery/logic/door-joins';
import { firstPersonOn } from './toolkit/controls/input/first-person';
import {
  setCopyHandler,
  setNoclipToggle,
} from './toolkit/controls/input/copy-actions';
import { clockStopped, paused } from './toolkit/controls/logic/paused';
import { createConsole } from './toolkit/console/console-view';
import { consoleOpen } from './toolkit/controls/logic/console-open';
import { noclip } from './toolkit/controls/logic/noclip';
import { renderScale } from './toolkit/settings/logic/settings';
import {
  screenshotFileName,
  screenshotPixelRatio,
  screenshotSize,
} from './toolkit/controls/logic/screenshot-size';
import { METRE } from './toolkit/components/core/logic/units';
import {
  drawAtRatio,
  inertClip,
  rendererOn,
} from './toolkit/components/core/parts/render-style';
import {
  createScenarioStore,
  setRoomWorld,
  worldStore,
} from './toolkit/save/world-store';
import { attractScenario } from './game/attract-scenarios';
import {
  prepareRoom,
  setRoomPreparer,
} from './toolkit/gallery/logic/room-readiness';
import { focusRoom } from './toolkit/baking/baked-ao';
import { torch } from './toolkit/controls/logic/torch';
import { createGameSession } from './toolkit/save/game-session';
import { GAS_ZONE_IDS } from './game/plant/gas';
import type { PoolId } from './game/plant/pools';
import { buildLine, versionLabel } from './game/version';
import { createTitleScreen } from './toolkit/title/title-screen';
import {
  ATTRACT_SHOTS,
  attractBlack,
  controlAttract,
  newAttract,
  nextShot,
  shotPose,
  stepAttract,
} from './toolkit/title/logic/attract-sequence';
import type { AttractShot } from './toolkit/title/logic/attract-sequence';
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

// Errors go to Sentry, each run under its own environment (`error-reporting.ts`):
// started before anything else, so a failure to start is caught too.
startErrorReporting();

const showError = (error: unknown) => {
  reportError(error);
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
let gameStorage: Storage | null = null;
try {
  gameStorage = window.localStorage;
} catch {
  // A private browser may block storage entirely.
}
const gameSession = createGameSession(worldStore('dev'), gameStorage);
const rememberPlayer = () => {
  if (!current || noclip.value) return;
  const room = resolveRoomId(new URLSearchParams(location.search).get('room'));
  const surface = surfaceOf(current);
  const control = surface && firstPersonOn(surface);
  if (!room || !control || control.noclip) return;
  const pose = control.pose();
  gameSession.remember(
    `?${new URLSearchParams({
      room,
      x: String(pose.x / control.metre),
      y: String(pose.y / control.metre),
      z: String(pose.z / control.metre),
      yaw: String((pose.yaw * 180) / Math.PI),
      pitch: String((pose.pitch * 180) / Math.PI),
      zoom: String(control.zoom),
    })}`,
  );
};
const saveGame = () => {
  rememberPlayer();
  return worldStore('dev').save();
};
const positionSaveTimer = window.setInterval(rememberPlayer, 10_000);
window.addEventListener('pagehide', rememberPlayer);
const saveHiddenPosition = () => {
  if (document.visibilityState === 'hidden') rememberPlayer();
};
document.addEventListener('visibilitychange', saveHiddenPosition);
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
const screenshotButton = document.createElement('button');
screenshotButton.type = 'button';
screenshotButton.textContent = '▣';
screenshotButton.title = 'Copy a screenshot (Ctrl/Cmd+Shift+K)';
screenshotButton.setAttribute('aria-label', 'Copy screenshot without overlays');
screenshotButton.className = 'location-pin-button screenshot-button';
/**
 * Where the rooms' image is laid out (the owner, 2026-10-29): under a
 * maximum resolution of another shape than the window, centred, letterboxed
 * or stretched (`frameLayout`), as CSS variables `#app canvas` reads.
 */
const layOutFrame = () => {
  const s = settings.peek();
  const frame = frameLayout(
    innerWidth,
    innerHeight,
    devicePixelRatio || 1,
    s.resolutionCap,
    s.aspectFit,
  );
  const root = document.documentElement.style;
  if (!frame) {
    for (const name of ['--frame-w', '--frame-h', '--frame-x', '--frame-y'])
      root.removeProperty(name);
    root.removeProperty('--frame-transform');
    return;
  }
  root.setProperty('--frame-w', `${frame.width}px`);
  root.setProperty('--frame-h', `${frame.height}px`);
  root.setProperty('--frame-x', `${frame.x}px`);
  root.setProperty('--frame-y', `${frame.y}px`);
  root.setProperty(
    '--frame-transform',
    frame.scaleX === 1 && frame.scaleY === 1
      ? 'none'
      : `scale(${frame.scaleX}, ${frame.scaleY})`,
  );
};
addEventListener('resize', layOutFrame);
// The player's settings that are the app's to apply: the master volume,
// and whether the on-screen controls are shown. (Look, field of view and
// graphics quality are applied where they are used.)
effect(() => {
  const s = settings.value;
  partAudio.setVolume(s.volume);
  document.body.classList.toggle(
    'hide-onscreen-controls',
    s.onScreenControls === 'never',
  );
  document.documentElement.style.setProperty(
    '--overlay-scale',
    String(s.overlayScale),
  );
  layOutFrame();
});
// The pause menu: Esc once the mouse is free, a gamepad's Start, or the
// gear among each room's view tools. The world saves itself as it runs
// (Minecraft's way); Save is for reassurance, and Quit to Title saves first.
// Until the title screen exists, the title is the room list.
/**
 * Mission 096 (stage 4 brought forward by the owner, 2026-10-28): the
 * menus are Penfold panels by default: the settings panel SP-1 drawn over
 * the room (Esc, a pad's Start or the gear open it; it does not pause the
 * game). The title keeps its simple text menu. The plain DOM settings menu
 * is the fallback: `?menu=plain`, no WebGL 2, or a panel that fails to start.
 */
const panelsWanted =
  new URLSearchParams(location.search).get('menu') !== 'plain' &&
  typeof WebGL2RenderingContext !== 'undefined';
let panelsFailed = false;
const panelsOn = () => panelsWanted && !panelsFailed;
/** A panel could not start: the plain menus from now on. */
const panelsFail = (error: unknown) => {
  console.warn(
    'The menu panels could not start; using the plain menus.',
    error,
  );
  panelsFailed = true;
  menuPanel = null;
  const list = document.querySelector<HTMLElement>('.title-menu');
  if (list) list.removeAttribute('style');
};
let menuPanel: {
  open(options?: { inGame?: boolean }): void;
  readonly isOpen: boolean;
} | null = null;
const pauseMenu = createPauseMenu({
  save: saveGame,
  holding: worldStore('dev').holding,
  quitToTitle() {
    saveGame();
    goTo('');
  },
  // Not on the title screen or the room list: only in a room; and not
  // while the console is down (its Esc is the console's). While the
  // panels are on, the settings panel answers Esc and Start instead.
  canOpen: () => current !== undefined && !consoleOpen.value && !panelsOn(),
  devPanel: () => goTo('?dev'),
  noclip,
  setNoclip(on) {
    if (on) rememberPlayer();
    noclip.value = on;
    if (on) {
      stopSeeing();
      stopDryPeek();
    }
  },
  copyCamera: () => copyCameraLocation(),
});
if (panelsWanted)
  void Promise.all([
    import('./toolkit/menus/views/menu-overlay'),
    import('./toolkit/settings/pause-menu'),
    import('./toolkit/controls/logic/controls'),
  ])
    .then(([{ createMenuOverlay }, { BINDINGS }, { controlsHelp }]) => {
      const overlay = createMenuOverlay({
        actions: {
          save: saveGame,
          holding: worldStore('dev').holding,
          quitToTitle() {
            overlay.close();
            saveGame();
            goTo('');
          },
          devPanel: () => {
            overlay.close();
            goTo('?dev');
          },
          noclip,
          setNoclip(on) {
            if (on) rememberPlayer();
            noclip.value = on;
            if (on) {
              stopSeeing();
              stopDryPeek();
            }
          },
          copyCamera: () => copyCameraLocation(),
        },
        bindings: BINDINGS,
        touchHelp: controlsHelp('touch'),
        build: buildLine(),
        development: import.meta.env.DEV,
        canOpen: () =>
          panelsOn() && current !== undefined && !consoleOpen.value,
        onFail: panelsFail,
      });
      menuPanel = {
        open(options) {
          try {
            overlay.open(options);
          } catch (error) {
            panelsFail(error);
            pauseMenu.open(
              options?.inGame === false ? 'Graphics' : 'Game',
              options,
            );
          }
        },
        get isOpen() {
          return overlay.isOpen;
        },
      };
      // For measuring and testing from the browser's console (development).
      if (import.meta.env.DEV) {
        (globalThis as { menuPanel?: unknown }).menuPanel = overlay;
        // Menu intents as a keyboard or gamepad would send them, for testing.
        void import('./toolkit/controls/input/menu-input').then(
          ({ sendMenuIntent }) =>
            ((globalThis as { menuIntent?: unknown }).menuIntent =
              sendMenuIntent),
        );
      }
    })
    .catch(panelsFail);
const settingsButton = document.createElement('button');
settingsButton.type = 'button';
settingsButton.className = 'hud-button hud-settings';
settingsButton.innerHTML = GEAR_ICON;
settingsButton.title = 'Menu (Esc)';
settingsButton.setAttribute('aria-label', 'Menu');
settingsButton.addEventListener('pointerdown', (event) =>
  event.stopPropagation(),
);
settingsButton.addEventListener('click', () =>
  menuPanel ? menuPanel.open() : pauseMenu.open(),
);

/** Go to a page of the app (`?room=…`, `?dev`, or '' for the title) without reloading. */
const goTo = (search: string) => {
  rememberPlayer();
  noclip.value = false;
  const url = new URL(location.href);
  url.search = search;
  history.pushState(null, '', url);
  void openRoom().catch(showError);
};

// The title screen (`doc/plans/title-screen.md`), the front page; the
// developers' room list is at `?dev`. New game resets the shared world to
// nominal operating conditions and starts in the footbath; Continue
// restores the last playable view. Settings and Instructions are the pause menu's
// tabs, opened without its Game tab.
const titleActions: Parameters<typeof createTitleScreen>[0] = {
  newGame: () => {
    const destination = gameSession.start();
    // A fresh page also clears room-local demonstrations and cached camera poses.
    current = undefined;
    location.assign(destination);
  },
  continueGame: () => {
    const destination = gameSession.resume();
    if (destination) goTo(destination);
  },
  canContinue: () => {
    const destination = gameSession.resume();
    return (
      !!destination &&
      !!resolveRoomId(new URLSearchParams(destination).get('room'))
    );
  },
  noContinue: 'Start a new game first',
  settings: () =>
    menuPanel
      ? menuPanel.open({ inGame: false })
      : pauseMenu.open('Graphics', { inGame: false }),
  instructions: () =>
    menuPanel
      ? menuPanel.open({ inGame: false })
      : pauseMenu.open('Controls', { inGame: false }),
  covered: () => pauseMenu.isOpen || (menuPanel?.isOpen ?? false),
  build: buildLine(),
};
const titleScreen = createTitleScreen(titleActions);
const positionStatus = document.createElement('span');
positionStatus.setAttribute('role', 'status');
positionOverlay.append(roomName, positionStatus);
positionOverlay.hidden = true;
document.body.append(positionOverlay);
/** The link to the view now, or null where there is none. */
const cameraLink = (): string | null => {
  const id = resolveRoomId(new URLSearchParams(location.search).get('room'));
  const surface = current ? surfaceOf(current) : null;
  const control = surface ? firstPersonOn(surface) : null;
  if (!id || !control) return null;
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
  // A rolled view's roll, degrees clockwise from level; a level one says
  // nothing, except a noclip camera's, which says so and always gives its
  // roll, so the link opens the same shot.
  const roll = ((control.roll * 180) / Math.PI).toFixed(1);
  if (noclip.value) {
    url.searchParams.set('noclip', 'true');
    url.searchParams.set('roll', roll);
  } else if (Number(roll) !== 0) url.searchParams.set('roll', roll);
  return url.href;
};
const logCopy = (text: string, failed = false) => {
  const store = worldStore('dev');
  store.log({
    time: store.world.value.time,
    kind: 'system',
    severity: failed ? 'notice' : 'info',
    subject: '',
    text,
  });
  console.info(text);
};

const copyObjectReference = async (reference: string | null) => {
  if (!reference) {
    logCopy('No highlighted object to copy.', true);
    return;
  }
  try {
    await navigator.clipboard.writeText(reference);
    logCopy(`Copied object reference: ${reference}`);
  } catch {
    logCopy(
      `Could not copy object reference: ${reference}. Allow clipboard access and try again.`,
      true,
    );
  }
};

/** Copy and log the view's link, flashing its pin/camera button on success. */
const copyCameraLocation = async (): Promise<string> => {
  const link = cameraLink();
  if (!link) {
    positionStatus.textContent = 'Position unavailable in this view';
    logCopy(positionStatus.textContent, true);
    return positionStatus.textContent;
  }
  positionButton.disabled = true;
  try {
    await navigator.clipboard.writeText(link);
    positionStatus.textContent = '';
    positionButton.classList.remove('is-copied');
    // Restart its flash, should it be pressed again mid-flash.
    void positionButton.offsetWidth;
    positionButton.classList.add('is-copied');
    logCopy(
      `Copied ${new URL(link).searchParams.get('noclip') === 'true' ? 'camera' : 'pin'} link: ${link}`,
    );
    return 'Link copied';
  } catch {
    positionStatus.textContent =
      'Could not copy. Allow clipboard access and try again.';
    logCopy(`${positionStatus.textContent} Link: ${link}`, true);
    return positionStatus.textContent;
  } finally {
    positionButton.disabled = false;
  }
};
/**
 * The room canvases the player sees now, bottom first, as the page stacks
 * them: the room shown, one seen through an open doorway under it, a
 * title shot. Only canvases a room renderer draws: nothing of the page's
 * interface, which is never on them.
 */
const worldLayers = () =>
  [...(canvas.parentElement?.children ?? [])]
    .filter(
      (root): root is HTMLElement =>
        root instanceof HTMLElement && root.localName === 'section',
    )
    .filter((root) => !root.hidden)
    .map((root, order) => ({
      root,
      order,
      z: Number(root.style.zIndex) || 0,
    }))
    .sort((a, b) => a.z - b.z || a.order - b.order)
    .map(({ root }) => root.querySelector('canvas'))
    .filter(
      (surface): surface is HTMLCanvasElement =>
        surface !== null && !surface.hidden,
    )
    .flatMap((surface) => {
      const draw = rendererOn(surface);
      return draw ? [{ surface, draw }] : [];
    });
/**
 * A best-quality frame of the view now (prompt 084): every room canvas
 * seen drawn again at full resolution (render scale 1, whatever the
 * player's graphics quality), at twice the device's pixel ratio up to
 * 3840 px wide (`screenshot-size.ts`), through each room's own pipeline;
 * at the time of its last frame, so nothing moves or runs on; composited
 * at once into a canvas of its own, before the browser can discard the
 * drawing; and the rooms' pixel ratios put back. Null with nothing to draw.
 */
const captureView = (): HTMLCanvasElement | null => {
  const layers = worldLayers();
  const top = layers.at(-1);
  if (!top) return null;
  const view = top.draw.renderer.getSize(new Vector2());
  // The tightest limit of every renderer drawing it.
  const maxDimension = Math.min(
    ...layers.map(({ draw }) => {
      const gl = draw.renderer.getContext();
      const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
      return Math.min(
        draw.renderer.capabilities.maxTextureSize,
        gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
        viewport[0],
        viewport[1],
      );
    }),
  );
  const ratio = screenshotPixelRatio(
    view.x,
    view.y,
    globalThis.devicePixelRatio ?? 1,
    maxDimension,
  );
  if (ratio === null) return null;
  // Drawn at exactly this ratio, whatever the render quality, the
  // resolution cap and the graphics preset.
  try {
    for (const { draw } of layers) drawAtRatio(draw.renderer, ratio);
    // Each frame the browser runs, run again: a paused room is drawn by
    // the frame of the room over it (`after`).
    for (const { draw } of layers) {
      if (draw.paused || !draw.loop) continue;
      draw.loop(draw.time);
      draw.after?.(draw.time);
    }
    const image = document.createElement('canvas');
    const size = screenshotSize(view.x, view.y, ratio);
    image.width = size.width;
    image.height = size.height;
    const context = image.getContext('2d');
    if (!context) return null;
    for (const { surface } of layers) {
      // A room drawn but not shown (a staircase seen through) adds nothing.
      const opacity = Number(surface.style.opacity || 1);
      if (!(opacity > 0)) continue;
      context.globalAlpha = Math.min(1, opacity);
      context.drawImage(surface, 0, 0, image.width, image.height);
    }
    return image;
  } finally {
    for (const { draw } of layers) drawAtRatio(draw.renderer, null);
  }
};
/**
 * A short notice over everything, the title included: what became of a
 * screenshot, with a Save button where it could only be saved, in case
 * the browser held its download back.
 */
const shotNotice = document.createElement('div');
shotNotice.className = 'screenshot-notice';
shotNotice.setAttribute('role', 'status');
shotNotice.hidden = true;
document.body.append(shotNotice);
let shotNoticeTimer = 0;
const noticeShot = (text: string, save?: () => void) => {
  shotNotice.replaceChildren(text);
  if (save) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Save';
    button.addEventListener('click', save);
    shotNotice.append(' ', button);
  }
  shotNotice.hidden = false;
  window.clearTimeout(shotNoticeTimer);
  shotNoticeTimer = window.setTimeout(
    () => (shotNotice.hidden = true),
    save ? 8000 : 3000,
  );
};
const downloadShot = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
/** The room a screenshot is of, or why there is none to take now. */
const shotTarget = (): { room: string } | { unavailable: string } => {
  if (titleBackdrop) {
    const room = titleBackdrop.shown();
    return room
      ? { room }
      : { unavailable: 'The scene is still loading; try again in a moment' };
  }
  if (!current) return { unavailable: 'No game view to capture' };
  return {
    room:
      resolveRoomId(new URLSearchParams(location.search).get('room')) ??
      current,
  };
};
let shooting = false;
/**
 * Copy a best-quality screenshot to the clipboard as a PNG, or save it
 * where the browser will not (prompt 084). The clipboard write starts here,
 * in the key press or click, with the PNG still to come, as Safari asks;
 * the same PNG is saved if it is refused.
 */
const copyScreenshot = () => {
  if (shooting) return;
  const target = shotTarget();
  if ('unavailable' in target) {
    noticeShot(target.unavailable);
    logCopy(`Screenshot not taken: ${target.unavailable}.`, true);
    return;
  }
  let image: HTMLCanvasElement | null = null;
  try {
    image = captureView();
  } catch (error) {
    logCopy(`Screenshot failed: ${String(error)}`, true);
  }
  if (!image) {
    noticeShot('Could not take a screenshot');
    return;
  }
  shooting = true;
  screenshotButton.disabled = true;
  const dimensions = `${image.width} × ${image.height}`;
  // Encoding a large PNG can take a moment.
  noticeShot(`Copying screenshot, ${dimensions}…`);
  const name = screenshotFileName(target.room, new Date());
  const png = new Promise<Blob>((resolve, reject) =>
    image.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('PNG encoding failed.')),
      'image/png',
    ),
  );
  png.catch(() => {});
  let copied: Promise<void>;
  try {
    copied =
      typeof ClipboardItem === 'function' && navigator.clipboard?.write
        ? navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
        : Promise.reject(new Error('This browser cannot copy images.'));
  } catch (error) {
    copied = Promise.reject(error);
  }
  void copied
    .then(
      () => {
        noticeShot(`Screenshot copied, ${dimensions}`);
        logCopy(`Screenshot copied, ${dimensions}`);
      },
      async (refused) => {
        let blob: Blob;
        try {
          blob = await png;
        } catch (error) {
          noticeShot('Could not take a screenshot');
          logCopy(`Screenshot failed: ${String(error)}`, true);
          return;
        }
        downloadShot(blob, name);
        noticeShot(`Screenshot saved, ${dimensions}`, () =>
          downloadShot(blob, name),
        );
        logCopy(
          `Screenshot saved as ${name}, ${dimensions} (not copied: ${String(refused)})`,
          true,
        );
      },
    )
    .finally(() => {
      shooting = false;
      screenshotButton.disabled = false;
    });
};
setCopyHandler((request) => {
  if (request.kind === 'reference') void copyObjectReference(request.reference);
  else if (request.kind === 'position') void copyCameraLocation();
  else copyScreenshot();
});
positionButton.addEventListener('animationend', () =>
  positionButton.classList.remove('is-copied'),
);
positionButton.addEventListener('click', () => void copyCameraLocation());
screenshotButton.addEventListener('click', copyScreenshot);
// In noclip the pin is a camera: its link is a shot's, `noclip=true` and
// its roll.
let wasCamera = noclip.peek();
effect(() => {
  const camera = noclip.value;
  const label = camera
    ? 'Copy a link to this camera shot'
    : 'Copy a link to this view';
  positionButton.textContent = camera ? '📷' : '📍';
  positionButton.title = `${label} (Ctrl/Cmd+P)`;
  positionButton.setAttribute('aria-label', label);
  // Leaving noclip, a reload walks again, whatever link it came by. (Only
  // on leaving: at startup the link's own `noclip` is yet to be read.)
  if (wasCamera && !camera) {
    const url = new URL(location.href);
    url.searchParams.delete('noclip');
    history.replaceState(history.state, '', url);
  }
  wasCamera = camera;
});
// The console (`doc/prompts/done/058-developer-console.md`): the key left of 1
// drops it down in a room; it shows the player's world's log and works the
// player's world and the app, never an attract world.
createConsole({
  host: {
    world: () => worldStore('dev').world.value,
    dispatch: (action) => worldStore('dev').dispatch(action, 'console'),
    events: () => worldStore('dev').events.value,
    log: (event) => worldStore('dev').log(event),
    rooms: () => ROOMS.map((id) => ({ id, name: DEV_ROOM_NAMES[id] })),
    currentRoom: () =>
      current
        ? (resolveRoomId(new URLSearchParams(location.search).get('room')) ??
          null)
        : null,
    goto: (id) => goTo(`?${new URLSearchParams({ room: id })}`),
    noclip(on) {
      if (on !== undefined && on !== noclip.value) {
        if (on) rememberPlayer();
        noclip.value = on;
        if (on) {
          stopSeeing();
          stopDryPeek();
        }
      }
      return noclip.value;
    },
    torch(on) {
      if (on !== undefined) torch.on = on;
      return torch.on;
    },
    paused(on) {
      if (on !== undefined) clockStopped.value = on;
      return clockStopped.value;
    },
    cameraLink,
    download(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    build: () => buildLine(),
  },
  events: worldStore('dev').events,
  canOpen: () => current !== undefined && !pauseMenu.isOpen,
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
const importStarter = async (
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
    // The Olympic's own shell (22 × 14 m, prompt 033): its balance tank in a
    // hall of its own, through its west doors.
    const plan =
      hall === 'pool_02'
        ? (
            await import('./toolkit/gallery/logic/olympic-plan')
          ).olympicShellPlan()
        : hall === 'pool_01'
          ? (
              await import('./toolkit/gallery/logic/lounge-plant-plan')
            ).loungeShellPlan()
          : undefined;
    return (surface) =>
      startPlantRoomShell(surface, size, hall, plan ? { plan } : {});
  }
  if (room === 'tank_hall')
    // The Olympic's balance tank hall, through its plant room's west doors.
    return (await import('./toolkit/gallery/rooms/tank-hall-room'))
      .startTankHall;
  if (room === 'retired0') {
    // The Olympic pool's plant room as it was on 2026-10-23, frozen as a
    // reference: its shell, with its retired layout and pipes.
    const [{ startPlantRoomShell }, { POOL_HALLS }] = await Promise.all([
      import('./toolkit/gallery/rooms/plant-room-shell-room'),
      import('./toolkit/gallery/logic/pool-halls'),
    ]);
    const size = POOL_HALLS.pool_02.plantDoor!.size;
    return (surface) =>
      startPlantRoomShell(surface, size, 'pool_02', {
        equipment: 'retired0',
        title: 'RETIRED0 · RETIRED: THE OLYMPIC POOL PLANT ROOM',
      });
  }
  if (room === 'retired1') {
    // The jacuzzi's plant room as it was on 2026-10-25, before its
    // re-plumbing by the plumber (prompt 064), frozen as a reference.
    const [{ startPlantRoomShell }, { POOL_HALLS }] = await Promise.all([
      import('./toolkit/gallery/rooms/plant-room-shell-room'),
      import('./toolkit/gallery/logic/pool-halls'),
    ]);
    const size = POOL_HALLS.pool_03.plantDoor!.size;
    return (surface) =>
      startPlantRoomShell(surface, size, 'pool_03', {
        equipment: 'retired1',
        title: 'RETIRED1 · RETIRED: THE JACUZZI PLANT ROOM',
      });
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
  if (isMuseumHall(room)) {
    const { startMuseumHallRoom } =
      await import('./toolkit/gallery/rooms/museum-hall-room');
    return (surface) => startMuseumHallRoom(surface, room);
  }
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
  if (room === 'dev33') {
    // The footbath, on its own, its water's level set by hand.
    const { startPoolHallRoom } =
      await import('./toolkit/gallery/rooms/pool-hall-room');
    return (surface) =>
      startPoolHallRoom(surface, 'pool_04', { devRoom: 'dev33' });
  }
  if (room === 'duty_managers_office')
    return (await import('./toolkit/gallery/rooms/shell-room'))
      .startDutyManagersOffice;
  if (room === 'dev36')
    return (await import('./toolkit/gallery/rooms/shell-room'))
      .startMusicEffectsRoom;
  if (room === 'dev35')
    return (await import('./toolkit/gallery/rooms/jacuzzi-water-room'))
      .startJacuzziWaterRoom;
  if (room === 'dev34')
    return (await import('./toolkit/gallery/rooms/shell-room'))
      .startStairTowerRoom;
  if (room === 'dev54' || room === 'freight_lift') {
    const { startLiftCarRoom } =
      await import('./toolkit/gallery/rooms/lift-rooms');
    return (surface) =>
      startLiftCarRoom(surface, room === 'dev54' ? 'trial' : 'freight');
  }
  if (room.startsWith('dev54_')) {
    const { startLiftTrialFloor } =
      await import('./toolkit/gallery/rooms/lift-rooms');
    return (surface) => startLiftTrialFloor(surface, room.slice(6));
  }
  if (room === 'dev56')
    return (await import('./toolkit/gallery/rooms/baked-ao-room'))
      .startBakedAoRoom;
  if (room === 'dev55')
    return (await import('./toolkit/gallery/rooms/co2-cage-room'))
      .startCo2CageRoom;
  if (room === 'dev53')
    return (await import('./toolkit/gallery/rooms/skimmer-reveal-room'))
      .startSkimmerRevealRoom;
  if (room === 'dev50')
    return (await import('./toolkit/gallery/rooms/truck-yard-room'))
      .startTruckYardRoom;
  if (room === 'dev45')
    return (await import('./toolkit/gallery/rooms/control-room-prototype'))
      .startControlRoomPrototype;
  if (room === 'dev46')
    return (await import('./toolkit/gallery/rooms/control-room-prototype'))
      .startBridgePrototype;
  if (room === 'bridge')
    return (await import('./toolkit/gallery/rooms/bridge-room')).startTheBridge;
  if (room === 'dev31')
    return (await import('./rendering/effects-playground-room'))
      .startEffectsPlaygroundRoom;
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
    room === 'dev25' ||
    room === 'dev26' ||
    room === 'dev27' ||
    room === 'dev28' ||
    room === 'dev29' ||
    room === 'dev30' ||
    room === 'dev32' ||
    room === 'dev37' ||
    room === 'dev38' ||
    room === 'dev39' ||
    room === 'dev40' ||
    room === 'dev41' ||
    room === 'dev42' ||
    room === 'dev43' ||
    room === 'dev44' ||
    room === 'dev47' ||
    room === 'dev48' ||
    room === 'dev49' ||
    room === 'dev51' ||
    room === 'dev52'
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
const starter = createRoomModuleCache(importStarter);
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
// ---- The title's backdrop: its attract sequence ---------------------------
// Behind the title screen, rooms of the game, live, seen from where the
// player never goes, at a quarter of the resolution and blurred
// (`doc/plans/title-screen.md`), one shot after another
// (`doc/prompts/done/054-title-attract-sequence.md`, `attract-sequence.ts`):
// each a slow orbit in its room, fading to black, held black while the
// next room is built, and fading in on it; round and round, the theme
// playing on. The game is paused under it, so its rooms take no input,
// the world's clock stands still and nothing of the player's changes.
// Rooms it builds for itself it lets go again as it moves on, and when
// the title is left. Its rooms are its own, built on canvases of their
// own and each on its shot's world (`attract-scenarios.ts`), prepared
// for it, never the player's: the player's rooms and save are untouched.
/** Put the attract camera where `shot` has it `seconds` into its move: placed, rolled and zoomed. */
const placeShot = (
  walk: NonNullable<ReturnType<typeof firstPersonOn>>,
  shot: AttractShot,
  seconds: number,
) => {
  const p = shotPose(shot, seconds);
  walk.place(p.x * METRE, p.z * METRE, p.yaw, p.pitch, p.y * METRE);
  walk.roll = p.roll;
  walk.zoom = p.zoom;
};
const titleVeil = document.createElement('div');
titleVeil.className = 'attract-veil';
titleVeil.hidden = true;
document.body.append(titleVeil);
let titleBackdrop: {
  stop(): void;
  /** The room of the shot on screen, or null while none is ready to be seen. */
  shown(): RoomId | null;
} | null = null;
const startTitleBackdrop = async () => {
  if (titleBackdrop) return;
  // Its rooms are seen, not heard: only the title's theme plays.
  partAudio.setGameMuted(true);
  let stopped = false;
  let frame = 0;
  let state = newAttract();
  /**
   * The shot on screen now: its room, built for the attract sequence on
   * a canvas of its own (never one of the player's rooms), and the world
   * it reads, its scenario afresh (`attract-scenarios.ts`).
   */
  let shown: {
    room: RoomId;
    root: HTMLElement;
    handle: RoomHandle;
    walk: NonNullable<ReturnType<typeof firstPersonOn>>;
    store: ReturnType<typeof createScenarioStore>;
  } | null = null;
  /** The shot whose room is built and on screen, and when it may be seen. */
  let builtFor = -1;
  let seenFrom = 0;
  let building = false;
  let presentation = 0;
  // The player's torch, put back as it was when the title is left.
  const playerTorch = torch.on;
  /** Let the shot on screen go: its room, its renderer, its world. */
  const letGo = () => {
    if (!shown) return;
    shown.store.stop();
    shown.handle();
    shown.root.remove();
    shown = null;
    setRoomWorld(null);
  };
  /** Build the shot's room on its own world, and put it on screen, black. */
  const present = async (index: number) => {
    const ownPresentation = ++presentation;
    const shot = ATTRACT_SHOTS[index];
    const room = resolveRoomId(shot.room);
    if (!room) return;
    const start = await starter(room);
    if (stopped || ownPresentation !== presentation) return;
    letGo();
    // Its world: its scenario, afresh, running while it is seen; and the
    // room built now reads it, not the player's.
    const store = createScenarioStore(attractScenario(shot.scenario));
    setRoomWorld(store);
    const root = document.createElement('section');
    root.setAttribute('aria-label', `Attract shot ${shot.id}`);
    Object.assign(root.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '1',
      pointerEvents: 'none',
    });
    const surface = canvas.cloneNode() as HTMLCanvasElement;
    surface.id = `attract-${shot.id}`;
    surface.hidden = false;
    surface.style.display = 'block';
    canvas.parentElement!.append(root);
    root.append(surface);
    const handle = start(surface);
    const walk = firstPersonOn(surface);
    const draw = rendererOn(surface);
    if (!walk || !draw) return;
    // A quarter of the resolution each way: the room's own, less the
    // player's render quality, divided by four.
    const full =
      draw.renderer.getPixelRatio() / renderScale(settings.value.renderLevel);
    draw.renderer.setPixelRatio(full / 4);
    shown = { room, root, handle, walk, store };
    torch.on = !!shot.torch;
    store.run(true);
    // Where the sequence has chosen it starts, round its move.
    placeShot(walk, shot, state.shotTime);
    builtFor = index;
    // A few frames drawn behind the black before it fades in.
    seenFrom = performance.now() + 250;
  };
  const unbindTitleShortcuts = bindTitleShortcuts(
    (command) => {
      state = controlAttract(state, command);
      // Restart also rebuilds the same scene on a fresh scenario world. Invalidate
      // an outstanding import so rapid presses cannot show an outdated request.
      presentation++;
      builtFor = -1;
      titleVeil.style.opacity = '1';
    },
    // A screenshot of the shot playing, unless the menu or the console
    // has the keyboard (prompt 084).
    () => {
      if (!pauseMenu.isOpen && !consoleOpen.value) copyScreenshot();
    },
  );
  titleBackdrop = {
    stop() {
      unbindTitleShortcuts();
      stopped = true;
      cancelAnimationFrame(frame);
      titleVeil.hidden = true;
      document.body.classList.remove('on-title');
      letGo();
      torch.on = playerTorch;
      paused.value = false;
    },
    shown: () =>
      shown && state.phase !== 'black' && builtFor === state.shot
        ? shown.room
        : null,
  };
  paused.value = true;
  app.hidden = false;
  document.body.classList.add('on-title');
  titleVeil.hidden = false;
  titleVeil.style.opacity = '1';
  let last = performance.now();
  const fly = (now: number) => {
    frame = requestAnimationFrame(fly);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    // Black, and the shot to come not built: build it.
    if (state.phase === 'black' && builtFor !== state.shot && !building) {
      building = true;
      void present(state.shot)
        .catch(showError)
        .finally(() => (building = false));
    }
    const ready = builtFor === state.shot && now >= seenFrom;
    state = stepAttract(state, dt, ATTRACT_SHOTS, ready);
    titleVeil.style.opacity = String(attractBlack(state));
    // Its room's code fetched while this shot shows, so it builds sooner.
    if (state.phase === 'showing' && state.t < dt)
      void starter(
        resolveRoomId(ATTRACT_SHOTS[nextShot(state, ATTRACT_SHOTS)].room)!,
      ).catch(() => {});
    if (shown && state.phase !== 'black' && builtFor === state.shot) {
      placeShot(shown.walk, ATTRACT_SHOTS[state.shot], state.shotTime);
    }
  };
  frame = requestAnimationFrame(fly);
};
/**
 * An attract shot played end to end for recording (`?record=<shot id>`,
 * the owner, 2026-10-29: each fly-by whole, for the itch.io page and
 * trailer; `scripts/record-attract.ts`): its room on its scenario's world
 * at full resolution, with no title, veil, blur or HUD. The recorder drives
 * it: `window.attractRecording.at(seconds)` puts the camera there, and the
 * recorder steps the page's clock and takes each frame from `canvas`.
 */
const startAttractRecording = async (id: string) => {
  const shot = ATTRACT_SHOTS.find((s) => s.id === id);
  const room = shot && resolveRoomId(shot.room);
  if (!shot || !room) throw new Error(`No attract shot ${id}`);
  partAudio.setGameMuted(true);
  paused.value = true;
  titleScreen.hide();
  directory.hidden = true;
  const start = await starter(room);
  const store = createScenarioStore(attractScenario(shot.scenario));
  setRoomWorld(store);
  const surface = canvas.cloneNode() as HTMLCanvasElement;
  surface.id = `record-${shot.id}`;
  surface.hidden = false;
  surface.style.display = 'block';
  Object.assign(surface.style, { position: 'fixed', inset: '0' });
  document.body.append(surface);
  start(surface);
  const walk = firstPersonOn(surface);
  const draw = rendererOn(surface);
  if (!walk || !draw) throw new Error(`Shot ${id} has no view`);
  drawAtRatio(draw.renderer, Number(urlParams().get('scale') ?? 1));
  torch.on = !!shot.torch;
  store.run(true);
  placeShot(walk, shot, 0);
  const seconds = shot.path?.period ?? shot.seconds;
  (window as unknown as { attractRecording: unknown }).attractRecording = {
    seconds,
    canvas: surface,
    at: (t: number) => placeShot(walk, shot, t),
  };
};
const urlParams = () => new URLSearchParams(location.search);
const stopTitleBackdrop = () => {
  titleBackdrop?.stop();
  titleBackdrop = null;
  partAudio.setGameMuted(false);
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
    noclip.value = false;
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
    } else if (params.has('record')) {
      stopTitleBackdrop();
      void startAttractRecording(params.get('record')!).catch(showError);
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
  // Known to exist: an unknown one went to the title above. A camera
  // shot's link (`noclip=true`) opens in noclip, before the view is placed,
  // so it is placed where the link says, off the floor if need be.
  noclip.value = params.get('noclip') === 'true';
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
  // Its baked occlusion first; the baker still while it settles in.
  focusRoom(room);
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
    // Degrees clockwise; a link without it is level.
    control.roll = ((number('roll') ?? 0) * Math.PI) / 180;
  }
  loaded.handle.resume?.();
  rememberPlayer();
  if (peekBack(keyOf(room))) void startDryPeek().catch(showError);
  void preloadCluster().catch(showError);
};
window.addEventListener('pool-plant:coordinate-hop', (event) => {
  if (noclip.value) return;
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
    tools.prepend(positionButton, screenshotButton);
    tools.append(settingsButton);
  } else
    positionOverlay.append(positionButton, screenshotButton, settingsButton);
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
/** The closest closed-door room's code is fetched without mounting its scene. */
let prefetchedNeighbour: RoomId | null = null;
/** Construct only rooms that the existing loop or an open doorway needs. */
const ensureBuilt = (room: RoomId) => {
  const key = keyOf(room);
  if (rooms.has(key)) return !loading.has(room);
  if (loading.has(room)) return false;
  loading.add(room);
  void starter(room)
    .then((start) => {
      if (!rooms.has(key)) mount(room, start);
    })
    .catch(showError)
    .finally(() => loading.delete(room));
  return false;
};
const checkDoors = () => {
  if (!current || app.hidden || noclip.value) {
    prefetchedNeighbour = null;
    return stopSeeing();
  }
  const top = current as RoomId;
  const surface = surfaceOf(keyOf(top));
  const eye = surface && firstPersonOn(surface)?.pose();
  const door = openDoorJoint(top);
  // Import code ahead of the nearest closed door. An idle callback cannot
  // make synchronous scene construction or a first composer render nonblocking.
  const nearest = eye ? nearestJoint(top, eye.x, eye.z) : null;
  if (!door && nearest && nearest !== prefetchedNeighbour) {
    // Speculative failures stay quiet; the cache retries on an actual request.
    void starter(nearest).catch(() => {});
  }
  prefetchedNeighbour = door ? null : nearest;
  const beside = new Set(lazyNeighbours(top));
  for (const room of beside) {
    lazilyBuilt.add(room);
    ensureBuilt(room);
  }
  // Keep an already visited nearest room cached, without building a new one.
  if (nearest) beside.add(nearest);
  if (door) {
    beside.add(door);
    lazilyBuilt.add(door);
  }
  if (beside.size) lazilyBuilt.add(top);
  for (const room of lazilyBuilt)
    if (
      keyOf(room) !== current &&
      !beside.has(room) &&
      seeing?.under !== room &&
      !loading.has(room)
    ) {
      lazilyBuilt.delete(room);
      release(room);
    }
  const to = openJoint(top);
  if (seeing && (seeing.top !== top || seeing.under !== to)) stopSeeing();
  if (seeing || !to) return;
  if (!ensureBuilt(to)) return;
  startSeeing(top, to);
};
const jacuzziAmbience = createJacuzziAmbience();
const watchDoors = () => {
  requestAnimationFrame(watchDoors);
  checkDoors();
  const surface = current && surfaceOf(current);
  const pose = surface && firstPersonOn(surface)?.pose();
  jacuzziAmbience.setGain(
    current && pose && !app.hidden
      ? jacuzziApproachGain(current, pose.x / METRE, pose.z / METRE)
      : 0,
  );
};
requestAnimationFrame(watchDoors);
// ---- The lift's floor ahead, prepared unseen (mission 108) ----------------
// While a lift's car runs, the room ahead is built (its joint from the car
// is lazy, so `checkDoors` builds it) and warmed: one frame drawn unseen,
// its eye just inside its landing looking into the room, so its shaders
// are compiled and its textures uploaded before the doors open on it. The
// car does not arrive until this resolves (`room-readiness.ts`). Each
// room's time to build and warm is kept, for sizing the rides.
const liftTimings: { room: string; builtMs: number; warmedMs: number }[] = [];
(window as unknown as { liftTimings: unknown }).liftTimings = liftTimings;
if (import.meta.env.DEV)
  Object.assign(window, {
    /** `prepareRoom('museum0')`: build and warm a room unseen, timed. */
    prepareRoom: (room: string) => prepareRoom(room),
    /** `setLiftDelay(8)`: the floor ahead ready that much later. */
    setLiftDelay: (seconds: number) => (liftDelaySeconds = seconds),
  });
const warmRoom = async (room: RoomId) => {
  const entry = rooms.get(keyOf(room));
  const surface = surfaceOf(keyOf(room));
  if (!entry || !surface) return;
  const handle = entry.handle as RoomHandle & { warm?: () => unknown };
  await handle.warm?.();
  if (keyOf(room) === current || seeing?.under === room) return;
  const draw = rendererOn(surface);
  const walk = firstPersonOn(surface);
  const car = (['freight_lift', 'dev54'] as RoomId[]).find((c) =>
    jointOf(room, c),
  );
  const frame = car && jointOf(room, car)?.frame;
  if (walk && frame) {
    // 2 m in, looking into the room: clear of its doorway's curtain.
    const pitch = walk.pose().pitch;
    walk.place(
      frame.x + Math.sin(frame.yaw) * 2 * METRE,
      frame.z + Math.cos(frame.yaw) * 2 * METRE,
      Math.PI - frame.yaw,
      pitch,
    );
  }
  const hidden = entry.root.hidden;
  entry.root.hidden = false;
  entry.root.style.visibility = 'hidden';
  try {
    draw?.loop?.(draw.time);
  } finally {
    entry.root.style.visibility = '';
    entry.root.hidden = hidden;
  }
};
/**
 * In development, `?liftDelay=8` keeps every floor ahead loading that many
 * seconds longer, to see the car linger short of it (mission 108).
 */
const liftDelay = () =>
  import.meta.env.DEV
    ? Math.max(
        0,
        Number(new URLSearchParams(location.search).get('liftDelay')) || 0,
      )
    : 0;
let liftDelaySeconds = liftDelay();
setRoomPreparer(
  (name) =>
    new Promise<void>((resolve) => {
      const room = name as RoomId;
      const t0 = performance.now();
      const extra = liftDelaySeconds * 1000;
      const wait = () => {
        if (!ensureBuilt(room)) return void window.setTimeout(wait, 50);
        const built = performance.now();
        void warmRoom(room)
          .catch(() => {})
          .then(() => {
            const warmed = performance.now();
            const timing = {
              room,
              builtMs: Math.round(built - t0),
              warmedMs: Math.round(warmed - built),
            };
            liftTimings.push(timing);
            console.info('[lift] floor ahead ready', timing);
            window.setTimeout(resolve, extra);
          });
      };
      wait();
    }),
);
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
  // A hand-over: the baker still a moment, the room walked into first.
  focusRoom(to);
  showOnTop(keyOf(to));
  entry.handle.enter?.(from, to);
  // Where the walker was, as the doorway carries it, the door with it.
  toWalk.place(there.x, there.z, there.yaw, eye.pitch, there.y ?? eye.y);
  toWalk.roll = eye.roll ?? 0;
  // And its zoom: the room beyond was drawn at this eye's field of view,
  // and goes on at it rather than at whatever zoom it was last left at.
  toWalk.zoom = fromWalk.zoom;
  far.swingTo(-angle);
  entry.handle.resume?.();
  // The room left behind is drawn underneath from the next frame.
  startSeeing(to, from);
  return true;
};
const travel = (event: Event) => {
  if (noclip.value) return;
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
  if (noclip.value) return;
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
    const roll = ((control.roll * 180) / Math.PI).toFixed(1);
    if (Number(roll) !== 0) url.searchParams.set('roll', roll);
    else url.searchParams.delete('roll');
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
      focusRoom(id);
      showOnTop(current);
      loaded.root.hidden = false;
      loaded.handle.enter?.(null, id);
      const nextSurface = surfaceOf(current);
      const next = nextSurface ? firstPersonOn(nextSurface) : null;
      if (next && pose) {
        next.place(pose.x, pose.z, pose.yaw, pose.pitch, pose.y);
        next.roll = pose.roll ?? 0;
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
    window.clearInterval(positionSaveTimer);
    window.removeEventListener('pagehide', rememberPlayer);
    document.removeEventListener('visibilitychange', saveHiddenPosition);
    jacuzziAmbience.dispose();
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

// Ctrl+Shift+N (the control scheme's chord): noclip on and off, as the
// pause menu's switch does, in a room only.
setNoclipToggle(() => {
  if (current === undefined || consoleOpen.value) return;
  const on = !noclip.value;
  if (on) rememberPlayer();
  noclip.value = on;
  if (on) {
    stopSeeing();
    stopDryPeek();
  }
});
