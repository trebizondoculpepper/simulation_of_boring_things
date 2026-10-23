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
import type { IsolatorName } from '../../../game/plant/services';
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
  cabinetGully,
  cabinetIsolator,
  cabinetPipes,
} from '../logic/cabinet-pipes';
import type { Service } from '../logic/cabinet-pipes';
import { CHAIN_TO } from '../logic/room-pipes';
import { installedValveFor } from '../../../game/plant/installed-valves';

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
  const lift = <T extends readonly [number, number, number]>([x, y, z]: T) =>
    [x, floorY + y, z] as const;
  for (const run of runs) {
    const points = run.points.map(lift);
    const pipe = createPipe(run.kind, run.od, points, {
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
    group.add(
      markPipe(kit, points, {
        radius: run.od / 2 + lagging,
        service: MARKED[run.service],
        text: run.label,
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
      const valve = createWaterButterflyValve(
        kit,
        50,
        axis === 'x' ? 'z' : axis,
        `${id} · ${description?.name ?? 'Valve'}`,
        installed
          ? {
              open: () =>
                store?.world.value.installedValves[installed.assetId] ??
                installed.normal === 'open',
              set: (open) =>
                store?.dispatch({
                  type: 'plant/valve',
                  id: installed.assetId,
                  open,
                }),
            }
          : {
              open: () =>
                store ? partOpen(store.world.value.identifiedPlant, id) : true,
              set: (open) => store?.dispatch({ type: 'plant/valve', id, open }),
            },
        run.valve.operator,
      );
      valve.object.position.set(...lift(at));
      if (axis === 'x') valve.object.rotation.y = Math.PI / 2;
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
    const tail = new Mesh(new CylinderGeometry(0.02, 0.02, 0.03, 12), steel);
    tail.position.set(gully[0], floorY + 0.015, gully[2]);
    group.add(grating, tundish, tail);
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
    update(delta: number) {
      // As the world has it, switched here or anywhere.
      const on = store?.world.value.plant.isolators[name];
      if (isolator && on !== undefined && on !== isolator.on) isolator.set(on);
      isolator?.update(delta);
      for (const valve of valveParts) valve.update(delta);
    },
  };
}
