import { computed, signal } from '@preact/signals-core';
import type { ReadonlySignal } from '@preact/signals-core';
import { click, recording, tone } from '../../core/audio/part-audio';
import type { SoundRecipe } from '../../core/audio/part-audio';
import {
  ALARM_BUZZER,
  CRACKLE,
  FIRE_BELL,
  FIRE_SOUNDER,
  WATER_SPRAY,
} from '../../core/audio/part-loops';
import type { Binding, Readable } from '../../core/logic/world/components';
import {
  createBinFire,
  createCeilingSpeaker,
  createFireBell,
  createCallPoint,
  createExtinguisher,
  createFirePanel,
  createHeldFireDoor,
  createSmokeDetector,
  createSounderBeacon,
  createSprinklerHead,
  createValveSet,
} from '../views/fire-fittings';
import type { ExtinguisherKind, PanelLamps } from '../views/fire-fittings';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import {
  BEEP,
  CALL_POINT,
  CHIME,
  DOOR_OPEN,
  DOOR_SHUT,
  ERROR,
  KEY_TURN,
  LID,
  LOCKED,
  PRESS,
  emitter,
  play,
  show,
} from '../../core/parts/building-part-tools';

/**
 * Active fire safety equipment as parts, bound to a building's fire model
 * (`architectural/logic/building-services.ts`): call points, sounders,
 * detectors, the alarm panel, the voice alarm, sprinklers, the valve set
 * and bell, extinguishers and the held fire door.
 */

const HANDWHEEL = click({
  band: 700,
  q: 1,
  decay: 0.06,
  level: 0.6,
  repeat: [4, 0.09],
  thump: [60, 0.08],
});

const PIN = click({ band: 4200, q: 3, decay: 0.02, level: 0.5 });

/** A sprinkler head's glass bulb bursting. */
const BULB = click({
  band: 5200,
  q: 1.5,
  decay: 0.03,
  level: 0.7,
  thump: [300, 0.03],
});

/** The voice alarm's alert tone: a second on, a second off, three times. */
const ALERT_TONE = tone({
  hz: 970,
  seconds: 1,
  level: 0.05,
  type: 'triangle',
  repeat: [3, 1],
});

/**
 * The voice alarm's messages, a calm British voice (`CREDITS.md`). Their
 * paths are written out in full so the build bundles them: a path built at
 * run time from a folder below `assets/` is left out.
 */
const ALERT = recording(
  new URL('../audio/assets/voice-alarm/va-alert.mp3', import.meta.url),
  0.9,
);

const EVACUATE = recording(
  new URL('../audio/assets/voice-alarm/va-evacuate.mp3', import.meta.url),
  0.9,
);

const FALSE_ALARM = recording(
  new URL('../audio/assets/voice-alarm/va-false-alarm.mp3', import.meta.url),
  0.9,
);

const ALL_CLEAR = recording(
  new URL('../audio/assets/voice-alarm/va-all-clear.mp3', import.meta.url),
  0.9,
);

// ---- Fire --------------------------------------------------------------------

/** A resettable call point: press its face; reset it with its key. */
export function callPoint(
  kit: PanelKit,
  props: {
    latched: Readable<boolean>;
    press: () => void;
    reset: () => void;
  },
): Part {
  const a = beginPart(kit, 'manual call point');
  const view = createCallPoint(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: CALL_POINT, release: KEY_TURN, refused: LOCKED });
  a.uses.set(view.face, () => {
    if (props.latched.value) return e.emit('refused');
    props.press();
    e.emit('press');
  });
  a.uses.set(view.key, () => {
    props.reset();
    e.emit('release');
  });
  show(a, () => view.set(props.latched.value));
  return a.part();
}

/** A sounder-beacon; `voice` gives it the sounder's sound. */
export function sounderBeacon(
  kit: PanelKit,
  props: {
    sounding: Readable<boolean>;
    voice?: boolean;
    /** A voice-alarm sequence can pause the tone while speech plays. */
    tone?: Readable<boolean>;
  },
): Part {
  const a = beginPart(kit, 'sounder-beacon');
  const view = createSounderBeacon(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.sounding.value));
  a.updates.push(view.update);
  if (props.voice !== false)
    a.holdWhile(props.tone ?? props.sounding, FIRE_SOUNDER);
  return a.part();
}

/** An optical smoke detector, showing the model's alarm. */
export function smokeDetector(
  kit: PanelKit,
  props: { alarm: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'smoke detector');
  const view = createSmokeDetector(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.alarm.value));
  a.updates.push(view.update);
  return a.part();
}

/**
 * The fire alarm panel. Its controls work only at access level 2: with
 * its red key turned, or after the numbered keys; it beeps when one works
 * and buzzes an error when it refuses. The red button silences the
 * sounders, or resounds them (EVACUATE) once silenced or when quiet; the
 * green resets; the white silences the panel's own buzzer, which sounds
 * while there is a fire not yet silenced; key 2 leaves access mode and
 * key 4 tests the lamps.
 */
export function firePanel(
  kit: PanelKit,
  props: {
    lamps: Readable<PanelLamps>;
    key: Binding<boolean>;
    silence: () => boolean;
    reset: () => boolean;
    evacuate: () => boolean;
  },
): Part {
  const a = beginPart(kit, 'fire alarm panel');
  const view = createFirePanel(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { press: BEEP, refused: ERROR, on: KEY_TURN, off: KEY_TURN });
  const buzzerMuted = signal(false);
  const button = (
    mesh: Part['object']['children'][number],
    act: () => boolean,
  ) =>
    a.uses.set(mesh, () => {
      play(PRESS, a.object);
      e.emit(act() ? 'press' : 'refused');
    });
  button(view.silenceBuzzer, () => {
    buzzerMuted.value = true;
    return true;
  });
  button(view.silenceResound, () => {
    const lamps = props.lamps.value;
    return lamps.alarm && !lamps.silenced ? props.silence() : props.evacuate();
  });
  button(view.reset, () => {
    const done = props.reset();
    if (done) buzzerMuted.value = false;
    return done;
  });
  // The numbered keys: 2 leaves access mode, 4 tests the lamps; 1 and 3
  // (override delays, next option) have nothing to do on this system.
  view.keys.forEach((mesh, i) =>
    button(mesh, () => {
      if (i === 1) {
        props.key.set(false);
        return true;
      }
      if (i === 3) {
        view.lampTest();
        return true;
      }
      return false;
    }),
  );
  const turnKey = () => {
    props.key.set(!props.key.value);
    e.emit(props.key.value ? 'on' : 'off');
  };
  a.uses.set(view.key, turnKey);
  for (const child of view.keyHead.children) a.uses.set(child, turnKey);
  show(a, () => view.set(props.lamps.value));
  a.updates.push(view.update);
  a.holdWhile(
    computed(
      () =>
        props.lamps.value.fire &&
        !props.lamps.value.silenced &&
        !buzzerMuted.value,
    ),
    ALARM_BUZZER,
  );
  return a.part();
}

/**
 * A pendant sprinkler head: its glass bulb bursts with a pop when the
 * model says it has, and it sprays while water reaches it; `voice` gives
 * it the sound of the spray.
 */
export function sprinklerHead(
  kit: PanelKit,
  props: {
    head: Readable<{ burst: boolean; spraying: boolean }>;
    voice?: boolean;
    fallDistance?: number;
  },
): Part {
  const a = beginPart(kit, 'sprinkler head');
  const view = createSprinklerHead(kit, props.fallDistance);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { trip: BULB });
  let was = false;
  show(a, () => {
    const { burst, spraying } = props.head.value;
    view.set(burst, spraying);
    if (burst && !was) e.emit('trip');
    was = burst;
  });
  a.updates.push(view.update);
  if (props.voice)
    a.holdWhile(
      computed(() => props.head.value.spraying),
      WATER_SPRAY,
    );
  return a.part();
}

/**
 * The voice alarm, heard from its ceiling speaker. In the alert stage it
 * sounds the intermittent alert tone and the alert message, every half
 * minute; in evacuation, it cues the wall sounders, alternating with the
 * evacuation message, over and over; once over, the false alarm or the
 * all-clear, after a chime. Silenced, it stops at once.
 */
export function voiceAlarm(
  kit: PanelKit,
  props: {
    voice: Readable<'alert' | 'evacuate' | null>;
    announcement: Readable<{
      kind: 'false-alarm' | 'all-clear' | null;
      n: number;
    }>;
  },
): Part & { evacuationTone: ReadonlySignal<boolean> } {
  const a = beginPart(kit, 'voice alarm');
  const view = createCeilingSpeaker(kit);
  a.object.add(view.group);
  const evacuationTone = signal(false);
  let audible = true;
  let announcementTimer: ReturnType<typeof setTimeout> | undefined;
  let stopMessage = () => {};
  let mode: 'alert' | 'evacuate' | null = null;
  let clock = 0;
  let step = 0;
  const say = (recipe: SoundRecipe) => {
    stopMessage();
    stopMessage = play(recipe, a.object);
  };
  const quiet = () => {
    stopMessage();
    evacuationTone.value = false;
    clearTimeout(announcementTimer);
  };
  show(a, () => {
    const next = props.voice.value;
    if (next === mode) return;
    mode = next;
    quiet();
    clock = 0;
    step = 0;
  });
  let heard = props.announcement.value.n;
  show(a, () => {
    const { kind, n } = props.announcement.value;
    if (!kind || n === heard) return;
    heard = n;
    if (!audible) return;
    quiet();
    say(CHIME);
    announcementTimer = setTimeout(
      () => say(kind === 'false-alarm' ? FALSE_ALARM : ALL_CLEAR),
      1200,
    );
  });
  // The sequence, step by step: [seconds to wait, what to do].
  const sequences: Record<'alert' | 'evacuate', [number, () => void][]> = {
    alert: [
      [0, () => say(ALERT_TONE)],
      [6.2, () => say(ALERT)],
      [12, () => {}],
      [12, () => {}],
    ],
    evacuate: [
      [
        0,
        () => {
          evacuationTone.value = true;
        },
      ],
      [
        5,
        () => {
          evacuationTone.value = false;
        },
      ],
      [0.6, () => say(EVACUATE)],
      [11, () => {}],
    ],
  };
  a.updates.push((delta) => {
    if (!mode || !audible) return;
    clock -= delta;
    if (clock > 0) return;
    const sequence = sequences[mode];
    const [, act] = sequence[step];
    act();
    step = (step + 1) % sequence.length;
    clock = sequence[step][0] || 0.01;
  });
  a.disposers.push(quiet);
  const part = a.part();
  return {
    ...part,
    evacuationTone,
    setAudible(on) {
      if (on === audible) return;
      audible = on;
      quiet();
      clock = 0;
      step = 0;
      part.setAudible(on);
    },
  };
}

/** An electric fire bell, ringing while water flows in the sprinklers. */
export function fireBell(
  kit: PanelKit,
  props: { ringing: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'sprinkler alarm bell');
  const view = createFireBell(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.ringing.value));
  a.updates.push(view.update);
  a.holdWhile(props.ringing, FIRE_BELL);
  return a.part();
}

/** The waste-paper bin, burning as big as the model's fire. */
export function burningBin(
  kit: PanelKit,
  props: { size: Readable<number>; smoke: Readable<number> },
): Part {
  const a = beginPart(kit, 'waste-paper bin');
  const view = createBinFire(kit);
  a.object.add(view.group);
  show(a, () => view.set(props.size.value, props.smoke.value));
  a.updates.push(view.update);
  a.holdWhile(
    computed(() => props.size.value > 0),
    CRACKLE,
  );
  return a.part();
}

/** The sprinkler valve set: the main valve's handwheel and the reset. */
export function valveSet(
  kit: PanelKit,
  props: {
    main: Binding<boolean>;
    tripped: Readable<boolean>;
    reset: () => void;
  },
): Part {
  const a = beginPart(kit, 'sprinkler valve set');
  const view = createValveSet(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: HANDWHEEL, off: HANDWHEEL, press: PRESS });
  a.uses.set(view.wheel, () => {
    props.main.set(!props.main.value);
    e.emit(props.main.value ? 'on' : 'off');
  });
  a.uses.set(view.reset, () => {
    props.reset();
    e.emit('press');
  });
  show(a, () => view.set(props.main.value, props.tripped.value));
  return a.part();
}

/**
 * A portable extinguisher of its kind. It keeps its own state: a click
 * pulls the pin, the next discharges it for a few seconds, and once it is
 * empty a click puts a fresh one in its place.
 */
export function extinguisher(
  kit: PanelKit,
  props: { kind: ExtinguisherKind },
): Part & {
  state: ReadonlySignal<'ready' | 'unpinned' | 'discharging' | 'empty'>;
} {
  const a = beginPart(kit, `${props.kind} extinguisher`);
  const view = createExtinguisher(kit, props.kind);
  a.object.add(view.group);
  const state = signal<'ready' | 'unpinned' | 'discharging' | 'empty'>('ready');
  const e = emitter();
  a.voice(e, { release: PIN, press: PRESS, on: LID });
  let left = 0;
  a.uses.set(view.body, () => {
    if (state.value === 'ready') {
      state.value = 'unpinned';
      return e.emit('release');
    }
    if (state.value === 'unpinned') {
      state.value = 'discharging';
      left = 7;
      return e.emit('press');
    }
    if (state.value === 'empty') {
      state.value = 'ready';
      e.emit('on');
    }
  });
  a.updates.push((delta) => {
    if (state.value === 'discharging') {
      left -= delta;
      if (left <= 0) state.value = 'empty';
    }
    view.update(delta);
  });
  show(a, () => view.set(state.value));
  a.holdWhile(
    computed(() => state.value === 'discharging'),
    WATER_SPRAY,
  );
  return { ...a.part(), state };
}

/**
 * A fire door on an electromagnetic holder. Opened, it stays back against
 * the holder while the holder is energised; when the fire alarm releases
 * the holder the door swings shut on its closer. Opened with the holder
 * released, it shuts again by itself.
 */
export function heldFireDoor(
  kit: PanelKit,
  props: { held: Readable<boolean> },
): Part {
  const a = beginPart(kit, 'fire door');
  const view = createHeldFireDoor(kit);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: DOOR_OPEN, off: DOOR_SHUT });
  view.setTarget(true);
  let closing = 0;
  a.uses.set(view.leaf, () => {
    const open = !view.open;
    view.setTarget(open);
    closing = open && !props.held.value ? 1.5 : 0;
    e.emit(open ? 'on' : 'off');
  });
  show(a, () => {
    const held = props.held.value;
    view.setHolder(held);
    if (!held && view.open) {
      view.setTarget(false);
      e.emit('off');
    }
  });
  a.updates.push((delta) => {
    if (closing > 0) {
      closing -= delta;
      if (closing <= 0 && view.open) {
        view.setTarget(false);
        e.emit('off');
      }
    }
    view.update(delta);
  });
  return a.part();
}
