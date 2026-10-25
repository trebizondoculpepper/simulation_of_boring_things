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
import { roomWorld } from '../../save/world-store';
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
import { cabinetBalanceTank, cabinetValvePanel } from '../logic/cabinet-pipes';
import { createSpaBalanceTank } from '../../components/plant/views/spa-balance-tank';
import { JACUZZI_BALANCE_TANK } from '../../../game/plant/spa-balance-tank';
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
import { jacuzziDischarging, jacuzziTankDraining } from '../../../game/world';
import { machineTone } from '../../components/sound/audio/machine-tones';
import { drainGurgle } from '../../components/plant/audio/drain';
import { createFallingWater } from '../../components/plant/views/falling-water';
import { remoteValveGeometry } from '../../components/plant/logic/remote-valve';
import { createValveControlPanel } from '../../components/plant/views/valve-control-panel';
import type { PanelValve } from '../../components/plant/views/valve-control-panel';
import { installedValveFor } from '../../../game/plant/installed-valves';
import { markComponent } from '../../components/core/views/component-identity';
import { retiredFrom } from '../logic/retired-rooms';
import type { ComponentIdentity } from '../../components/core/views/component-identity';
import {
  MODELLED_VALVE_ROOMS,
  modelValveOn,
  schematicFittingOn,
  schematicNodeOfKind,
} from '../../../game/plant/model-valves';

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
export function cabinetServices(
  kit: PanelKit,
  /** The room drawn: a plant room, or a retired copy of one. */
  drawn: string,
  floorY: number,
) {
  const runs = cabinetPipes(drawn);
  // The room it is, for what is particular to it: a retired copy's own.
  const room = retiredFrom(drawn) ?? drawn;
  if (!runs.length) return null;
  const group = new Group();
  group.name = 'cabinet services';
  const uses = new Map<Object3D, () => void>();
  const store = typeof window === 'undefined' ? null : roomWorld();
  const valveParts: ReturnType<typeof createWaterButterflyValve>[] = [];
  // The motorised valves: each one's lamp, and its row on the room's panel.
  const motorLamps: ((delta: number) => void)[] = [];
  const motorStops: (() => void)[] = [];
  let audible = false;
  const panelValves: PanelValve[] = [];
  const lift = <T extends readonly [number, number, number]>([x, y, z]: T) =>
    [x, floorY + y, z] as const;
  // In a room built from its schematic (prompt 064), what each thing is
  // drawn from in its model: everything drawn is bound to the model.
  const modelled = MODELLED_VALVE_ROOMS.has(room);
  const bind = <T extends Object3D>(
    object: T,
    name: string,
    model: ComponentIdentity['model'] | undefined,
  ): T =>
    modelled
      ? markComponent(object, { name, ...(model ? { model } : {}) })
      : object;
  const nodeOf = (kind: string) => {
    const node = schematicNodeOfKind(room, kind);
    return node ? { node } : undefined;
  };
  const fittingOf = (link: string | undefined) => {
    const valve = link && modelled ? modelValveOn(room, link) : undefined;
    return valve ? { model: { fitting: valve.id } } : {};
  };
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
    // A run is its link's pipe; the busbar's trunking is a machine of its own.
    const runModel = run.link ? { link: run.link } : nodeOf('busbar');
    group.add(bind(pipe, run.name, runModel));
    const lagging = PIPE_KINDS[run.kind].insulation?.thickness ?? 0;
    // A busbar's casing carries its maker's labels, not a pipe's bands.
    if (run.kind !== 'busbar-trunking')
      group.add(
        bind(
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
          run.name,
          runModel,
        ),
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
          {
            stand: false,
            plaque: { tag: id, name: description?.name ?? 'Valve' },
          },
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
        markComponent(mount, { tag: id, ...fittingOf(run.link) });
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
              { tag: id, name: description?.name ?? 'Valve' },
            );
      if (valve) {
        markComponent(valve.object, { tag: id, ...fittingOf(run.link) });
        valve.object.position.set(...lift(at));
        if (axis === 'x')
          valve.object.rotation.y = run.valve.facing ?? Math.PI / 2;
        if (axis === 'y') valve.object.rotation.y = run.valve.facing ?? 0;
        // Along z, turned only if it says so (round, so its lever swings
        // the other way).
        if (axis === 'z' && run.valve.facing !== undefined)
          valve.object.rotation.y = run.valve.facing;
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
      // Every valve's designation is on the valve: a lever or chain valve's
      // on plaques round its body, a motorised one's on its actuator's
      // side. (Kept for any other: a plate beside it.)
      if (!valve && run.valve.operator !== 'motor') {
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
  }
  // The motorised valves' panel, on its wall.
  const panelAt = cabinetValvePanel(drawn);
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
    group.add(bind(panel.group, 'Valve panel', nodeOf('valve-panel')));
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
  /** A floor gully, its grating flush, and the tundish on it. */
  const tundishOnGully = (
    [x, , z]: readonly [number, number, number],
    /** Its rim's radius: wider where two pipes drop into it. */
    rim = 0.07,
  ) => {
    const grating = new Mesh(new BoxGeometry(0.3, 0.01, 0.3), iron);
    grating.position.set(x, floorY + 0.005, z);
    const tundish = new Mesh(
      new CylinderGeometry(rim, 0.025, 0.1, 20, 1, true),
      steel,
    );
    tundish.position.set(x, floorY + 0.07, z);
    tundish.name = 'Drain tundish';
    const tail = new Mesh(new CylinderGeometry(0.02, 0.02, 0.03, 12), steel);
    tail.position.set(x, floorY + 0.015, z);
    for (const o of [grating, tundish, tail])
      group.add(bind(o, 'Floor gully', nodeOf('gully')));
    return tundish;
  };
  // The jacuzzi's balance tank, north of its cabinet, its gauge reading
  // the world's level, its overflow's own tundish and gully.
  const tankAt = cabinetBalanceTank(drawn);
  const tank = tankAt
    ? createSpaBalanceTank(kit, { ...JACUZZI_BALANCE_TANK, tag: 'PL3-BT1' })
    : null;
  // Its drain's water, falling into the overflow's tundish beside the
  // overflow's down-pipe, seen and heard while its lever valve is open and
  // there is water to run away.
  let tankMouth: Mesh | null = null;
  let tankFall: ReturnType<typeof createFallingWater> | null = null;
  let tankGurgling = false;
  if (tank && tankAt) {
    tank.group.position.set(tankAt.x, floorY, tankAt.z);
    group.add(
      markComponent(tank.group, {
        tag: 'PL3-BT1',
        ...(nodeOf('balance-tank') ? { model: nodeOf('balance-tank') } : {}),
      }),
    );
    // One tundish for the overflow and the drain, wide enough for both.
    tankMouth = tundishOnGully(tankAt.gully, 0.1);
    tankFall = createFallingWater(kit, DRAIN_STREAM);
    tankFall.group.position.set(
      tankAt.drainGully[0],
      floorY + 0.17,
      tankAt.drainGully[2],
    );
    tankFall.set(0, 0.17 - 0.08);
    // The water its drain's link carries, seen falling.
    group.add(
      bind(tankFall.group, 'Balance tank drain', {
        link: 'Balance tank drain to waste',
      }),
    );
  }
  const gully = cabinetGully(drawn);
  if (gully) {
    const tundish = tundishOnGully(gully);
    drainMouth = tundish;
    // The pipe ends at 0.17 m (`cabinet-pipes.ts`); the water lands a
    // little way down inside the tundish, under its rim at 0.12 m.
    drainFall = createFallingWater(kit, DRAIN_STREAM);
    drainFall.group.position.set(gully[0], floorY + 0.17, gully[2]);
    drainFall.set(0, 0.17 - 0.08);
    group.add(
      bind(drainFall.group, 'Drain to waste', { link: 'Drain to waste' }),
    );
  }
  // The busbar's tap-off unit, over the room's switch-fuse (the bar
  // itself is one of the runs above, `cabinet-pipes.ts`): its back on the
  // west wall, its front into the room.
  const bus = cabinetBusbar(drawn);
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
    group.add(bind(tap, 'Busbar tap-off unit', nodeOf('busbar')));
  }
  // The isolator, its handle the switch.
  const place = cabinetIsolator(drawn);
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
    const fitting = schematicFittingOn(
      room,
      'Switch-fuse to the cabinet',
      'power-isolator',
    );
    group.add(
      bind(
        isolator.group,
        'Cabinet isolator',
        fitting ? { fitting } : undefined,
      ),
    );
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
    /** What stands on its floor for the walker: the balance tank. */
    solids: tankAt ? [tankAt.footprint] : [],
    setAudible(on: boolean) {
      if (on === audible) return;
      audible = on;
      if (!on) {
        for (const stop of motorStops) stop();
        if (drainMouth) partAudio.hold(drainMouth, null);
        gurgling = false;
        drainFall?.dispose();
        if (tankMouth) partAudio.hold(tankMouth, null);
        tankGurgling = false;
        tankFall?.dispose();
      }
    },
    /** Silence any valve motor still running, and the drain. */
    dispose() {
      for (const stop of motorStops) stop();
      if (drainMouth) partAudio.hold(drainMouth, null);
      drainFall?.dispose();
      if (tankMouth) partAudio.hold(tankMouth, null);
      tankFall?.dispose();
    },
    update(delta: number) {
      // Its balance tank's gauge, at the world's level.
      tank?.setLevel(
        store?.world.value.pools.pool_03.balance ?? JACUZZI_BALANCE_TANK.float,
      );
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
      // The balance tank's drain, running as its valve and its water allow.
      if (tankMouth && store) {
        const draining = jacuzziTankDraining(store.world.value);
        const heard = audible && draining;
        if (heard !== tankGurgling) {
          tankGurgling = heard;
          partAudio.hold(tankMouth, heard ? drainGurgle() : null, tankMouth);
        }
        tankFall?.set(draining ? 0.6 : 0, 0.17 - 0.08);
      }
      tankFall?.update(delta);
      panel?.update(delta);
    },
  };
}
