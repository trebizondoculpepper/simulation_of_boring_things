import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { layoutRoom } from '../logic/room-equipment';
import { machinePorts, placedPort } from '../logic/machine-ports';
import { cabinetPortsInRoom } from '../logic/cabinet-pipes';
import { createRoomEquipment } from './room-equipment';
import { cabinetServices } from './cabinet-services';

/**
 * What the player sees, checked as the rooms are built: at every port of
 * every machine, a nozzle or stub drawn on the machine, and a drawn pipe,
 * conduit or duct reaching it. This catches what the logic alone cannot:
 * a model whose nozzle is drawn somewhere other than its port, a pipe
 * drawn short of its nozzle, or one floating beside it.
 */

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const PIPED = [
  'air_plant',
  'boiler_house',
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'wet_hall',
];

/** Every mesh under `root`, with its world box. */
function meshes(root: Object3D) {
  root.updateMatrixWorld(true);
  const out: { mesh: Mesh; box: Box3 }[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh)
      out.push({ mesh: o, box: new Box3().setFromObject(o) });
  });
  return out;
}

/** The pipework's groups in a built room: the routed runs, the services, a cabinet's. */
const isPipework = (o: Object3D) =>
  ['pipework', 'cabinet services'].includes(o.name) ||
  /services|ductwork/i.test(o.name);

describe.each(PIPED)('%s, as drawn', (room) => {
  const built = () => {
    const kit = createPanelKit();
    const equipment = createRoomEquipment(kit, room);
    const cabinet = cabinetServices(kit, room, 0);
    if (cabinet) equipment.group.add(cabinet.group);
    return equipment.group;
  };
  const ports = () => {
    const layout = layoutRoom(room)!;
    return [
      ...layout.placed.flatMap((p) =>
        machinePorts(p.item).map((port) => ({
          ...placedPort(p, port.name),
          name: `${p.item.label}: ${port.name}`,
        })),
      ),
      ...cabinetPortsInRoom(room).map((port) => ({
        name: `cabinet: ${port.name}`,
        at: port.at,
        outward: port.outward,
      })),
    ];
  };

  it('draws a pipe, conduit or duct reaching every port, from just outside its nozzle', () => {
    const group = built();
    const pipework = group.children.filter(isPipework);
    expect(pipework.length).toBeGreaterThan(0);
    const drawn = pipework.flatMap(meshes);
    const missing: string[] = [];
    for (const port of ports()) {
      // A point just out along the port: some pipe's mesh must hold it.
      const probe = new Vector3(...port.at).addScaledVector(
        new Vector3(...port.outward),
        0.06,
      );
      if (
        !drawn.some(({ box }) =>
          box.clone().expandByScalar(0.01).containsPoint(probe),
        )
      )
        missing.push(port.name);
    }
    expect(missing).toEqual([]);
  });

  it('declares a port at every connection a machine’s model draws', () => {
    // A model may draw its own connections (a boiler's spigots, named
    // "Flow port" and so on): each must be a declared port, or nothing
    // checks that a pipe reaches it.
    const group = built();
    group.updateMatrixWorld(true);
    const declared = ports();
    const missing: string[] = [];
    group.children
      .filter((o) => !isPipework(o))
      .forEach((machine) =>
        machine.traverse((o) => {
          if (!(o instanceof Mesh) || !/ port$/i.test(o.name)) return;
          // The port is at the connector's end, on its box.
          const box = new Box3().setFromObject(o);
          const centre = box.getCenter(new Vector3());
          if (
            !declared.some(
              (p) => box.distanceToPoint(new Vector3(...p.at)) < 0.01,
            )
          )
            missing.push(
              `${o.name} at ${centre
                .toArray()
                .map((v) => v.toFixed(2))
                .join(', ')}`,
            );
        }),
      );
    expect(missing).toEqual([]);
  });

  it('draws a nozzle or stub on the machine at every port', () => {
    const group = built();
    const machines = group.children
      .filter((o) => !isPipework(o))
      .flatMap(meshes);
    const missing: string[] = [];
    for (const port of ports()) {
      // Just inside the port, back toward its machine: the nozzle's metal.
      const probe = new Vector3(...port.at).addScaledVector(
        new Vector3(...port.outward),
        -0.03,
      );
      if (
        !machines.some(({ box }) =>
          box.clone().expandByScalar(0.01).containsPoint(probe),
        )
      )
        missing.push(port.name);
    }
    expect(missing).toEqual([]);
  });
});
