import { signal } from '@preact/signals-core';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import type { Object3D } from 'three';
import type { Footprint } from '../../controls/logic/walk-collision';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createSevenSegment,
  kitGlow,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { pushButton } from '../../components/core/parts/parts';
import type { PartSet } from '../../components/core/parts/parts';
import { partAudio } from '../../components/core/audio/part-audio';
import { createEngravedNameSign } from '../../components/general-safety/views/engraved-sign';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { createLiftDoors } from '../../components/architectural/views/lift-doors';
import {
  ARRIVAL_CHIME,
  CLOSING_WARNING,
  DOOR_CLANK,
  NUDGE_BUZZER,
} from '../../components/sound/audio/lift-sounds';
import type { WorldStore } from '../../save/world-store';
import {
  arrivalArrow,
  callLit,
  closingWarning,
  indicatorLabel,
  LIFTS,
  liftDirection,
  openAt,
} from '../logic/freight-lift';
import type { LiftId, LiftState } from '../logic/freight-lift';
import { LIFT_DOOR, liftDoorway } from '../logic/lift-doorway';
import type { LiftPlace } from '../logic/lift-doorway';
import { registerJoint } from '../logic/door-joins';
import { doorwayStops, overlaps } from '../logic/doorway';
import { enterDevRoom } from '../logic/dev-room-links';
import type { RoomId } from '../logic/dev-room-links';

/** What an indicator shows a label as on its seven segments: B2 as b2. */
export const segmentsOf = (label: string) => label.replace('B', 'b');

/**
 * A lift's floor indicator: its floor on two seven-segment digits between
 * an up and a down arrow, each arrow lit while the car goes that way (or,
 * standing with its doors open, will). Redrawn only when what it shows
 * changes. Built facing +z, centred on the origin.
 */
export function createLiftIndicator(kit: PanelKit, digitHeight = 0.07) {
  const group = new Group();
  const plate = new Mesh(
    new BoxGeometry(digitHeight * 5.2, digitHeight * 1.9, 0.02),
    kitPaint(kit, '#26292b', 0.5),
  );
  plate.position.z = -0.01;
  group.add(plate);
  const digits = createSevenSegment(kit, 2, { digitHeight });
  group.add(digits.group);
  const unlit = kitGlow(kit, '#3a2a14');
  const lit = kitGlow(kit, '#ffb21e');
  const arrow = (up: boolean) => {
    const m = new Mesh(
      new BoxGeometry(digitHeight * 0.5, digitHeight * 0.5, 0.006),
      unlit,
    );
    m.rotation.z = Math.PI / 4;
    m.position.set(
      digitHeight * (up ? -1.9 : 1.9),
      up ? digitHeight * 0.1 : -digitHeight * 0.1,
      0.004,
    );
    group.add(m);
    return m;
  };
  const up = arrow(true);
  const down = arrow(false);
  let shown = '';
  return {
    group,
    show(label: string, way: 'up' | 'down' | null) {
      const key = `${label}|${way}`;
      if (key === shown) return;
      shown = key;
      digits.show(segmentsOf(label).padStart(2, ' '));
      up.material = way === 'up' ? lit : unlit;
      down.material = way === 'down' ? lit : unlit;
    },
  };
}

/** What an indicator shows for a lift: its level, and the way it goes (or will). */
export const indicatorOf = (lift: LiftState, floors: LiftId) => ({
  label: indicatorLabel(lift, LIFTS[floors].floors),
  way:
    liftDirection(lift, LIFTS[floors].floors) ??
    arrivalArrow(lift, LIFTS[floors].floors),
});

/** The things a room tells a landing it installs, all in metres but `metre`. */
export interface LiftLandingOptions {
  room: RoomId;
  lift: LiftId;
  /** Its floor's id in the lift's floor list. */
  floor: string;
  place: LiftPlace;
  kit: PanelKit;
  parts: PartSet;
  /** The room's group in metres, where the landing is added. */
  parent: Object3D;
  /** Scene units a metre. */
  metre: number;
  store: WorldStore;
  /** The walker, as the room's first-person controls have it (scene units). */
  walk: { following: boolean; walker: { x: number; z: number } };
  /** Its sign over the doors, if not the floor's label and legend. */
  sign?: string;
  /** The wall's height over the doors, filled by the landing's own header plate (default none: the room's wall covers it). */
  headerTo?: number;
  /** The landing's floor, metres up (the bridge's is a storey up). */
  floorY?: number;
  /** The call button on the wall beside the frame (default), or on the frame's jamb where the wall beside it is narrow. */
  callOn?: 'wall' | 'jamb';
}

/**
 * A lift landing in a room (mission 108): the landing doors (vertical
 * bi-parting), the indicator over them, a call button beside them (lit
 * while called), a dark lobby behind them until the car is seen through
 * them, and the sign; its side of the doorway registered with the app, so
 * the car is drawn through the open doors and the walker handed over
 * walking through. Its room adds its `solids` to its walk and calls
 * `update` each frame. The room must leave a gap in its wall the frame's
 * width (`LIFT_DOOR.clear + 2 × frame`) and at least the doors' height.
 */
export function installLiftLanding(o: LiftLandingOptions) {
  const { place, kit, metre, store } = o;
  const spec = LIFTS[o.lift];
  const floor = spec.floors.find((f) => f.id === o.floor)!;
  const car = spec.car as RoomId;
  const doorway = liftDoorway(place);
  const root = new Group();
  root.name = `Lift landing ${floor.label}`;
  const floorY = o.floorY ?? 0;
  root.position.set(place.x, floorY, place.z);
  root.rotation.y = place.yaw;
  o.parent.add(root);
  const doors = createLiftDoors(kit);
  root.add(doors.group);
  // Behind them, dark, until the car is seen through them.
  const lobby = new Mesh(
    new BoxGeometry(LIFT_DOOR.clear, LIFT_DOOR.height, 0.05),
    kitPaint(kit, '#050505'),
  );
  lobby.position.set(0, LIFT_DOOR.height / 2, -LIFT_DOOR.depth - 0.4);
  root.add(lobby);
  // While the car is seen through the doors, a pane over the doorway that
  // draws only depth, first: whatever of this room stands behind the
  // doorway (a neighbouring hall's copy, a wall's reveal) is not drawn
  // there, and the car, drawn underneath, shows through.
  const punch = new Mesh(
    new PlaneGeometry(LIFT_DOOR.clear, LIFT_DOOR.height),
    new MeshBasicMaterial({ colorWrite: false }),
  );
  kit.materials.push(punch.material as MeshBasicMaterial);
  punch.position.set(0, LIFT_DOOR.height / 2, -0.004);
  punch.renderOrder = -1000;
  punch.visible = false;
  root.add(punch);
  if (o.headerTo && o.headerTo > LIFT_DOOR.height + LIFT_DOOR.frame) {
    const top = LIFT_DOOR.height + LIFT_DOOR.frame;
    const h = o.headerTo - top;
    const header = new Mesh(
      new BoxGeometry(LIFT_DOOR.clear + 2 * LIFT_DOOR.frame, h, 0.2),
      kitPaint(kit, '#8a8f8c'),
    );
    header.position.set(0, top + h / 2, -0.1);
    root.add(header);
  }
  // The indicator over the doors, the sign over that.
  const indicator = createLiftIndicator(kit);
  indicator.group.position.set(0, LIFT_DOOR.height + 0.32, 0.02);
  root.add(indicator.group);
  const sign = createEngravedNameSign(
    kit,
    1.4,
    0.2,
    o.sign ?? `${floor.label} · ${floor.legend}`,
  );
  sign.position.set(0, LIFT_DOOR.height + 0.62, 0.012);
  root.add(sign);
  const badge = createBrandBadge(kit, 'stannard', { height: 0.035 });
  badge.position.set(0, LIFT_DOOR.height + 0.16, 0.012);
  root.add(badge);
  // The call button, to the right of the doors as one faces them, on a
  // stainless plate at 1.1 m.
  const lift = () => store.world.value.lifts[o.lift];
  const called = signal(false);
  const callPlate = new Mesh(
    new BoxGeometry(0.1, 0.18, 0.012),
    kitPaint(kit, '#b9bec0', 0.7),
  );
  callPlate.position.set(
    -(LIFT_DOOR.clear / 2 + LIFT_DOOR.frame + 0.25),
    1.1,
    0.006,
  );
  root.add(callPlate);
  const call = o.parts.add(
    pushButton(kit, {
      name: `${spec.name} call, floor ${floor.label}`,
      colour: 'white',
      head: 'illuminated',
      lamp: called,
      symbol: '▲▼',
      action: () =>
        store.dispatch({ type: 'lift/call', lift: o.lift, floor: o.floor }),
    }),
  );
  call.object.position.set(
    callPlate.position.x,
    1.1,
    callPlate.position.z + 0.007,
  );
  root.add(call.object);

  // Its side of the doorway (`door-joins.ts`).
  let seen = false;
  const toScene = (f: Footprint): Footprint => ({
    minX: f.minX * metre,
    maxX: f.maxX * metre,
    minZ: f.minZ * metre,
    maxZ: f.maxZ * metre,
  });
  const withdraw = registerJoint(o.room, car, {
    frame: {
      x: doorway.frame.x * metre,
      z: doorway.frame.z * metre,
      yaw: doorway.frame.yaw,
      y: floorY * metre,
    },
    onOpen: true,
    open: () => openAt(lift(), o.floor),
    angle: () => 0,
    swingTo: () => {},
    opening: () => toScene(doorway.opening),
    see: (on) => {
      seen = on;
      lobby.visible = !on;
      punch.visible = on;
    },
    peek: (on) => {
      doors.leaves.visible = !on && lift().open < 0.999;
    },
  });

  let held = false;
  let leaving = false;
  // In charge only once its room is entered (`resume`), not while built
  // unseen ahead of the car or drawn once to warm it.
  let active = false;
  let was: LiftState | null = null;
  let warned = false;
  const atWalker = () => ({
    x: o.walk.walker.x / metre,
    z: o.walk.walker.z / metre,
  });
  return {
    root,
    /** The landing's frame and its doors' leaves while shut, and the stop beyond while the car is not seen; metres. */
    solids(): Footprint[] {
      const l = lift();
      const w = atWalker();
      return [
        ...doorway.jambs,
        ...doorwayStops(
          {
            inside: overlaps(doorway.leaf, w.x, w.z, 0.3),
            shut: !openAt(l, o.floor) || l.open < 0.75,
            seen,
          },
          doorway.leaf,
          doorway.beyond,
        ),
      ];
    },
    /** Each frame, after the walker has moved: the doors, lamps, indicator, curtain, sounds and hand-over. */
    update() {
      const l = lift();
      const here = !l.trip && l.floor === o.floor;
      doors.setOpen(here ? l.open : 0);
      if (seen) doors.leaves.visible = false;
      called.value = callLit(l, o.floor);
      const shown = indicatorOf(l, o.lift);
      indicator.show(shown.label, here || l.trip ? shown.way : null);
      // Only the room the walker is in works the lift and makes its sounds.
      if (o.walk.following || leaving || !active) {
        was = l;
        return;
      }
      const w = atWalker();
      // The light curtain: someone in the doorway while the car is here.
      const inWay = here && doorway.inDoorway(w.x, w.z);
      if (inWay !== held) {
        held = inWay;
        store.dispatch({ type: 'lift/hold', lift: o.lift, held: inWay });
      }
      // Nobody is in the car: wherever it is going, it may arrive unseen.
      if (l.trip && !l.trip.ready)
        store.dispatch({ type: 'lift/ready', lift: o.lift, floor: l.trip.to });
      if (was) {
        const arrived = was.trip && !l.trip && l.floor === o.floor;
        if (arrived) partAudio.play(ARRIVAL_CHIME, root);
        if (here) {
          if (
            was.doors !== l.doors &&
            (l.doors === 'open' || l.doors === 'shut')
          )
            partAudio.play(DOOR_CLANK, root);
          const warning = closingWarning(l);
          if (warning && !warned)
            partAudio.play(l.nudging ? NUDGE_BUZZER : CLOSING_WARNING, root);
          warned = warning;
        }
      }
      was = l;
      // Walked out through the open doors into the car: handed over.
      if (!leaving && seen && doorway.through(w.x, w.z)) {
        leaving = true;
        if (held) {
          held = false;
          store.dispatch({ type: 'lift/hold', lift: o.lift, held: false });
        }
        enterDevRoom(car, o.room, true);
      }
    },
    /** In charge: its room entered (handed over, or opened). */
    resume() {
      leaving = false;
      held = false;
      was = null;
      active = true;
    },
    /** Left: no longer in charge. */
    suspend() {
      active = false;
    },
    dispose() {
      withdraw();
      o.parent.remove(root);
    },
  };
}
