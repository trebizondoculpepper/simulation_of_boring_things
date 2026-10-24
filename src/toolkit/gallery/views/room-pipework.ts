import { createActuatedButterflyValve } from '../../components/plant/views/actuated-butterfly-valve';
import { createSampleTakeoff } from '../../components/plant/views/sample-takeoff';
import { retiredFrom } from '../logic/retired-rooms';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import {
  createPipe,
  createPipeReducer,
  createPipeTee,
  PIPE_KINDS,
} from '../../components/core/views/pipe-kinds';
import { markPipe } from '../../components/plant/views/pipe-markers';
import type { PipeService } from '../../components/plant/views/pipe-markers';
import { worldStore } from '../../save/world-store';
import type { IsolatorName } from '../../../game/plant/services';
import { serviceAvailable } from '../../../game/plant/services';
import { createPowerIsolator } from '../../components/industrial-control/views/panel-switchgear';
import {
  addChainWheel,
  createWaterButterflyValve,
} from '../../components/plant/views/water-butterfly-valve';
import { createGasBallValve } from '../../components/plant/views/gas-fittings';
import { installedValveFor } from '../../../game/plant/installed-valves';
import {
  olympicFlowsOf,
  olympicMeterReadings,
} from '../../../game/plant/olympic-battery';
import {
  createInlineFitting,
  placeFitting,
} from '../../components/plant/views/inline-fittings';
import type { DN } from '../../components/plant/views/plant-tools';
import { PIPE_SIZES } from '../../components/plant/views/plant-tools';
import {
  CHAIN_TO,
  ISOLATOR_Y,
  roomIsolators,
  standFootprint,
  pipeObstacles,
  roomChannels,
  roomPipes,
  roomTees,
} from '../logic/room-pipes';
import type { PipeRun, Valve } from '../logic/room-pipes';
import { olympicRoom } from '../logic/olympic-plumbing';

/** Each run's service, as its markings name it. */
/** Each service's bands; a flue carries none, only its own label plate. */
const MARKED: Record<PipeRun['service'], PipeService | null> = {
  'pool water': 'pool water',
  'heating flow': 'heating flow',
  'heating return': 'heating return',
  drainage: 'drainage',
  'make-up': 'pool water',
  ozone: 'air',
  electrical: 'electrical',
  hypochlorite: 'hypochlorite',
  acid: 'acid',
  sample: 'pool water',
  gas: 'gas',
  flue: null,
  'hot water': 'pool water',
};

/** The nominal bore nearest a pipe's outside diameter. */
const dnFor = (od: number): DN =>
  (Object.keys(PIPE_SIZES).map(Number) as DN[]).reduce((best, dn) =>
    Math.abs(PIPE_SIZES[dn].od - od) < Math.abs(PIPE_SIZES[best].od - od)
      ? dn
      : best,
  );

/**
 * A room's pipework (`logic/room-pipes.ts`), drawn on its floor at
 * `floorY`: each run, fitted where it passes through a wall and marked
 * with its service's bands and label; its valves, working (a lever to
 * pull, or overhead a chain wheel whose chain hangs within reach); and its
 * floor channels, grated or under chequer plate. With the low runs to walk
 * round, and the valves' parts to work.
 */
export function createRoomPipework(kit: PanelKit, room: string, floorY = 0) {
  const runs = roomPipes(room);
  const group = new Group();
  group.name = 'pipework';
  const parts = createPartSet();
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  const lift = <T extends readonly [number, number, number]>([x, y, z]: T) =>
    [x, floorY + y, z] as const;
  for (const r of runs) {
    const points = r.points.map(lift);
    const pipe = createPipe(r.kind, r.od, points, {
      ...(r.kind === 'chemical-tube' ? { laid: true } : {}),
      through: r.through.map((t) => ({
        at: lift(t.at),
        normal: t.normal,
        kind: t.kind,
        thickness: t.thickness,
      })),
    });
    pipe.name = r.name;
    group.add(pipe);
    if (
      (retiredFrom(room) ?? room) === 'plant_pool_02' &&
      r.name === 'Sample line'
    ) {
      const main = runs.find((run) => run.name === 'Discharge B');
      if (main) {
        const takeoff = createSampleTakeoff(kit, main.od, r.od);
        takeoff.position.set(...lift(r.points[0]));
        group.add(takeoff);
      }
    }
    const marked = MARKED[r.service];
    if (r.od >= 0.02 && marked) {
      const lagging = PIPE_KINDS[r.kind].insulation?.thickness ?? 0;
      group.add(
        markPipe(kit, points, {
          radius: r.od / 2 + lagging,
          service: marked,
          text: r.label,
        }),
      );
    }
    for (const v of r.valves) group.add(valve(r, v));
    for (const m of r.meters ?? []) {
      const meter = parts.add(
        createInlineFitting(kit, {
          kind: 'flowmeter',
          medium: 'water',
          operator: 'none',
          od: m.od,
          tag: m.tag,
          role: m.role,
          upright: Math.abs(m.along[1]) > 0.5,
          flow: () => readings()[m.reads] ?? 0,
        }),
      );
      placeFitting(meter.object, 'flowmeter', lift(m.at), m.along, m.inward);
      group.add(meter.object);
    }
  }
  if ((retiredFrom(room) ?? room) === 'plant_pool_02') {
    for (const r of olympicRoom().reducers)
      group.add(
        createPipeReducer(
          'pvc-pressure',
          lift(r.from),
          lift(r.to),
          r.fromOd,
          r.toOd,
        ),
      );
  }
  for (const t of roomTees(room)) {
    const tee = createPipeTee(
      t.kind,
      t.mainOd,
      t.branchOd,
      lift(t.at),
      t.mainDirection,
      t.branchDirection,
    );
    tee.name = t.name;
    group.add(tee);
  }
  // What the room's flowmeters read, as the world now stands (the battery's model keeps its own cache).
  function readings(): Record<string, number> {
    const world = store?.world.value;
    if (!world || room !== 'plant_pool_02') return {};
    return olympicMeterReadings(olympicFlowsOf(world));
  }
  function valve(run: PipeRun, v: Valve) {
    // A retired room's valves are the room's it was taken from.
    const installed = installedValveFor(
      retiredFrom(room) ?? room,
      run.name,
      v.name,
    );
    const binding = {
      open: () =>
        store?.world.value.installedValves[installed.assetId] ??
        installed.normal === 'open',
      position: () =>
        store?.world.value.loungeValvePositions[installed.assetId] ??
        Number(
          store?.world.value.installedValves[installed.assetId] ??
            installed.normal === 'open',
        ),
      power: () =>
        room !== 'plant_pool_01' ||
        !store ||
        serviceAvailable(store.world.value.plant, 'plant_pool_01', 'power'),
      air: () =>
        room !== 'plant_pool_01' ||
        !store ||
        serviceAvailable(store.world.value.plant, 'plant_pool_01', 'air'),
      set: (open: boolean) =>
        store?.dispatch({ type: 'plant/valve', id: installed.assetId, open }),
    };
    // Put the same designation on the two free sides of the valve body.
    // A single label offset from the pipe looked suspended in space, and
    // its text faced the pipe from the aisle side. These lie against the
    // blue wafer, clear of the pipe axis and the operating handle.
    const radial =
      v.axis === 'x'
        ? ([0, 1] as const)
        : v.axis === 'z'
          ? ([1, 0] as const)
          : ([-v.facing[2], v.facing[0]] as const);
    const length = Math.hypot(...radial);
    const radius =
      v.style === 'gas-ball'
        ? (v.od / 2) * 1.35
        : PIPE_SIZES[dnFor(v.od)].flange * 0.42;
    for (const side of [-1, 1]) {
      const nx = (radial[0] / length) * side;
      const nz = (radial[1] / length) * side;
      const tag = createMicroLabel(kit, installed.tag, {
        height: 0.018,
        ink: '#19242a',
        plate: '#f0ede3',
      });
      tag.position.set(
        v.at[0] + nx * (radius + 0.003),
        floorY + v.at[1],
        v.at[2] + nz * (radius + 0.003),
      );
      tag.rotation.y = Math.atan2(nx, nz);
      group.add(tag);
    }
    if (v.style === 'gas-ball') {
      // A lever ball valve, built along x with its lever up: stood on end
      // for a vertical pipe, its lever then turned to face the room.
      const gas = parts.add(
        createGasBallValve(kit, {
          pipeRadius: v.od / 2,
          name: `${installed.tag} · ${v.name}`,
          binding,
        }),
      );
      const holder = new Group();
      holder.position.set(...lift(v.at));
      if (v.axis === 'y') {
        gas.object.rotation.z = Math.PI / 2;
        holder.rotation.y = Math.atan2(v.facing[2], -v.facing[0]);
      } else holder.rotation.y = v.axis === 'z' ? Math.PI / 2 : 0;
      holder.add(gas.object);
      return holder;
    }
    if (v.operator === 'motor') {
      // An electric actuator on its valve, worked from its panel.
      const motor = parts.add(
        createInlineFitting(
          kit,
          {
            kind: 'isolating-valve',
            medium: 'water',
            operator: 'motor',
            od: v.od,
          },
          binding,
        ),
      );
      return placeFitting(
        motor.object,
        'isolating-valve',
        lift(v.at),
        v.axis === 'x' ? [1, 0, 0] : v.axis === 'y' ? [0, 1, 0] : [0, 0, 1],
        [v.facing[0], v.facing[2]],
      );
    }
    if (v.operator === 'solenoid') {
      // Solenoid-operated: its actuator up (or out of a vertical pipe),
      // turned to face away from its machine.
      const actuated = parts.add(
        createActuatedButterflyValve(
          kit,
          dnFor(v.od),
          v.axis === 'y' ? 'y' : 'z',
          `${installed.tag} · ${v.name}`,
          binding,
        ),
      );
      actuated.object.position.set(...lift(v.at));
      actuated.object.rotation.y = Math.atan2(v.facing[0], v.facing[2]);
      return actuated.object;
    }
    const part = parts.add(
      // Built along its own z (or upright), then turned to face away
      // from its machine, so its lever never swings into it.
      createWaterButterflyValve(
        kit,
        dnFor(v.od),
        v.axis === 'y' ? 'y' : 'z',
        `${installed.tag} · ${v.name}`,
        binding,
        v.operator,
      ),
    );
    part.object.position.set(...lift(v.at));
    part.object.rotation.y = Math.atan2(v.facing[0], v.facing[2]);
    if (v.operator === 'lever') return part.object;
    // Out of reach overhead: a chain wheel on its spindle, its endless
    // chain hanging to within reach; pulling the chain works it.
    const use = [...part.uses.values()][0];
    for (const chain of addChainWheel(kit, part.object, {
      dn: dnFor(v.od),
      axis: v.axis,
      at: v.at[1],
      chainTo: CHAIN_TO,
      name: v.name,
    }))
      if (use) parts.uses.set(chain, use);
    return part.object;
  }
  // The floor channels: grated, or covered with chequer plate.
  const grating = new MeshStandardMaterial({
    color: '#3a3d3e',
    roughness: 0.6,
    metalness: 0.5,
  });
  const chequer = new MeshStandardMaterial({
    color: '#9da2a4',
    roughness: 0.45,
    metalness: 0.7,
  });
  kit.materials.push(grating, chequer);
  for (const c of roomChannels(room)) {
    const along = Math.abs(c.to[0] - c.from[0]) > Math.abs(c.to[2] - c.from[2]);
    const length = Math.abs(along ? c.to[0] - c.from[0] : c.to[2] - c.from[2]);
    const slab = new Mesh(
      new BoxGeometry(
        along ? length + c.width : c.width,
        0.012,
        along ? c.width : length + c.width,
      ),
      c.kind === 'cover' ? chequer : grating,
    );
    slab.position.set(
      (c.from[0] + c.to[0]) / 2,
      floorY + 0.006,
      (c.from[2] + c.to[2]) / 2,
    );
    group.add(slab);
  }
  // The isolators on their stands, their handles the switches.
  const { isolators, stands } = roomIsolators(room);
  const galv = new MeshStandardMaterial({
    color: '#a9aeae',
    roughness: 0.45,
    metalness: 0.6,
  });
  kit.materials.push(galv);
  for (const [x, , z] of stands) {
    const post = new Mesh(
      new BoxGeometry(0.041, ISOLATOR_Y + 0.15, 0.041),
      galv,
    );
    post.position.set(x, floorY + (ISOLATOR_Y + 0.15) / 2, z);
    const foot = new Mesh(new BoxGeometry(0.2, 0.01, 0.2), galv);
    foot.position.set(x, floorY + 0.005, z);
    group.add(post, foot);
  }
  const switches = isolators.map((place) => {
    const isolator = createPowerIsolator(kit, {
      on: true,
      rating: 'TP&N 63A',
      maker: 'VOLTARA',
    });
    // Its back on the stand's face, toward where it faces.
    const back = 0.105 / 2;
    isolator.group.position.set(
      place.at[0] - place.facing[0] * back,
      floorY + place.at[1],
      place.at[2] - place.facing[2] * back,
    );
    isolator.group.rotation.y = Math.atan2(place.facing[0], place.facing[2]);
    isolator.group.name = place.name;
    group.add(isolator.group);
    // Switched here, it is switched in the world (`world.ts`): its
    // machine stops, and so, if it was the last, does its pool's water.
    const name = place.name as IsolatorName;
    const toggle = () => {
      isolator.toggle();
      store?.dispatch({ type: 'plant/isolator', name, on: isolator.on });
    };
    isolator.handle.traverse((o) => parts.uses.set(o, toggle));
    return { isolator, name };
  });
  return {
    group,
    switches,
    solids: [...pipeObstacles(runs), ...stands.map(standFootprint)],
    uses: parts.uses,
    update(delta: number) {
      parts.update(delta);
      for (const { isolator, name } of switches) {
        // As the world has it, switched here or anywhere.
        const on = store?.world.value.plant.isolators[name];
        if (on !== undefined && on !== isolator.on) isolator.set(on);
        isolator.update(delta);
      }
    },
    dispose() {
      parts.dispose();
    },
  };
}
