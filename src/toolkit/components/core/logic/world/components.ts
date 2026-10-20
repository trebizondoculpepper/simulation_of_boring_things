import type { Attachment } from '../../../../controls/logic/drop-profile';
import { computed, effect, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';

/**
 * The component model: each panel part's own behaviour, apart from the
 * world model. The world model says what is true of the installation (the
 * plant is powered); a component has inputs, a state, how it looks, and
 * the sounds it makes, and it behaves properly whether or not anything in
 * the world is wired to it. Pure logic: a view draws a component from its
 * outputs, and the room plays its sounds where the part is.
 *
 * Every component keeps to the same rules:
 *
 * - **Inputs** are Power (whether its circuit is live) and Latch (whether
 *   it is locked where it is), each a plain on or off.
 * - **State** has one source of truth: a world value it is bound to, or,
 *   unbound, a state of its own.
 * - **Operating** it is the operator's action. It always makes its sound;
 *   the guards (power, latch, end stops) decide whether the state changes;
 *   only an operation writes to the world.
 * - **Setting** it from the model moves it silently: no sound, no write
 *   back, so the world and the part cannot drive each other in circles.
 * - **Events**: a component says what it did (`press`, `on`, `off`,
 *   `detent`, `end-stop`, `refused`, `trip`, `pull-in`, `blow`, ...). Its
 *   sounds are its part's (`src/toolkit/components/core/parts/parts.ts`), which defines them
 *   beside it and plays them where it stands; no room chooses them. The
 *   optional named `sounds` here remain for a component used on its own.
 * - **Self-acting parts** (a contactor, a breaker's trip, a fuse, a
 *   capacitor) are moved by what flows through them, not by a hand. They
 *   follow their state, whatever moved it, and sound as they act: a
 *   contactor clunks as it pulls in, a fuse pops as it blows. An
 *   operator's action on one (resetting an overload, replacing a fuse)
 *   is guarded like any other.
 * - **dispose** drops its listeners, so a part in a hidden room is silent.
 */

/** Anything with a value that can be read, tracked: a signal or a vertex. */
export interface Readable<T> {
  readonly value: T;
}

/** Something in the world a component can show and set. */
export interface Binding<T> extends Readable<T> {
  set(value: T): void;
}

/** What a component did, for the room to make a sound of. */
export type PartEvent =
  /** A button or key pushed in. */
  | 'press'
  /** A two-position switch thrown on, or off. */
  | 'on'
  | 'off'
  /** A knob or selector clicked into its next detent. */
  | 'detent'
  /** A knob or selector turned against its end stop. */
  | 'end-stop'
  /** A part that would not move: latched, or locked by its key. */
  | 'refused'
  /** A maintained push button pulled back out. */
  | 'release'
  /** A breaker or overload relay tripping by itself. */
  | 'trip'
  /** A contactor or relay pulling in, and dropping out. */
  | 'pull-in'
  | 'drop-out'
  /** A fuse blowing. */
  | 'blow'
  /** A capacitor bulging, and venting. */
  | 'bulge'
  | 'vent'
  | 'pick-up'
  | 'drop'
  | 'impact';

/** What a part's state sound can depend on. */
export interface PartState {
  /** On, pressed in, or past its first position. */
  on: boolean;
  powered: boolean;
  latched: boolean;
  /** A selector's detent, from 0; a switch's 0 or 1. */
  position: number;
}

/** The sounds a part makes, by name, for the room to play. */
export interface PartSounds {
  /**
   * The sound for each transition. Left out, the room's default for the
   * kind of part plays; `null` makes the transition silent.
   */
  transitions?: Partial<Record<PartEvent, string | null>>;
  /** The sound held while the part's state calls for it, or none. */
  state?: (state: PartState) => string | null;
}

/** A transition, with the sound the part names for it, if any. */
export type PartListener = (
  event: PartEvent,
  sound: string | null | undefined,
) => void;

interface Common {
  power?: Readable<boolean>;
  latch?: Readable<boolean>;
  sounds?: PartSounds;
}

/** The listeners and sounds every component has. */
function events(sounds: PartSounds | undefined, state: () => PartState) {
  const listeners = new Set<PartListener>();
  return {
    emit(event: PartEvent) {
      const sound = sounds?.transitions?.[event];
      for (const listener of listeners) listener(event, sound);
    },
    /** The state sound it is making now, if any. */
    held: computed(() => sounds?.state?.(state()) ?? null),
    /** Hear what it does; returns a function that stops listening. */
    onEvent(listener: PartListener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
    },
  };
}

/** A state that is a bound world value, or the part's own. */
function source<T>(bound: Binding<T> | undefined, initial: T) {
  const own = signal(initial);
  const value = computed(() => (bound ? bound.value : own.value));
  return {
    value,
    write(next: T) {
      if (bound) bound.set(next);
      else own.value = next;
    },
    /** Move it without a sound or an operation: the model moved it. */
    quietly(next: T) {
      own.value = next;
    },
  };
}

const inputs = ({ power, latch }: Common) => ({
  powered: computed(() => power?.value ?? true),
  latched: computed(() => latch?.value ?? false),
});

// ---- LED pushbutton ----------------------------------------------------------

export interface LedPushbuttonInputs extends Common {
  /** A world value it is wired to; unbound, it keeps its own state. */
  bound?: Binding<boolean>;
  initial?: boolean;
}

/**
 * An LED pushbutton, push-on, push-off.
 *
 * Inputs: Power and Latch. Output: its State, on or off.
 *
 * When pushed it always clicks, whatever its power and latch. With no
 * power its LED is always off and a press changes nothing; powered and
 * unlatched, a press toggles the state; powered and latched, a press does
 * not change the state. The LED shows the state while powered.
 */
export function createLedPushbutton(options: LedPushbuttonInputs = {}) {
  const { powered, latched } = inputs(options);
  const state = source(options.bound, options.initial ?? false);
  const lit = computed(() => powered.value && state.value.value);
  const e = events(options.sounds, () => ({
    on: state.value.value,
    powered: powered.value,
    latched: latched.value,
    position: state.value.value ? 1 : 0,
  }));
  return {
    kind: 'led pushbutton' as const,
    /** The state sound it is making now, if any. */
    held: e.held as ReadonlySignal<string | null>,
    state: state.value as ReadonlySignal<boolean>,
    lit: lit as ReadonlySignal<boolean>,
    powered: powered as ReadonlySignal<boolean>,
    latched: latched as ReadonlySignal<boolean>,
    /** Push it. Returns whether its state changed. */
    press(): boolean {
      e.emit('press');
      if (!powered.peek() || latched.peek()) return false;
      const next = !state.value.peek();
      state.write(next);
      return state.value.peek() === next;
    },
    /** The model moved it: unbound only, and silent. */
    set: (on: boolean) => state.quietly(on),
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Momentary pushbutton ----------------------------------------------------

export interface MomentaryInputs extends Common {
  /** What it does, when a press gets through. */
  action?: () => void;
  /** A lamp in it, lit by something else (and only while powered). */
  lamp?: Readable<boolean>;
}

/**
 * A momentary pushbutton, keycap or spring-return handle: it does its
 * action as it goes in and springs back by itself. It always clicks; the
 * action happens only while it is powered and unlatched. Its lamp, if it
 * has one, shows whatever drives it, while powered.
 */
export function createMomentary(options: MomentaryInputs = {}) {
  const { powered, latched } = inputs(options);
  const lit = computed(() => powered.value && (options.lamp?.value ?? false));
  const e = events(options.sounds, () => ({
    on: lit.value,
    powered: powered.value,
    latched: latched.value,
    position: 0,
  }));
  return {
    kind: 'momentary' as const,
    held: e.held as ReadonlySignal<string | null>,
    lit: lit as ReadonlySignal<boolean>,
    powered: powered as ReadonlySignal<boolean>,
    latched: latched as ReadonlySignal<boolean>,
    /** Push it. Returns whether its action happened. */
    press(): boolean {
      e.emit('press');
      if (!powered.peek() || latched.peek()) return false;
      options.action?.();
      return true;
    },
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Two-position switch -----------------------------------------------------

export interface SwitchInputs extends Common {
  bound?: Binding<boolean>;
  initial?: boolean;
}

/**
 * A two-position switch that stays where it is put: toggle, rocker, key
 * switch, isolator, wall switch. It is mechanical, so it throws whether or
 * not its circuit is live; Power only lights its lamp, if it has one. A
 * latched switch (guarded, padlocked, its key taken out) will not move.
 * It sounds `on` or `off` as it goes over, or `refused` when it will not.
 */
export function createSwitch(options: SwitchInputs = {}) {
  const { powered, latched } = inputs(options);
  const state = source(options.bound, options.initial ?? false);
  const lit = computed(() => powered.value && state.value.value);
  const e = events(options.sounds, () => ({
    on: state.value.value,
    powered: powered.value,
    latched: latched.value,
    position: state.value.value ? 1 : 0,
  }));
  return {
    kind: 'switch' as const,
    held: e.held as ReadonlySignal<string | null>,
    state: state.value as ReadonlySignal<boolean>,
    lit: lit as ReadonlySignal<boolean>,
    powered: powered as ReadonlySignal<boolean>,
    latched: latched as ReadonlySignal<boolean>,
    /** Throw it. Returns whether it moved. */
    flip(): boolean {
      if (latched.peek()) {
        e.emit('refused');
        return false;
      }
      const next = !state.value.peek();
      state.write(next);
      e.emit(next ? 'on' : 'off');
      return state.value.peek() === next;
    },
    set: (on: boolean) => state.quietly(on),
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Detented selector -------------------------------------------------------

export interface SelectorInputs extends Common {
  /** How many positions it clicks between: 21 for a 20-step knob. */
  positions: number;
  /**
   * A world value it is wired to, from 0 at the first position to 1 at
   * the last; a value between detents shows at the nearest.
   */
  bound?: Binding<number>;
  /** Its own position to begin with, when unbound. */
  initial?: number;
}

/**
 * A knob, rotary selector or slide switch with detents, turned one detent
 * at a time: -1 anticlockwise (down), 1 clockwise (up). It stops at its
 * ends rather than wrapping round. It is mechanical, so it turns whether
 * or not its circuit is live; latched, it will not turn. It sounds
 * `detent` for each step, `end-stop` against a stop and `refused` while
 * latched.
 */
export function createSelector(options: SelectorInputs) {
  const { powered, latched } = inputs(options);
  const last = Math.max(1, options.positions - 1);
  const toShare = (index: number) => index / last;
  const toIndex = (share: number) =>
    Math.max(0, Math.min(last, Math.round(share * last)));
  const share = source<number>(options.bound, toShare(options.initial ?? 0));
  const position = computed(() => toIndex(share.value.value));
  const e = events(options.sounds, () => ({
    on: position.value > 0,
    powered: powered.value,
    latched: latched.value,
    position: position.value,
  }));
  return {
    kind: 'selector' as const,
    held: e.held as ReadonlySignal<string | null>,
    positions: options.positions,
    /** The detent it is at, from 0. */
    position: position as ReadonlySignal<number>,
    /** Where it is through its travel, 0 to 1. */
    share: computed(() => toShare(position.value)) as ReadonlySignal<number>,
    powered: powered as ReadonlySignal<boolean>,
    latched: latched as ReadonlySignal<boolean>,
    /** Turn it one detent. Returns whether it moved. */
    turn(direction = 1): boolean {
      if (latched.peek()) {
        e.emit('refused');
        return false;
      }
      const from = position.peek();
      const to = Math.max(0, Math.min(last, from + Math.sign(direction)));
      if (to === from) {
        e.emit('end-stop');
        return false;
      }
      share.write(toShare(to));
      e.emit('detent');
      return true;
    },
    /** The model moved it: unbound only, and silent. */
    set: (index: number) => share.quietly(toShare(index)),
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Key-locked selector -----------------------------------------------------

/**
 * A selector whose hub is a lock: its key is a two-position switch, and
 * the selector is latched until the key is turned. Two components, one
 * driving the other's Latch.
 */
export function createKeyLockedSelector(
  options: Omit<SelectorInputs, 'latch'> & { unlocked?: boolean },
) {
  const key = createSwitch({ initial: options.unlocked ?? false });
  const selector = createSelector({
    ...options,
    latch: computed(() => !key.state.value),
  });
  return {
    kind: 'key-locked selector' as const,
    key,
    selector,
    dispose() {
      key.dispose();
      selector.dispose();
    },
  };
}

// ---- Self-acting parts --------------------------------------------------------

/**
 * Call `changed` each time `value` changes, never for its first value.
 * Returns a function that stops watching.
 */
function watch<T>(value: Readable<T>, changed: (next: T, from: T) => void) {
  let first = true;
  let last: T;
  return effect(() => {
    const next = value.value;
    if (!first && next !== last) changed(next, last);
    first = false;
    last = next;
  });
}

/** The listeners of a part that also watches its own state. */
function selfActing(sounds: PartSounds | undefined, state: () => PartState) {
  const e = events(sounds, state);
  const stops: (() => void)[] = [];
  return {
    ...e,
    watch<T>(value: Readable<T>, changed: (next: T, from: T) => void) {
      stops.push(watch(value, changed));
    },
    dispose() {
      for (const stop of stops) stop();
      e.dispose();
    },
  };
}

// ---- Operating handle --------------------------------------------------------

export type HandlePosition = 'off' | 'on' | 'tripped';

export interface OperatingHandleInputs extends Common {
  /** The breaker's position in the world; unbound, its own. */
  bound?: Binding<HandlePosition>;
  initial?: HandlePosition;
}

/**
 * The operating handle of a disconnect or circuit breaker, worked through
 * the door of a motor control unit: ON, OFF, and a TRIPPED position between
 * them that the breaker throws itself to on a fault. From TRIPPED the
 * handle must go to OFF (resetting the mechanism) before it will go ON
 * again. Padlocked (latched) it will not move. It sounds `on` and `off`
 * when thrown, and `trip` when the breaker trips, whatever tripped it.
 */
export function createOperatingHandle(options: OperatingHandleInputs = {}) {
  const { powered, latched } = inputs(options);
  const state = source<HandlePosition>(options.bound, options.initial ?? 'off');
  const e = selfActing(options.sounds, () => ({
    on: state.value.value === 'on',
    powered: powered.value,
    latched: latched.value,
    position: ['off', 'tripped', 'on'].indexOf(state.value.value),
  }));
  e.watch(state.value, (next) => {
    if (next === 'tripped') e.emit('trip');
  });
  return {
    kind: 'operating handle' as const,
    held: e.held as ReadonlySignal<string | null>,
    position: state.value as ReadonlySignal<HandlePosition>,
    on: computed(() => state.value.value === 'on') as ReadonlySignal<boolean>,
    latched: latched as ReadonlySignal<boolean>,
    /** Throw it: ON to OFF, OFF to ON, TRIPPED to OFF. Returns whether it moved. */
    operate(): boolean {
      if (latched.peek()) {
        e.emit('refused');
        return false;
      }
      const next = state.value.peek() === 'off' ? 'on' : 'off';
      state.write(next);
      e.emit(next);
      return state.value.peek() === next;
    },
    /** The breaker trips: only from ON. Unbound only; a bound one follows the world. */
    trip() {
      if (state.value.peek() === 'on') state.quietly('tripped');
    },
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Maintained mushroom stop ------------------------------------------------

export interface MushroomStopInputs extends Common {
  /** Whether it is pushed in, in the world; unbound, its own. */
  bound?: Binding<boolean>;
  initial?: boolean;
}

/**
 * An emergency stop: a red mushroom head that stays in when struck and is
 * pulled back out to release. It is mechanical and always moves (it cannot
 * be latched out, which is the point of it). It sounds `press` going in
 * and `release` coming out.
 */
export function createMushroomStop(options: MushroomStopInputs = {}) {
  const { powered } = inputs(options);
  const state = source(options.bound, options.initial ?? false);
  const e = events(options.sounds, () => ({
    on: state.value.value,
    powered: powered.value,
    latched: false,
    position: state.value.value ? 1 : 0,
  }));
  return {
    kind: 'mushroom stop' as const,
    held: e.held as ReadonlySignal<string | null>,
    /** Pushed in: the stop is applied. */
    pushed: state.value as ReadonlySignal<boolean>,
    /** Strike it in, or pull it out if it is in. */
    operate() {
      const next = !state.value.peek();
      state.write(next);
      e.emit(next ? 'press' : 'release');
      return true;
    },
    set: (pushed: boolean) => state.quietly(pushed),
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Pilot light -------------------------------------------------------------

export interface PilotLightInputs extends Common {
  /** What lights it: a contact in the control circuit. */
  drive?: Readable<boolean>;
  /** Push-to-test: how long a press lights it, seconds. */
  testSeconds?: number;
}

/**
 * A push-to-test pilot light: a lens over a lamp, lit by whatever drives
 * it while its control circuit (Power) is live. Pressing the lens lights
 * it for a moment from the same supply, to prove the bulb; a burnt-out
 * bulb lights for neither. Advance it with `step`.
 */
export function createPilotLight(options: PilotLightInputs = {}) {
  const { powered, latched } = inputs(options);
  const testing = signal(0);
  const burnt = signal(false);
  const lit = computed(
    () =>
      powered.value &&
      !burnt.value &&
      ((options.drive?.value ?? false) || testing.value > 0),
  );
  const e = events(options.sounds, () => ({
    on: lit.value,
    powered: powered.value,
    latched: latched.value,
    position: 0,
  }));
  return {
    kind: 'pilot light' as const,
    held: e.held as ReadonlySignal<string | null>,
    lit: lit as ReadonlySignal<boolean>,
    burntOut: burnt as ReadonlySignal<boolean>,
    /** Push the lens to test the bulb. */
    press(): boolean {
      e.emit('press');
      testing.value = options.testSeconds ?? 0.8;
      return lit.peek();
    },
    /** The bulb fails. */
    burnOut: () => (burnt.value = true),
    /** A new bulb. */
    replace: () => (burnt.value = false),
    step(seconds: number) {
      if (testing.peek() > 0)
        testing.value = Math.max(0, testing.peek() - seconds);
    },
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Contactor ---------------------------------------------------------------

export interface ContactorInputs {
  /** Whether its coil is energised. */
  coil: Readable<boolean>;
  /** Whether its contacts are welded, in the world; unbound, its own. */
  welded?: Binding<boolean>;
  sounds?: PartSounds;
}

/**
 * A contactor or control relay: its coil pulls the armature in, closing
 * its main and auxiliary contacts together; de-energised, a spring opens
 * them. It clunks (`pull-in`) and clacks (`drop-out`) as it acts. Its
 * contacts can weld shut, the classic failure: then it stays closed with
 * its coil dead.
 */
export function createContactor(options: ContactorInputs) {
  const welded = source(options.welded, false);
  const closed = computed(() => options.coil.value || welded.value.value);
  const e = selfActing(options.sounds, () => ({
    on: closed.value,
    powered: options.coil.value,
    latched: welded.value.value,
    position: closed.value ? 1 : 0,
  }));
  e.watch(closed, (next) => e.emit(next ? 'pull-in' : 'drop-out'));
  return {
    kind: 'contactor' as const,
    held: e.held as ReadonlySignal<string | null>,
    /** Its contacts are made. */
    closed: closed as ReadonlySignal<boolean>,
    welded: welded.value as ReadonlySignal<boolean>,
    /** The main contacts weld shut. */
    weld: () => welded.write(true),
    /** New contacts. */
    repair: () => welded.write(false),
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Thermal overload relay --------------------------------------------------

export interface OverloadRelayInputs {
  /** The motor current through it, amperes. */
  current: Readable<number>;
  /** The dial's settings, full-load amperes, lowest first. */
  settings?: readonly number[];
  /** The dial's position to begin with. */
  initial?: number;
  /**
   * Its trip class: the most seconds it lets six times the setting flow.
   * Class 10, 20 or 30.
   */
  tripClass?: number;
  /** Whether it has tripped, in the world; unbound, its own. */
  bound?: Binding<boolean>;
  sounds?: PartSounds;
}

/** At this multiple of the setting a thermal overload trips, given time. */
export const OVERLOAD_TRIP_MULTIPLE = 1.2;

/**
 * A thermal overload relay, as on a motor starter: bimetals heated by the
 * motor current, in a moulded body under the contactor, with a dial for
 * the motor's full-load current, a trip flag, a blue RESET button and a
 * red TEST button. Its normally closed contact opens when it trips, which
 * drops the contactor. It cannot be reset until it has cooled.
 *
 * The heat is the square of the current over the setting, lagging with a
 * time constant set by the trip class; it trips at 1.2 times the setting
 * held, and at six times within the class's seconds. Advance with `step`.
 */
export function createOverloadRelay(options: OverloadRelayInputs) {
  const settings = options.settings ?? [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const dial = createSelector({
    positions: settings.length,
    initial: options.initial ?? Math.floor(settings.length / 2),
    sounds: { transitions: { detent: 'knob' } },
  });
  const tripClass = options.tripClass ?? 10;
  // 36(1 - e^(-t/tau)) reaches 1.44 at t = tau·ln(36/34.56) = 0.0408·tau;
  // a little margin keeps the trip inside the class.
  const tau = tripClass / 0.045;
  const heat = signal(0);
  const trip = source(options.bound, false);
  const tripped = trip.value;
  const setting = computed(() => settings[dial.position.value]);
  const e = selfActing(options.sounds, () => ({
    on: tripped.value,
    powered: true,
    latched: false,
    position: tripped.value ? 1 : 0,
  }));
  e.watch(tripped, (next) => {
    if (next) e.emit('trip');
  });
  const limit = OVERLOAD_TRIP_MULTIPLE ** 2;
  return {
    kind: 'overload relay' as const,
    held: e.held as ReadonlySignal<string | null>,
    /** The full-load current dial. */
    dial,
    setting: setting as ReadonlySignal<number>,
    /** How hot its bimetals are: 1.44 trips, below 1 it can be reset. */
    heat: heat as ReadonlySignal<number>,
    tripped: tripped as ReadonlySignal<boolean>,
    /** Its normally closed contact, in the contactor's coil circuit. */
    contactClosed: computed(() => !tripped.value) as ReadonlySignal<boolean>,
    /** Push RESET. Returns whether it reset; it will not until it has cooled. */
    reset(): boolean {
      e.emit('press');
      if (!tripped.peek() || heat.peek() >= 1) return false;
      trip.write(false);
      return true;
    },
    /** Push TEST: it trips at once, as an overload would trip it. */
    test() {
      e.emit('press');
      trip.write(true);
    },
    step(seconds: number) {
      const ratio = options.current.value / setting.peek();
      const next =
        heat.peek() +
        (ratio * ratio - heat.peek()) * Math.min(1, seconds / tau);
      heat.value = next;
      if (next >= limit && !tripped.peek()) trip.write(true);
    },
    onEvent: e.onEvent,
    dispose() {
      dial.dispose();
      e.dispose();
    },
  };
}

// ---- Fuse --------------------------------------------------------------------

export interface FuseInputs {
  /** The current through it, amperes. */
  current: Readable<number>;
  /** Its rating, amperes. */
  rating: number;
  /** Whether it has blown, in the world; unbound, its own. */
  bound?: Binding<boolean>;
  sounds?: PartSounds;
}

/**
 * A cartridge fuse in a holder. Current above its rating melts it, faster
 * the further above (an I²t element: twice the rating blows it in a third
 * of a second); it blows with a pop and its indicator shows. Pulled and
 * replaced, it is whole again. Advance with `step`.
 */
export function createFuse(options: FuseInputs) {
  const melt = signal(0);
  const state = source(options.bound, false);
  const blown = state.value;
  const e = selfActing(options.sounds, () => ({
    on: !blown.value,
    powered: true,
    latched: false,
    position: blown.value ? 0 : 1,
  }));
  e.watch(blown, (next) => {
    if (next) e.emit('blow');
  });
  return {
    kind: 'fuse' as const,
    held: e.held as ReadonlySignal<string | null>,
    rating: options.rating,
    blown: blown as ReadonlySignal<boolean>,
    /** It conducts. */
    whole: computed(() => !blown.value) as ReadonlySignal<boolean>,
    /** Pull it and fit a new one. */
    replace() {
      e.emit('press');
      melt.value = 0;
      state.write(false);
      return true;
    },
    step(seconds: number) {
      if (blown.peek()) return;
      const ratio = options.current.value / options.rating;
      const next = Math.max(0, melt.peek() + (ratio * ratio - 1) * seconds);
      melt.value = next;
      if (next >= 1) state.write(true);
    },
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Electrolytic capacitor --------------------------------------------------

export type CapacitorHealth = 'good' | 'bulging' | 'vented';

export interface CapacitorInputs {
  /** Mounted board parts remain fixed; a loose exhibit is detachable. */
  attachment?: Attachment;
  random?: () => number;
  /** The voltage across it, volts. */
  voltage: Readable<number>;
  /** Its rated voltage. */
  rated: number;
  /**
   * How far through its endurance it is, 0 (new) to 1 (vented), in the
   * world; unbound, its own.
   */
  bound?: Binding<number>;
  sounds?: PartSounds;
}

/**
 * An aluminium electrolytic capacitor on a circuit board. Held above its
 * rated voltage it is stressed: past half its endurance its top bulges,
 * and at the end it vents through the scored top with a bang and a
 * plume of acrid smoke, and is open circuit from then on. A replacement
 * is new. `smoke` is how much it is smoking, 1 as it vents and dying
 * away over three seconds. Advance with `step`.
 */
export function createCapacitor(options: CapacitorInputs) {
  const wear = source(options.bound, 0);
  const stress = wear.value;
  const smoke = signal(0);
  const failureAge = signal(Infinity);
  const emberCount = signal(0);
  const health = computed<CapacitorHealth>(() =>
    stress.value >= 1 ? 'vented' : stress.value >= 0.5 ? 'bulging' : 'good',
  );
  const e = selfActing(options.sounds, () => ({
    on: health.value !== 'vented',
    powered: options.voltage.value > 0,
    latched: false,
    position: ['good', 'bulging', 'vented'].indexOf(health.value),
  }));
  e.watch(health, (next) => {
    if (next === 'bulging') e.emit('bulge');
    if (next === 'vented') {
      failureAge.value = 0;
      emberCount.value =
        3 + Math.min(2, Math.floor((options.random ?? Math.random)() * 3));
      smoke.value = 1;
      e.emit('vent');
    }
  });
  return {
    kind: 'capacitor' as const,
    attachment: options.attachment ?? 'fixed',
    failureAge: failureAge as ReadonlySignal<number>,
    flash: computed(() => failureAge.value < 0.065),
    embers: computed(() => (failureAge.value < 0.8 ? emberCount.value : 0)),
    fail() {
      if (stress.peek() >= 1) return false;
      wear.write(1);
      return true;
    },
    held: e.held as ReadonlySignal<string | null>,
    rated: options.rated,
    health: health as ReadonlySignal<CapacitorHealth>,
    /** It still holds a charge: not vented. */
    working: computed(
      () => health.value !== 'vented',
    ) as ReadonlySignal<boolean>,
    smoke: smoke as ReadonlySignal<number>,
    replace() {
      e.emit('press');
      wear.write(0);
      smoke.value = 0;
      failureAge.value = Infinity;
      emberCount.value = 0;
      return true;
    },
    step(seconds: number) {
      if (Number.isFinite(failureAge.peek())) {
        failureAge.value += seconds;
        smoke.value = Math.max(0, 1 - failureAge.peek() / 3);
      }
      if (stress.peek() >= 1) return;
      // A tenth over its rating vents it in a minute; half over, in seconds.
      const over = options.voltage.value / options.rated - 1;
      if (over > 0)
        wear.write(Math.min(1, stress.peek() + over * over * 1.6 * seconds));
    },
    onEvent: e.onEvent,
    dispose: e.dispose,
  };
}

// ---- Hour meter --------------------------------------------------------------

/**
 * An elapsed-time meter: a sealed drum counter that runs while its
 * terminals are live, reading hours to a tenth. It starts at `initial`
 * hours, as a used machine's meter would. Advance with `step`.
 */
export function createHourMeter({
  running,
  initial = 0,
}: {
  running: Readable<boolean>;
  initial?: number;
}) {
  const hours = signal(initial);
  return {
    kind: 'hour meter' as const,
    hours: hours as ReadonlySignal<number>,
    step(seconds: number) {
      if (running.value) hours.value = hours.peek() + seconds / 3600;
    },
  };
}

export type LedPushbutton = ReturnType<typeof createLedPushbutton>;
export type Momentary = ReturnType<typeof createMomentary>;
export type Switch = ReturnType<typeof createSwitch>;
export type Selector = ReturnType<typeof createSelector>;
export type KeyLockedSelector = ReturnType<typeof createKeyLockedSelector>;
export type OperatingHandle = ReturnType<typeof createOperatingHandle>;
export type MushroomStop = ReturnType<typeof createMushroomStop>;
export type PilotLight = ReturnType<typeof createPilotLight>;
export type Contactor = ReturnType<typeof createContactor>;
export type OverloadRelay = ReturnType<typeof createOverloadRelay>;
export type Fuse = ReturnType<typeof createFuse>;
export type Capacitor = ReturnType<typeof createCapacitor>;
export type HourMeter = ReturnType<typeof createHourMeter>;
