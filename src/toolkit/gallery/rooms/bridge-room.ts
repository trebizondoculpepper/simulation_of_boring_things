import { Group, Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { createChatter } from '../../components/sound/logic/console-chatter';
import { startBridgeRoom } from './control-room-prototype';
import type { Part } from '../../components/core/parts/parts';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createAnnunciator } from '../../components/industrial-control/logic/annunciator';
import { markComponent } from '../../components/core/views/component-identity';
import { ANNUNCIATOR_ALARMS } from '../logic/control-room-demo';
import {
  backWallScreenPlaces,
  bridgePanelPlaces,
  deskScreenPlaces,
  stationScreenPlaces,
  viewscreenPlace,
} from '../logic/control-room-prototype';
import { STATION_DESIGNS, stationNamed } from '../logic/station-schematics';
import type { Design } from '../logic/station-schematics';
import {
  createSchematicSurface,
  createStationSchematic,
  designScreen,
} from '../views/station-schematics';
import { createViewscreen } from '../views/bridge-viewscreen';
import { createBridgeLightsUp } from '../views/bridge-lights-up';
import { LIGHTS_UP, lightsUpTotal } from '../logic/bridge-lights-up';
import { sharedBridgeAmbience } from '../../components/sound/audio/bridge-ambience';
import { createBridgeEmergencyLights } from '../views/bridge-emergency-lights';
import {
  bridgeEmergencyLit,
  bridgeMainLit,
  lightSwitchPlace,
} from '../logic/bridge-lighting';
import { lightSwitch } from '../../components/architectural/parts/building-parts';
import {
  createEngravedSign,
  cutLines,
} from '../../components/general-safety/views/engraved-sign';
import { BRIDGE_BINDINGS, bridgeSpec } from '../logic/bridge-bindings';
import { plantReadingOf } from '../logic/world-reading';
import { createParodyPanel } from '../views/parody-panel';
import { roomWorld } from '../../save/world-store';
import { worldAnnunciator } from '../logic/world-annunciator';
import { ALARM_BLEEP, createAlarmBleep } from '../logic/alarm-bleep';
import { unacceptedAlarms } from '../../../game/annunciator';

/**
 * The bridge's consoles (mission 095): dev48's reimagined panels on its
 * stations, Central Control on the operator's desk and the control room's
 * boards on its front walls, each wired to the one world
 * (`bridge-bindings.ts`): reading it as their originals do and asking it
 * what their originals' controls ask; local-only controls refused. The
 * annunciator is the world's, shared by its CR-CP2 copy, Central Control
 * and the old control room's board: accepted at any, accepted at all.
 */
function installConsoles(kit: PanelKit): Part[] {
  const store = typeof window === 'undefined' ? null : roomWorld();
  // The world's annunciator (`game/annunciator.ts`): accepted here, at
  // CR-CP2 or the old control room's board alike, and kept.
  const shared = store
    ? worldAnnunciator(store)
    : createAnnunciator(ANNUNCIATOR_ALARMS.length, { manualReset: true });
  const context = () => {
    const world = store?.world.value;
    return world ? { world, reading: plantReadingOf(world, 'pool_02') } : null;
  };
  const consoles = bridgePanelPlaces().map((place, i) => {
    const spec = bridgeSpec(place.code);
    const binding = BRIDGE_BINDINGS[place.code];
    const panel = createParodyPanel(kit, spec, i, {
      binding,
      context,
      dispatch: (action) => store?.dispatch(action),
      shared,
    });
    const { w = 1.6, h = 1.0 } = spec.size ?? {};
    const scale = Math.min(place.fit.w / (w + 0.1), place.fit.h / (h + 0.1));
    const holder = new Group();
    holder.name = `${spec.title} (the bridge's ${spec.code})`;
    holder.position.set(place.x, place.y, place.z);
    holder.rotation.order = 'YXZ';
    holder.rotation.set(-place.tilt, place.yaw, 0);
    panel.object.scale.setScalar(scale);
    // Its glass is drawn about its middle: at the holder's origin.
    holder.add(panel.object);
    // Bound to its original's node in its room's model (`world-in-model.ts`).
    markComponent(holder, {
      name: holder.name,
      model: { node: binding.model.node },
      status: () => panel.status?.(),
    });
    const parts = panel.parts!;
    return {
      object: holder,
      uses: parts.uses,
      update: (delta: number) => panel.update?.(delta),
      onEvent: parts.onEvent,
      setAudible: parts.setAudible,
      dispose: () => {
        parts.dispose();
        panel.dispose?.();
      },
    };
  });
  // The stations' schematic screens (the owner, 2026-10-27): each forward
  // station's upper screen, each rear station's on the wall over its
  // console, and the desk's upstands, each its station's browser turning
  // through its designs, set apart in time so they do not turn together.
  const places = [...stationScreenPlaces(), ...deskScreenPlaces()];
  const schematics = places.flatMap((place, i) => {
    const station = stationNamed(place.station);
    if (!station) return [];
    const screen = createStationSchematic(kit, station, place.size, context, {
      offset: (i * 18) / places.length,
      pixelsPerMetre: 600,
    });
    const holder = new Group();
    holder.name = `${station} schematic screen`;
    holder.position.set(place.x, place.y, place.z);
    holder.rotation.order = 'YXZ';
    holder.rotation.set(-place.tilt, place.yaw, 0);
    holder.add(screen.object);
    markComponent(holder, {
      name: holder.name,
      model: { node: 'operator-desk' },
      status: () => screen.status?.(),
    });
    const parts = screen.parts!;
    return [
      {
        object: holder,
        uses: parts.uses,
        update: (delta: number) => screen.update?.(delta),
        onEvent: parts.onEvent,
        setAudible: parts.setAudible,
        dispose: () => parts.dispose(),
      },
    ];
  });
  // The back walls' displays, where the conference table looked out (the
  // owner, 2026-10-27): each turning through its designs, set apart in
  // time; drawn coarser than the desks' screens, being larger and seen
  // from further off.
  const back = backWallScreenPlaces();
  const displays = back.map((place, i) => {
    const designs: readonly Design[] =
      'station' in place.show
        ? STATION_DESIGNS[stationNamed(place.show.station)!]
        : place.show.overviews.map((overview): Design => ({
            kind: 'overview',
            overview,
          }));
    const tree = designScreen(designs, {
      mode: 'rotator',
      title: place.title,
      period: 24,
      offset: (i * 24) / back.length,
    });
    const screen = createSchematicSurface(
      kit,
      tree,
      `${place.title} display`,
      place.size,
      context,
      place.h > 2 ? 200 : 320,
    );
    const holder = new Group();
    holder.name = `${place.title} display (the bridge's back wall)`;
    holder.position.set(place.x, place.y, place.z);
    holder.rotation.set(0, place.yaw, 0);
    holder.add(screen.object);
    markComponent(holder, {
      name: holder.name,
      model: { node: 'operator-desk' },
      status: () => screen.status?.(),
    });
    const parts = screen.parts!;
    return {
      object: holder,
      uses: parts.uses,
      update: (delta: number) => screen.update?.(delta),
      onEvent: parts.onEvent,
      setAudible: parts.setAudible,
      dispose: () => parts.dispose(),
    };
  });
  // The main viewscreen, live, on the big wall (`viewscreenPlace`).
  const vp = viewscreenPlace();
  const screen = createViewscreen(kit, vp.size, context, shared);
  screen.object.position.set(vp.x, vp.y, vp.z);
  markComponent(screen.object, {
    name: 'Main viewscreen',
    model: { node: 'mimic-pool' },
    status: () => screen.status?.(),
  });
  const sp = screen.parts!;
  return [
    ...consoles,
    ...schematics,
    ...displays,
    {
      object: screen.object as Group,
      uses: sp.uses,
      update: (delta: number) => screen.update?.(delta),
      onEvent: sp.onEvent,
      setAudible: sp.setAudible,
      dispose: () => sp.dispose(),
    },
  ];
}

/**
 * The bridge, the game's control room (mission 095): dev46's room off the
 * main corridor, with its working consoles; dark as the walker comes in
 * from the corridor, its lights then coming up (`bridge-lights-up.ts`).
 */
export function startTheBridge(canvas: HTMLCanvasElement) {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const world = () => store?.world.value ?? null;
  // Its lights coming up as the walker comes in, while MAIN LIGHTS is on
  // and its way live (the owner, 2026-10-27).
  const lightsUp = createBridgeLightsUp(() => {
    const w = world();
    return w ? bridgeMainLit(w) : true;
  });
  const chatter = installChatter();
  const alarmBleep = installAlarmBleep();
  const handle = startBridgeRoom(canvas, (kit) => [
    ...installConsoles(kit),
    installLightSwitch(kit),
    lightsUp,
    chatter,
    alarmBleep,
  ]);
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
      lightsUp.enter(from);
      chatter.setActive(true);
      alarmBleep.setActive(true);
      // From the corridor it rises with the lights; arriving any other
      // way (a reload, a link, noclip) it is simply there.
      ambience.bridge(
        true,
        from === 'main_corridor'
          ? { after: LIGHTS_UP.dark, rise: lightsUpTotal() - LIGHTS_UP.dark }
          : undefined,
      );
    },
    suspend: () => {
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
 * under it; and the emergency fittings it switches, lit as the world
 * says (`bridgeEmergencyLit`).
 */
function installLightSwitch(kit: PanelKit): Part {
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
      emergency.set(w ? bridgeEmergencyLit(w) : false);
    },
    onEvent: part.onEvent,
    setAudible: part.setAudible,
    dispose: () => part.dispose(),
  };
}

/**
 * The consoles chattering (the owner, 2026-10-27): every so often (a
 * normal spread of gaps, mean 25 s, deviation 10 s, `console-chatter.ts`)
 * one of the stations round the room, forward or aft, bleeps or bloops a
 * chirp made up afresh, heard from where it stands. Only with the walker
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
      if (due) partAudio.play({ tones: due.chirp }, emitters[due.console]);
    },
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
  };
}

/**
 * The alarm bleep (the owner, 2026-10-27): while any alarm on the world's
 * annunciator is unaccepted and the walker is on the bridge, a two-tone
 * bleep from Central Control, where it is accepted, at once and then
 * every 10 s (`logic/alarm-bleep.ts`); it stops on ACCEPT.
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
      const n = w ? unacceptedAlarms(w.annunciator).length : 0;
      return n ? `${n} unaccepted · bleeping` : 'Quiet';
    },
  });
  return {
    object,
    uses: new Map<Object3D, () => void>(),
    setActive: (on: boolean) => clock.setActive(on),
    update(delta: number) {
      const w = store?.world.value;
      const due = clock.step(
        delta,
        w ? unacceptedAlarms(w.annunciator).length > 0 : false,
      );
      if (due) partAudio.play({ tones: [...ALARM_BLEEP.tones] }, at);
    },
    onEvent: () => () => {},
    setAudible: () => {},
    dispose: () => {},
  };
}
