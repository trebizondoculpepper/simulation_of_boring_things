import {
  BoxGeometry,
  CatmullRomCurve3,
  Group,
  Mesh,
  TubeGeometry,
  Vector3,
} from 'three';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createWorkstationPowerBox } from '../../architectural/views/workstation-power-box';
import { createOfficeChair } from '../../site-dressing/views/office-chair';
import { createBbcMicro } from './bbc-micro';
import { createCubMonitor } from './cub-monitor';
import { createBbcDiskDrive } from './bbc-disk-drive';

/** Original VX3 bench proportions and hardware placement, normalized to metres. */
export function createBbcWorkstation(
  kit: PanelKit,
  importedConnectors = false,
) {
  const group = new Group();
  group.name = 'BBC Micro workstation';
  const originalMetre = 4.35 / 0.4826;
  const box = (
    w: number,
    h: number,
    d: number,
    colour: string,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), kitPaint(kit, colour));
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  const width = (2.85 * 3.7) / originalMetre;
  const depth = (1.4 * 4.5) / originalMetre;
  const top = (1.3775 * 5.7) / originalMetre;
  box(
    (2.8 * 3.7) / originalMetre,
    (0.18 * 5.7) / originalMetre,
    (1.35 * 4.5) / originalMetre,
    '#896e50',
    0,
    (1.24 * 5.7) / originalMetre,
    0,
  );
  box(
    width,
    (0.035 * 5.7) / originalMetre,
    depth,
    '#c3a477',
    0,
    (1.36 * 5.7) / originalMetre,
    0,
  );
  for (const x of [-1.25, 1.25])
    for (const z of [-0.5, 0.5])
      box(
        (0.13 * 3.7) / originalMetre,
        (1.2 * 5.7) / originalMetre,
        (0.13 * 4.5) / originalMetre,
        '#3c453e',
        (x * 3.7) / originalMetre,
        (0.61 * 5.7) / originalMetre,
        (z * 4.5) / originalMetre,
      );
  const bbc = createBbcMicro(1);
  bbc.group.position.set(
    (0.42 * 3.7) / originalMetre,
    top,
    1.15 / originalMetre,
  );
  const cub = createCubMonitor(1);
  cub.group.position
    .copy(bbc.group.position)
    .add(new Vector3(0, bbc.monitorHeight, -0.23));
  const disk = createBbcDiskDrive(1);
  disk.group.position
    .copy(bbc.group.position)
    .add(new Vector3(-0.31, 0, -0.04));
  const chair = createOfficeChair(1);
  chair.group.position.set(
    bbc.group.position.x,
    0,
    (0.7 * 4.5) / originalMetre + 0.42,
  );
  chair.group.rotation.y = 0.12;
  group.add(bbc.group, cub.group, disk.group, chair.group);
  const cable = new Mesh(
    new TubeGeometry(
      new CatmullRomCurve3([
        new Vector3(-0.31, 0.025, -0.185),
        new Vector3(-0.31, 0.025, -0.215),
        new Vector3(-0.16, 0.025, -0.215),
        new Vector3(-0.08, 0.042, -0.174),
      ]),
      20,
      0.0035,
      6,
      false,
    ),
    kitPaint(kit, '#333830'),
  );
  cable.position.copy(bbc.group.position);
  group.add(cable);
  const lead = (name: string, points: Vector3[], radius = 0.0035) => {
    const wire = new Mesh(
      new TubeGeometry(new CatmullRomCurve3(points), 24, radius, 6, false),
      kitPaint(kit, '#242622'),
    );
    wire.name = name;
    group.add(wire);
  };
  const bx = bbc.group.position.x;
  const connector = (name: string, point: Vector3) => {
    const at = point.clone().add(bbc.group.position);
    const plug = new Mesh(
      new BoxGeometry(0.016, 0.014, 0.024),
      kitPaint(kit, '#242622'),
    );
    plug.name = name;
    plug.position.copy(at).add(new Vector3(0, 0, -0.008));
    group.add(plug);
    return at.add(new Vector3(0, 0, -0.02));
  };
  const mainsBbc = connector(
    'BBC rear mains connector',
    importedConnectors
      ? new Vector3(-0.184, 0.018, -0.174)
      : new Vector3(-0.185, 0.045, -0.174),
  );
  const mainsCub = connector(
    'Cub rear mains connector',
    importedConnectors
      ? new Vector3(0.11, 0.089, -0.381)
      : new Vector3(0.11, 0.2, -0.411),
  );
  const rgbCub = connector(
    'Cub rear RGB connector',
    importedConnectors
      ? new Vector3(0.118, 0.163, -0.398)
      : new Vector3(-0.04, 0.23, -0.411),
  );
  const rgbBbc = connector(
    'BBC rear RGB connector',
    importedConnectors
      ? new Vector3(0.148, 0.018, -0.184)
      : new Vector3(0.03, 0.045, -0.174),
  );
  // Clear the actual rear edge before descending: curves must not disappear
  // inside the desktop. Imported connectors have different measured positions.
  for (const [name, start, x] of [
    ['BBC mains flex to floor power box', mainsBbc, bx - 0.056],
    ['Cub monitor mains flex', mainsCub, bx + 0.016],
  ] as const) {
    lead(name, [
      start,
      new Vector3(start.x, start.y, -0.44),
      new Vector3(start.x, top - 0.06, -0.51),
      new Vector3(x, 0.16, -0.52),
      new Vector3(x, 0.071, -0.432),
    ]);
  }
  lead(
    'Cub RGB signal cable to BBC RGB socket',
    [
      rgbCub,
      new Vector3(rgbCub.x, rgbCub.y, -0.46),
      new Vector3(rgbBbc.x + 0.04, rgbBbc.y, -0.46),
      rgbBbc,
    ],
    0.0035,
  );
  const dataSocket = new Group();
  dataSocket.name = 'BBC rear RS423 data socket';
  dataSocket.position
    .copy(bbc.group.position)
    .add(
      importedConnectors
        ? new Vector3(0.081, 0.018, -0.17)
        : new Vector3(-0.025, 0.045, -0.174),
    );
  dataSocket.rotation.y = Math.PI;
  group.add(dataSocket);
  const powerBox = createWorkstationPowerBox(kit);
  powerBox.position.set(bx - 0.02, 0, -0.46);
  group.add(powerBox);
  return { group, bbc, cub, disk, chair, dataSocket, width, depth, top };
}
