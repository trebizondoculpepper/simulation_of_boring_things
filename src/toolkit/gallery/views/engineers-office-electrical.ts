import { markComponent } from '../../components/core/views/component-identity';
import { computed, signal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { createPartSet } from '../../components/core/parts/parts';
import {
  occupancySensor,
  twinSocket,
} from '../../components/architectural/parts/building-parts';
import { newWorld } from '../../../game/world';
import { serviceAvailable } from '../../../game/plant/services';
import { roomWorld } from '../../save/world-store';
import { SHELL_ROOMS } from '../logic/shell-rooms';
import { FEEDER_ISOLATOR } from '../logic/room-equipment';
import { createOfficePir } from '../logic/office-pir';
import { EQUIPMENT_DOORS } from '../../components/architectural/parts/equipment-doors';
import type { Binding } from '../../components/core/logic/world/components';

/** The office's real switched outlets, on a two-leg 240 V conduit ring. */
export function createEngineersOfficeElectrical(kit: PanelKit) {
  const group = new Group();
  group.name = 'Engineer’s office 240 V socket ring and PIR';
  const parts = createPartSet();
  const box = SHELL_ROOMS.engineers_office;
  const west = -box.w / 2 + 0.05;
  const east = box.w / 2 - 0.05;
  const north = -box.d / 2 + 0.05;
  const south = box.d / 2 - 0.05;
  const feeder = box.d / 2 - FEEDER_ISOLATOR.fromSouth;
  // The ring runs above the signs over the doors (the owner, 2026-10-26),
  // the corridor door's the highest: over its opening's head, its sign's
  // middle 0.35 m up and 0.24 m tall (`shell-room.ts`), then clear of it.
  const doorHead = EQUIPMENT_DOORS.h + 2 * EQUIPMENT_DOORS.frame;
  const high = doorHead + 0.35 + 0.24 / 2 + 0.15;
  const line = (name: string, points: [number, number, number][]) => {
    const pipe = createPipe('steel-screwed', 0.021, points);
    pipe.name = name;
    // Each conduit its link in the room's model (prompt 064).
    group.add(markComponent(pipe, { name, model: { link: name } }));
  };
  // Two legs leave the room switch-fuse, travel around the walls above the
  // cupboards and the doors' signs, and return to it. Socket drops branch from that ring.
  line('Office 240 V ring main', [
    [west, 1.86, feeder - 0.08],
    [west, high, feeder - 0.08],
    [west, high, north],
    [east, high, north],
    [east, high, south],
    [west, high, south],
    [west, high, feeder + 0.08],
    [west, 1.86, feeder + 0.08],
  ]);

  const store = typeof window === 'undefined' ? null : roomWorld();
  const fallback = newWorld();
  const supplied = () =>
    serviceAvailable(
      (store?.world.value ?? fallback).plant,
      'engineers_office',
      'power',
    );
  const sockets = [
    // Its drop down beside the room's title card (±1.2 m on the north
    // wall, `shell-room.ts`), not across it, then over to the socket.
    { name: 'Desk twin socket', x: -0.9, z: north, yaw: 0, via: -1.27 },
    { name: 'East wall twin socket', x: east, z: 0.8, yaw: -Math.PI / 2 },
    // West of the corridor door's opening (±0.96 m), not on its leaf, and
    // clear of the PIR east of it (the owner, 2026-10-26).
    { name: 'South wall twin socket', x: -1.4, z: south, yaw: Math.PI },
  ] as const;
  for (const socket of sockets) {
    const rocker = (): Binding<boolean> => {
      const state = signal(true);
      return {
        get value() {
          return state.value;
        },
        set(value) {
          state.value = value;
        },
      };
    };
    const left = rocker();
    const right = rocker();
    const live = computed(() => {
      const on = supplied();
      return { left: on && left.value, right: on && right.value };
    });
    const part = parts.add(
      twinSocket(kit, { left, right, live, metalclad: true, testers: false }),
    );
    part.object.name = socket.name;
    markComponent(part.object, { name: socket.name });
    part.object.position.set(socket.x, 0.55, socket.z);
    part.object.rotation.y = socket.yaw;
    group.add(part.object);
    const via = 'via' in socket ? socket.via : undefined;
    line(
      `${socket.name} conduit`,
      via === undefined
        ? [
            [socket.x, high, socket.z],
            [socket.x, 0.55, socket.z],
          ]
        : [
            [via, high, socket.z],
            [via, 0.75, socket.z],
            [socket.x, 0.75, socket.z],
            [socket.x, 0.55, socket.z],
          ],
    );
  }

  const sensing = signal(false);
  const pir = parts.add(occupancySensor(kit, { occupied: sensing }));
  const pirMount = new Group();
  pirMount.name = 'Office PIR light switch';
  markComponent(pirMount, { name: pirMount.name });
  pirMount.position.set(1.15, 1.9, south);
  pirMount.rotation.y = Math.PI;
  pir.object.rotation.x = -Math.PI / 2;
  pirMount.add(pir.object);
  group.add(pirMount);
  line('Office PIR control conduit', [
    [1.15, high, south],
    [1.15, 1.9, south],
  ]);

  let led = 0;
  // While no one is here, the PIR opens its local lighting zone. Upstream
  // lighting and room supply switches remain authoritative.
  store?.dispatch({
    type: 'lighting/zone',
    zone: 'engineers_office',
    on: false,
  });
  const timer = createOfficePir((on) => {
    store?.dispatch({ type: 'lighting/zone', zone: 'engineers_office', on });
  });
  return {
    object: group,
    parts,
    senseMotion() {
      led = 0.7;
      sensing.value = true;
      timer.senseMotion();
    },
    update(delta: number) {
      led = Math.max(0, led - delta);
      if (led === 0) sensing.value = false;
      timer.update(delta);
    },
    dispose() {
      timer.dispose();
    },
  };
}
