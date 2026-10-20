import {
  AmbientLight,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  CanvasTexture,
  MeshBasicMaterial,
  SRGBColorSpace,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { ARCHITECTURAL_FITTINGS } from '../../components/architectural/logic/architectural-fittings';
import type { ArchitecturalKind } from '../../components/architectural/logic/architectural-fittings';
import { createArchitecturalServices } from '../../components/architectural/logic/warehouse-services';
import {
  HVAC_MODES,
  ZONES,
  createBuildingServices,
} from '../../components/architectural/logic/building-services';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createCaption,
  createSectionBoard,
} from '../../components/core/views/signage';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPortals } from '../views/portals';
import { architecturalPart } from '../../components/architectural/parts/architectural-parts';
import {
  acCassette,
  acController,
  dimmer,
  distributionBoard,
  extractorFan,
  floorBox,
  fusedSpur,
  intercom,
  lightSwitch,
  closerDoor,
  occupancySensor,
  pullCordSwitch,
  risingButtDoor,
  radiator,
  thermostat,
  twinSocket,
  windowWithVent,
} from '../../components/architectural/parts/building-parts';
import {
  overDoorLight,
  toiletAlarmCord,
  toiletAlarmReset,
} from '../../components/general-safety/parts/safety-parts';
import {
  FIRE_KINDS,
  SHARED_KINDS,
  fittingCaption,
  showSpecimens,
} from './catalogue-specimens';
import type { SpecimenPlace } from './catalogue-specimens';
import { createFirstPerson } from '../../controls/input/first-person';
import {
  BS5266,
  checkEmergencyLighting,
  illuminance,
} from '../../components/general-safety/logic/emergency-lighting';
import { SUPPLY_CONDITIONS } from '../../components/architectural/logic/supply-quality';
import type { SupplyCondition } from '../../components/architectural/logic/supply-quality';
import {
  GALLERY_CEILING,
  GALLERY_EMERGENCY,
  GALLERY_EMPHASIS,
  GALLERY_DETECTORS,
  GALLERY_FLOOR,
  GALLERY_LUMINAIRES,
  GALLERY_SWITCH_BANKS,
} from '../logic/fittings-gallery-lighting';
import { pushButton, selector } from '../../components/core/parts/parts';
import { detects } from '../../components/architectural/logic/presence-detector';
import { createPartSet } from '../../components/core/parts/parts';
import type { Part } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';

const FLOOR = GALLERY_FLOOR;
const CEILING = GALLERY_CEILING;
/** A luminaire's and an emergency light's intensity as drawn, candela. */
const LUMINAIRE_CANDELA = 10;
const EMERGENCY_CANDELA = 10;
/** The full-size doors, along the north wall, and where. */
const DOORS: { kind: ArchitecturalKind; x: number }[] = [
  { kind: 'escapedoor', x: -7.5 },
  { kind: 'loadingdoor', x: 0 },
  { kind: 'utilitydoor', x: 7.5 },
];
const WALL = 0.15;
/**
 * The catalogue specimens' places: two rows at eye level along the south
 * wall, left to right as seen, then a row above them, and a tall fitting
 * either side of the doors.
 */
const PLACES: SpecimenPlace[] = [
  { x: -10.5, z: FLOOR.minZ, facing: 0, y: 1.5, tall: true },
  ...[2.3, 1.15, 3.45].flatMap((y) =>
    [9, 6, 3, 0, -3, -6, -9].map((x) => ({
      x,
      z: FLOOR.maxZ,
      facing: Math.PI,
      y,
    })),
  ),
  { x: 10.5, z: FLOOR.minZ, facing: 0, y: 1.5, tall: true },
];
/**
 * Building fittings: the catalogue less its doors and dev2's active fire
 * safety, but with the emergency light and exit sign, which are lighting.
 */
const SPECIMENS = (
  Object.keys(ARCHITECTURAL_FITTINGS) as ArchitecturalKind[]
).filter(
  (kind) =>
    !DOORS.some((door) => door.kind === kind) &&
    (!FIRE_KINDS.includes(kind) || SHARED_KINDS.includes(kind)),
);
/** Ceiling fittings hang from a lowered raft at a room's usual height. */
const RAFT = 2.9;
const FACE = WALL + 0.004;
type Wall = 'east' | 'west';

/**
 * Dev18, Architectural Fittings: a plain box of a development room (not
 * the warehouse) showing every architectural fitting in the catalogue
 * (`src/toolkit/components/architectural/logic/architectural-fittings.ts`) at true size: the escape,
 * loading and utility doors full size along the north wall, and every
 * other fitting on a numbered board round the other walls at eye level,
 * labelled with its name and the product it copies. Each is the same
 * working part the warehouse installs (`architecturalPart`), on one shared
 * building-services model, so they work here too.
 */
export function startArchitecturalGalleryRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.4);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  // The room has no windows: what light there is is its own, and the
  // light bounced about the room is in proportion to it.
  const environment = scene.environmentIntensity;
  const ambient = new AmbientLight('#e8e6e0', 0.75);
  const sky = new HemisphereLight('#f2f1ec', '#3a3a36', 0.8);
  scene.add(ambient, sky);
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);

  // ---- The room -------------------------------------------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#5d5f5c'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e6e4de'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const bounds: Footprint = {
    minX: FLOOR.minX * m,
    maxX: FLOOR.maxX * m,
    minZ: FLOOR.minZ * m,
    maxZ: FLOOR.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
  const wallPaint = kitPaint(kit, '#efede8');
  for (const piece of outer) {
    const mesh = new Mesh(
      new BoxGeometry(
        piece.maxX - piece.minX,
        piece.top - piece.bottom,
        piece.maxZ - piece.minZ,
      ),
      wallPaint,
    );
    mesh.position.set(
      (piece.minX + piece.maxX) / 2,
      (piece.bottom + piece.top) / 2,
      (piece.minZ + piece.maxZ) / 2,
    );
    scene.add(mesh);
  }
  const sign = createSectionBoard(kit, 'BUILDING FITTINGS', 4.4);
  sign.position.set(0, 3.0, FLOOR.minZ + 0.154);
  room.add(sign);

  // ---- The catalogue's fittings --------------------------------------------
  // One building-services model for the catalogue's fittings and the
  // office's working ones, so they share one supply and one lighting
  // circuit.
  const model = createBuildingServices();
  const services = createArchitecturalServices(model);
  const parts = createPartSet();
  // The doors, full size, standing in the north wall.
  const north = new Group();
  north.position.set(0, 0, FLOOR.minZ + WALL);
  room.add(north);
  for (const { kind, x } of DOORS) {
    const part = parts.add(architecturalPart(kit, kind, services));
    part.object.position.set(x, 0, 0.04);
    north.add(part.object);
    fittingCaption(
      kit,
      north,
      kind,
      x,
      kind === 'loadingdoor' ? 5.6 : 3.1,
      kind === 'loadingdoor' ? 4 : 1.8,
    );
  }
  const numbered = showSpecimens(kit, room, parts, services, SPECIMENS, PLACES);

  // ---- The office building's services (from dev2) ---------------------------
  // The working fittings of a present-day English office, bound to their
  // building-services model: lighting, the accessible WC and an intercom
  // on the east wall; power and climate on the west. (The door released
  // in a fire stays in dev2, with the fire system.)
  const L = model.lighting;
  const P = model.power;
  const C = model.climate;
  const S = model.sockets;
  const onWall = (object: Object3D, wall: Wall, along: number, y: number) => {
    const east = wall === 'east';
    object.position.set(east ? FLOOR.maxX - FACE : FLOOR.minX + FACE, y, along);
    object.rotation.y = east ? -Math.PI / 2 : Math.PI / 2;
    room.add(object);
    return object;
  };
  const fit = <T extends Part>(
    part: T,
    wall: Wall,
    along: number,
    y: number,
    text?: string,
    below = 0.1,
  ): T => {
    onWall(part.object, wall, along, y);
    parts.add(part);
    if (text) onWall(createCaption(kit, text), wall, along, y - below);
    return part;
  };
  const raftPaint = kitPaint(kit, '#ecebe5');
  const onRaft = <T extends Part>(part: T, x: number, z: number): T => {
    const raft = new Mesh(new BoxGeometry(1, 0.04, 1), raftPaint);
    raft.position.set(x, RAFT + 0.02, z);
    room.add(raft);
    part.object.position.set(x, RAFT, z);
    room.add(part.object);
    return parts.add(part);
  };
  const board = (title: string, wall: Wall, along: number, width: number) =>
    onWall(createSectionBoard(kit, title, width), wall, along, 2.45);

  // East wall: lighting, the accessible WC, the intercom.
  board('LIGHTING', 'east', -7.2, 2.6);
  fit(
    lightSwitch(kit, {
      name: 'light switch by the door',
      gangs: [L.switchDoor],
    }),
    'east',
    -8.1,
    1.2,
    'LIGHTS, TWO-WAY',
  );
  fit(dimmer(kit, { bound: L.dimmer }), 'east', -7.2, 1.2, 'DIMMER');
  fit(
    lightSwitch(kit, {
      name: 'light switch at the far end',
      gangs: [L.switchFar],
    }),
    'east',
    -6.3,
    1.2,
    'LIGHTS, OTHER END',
  );
  onRaft(occupancySensor(kit, { occupied: L.occupied }), 9.8, -7.2);
  board('ACCESSIBLE WC', 'east', -1.2, 3.6);
  fit(
    extractorFan(kit, { running: model.fan.running }),
    'east',
    -2.6,
    2.15,
    'EXTRACTOR, RUN-ON',
  );
  fit(
    toiletAlarmReset(kit, {
      on: model.welfare.wcAlarmOn,
      reset: model.welfare.resetWcAlarm,
    }),
    'east',
    -1.0,
    1.0,
    'ALARM RESET',
  );
  fit(
    overDoorLight(kit, { on: model.welfare.wcAlarmOn }),
    'east',
    0.3,
    2.2,
    'OVER-DOOR LIGHT',
  );
  onRaft(pullCordSwitch(kit, { bound: L.wcCord }), 10.6, -2.6);
  onRaft(toiletAlarmCord(kit, { pull: model.welfare.pullWcAlarm }), 10.6, -0.4);
  fit(intercom(kit), 'east', 4.6, 1.4, 'INTERCOM');

  // West wall: power and climate.
  board('POWER', 'west', 6.4, 2.7);
  fit(
    distributionBoard(kit, {
      main: P.main,
      circuits: [
        ['LIGHTS', P.lightingBreaker],
        ['SOCKETS', P.socketsBreaker],
        ['HVAC', P.hvacBreaker],
      ],
    }),
    'west',
    7.6,
    1.7,
    'DISTRIBUTION BOARD',
    0.22,
  );
  fit(
    twinSocket(kit, {
      left: S.socketLeft,
      right: S.socketRight,
      live: S.socketsLive,
    }),
    'west',
    6.2,
    0.45,
    'TWIN SOCKET, TESTERS IN',
  );
  fit(
    fusedSpur(kit, { bound: S.spur, live: S.spurLive }),
    'west',
    5.4,
    0.45,
    'FUSED SPUR',
  );
  const box = floorBox(kit);
  box.object.position.set(FLOOR.minX + 1.5, 0, 6.6);
  room.add(box.object);
  parts.add(box);
  board('CLIMATE', 'west', -1.4, 3.4);
  fit(
    acController(kit, {
      power: C.acPower,
      mode: C.acMode,
      setpoint: C.acSetpoint,
      modes: HVAC_MODES,
      temperature: C.temperature,
      running: C.acRunning,
    }),
    'west',
    3.0,
    1.5,
    'AIR CONDITIONING',
  );
  onRaft(acCassette(kit, { running: C.acRunning }), FLOOR.minX + 1.5, 2.4);
  fit(
    thermostat(kit, { bound: C.thermostat, calling: C.calling }),
    'west',
    2.0,
    1.5,
    'THERMOSTAT',
  );
  fit(radiator(kit, { valve: C.valve, heat: C.radiatorHot }), 'west', 0, 0);
  onWall(createCaption(kit, 'RADIATOR AND VALVE'), 'west', 0, 0.9);
  fit(
    windowWithVent(kit, { vent: C.vent, blinds: C.blindsOpen }),
    'west',
    -3.6,
    0.9,
  );
  onWall(createCaption(kit, 'WINDOW VENT AND BLINDS'), 'west', -3.6, 0.8);

  // ---- The room's lighting --------------------------------------------------
  // Lit as a large space is: three zones, a column of battens each (1 west,
  // 2 middle, 3 east), each a circuit of its own on the board, switched
  // two-way from a bank by each exit and by a presence detector over it;
  // emergency downlights and a bulkhead over each way out, fed from their
  // zone's circuit; an exit sign over the escape door. Every fitting is the
  // catalogue's own part (`architecturalPart`), as the warehouse installs
  // it. The layout is a plan (`fittings-gallery-lighting.ts`), checked
  // against BS 5266-1 by its test.
  const zoneOf = (x: number) => (x < -4 ? 1 : x > 4 ? 3 : 2);
  const install = (
    kind: ArchitecturalKind,
    x: number,
    y: number,
    z: number,
    options: Parameters<typeof architecturalPart>[3] = {},
  ) => {
    const part = parts.add(architecturalPart(kit, kind, services, options));
    part.object.position.set(x, y, z);
    room.add(part.object);
    return part;
  };
  const rodPaint = kitPaint(kit, '#9aa1a0', 0.4);
  const lamps = GALLERY_LUMINAIRES.map(({ x, y, z }) => {
    const part = install('luminaire', x, y, z, {
      zone: zoneOf(x),
      light: { candela: LUMINAIRE_CANDELA, range: 18, metre: m },
    }) as ReturnType<typeof architecturalPart> & {
      output: () => number;
      age: (tube: number, age: number) => void;
    };
    for (const end of [-0.6, 0.6]) {
      const rod = new Mesh(new BoxGeometry(0.01, CEILING - y, 0.01), rodPaint);
      rod.position.set(x + end, (CEILING + y) / 2, z);
      room.add(rod);
    }
    return part;
  });
  for (const f of GALLERY_EMERGENCY) {
    if (f.kind === 'downlight') {
      install('emergency', f.x, CEILING, f.z, {
        zone: zoneOf(f.x),
        beam: { candela: EMERGENCY_CANDELA, angle: 1.2, range: 14, metre: m },
      });
      continue;
    }
    const north = f.wall === 'north';
    const part = install(
      'bulkhead',
      f.x,
      f.height,
      north ? FLOOR.minZ + WALL : FLOOR.maxZ - WALL,
      {
        zone: zoneOf(f.x),
        beam: { candela: EMERGENCY_CANDELA, angle: 1.1, range: 9, metre: m },
      },
    );
    part.object.rotation.y = north ? 0 : Math.PI;
  }
  install('exit', -7.5, 2.4, FLOOR.minZ + WALL + 0.01);
  // A switch bank beside each exit door, on its latch side.
  GALLERY_SWITCH_BANKS.forEach(({ x }, index) => {
    install('gridswitch', x, 1.2, FLOOR.minZ + WALL, { index });
    const caption = createCaption(kit, 'ZONE 1 WEST · 2 MIDDLE · 3 EAST');
    caption.position.set(x, 1.04, FLOOR.minZ + WALL + 0.004);
    room.add(caption);
  });
  for (const d of GALLERY_DETECTORS)
    install('presence', d.x, CEILING, d.z, { zone: zoneOf(d.x) });
  // In this room the detectors are set to a minute, to see them work.
  L.detectorTimeout.set(60);
  // The supply, as a machine on it would pull it about, and a fault on
  // each zone's circuit: test controls on a plate by the board.
  const testPlate = new Mesh(
    new BoxGeometry(0.5, 0.26, 0.02),
    kitPaint(kit, '#c9ccc8', 0.5),
  );
  onWall(testPlate, 'west', 9.1, 1.45);
  fit(
    selector(kit, {
      name: 'supply test selector',
      legend: 'SUPPLY',
      positions: 3,
      bound: P.supplyCondition,
    }),
    'west',
    9.27,
    1.47,
  );
  onWall(createCaption(kit, 'NORMAL · BROWNOUT · SEVERE'), 'west', 9.27, 1.36);
  for (const n of ZONES)
    fit(
      pushButton(kit, {
        name: `zone ${n} fault push button`,
        legend: `ZONE ${n} FAULT`,
        colour: 'red',
        head: 'flush',
        action: () => P.tripZone(n),
      }),
      'west',
      9.17 - n * 0.075,
      1.47,
    );
  onWall(createCaption(kit, 'SUPPLY TEST'), 'west', 9.1, 1.62);

  // A development overlay: the emergency lighting's lux on the floor, red
  // under 0.5 (BS 5266's open area), amber under 1 (an escape route),
  // green above.
  const luxMap = createLuxMap();
  luxMap.visible = false;
  room.add(luxMap);

  // ---- Self-closing doors ----------------------------------------------------
  // Two single-action doors in freestanding frames in the middle of the
  // room, side by side, the way each closes itself on show (their hinge
  // side, and the closer, towards the room's middle): on an overhead door
  // closer, and on rising butts. Each is held open while someone stands
  // in its doorway.
  const SELF_CLOSING = [
    {
      x: -1.6,
      part: closerDoor(kit, { name: 'door on an overhead closer' }),
      title: 'OVERHEAD DOOR CLOSER',
      how: 'After the Dorma TS 83: a spring in an oil-filled body, its arm to the frame. It sweeps shut, then slows to latch.',
    },
    {
      x: 1.6,
      part: risingButtDoor(kit, { name: 'door on rising butts' }),
      title: 'RISING BUTT HINGES',
      how: 'Helical knuckles lift the door as it opens; its own weight brings it down and shut. No spring.',
    },
  ];
  const SELF_CLOSING_Z = -1.5;
  const selfClosingSolids: Footprint[] = [];
  for (const { x, part, title, how } of SELF_CLOSING) {
    parts.add(part);
    part.object.position.set(x, 0, SELF_CLOSING_Z);
    room.add(part.object);
    const caption = createMicroLabel(kit, `${title}\n${how}`, {
      height: 0.03,
      maxWidth: 1.1,
      ink: '#253a42',
      plate: '#e5e8df',
    });
    // On a plate fixed on top of the frame's head.
    const plate = new Mesh(
      new BoxGeometry(1.12, 0.22, 0.02),
      kitPaint(kit, '#e5e8df'),
    );
    plate.position.set(x, 2.31, SELF_CLOSING_Z);
    room.add(plate);
    caption.position.set(x, 2.31, SELF_CLOSING_Z + 0.012);
    room.add(caption);
    // The jambs and their feet are solid; the doorway is not.
    for (const side of [-1, 1])
      selfClosingSolids.push({
        minX: (x + side * 0.53 - 0.06) * m,
        maxX: (x + side * 0.53 + 0.06) * m,
        minZ: (SELF_CLOSING_Z - 0.35) * m,
        maxZ: (SELF_CLOSING_Z + 0.35) * m,
      });
  }

  // ---- Walking --------------------------------------------------------------
  const portals = createPortals('dev3', devPortals('dev3', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const portalAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([portals.group, room], true)[0];
    if (hit && hit.distance > 4 * m) return null;
    if (!hit) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const use = portals.uses.get(o as Mesh) ?? parts.uses.get(o);
      if (use) return use;
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 4 * m, yaw: 0, pitch: 0.12 },
  };
  // Facing each wall's fittings: the doors, the specimens, the office's.
  views.doors = { x: 0, z: 0, yaw: 0, pitch: 0.15 };
  views.specimens = { x: 0, z: 4 * m, yaw: Math.PI, pitch: 0.02 };
  views.office = { x: 7.5 * m, z: -1.5 * m, yaw: Math.PI / 2, pitch: 0.02 };
  views.power = { x: -7.5 * m, z: 2 * m, yaw: -Math.PI / 2, pitch: 0.02 };
  // In front of the self-closing doors, their closing side.
  views.closers = { x: 0, z: 2.6 * m, yaw: 0, pitch: 0.02 };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.room,
    solids: () => [...outer, ...selfClosingSolids],
    use: (x, y) => portalAt(x, y)?.(),
    aimed: () => Boolean(portalAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    ps1Uniforms.resolution.value.set(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  (window as unknown as { devFittingsGallery: unknown }).devFittingsGallery = {
    /** Use whatever is at (x, y) on the screen (−1 to 1), as a use would. */
    use: (x = 0, y = 0) => portalAt(x, y)?.(),
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    model,
    fittings: () => numbered.map((k, i) => `${i + 1}. ${k}`),
    /**
     * Fit batten `n` (1 to 6, west to east, north first) with a tube of
     * another age (0 new to 1 dead; from 0.92 a dud that never catches).
     */
    age(n: number, age: number, tube = 0) {
      lamps[n - 1]?.age(tube, age);
    },
    /** Each luminaire's light, 0 to 1. */
    outputs: () => lamps.map((l) => Number(l.output().toFixed(2))),
    /** The emergency lighting on the floor at (x, z), lux, on battery. */
    lux: (x: number, z: number) => illuminance(GALLERY_EMERGENCY, x, z),
    /** The emergency lighting against BS 5266-1. */
    check: () =>
      checkEmergencyLighting(GALLERY_EMERGENCY, FLOOR, GALLERY_EMPHASIS),
    /** Show the emergency lighting's lux on the floor, or hide it. */
    luxMap(on = true) {
      luxMap.visible = on;
    },
    /**
     * Run `seconds` of frames at once (where the browser is not drawing,
     * as in a hidden tab) and give the last as a PNG data URL.
     */
    shot(seconds = 0, width = 1280, height = 720) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      let time = last || 1000;
      for (let t = 0; t <= seconds; t += 1 / 30) frame((time += 1000 / 30));
      return canvas.toDataURL('image/png');
    },
    /** Set the supply: normal, brownout or severe. */
    supply(condition: SupplyCondition) {
      P.supplyCondition.set(Math.max(0, SUPPLY_CONDITIONS.indexOf(condition)));
    },
  };

  // ---- Each frame -------------------------------------------------------------
  let last = 0;
  let seen = { x: NaN, z: NaN, yaw: NaN };
  const frame = (time: number) => {
    // Never backwards: `shot` runs frames on a clock of its own.
    const delta = last ? Math.min(0.1, Math.max(0, (time - last) / 1000)) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    // The occupancy sensor sees anyone who moves or turns.
    const { x, z, yaw } = walk.walker;
    if (x !== seen.x || z !== seen.z || yaw !== seen.yaw) {
      L.motion();
      seen = { x, z, yaw };
      // The presence detectors see anyone who moves under them.
      for (const d of GALLERY_DETECTORS)
        if (detects(d, x / m, z / m)) L.seen(zoneOf(d.x));
    }
    model.tick(delta);
    // A self-closing door waits while someone stands in its doorway.
    for (const { x: dx, part } of SELF_CLOSING)
      part.hold(
        Math.abs(x / m - dx) < 0.5 && Math.abs(z / m - SELF_CLOSING_Z) < 0.6,
      );
    parts.update(delta);
    // The light bounced about the room follows the room's own.
    const lit = lamps.reduce((sum, l) => sum + l.output(), 0) / lamps.length;
    const battery = L.emergencyLit.value ? 1 : 0;
    ambient.intensity = 0.02 + 0.73 * lit + 0.1 * battery;
    sky.intensity = 0.02 + 0.78 * lit + 0.08 * battery;
    scene.environmentIntensity = environment * (0.08 + 0.92 * lit);
    portals.update(delta, walk.walker.x, walk.walker.z);
    partAudio.listen(camera, m);
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    frame(time);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devFittingsGallery?: unknown })
      .devFittingsGallery;
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

/** The emergency lighting's lux on the floor, painted, for development. */
function createLuxMap() {
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const per = 8;
  const canvas = document.createElement('canvas');
  canvas.width = W * per;
  canvas.height = D * per;
  const c = canvas.getContext('2d')!;
  for (let i = 0; i < canvas.width; i++)
    for (let k = 0; k < canvas.height; k++) {
      const x = FLOOR.minX + (i + 0.5) / per;
      const z = FLOOR.minZ + (k + 0.5) / per;
      const lux = illuminance(GALLERY_EMERGENCY, x, z);
      const shade = Math.min(1, 0.35 + lux / 4);
      const [r, g, b] =
        lux < BS5266.openArea
          ? [220, 40, 30]
          : lux < BS5266.escapeRoute
            ? [235, 160, 30]
            : [50, 190, 80];
      c.fillStyle = `rgb(${r * shade},${g * shade},${b * shade})`;
      c.fillRect(i, k, 1, 1);
    }
  c.fillStyle = '#ffffff';
  c.font = `${per * 0.5}px sans-serif`;
  for (let x = FLOOR.minX + 1; x < FLOOR.maxX; x += 2)
    for (let z = FLOOR.minZ + 1; z < FLOOR.maxZ; z += 2)
      c.fillText(
        illuminance(GALLERY_EMERGENCY, x, z).toFixed(1),
        (x - FLOOR.minX) * per - per * 0.4,
        (z - FLOOR.minZ) * per + per * 0.2,
      );
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const map = new Mesh(
    new PlaneGeometry(W, D),
    new MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.85 }),
  );
  map.rotation.x = -Math.PI / 2;
  map.position.y = 0.01;
  return map;
}
