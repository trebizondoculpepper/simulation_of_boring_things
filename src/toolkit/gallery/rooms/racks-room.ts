import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { devPortals, devWalls } from '../logic/dev-room-links';
import type { Footprint } from '../../controls/logic/walk-collision';
import { METRE } from '../../components/core/logic/units';
import { createPortals } from '../views/portals';
import {
  createPanelKit,
  createSevenSegment,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createNameplate,
  createPilotLamp,
  createPushButton,
  createLeverSelector,
} from '../../components/industrial-control/views/industrial-controls';
import { createVfd } from '../../components/industrial-control/views/panel-instruments';
import {
  DEPTHS,
  createCabinetSuite,
  createRackCabinet,
  createRelayRack,
} from '../../components/industrial-control/views/rack-equipment';
import type {
  RackColour,
  RackUnitOptions,
  RackUnitView,
} from '../../components/industrial-control/views/rack-equipment';
import { createFirstPerson } from '../../controls/input/first-person';
import { isHeldPortableHit } from '../../controls/input/object-handling';
import { createPartSet, rackUnit } from '../../components/core/parts/parts';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  createPs1Material,
  ps1Uniforms,
} from '../../components/core/parts/ps1-material';
import { knobDirection } from '../../controls/input/knob-turning';
import { createEngineerStorageCupboard } from '../../components/site-dressing/views/engineer-storage-cupboard';

/** A unit to fit, and the rack unit its bottom sits at. */
type Fit = [at: number, options: RackUnitOptions];

/**
 * Dev3, Racks: the industrial design of nineteen-inch racks and what goes
 * in them, built to catalogue dimensions (doc/research/rack-dimensions.md).
 * Along the north wall: a bayed suite of three 42U server cabinets, an
 * industrial enclosure on its plinth, a 24U cabinet on castors, an open
 * two-post relay rack, a 12U cabinet and an open-frame rack, each branded
 * and filled with units of every kind. In the middle of the room, loose
 * units on display plinths, each with a nameplate saying what it is.
 * Nothing here works; it is only how the equipment looks.
 */
export function startRacksRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const half = { x: 7, z: 6 };
  const bounds: Footprint = {
    minX: -half.x * m,
    maxX: half.x * m,
    minZ: -half.z * m,
    maxZ: half.z * m,
  };
  const height = 3.6;
  const scene = new Scene();
  const parts = createPartSet();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.35);
  renderer.setClearColor('#262827');
  const camera = new PerspectiveCamera(55, 1, 0.05, 50 * m);
  scene.add(new AmbientLight('#f2f4ff', 0.9));
  const key = new DirectionalLight('#f6f7ff', 1.7);
  key.position.set(3, 7, 6);
  scene.add(key);
  // A computer-room floor of grey tiles, and off-white walls.
  const floorMaterial = createPs1Material({ color: '#8a8c88' });
  const wallMaterial = createPs1Material({ color: '#cfd0c6' });
  const slab = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    wall = false,
  ) => {
    const mesh = new Mesh(
      new BoxGeometry(w, h, d),
      wall ? wallMaterial : floorMaterial,
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };
  slab(2 * half.x * m, 0.1 * m, 2 * half.z * m, 0, -0.05 * m, 0);
  slab(
    2 * half.x * m,
    0.1 * m,
    2 * half.z * m,
    0,
    (height + 0.05) * m,
    0,
    true,
  );
  const walls = devWalls(bounds, m, height * m);
  for (const wall of walls)
    slab(
      wall.maxX - wall.minX,
      wall.top - wall.bottom,
      wall.maxZ - wall.minZ,
      (wall.minX + wall.maxX) / 2,
      (wall.bottom + wall.top) / 2,
      (wall.minZ + wall.maxZ) / 2,
      true,
    );
  const portals = createPortals('dev1', devPortals('dev1', bounds, m), 0, m);
  scene.add(portals.group);

  const kit = createPanelKit();
  const footprints: Footprint[] = [];
  const storageCupboards: ReturnType<typeof createEngineerStorageCupboard>[] =
    [];
  const storageObjects = new Group();
  scene.add(storageObjects);
  /** Stand something built in metres at (x, z) metres, facing +z turned by `yaw`. */
  const stand = (
    object: Object3D,
    x: number,
    z: number,
    depth: number,
    width: number,
    yaw = 0,
  ) => {
    object.scale.setScalar(m);
    object.position.set(x * m, 0, z * m);
    object.rotation.y = yaw;
    scene.add(object);
    footprints.push({
      minX: (x - width / 2 - 0.05) * m,
      maxX: (x + width / 2 + 0.05) * m,
      minZ: (z - depth - 0.05) * m,
      maxZ: (z + 0.1) * m,
    });
  };
  const fill = (
    mount: (unit: RackUnitView, at: number) => void,
    fits: Fit[],
  ) => {
    for (const [at, options] of fits) {
      // Every unit is a part: a click runs it out of its rack and back.
      const unit = parts.add(rackUnit(kit, options));
      dress(kit, unit.view, options);
      mount(unit.view, at);
    }
  };

  // ---- The north wall ----------------------------------------------------
  const backZ = -half.z + 0.25 + 1.07;
  {
    const suite = createCabinetSuite(
      kit,
      [
        { units: 42, depth: 1.07, door: 'perforated' },
        { units: 42, depth: 1.07, door: 'glass', doorOpen: true },
        { units: 42, depth: 1.07, door: 'none' },
      ],
      { brand: 'neumann-dynamik', colour: 'black' },
    );
    const [a, b, c] = suite.cabinets;
    fill((u, at) => a.mount(u, at), standardStack('charcoal'));
    fill((u, at) => b.mount(u, at), serverStack());
    fill((u, at) => c.mount(u, at), networkStack());
    stand(suite.group, -5.0, backZ, 1.07, 1.8);
  }
  {
    const enclosure = createRackCabinet(kit, {
      units: 38,
      depth: 0.8,
      colour: 'putty',
      brand: 'hartwell-bligh',
      door: 'solid',
      doorOpen: true,
      feet: 'plinth',
    });
    fill((u, at) => enclosure.mount(u, at), controlStack());
    stand(enclosure.group, -2.9, backZ - 0.27, 0.8, 0.6);
  }
  {
    const cabinet = createRackCabinet(kit, {
      units: 24,
      depth: 1.07,
      colour: 'beige',
      brand: 'trager-feinstein',
      door: 'glass',
      feet: 'castors',
    });
    fill(
      (u, at) => cabinet.mount(u, at),
      [
        [1, { u: 3, style: 'drives', colour: 'beige', depth: DEPTHS.drives }],
        [
          4,
          { u: 2, style: 'shelf', colour: 'beige', halves: ['putty', 'beige'] },
        ],
        [7, { u: 2, style: 'controls', colour: 'beige', label: 'SCANNER 2' }],
        [9, { u: 1, style: 'vented', colour: 'beige' }],
        [
          10,
          {
            u: 4,
            style: 'handles',
            colour: 'putty',
            label: 'MODEL 8800 RECORDER',
          },
        ],
        [14, { u: 1, style: 'blank', colour: 'beige' }],
        [15, { u: 2, style: 'door', colour: 'beige', label: 'FUSES' }],
        [17, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
        [
          19,
          { u: 3, style: 'display', colour: 'beige', label: 'LINE MONITOR' },
        ],
        [22, { u: 2, style: 'fans', colour: 'beige', depth: DEPTHS.fans }],
      ],
    );
    stand(cabinet.group, -1.6, backZ, 1.07, 0.6);
  }
  {
    const rack = createRelayRack(kit, {
      brand: 'fankel',
      colour: 'black',
    });
    fill(
      (u, at) => rack.mount(u, at),
      [
        [
          2,
          { u: 2, style: 'shelf', colour: 'black', halves: ['grey', 'blue'] },
        ],
        [5, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
        [6, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
        [7, { u: 1, style: 'blank', colour: 'black' }],
        [8, { u: 2, style: 'handles', colour: 'grey', label: 'CHANNEL BANK' }],
        [10, { u: 1, style: 'patch', colour: 'grey', depth: DEPTHS.patch }],
        [14, { u: 3, style: 'controls', colour: 'blue', label: 'TEST SET' }],
        [20, { u: 1, style: 'vented', colour: 'black' }],
        [24, { u: 2, style: 'door', colour: 'grey', label: 'ACCESS' }],
        [30, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
        [31, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
        [40, { u: 2, style: 'fans', colour: 'black', depth: DEPTHS.fans }],
      ],
    );
    stand(rack.group, -0.4, backZ - 0.85, 0.4, 0.55);
  }
  {
    const cabinet = createRackCabinet(kit, {
      units: 12,
      width: 0.6,
      depth: 0.6,
      colour: 'blue',
      brand: 'synclex',
      door: 'perforated',
      doorOpen: true,
      feet: 'castors',
    });
    fill(
      (u, at) => cabinet.mount(u, at),
      [
        [
          1,
          {
            u: 2,
            style: 'drawer',
            colour: 'charcoal',
            depth: DEPTHS.drawer,
            open: true,
          },
        ],
        [3, { u: 1, style: 'vented', colour: 'blue' }],
        [4, { u: 3, style: 'controls', colour: 'grey', label: 'PUMP CONTROL' }],
        [
          7,
          {
            u: 2,
            style: 'display',
            colour: 'charcoal',
            label: 'FLOW TOTALIZER',
          },
        ],
        [9, { u: 1, style: 'blank', colour: 'blue' }],
        [
          10,
          {
            u: 2,
            style: 'handles',
            colour: 'grey',
            label: 'POWER SUPPLY 24 V',
          },
        ],
      ],
    );
    stand(cabinet.group, 0.9, backZ - 0.47, 0.6, 0.6);
  }
  {
    const frame = createRackCabinet(kit, {
      units: 33,
      depth: 0.8,
      colour: 'green',
      brand: 'gorskiy',
      door: 'none',
      sides: { left: false, right: false },
    });
    fill(
      (u, at) => frame.mount(u, at),
      [
        [
          1,
          {
            u: 4,
            style: 'handles',
            colour: 'green',
            label: 'UPS 3000',
            depth: DEPTHS.deep,
          },
        ],
        [5, { u: 2, style: 'blank', colour: 'green' }],
        [
          7,
          {
            u: 3,
            style: 'controls',
            colour: 'olive',
            label: 'PROCESS CONTROLLER',
          },
        ],
        [10, { u: 1, style: 'vented', colour: 'green' }],
        [
          11,
          {
            u: 2,
            style: 'shelf',
            colour: 'green',
            halves: ['olive', 'charcoal'],
          },
        ],
        [14, { u: 2, style: 'door', colour: 'olive', label: 'TERMINALS' }],
        [16, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
        [
          18,
          {
            u: 4,
            style: 'handles',
            colour: 'charcoal',
            label: 'I/O CHASSIS',
            depth: DEPTHS.deep,
          },
        ],
        [22, { u: 2, style: 'display', colour: 'olive', label: 'ANNUNCIATOR' }],
        [24, { u: 1, style: 'blank', colour: 'green' }],
        [31, { u: 2, style: 'fans', colour: 'green', depth: DEPTHS.fans }],
      ],
    );
    stand(frame.group, 2.4, backZ - 0.27, 0.8, 0.6);
  }
  // Two engineer's stores cupboards, modelled from the owner's reference:
  // solid steel and glazed doors, with working parts drawers in both.
  for (const [style, x, label] of [
    ['solid', 3.65, 'PARTS STORES'],
    ['glass', 4.85, 'TEST EQUIPMENT'],
  ] as const) {
    const cupboard = createEngineerStorageCupboard(kit, style, label);
    stand(cupboard.group, x, -5.25, 0.5, 0.96);
    storageObjects.add(cupboard.group);
    storageCupboards.push(cupboard);
  }

  // ---- Loose units on display plinths ------------------------------------
  const plinthPaint = createPs1Material({ color: '#4c504e' });
  kit.materials.push(plinthPaint);
  const plinth = (
    x: number,
    z: number,
    title: string,
    units: [number, RackUnitOptions][],
  ) => {
    const group = new Group();
    const h = 0.85;
    const block = new Mesh(new BoxGeometry(0.62, h, 0.8), plinthPaint);
    block.position.set(0, h / 2, -0.35);
    group.add(block);
    let y = h;
    for (const [lift, options] of units) {
      const unit = parts.add(rackUnit(kit, options));
      dress(kit, unit.view, options);
      // Loose, a unit stands back from the plinth's front edge.
      unit.object.position.set(0, y + lift, 0.02);
      group.add(unit.object);
      y += options.u * 0.04445 + lift;
    }
    const plate = createNameplate(kit, title, { width: 0.36, height: 0.06 });
    plate.position.set(0, h * 0.62, 0.051);
    group.add(plate);
    stand(group, x, z, 0.8, 0.62);
  };
  const row1 = 1.2;
  const row2 = 3.6;
  plinth(-4.5, row1, '1U BLANKING PLATE\n1/8 IN ALUMINIUM', [
    [0, { u: 1, style: 'blank', colour: 'grey' }],
  ]);
  plinth(-3.0, row1, '2U VENTED PANEL', [
    [0, { u: 2, style: 'vented', colour: 'charcoal' }],
  ]);
  plinth(-1.5, row1, '2U UTILITY DRAWER\n14.5 IN DEEP', [
    [
      0,
      {
        u: 2,
        style: 'drawer',
        colour: 'black',
        depth: DEPTHS.drawer,
        open: true,
      },
    ],
  ]);
  plinth(0, row1, '3U CHASSIS, HANDLES\n15 IN DEEP', [
    [0, { u: 3, style: 'handles', colour: 'putty', label: 'MODEL 2400' }],
  ]);
  plinth(1.5, row1, '1U FAN TRAY', [
    [0, { u: 1, style: 'fans', colour: 'black', depth: DEPTHS.fans }],
  ]);
  plinth(3.0, row1, '1U PATCH PANEL', [
    [0, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
  ]);
  plinth(4.5, row1, '2U CANTILEVER SHELF\nHALF-RACK UNITS', [
    [0, { u: 2, style: 'shelf', colour: 'grey', halves: ['beige', 'navy'] }],
  ]);
  plinth(-3.75, row2, '4U SERVER CHASSIS\n26 IN DEEP', [
    [
      0,
      {
        u: 4,
        style: 'handles',
        colour: 'black',
        label: 'DATAFRAME 4000',
        depth: DEPTHS.deep,
      },
    ],
  ]);
  plinth(-2.25, row2, '3U DRIVE ARRAY\n20 IN DEEP', [
    [0, { u: 3, style: 'drives', colour: 'putty', depth: DEPTHS.drives }],
  ]);
  plinth(-0.75, row2, '2U ACCESS DOOR', [
    [0, { u: 2, style: 'door', colour: 'red', label: 'ACCESS', open: true }],
  ]);
  plinth(0.75, row2, '3U CONTROL PANEL', [
    [0, { u: 3, style: 'controls', colour: 'grey', label: 'CONVEYOR 4' }],
  ]);
  plinth(2.25, row2, '2U DISPLAY UNIT', [
    [0, { u: 2, style: 'display', colour: 'navy', label: 'RATE INDICATOR' }],
  ]);
  plinth(3.75, row2, 'A STACK, AS SHIPPED', [
    [0, { u: 2, style: 'handles', colour: 'olive', label: 'MODEL 300' }],
    [0.004, { u: 1, style: 'vented', colour: 'grey' }],
    [0.004, { u: 2, style: 'handles', colour: 'white', label: 'MODEL 120' }],
  ]);

  // Walking and looking; the units take a click.
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    racks: { x: -1 * m, z: 0.4 * m, yaw: 0, pitch: 0.05 },
    plinths: { x: 0, z: -1.6 * m, yaw: Math.PI, pitch: -0.25 },
  };
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    objects: storageObjects,
    allowPickup(object) {
      for (const cupboard of storageCupboards) {
        const allowed = cupboard.canRemove(object);
        if (allowed !== null) return allowed;
      }
      return true;
    },
    heldAction(object, _portable, x, y) {
      raycaster.setFromCamera(pointer.set(x, y), camera);
      const hit = raycaster
        .intersectObjects(scene.children, true)
        .find((candidate) => !isHeldPortableHit(candidate.object));
      if (!hit || hit.distance > 3.2 * m) return false;
      return storageCupboards.some((cupboard) =>
        cupboard.returnItem(object, hit.object),
      );
    },
    metre: m,
    floorY: 0,
    start: views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ?? { x: 0, z: 5 * m, yaw: 0 },
    solids: () => [...walls, ...footprints],
    // A click on a portal travels, as walking into it does; on a unit,
    // runs it out of its rack or back.
    use: (x, y) => {
      raycaster.setFromCamera(pointer.set(x, y), camera);
      const hit = raycaster.intersectObjects(scene.children, true)[0];
      if (!hit || hit.distance > 3.2 * m) return;
      if (portals.uses.has(hit.object as Mesh)) {
        portals.uses.get(hit.object as Mesh)?.();
        return;
      }
      for (let o: Object3D | null = hit.object; o; o = o.parent) {
        const work = parts.uses.get(o);
        // A knob turns down or up by which half of it is clicked.
        if (work) return work(knobDirection(o, hit.point, camera));
        for (const cupboard of storageCupboards) {
          const operate = cupboard.uses.get(o);
          if (operate) return operate();
        }
      }
    },
  });
  const notes = document.createElement('div');
  notes.textContent =
    'DEV1 · Racks and engineer stores: click cupboard doors and parts drawers';
  Object.assign(notes.style, {
    position: 'absolute',
    top: '12px',
    left: '12px',
    maxWidth: 'calc(100% - 24px)',
    padding: '10px',
    background: '#20302bdd',
    color: '#e8e2cc',
    font: '13px monospace',
  });
  canvas.parentElement?.append(notes);
  const resize = () => {
    const { width, height: tall } = canvas.getBoundingClientRect();
    if (!width || !tall) return;
    const scale = 1;
    const w = Math.round(width * scale);
    const h = Math.round(tall * scale);
    renderer.setSize(w, h, false);
    ps1Uniforms.resolution.value.set(w, h);
    camera.aspect = width / tall;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  (window as unknown as { devRacks: unknown }).devRacks = {
    /** Stand with the eye at (x, y, z), looking at (tx, ty, tz), in metres. */
    view(x: number, y: number, z: number, tx: number, ty: number, tz: number) {
      const dx = tx - x;
      const dz = tz - z;
      walk.place(
        x * m,
        z * m,
        Math.atan2(dx, -dz),
        Math.atan2(ty - y, Math.hypot(dx, dz)),
        y * m,
      );
    },
  };

  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    parts.update(delta);
    for (const cupboard of storageCupboards) cupboard.update(delta);
    portals.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    partAudio.listen(camera, m, scene);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    for (const cupboard of storageCupboards) cupboard.dispose();
    notes.remove();
    disposeKit(kit, scene as unknown as Group);
    scene.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    wallMaterial.dispose();
    floorMaterial.dispose();
    freeEnvironment();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) {
        walk.place(view.x, view.z, view.yaw, view.pitch);
        return;
      }
      const pose = portals.arrival(previous);
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
  });
}

/**
 * Fit a unit's face with parts, by its style and label: real 30 mm
 * pilot devices on a control panel, a vacuum fluorescent readout or LED
 * digits on a display unit. They are dressing; nothing is wired.
 */
function dress(kit: PanelKit, unit: RackUnitView, options: RackUnitOptions) {
  const h = options.u * 0.04445;
  if (options.style === 'controls') {
    const row = new Group();
    row.position.y = -0.006;
    unit.face.add(row);
    const scale = Math.min(0.9, (h - 0.02) / 0.05);
    const parts: Object3D[] = [
      createPilotLamp(kit, 'green').group,
      createPilotLamp(kit, 'red').group,
      createPushButton(kit, 'green').group,
      createPushButton(kit, 'red', { head: 'extended' }).group,
      createLeverSelector(kit, 3).group,
    ];
    parts.forEach((part, i) => {
      part.scale.setScalar(scale);
      part.position.x = (i - (parts.length - 1) / 2) * 0.06;
      row.add(part);
    });
    const lamp = parts[0] as Group;
    void lamp;
  } else if (options.style === 'display') {
    if (options.u >= 3) {
      const vfd = createVfd(kit, { columns: 12, height: 0.016 });
      vfd.show([options.label?.slice(0, 12) ?? 'READY'], true);
      vfd.group.position.set(-0.04, -0.004, 0);
      unit.face.add(vfd.group);
    } else {
      const digits = createSevenSegment(kit, 5, {
        digitHeight: Math.min(0.02, h * 0.4),
      });
      digits.show('1250.');
      digits.group.position.set(-0.04, -0.004, 0);
      unit.face.add(digits.group);
    }
    const name = createNameplate(kit, options.label ?? 'DISPLAY', {
      width: 0.1,
      height: 0.02,
    });
    name.position.set(0.13, -0.004, 0);
    unit.face.add(name);
  }
}

/** A cabinet of mixed instruments, mostly in one colour. */
function standardStack(colour: RackColour): Fit[] {
  return [
    [
      1,
      {
        u: 4,
        style: 'handles',
        colour,
        label: 'POWER DIST 208 V',
        depth: DEPTHS.deep,
      },
    ],
    [5, { u: 1, style: 'blank', colour }],
    [6, { u: 2, style: 'drawer', colour: 'black', depth: DEPTHS.drawer }],
    [8, { u: 3, style: 'drives', colour: 'grey', depth: DEPTHS.drives }],
    [11, { u: 1, style: 'vented', colour }],
    [12, { u: 2, style: 'handles', colour: 'grey', label: 'MODEL 7720' }],
    [14, { u: 2, style: 'handles', colour: 'grey', label: 'MODEL 7720' }],
    [16, { u: 1, style: 'blank', colour }],
    [
      17,
      { u: 3, style: 'display', colour: 'charcoal', label: 'SYSTEM STATUS' },
    ],
    [20, { u: 2, style: 'shelf', colour, halves: ['putty', 'grey'] }],
    [24, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
    [25, { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch }],
    [30, { u: 2, style: 'door', colour, label: 'KEYS' }],
    [40, { u: 2, style: 'fans', colour, depth: DEPTHS.fans }],
  ];
}

/** A cabinet of deep, handled server chassis. */
function serverStack(): Fit[] {
  const fits: Fit[] = [];
  let at = 2;
  const names = ['DATAFRAME 4000', 'DATAFRAME 2000', 'DATAFRAME 2000'];
  for (let i = 0; at < 34; i++) {
    const u = i % 3 === 0 ? 4 : 2;
    fits.push([
      at,
      {
        u,
        style: 'handles',
        colour: i % 4 === 3 ? 'grey' : 'black',
        label: names[i % 3],
        depth: DEPTHS.deep,
      },
    ]);
    at += u;
    if (i % 3 === 2) {
      fits.push([at, { u: 1, style: 'vented', colour: 'black' }]);
      at += 1;
    }
  }
  fits.push([38, { u: 1, style: 'blank', colour: 'black' }]);
  return fits;
}

/** A cabinet of patching, with gaps. */
function networkStack(): Fit[] {
  const fits: Fit[] = [];
  for (let at = 20; at < 40; at += 2)
    fits.push([
      at,
      { u: 1, style: 'patch', colour: 'black', depth: DEPTHS.patch },
    ]);
  fits.push([
    4,
    {
      u: 3,
      style: 'handles',
      colour: 'navy',
      label: 'MULTIPLEXER',
      depth: DEPTHS.instrument,
    },
  ]);
  fits.push([
    8,
    { u: 2, style: 'shelf', colour: 'black', halves: ['navy', 'grey'] },
  ]);
  fits.push([12, { u: 1, style: 'fans', colour: 'black', depth: DEPTHS.fans }]);
  return fits;
}

/** An industrial enclosure of controls and terminals. */
function controlStack(): Fit[] {
  return [
    [
      1,
      {
        u: 4,
        style: 'handles',
        colour: 'grey',
        label: 'POWER SUPPLY 24 V DC',
        depth: DEPTHS.instrument,
      },
    ],
    [6, { u: 3, style: 'controls', colour: 'grey', label: 'MOTOR SEQUENCER' }],
    [
      9,
      { u: 2, style: 'door', colour: 'putty', label: 'TERMINALS', open: true },
    ],
    [
      12,
      { u: 3, style: 'display', colour: 'charcoal', label: 'PROCESS VALUE' },
    ],
    [15, { u: 1, style: 'vented', colour: 'putty' }],
    [
      16,
      {
        u: 4,
        style: 'handles',
        colour: 'charcoal',
        label: 'I/O CHASSIS',
        depth: DEPTHS.instrument,
      },
    ],
    [21, { u: 2, style: 'display', colour: 'grey', label: 'TEMPERATURE' }],
    [23, { u: 1, style: 'blank', colour: 'putty' }],
    [24, { u: 3, style: 'controls', colour: 'putty', label: 'LINE 2 CONTROL' }],
    [28, { u: 2, style: 'drawer', colour: 'grey', depth: DEPTHS.drawer }],
    [34, { u: 2, style: 'fans', colour: 'putty', depth: DEPTHS.fans }],
  ];
}
