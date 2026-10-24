import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { createPipe, PIPE_KINDS } from '../../components/core/views/pipe-kinds';
import { markPipe } from '../../components/plant/views/pipe-markers';
import type { PipeService } from '../../components/plant/views/pipe-markers';
import { worldStore } from '../../save/world-store';
import type { IsolatorName, ServiceRoom } from '../../../game/plant/services';
import { serviceAvailable } from '../../../game/plant/services';
import { createPowerIsolator } from '../../components/industrial-control/views/panel-switchgear';
import {
  addChainWheel,
  createWaterButterflyValve,
} from '../../components/plant/views/water-butterfly-valve';
import {
  partOpen,
  identifiedPart,
  newIdentifiedPlant,
} from '../../../game/plant/identification';
import {
  cabinetBusbar,
  cabinetGully,
  cabinetIsolator,
  cabinetPipes,
} from '../logic/cabinet-pipes';
import { createBusbarTapOff } from '../../components/industrial-control/views/busbar-tap-off';
import { BUSBAR_TAP_OFF } from '../../components/industrial-control/logic/enclosures';
import type { Service } from '../logic/cabinet-pipes';
import { CHAIN_TO } from '../logic/room-pipes';
import { cabinetValvePanel } from '../logic/cabinet-pipes';
import { createRemoteValve } from '../../components/plant/views/remote-actuators';
import {
  motorGoal,
  motorLimits,
  motorRate,
  motorRunning,
  motorStroke,
  newMotorisedValve,
  stepMotorisedValve,
} from '../../components/plant/logic/motorised-valve';
import { signal } from '@preact/signals-core';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  RELAY_CLICK,
  VALVE_STOP,
} from '../../components/plant/audio/actuated-valve';
import { footbathDischarging } from '../../../game/plant/footbath-discharge';
import { jacuzziDischarging } from '../../../game/world';
import { machineTone } from '../../components/sound/audio/machine-tones';
import { drainGurgle } from '../../components/plant/audio/drain';
import { createFallingWater } from '../../components/plant/views/falling-water';
import { remoteValveGeometry } from '../../components/plant/logic/remote-valve';
import { createValveControlPanel } from '../../components/plant/views/valve-control-panel';
import type { PanelValve } from '../../components/plant/views/valve-control-panel';
import { installedValveFor } from '../../../game/plant/installed-valves';

/** The drain's water as it leaves its 50 mm pipe's bore, its radius, m. */
const DRAIN_STREAM = 0.018;

/** Each run's service, as its markings name it. */
const MARKED: Record<Service, PipeService> = {
  'pool water': 'pool water',
  'make-up': 'pool water',
  air: 'air',
  'heating flow': 'heating flow',
  'heating return': 'heating return',
  drainage: 'drainage',
  electrical: 'electrical',
};

/**
 * A packaged cabinet's services in its room (`logic/cabinet-pipes.ts`),
 * drawn on the floor at `floorY`: each run of pipe or conduit, fitted with
 * its fire collar or sleeve where it passes through a wall and marked with
 * its service's bands and label; the drain's tundish on its floor gully;
 * and the isolator, a working rotary switch-disconnector on the wall,
 * whose handle switches the cabinet's supply.
 */
export function cabinetServices(kit: PanelKit, room: string, floorY: number) {
  const runs = cabinetPipes(room);
  if (!runs.length) return null;
  const group = new Group();
  group.name = 'cabinet services';
  const uses = new Map<Object3D, () => void>();
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  const valveParts: ReturnType<typeof createWaterButterflyValve>[] = [];
  // The motorised valves: each one's lamp, and its row on the room's panel.
  const motorLamps: ((delta: number) => void)[] = [];
  const motorStops: (() => void)[] = [];
  let audible = false;
  const panelValves: PanelValve[] = [];
  const lift = <T extends readonly [number, number, number]>([x, y, z]: T) =>
    [x, floorY + y, z] as const;
  for (const run of runs) {
    const points = run.points.map(lift);
    const pipe = createPipe(run.kind, run.od, points, {
      ...(run.ends ? { ends: run.ends } : {}),
      through: run.through.map((t) => ({
        at: lift(t.at),
        normal: t.normal,
        kind: t.kind,
        thickness: t.thickness,
      })),
    });
    pipe.name = run.name;
    group.add(pipe);
    const lagging = PIPE_KINDS[run.kind].insulation?.thickness ?? 0;
    // A busbar's casing carries its maker's labels, not a pipe's bands.
    if (run.kind !== 'busbar-trunking')
      group.add(
        markPipe(kit, points, {
          radius: run.od / 2 + lagging,
          service: MARKED[run.service],
          text: run.label,
          flow: run.flow,
          // Stencilled on: the runs here are packed too close for plates
          // hung beneath them (the owner, 2026-10-24). White on the dark
          // steel conduit, black on the grey plastic and the lagging.
          lettering: 'stencil',
          ink: run.kind === 'steel-screwed' ? '#f2f2ee' : '#1b1d1e',
        }),
      );
    if (run.valve) {
      const { at, axis } = run.valve;
      // A registered pipework valve (`installed-valves.ts`), its state the
      // world's by its asset ID; or a named part of the identified plant.
      const installed = run.valve.installed
        ? installedValveFor(room, run.name, run.valve.name)
        : null;
      const id = installed ? installed.tag : run.valve.id;
      const description = installed
        ? { name: run.valve.installed ? run.valve.name : '' }
        : identifiedPart(
            store?.world.value.identifiedPlant ??
              // During server-side preview there is no browser store.
              newIdentifiedPlant(),
            id,
          );
      // The jacuzzi's drain valve opens and shuts its drain-down in the
      // world: open, its pump sends the tub's water to waste.
      const jacuzziDrain =
        room === 'plant_pool_03' && run.name === 'Drain to waste';
      const binding = jacuzziDrain
        ? {
            open: () => store?.world.value.pools.pool_03.drainDown ?? false,
            set: (open: boolean) =>
              store?.dispatch({
                type: 'pool/drain-down',
                pool: 'pool_03',
                open,
              }),
          }
        : installed
          ? {
              open: () =>
                store?.world.value.installedValves[installed.assetId] ??
                installed.normal === 'open',
              set: (open: boolean) =>
                store?.dispatch({
                  type: 'plant/valve',
                  id: installed.assetId,
                  open,
                }),
            }
          : {
              open: () =>
                store ? partOpen(store.world.value.identifiedPlant, id) : true,
              set: (open: boolean) =>
                store?.dispatch({ type: 'plant/valve', id, open }),
            };
      if (run.valve.operator === 'motor') {
        // A motorised ball valve, its actuator up (out of a riser, turned
        // aside), its lamp as its limit switches find it; worked from the
        // room's valve panel, not by hand.
        const motor = createRemoteValve(
          kit,
          remoteValveGeometry('water', run.od, 0),
          { stand: false },
        );
        motor.group.name = `${id} · ${description?.name ?? 'Valve'}`;
        const mount = new Group();
        mount.position.set(...lift(at));
        if (axis === 'z') mount.rotation.y = Math.PI / 2;
        if (axis === 'y') {
          mount.rotation.y = run.valve.facing ?? 0;
          motor.group.rotation.z = Math.PI / 2;
        }
        mount.add(motor.group);
        group.add(mount);
        // Its red override, pressed, works it by hand, as the panel would.
        if (motor.overrideButton)
          uses.set(motor.overrideButton, () => binding.set(!binding.open()));
        // It travels to where the world commands over its stroke, its gear
        // motor heard running up as it sets off, steady as it moves, and
        // running down as it arrives (`gear-motor`).
        let travel = newMotorisedValve(binding.open());
        // Each motor its own few hertz off the others.
        const index = motorStops.length;
        const pitch = signal(motorRate(index));
        // And its own time to turn.
        const stroke = motorStroke(motorStops.length);
        let running = false;
        // Spring-return: without its room's power it is sprung shut.
        const powered = () =>
          !store ||
          serviceAvailable(
            store.world.value.plant,
            room as ServiceRoom,
            'power',
          );
        motorLamps.push((delta) => {
          const power = powered();
          travel = stepMotorisedValve(
            { ...travel, command: binding.open(), power },
            delta,
            stroke,
          );
          const moving = motorRunning(travel);
          motor.show(motorLimits(travel).open, moving, travel.position, power);
          // A little lower unwinding shut than driving open.
          pitch.value = motorRate(index) * (motorGoal(travel) ? 1 : 0.9);
          const sounding = audible && moving;
          if (sounding !== running) {
            // As the actuated valves (`actuated-butterfly-valve.ts`): its
            // relay clicks as it sets off, its end stop thuds as it arrives.
            if (audible)
              partAudio.play(sounding ? RELAY_CLICK : VALVE_STOP, motor.group);
            running = sounding;
            partAudio.hold(
              motor.group,
              sounding ? machineTone('gear-motor', pitch, 0.12) : null,
              motor.group,
            );
          }
        });
        motorStops.push(() => {
          running = false;
          partAudio.hold(motor.group, null);
        });
        panelValves.push({
          tag: id,
          legend: (description?.name ?? 'Valve').toUpperCase(),
          open: binding.open,
          set: binding.set,
        });
      }
      const valve =
        run.valve.operator === 'motor'
          ? null
          : createWaterButterflyValve(
              kit,
              50,
              axis === 'x' ? 'z' : axis,
              `${id} · ${description?.name ?? 'Valve'}`,
              binding,
              run.valve.operator,
            );
      if (valve) {
        valve.object.position.set(...lift(at));
        if (axis === 'x')
          valve.object.rotation.y = run.valve.facing ?? Math.PI / 2;
        if (axis === 'y') valve.object.rotation.y = run.valve.facing ?? 0;
        group.add(valve.object);
        valveParts.push(valve);
        for (const [piece, use] of valve.uses) uses.set(piece, () => use());
        // Overhead, out of reach: worked by its chain from the floor.
        if (run.valve.operator === 'chain') {
          const use = [...valve.uses.values()][0];
          for (const chain of addChainWheel(kit, valve.object, {
            dn: 50,
            axis: axis === 'x' ? 'z' : axis,
            at: at[1],
            chainTo: CHAIN_TO,
            name: id,
          }))
            if (use) uses.set(chain, () => use());
        }
      }
      const legend = createMicroLabel(
        kit,
        `${id}\n${description?.name ?? 'VALVE'}`,
        {
          height: 0.018,
          ink: '#19242a',
          plate: '#f0ede3',
        },
      );
      // Mount the plate beyond the lever's swing, on the aisle side of
      // the pipe. On a high pipe the same plate sits below the valve.
      if (at[1] > 2) {
        legend.position.set(at[0], floorY + at[1] - 0.28, at[2]);
      } else if (axis === 'z') {
        const inward = at[0] >= 0 ? -1 : 1;
        legend.position.set(
          at[0] + inward * 0.34,
          floorY + at[1] + 0.12,
          at[2],
        );
        legend.rotation.y = (inward * Math.PI) / 2;
      } else {
        const inward = at[2] >= 0 ? -1 : 1;
        legend.position.set(
          at[0],
          floorY + at[1] + 0.12,
          at[2] + inward * 0.34,
        );
        legend.rotation.y = inward < 0 ? Math.PI : 0;
      }
      group.add(legend);
    }
  }
  // The motorised valves' panel, on its wall.
  const panelAt = cabinetValvePanel(room);
  const panel =
    panelAt && panelValves.length
      ? createValveControlPanel(
          kit,
          room === 'plant_pool_03' ? 'JACUZZI VALVES' : 'FOOT SPA VALVES',
          panelValves,
        )
      : null;
  if (panel && panelAt) {
    panel.group.position.set(panelAt.x, floorY + panelAt.y, panelAt.z);
    panel.group.rotation.y = panelAt.yaw;
    group.add(panel.group);
    for (const [piece, use] of panel.parts.uses) uses.set(piece, () => use());
  }
  // The foot spa's drain-down, heard running into its tundish.
  let drainMouth: Mesh | null = null;
  let gurgling = false;
  // And seen: the water falling from the drain's open end across its air
  // gap into the tundish, while it runs.
  let drainFall: ReturnType<typeof createFallingWater> | null = null;
  // The drain's floor gully, its grating flush with the floor, and the
  // tundish on it that the drain discharges into across an air gap.
  const gully = cabinetGully(room);
  if (gully) {
    const iron = new MeshStandardMaterial({
      color: '#2a2c2d',
      roughness: 0.7,
      metalness: 0.3,
    });
    const steel = new MeshStandardMaterial({
      color: '#b9bec0',
      roughness: 0.35,
      metalness: 0.7,
    });
    kit.materials.push(iron, steel);
    const grating = new Mesh(new BoxGeometry(0.3, 0.01, 0.3), iron);
    grating.position.set(gully[0], floorY + 0.005, gully[2]);
    const tundish = new Mesh(
      new CylinderGeometry(0.07, 0.025, 0.1, 20, 1, true),
      steel,
    );
    tundish.position.set(gully[0], floorY + 0.07, gully[2]);
    tundish.name = 'Drain tundish';
    drainMouth = tundish;
    const tail = new Mesh(new CylinderGeometry(0.02, 0.02, 0.03, 12), steel);
    tail.position.set(gully[0], floorY + 0.015, gully[2]);
    group.add(grating, tundish, tail);
    // The pipe ends at 0.17 m (`cabinet-pipes.ts`); the water lands a
    // little way down inside the tundish, under its rim at 0.12 m.
    drainFall = createFallingWater(kit, DRAIN_STREAM);
    drainFall.group.position.set(gully[0], floorY + 0.17, gully[2]);
    drainFall.set(0, 0.17 - 0.08);
    group.add(drainFall.group);
  }
  // The busbar's tap-off unit, over the room's switch-fuse (the bar
  // itself is one of the runs above, `cabinet-pipes.ts`): its back on the
  // west wall, its front into the room.
  const bus = cabinetBusbar(room);
  if (bus) {
    const tap = createBusbarTapOff(kit, {
      legend: 'ROOM SUPPLY',
      bar: bus.bar.od,
    });
    tap.position.set(
      bus.tap.at[0] - BUSBAR_TAP_OFF.d / 2,
      floorY + bus.tap.at[1],
      bus.tap.at[2],
    );
    tap.rotation.y = bus.tap.yaw;
    group.add(tap);
  }
  // The isolator, its handle the switch.
  const place = cabinetIsolator(room);
  const name: IsolatorName =
    room === 'plant_pool_03'
      ? 'Jacuzzi cabinet isolator'
      : 'Footbath cabinet isolator';
  const isolator = place
    ? createPowerIsolator(kit, {
        on: true,
        rating: 'TP&N 32A',
        maker: 'VOLTARA',
      })
    : null;
  if (place && isolator) {
    isolator.group.position.set(place.x, floorY + place.y, place.z);
    isolator.group.rotation.y = place.yaw;
    isolator.group.name = 'Cabinet isolator';
    group.add(isolator.group);
    // Switched here, it is switched in the world: the cabinet's pool stops.
    const toggle = () => {
      isolator.toggle();
      store?.dispatch({ type: 'plant/isolator', name, on: isolator.on });
    };
    isolator.handle.traverse((o) => uses.set(o, toggle));
  }
  return {
    group,
    isolator,
    uses,
    setAudible(on: boolean) {
      if (on === audible) return;
      audible = on;
      if (!on) {
        for (const stop of motorStops) stop();
        if (drainMouth) partAudio.hold(drainMouth, null);
        gurgling = false;
        drainFall?.dispose();
      }
    },
    /** Silence any valve motor still running, and the drain. */
    dispose() {
      for (const stop of motorStops) stop();
      if (drainMouth) partAudio.hold(drainMouth, null);
      drainFall?.dispose();
    },
    update(delta: number) {
      // As the world has it, switched here or anywhere.
      const on = store?.world.value.plant.isolators[name];
      if (isolator && on !== undefined && on !== isolator.on) isolator.set(on);
      isolator?.update(delta);
      for (const valve of valveParts) valve.update(delta);
      for (const lamp of motorLamps) lamp(delta);
      // Gurgling while the spa's water runs away down it.
      if (drainMouth && store) {
        const w = store.world.value;
        const running =
          audible &&
          (room === 'plant_pool_03'
            ? jacuzziDischarging(w)
            : footbathDischarging(
                w.identifiedPlant,
                w.pools.pool_04,
                w.plant.isolators[name] ?? true,
              ));
        if (running !== gurgling) {
          gurgling = running;
          partAudio.hold(
            drainMouth,
            running ? drainGurgle() : null,
            drainMouth,
          );
        }
        drainFall?.set(running ? 0.6 : 0, 0.17 - 0.08);
      }
      drainFall?.update(delta);
      panel?.update(delta);
    },
  };
}
