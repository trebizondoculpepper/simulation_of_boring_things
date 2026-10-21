import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPipe, PIPE_KINDS } from '../../components/core/views/pipe-kinds';
import { markPipe } from '../../components/plant/views/pipe-markers';
import { supportPipe } from '../../components/plant/views/pipe-supports';
import type { PipeService } from '../../components/plant/views/pipe-markers';
import { createPowerIsolator } from '../../components/industrial-control/views/panel-switchgear';
import {
  cabinetGully,
  cabinetIsolator,
  cabinetPipes,
} from '../logic/cabinet-pipes';
import type { Service } from '../logic/cabinet-pipes';

/** Each run's service, as its markings name it. */
const MARKED: Record<Service, PipeService> = {
  'pool water': 'pool water',
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
  room: string,
  floorY: number,
  /** The underside of the services ceiling, over the floor. */
  ceiling = 5,
) {
  const runs = cabinetPipes(room);
  if (!runs.length) return null;
  const group = new Group();
  group.name = 'cabinet services';
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
    // The heating's hangers, on drop rods from the ceiling.
    if (run.kind === 'lagged-heating')
      group.add(
        supportPipe(kit, points, {
          radius: run.od / 2 + lagging,
          ceilingY: floorY + ceiling,
          floorY,
        }),
      );
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
  const uses = new Map<Object3D, () => void>();
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
    const toggle = () => isolator.toggle();
    isolator.handle.traverse((o) => uses.set(o, toggle));
  }
  return {
    group,
    isolator,
    uses,
    update(delta: number) {
      isolator?.update(delta);
    },
  };
}
