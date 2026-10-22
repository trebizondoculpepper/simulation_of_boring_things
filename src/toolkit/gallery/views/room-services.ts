import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { newWorld } from '../../../game/world';
import { serviceAvailable } from '../../../game/plant/services';
import type { ServiceRoom, Utility } from '../../../game/plant/services';
import { worldStore } from '../../save/world-store';
import { layoutRoom, FEEDER_ISOLATOR } from '../logic/room-equipment';
import { roomServiceRoutes } from '../logic/room-services';

/** Room equipment's physical service runs, plus a local power isolator. The
 * isolator changes the saved feeder state; the lamp shows actual upstream
 * availability, including outages in the shared switch room. */
export function createRoomServices(
  kit: PanelKit,
  room: ServiceRoom,
  floorY = 0,
) {
  const group = new Group();
  group.name = `${room} services`;
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  const fallback = newWorld();
  const uses = new Map<Object3D, () => void>();
  const status: { material: MeshStandardMaterial; utility: Utility }[] = [];
  const lift = ([x, y, z]: readonly [number, number, number]) =>
    [x, floorY + y, z] as const;

  for (const route of roomServiceRoutes(room)) {
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
  if (layout) {
    // This is kept beside the entrance, above the operator's reach and clear
    // of the equipment door's swing. A genuine feeder status, not a fake
    // fixed green light.
    // Its space is kept clear by the layout (`feederIsolatorSpace`).
    const x = -layout.box.w / 2 + 0.15;
    const z = layout.box.d / 2 - FEEDER_ISOLATOR.fromSouth;
    const body = new MeshStandardMaterial({
      color: '#d4d5ce',
      roughness: 0.55,
    });
    const lampMaterial = new MeshStandardMaterial({
      color: '#1b6738',
      emissive: '#1b6738',
      emissiveIntensity: 0.5,
    });
    const leverMaterial = new MeshStandardMaterial({
      color: '#20292c',
      roughness: 0.45,
    });
    kit.materials.push(body, lampMaterial, leverMaterial);
    const box = new Mesh(new BoxGeometry(0.12, 0.28, 0.22), body);
    box.position.set(x, floorY + FEEDER_ISOLATOR.y, z);
    box.name = `${room} feeder isolator`;
    const lever = new Mesh(new BoxGeometry(0.08, 0.09, 0.035), leverMaterial);
    lever.position.set(x + 0.08, floorY + 1.48, z);
    lever.name = `${room} feeder handle`;
    const lamp = new Mesh(new BoxGeometry(0.02, 0.055, 0.055), lampMaterial);
    lamp.position.set(x + 0.071, floorY + 1.58, z);
    group.add(box, lever, lamp);
    status.push({ material: lampMaterial, utility: 'power' });
    if (store) {
      const toggle = () =>
        store.dispatch({
          type: 'plant/feeder',
          room,
          on: !store.world.value.plant.feeders[room],
        });
      uses.set(box, toggle);
      uses.set(lever, toggle);
    }
  }
  const update = () => {
    const plant = store?.world.value.plant ?? fallback.plant;
    for (const light of status) {
      const on = serviceAvailable(plant, room, light.utility);
      light.material.color.set(on ? '#1b6738' : '#962a20');
      light.material.emissive.set(on ? '#1b6738' : '#962a20');
    }
  };
  update();
  return { group, uses, update };
}
