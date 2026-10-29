import { Group, Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import type { LoopRecipe } from '../../components/core/audio/part-audio';
import { musicPlaylist } from '../../components/sound/audio/music-playlist';
import { computed, effect, signal } from '@preact/signals-core';
import { createChatter } from '../../components/sound/logic/console-chatter';
import {
  LEVELS,
  bootCue,
  createCueGate,
  createPicker,
} from '../../components/sound/logic/console-sounds';
import { playConsoleSound } from '../../components/sound/audio/console-recordings';
import { startBridgeRoom } from './control-room-prototype';
import type { Part } from '../../components/core/parts/parts';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { markComponent } from '../../components/core/views/component-identity';
import {
  bridgePanelPlaces,
  stationScreenPlaces,
} from '../logic/control-room-prototype';
import { BRIDGE_BINDINGS } from '../logic/bridge-bindings';
import { installBridgeConsoles } from '../views/bridge-console';
import { createBridgeLightsUp } from '../views/bridge-lights-up';
import {
  DISPLAYS_ON_AT,
  ENTRANCE_BOOT,
  displaysOnLeaving,
  LIGHTS_UP,
  THEME_AT,
  entranceBootMean,
  entranceKind,
  entranceLightsAt,
  lightsUpTotal,
  revealWaiting,
  stepReveal,
} from '../logic/bridge-lights-up';
import type { Entrance, RevealTrigger } from '../logic/bridge-lights-up';
import type { EquipmentDoorsPart } from '../../components/architectural/parts/equipment-doors';
import {
  bootGroupOf,
  onBootPhase,
} from '../../components/industrial-control/views/touch-surface';
import type { BootGroup, BootSpec } from '../../../ui2d';
import { roomPowered } from '../views/room-power';
import { createThemeCue } from '../logic/bridge-theme-cue';
import { sharedBridgeAmbience } from '../../components/sound/audio/bridge-ambience';
import { createBridgeEmergencyLights } from '../views/bridge-emergency-lights';
import {
  bridgeEmergencyLit,
  bridgeMainLit,
  bridgeSwitchLive,
  lightSwitchPlace,
} from '../logic/bridge-lighting';
import { lightSwitch } from '../../components/architectural/parts/building-parts';
import {
  createEngravedSign,
  cutLines,
} from '../../components/general-safety/views/engraved-sign';
import { roomWorld } from '../../save/world-store';
import { ALARM_BLEEP, createAlarmBleep } from '../logic/alarm-bleep';
import { unacceptedAlarms } from '../../../game/annunciator';
import { unacceptedLocationAlarms } from '../../../game/plant/location-annunciators';
import type { World } from '../../../game/world';

/** Alarms not yet accepted on any annunciator, the main one's and every location's (the owner, 2026-10-28; mission 099). */
const unacceptedEverywhere = (w: World) =>
  unacceptedAlarms(w.annunciator).length + unacceptedLocationAlarms(w);

/**
 * The bridge, the game's control room (mission 095): dev46's room off the
 * main corridor, with its working consoles; dark as the walker comes in
 * from the corridor, its lights then coming up (`bridge-lights-up.ts`).
 */
/** How long after coming in (any way but the corridor), its MAIN LIGHTS found off, the bridge puts them on: ms. From the corridor on a later visit, `LIGHTS_UP.again`; never in the first view. */
export const AUTO_LIGHTS_ON_MS = 3000;

export function startTheBridge(canvas: HTMLCanvasElement) {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const world = () => store?.world.value ?? null;
  // Its lights coming up as the walker comes in, while MAIN LIGHTS is on
  // and its way live (the owner, 2026-10-27).
  let lightsOnTimer = 0;
  // Whether the walker is on the bridge now.
  let inside = false;
  /** The way the walker came in: the corridor's doors or the freight lift. */
  let cameBy: string | null = null;
  const lightsUp = createBridgeLightsUp(() => {
    const w = world();
    return w ? bridgeMainLit(w) : true;
  });
  const chatter = installChatter();
  const alarmBleep = installAlarmBleep();
  // The theme: cued once, stopped only by the walker leaving or its end.
  const theme = createThemeCue({
    start: () => bridgeTheme.play(),
    stop: (ending) => bridgeTheme.stop(ending ? THEME_END_FADE : THEME_FADE),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  });
  // Its displays (the owner, 2026-10-27): every touch screen made with its
  // kit, on one display power: the control room's supply live and the
  // bridge's displays switched on in the world (`bridgeDisplaysOn`). Off,
  // every one is UNPOWERED, black at once, wherever it is seen from (after
  // RESET, from the corridor); on, each boots on its own drawn durations
  // (`ENTRANCE_BOOT`), or comes straight on (`'instant'`: arriving by a
  // reload or a link).
  let displays: BootGroup | null = null;
  const supply = roomPowered('control_room');
  const displayPower = computed(() => {
    const w = store?.world.value;
    return w ? supply() && w.bridgeDisplaysOn : true;
  });
  let powerUp: BootSpec | 'instant' = ENTRANCE_BOOT;
  // Told, as the displays' power rises, when the last will be operational.
  let onBooting: ((ready: number) => void) | null = null;
  const switchDisplays = (on: boolean, up: BootSpec | 'instant') => {
    if (!store || store.world.value.bridgeDisplaysOn === on) return;
    powerUp = up;
    store.dispatch({ type: 'bridge/displays', on });
    powerUp = ENTRANCE_BOOT;
  };
  // Its doors to the corridor, and the first view waiting for them to shut
  // behind the walker (the owner, 2026-10-27; `stepReveal`).
  let doors: EquipmentDoorsPart | null = null;
  let reveal: RevealTrigger | null = null;
  // Seconds since the doors shut, in the first view; whether its displays
  // have been switched on yet.
  let sinceDoors = 0;
  let displaysAsked = false;
  /** The first view begun, the doors shut behind the walker: its t = 0. */
  const beginFirstView = () => {
    // The main lights' time known once the displays boot.
    const entrance: Entrance = { kind: 'first', lightsAt: Infinity };
    lightsUp.begin(entrance);
    sinceDoors = 0;
    displaysAsked = false;
    // Heard from now, a save; begun as the room goes black (`THEME_AT`).
    store?.dispatch({ type: 'bridge/theme-heard' });
    theme.cue(THEME_AT);
  };
  // Each frame: the held first view's trigger, stepped with the doors; then
  // its displays switched on at `DISPLAYS_ON_AT`.
  const revealPart: Part = {
    object: new Group(),
    uses: new Map(),
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
    update(delta) {
      if (!reveal) return;
      if (!reveal.started) {
        // Shut behind the walker: the corridor's doors, or, come by the
        // freight lift, its doors at floor 3 (mission 108).
        const lift = world()?.lifts.freight;
        const shut =
          cameBy === 'freight_lift'
            ? !lift ||
              lift.trip !== null ||
              lift.floor !== '3' ||
              lift.open <= 0
            : doors
              ? doors.angle() < 1e-3
              : true;
        reveal = stepReveal(reveal, delta, shut);
        if (reveal.started) beginFirstView();
        return;
      }
      sinceDoors += delta;
      if (!displaysAsked && sinceDoors >= DISPLAYS_ON_AT) {
        displaysAsked = true;
        // Each display booting on its own drawn durations; the main lights
        // `LIGHTS_UP.afterBoot` after the last is operational.
        onBooting = (ready) =>
          lightsUp.setLightsAt(entranceLightsAt('first', sinceDoors + ready));
        switchDisplays(true, ENTRANCE_BOOT);
      }
    },
  };
  const handle = startBridgeRoom(
    canvas,
    (kit) => {
      const group = bootGroupOf(kit);
      displays = group;
      const bootSounds = installBootSounds(kit);
      // One power for every display, however and whenever built: those
      // already made, and those to come (they join at the group's power).
      effect(() => {
        const on = displayPower.value;
        if (on === group.powered) return;
        const up = on ? powerUp : 'instant';
        const ready = group.setPower(on, up);
        powerUp = ENTRANCE_BOOT;
        if (on && onBooting) {
          onBooting(ready);
          onBooting = null;
        }
      });
      // Reset to first found (the CONTROL ROOM MODE plate's RESET) while the
      // walker is away: dark again but for its emergency glow (its displays
      // switched off in the world).
      if (store) {
        let heard = store.world.value.bridgeThemeHeard;
        effect(() => {
          const now = store.world.value.bridgeThemeHeard;
          if (heard && !now && !inside) lightsUp.reset();
          heard = now;
        });
      }
      return [
        ...installBridgeConsoles(kit),
        installLightSwitch(kit, () => lightsUp.glow()),
        lightsUp,
        revealPart,
        bootSounds,
        chatter,
        alarmBleep,
      ];
    },
    (d) => (doors = d),
  );
  // Its room tone (`components/sound/audio/bridge-ambience.ts`): the
  // game's one, shared with the corridor, which hears it through the open
  // doors; full whenever the walker is in here, however they came, rising
  // with its lights; the room's equipment, so it hums on with them off.
  const ambience = sharedBridgeAmbience();
  const dispose = () => {
    handle();
    ambience.bridge(false);
  };
  return Object.assign(dispose, handle, {
    enter: (from: string | null) => {
      inside = true;
      cameBy = from;
      // Which entrance (`doc/notes/bridge_reveal.md`): walked in from the
      // corridor, the first view while the theme is unheard (a first visit,
      // or after RESET), a later visit otherwise; any other way, none.
      const w0 = world();
      const heard = w0?.bridgeThemeHeard ?? false;
      const kind = lightsUp.plays(from)
        ? entranceKind(from, false, heard)
        : null;
      let entrance: Entrance | null = null;
      onBooting = null;
      if (kind === 'first') {
        // Held, as seen from outside (displays off, the glow alone), until
        // the doors shut behind the walker (`revealPart`).
        switchDisplays(false, ENTRANCE_BOOT);
        reveal = revealWaiting();
        lightsUp.enter('held');
      } else {
        // A later visit, or any other way in: the displays simply on.
        reveal = null;
        switchDisplays(true, 'instant');
        if (displays?.powered) displays.skipAll();
        if (kind) entrance = { kind, lightsAt: entranceLightsAt(kind, 0) };
        lightsUp.enter(entrance);
        // A first visit made any other way: the bridge's theme at once,
        // once a save (the owner's, 2026-10-27; `bridgeThemeHeard`).
        if (w0 && !heard) {
          store?.dispatch({ type: 'bridge/theme-heard' });
          theme.cue(0);
        }
      }
      // Found with its MAIN LIGHTS off, the bridge puts them on itself
      // after the walker comes in (the owner, 2026-10-27), as an occupancy
      // sensor would: the switch is thrown in the world. Never in the
      // first view (the owner, 2026-10-27): there the lights come up in
      // their own time.
      window.clearTimeout(lightsOnTimer);
      const w = world();
      if (w && kind !== 'first' && !w.lighting.switches.bridge.main)
        lightsOnTimer = window.setTimeout(
          () => {
            const now = world();
            if (now && !now.lighting.switches.bridge.main)
              store?.dispatch({
                type: 'lighting/board',
                action: {
                  act: 'switch',
                  room: 'bridge',
                  gang: 'main',
                  on: true,
                },
              });
          },
          kind ? LIGHTS_UP.again * 1000 : AUTO_LIGHTS_ON_MS,
        );
      chatter.setActive(true);
      alarmBleep.setActive(true);
      // In an entrance it rises with the main lights; arriving any other
      // way (a reload, a link, noclip) it is simply there.
      // (In the first view, about when they will: the doors' wait not
      // known yet.)
      ambience.bridge(
        true,
        kind === 'first'
          ? {
              after: entranceLightsAt('first', entranceBootMean()) + 3,
              rise: lightsUpTotal(0),
            }
          : entrance
            ? { after: entrance.lightsAt, rise: lightsUpTotal(0) }
            : undefined,
      );
    },
    suspend: () => {
      // The runner's own (the lift landing's), then the bridge's.
      handle.suspend?.();
      // Suspended also when merely drawn beyond the corridor's doors
      // (`startSeeing` in `main.ts`), never having been entered: only a
      // walker leaving changes what it shows.
      const left = inside;
      inside = false;
      // Leaving (the owner, 2026-10-27): the theme fades out over 3 s (or
      // never starts); the main lights go out; the displays stay on and
      // the emergency glow stays, as seen from the corridor.
      if (left) theme.leave();
      // Left before the doors shut: nothing started, still the first view
      // (displays off); otherwise the displays stay on, any still booting
      // put on, any not yet switched on switched on.
      const held = reveal !== null && !reveal.started;
      reveal = null;
      onBooting = null;
      if (displaysOnLeaving(left, held)) {
        switchDisplays(true, 'instant');
        if (displays?.powered) displays.skipAll();
      }
      window.clearTimeout(lightsOnTimer);
      lightsUp.leave();
      chatter.setActive(false);
      alarmBleep.setActive(false);
      ambience.bridge(false);
    },
  });
}

/**
 * The bridge's light switch (the owner, 2026-10-27): a white two-gang
 * plate inside the corridor doors, to the right as one comes in, 1.2 m
 * up (`lightSwitchPlace`), its rockers MAIN LIGHTS and EMERGENCY LIGHTS
 * thrown in the world (`lighting.switches.bridge`), small engraved labels
 * under it; and the emergency lighting it switches (the glow under the
 * consoles, `underConsoleGlow`), lit as the world
 * says (`bridgeEmergencyLit`).
 */
function installLightSwitch(
  kit: PanelKit,
  /** The entrance's share of the under-console glow (`createBridgeLightsUp`). */
  entranceGlow: () => number = () => 0,
): Part {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const gang = (g: 'main' | 'emergency') => ({
    get value() {
      return store?.world.value.lighting.switches.bridge[g] ?? g === 'main';
    },
    set(on: boolean) {
      store?.dispatch({
        type: 'lighting/board',
        action: { act: 'switch', room: 'bridge', gang: g, on },
      });
    },
  });
  const part = lightSwitch(kit, {
    name: 'bridge light switch',
    gangs: [gang('main'), gang('emergency')],
    // Its locator LEDs, to find it in the dark (the owner, 2026-10-27).
    supply: {
      get value() {
        const w = store?.world.value;
        return w ? bridgeSwitchLive(w) : true;
      },
    },
  });
  const place = lightSwitchPlace();
  const holder = new Group();
  holder.name = 'Bridge light switch (MAIN LIGHTS, EMERGENCY LIGHTS)';
  holder.position.set(place.x, place.y, place.z);
  holder.rotation.y = place.yaw;
  holder.add(part.object);
  // Under each rocker a small engraved label.
  [
    ['MAIN', -0.021],
    ['EMERGENCY', 0.021],
  ].forEach(([text, x]) => {
    const label = createEngravedSign(
      kit,
      0.04,
      0.012,
      cutLines([
        { text: text as string, size: 0.42, y: 0.36, bold: true },
        { text: 'LIGHTS', size: 0.34, y: 0.74 },
      ]),
    );
    label.position.set(x as number, -0.056, 0);
    holder.add(label);
  });
  const emergency = createBridgeEmergencyLights(kit);
  markComponent(holder, {
    name: 'Bridge light switch',
    status: () => {
      const w = store?.world.value;
      if (!w) return 'Bridge light switch';
      const sw = w.lighting.switches.bridge;
      return `MAIN LIGHTS ${sw.main ? 'ON' : 'OFF'} · EMERGENCY LIGHTS ${sw.emergency ? 'ON' : 'OFF'}`;
    },
  });
  const object = new Group();
  object.add(holder, emergency.group);
  return {
    object,
    uses: part.uses,
    update(delta) {
      part.update(delta);
      const w = store?.world.value;
      // Lit as the world says, or as the entrance brings it up first.
      emergency.set(
        Math.max(w && bridgeEmergencyLit(w) ? 1 : 0, entranceGlow()),
      );
    },
    onEvent: part.onEvent,
    setAudible: part.setAudible,
    dispose: () => part.dispose(),
  };
}

/**
 * The consoles chattering (the owner, 2026-10-27): every so often (a
 * normal spread of gaps, mean 25 s, deviation 10 s, `console-chatter.ts`)
 * one of the stations round the room, forward or aft, bleeps or bloops
 * one of the owner's console sounds, resynthesised (`console-sounds.ts`,
 * `CHATTER_SOUNDS`), heard from where it stands. Only with the walker
 * on the bridge. Set decoration: it tells of nothing.
 */
function installChatter() {
  const object = new Group();
  object.name = 'Console chatter';
  const emitters = stationScreenPlaces().map((p) => {
    const at = new Object3D();
    at.position.set(p.x, p.y, p.z);
    object.add(at);
    return at;
  });
  const clock = createChatter(emitters.length, Math.random);
  markComponent(object, { name: 'Console chatter', decorative: true });
  return {
    object,
    uses: new Map<Object3D, () => void>(),
    setActive: (on: boolean) => clock.setActive(on),
    update(delta: number) {
      const due = clock.step(delta);
      if (due)
        playConsoleSound(due.sound, LEVELS.chatter, emitters[due.console]);
    },
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
  };
}

/**
 * The displays heard booting (the owner, 2026-10-27): only as each one's
 * interface starts up, drawing in after its emblem and black, a quiet cue
 * from that display; the main viewscreen's, engines online. The power
 * rising and the emblems are silent. Some 25 displays boot
 * within a few seconds, so the cues pass a gate (`createCueGate`): any
 * that would crowd another are dropped. An instant power-up (a reload, a
 * link) or a skip is silent.
 */
function installBootSounds(kit: PanelKit) {
  const object = new Group();
  object.name = 'Display boot sounds';
  const pick = createPicker(Math.random);
  const gate = createCueGate();
  const now = () =>
    typeof performance === 'undefined' ? 0 : performance.now() / 1000;
  onBootPhase(kit, (phase, screen, main) => {
    const cues = bootCue(phase, main);
    if (!cues) return;
    const name = pick(cues);
    if (gate(name, now(), main))
      playConsoleSound(name, main ? LEVELS.bootMain : LEVELS.bootEach, screen);
  });
  markComponent(object, { name: 'Display boot sounds', decorative: true });
  return {
    object,
    uses: new Map<Object3D, () => void>(),
    update: () => {},
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => onBootPhase(kit, null),
  };
}

/**
 * The alarm bleep (the owner, 2026-10-27): while any alarm on the world's
 * annunciator is unaccepted and the walker is on the bridge, the owner's
 * `amber_alert`, resynthesised, from Central Control, where it is
 * accepted, at once and then every 10 s (`logic/alarm-bleep.ts`); it
 * stops on ACCEPT.
 */
function installAlarmBleep() {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const object = new Group();
  object.name = 'Alarm bleep (Central Control)';
  const at = new Object3D();
  const cc = bridgePanelPlaces().find((p) => p.code === 'CC-01');
  if (cc) at.position.set(cc.x, cc.y, cc.z);
  object.add(at);
  const clock = createAlarmBleep();
  // Central Control's own sounder, so bound to its node.
  markComponent(object, {
    name: 'Central Control alarm bleep',
    model: { node: BRIDGE_BINDINGS['CC-01'].model.node },
    status: () => {
      const w = store?.world.value;
      const n = w ? unacceptedEverywhere(w) : 0;
      return n ? `${n} unaccepted · bleeping` : 'Quiet';
    },
  });
  return {
    object,
    uses: new Map<Object3D, () => void>(),
    setActive: (on: boolean) => clock.setActive(on),
    update(delta: number) {
      const w = store?.world.value;
      const due = clock.step(delta, w ? unacceptedEverywhere(w) > 0 : false);
      if (due) playConsoleSound(ALARM_BLEEP.sound, ALARM_BLEEP.level, at);
    },
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
  };
}

/**
 * The bridge's theme (the owner's, 2026-10-27): "Boldly Into the Deep End",
 * the whole track (2:06.8), through the game's music volume, placed
 * nowhere. Played on a first visit from its start; faded out slowly, over
 * ten seconds, from one minute (`THEME_LENGTH`, `bridge-theme-cue.ts`), or as the
 * walker leaves, whichever is first; begun again from the top on a first
 * view after the knob plate's RESET.
 */
/** Its fade as the walker leaves, and its slow fade at its own end (the owner, 2026-10-27). */
const THEME_FADE = 3;
const THEME_END_FADE = 12;
const bridgeTheme = (() => {
  const owner = {};
  let fade = THEME_FADE;
  const stop = (seconds = THEME_FADE) => {
    fade = seconds;
    partAudio.hold(owner, null);
  };
  const playlist = musicPlaylist(
    [
      {
        url: new URL(
          '../../../../resources/sound/music/bridge/boldly-into-the-deep-end.ogg',
          import.meta.url,
        ),
        title: 'Boldly Into the Deep End — Treblo',
      },
    ],
    signal(0.6),
    () => {},
  );
  // The playlist under a fader of its own, so stopping it fades it out.
  const faded: LoopRecipe = (context, out) => {
    const fader = context.createGain();
    fader.connect(out);
    const inner = playlist(context, fader);
    return [
      {
        release: THEME_END_FADE,
        // Faded first, the track released only once silent: the
        // playlist's own stop lets its stream go half a second later,
        // which cut the fade short (the owner heard it end suddenly).
        stop() {
          const t = context.currentTime;
          fader.gain.cancelScheduledValues(t);
          fader.gain.setValueAtTime(Math.max(fader.gain.value, 1e-3), t);
          // Evenly in loudness, a steady fall in decibels to −60 dB,
          // then silence: a straight ramp in gain stays loud for most of
          // its length and drops away at the end, heard as a sudden stop
          // (the owner, 2026-10-27).
          fader.gain.exponentialRampToValueAtTime(
            1e-3,
            t + Math.max(fade, 0.05),
          );
          fader.gain.setValueAtTime(0, t + Math.max(fade, 0.05));
          window.setTimeout(
            () => inner.forEach((source) => source.stop()),
            fade * 1000 + 100,
          );
        },
      },
    ];
  };
  return {
    // Once through, not round again: its end is the cue's
    // (`bridge-theme-cue.ts`, `THEME_LENGTH`).
    play() {
      stop(0);
      partAudio.hold(owner, faded);
    },
    stop,
  };
})();
