import { createElectrolyticCapacitorView } from '../../industrial-control/views/electrolytic-capacitor';
import type { Attachment } from '../../../controls/logic/drop-profile';
import { computed, effect, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { click, partAudio, recording } from '../audio/part-audio';
import type { LoopRecipe, SoundRecipe } from '../audio/part-audio';
import { largeDoorMovement } from '../audio/door-sounds';
import { MAINS_HUM, MOTOR_HUM, RELAY_HOLD } from '../audio/part-loops';
import {
  createCapacitor,
  createContactor,
  createFuse,
  createLedPushbutton,
  createMomentary,
  createMushroomStop,
  createOperatingHandle,
  createOverloadRelay,
  createPilotLight,
  createSelector,
  createSwitch,
} from '../logic/world/components';
import type {
  Binding,
  HandlePosition,
  PartEvent,
  PartListener,
  Readable,
} from '../logic/world/components';
import {
  createDoorRearCover,
  createFlangeHandle,
  createHeavyDutyThrowHandle,
  createRotaryIsolatorHandle,
  createPushbuttonStation,
} from '../../industrial-control/views/cabinet-fittings';
import type { PanelKit } from '../views/eighties-controls';
import type { LensDamage } from '../logic/lens-damage';
import {
  createCamSelector,
  createLegendPlate,
  createLeverSelector,
  createMushroomHead,
  createPilotLamp,
  createPotentiometer,
  createPushButton,
  createXB4PilotLight,
  createXB4Selector,
} from '../../industrial-control/views/industrial-controls';
import type { OperatorColour } from '../../industrial-control/views/industrial-controls';
import {
  createDriveKeypad,
  createOperatorTerminal,
} from '../../industrial-control/views/industrial-displays';
import type {
  DriveKeypadView,
  TerminalView,
} from '../../industrial-control/views/industrial-displays';
import {
  createCapacitorBoardView,
  createContactorView,
  createFuseHolderView,
  createMotorUnit,
  createMotorView,
  createOverloadRelayView,
} from '../../industrial-control/views/industrial-devices';
import {
  createKeySwitch,
  createRocker,
} from '../../industrial-control/views/panel-switchgear';
import { createStudioSwitch } from '../../industrial-control/views/studio-controls';
import type {
  StudioCapColour,
  StudioLedColour,
} from '../../industrial-control/views/studio-controls';
import { createRackUnit } from '../../industrial-control/views/rack-equipment';
import type {
  RackUnitOptions,
  RackUnitView,
} from '../../industrial-control/views/rack-equipment';

/**
 * Parts: the panel's controls as whole things, in the manner of React
 * components. A part is made from its props alone (its colours, its
 * legend, what it does) and brings everything else with it: its look,
 * its behaviour (the component in `src/toolkit/components/core/logic/world/components.ts`), what a
 * click on it does, and its own sounds, defined here beside it and played
 * from where it stands. Bound to a world value (`bound`, `power`,
 * `latch`) it shows and writes the world's state, like a controlled
 * input; unbound it keeps its own, so an LED pushbutton wired to nothing
 * still toggles its LED. A room places parts and adds them to a
 * `PartSet`; it never wires a part's sounds or clicks.
 *
 * Every part is built in metres, facing +z, its mounting face at z = 0.
 */
export interface Part {
  /** What to place. */
  object: Group;
  /** What a click on each of its pieces does; knobs take a direction. */
  uses: Map<Object3D, (direction?: number) => void>;
  update(delta: number): void;
  /** Hear what it does, by name, for logs. */
  onEvent(listener: (event: PartEvent, name: string) => void): () => void;
  /** Hush its held sounds while its room is out of sight, and back. */
  setAudible(on: boolean): void;
  dispose(): void;
}

/**
 * Which family a pilot device comes from: the 30 mm oiltight devices of the
 * American MCC (the default), or Schneider's 22 mm Harmony XB4, which a
 * small control station (XALD) takes. A part is always shown at its true
 * size; to fit a smaller enclosure, choose the smaller family, never scale.
 */
export type DeviceSeries = '30mm' | 'xb4';

/** The props every part takes. */
interface Common {
  /** What it is called in logs. */
  name?: string;
  /** Engraved legend plate text above it. */
  legend?: string;
  /** A yellow legend plate, as for an emergency stop. */
  yellow?: boolean;
}

/**
 * A part's plumbing: its group, uses, updates, and its sounds. Parts in
 * other files (`building-parts.ts`) are built on it too.
 */
export function beginPart(kit: PanelKit, name: string) {
  const object = new Group();
  object.name = name;
  const uses = new Map<Object3D, (direction?: number) => void>();
  const updates: ((delta: number) => void)[] = [];
  const listeners = new Set<(event: PartEvent, name: string) => void>();
  const disposers: (() => void)[] = [];
  const audible = signal(true);
  return {
    object,
    uses,
    updates,
    disposers,
    /**
     * Sound a component's events with these recipes, from this part,
     * and pass them on to its listeners. An event with no recipe is
     * silent.
     */
    voice(
      component: { onEvent(listener: PartListener): unknown },
      sounds: Partial<Record<PartEvent, SoundRecipe | (() => SoundRecipe)>>,
      from: Object3D = object,
    ) {
      component.onEvent((event) => {
        const sound = sounds[event];
        if (sound)
          partAudio.play(typeof sound === 'function' ? sound() : sound, from);
        for (const listener of listeners) listener(event, name);
      });
    },
    /** Hold `recipe` from `from` for as long as `when` is true. */
    holdWhile(
      when: Readable<boolean>,
      recipe: LoopRecipe,
      from: Object3D = object,
    ) {
      const owner = {};
      const stop = effect(() =>
        partAudio.hold(
          owner,
          when.value && audible.value ? recipe : null,
          from,
        ),
      );
      disposers.push(() => {
        stop();
        partAudio.hold(owner, null);
      });
    },
    /** Its legend plate, `y` above its centre, as wide as its words. */
    legend(text: string | undefined, y: number, yellow = false) {
      if (!text) return;
      const longest = Math.max(...text.split('\n').map((l) => l.length));
      const plate = createLegendPlate(kit, text, {
        width: Math.max(0.05, longest * 0.0042 + 0.012),
        height: 0.012,
        yellow,
      });
      plate.position.y = y;
      object.add(plate);
    },
    part(): Part {
      return {
        object,
        uses,
        update(delta) {
          for (const update of updates) update(delta);
        },
        onEvent(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        setAudible(on) {
          audible.value = on;
        },
        dispose() {
          for (const done of disposers) done();
          listeners.clear();
        },
      };
    },
  };
}

// ---- Sounds ------------------------------------------------------------------

const asset = (file: string) =>
  new URL(`../audio/assets/${file}`, import.meta.url);
/** A 30 mm push button going in: a recorded press. */
const PRESS = recording(asset('button-press.wav'), 0.07);
/** A keypad's light plastic key. */
const KEY = recording(asset('key-thock.wav'), 0.09);
/** A selector clicking over a detent. */
const DETENT = recording(asset('switch-click.wav'), 0.06);
/** A potentiometer's faint detent. */
const KNOB = recording(asset('switch-click.wav'), 0.025);
/** A key turning in its lock: a small metallic ratchet. */
const KEY_TURN = click({
  band: 5200,
  q: 4,
  decay: 0.012,
  level: 0.45,
  repeat: [3, 0.035],
});
/** A locked control rattling against its stop. */
const LOCKED = click({
  band: 900,
  q: 3,
  decay: 0.02,
  level: 0.5,
  repeat: [2, 0.05],
  thump: [80, 0.04],
});
/**
 * A disconnect's handle against its interlock: the heavy mechanism thrown
 * hard against a stop it cannot pass, rattling back.
 */
const BLOCKED = click({
  band: 520,
  q: 0.9,
  decay: 0.07,
  level: 0.55,
  repeat: [3, 0.045],
  thump: [70, 0.09],
});
/** A mushroom head struck home, or pulled back with a snap. */
const MUSHROOM = click({
  band: 1900,
  q: 1.4,
  decay: 0.05,
  level: 0.75,
  thump: [90, 0.08],
});
/** A disconnect's operating handle: a stiff lever, a heavy mechanism. */
const HANDLE = click({
  band: 420,
  q: 0.75,
  decay: 0.095,
  level: 0.5,
  thump: [115, 0.11],
});
/** A restrained enclosed-switch thock, with a short low body and no metallic crash. */
const ISOLATOR_CLICK = click({
  band: 380,
  q: 0.7,
  decay: 0.085,
  level: 0.3,
  thump: [125, 0.09],
});
/**
 * A heavy switch's quick-make mechanism: the handle charges a spring (a
 * short grinding ratchet), which then throws the contacts home all at
 * once, a loud metallic clack with a deep thump, the contacts bouncing
 * once and the steel box ringing after it.
 */
const CONTACTS_CLOSE: SoundRecipe = {
  sequence: [
    {
      at: 0,
      click: {
        band: 1400,
        q: 2,
        decay: 0.012,
        level: 0.25,
        repeat: [4, 0.018],
      },
    },
    {
      at: 0.085,
      click: { band: 500, q: 0.8, decay: 0.09, level: 0.6, thump: [105, 0.12] },
    },
    { at: 0.093, click: { band: 1100, q: 1, decay: 0.018, level: 0.13 } },
    { at: 0.1, click: { band: 1600, q: 2, decay: 0.06, level: 0.07 } },
  ],
};
/** And breaking: the same spring, the contacts flung apart, a little lighter. */
const CONTACTS_OPEN: SoundRecipe = {
  sequence: [
    {
      at: 0,
      click: { band: 1300, q: 2, decay: 0.012, level: 0.22, repeat: [3, 0.02] },
    },
    {
      at: 0.07,
      click: {
        band: 440,
        q: 0.8,
        decay: 0.075,
        level: 0.5,
        thump: [120, 0.1],
      },
    },
    { at: 0.08, click: { band: 1500, q: 2, decay: 0.05, level: 0.06 } },
  ],
};
/** A breaker tripping: a sharp spring-loaded snap. */
const TRIP = click({
  band: 3600,
  q: 1.2,
  decay: 0.035,
  level: 0.95,
  thump: [150, 0.05],
});
/** A steel cabinet door swinging open, and shutting on its latches. */
const DOOR_OPEN = recording(asset('door-open.wav'), 0.015);
const DOOR_SHUT = recording(asset('door-close.wav'), 0.018);

// ---- Push button -------------------------------------------------------------

/**
 * A 30 mm momentary push button: `flush` in a guard ring (START),
 * `extended` (STOP), under its legend. A press does `action` while
 * powered and unlatched, and always clicks.
 */
export function pushButton(
  kit: PanelKit,
  props: Common & {
    colour: OperatorColour;
    head?: 'flush' | 'extended' | 'illuminated';
    /** Independent lamp drive for illuminated momentary buttons. */
    lamp?: Readable<boolean>;
    /**
     * How damaged an illuminated button's lens is, and `damageSeed` how it
     * cracks: made worse (by a blast, say) by changing what this reads.
     */
    damage?: Readable<LensDamage>;
    damageSeed?: number;
    action?: () => void;
    power?: Readable<boolean>;
    latch?: Readable<boolean>;
  },
): Part {
  const a = beginPart(
    kit,
    props.name ?? `${props.legend ?? props.colour} push button`,
  );
  const view = createPushButton(kit, props.colour, {
    head: props.head ?? (props.colour === 'red' ? 'extended' : 'flush'),
    damageSeed: props.damageSeed,
  });
  a.object.add(view.group);
  a.legend(props.legend, 0.03);
  let damaged: LensDamage = 'intact';
  const button = createMomentary({
    action: props.action,
    lamp: props.lamp,
    power: props.power,
    latch: props.latch,
  });
  a.voice(button, { press: PRESS });
  a.uses.set(view.cap, () => {
    view.press();
    button.press();
  });
  a.updates.push((delta) => {
    view.setLit(button.lit.value);
    const damage = props.damage?.value ?? 'intact';
    if (damage !== damaged) view.setDamage((damaged = damage));
    view.update(delta);
  });
  a.disposers.push(button.dispose);
  return a.part();
}

// ---- LED pushbutton ----------------------------------------------------------

/**
 * An illuminated push-on, push-off button: its cap lit while it is on
 * and powered. Unbound, it keeps and toggles its own state.
 */
export function ledPushbutton(
  kit: PanelKit,
  props: Common & {
    colour: OperatorColour;
    initial?: boolean;
    bound?: Binding<boolean>;
    power?: Readable<boolean>;
    latch?: Readable<boolean>;
  },
): Part & { state: ReadonlySignal<boolean>; lit: ReadonlySignal<boolean> } {
  const a = beginPart(
    kit,
    props.name ?? `${props.legend ?? props.colour} LED pushbutton`,
  );
  const view = createPushButton(kit, props.colour, { head: 'illuminated' });
  a.object.add(view.group);
  a.legend(props.legend, 0.03);
  const button = createLedPushbutton({
    initial: props.initial,
    bound: props.bound,
    power: props.power,
    latch: props.latch,
  });
  a.voice(button, { press: PRESS });
  a.uses.set(view.cap, () => {
    view.press();
    button.press();
  });
  a.updates.push((delta) => {
    view.setLit(button.lit.value);
    view.update(delta);
  });
  a.disposers.push(button.dispose);
  return { ...a.part(), state: button.state, lit: button.lit };
}

// ---- Studio switch ---------------------------------------------------------

/** A studio switch's short travel: a soft, high, quick click. */
const STUDIO_CLICK = click({
  band: 3600,
  q: 2.4,
  decay: 0.01,
  level: 0.14,
  thump: [210, 0.015],
});
/** How long a momentary studio switch's LED shows a press, seconds. */
const STUDIO_FLASH = 0.3;

/**
 * A short-travel studio switch (`createStudioSwitch`): its legend on its
 * cap and a square LED window above it. Momentary, it does `action` on
 * each press and its LED shows the press a moment, or shows `lamp` if
 * given (something in progress, say); latching, each press turns it on or
 * off, its LED lit while on, and it may be `bound` to the world.
 */
export function studioSwitch(
  kit: PanelKit,
  props: Common & {
    /** Its LED's colour, and its cap's: chosen independently. */
    led?: StudioLedColour;
    cap?: StudioCapColour;
    mode?: 'momentary' | 'latching';
    action?: () => void;
    lamp?: Readable<boolean>;
    initial?: boolean;
    bound?: Binding<boolean>;
    power?: Readable<boolean>;
    latch?: Readable<boolean>;
  },
): Part & { lit: ReadonlySignal<boolean> } {
  const a = beginPart(
    kit,
    props.name ?? `${props.legend ?? ''} studio switch`.trim(),
  );
  const view = createStudioSwitch(kit, {
    legend: props.legend,
    led: props.led,
    cap: props.cap,
  });
  a.object.add(view.group);
  let lit: ReadonlySignal<boolean>;
  let press: () => void;
  if (props.mode === 'latching') {
    const button = createLedPushbutton({
      initial: props.initial,
      bound: props.bound,
      power: props.power,
      latch: props.latch,
    });
    a.voice(button, { press: STUDIO_CLICK });
    a.disposers.push(button.dispose);
    lit = button.lit;
    press = () => {
      if (button.press()) props.action?.();
    };
  } else {
    const flash = signal(0);
    const button = createMomentary({
      action: () => {
        flash.value = STUDIO_FLASH;
        props.action?.();
      },
      lamp: props.lamp,
      power: props.power,
      latch: props.latch,
    });
    a.voice(button, { press: STUDIO_CLICK });
    a.disposers.push(button.dispose);
    lit = props.lamp
      ? button.lit
      : computed(() => flash.value > 0 && (props.power?.value ?? true));
    a.updates.push((delta) => {
      if (flash.peek() > 0) flash.value = Math.max(0, flash.peek() - delta);
    });
    press = () => void button.press();
  }
  a.uses.set(view.group, () => {
    view.press();
    press();
  });
  a.updates.push((delta) => {
    view.setLit(lit.value);
    view.update(delta);
  });
  return { ...a.part(), lit };
}

// ---- Pilot light -------------------------------------------------------------

/**
 * A push-to-test pilot light: lit by `drive` while powered; pressing the
 * lens lights it a moment to prove the bulb. Set `pushToTest: false` for
 * a display-only lamp with no operator action.
 */
export function pilotLight(
  kit: PanelKit,
  props: Common & {
    colour: OperatorColour;
    /** A second colour for a powered, logically off status indication. */
    offColour?: OperatorColour;
    drive?: Readable<boolean>;
    power?: Readable<boolean>;
    series?: DeviceSeries;
    /** Whether its lens can be pressed to test it; defaults to true. */
    pushToTest?: boolean;
  },
): Part & { lit: ReadonlySignal<boolean> } {
  const a = beginPart(
    kit,
    props.name ?? `${props.legend ?? props.colour} pilot light`,
  );
  const view =
    props.series === 'xb4'
      ? createXB4PilotLight(kit, props.colour)
      : createPilotLamp(kit, props.colour);
  const offView = props.offColour
    ? props.series === 'xb4'
      ? createXB4PilotLight(kit, props.offColour)
      : createPilotLamp(kit, props.offColour)
    : undefined;
  a.object.add(view.group);
  if (offView) a.object.add(offView.group);
  a.legend(props.legend, 0.03);
  const lamp = createPilotLight({ drive: props.drive, power: props.power });
  if (props.pushToTest !== false) {
    a.voice(lamp, { press: PRESS });
    a.uses.set(view.lens, () => {
      view.press();
      lamp.press();
    });
    if (offView)
      a.uses.set(offView.lens, () => {
        offView.press();
        lamp.press();
      });
  }
  a.updates.push((delta) => {
    lamp.step(delta);
    // Whether it is lit, for a reader of the scene (a test, say).
    a.object.userData.lit = lamp.lit.value;
    view.set(lamp.lit.value);
    view.update(delta);
    if (offView) {
      const off = !lamp.lit.value;
      view.group.visible = !off;
      offView.group.visible = off;
      offView.set(off && (props.power?.value ?? true));
      offView.update(delta);
      a.object.userData.indication = !(props.power?.value ?? true)
        ? 'dark'
        : off
          ? props.offColour
          : props.colour;
    }
  });
  a.disposers.push(lamp.dispose);
  return { ...a.part(), lit: lamp.lit };
}

// ---- Selector ----------------------------------------------------------------

/**
 * A lever selector of two or three positions, a four-step cam selector,
 * or a key selector with its
 * key standing in it. A click on the left of it turns it down a detent,
 * on the right up. Latched (or, for a key, locked) it refuses.
 */
export function selector(
  kit: PanelKit,
  props: Common & {
    positions: 2 | 3 | 4;
    key?: boolean;
    initial?: number;
    bound?: Binding<number>;
    latch?: Readable<boolean>;
    series?: DeviceSeries;
  },
): Part & { position: ReadonlySignal<number> } {
  const a = beginPart(
    kit,
    props.name ??
      `${props.legend ?? ''} ${props.key ? 'key ' : ''}selector`.trim(),
  );
  const view =
    props.positions === 4
      ? createCamSelector(kit)
      : props.series === 'xb4'
        ? createXB4Selector(kit, props.positions)
        : createLeverSelector(kit, props.positions, { key: props.key });
  a.object.add(view.group);
  a.legend(props.legend, 0.03);
  const part = createSelector({
    positions: props.positions,
    initial: props.initial,
    bound: props.bound
      ? {
          get value() {
            return props.bound!.value / Math.max(1, props.positions - 1);
          },
          set: (share: number) =>
            props.bound!.set(Math.round(share * (props.positions - 1))),
        }
      : undefined,
    latch: props.latch,
  });
  a.voice(part, {
    detent: props.key ? KEY_TURN : DETENT,
    refused: LOCKED,
  });
  a.uses.set(view.knob, (direction = 1) => part.turn(direction));
  a.updates.push((delta) => {
    view.set(part.position.value);
    view.update(delta);
  });
  a.disposers.push(part.dispose);
  return { ...a.part(), position: part.position };
}

// ---- Potentiometer -----------------------------------------------------------

/**
 * A potentiometer, a step of its travel a click, 0 to 1. Bound, it shows
 * and writes a world value: its detent, from 0 to `steps`.
 */
export function potentiometer(
  kit: PanelKit,
  props: Common & {
    steps?: number;
    initial?: number;
    bound?: Binding<number>;
  },
): Part & { share: ReadonlySignal<number>; position: ReadonlySignal<number> } {
  const a = beginPart(
    kit,
    props.name ?? `${props.legend ?? ''} potentiometer`.trim(),
  );
  const view = createPotentiometer(kit);
  a.object.add(view.group);
  a.legend(props.legend, 0.032);
  const positions = (props.steps ?? 10) + 1;
  const part = createSelector({
    positions,
    initial: Math.round((props.initial ?? 0) * (positions - 1)),
    bound: props.bound
      ? {
          get value() {
            return props.bound!.value / (positions - 1);
          },
          set: (share: number) =>
            props.bound!.set(Math.round(share * (positions - 1))),
        }
      : undefined,
  });
  a.voice(part, { detent: KNOB });
  // Include its visible mounting ring, so edge clicks still turn the knob.
  a.uses.set(view.group, (direction = 1) => part.turn(direction));
  a.updates.push((delta) => {
    view.set(part.share.value);
    view.update(delta);
  });
  a.disposers.push(part.dispose);
  return { ...a.part(), share: part.share, position: part.position };
}

// ---- Emergency stop ----------------------------------------------------------

/** A red mushroom-head emergency stop: struck in, pulled out. */
export function mushroomStop(
  kit: PanelKit,
  props: Common & { initial?: boolean; bound?: Binding<boolean> },
): Part & { pushed: ReadonlySignal<boolean> } {
  const a = beginPart(kit, props.name ?? 'EMERGENCY STOP');
  const view = createMushroomHead(kit);
  a.object.add(view.group);
  a.legend(props.legend ?? 'EMERGENCY STOP', 0.042, true);
  const stop = createMushroomStop({
    initial: props.initial,
    bound: props.bound,
  });
  a.voice(stop, { press: MUSHROOM, release: MUSHROOM });
  a.uses.set(view.head, () => stop.operate());
  a.updates.push((delta) => {
    view.set(stop.pushed.value);
    view.update(delta);
  });
  a.disposers.push(stop.dispose);
  return { ...a.part(), pushed: stop.pushed };
}

// ---- Disconnect handle -------------------------------------------------------

/**
 * A flange-mounted disconnect handle: ON up, OFF down, a TRIPPED place
 * between that the breaker throws itself to. Padlocked (latched) it
 * refuses.
 */
export function disconnectHandle(
  kit: PanelKit,
  props: Common & {
    colour?: 'black' | 'red';
    /** A small illuminated I/O rocker works a little bucket's breaker. */
    style?: 'flange' | 'heavy-throw' | 'rotary' | 'rocker';
    sound?: 'standard' | 'soft-click';
    /** Reuse an internal breaker's one mechanism and event stream. */
    shared?: ReturnType<typeof createOperatingHandle>;
    initial?: HandlePosition;
    bound?: Binding<HandlePosition>;
    latch?: Readable<boolean>;
  },
): Part & {
  position: ReadonlySignal<HandlePosition>;
  on: ReadonlySignal<boolean>;
  trip(): void;
} {
  const a = beginPart(kit, props.name ?? 'disconnect handle');
  const rocker =
    props.style === 'rocker'
      ? createRocker(kit, (props.initial ?? 'on') === 'on')
      : null;
  const view = rocker
    ? {
        group: rocker.group,
        lever: rocker.rocker,
        set: rocker.set,
        update: rocker.update,
      }
    : props.style === 'heavy-throw'
      ? createHeavyDutyThrowHandle(kit, {
          on: (props.initial ?? 'on') === 'on',
        })
      : props.style === 'rotary'
        ? createRotaryIsolatorHandle(kit, {
            on: (props.initial ?? 'on') === 'on',
          })
        : createFlangeHandle(kit, { colour: props.colour });
  a.object.add(view.group);
  const handle =
    props.shared ??
    createOperatingHandle({
      initial: props.initial ?? 'on',
      bound: props.bound,
      latch: props.latch,
    });
  // A heavy-throw switch makes and breaks with a quick-make mechanism.
  const heavy = props.style === 'heavy-throw';
  const onSound =
    props.sound === 'soft-click'
      ? ISOLATOR_CLICK
      : heavy
        ? CONTACTS_CLOSE
        : HANDLE;
  const offSound =
    props.sound === 'soft-click'
      ? ISOLATOR_CLICK
      : heavy
        ? CONTACTS_OPEN
        : HANDLE;
  // A handle sharing a breaker's mechanism leaves that breaker to sound
  // its moves; a refusal is the handle's own, felt at the lever.
  a.voice(
    handle,
    props.shared
      ? { refused: BLOCKED }
      : { on: onSound, off: offSound, trip: TRIP, refused: BLOCKED },
  );
  a.uses.set(view.lever, () => handle.operate());
  // Latched, a throw only shudders the lever against its stop.
  const SHUDDER = 0.4;
  let shudder = SHUDDER;
  a.disposers.push(
    handle.onEvent((event) => {
      if (event === 'refused') shudder = 0;
    }),
  );
  a.updates.push((delta) => {
    view.set(handle.on.value);
    view.update(delta);
    const shaking = shudder < SHUDDER;
    if (shaking) shudder = Math.min(SHUDDER, shudder + delta);
    const fade = 1 - shudder / SHUDDER;
    const offset = shaking ? Math.sin(shudder * 75) * 0.0018 * fade : 0;
    view.group.position.x = offset;
    view.group.rotation.z = offset * 3;
  });
  if (!props.shared) a.disposers.push(handle.dispose);
  return {
    ...a.part(),
    position: handle.position,
    on: handle.on,
    trip: handle.trip,
  };
}

// ---- Key switch --------------------------------------------------------------

/** A chrome key switch with its key in it, turned 0 or I; latched, it refuses. */
export function keySwitch(
  kit: PanelKit,
  props: Common & {
    initial?: boolean;
    bound?: Binding<boolean>;
    latch?: Readable<boolean>;
  },
): Part & { state: ReadonlySignal<boolean> } {
  const a = beginPart(
    kit,
    props.name ?? `${props.legend ?? ''} key switch`.trim(),
  );
  const view = createKeySwitch(kit, props.initial ?? false);
  a.object.add(view.group);
  a.legend(props.legend, 0.03);
  const part = createSwitch({
    initial: props.initial,
    bound: props.bound,
    latch: props.latch,
  });
  a.voice(part, { on: KEY_TURN, off: KEY_TURN, refused: LOCKED });
  a.uses.set(view.key, () => part.flip());
  a.updates.push((delta) => {
    view.set(part.state.value);
    view.update(delta);
  });
  a.disposers.push(part.dispose);
  return { ...a.part(), state: part.state };
}

// ---- Pushbutton station ------------------------------------------------------

/**
 * A pushbutton station: a raised plate of buttons stacked one above
 * another, each under its legend, each doing its own `action`.
 */
export function pushbuttonStation(
  kit: PanelKit,
  props: Common & {
    buttons: readonly {
      colour: OperatorColour;
      legend: string;
      action?: () => void;
    }[];
    power?: Readable<boolean>;
  },
): Part {
  const a = beginPart(kit, props.name ?? 'pushbutton station');
  const view = createPushbuttonStation(kit, props.buttons);
  a.object.add(view.group);
  view.buttons.forEach((cap, i) => {
    const button = createMomentary({
      action: props.buttons[i].action,
      power: props.power,
    });
    a.voice(button, { press: PRESS }, cap.group);
    a.uses.set(cap.cap, () => {
      cap.press();
      button.press();
    });
    a.disposers.push(button.dispose);
  });
  a.updates.push(view.update);
  return a.part();
}

// ---- Keypads -----------------------------------------------------------------

/** An AC drive's keypad: each key a momentary key doing `onKey(name)`. */
export function driveKeypad(
  kit: PanelKit,
  props: Common & {
    onKey?: (key: keyof DriveKeypadView['keys']) => void;
    power?: Readable<boolean>;
  },
): Part & { view: DriveKeypadView } {
  const a = beginPart(kit, props.name ?? 'drive keypad');
  const view = createDriveKeypad(kit);
  a.object.add(view.group);
  for (const [name, key] of Object.entries(view.keys)) {
    const button = createMomentary({
      action: () => props.onKey?.(name as keyof DriveKeypadView['keys']),
      power: props.power,
    });
    a.voice(button, { press: KEY }, key.group);
    // The key includes its narrow bezel as well as the coloured cap.
    a.uses.set(key.group, () => {
      key.press();
      button.press();
    });
    a.disposers.push(button.dispose);
  }
  a.updates.push(view.update);
  return { ...a.part(), view };
}

/** An operator terminal: function keys and a keypad, each a momentary key. */
export function operatorTerminal(
  kit: PanelKit,
  props: Common & {
    onKey?: (key: string) => void;
    power?: Readable<boolean>;
  },
): Part & { view: TerminalView } {
  const a = beginPart(kit, props.name ?? 'operator terminal');
  const view = createOperatorTerminal(kit);
  a.object.add(view.group);
  const legends = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '↵'];
  const keys: [string, (typeof view.keypad)[number]][] = [
    ...view.functionKeys.map((k, i) => [`F${i + 1}`, k] as [string, typeof k]),
    ...view.keypad.map((k, i) => [legends[i], k] as [string, typeof k]),
  ];
  for (const [name, key] of keys) {
    const button = createMomentary({
      action: () => props.onKey?.(name),
      power: props.power,
    });
    a.voice(button, { press: KEY }, key.group);
    a.uses.set(key.cap, () => {
      key.press();
      button.press();
    });
    a.disposers.push(button.dispose);
  }
  a.updates.push(view.update);
  return { ...a.part(), view };
}

// ---- Door latch --------------------------------------------------------------

/**
 * A quarter-turn wing latch on a cabinet door: a click opens the door or
 * shuts it. Its state, open, is the door's: bind it to the world to make
 * the door's being open matter to anything else (an interlock, say).
 */
export function doorLatch(
  kit: PanelKit,
  props: Common & {
    material: Material;
    initial?: boolean;
    bound?: Binding<boolean>;
    latch?: Readable<boolean>;
    /** Full-height and larger cabinet leaves use varied metal movement sounds. */
    large?: boolean;
    /** Another piece that works the same door, sharing its state. */
    shared?: ReturnType<typeof createSwitch>;
  },
): Part & {
  open: ReadonlySignal<boolean>;
  door: ReturnType<typeof createSwitch>;
} {
  const a = beginPart(kit, props.name ?? 'door latch');
  a.object.userData.useWhileCarrying = true;
  a.object.add(createWingLatchView(props.material));
  const door =
    props.shared ??
    createSwitch({
      initial: props.initial,
      bound: props.bound,
      latch: props.latch,
    });
  if (!props.shared) {
    a.voice(door, {
      on: props.large ? largeDoorMovement : DOOR_OPEN,
      off: props.large ? largeDoorMovement : DOOR_SHUT,
      refused: LOCKED,
    });
    a.disposers.push(door.dispose);
  }
  a.uses.set(a.object, () => door.flip());
  return {
    ...a.part(),
    open: computed(() => door.state.value),
    door,
  };
}

/** A vented door back closes the same component that its front latches open. */
export function doorBack(
  kit: PanelKit,
  props: Common & {
    shared: ReturnType<typeof createSwitch>;
    material: Material;
    layout: Parameters<typeof createDoorRearCover>[1];
  },
): Part {
  const a = beginPart(kit, props.name ?? 'door rear cover');
  a.object.userData.useWhileCarrying = true;
  a.object.add(createDoorRearCover(kit, props.layout, props.material));
  // A click on it moves the door, not it (`mergeTree`).
  a.object.userData.still = true;
  a.uses.set(a.object, () => {
    if (props.shared.state.value) props.shared.flip();
  });
  return a.part();
}

/** A round black boss with a flat wing to turn it by. */
function createWingLatchView(material: Material): Group {
  const latch = new Group();
  const boss = new Mesh(
    new CylinderGeometry(0.013, 0.015, 0.012, 16),
    material,
  );
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.006;
  latch.add(boss);
  const wing = new Mesh(new BoxGeometry(0.009, 0.034, 0.016), material);
  wing.position.z = 0.019;
  latch.add(wing);
  return latch;
}

// ---- Rack-mount unit ---------------------------------------------------------

/** A chassis running out on its slides, and back in. */
const SLIDE = click({ band: 2400, q: 1, decay: 0.03, level: 0.3, sweep: 0.25 });
/** A drawer running out on its ball-bearing runners, rattling its contents. */
const DRAWER = click({
  band: 1800,
  q: 1.2,
  decay: 0.05,
  level: 0.5,
  repeat: [4, 0.06],
  sweep: 0.18,
});

/**
 * A rack-mount unit as a part: its panel and chassis to its props
 * (`createRackUnit`), and whether it is pulled out of its rack, its own
 * or the world's. A click on it runs it out on its slides, or back in.
 * The chassis itself is silent; only its slides sound as it moves.
 */
export function rackUnit(
  kit: PanelKit,
  props: Common &
    RackUnitOptions & {
      pulled?: boolean;
      bound?: Binding<boolean>;
      latch?: Readable<boolean>;
      /** How far it runs out, metres; most of its depth by default. */
      travel?: number;
    },
): Part & { view: RackUnitView; pulled: ReadonlySignal<boolean> } {
  const a = beginPart(
    kit,
    props.name ?? `${props.label ?? props.style} rack unit`,
  );
  const view = createRackUnit(kit, props);
  a.object.add(view.group);
  const out = createSwitch({
    initial: props.pulled,
    bound: props.bound,
    latch: props.latch,
  });
  // A drawer rattles out on its runners; a chassis slides on its rails.
  const slide = props.style === 'drawer' ? DRAWER : SLIDE;
  a.voice(out, { on: slide, off: slide, refused: LOCKED });
  a.uses.set(view.group, () => out.flip());
  const travel = props.travel ?? Math.min(0.45, view.depth * 0.7);
  // It slides from wherever it was mounted, which may be in a cabinet.
  let home: number | null = null;
  let slid = 0;
  a.updates.push((delta) => {
    home ??= view.group.position.z;
    const target = out.state.value ? travel : 0;
    slid += (target - slid) * Math.min(1, delta * 4);
    view.group.position.z = home + slid;
  });
  a.disposers.push(out.dispose);
  return { ...a.part(), view, pulled: out.state };
}

// ---- Devices -----------------------------------------------------------------

/** A contactor pulling in: a solid clunk; and the lighter clack out. */
const PULL_IN = click({
  band: 1100,
  q: 1.3,
  decay: 0.06,
  level: 0.85,
  thump: [85, 0.1],
});
const DROP_OUT = click({
  band: 2000,
  q: 1.5,
  decay: 0.04,
  level: 0.6,
  thump: [130, 0.05],
});
/** A fuse blowing: a flat pop. */
const BLOW = click({
  band: 1500,
  q: 0.7,
  decay: 0.05,
  level: 1,
  thump: [110, 0.06],
});
/** An electrolytic's can bulging: a small tick. */
const BULGE = click({
  band: 5000,
  q: 6,
  decay: 0.01,
  level: 0.3,
  repeat: [2, 0.09],
});
/** A capacitor venting: a bang and a hiss of escaping electrolyte. */
const VENT = click({
  band: 800,
  q: 0.5,
  decay: 0.35,
  level: 1,
  thump: [55, 0.25],
  sweep: 0.05,
});
/** A part pulled from its clips and a new one pushed home. */
const REPLACE = click({
  band: 5200,
  q: 4,
  decay: 0.012,
  level: 0.45,
  repeat: [3, 0.035],
});

/**
 * A motor control unit: its door, and the breaker's operating handle on
 * it, interlocked so the door will not open while the handle is ON. The
 * breaker hums while ON. Padlocked (`latch`), the handle will not move.
 */
export function motorControlUnit(
  kit: PanelKit,
  props: Common & { latch?: Readable<boolean> },
): Part & { trip(): void; on: ReadonlySignal<boolean> } {
  const a = beginPart(kit, props.name ?? 'motor control unit');
  const view = createMotorUnit(kit);
  a.object.add(view.group);
  const handle = createOperatingHandle({ latch: props.latch });
  const door = createSwitch({ latch: handle.on });
  a.voice(
    handle,
    { on: HANDLE, off: HANDLE, trip: TRIP, refused: LOCKED },
    view.handle,
  );
  a.voice(door, { on: DOOR_OPEN, off: DOOR_SHUT, refused: LOCKED }, view.door);
  a.holdWhile(handle.on, MAINS_HUM);
  a.uses.set(view.handle, () => handle.operate());
  a.uses.set(view.door, () => door.flip());
  a.updates.push((delta) => {
    view.setHandle(handle.position.value);
    view.setDoor(door.state.value);
    view.update(delta);
  });
  a.disposers.push(handle.dispose, door.dispose);
  return { ...a.part(), trip: handle.trip, on: handle.on };
}

/**
 * A three-pole contactor: it pulls in while its coil is energised, with
 * a clunk, and holds with a faint buzz; welded, it stays in.
 */
export function contactor(
  kit: PanelKit,
  props: Common & { coil: Readable<boolean> },
): Part & { component: ReturnType<typeof createContactor> } {
  const a = beginPart(kit, props.name ?? 'contactor');
  const view = createContactorView(kit);
  a.object.add(view.group);
  const part = createContactor({ coil: props.coil });
  a.voice(part, { 'pull-in': PULL_IN, 'drop-out': DROP_OUT });
  a.holdWhile(part.closed, RELAY_HOLD);
  a.updates.push((delta) => {
    view.set(part.closed.value);
    view.update(delta);
  });
  a.disposers.push(part.dispose);
  return { ...a.part(), component: part };
}

/**
 * A thermal overload relay: it heats with the square of the current over
 * its dial's setting and trips with a snap; its dial turns in detents,
 * RESET resets it once cool, TEST trips it by hand.
 */
export function overloadRelay(
  kit: PanelKit,
  props: Common & { current: Readable<number>; settings?: readonly number[] },
): Part & { component: ReturnType<typeof createOverloadRelay> } {
  const a = beginPart(kit, props.name ?? 'overload relay');
  const view = createOverloadRelayView(
    kit,
    props.settings ? '2.5   3   3.5   4 A' : undefined,
  );
  a.object.add(view.group);
  const relay = createOverloadRelay({
    current: props.current,
    settings: props.settings,
  });
  a.voice(relay, { trip: TRIP, press: PRESS });
  a.voice(relay.dial, { detent: KNOB, refused: LOCKED }, view.dial);
  a.uses.set(view.dial, (direction = 1) => relay.dial.turn(direction));
  a.uses.set(view.reset, () => {
    view.pressReset();
    relay.reset();
  });
  a.uses.set(view.test, () => {
    view.pressTest();
    relay.test();
  });
  a.updates.push((delta) => {
    relay.step(delta);
    view.set(relay.dial.share.value, relay.tripped.value);
    view.update(delta);
  });
  a.disposers.push(relay.dispose);
  return { ...a.part(), component: relay };
}

/**
 * A cartridge fuse in its holder: it blows with a pop when overloaded
 * long enough; a click on the cartridge replaces it.
 */
export function fuse(
  kit: PanelKit,
  props: Common & { current: Readable<number>; rating: number },
): Part & {
  component: ReturnType<typeof createFuse>;
  cartridge: Group;
  detachCartridge(): void;
  restoreCartridge(): void;
} {
  const a = beginPart(kit, props.name ?? 'fuse');
  const view = createFuseHolderView(kit);
  a.object.add(view.group);
  const part = createFuse({ current: props.current, rating: props.rating });
  a.voice(part, { blow: BLOW, press: REPLACE }, view.cartridge);
  a.uses.set(view.cartridge, () => part.replace());
  a.updates.push((delta) => {
    part.step(delta);
    view.set(part.blown.value);
    view.update(delta);
  });
  a.disposers.push(part.dispose);
  return {
    ...a.part(),
    component: part,
    cartridge: view.removable,
    detachCartridge: view.detachCartridge,
    restoreCartridge: view.restoreCartridge,
  };
}

/** A single capacitor is the same electrical component, mounted or loose. */
export function electrolyticCapacitor(
  kit: PanelKit,
  props: Common & {
    voltage: Readable<number>;
    rated: number;
    attachment?: Attachment;
  },
) {
  const a = beginPart(kit, props.name ?? 'electrolytic capacitor');
  const view = createElectrolyticCapacitorView(kit);
  a.object.add(view.group);
  const component = createCapacitor(props);
  a.voice(component, { vent: VENT, bulge: BULGE, press: REPLACE });
  a.uses.set(view.group, () => component.replace());
  a.updates.push((dt) => {
    component.step(dt);
    view.set(
      component.health.value,
      component.smoke.value,
      component.failureAge.value,
      component.embers.value,
    );
  });
  a.disposers.push(component.dispose, view.dispose);
  return { ...a.part(), component };
}

/**
 * A drive's power board with its two DC bus capacitors, each across
 * `voltage`: over its rating a can bulges with a tick, then vents with a
 * bang and smoke; a click on a can replaces it.
 */
export function capacitorBoard(
  kit: PanelKit,
  props: Common & {
    voltage: Readable<number>;
    rated: number;
    reducedMotion?: () => boolean;
  },
): Part & { capacitors: ReturnType<typeof createCapacitor>[] } {
  const a = beginPart(kit, props.name ?? 'capacitor board');
  const view = createCapacitorBoardView(kit);
  a.object.add(view.group);
  const capacitors = [0, 1].map((i) => {
    const can = createCapacitor({ voltage: props.voltage, rated: props.rated });
    a.voice(can, { bulge: BULGE, vent: VENT, press: REPLACE }, view.cans[i]);
    a.uses.set(view.cans[i], () => can.replace());
    a.disposers.push(can.dispose);
    return can;
  });
  let seconds = 0;
  a.updates.push((delta) => {
    seconds += delta;
    capacitors.forEach((can, i) => {
      can.step(delta);
      view.set(
        i,
        can.health.value,
        can.smoke.value,
        can.failureAge.value,
        can.embers.value,
      );
    });
    view.update(seconds, delta, props.reducedMotion?.() ?? false);
  });
  a.disposers.push(view.dispose);
  return { ...a.part(), capacitors };
}

/**
 * An induction motor: it runs up to `speed` (rpm) while `running`, and
 * coasts down on its own inertia, humming while it runs.
 */
export function motor(
  kit: PanelKit,
  props: Common & { running: Readable<boolean>; speed: Readable<number> },
): Part {
  const a = beginPart(kit, props.name ?? 'motor');
  const view = createMotorView(kit);
  a.object.add(view.group);
  a.holdWhile(
    computed(() => props.running.value),
    MOTOR_HUM,
  );
  let rpm = 0;
  a.updates.push((delta) => {
    const target = props.running.value ? props.speed.value : 0;
    rpm += (target - rpm) * Math.min(1, delta * (target > rpm ? 1.5 : 0.4));
    view.set(rpm);
    view.update(delta);
  });
  return a.part();
}

// ---- A room's parts ----------------------------------------------------------

/**
 * The parts a room has placed: one map of what each click works, one
 * update for them all, and one stream of what they do, for a log.
 */
export function createPartSet() {
  const parts: Part[] = [];
  const uses = new Map<Object3D, (direction?: number) => void>();
  const listeners = new Set<(event: PartEvent, name: string) => void>();
  return {
    uses,
    add<P extends Part>(part: P): P {
      parts.push(part);
      for (const [object, use] of part.uses) uses.set(object, use);
      part.onEvent((event, name) => {
        for (const listener of listeners) listener(event, name);
      });
      return part;
    },
    /** Take a part out again, for one a room does away with, and free it. */
    remove(part: Part) {
      const at = parts.indexOf(part);
      if (at < 0) return;
      parts.splice(at, 1);
      for (const [object] of part.uses) uses.delete(object);
      part.dispose();
    },
    update(delta: number) {
      for (const part of parts) part.update(delta);
    },
    /** Hush every part's held sounds while the room is hidden, and back. */
    setAudible(on: boolean) {
      for (const part of parts) part.setAudible(on);
    },
    onEvent(listener: (event: PartEvent, name: string) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      for (const part of parts) part.dispose();
      listeners.clear();
    },
  };
}

export type PartSet = ReturnType<typeof createPartSet>;
