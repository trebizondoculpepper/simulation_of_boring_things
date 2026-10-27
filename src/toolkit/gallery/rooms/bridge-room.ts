import { Group } from 'three';
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
import { BRIDGE_BINDINGS, bridgeSpec } from '../logic/bridge-bindings';
import { plantReadingOf } from '../logic/world-reading';
import { createParodyPanel } from '../views/parody-panel';
import { roomWorld } from '../../save/world-store';

/**
 * The bridge's consoles (mission 095): dev48's reimagined panels on its
 * stations, Central Control on the operator's desk and the control room's
 * boards on its front walls, each wired to the one world
 * (`bridge-bindings.ts`): reading it as their originals do and asking it
 * what their originals' controls ask; local-only controls refused. The
 * annunciator's ACCEPT and RESET are the room's, as the old control
 * room's were its board's, shared by its CR-CP2 copy and Central Control.
 */
function installConsoles(kit: PanelKit): Part[] {
  const store = typeof window === 'undefined' ? null : roomWorld();
  const shared = createAnnunciator(ANNUNCIATOR_ALARMS.length, {
    manualReset: true,
  });
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
  // Its lights coming up as the walker comes in (the owner, 2026-10-27).
  const lightsUp = createBridgeLightsUp();
  const handle = startBridgeRoom(canvas, (kit) => [
    ...installConsoles(kit),
    lightsUp,
  ]);
  return Object.assign(handle, {
    enter: (from: string | null) => lightsUp.enter(from),
    suspend: () => lightsUp.leave(),
  });
}
