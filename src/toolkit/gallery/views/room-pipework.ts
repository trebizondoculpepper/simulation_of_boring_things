import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import {
  createPipe,
  createPipeTee,
  PIPE_KINDS,
} from '../../components/core/views/pipe-kinds';
import { markPipe } from '../../components/plant/views/pipe-markers';
import { supportPipe } from '../../components/plant/views/pipe-supports';
import type { PipeService } from '../../components/plant/views/pipe-markers';
import { createPowerIsolator } from '../../components/industrial-control/views/panel-switchgear';
import { createWaterButterflyValve } from '../../components/plant/views/water-butterfly-valve';
import type { DN } from '../../components/plant/views/plant-tools';
import { PIPE_SIZES } from '../../components/plant/views/plant-tools';
import {
  CHAIN_TO,
  ISOLATOR_Y,
  roomIsolators,
  standFootprint,
  INTO_CEILING,
  pipeObstacles,
  roomChannels,
  roomPipes,
  roomTees,
} from '../logic/room-pipes';
import type { PipeRun, Valve } from '../logic/room-pipes';

/** Each run's service, as its markings name it. */
const MARKED: Record<PipeRun['service'], PipeService> = {
  'pool water': 'pool water',
  'heating flow': 'heating flow',
  'heating return': 'heating return',
  drainage: 'drainage',
  'make-up': 'pool water',
  ozone: 'air',
  electrical: 'electrical',
  hypochlorite: 'hypochlorite',
  sample: 'pool water',
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
    if (r.od >= 0.02) {
      const lagging = PIPE_KINDS[r.kind].insulation?.thickness ?? 0;
      group.add(
        markPipe(kit, points, {
          radius: r.od / 2 + lagging,
          service: MARKED[r.service],
          text: r.label,
        }),
      );
    }
    // The heating's hangers, on drop rods from the services ceiling.
    if (r.kind === 'lagged-heating')
      group.add(
        supportPipe(kit, points, {
          radius: r.od / 2 + (PIPE_KINDS[r.kind].insulation?.thickness ?? 0),
          ceilingY: floorY + INTO_CEILING,
          floorY,
        }),
      );
    for (const v of r.valves) group.add(valve(v));
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
  function valve(v: Valve) {
    const part = parts.add(
      // Built along its own z (or upright), then turned to face away
      // from its machine, so its lever never swings into it.
      createWaterButterflyValve(
        kit,
        dnFor(v.od),
        v.axis === 'y' ? 'y' : 'z',
        v.name,
      ),
    );
    part.object.position.set(...lift(v.at));
    part.object.rotation.y = Math.atan2(v.facing[0], v.facing[2]);
    if (v.operator === 'lever') return part.object;
    // Out of reach overhead: a chain wheel on its spindle, its endless
    // chain hanging to within reach; pulling the chain works it.
    const use = [...part.uses.values()][0];
    const red = new MeshStandardMaterial({ color: '#b22a22', roughness: 0.5 });
    const chainSteel = new MeshStandardMaterial({
      color: '#8a8f92',
      roughness: 0.4,
      metalness: 0.7,
    });
    kit.materials.push(red, chainSteel);
    const r = v.od / 2 + 0.12;
    const wheel = new Mesh(new TorusGeometry(0.15, 0.012, 8, 24), red);
    wheel.position.set(0, r, 0);
    part.object.add(wheel);
    const drop = v.at[1] + r - CHAIN_TO;
    for (const side of [-1, 1]) {
      const chain = new Mesh(
        new CylinderGeometry(0.006, 0.006, drop, 6),
        chainSteel,
      );
      chain.position.set(side * 0.15, r - drop / 2, 0);
      chain.name = `${v.name} chain`;
      part.object.add(chain);
      if (use) parts.uses.set(chain, use);
    }
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
    const toggle = () => isolator.toggle();
    isolator.handle.traverse((o) => parts.uses.set(o, toggle));
    return isolator;
  });
  return {
    group,
    switches,
    solids: [...pipeObstacles(runs), ...stands.map(standFootprint)],
    uses: parts.uses,
    update(delta: number) {
      parts.update(delta);
      for (const s of switches) s.update(delta);
    },
    dispose() {
      parts.dispose();
    },
  };
}
