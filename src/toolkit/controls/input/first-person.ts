import type { Box3, Object3D, PerspectiveCamera } from 'three';
import { createObjectHandling } from './object-handling';
import type { DropPlacement } from './object-handling';
import type { PortableObject, SupportSurface } from './object-handling';
import { lockUnavailable } from '../logic/pointer-lock';
import { cutOpenings, slide } from '../logic/walk-collision';
import type { Footprint } from '../logic/walk-collision';
import { PAD, controlsHelp, deadZone } from '../logic/controls';
import type { InputMode } from '../logic/controls';
import { turningKnobs } from './knob-turning';
import { createTouchSticks } from './touch-sticks';
import { bindViewWheel } from './view-wheel';

/**
 * First-person walking, as in any PC shooter, with the same feel as the
 * lab: click to capture the mouse and look around, WASD or the arrow keys
 * to walk, Shift to run, C to crouch, V to crouch lower, click or E to use
 * whatever is under the crosshair, the wheel to zoom, Alt+wheel to change
 * eye height and Escape to get the cursor back. Where the browser refuses
 * to capture the mouse, dragging looks around and clicking uses whatever
 * is under the cursor.
 *
 * This is the game's one control scheme (`src/toolkit/controls/logic/controls.ts`), the
 * same in every room: rooms never bind a control themselves. On a touch
 * screen, two on-screen thumbsticks, the left to walk (to the rim to run)
 * and the right to look; a drag anywhere else looks too, a tap uses what
 * it touches, a two-finger pinch zooms and a button crouches. On a
 * gamepad, the left stick walks (click it to run), the right stick looks,
 * A uses, LB and RB turn a knob down and up, the triggers zoom and B
 * crouches. A help line at the foot of the screen gives the controls for
 * the input in use.
 *
 * The numbers match the lab's walker in `start-scene.ts`; keep the two in
 * step if either changes.
 */

export const EYE_HEIGHT_METRES = 1.8034;
export const WALK_METRES_PER_SECOND = 2;
export const RUN_METRES_PER_SECOND = 4.2;
export const LOOK_RADIANS_PER_PIXEL = 0.0022;
export const PITCH_LIMIT = 1.45;
export const WALKER_RADIUS_METRES = 0.25;
/** Zoom range: 1 is the normal field of view, 4 is four times closer. */
export const MIN_ZOOM = 0.65;
export const MAX_ZOOM = 4;

/**
 * How much one wheel event zooms. Mice, the Magic Mouse's swipe and the
 * Arc Mouse's touch strip all report scrolling differently: in lines or
 * pixels, in large notches or a smooth stream with momentum. Convert to
 * pixels, cap each event so a hard flick cannot jump to a limit, and zoom
 * exponentially, so the same swipe feels the same at any magnification.
 */
export function wheelZoom(zoom: number, deltaY: number, deltaMode: number) {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 800 : 1);
  const step = Math.max(-200, Math.min(200, pixels));
  return Math.max(
    MIN_ZOOM,
    Math.min(MAX_ZOOM, zoom * Math.exp(-step * 0.0015)),
  );
}

/** How fast a look stick turns the head at full deflection, rad/s. */
export const TOUCH_LOOK_RADIANS_PER_SECOND = 2.2;
/** A walk stick pushed this far, or further, runs. */
export const RUN_DEFLECTION = 0.95;

/**
 * Zoom under a two-finger pinch: the zoom when the fingers came down,
 * scaled by how far apart they are now against how far apart they were,
 * within the zoom limits.
 */
export function pinchZoom(zoom: number, from: number, to: number) {
  if (from <= 0 || to <= 0) return zoom;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (zoom * to) / from));
}

/** Crouching from any non-standard height first restores normal standing. */
export function changeStance(
  state: {
    eyeOffset: number;
    crouched: boolean;
    lowCrouched: boolean;
    crouch: number;
  },
  low = false,
) {
  if (
    Math.abs(state.eyeOffset) > 0.000001 ||
    state.crouched ||
    state.lowCrouched ||
    state.crouch > 0.001
  ) {
    state.eyeOffset = 0;
    state.crouched = false;
    state.lowCrouched = false;
    state.crouch = 0;
  } else {
    state.crouched = true;
    state.lowCrouched = low;
  }
}

const WALK_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ShiftLeft',
  'ShiftRight',
]);

export interface FirstPersonOptions {
  canvas: HTMLCanvasElement;
  camera: PerspectiveCamera;
  /** Scene units per metre. */
  metre: number;
  /** Height of the floor in scene units. */
  floorY: number;
  start: { x: number; z: number; yaw?: number; pitch?: number };
  /** Solid footprints on the floor plan, in scene units. */
  solids?: () => readonly Footprint[];
  /** World objects for the shared pickup/drop interaction. */
  objects?: Object3D;
  supports?: () => readonly SupportSurface[];
  /** Take a released object instead of dropping it (`createObjectHandling`). */
  divert?: (object: Object3D, portable: PortableObject) => boolean;
  redirectDrop?: (placement: DropPlacement) => DropPlacement;
  carrySolids?: () => readonly Box3[];
  heldAction?: (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ) => boolean | 'refuse';
  targetFeedback?: (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ) => 'accept' | 'reject' | null;
  nearbyTargetFeedback?: (
    object: Object3D,
    portable: PortableObject,
  ) => 'accept' | 'reject' | null;
  allowPickup?: (object: Object3D, portable: PortableObject) => boolean;
  /** Use whatever is at a normalised screen point (centre is 0, 0). */
  use: (x: number, y: number) => void;
  /** Operate a separate control while carrying, without releasing the part. */
  useWhileHolding?: (object: Object3D, x: number, y: number) => boolean;
  /** Whether something usable is under the crosshair. */
  aimed?: () => boolean;
  reducedMotion?: () => boolean;
  /** Field of view in degrees at zoom 1. */
  fov?: number;
}

/** Where the eye is and how it looks, to drive another room's camera. */
export interface EyePose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  /** The camera's field of view now, degrees. */
  fov: number;
}

/**
 * Each room's controller by its canvas, so that the app can drive one
 * room's camera from another's (seeing through a doorway into a room drawn
 * underneath, `src/main.ts`) and cut a doorway through its walls while a
 * door is open. It binds no input.
 */
const controllers = new WeakMap<
  HTMLCanvasElement,
  ReturnType<typeof createFirstPerson>
>();
export function firstPersonOn(canvas: HTMLCanvasElement) {
  return controllers.get(canvas) ?? null;
}

export function createFirstPerson(options: FirstPersonOptions) {
  const { canvas, camera, metre, floorY } = options;
  const handling = options.objects
    ? createObjectHandling(
        options.objects,
        camera,
        metre,
        floorY,
        options.supports,
        options.divert,
        options.redirectDrop,
        options.carrySolids,
        options.heldAction,
        options.allowPickup,
        options.targetFeedback,
        options.nearbyTargetFeedback,
      )
    : null;
  const use = (x: number, y: number) => {
    const carried = handling?.heldObject();
    if (carried && options.useWhileHolding?.(carried, x, y)) return;
    if (!handling?.use(x, y)) options.use(x, y);
  };
  const walker = {
    x: options.start.x,
    z: options.start.z,
    yaw: options.start.yaw ?? 0,
    pitch: options.start.pitch ?? 0,
    crouched: false,
    lowCrouched: false,
    crouch: 0,
    stride: 0,
    eyeOffset: 0,
    zoom: 1,
  };
  const keys = new Set<string>();
  // Keys pressed since the last frame: a tap shorter than a frame still
  // takes a step, however slowly the room draws.
  const tapped = new Set<string>();
  const nudge = { forward: 0, right: 0 };
  let lockRefused = false;
  /** When the mouse was last released (Esc), for the browser's cooldown. */
  let releasedAt = -Infinity;
  // While held, the room has the camera: no input walks or looks.
  let holding = false;
  /**
   * While followed, another room has the camera: this room is drawn under
   * it, seen through a doorway, its eye where the other's would be.
   */
  let following: (() => EyePose | null) | null = null;
  /** Doorways cut through the walls (`cutOpenings`), while doors are open. */
  let openings: () => readonly Footprint[] = () => [];

  const crosshair = document.createElement('div');
  crosshair.setAttribute('aria-hidden', 'true');
  crosshair.hidden = true;
  Object.assign(crosshair.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '8px',
    height: '8px',
    margin: '-4px 0 0 -4px',
    border: '2px solid rgba(233, 225, 200, 0.85)',
    borderRadius: '50%',
    pointerEvents: 'none',
  });
  canvas.parentElement?.appendChild(crosshair);

  // The same small walking buttons as the lab, also usable without mouse capture.
  const movement = document.createElement('div');
  movement.setAttribute('role', 'group');
  movement.setAttribute('aria-label', 'Movement');
  Object.assign(movement.style, {
    position: 'absolute',
    left: '12px',
    bottom: '12px',
    display: 'flex',
    gap: '4px',
    padding: '6px',
    background: '#20302bdd',
  });
  for (const [caption, label, forward, right] of [
    ['◀', 'Step left', 0, -1],
    ['▲', 'Step forward', 1, 0],
    ['▼', 'Step back', -1, 0],
    ['▶', 'Step right', 0, 1],
  ] as const) {
    const button = document.createElement('button');
    button.textContent = caption;
    button.setAttribute('aria-label', label);
    Object.assign(button.style, {
      color: '#e8e2cc',
      background: '#34453c',
      border: '1px solid #baac80',
      padding: '8px',
    });
    button.addEventListener('click', () => {
      nudge.forward += forward * 0.45 * metre;
      nudge.right += right * 0.45 * metre;
    });
    movement.append(button);
  }
  canvas.parentElement?.append(movement);

  // The mouse is captured on the app, not this room's canvas, so it stays
  // captured as one room hands over to another through a doorway; it is
  // this room's while this room is the one shown and not following.
  const lockTarget: Element =
    (typeof canvas.closest === 'function' && canvas.closest('#app')) || canvas;
  const current = () =>
    !following &&
    !(typeof canvas.closest === 'function' && canvas.closest('[hidden]'));
  const locked = () => document.pointerLockElement === lockTarget && current();

  // Touch: twin thumbsticks and a crouch button, shown while the last
  // input was a finger.
  const container = canvas.parentElement;
  const sticks = container ? createTouchSticks(container) : null;
  const crouchButton = document.createElement('button');
  crouchButton.type = 'button';
  crouchButton.className = 'touch-crouch';
  crouchButton.textContent = 'CROUCH';
  crouchButton.addEventListener('click', () => {
    changeStance(walker);
  });
  container?.append(crouchButton);
  const inspectButton = document.createElement('button');
  inspectButton.type = 'button';
  inspectButton.className = 'touch-crouch';
  inspectButton.textContent = 'INSPECT';
  inspectButton.style.left = '80px';
  let touchInspect = false;
  inspectButton.addEventListener('pointerdown', (event) => {
    event.stopPropagation();
    touchInspect = true;
  });
  const stopInspect = () => (touchInspect = false);
  inspectButton.addEventListener('pointerup', stopInspect);
  inspectButton.addEventListener('pointercancel', stopInspect);
  container?.append(inspectButton);
  // The controls for the input in use, at the foot of the screen.
  const help = document.createElement('div');
  help.className = 'controls-help';
  help.setAttribute('aria-live', 'polite');
  container?.append(help);
  let input: InputMode | undefined;
  // On a touch screen the help line covers the view, so it fades after a
  // while; it comes back when the input changes or the room is entered.
  let fading: ReturnType<typeof setTimeout> | undefined;
  const showHelp = () => {
    help.classList.remove('is-faded');
    clearTimeout(fading);
    if (input === 'touch')
      fading = setTimeout(() => help.classList.add('is-faded'), 10_000);
  };
  const setInput = (mode: InputMode) => {
    if (!container || input === mode) return;
    input = mode;
    container.dataset.input = mode;
    movement.style.display = mode === 'mouse' ? 'flex' : 'none';
    help.textContent = controlsHelp(mode);
    showHelp();
    crosshair.hidden = !(
      locked() ||
      mode === 'gamepad' ||
      (mode === 'mouse' && handling?.holding())
    );
    if (mode !== 'touch') sticks?.reset();
  };
  setInput(
    typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
      ? 'touch'
      : 'mouse',
  );
  const noticeInput = (event: PointerEvent) =>
    setInput(event.pointerType === 'mouse' ? 'mouse' : 'touch');
  // Safari's own pinch would zoom the page; the pinch here zooms the view.
  const stopGesture = (event: Event) => event.preventDefault();

  const typing = (event: Event) =>
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement;
  const clampPitch = (pitch: number) =>
    Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

  const keydown = (event: KeyboardEvent) => {
    if (canvas.parentElement?.hidden || following) return;
    if (typing(event)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (WALK_KEYS.has(event.code) || event.code === 'KeyX') {
      setInput('mouse');
      keys.add(event.code);
      tapped.add(event.code);
      if (event.code.startsWith('Arrow')) event.preventDefault();
    }
    if (event.repeat) return;
    if (event.code === 'KeyC') changeStance(walker);
    if (event.code === 'KeyV') changeStance(walker, true);
    if (event.code === 'KeyE') use(0, 0);
  };
  const keyup = (event: KeyboardEvent) => keys.delete(event.code);
  const forget = () => {
    keys.clear();
    tapped.clear();
    touchInspect = false;
  };
  const look = (event: MouseEvent) => {
    if (!locked()) return;
    setInput('mouse');
    if (holding) return;
    // Looking slows as the view zooms in, so small controls stay easy to aim at.
    const rate = LOOK_RADIANS_PER_PIXEL / walker.zoom;
    if (handling?.holding() && keys.has('KeyX')) {
      handling.rotate(event.movementX * rate, event.movementY * rate);
      return;
    }
    walker.yaw += event.movementX * rate;
    walker.pitch = clampPitch(walker.pitch - event.movementY * rate);
  };
  const lockChange = () => {
    crosshair.hidden = !(
      locked() ||
      input === 'gamepad' ||
      handling?.holding()
    );
    if (!locked()) {
      forget();
      releasedAt = performance.now();
    }
  };
  // Refused straight after Esc, the next click tries again; refused
  // otherwise, capture is not allowed here and looking is by dragging.
  const refuseLock = () => {
    if (lockUnavailable(performance.now() - releasedAt)) lockRefused = true;
  };

  // Without a captured mouse, dragging looks and a still click uses.
  let drag: {
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    moved: boolean;
    previousX: number;
    previousY: number;
  } | null = null;
  const screenPoint = (x: number, y: number): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1,
    ];
  };
  let hoverPoint: [number, number] = [0, 0];
  let hoverPosition: [number, number] = [0, 0];
  // Fingers on the canvas, for the pinch.
  const fingers = new Map<number, { x: number; y: number }>();
  let pinch: { distance: number; zoom: number } | null = null;
  const spread = () => {
    const [a, b] = [...fingers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      canvas.setPointerCapture(event.pointerId);
      if (fingers.size === 2) {
        // A second finger turns the drag into a pinch.
        drag = null;
        pinch = { distance: spread(), zoom: walker.zoom };
        return;
      }
      if (fingers.size > 2) return;
    }
    if (following) return;
    if (event.pointerType === 'mouse' && !lockRefused) {
      if (event.button !== 0) return;
      if (locked()) use(0, 0);
      else
        void Promise.resolve(lockTarget.requestPointerLock()).catch(refuseLock);
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drag = {
      x: event.clientX,
      y: event.clientY,
      yaw: walker.yaw,
      pitch: walker.pitch,
      moved: false,
      previousX: event.clientX,
      previousY: event.clientY,
    };
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && !locked()) {
      hoverPoint = screenPoint(event.clientX, event.clientY);
      const rect = canvas.getBoundingClientRect();
      hoverPosition = [event.clientX - rect.left, event.clientY - rect.top];
    }
    const finger = fingers.get(event.pointerId);
    if (finger) {
      finger.x = event.clientX;
      finger.y = event.clientY;
      if (pinch && fingers.size >= 2) {
        walker.zoom = pinchZoom(pinch.zoom, pinch.distance, spread());
        return;
      }
    }
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    // A fingertip wobbles more than a mouse: a touch must move further
    // before it counts as a drag rather than a tap.
    const slop = event.pointerType === 'mouse' ? 5 : 12;
    if (Math.hypot(dx, dy) > slop) drag.moved = true;
    if (!drag.moved || holding) return;
    if (touchInspect && handling?.holding()) {
      handling.rotate(
        (event.clientX - drag.previousX) * 0.004,
        (event.clientY - drag.previousY) * 0.003,
      );
      drag.previousX = event.clientX;
      drag.previousY = event.clientY;
      return;
    }
    walker.yaw = drag.yaw - (dx * 0.004) / walker.zoom;
    walker.pitch = clampPitch(drag.pitch + (dy * 0.003) / walker.zoom);
  };
  const up = (event: PointerEvent) => {
    fingers.delete(event.pointerId);
    // After a pinch, the fingers left behind neither look nor use.
    if (fingers.size < 2) pinch = null;
    if (!drag) return;
    // A tap works what the finger first touched, not where it lifted:
    // a fingertip wobbles off a small control as it comes away.
    if (!drag.moved) use(...screenPoint(drag.x, drag.y));
    drag = null;
  };
  // The wheel zooms and Alt+wheel raises and lowers the eye. A trackpad
  // pinch arrives as Ctrl+wheel, so it zooms too instead of zooming the
  // page.
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
    if (event.altKey) {
      walker.eyeOffset = Math.max(
        -1.1 * metre,
        Math.min(
          0.7 * metre,
          walker.eyeOffset - event.deltaY * scale * 0.004 * metre,
        ),
      );
      return;
    }
    walker.zoom = wheelZoom(walker.zoom, event.deltaY, event.deltaMode);
  };

  // A click while captured lands on the app, not the canvas.
  const lockedDown = (event: Event) => {
    if (event.target === canvas) return;
    const pointer = event as PointerEvent;
    if (pointer.button === 0 && locked()) use(0, 0);
  };
  if (lockTarget !== canvas)
    lockTarget.addEventListener('pointerdown', lockedDown);
  document.addEventListener('keydown', keydown);
  document.addEventListener('keyup', keyup);
  window.addEventListener('blur', forget);
  document.addEventListener('mousemove', look);
  document.addEventListener('pointerlockchange', lockChange);
  document.addEventListener('pointerlockerror', refuseLock);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  const unbindWheel = bindViewWheel(document, canvas, current, locked, wheel);
  container?.addEventListener('pointerdown', noticeInput, { capture: true });
  container?.addEventListener('gesturestart', stopGesture);

  // The gamepad, read each frame: sticks, triggers, and buttons acted on
  // as they go down.
  const pressed = new Set<number>();
  let padRun = false;
  const idle = {
    move: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    zoom: 0,
    run: false,
    inspect: false,
  };
  const readGamepad = () => {
    if (canvas.parentElement?.hidden || following) return idle;
    const pad =
      typeof navigator !== 'undefined' && navigator.getGamepads
        ? [...navigator.getGamepads()].find((p) => p?.mapping === 'standard')
        : undefined;
    if (!pad) return idle;
    const axis = (i: number) => pad.axes[i] ?? 0;
    const button = (i: number) => pad.buttons[i]?.value ?? 0;
    const move = deadZone(axis(0), axis(1));
    const look = deadZone(axis(2), axis(3));
    const zoom = button(PAD.zoomIn) - button(PAD.zoomOut);
    const went = (i: number) => {
      const down = (pad.buttons[i]?.pressed ?? false) === true;
      const was = pressed.has(i);
      if (down) pressed.add(i);
      else pressed.delete(i);
      return down && !was;
    };
    const active =
      Math.hypot(move.x, move.y) > 0 ||
      Math.hypot(look.x, look.y) > 0 ||
      Math.abs(zoom) > 0.05 ||
      pad.buttons.some((b) => b.pressed);
    if (active) setInput('gamepad');
    if (went(PAD.use)) use(0, 0);
    if (went(PAD.knobDown)) turningKnobs(-1, () => use(0, 0));
    if (went(PAD.knobUp)) turningKnobs(1, () => use(0, 0));
    if (went(PAD.crouch)) {
      changeStance(walker);
    }
    // A click of the walk stick runs until the stick comes back to centre.
    if (went(PAD.run)) padRun = true;
    if (!Math.hypot(move.x, move.y)) padRun = false;
    return {
      move,
      look,
      zoom,
      run: padRun,
      inspect: pad.buttons[3]?.pressed ?? false,
    };
  };

  const eyeY = floorY + EYE_HEIGHT_METRES * metre;
  const controller = {
    walker,
    locked,
    /** Where the eye is now, and how it looks. */
    pose(): EyePose {
      return {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: walker.yaw,
        pitch: walker.pitch,
        fov: camera.fov,
      };
    },
    /**
     * Have another room drive this one's camera (`pose`, read each frame;
     * null lets go): no input walks or looks here meanwhile, and the room
     * is drawn as seen from there.
     */
    follow(pose: (() => EyePose | null) | null) {
      following = pose;
      camera.userData.following = Boolean(pose);
      forget();
      if (!pose) {
        // Back to its own eye on the next frame.
        camera.fov = 0;
      }
    },
    get following() {
      return Boolean(following);
    },
    /** Doorways cut through the walls while their doors are open. */
    set openings(value: () => readonly Footprint[]) {
      openings = value;
    },
    /** Stand at (x, z) facing `yaw`, looking `pitch` up, with the eye at `y`. */
    place(x: number, z: number, yaw: number, pitch: number, y = eyeY) {
      walker.x = x;
      walker.z = z;
      walker.yaw = yaw;
      walker.pitch = clampPitch(pitch);
      walker.eyeOffset = y - eyeY;
      walker.crouched = false;
      walker.lowCrouched = false;
      walker.crouch = 0;
      sticks?.reset();
      showHelp();
    },
    /**
     * Hold the player still, or let go: while held, no input walks or
     * looks, and the room moves the camera (by `place`) as it needs to. It
     * binds nothing; uses still reach the room.
     */
    hold(on: boolean) {
      holding = on;
      forget();
      nudge.forward = 0;
      nudge.right = 0;
      sticks?.reset();
    },
    /** Walk and look for `delta` seconds, then place the camera. */
    update(delta: number) {
      if (following) {
        // Another room's eye: no walking, no looking, no crosshair.
        const eye = following();
        crosshair.hidden = true;
        if (!eye) return;
        camera.position.set(eye.x, eye.y, eye.z);
        camera.lookAt(
          eye.x + Math.sin(eye.yaw) * Math.cos(eye.pitch),
          eye.y + Math.sin(eye.pitch),
          eye.z - Math.cos(eye.yaw) * Math.cos(eye.pitch),
        );
        if (camera.fov !== eye.fov) {
          camera.fov = eye.fov;
          camera.updateProjectionMatrix();
        }
        handling?.update(delta);
        return;
      }
      const pad = readGamepad();
      const held = (...codes: string[]) =>
        codes.some((code) => keys.has(code) || tapped.has(code));
      // The keys and the walk stick add; the stick's push sets the pace.
      const still = holding ? 0 : 1;
      const ahead =
        still *
        ((held('KeyW', 'ArrowUp') ? 1 : 0) -
          (held('KeyS', 'ArrowDown') ? 1 : 0) -
          (sticks?.move.y ?? 0) -
          pad.move.y);
      const aside =
        still *
        ((held('KeyD', 'ArrowRight') ? 1 : 0) -
          (held('KeyA', 'ArrowLeft') ? 1 : 0) +
          (sticks?.move.x ?? 0) +
          pad.move.x);
      if (sticks && !holding) {
        // The look stick turns the head, slower as the view zooms in.
        const turn = (TOUCH_LOOK_RADIANS_PER_SECOND * delta) / walker.zoom;
        if (touchInspect && handling?.holding())
          handling.rotate(sticks.look.x * turn, sticks.look.y * turn * 0.75);
        else {
          walker.yaw += sticks.look.x * turn;
          walker.pitch = clampPitch(walker.pitch - sticks.look.y * turn * 0.75);
        }
      }
      if (!holding) {
        const turn = (TOUCH_LOOK_RADIANS_PER_SECOND * delta) / walker.zoom;
        if (pad.inspect && handling?.holding())
          handling.rotate(pad.look.x * turn, pad.look.y * turn * 0.75);
        else {
          walker.yaw += pad.look.x * turn;
          walker.pitch = clampPitch(walker.pitch - pad.look.y * turn * 0.75);
        }
        if (pad.zoom)
          walker.zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, walker.zoom * Math.exp(pad.zoom * 1.5 * delta)),
          );
      }
      const stickRun =
        Math.hypot(sticks?.move.x ?? 0, sticks?.move.y ?? 0) >= RUN_DEFLECTION;
      const length = Math.max(1, Math.hypot(ahead, aside));
      const speed =
        (held('ShiftLeft', 'ShiftRight') || stickRun || pad.run
          ? RUN_METRES_PER_SECOND
          : WALK_METRES_PER_SECOND) *
        metre *
        (walker.lowCrouched ? 0.3 : walker.crouched ? 0.5 : 1) *
        delta;
      tapped.clear();
      const forward = (ahead / length) * speed + still * nudge.forward;
      const right = (aside / length) * speed + still * nudge.right;
      nudge.forward = 0;
      nudge.right = 0;
      const cuts = openings();
      const next = slide(
        cuts.length
          ? cutOpenings(options.solids?.() ?? [], cuts)
          : (options.solids?.() ?? []),
        walker.x,
        walker.z,
        Math.sin(walker.yaw) * forward + Math.cos(walker.yaw) * right,
        -Math.cos(walker.yaw) * forward + Math.sin(walker.yaw) * right,
        WALKER_RADIUS_METRES * metre,
      );
      walker.stride += Math.hypot(next.x - walker.x, next.z - walker.z);
      walker.x = next.x;
      walker.z = next.z;
      walker.crouch +=
        ((walker.lowCrouched ? 1.85 : walker.crouched ? 1 : 0) -
          walker.crouch) *
        Math.min(1, delta * 10);
      const bob = options.reducedMotion?.()
        ? 0
        : Math.sin((walker.stride / metre) * Math.PI * 1.6) * 0.02 * metre;
      const y = eyeY + walker.eyeOffset - walker.crouch * 0.65 * metre + bob;
      camera.position.set(walker.x, y, walker.z);
      camera.lookAt(
        walker.x + Math.sin(walker.yaw) * Math.cos(walker.pitch),
        y + Math.sin(walker.pitch),
        walker.z - Math.cos(walker.yaw) * Math.cos(walker.pitch),
      );
      const fov = (options.fov ?? 52) / walker.zoom;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      handling?.update(delta);
      const cursorAim = input === 'mouse' && !locked();
      crosshair.hidden = !(
        locked() ||
        input === 'gamepad' ||
        handling?.holding()
      );
      if (!crosshair.hidden) {
        const target = handling?.targetFeedback(
          cursorAim ? hoverPoint[0] : 0,
          cursorAim ? hoverPoint[1] : 0,
        );
        crosshair.textContent = target === 'reject' ? '×' : '';
        Object.assign(crosshair.style, {
          left: cursorAim ? `${hoverPosition[0]}px` : '50%',
          top: cursorAim ? `${hoverPosition[1]}px` : '50%',
          width: target ? '18px' : '8px',
          height: target ? '18px' : '8px',
          margin: target ? '-9px 0 0 -9px' : '-4px 0 0 -4px',
          borderRadius: target === 'reject' ? '0' : '50%',
          borderColor:
            target === 'accept'
              ? '#44df70'
              : target === 'reject'
                ? 'transparent'
                : handling?.aimed() || options.aimed?.()
                  ? '#ffb43a'
                  : 'rgba(233, 225, 200, 0.85)',
          color: '#f04b43',
          fontSize: '26px',
          fontWeight: 'bold',
          lineHeight: '14px',
          textAlign: 'center',
        });
      }
    },
    dispose() {
      handling?.dispose();
      lockTarget.removeEventListener('pointerdown', lockedDown);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', forget);
      document.removeEventListener('mousemove', look);
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('pointerlockerror', refuseLock);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      unbindWheel();
      container?.removeEventListener('pointerdown', noticeInput, {
        capture: true,
      });
      container?.removeEventListener('gesturestart', stopGesture);
      sticks?.dispose();
      if (locked()) document.exitPointerLock();
      controllers.delete(canvas);
      crosshair.remove();
      movement.remove();
      crouchButton.remove();
      inspectButton.remove();
      clearTimeout(fading);
      help.remove();
    },
  };
  controllers.set(canvas, controller);
  return controller;
}
