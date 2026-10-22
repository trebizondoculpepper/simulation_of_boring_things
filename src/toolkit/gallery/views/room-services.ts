import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { newWorld } from '../../../game/world';
import { serviceAvailable } from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';
import { worldStore } from '../../save/world-store';
import { layoutRoom, FEEDER_ISOLATOR } from '../logic/room-equipment';
import { roomServiceRoutes } from '../logic/room-services';
import { createSwitchFuse } from '../../components/industrial-control/views/switch-fuse';

/** Room equipment's physical service runs, plus a local power isolator. The
 * isolator changes the saved feeder state; the lamp shows actual upstream
 * availability, including outages in the shared switch room. */
export function createRoomServices(
  kit: PanelKit,
  room: ServiceRoom,
  floorY = 0,
  /** Each placed machine's top as drawn, metres over the floor (`roomServiceRoutes`). */
  drawnTops: readonly (number | undefined)[] = [],
) {
  const group = new Group();
  group.name = `${room} services`;
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  const fallback = newWorld();
  const uses = new Map<Object3D, () => void>();
  const lift = ([x, y, z]: readonly [number, number, number]) =>
    [x, floorY + y, z] as const;

  let cableMat: MeshStandardMaterial | null = null;
  const cableMaterial = () => {
    if (!cableMat) {
      cableMat = new MeshStandardMaterial({ color: '#2a2b2c', roughness: 0.7 });
      kit.materials.push(cableMat);
    }
    return cableMat;
  };
  let boxMat: MeshStandardMaterial | null = null;
  const boxMaterial = () => {
    if (!boxMat) {
      boxMat = new MeshStandardMaterial({
        color: '#9da3a4',
        metalness: 0.6,
        roughness: 0.45,
      });
      kit.materials.push(boxMat);
    }
    return boxMat;
  };
  for (const route of roomServiceRoutes(room, drawnTops)) {
    const points = route.points
      .map(lift)
      .filter(
        (p, i, all) =>
          i === 0 ||
          p.some(
            (coordinate, axis) =>
              Math.abs(coordinate - all[i - 1][axis]) > 0.001,
          ),
      );
    if (points.length < 2) continue;
    if (route.kind === 'rectangular-duct') {
      const metal = new MeshStandardMaterial({
        color: '#aeb7b8',
        metalness: 0.6,
        roughness: 0.5,
      });
      kit.materials.push(metal);
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i];
        const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
        const rise = Math.abs(b[1] - a[1]);
        // Each length runs on into the next by half its depth, so its
        // corners meet.
        const lap = route.od * 0.62;
        if (length < 0.01 && rise > 0.01) {
          // Upright: its broad face toward the room as it climbs.
          const riser = new Mesh(
            new BoxGeometry(route.od, rise + lap, lap),
            metal,
          );
          riser.position.set(a[0], (a[1] + b[1]) / 2, a[2]);
          riser.name = route.name;
          group.add(riser);
          continue;
        }
        if (length < 0.01) continue;
        const duct = new Mesh(
          new BoxGeometry(length + lap, route.od * 0.62, route.od),
          metal,
        );
        duct.position.set(
          (a[0] + b[0]) / 2,
          (a[1] + b[1]) / 2,
          (a[2] + b[2]) / 2,
        );
        duct.rotation.y = -Math.atan2(b[2] - a[2], b[0] - a[0]);
        duct.name = route.name;
        group.add(duct);
      }
    } else if (route.kind === 'flex-cable') {
      // A flexible cable from its outlet box, hanging in a slight curve
      // down to the machine: the box on the wall at its top.
      const [a, b] = [points[0], points[points.length - 1]];
      const mid = new Vector3(
        (a[0] + b[0]) / 2,
        (a[1] + b[1]) / 2 - 0.06,
        (a[2] + b[2]) / 2,
      );
      const curve = new QuadraticBezierCurve3(
        new Vector3(...a),
        mid,
        new Vector3(...b),
      );
      const cable = new Mesh(
        new TubeGeometry(curve, 16, route.od / 2, 8),
        cableMaterial(),
      );
      cable.name = route.name;
      const outlet = new Mesh(
        new BoxGeometry(0.086, 0.086, 0.05),
        boxMaterial(),
      );
      outlet.name = `${route.name} outlet box`;
      outlet.position.set(a[0], a[1], a[2]);
      group.add(cable, outlet);
    } else {
      // Dosing and sample tube clipped in square runs, not hung in curves.
      const pipe = createPipe(
        route.kind,
        route.od,
        points,
        route.kind === 'chemical-tube' ? { laid: true } : {},
      );
      pipe.name = route.name;
      group.add(pipe);
    }
  }

  const layout = layoutRoom(room);
  // The room's supply: Voltara's switch-fuse on the west wall by the
  // entrance, its back on the wall, facing into the room; its space kept
  // clear by the layout (`feederIsolatorSpace`), its conduit routed into
  // its gland (`roomServiceRoutes`). Switched here, it switches the room's
  // feeder in the world; its neon shows whether power reaches the room.
  const fuse = layout
    ? createSwitchFuse(kit, {
        on: (store?.world.value ?? fallback).plant.feeders[room] ?? true,
      })
    : null;
  if (layout && fuse) {
    fuse.group.position.set(
      -layout.box.w / 2,
      floorY + FEEDER_ISOLATOR.y,
      layout.box.d / 2 - FEEDER_ISOLATOR.fromSouth,
    );
    fuse.group.rotation.y = Math.PI / 2;
    fuse.group.name = `${room} room supply switch-fuse`;
    group.add(fuse.group);
    if (store) {
      const toggle = () =>
        store.dispatch({
          type: 'plant/feeder',
          room,
          on: !store.world.value.plant.feeders[room],
        });
      fuse.handle.traverse((o) => uses.set(o, toggle));
    }
  }
  const update = (delta = 0) => {
    const plant = store?.world.value.plant ?? fallback.plant;
    if (fuse) {
      // As the world has it, switched here or anywhere.
      const on = plant.feeders[room];
      if (on !== undefined && on !== fuse.on) fuse.set(on);
      fuse.setSupplied(serviceAvailable(plant, room, 'power'));
      fuse.update(delta);
    }
  };
  update();
  return { group, uses, update };
}
