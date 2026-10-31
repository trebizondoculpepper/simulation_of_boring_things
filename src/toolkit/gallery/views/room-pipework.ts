import { createPipeMarker } from '../../components/plant/views/pipe-marker';
import {
  loungeFlowsOf,
  loungeMeterReadings,
} from '../../../game/plant/lounge-valves';
import type { Object3D } from 'three';
import { createFloorGully } from '../../components/plant/views/floor-gully';
import { createChemicalLineFittings } from './chemical-line-fittings';
import { loungeValveFlows } from '../../../game/plant/lounge-valves';
import { circulating } from '../../../game/plant/pools';
import { createActuatedButterflyValve } from '../../components/plant/views/actuated-butterfly-valve';
import { createSampleTakeoff } from '../../components/plant/views/sample-takeoff';
import {
  createInjectionQuillSet,
  createInjectionSaddle,
} from '../../components/plant/views/injection-quill';
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
import { roomWorld } from '../../save/world-store';
import type { IsolatorName } from '../../../game/plant/services';
import { serviceAvailable } from '../../../game/plant/services';
import { createPowerIsolator } from '../../components/industrial-control/views/panel-switchgear';
import {
  addChainWheel,
  createWaterButterflyValve,
} from '../../components/plant/views/water-butterfly-valve';
import { createGasBallValve } from '../../components/plant/views/gas-fittings';
import { installedValveFor } from '../../../game/plant/installed-valves';
import { markComponent } from '../../components/core/views/component-identity';
import { runBinding } from '../logic/world-in-model';
import { SCHEMATICS } from '../../../game/plant/schematics';
import {
  LOUNGE_TRIO_SITE,
  OLYMPIC_TRIO_SITE,
  trioIsolator,
} from '../../../game/plant/aqualis-schematic';
import type { TrioPool } from '../../../game/plant/aqualis-world';

/** Each Trio's supply isolator, by its fitting's id: the pool it serves (mission 114). */
const TRIO_ISOLATORS = new Map<string, TrioPool>(
  (
    [
      [LOUNGE_TRIO_SITE, 'pool_01'],
      [OLYMPIC_TRIO_SITE, 'pool_02'],
    ] as const
  ).flatMap(([site, pool]) => {
    const id = trioIsolator(site);
    return id ? [[id, pool] as const] : [];
  }),
);
import { schematicNodeOfKind } from '../../../game/plant/model-valves';
import { olympicMeterReadings } from '../../../game/plant/olympic-battery';
import { olympicFlowsOfWorld } from '../logic/world-reading';
import {
  createInlineFitting,
  placeFitting,
} from '../../components/plant/views/inline-fittings';
import type { DN } from '../../components/plant/views/plant-tools';
import { PIPE_SIZES } from '../../components/plant/views/plant-tools';
import {
  CHAIN_TO,
  ISOLATOR_Y,
  roomInjections,
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
/** Where along a chemical run its markers go: the middle of each straight of 0.8 m or more, and every 3 m along a longer one, each with its direction of flow. */
function chemicalMarkers(
  points: readonly (readonly [number, number, number])[],
) {
  const out: { at: [number, number, number]; dir: [number, number, number] }[] =
    [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d: [number, number, number] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L = Math.hypot(...d);
    if (L < 0.8) continue;
    const n = Math.max(1, Math.floor(L / 3));
    const u: [number, number, number] = [d[0] / L, d[1] / L, d[2] / L];
    for (let k = 0; k < n; k++) {
      const t = ((k + 0.5) / n) * L;
      out.push({
        at: [a[0] + u[0] * t, a[1] + u[1] * t, a[2] + u[2] * t],
        dir: u,
      });
    }
  }
  return out;
}

/** A marker (built along +x, its arrow +x) set at `m`, turned to its flow. */
function placeMarker(
  marker: Object3D,
  m: { at: [number, number, number]; dir: [number, number, number] },
) {
  marker.position.set(...m.at);
  const [dx, dy, dz] = m.dir;
  if (Math.abs(dy) > 0.9)
    marker.rotation.z = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  else marker.rotation.y = Math.atan2(-dz, dx);
  return marker;
}

export function createRoomPipework(kit: PanelKit, room: string, floorY = 0) {
  const runs = roomPipes(room);
  const group = new Group();
  group.name = 'pipework';
  const parts = createPartSet();
  const store = typeof window === 'undefined' ? null : roomWorld();
  const lift = <T extends readonly [number, number, number]>([x, y, z]: T) =>
    [x, floorY + y, z] as const;
  // A chemical line's own valves (plan 085).
  const chemicalFittings = createChemicalLineFittings(
    kit,
    retiredFrom(room) ?? room,
    store,
    lift,
    (part) => parts.add(part),
  );
  group.add(chemicalFittings.group);
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
    // What it is drawn for in its room's model (prompt 064).
    const own = retiredFrom(room) ?? room;
    const model = runBinding(own, r);
    const bind = <T extends Object3D>(object: T): T =>
      model && !('decorative' in model)
        ? markComponent(object, { name: r.name, model })
        : object;
    group.add(bind(pipe));
    if (
      (retiredFrom(room) ?? room) === 'plant_pool_02' &&
      r.name === 'Sample line'
    ) {
      const main = runs.find((run) => run.name === 'Discharge B');
      if (main) {
        const takeoff = createSampleTakeoff(kit, main.od, r.od);
        takeoff.position.set(...lift(r.points[0]));
        group.add(bind(takeoff));
      }
    }
    // The lounge's sample, off the filtered main by its saddle (prompt
    // 089, item 4): the main's middle half its size below the tube's foot.
    if (
      (retiredFrom(room) ?? room) === 'plant_pool_01' &&
      r.name === 'Sample line from the filtered main, its point'
    ) {
      const main = runs.find(
        (run) => run.name === 'Filtered main to the heat exchanger',
      );
      if (main) {
        const takeoff = createSampleTakeoff(kit, main.od, r.od);
        const [x, y, z] = r.points[0];
        takeoff.position.set(...lift([x, y - main.od / 2, z] as const));
        group.add(bind(takeoff));
      }
    }
    // A chemical line (plan 085): its transfer mains, branches and fills
    // double-contained, an outer pipe over the carrier; every chemical
    // run marked to BS 1710, hazard bands, legend and a flow arrow, along
    // its straights.
    const chemical = r.service === 'hypochlorite' || r.service === 'acid';
    if (chemical && r.od >= 0.016) {
      const contained = r.kind === 'pvc-pressure';
      const outer = contained ? Math.max(0.05, r.od * 1.9) : r.od;
      if (contained && r.od >= 0.024)
        group.add(
          bind(
            createPipe('double-contained', outer, points, {
              through: [],
            }),
          ),
        );
      for (const m of chemicalMarkers(points))
        group.add(
          bind(
            placeMarker(
              createPipeMarker(kit, {
                r: outer / 2,
                chemical: r.service as 'hypochlorite' | 'acid',
                contained,
              }).object,
              m,
            ),
          ),
        );
    }
    const marked = MARKED[r.service];
    if (!(chemical && r.od >= 0.016) && r.od >= 0.02 && marked) {
      const lagging = PIPE_KINDS[r.kind].insulation?.thickness ?? 0;
      group.add(
        bind(
          markPipe(kit, points, {
            radius: r.od / 2 + lagging,
            service: marked,
            text: r.label,
          }),
        ),
      );
    }
    for (const c of r.checks ?? []) chemicalFittings.check(r, c);
    for (const v of r.valves) {
      // A dosing quill's ball valve is drawn with its quill set.
      if (v.style === 'chemical-ball') continue;
      if (v.style === 'chemical-line') {
        chemicalFittings.valve(r, v);
        continue;
      }
      const installed = installedValveFor(own, r.name, v.name);
      const fitting = SCHEMATICS[own]?.fittings.some(
        (f) => f.id === installed.assetId,
      );
      group.add(
        markComponent(valve(r, v), {
          tag: installed.tag,
          // Its fitting: the room's plumbing's own, or its register's.
          ...(v.fitting
            ? { model: { fitting: v.fitting } }
            : fitting
              ? { model: { fitting: installed.assetId } }
              : {}),
        }),
      );
    }
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
      group.add(
        markComponent(meter.object, {
          tag: m.tag,
          ...(m.fitting ? { model: { fitting: m.fitting } } : {}),
        }),
      );
    }
  }
  if ((retiredFrom(room) ?? room) === 'plant_pool_02') {
    // Each dose line's quill sealed into the dosing spool's top, where the
    // line comes down onto it (the owner, 2026-10-28).
    const spool = olympicRoom().runs.find((r) => r.name === 'Dosing spool');
    for (const r of olympicRoom().runs.filter((x) =>
      /dose line$/.test(x.name),
    )) {
      if (!spool) break;
      const end = r.points.at(-1)!;
      const radius = spool.od / 2;
      const saddle = createInjectionSaddle(kit, radius);
      saddle.position.set(...lift([end[0], spool.points.at(-1)![1], end[2]]));
      group.add(
        markComponent(saddle, {
          name: `${r.name.replace(/ dose line$/, '')} injection quill`,
          model: r.model ?? { link: r.name },
        }),
      );
    }
    for (const r of olympicRoom().reducers)
      group.add(
        markComponent(
          createPipeReducer(
            'pvc-pressure',
            lift(r.from),
            lift(r.to),
            r.fromOd,
            r.toOd,
          ),
          // The pumps' discharge into its manifold (`olympic-annex.ts`).
          { name: 'Concentric reducer', model: { node: 'manifold' } },
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
    // What it is a fitting of: as it says, or the run its name is of.
    const teeModel =
      t.model ??
      runBinding(retiredFrom(room) ?? room, {
        name: t.name.replace(/ tee$/, ''),
      });
    group.add(
      teeModel && !('decorative' in teeModel)
        ? markComponent(tee, { name: t.name, model: teeModel })
        : tee,
    );
  }
  // What the room's flowmeters read, as the world now stands (the battery's model keeps its own cache).
  function readings(): Record<string, number> {
    const world = store?.world.value;
    if (!world) return {};
    if (room === 'plant_pool_01')
      return loungeMeterReadings(loungeFlowsOf(world));
    if (room !== 'plant_pool_02') return {};
    return olympicMeterReadings(olympicFlowsOfWorld(world));
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
      // Its position where the world models its travel (the lounge's
      // valves); elsewhere none, so it strokes itself at its actuator's
      // speed and is heard doing so (the owner, 2026-10-26: the Olympic's
      // valves snapped open and shut, silent).
      ...(room === 'plant_pool_01'
        ? {
            position: () =>
              store?.world.value.loungeValvePositions[installed.assetId] ??
              Number(
                store?.world.value.installedValves[installed.assetId] ??
                  installed.normal === 'open',
              ),
          }
        : {}),
      power: () =>
        room !== 'plant_pool_01' ||
        !store ||
        serviceAvailable(store.world.value.plant, 'plant_pool_01', 'power'),
      set: (open: boolean) =>
        store?.dispatch({ type: 'plant/valve', id: installed.assetId, open }),
    };
    // A butterfly valve's designation is printed on plaques round its blue
    // body (`valve-plaques.ts`). A gas ball valve or a motorised ball valve,
    // which have none, have the same designation on two tags at the body's
    // free sides, clear of the pipe axis and the operating handle.
    const plaque = { tag: installed.tag, name: v.name };
    const tagged = v.style === 'gas-ball' || v.operator === 'motor';
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
    for (const side of tagged ? [-1, 1] : []) {
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
      // Its valve's plate: the valve's, in the model as it is.
      group.add(markComponent(tag, { tag: installed.tag }));
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
          { plaque },
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
        plaque,
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
  // The dosing lines' injection points (prompt 089, item 4): each quill
  // in its main, its non-return valve and its isolating ball valve, the
  // ball valve the world's (its model valve), its check valve passing
  // while it is open.
  const checks: { check: { flowing: boolean }; open: () => boolean }[] = [];
  for (const q of roomInjections(retiredFrom(room) ?? room)) {
    const open = () => store?.world.value.installedValves[q.valve] ?? true;
    const set = createInjectionQuillSet(kit, {
      mainRadius: q.mainOd / 2,
      name: q.name,
      valve: {
        open,
        set: (on: boolean) =>
          store?.dispatch({ type: 'plant/valve', id: q.valve, open: on }),
      },
    });
    parts.add(set.quill);
    parts.add(set.check);
    parts.add(set.valve);
    markComponent(set.quill.object, { name: q.name, model: { node: q.quill } });
    markComponent(set.check.object, {
      name: `${q.name} non-return valve`,
      model: { fitting: q.check },
    });
    markComponent(set.valve.object, {
      name: `${q.name} isolating valve`,
      model: { fitting: q.valve },
    });
    checks.push({ check: set.check, open });
    set.group.position.set(...lift(q.at));
    set.group.rotation.y = Math.atan2(-q.outward[2], q.outward[0]);
    group.add(
      markComponent(set.group, {
        name: `${q.name} set`,
        model: { node: q.quill },
      }),
    );
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
    // A floor channel: the room's drainage, its drain in the model.
    const drain = schematicNodeOfKind(retiredFrom(room) ?? room, 'gully');
    group.add(
      drain
        ? markComponent(slab, { name: 'Floor channel', model: { node: drain } })
        : slab,
    );
  }
  // The lounge tank already drains to the schematic's waste node. Its
  // open pipe discharges visibly across an air gap into that drainage.
  const tankDrain = runs.find(
    (run) => run.name === 'Balance tank drain to waste',
  );
  let tankGully: ReturnType<typeof createFloorGully> | undefined;
  if ((retiredFrom(room) ?? room) === 'plant_pool_01' && tankDrain) {
    const end = tankDrain.points.at(-1)!;
    tankGully = createFloorGully(kit, { drop: end[1] });
    tankGully.group.position.set(end[0], floorY, end[2]);
    group.add(
      markComponent(tankGully.group, {
        name: 'Balance tank drain gully',
        model: { node: schematicNodeOfKind('plant_pool_01', 'gully')! },
      }),
    );
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
    // A stand: structure, it does nothing (prompt 064).
    for (const o of [post, foot]) markComponent(o, { decorative: true });
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
    // Its fitting in the room's model, where the room has one.
    const ownRoom = retiredFrom(room) ?? room;
    group.add(
      markComponent(isolator.group, {
        name: place.name,
        ...(SCHEMATICS[ownRoom]?.fittings.some((f) => f.id === place.name)
          ? { model: { fitting: place.name } }
          : {}),
      }),
    );
    // Switched here, it is switched in the world (`world.ts`): its
    // machine stops, and so, if it was the last, does its pool's water.
    // A Trio's isolator is its own (mission 114): the world's Trio's.
    const name = place.name as IsolatorName;
    const trio = TRIO_ISOLATORS.get(place.name);
    const toggle = () => {
      isolator.toggle();
      if (trio)
        store?.dispatch({
          type: 'aqualis',
          pool: trio,
          action: { act: 'isolator', on: isolator.on },
        });
      else store?.dispatch({ type: 'plant/isolator', name, on: isolator.on });
    };
    isolator.handle.traverse((o) => parts.uses.set(o, toggle));
    return { isolator, name, trio };
  });
  return {
    group,
    switches,
    solids: [...pipeObstacles(runs), ...stands.map(standFootprint)],
    uses: parts.uses,
    setAudible(on: boolean) {
      parts.setAudible(on);
    },
    update(delta: number) {
      for (const c of checks) c.check.flowing = c.open();
      chemicalFittings.update();
      parts.update(delta);
      if (tankGully && store) {
        const world = store.world.value;
        const running = circulating(
          world.pools.pool_01,
          world.plant,
          'pool_01',
          world.motors,
        );
        tankGully.setFlow(
          loungeValveFlows(world.loungeValvePositions, running).tankDrain / 3.6,
        );
      }
      for (const { isolator, name, trio } of switches) {
        // As the world has it, switched here or anywhere.
        const world = store?.world.value;
        const on = trio
          ? world?.aqualis[trio].isolator
          : world?.plant.isolators[name];
        if (on !== undefined && on !== isolator.on) isolator.set(on);
        isolator.update(delta);
      }
    },
    dispose() {
      parts.dispose();
    },
  };
}
