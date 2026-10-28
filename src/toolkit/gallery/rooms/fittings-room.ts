import {
  AmbientLight,
  BoxGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  Shape,
  Vector2,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { computed, effect, signal } from '@preact/signals-core';
import { partAudio } from '../../components/core/audio/part-audio';
import {
  FIRE_SEAT,
  SPRINKLER_HEADS,
  createBuildingServices,
} from '../../components/architectural/logic/building-services';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import {
  createCaption,
  createSectionBoard,
} from '../../components/core/views/signage';
import { createWarningSign } from '../../components/general-safety/views/safety-fittings';
import type { ExtinguisherKind } from '../../components/fire/views/fire-fittings';
import {
  createPanelKit,
  disposeKit,
  kitGlow,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPortals } from '../views/portals';
import { knobDirection } from '../../controls/input/knob-turning';
import { accessDoor } from '../../components/architectural/parts/building-parts';
import {
  burningBin,
  fireBell,
  voiceAlarm,
  callPoint,
  extinguisher,
  firePanel,
  heldFireDoor,
  smokeDetector,
  sounderBeacon,
  sprinklerHead,
  valveSet,
} from '../../components/fire/parts/fire-parts';
import {
  emergencyLight,
  exitSign,
  keyPlate,
} from '../../components/general-safety/parts/safety-parts';
import { createFirstPerson } from '../../controls/input/first-person';
import {
  createPartSet,
  ledPushbutton,
  pilotLight,
  pushButton,
} from '../../components/core/parts/parts';
import {
  createGasZone,
  gasBeacon,
  gasDetector,
  zoneAlarms,
} from '../../components/general-safety/parts/gas-parts';
import {
  CHLORINE,
  OZONE,
} from '../../components/general-safety/logic/gas-detection';
import { createGasSourcePlaceholder } from '../../components/general-safety/views/gas-detection';
import type { Part } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import { FIRE_KINDS, showSpecimens } from './catalogue-specimens';
import { createArchitecturalServices } from '../../components/architectural/logic/warehouse-services';

/** The room's plan, metres: walls on these lines, the ceiling this high. */
const BOUNDS = { minX: -12, maxX: 12, minZ: -8, maxZ: 8 };
const CEILING = 2.7;
/** The walls' inner faces, and a few millimetres off them for what hangs there. */
const FACE = 0.15 + 0.004;

type Wall = 'north' | 'south' | 'east' | 'west';

/**
 * Dev8, Building Fittings: the fittings of a present-day English office
 * building, each a working part, all wired to one world model of the
 * room's building services (`src/toolkit/components/architectural/logic/building-services.ts`), so that
 * they do what they would in a real building. Lighting on the north wall
 * (two-way switching, a dimmer, the emergency lighting test key, the exit
 * sign) with the accessible WC beside it (its pull-cord light and
 * extractor, and its emergency alarm); fire on the east wall (the panel,
 * a call point, a sounder-beacon, a smoke detector and its TEST SMOKE
 * button, the pre-action sprinklers and their valve set, extinguishers,
 * a fire door on its holder); power and climate on the south wall (the
 * distribution board, sockets, a fused spur and a floor box, the air
 * conditioning, a thermostat, a radiator, a window with its vent and
 * blinds, and the far-end light switch); access on the west wall (a card
 * reader, push-to-exit, an emergency door release and an intercom). The
 * room's own lights are the model's: switch them off and it is dark but
 * for the exit sign and whatever else is lit.
 *
 * Now dev2, Safety Systems: fire, emergency lighting, and on the north
 * wall's east half toxic gas detection, chlorine and ozone, each with a
 * placeholder box that gives off its gas (`gas-parts.ts`).
 */
export function startFittingsRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.12);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  const ambient = new AmbientLight('#e9ece9', 0.05);
  const sky = new HemisphereLight('#dfe4ea', '#4a4a44', 0.05);
  scene.add(ambient, sky);
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const model = createBuildingServices();
  const parts = createPartSet();

  // ---- The room --------------------------------------------------------
  const W = BOUNDS.maxX - BOUNDS.minX;
  const D = BOUNDS.maxZ - BOUNDS.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#7f888b'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#e9e7df'));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CEILING;
  room.add(ceiling);
  const wallPaint = kitPaint(kit, '#e6e2d6');
  const bounds: Footprint = {
    minX: BOUNDS.minX * m,
    maxX: BOUNDS.maxX * m,
    minZ: BOUNDS.minZ * m,
    maxZ: BOUNDS.maxZ * m,
  };
  const outer = devWalls(bounds, m, CEILING * m);
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
  // The ceiling lights: glowing panels, and point lights, both as bright
  // as the model says.
  const panel = kitGlow(kit, '#f4f6ef');
  const panels: { x: number; z: number }[] = [];
  for (const x of [-7.5, -2.5, 2.5, 7.5])
    for (const z of [-3.5, 0.5, 4.5]) {
      panels.push({ x, z });
      const mesh = new Mesh(new PlaneGeometry(0.6, 0.6), panel);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, CEILING - 0.004, z);
      room.add(mesh);
    }
  const lights = panels
    .filter((_, i) => i % 2 === 0)
    .map(({ x, z }) => {
      const light = new PointLight('#f3f5ee', 0, 12 * m);
      light.position.set(x * m, (CEILING - 0.3) * m, z * m);
      scene.add(light);
      return light;
    });
  const emergencyLamps = [
    [-6, 0],
    [6, 0],
  ].map(([x, z]) => {
    const light = new PointLight('#ffffff', 0, 9 * m);
    light.position.set(x * m, (CEILING - 0.2) * m, z * m);
    scene.add(light);
    return { x, z, light };
  });
  // ---- Placing parts ---------------------------------------------------
  const wallAt = (wall: Wall, along: number, y: number) => {
    if (wall === 'north') return { x: along, y, z: BOUNDS.minZ + FACE, yaw: 0 };
    if (wall === 'south')
      return { x: along, y, z: BOUNDS.maxZ - FACE, yaw: Math.PI };
    if (wall === 'east')
      return { x: BOUNDS.maxX - FACE, y, z: along, yaw: -Math.PI / 2 };
    return { x: BOUNDS.minX + FACE, y, z: along, yaw: Math.PI / 2 };
  };
  const onWall = (object: Object3D, wall: Wall, along: number, y: number) => {
    const at = wallAt(wall, along, y);
    object.position.set(at.x, at.y, at.z);
    object.rotation.y = at.yaw;
    room.add(object);
    return object;
  };
  /** A part on a wall, with a caption under it. */
  const fit = <P extends Part>(
    part: P,
    wall: Wall,
    along: number,
    y: number,
    caption?: string,
    below = 0.1,
  ): P => {
    onWall(part.object, wall, along, y);
    parts.add(part);
    if (caption) onWall(createCaption(kit, caption), wall, along, y - below);
    // The caption's group is not the part: give it a nudge off the wall.
    return part;
  };
  const onCeiling = <P extends Part>(part: P, x: number, z: number): P => {
    part.object.position.set(x, CEILING, z);
    room.add(part.object);
    return parts.add(part);
  };
  const board = (title: string, wall: Wall, along: number, width: number) =>
    onWall(createSectionBoard(kit, title, width), wall, along, 2.45);

  // ---- North wall: emergency lighting ---------------------------------
  // Lighting, the accessible WC, power, climate and access are general
  // building fittings, and now live in dev3; this room is fire safety.
  const L = model.lighting;
  board('EMERGENCY LIGHTING', 'north', -6.5, 4);
  fit(
    keyPlate(kit, {
      legend: 'EMERGENCY LIGHTING TEST',
      bound: L.emergencyTest,
    }),
    'north',
    -7.7,
    1.2,
    'TEST KEY SWITCH',
  );
  fit(exitSign(kit, { level: L.exitSign }), 'north', -5.2, 2.15);
  for (const { x, z } of emergencyLamps)
    onCeiling(
      emergencyLight(kit, { lit: L.emergencyLit, charging: L.charging }),
      x,
      z,
    );

  // ---- East wall: fire -------------------------------------------------
  const F = model.fire;
  board('FIRE', 'east', -3.5, 3);
  fit(
    firePanel(kit, {
      lamps: F.panelLamps,
      key: F.panelKey,
      silence: F.silence,
      reset: F.reset,
      evacuate: F.evacuate,
    }),
    'east',
    -6.2,
    1.5,
    'FIRE ALARM PANEL',
    0.24,
  );
  fit(
    callPoint(kit, {
      latched: F.callPoint,
      press: F.pressCallPoint,
      reset: F.resetCallPoint,
    }),
    'east',
    -4.8,
    1.4,
    'CALL POINT (KEY TO RESET)',
  );
  // Speech comes from the ceiling speaker; evacuation tones come from
  // the wall sounders, pausing while the announcement is spoken.
  const voice = voiceAlarm(kit, {
    voice: F.voice,
    announcement: F.announcement,
  });
  fit(
    sounderBeacon(kit, { sounding: F.sounding, tone: voice.evacuationTone }),
    'east',
    -4.0,
    2.2,
  );
  onCeiling(voice, 6.5, -2);
  // The joke: a waste-paper bin under the smoke detector, and a button on
  // a pedestal beside it that sets it alight.
  const bin = burningBin(kit, { size: F.flames, smoke: F.smokeShown });
  bin.object.position.set(FIRE_SEAT.x, 0, FIRE_SEAT.z);
  room.add(bin.object);
  parts.add(bin);
  onCeiling(
    smokeDetector(kit, { alarm: F.detector }),
    FIRE_SEAT.x,
    FIRE_SEAT.z,
  );
  // The button post beside the bin, copied from catalogue parts rather
  // than made up: a galvanised steel post, 60 mm round tube, on a bolted
  // base plate, with a welded mounting plate on top carrying a Schneider
  // XALD01-style single-hole control station (68 × 68 × 53 mm, light grey
  // body, dark grey lid, four lid screws) with the XB4-style illuminated
  // button through its lid and its legend in a black holder below. It
  // faces away from the bin, so whoever presses it is looking at the bin.
  // The warning is band-clamped to the post.
  const pedestal = new Group();
  pedestal.position.set(FIRE_SEAT.x - 1.5, 0, FIRE_SEAT.z);
  pedestal.rotation.y = -Math.PI / 2;
  room.add(pedestal);
  const galvanised = kitPaint(kit, '#a4abae', 0.55);
  const bolts = kitPaint(kit, '#7d8386', 0.6);
  const add = (
    parent: Object3D,
    geometry: BufferGeometry,
    material: Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  /** A box with rounded corners and softened edges, its depth along z. */
  const roundedBox = (w: number, h: number, d: number, r: number) => {
    const shape = new Shape();
    const x = w / 2 - r;
    const y = h / 2 - r;
    shape.absarc(x, y, r, 0, Math.PI / 2, false);
    shape.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
    shape.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
    shape.absarc(x, -y, r, Math.PI * 1.5, Math.PI * 2, false);
    const edge = Math.min(r * 0.6, d / 4);
    const geometry = new ExtrudeGeometry(shape, {
      depth: d - edge * 2,
      bevelEnabled: true,
      bevelThickness: edge,
      bevelSize: edge,
      bevelSegments: 3,
      curveSegments: 6,
    });
    geometry.translate(0, 0, -(d - edge * 2) / 2);
    return geometry;
  };
  const top = 1.06;
  add(pedestal, new BoxGeometry(0.2, 0.008, 0.2), galvanised, 0, 0.004, 0);
  for (const [x, z] of [
    [-0.075, -0.075],
    [0.075, -0.075],
    [-0.075, 0.075],
    [0.075, 0.075],
  ]) {
    add(
      pedestal,
      new CylinderGeometry(0.009, 0.009, 0.008, 6),
      bolts,
      x,
      0.012,
      z,
    );
    add(
      pedestal,
      new CylinderGeometry(0.005, 0.005, 0.018, 8),
      bolts,
      x,
      0.017,
      z,
    );
  }
  add(
    pedestal,
    new CylinderGeometry(0.03, 0.03, top, 24),
    galvanised,
    0,
    top / 2,
    0,
  );
  add(
    pedestal,
    new CylinderGeometry(0.031, 0.031, 0.004, 24),
    galvanised,
    0,
    top,
    0,
  );
  // The mounting plate, welded upright to the post's front.
  add(
    pedestal,
    new BoxGeometry(0.1, 0.1, 0.006),
    galvanised,
    0,
    top - 0.02,
    0.033,
  );
  const station = new Group();
  station.position.set(0, top - 0.02, 0.036);
  pedestal.add(station);
  const body = new Mesh(
    roundedBox(0.068 - 0.006, 0.068 - 0.006, 0.041, 0.006),
    kitPaint(kit, '#c8ccc9'),
  );
  body.position.z = 0.0205;
  station.add(body);
  const lid = new Mesh(
    roundedBox(0.068 - 0.005, 0.068 - 0.005, 0.012, 0.005),
    kitPaint(kit, '#4a4f52'),
  );
  lid.position.z = 0.041 + 0.006;
  station.add(lid);
  for (const [x, y] of [
    [-0.026, -0.026],
    [0.026, -0.026],
    [-0.026, 0.026],
    [0.026, 0.026],
  ]) {
    const screw = add(
      station,
      new CylinderGeometry(0.0028, 0.0028, 0.0015, 12),
      kitPaint(kit, '#2c2f31'),
      x,
      y,
      0.0535,
    );
    screw.rotation.x = Math.PI / 2;
  }
  const light = ledPushbutton(kit, {
    colour: 'red',
    name: 'LIGHT THE BIN push button',
    bound: {
      get value() {
        return F.flames.value > 0;
      },
      set: (on: boolean) => {
        if (on) F.startFire();
      },
    },
  });
  light.object.position.set(0, 0.004, 0.053);
  station.add(light.object);
  parts.add(light);
  // The legend holder: a black frame behind the bezel, its label below.
  add(
    station,
    new BoxGeometry(0.03, 0.044, 0.0012),
    kitPaint(kit, '#161616'),
    0,
    -0.002,
    0.0536,
  );
  const legend = createCaption(kit, 'LIGHT THE BIN');
  legend.scale.setScalar(0.26);
  legend.position.set(0, -0.0185, 0.0545);
  station.add(legend);
  add(
    station,
    new BoxGeometry(0.026, 0.008, 0.0004),
    kitPaint(kit, '#f2f1ea'),
    0,
    -0.0185,
    0.0543,
  );
  const warning = createWarningSign(
    kit,
    ['DO NOT PRESS', 'THIS BUTTON', 'UNDER ANY CIRCUMSTANCES'],
    0.24,
    0.16,
  );
  warning.position.set(0, 0.78, 0.034);
  pedestal.add(warning);
  for (const y of [0.73, 0.83])
    add(
      pedestal,
      new CylinderGeometry(0.0315, 0.0315, 0.012, 24),
      bolts,
      0,
      y,
      0,
    );
  const glow = new PointLight('#ff8a3a', 0, 6 * m);
  glow.position.set(FIRE_SEAT.x * m, 0.8 * m, FIRE_SEAT.z * m);
  scene.add(glow);
  fit(
    valveSet(kit, {
      main: F.riserValve,
      tripped: computed(() => F.heads.value.some((h) => h.burst)),
      reset: F.resetSprinklers,
    }),
    'east',
    -1.6,
    0,
  );
  onWall(createCaption(kit, 'SPRINKLER VALVE SET'), 'east', -1.6, 0.35);
  fit(fireBell(kit, { ringing: F.discharging }), 'east', -2.6, 2.2);
  onWall(createCaption(kit, 'SPRINKLER ALARM BELL'), 'east', -2.6, 2.03);
  SPRINKLER_HEADS.forEach(({ x, z }, i) =>
    onCeiling(
      sprinklerHead(kit, {
        head: computed(() => F.heads.value[i]),
        voice: i === 0,
      }),
      x,
      z,
    ),
  );
  (['water', 'foam', 'co2', 'powder'] as ExtinguisherKind[]).forEach(
    (kind, i) => fit(extinguisher(kit, { kind }), 'east', 0.2 + i * 0.6, 0),
  );
  fit(heldFireDoor(kit, { held: F.doorsHeld }), 'east', 4.2, 0);
  onWall(createCaption(kit, 'FIRE DOOR ON HOLDER'), 'east', 4.2, 2.3);
  // The second sounder follows the same evacuation/speech sequence.
  fit(
    sounderBeacon(kit, { sounding: F.sounding, tone: voice.evacuationTone }),
    'west',
    2.5,
    2.2,
  );

  // ---- North wall: toxic gas detection -----------------------------------
  // A chlorine store's and an ozone room's gas detection, each a detector
  // low on the wall (both gases are heavier than air), a sounder-beacon
  // over it, its ACCEPT and RESET, and the extract fan it purges with;
  // beside each, a placeholder box the buttons make give off gas: the
  // chlorine one a weeping fitting or a tanker's acid put into the
  // hypochlorite, the ozone one a leaking generator.
  board('GAS DETECTION (SIMULATED)', 'north', 6, 9.6);
  const chlorine = createGasZone(CHLORINE);
  const ozone = createGasZone(OZONE);
  const zones = [chlorine, ozone];
  const bind = (s: { value: boolean }) => ({
    get value() {
      return s.value;
    },
    set(v: boolean) {
      s.value = v;
    },
  });
  const sources = [
    { zone: chlorine, x: 2.3, name: 'CHLORINE SOURCE', lens: 'amber' as const },
    { zone: ozone, x: 7.3, name: 'OZONE SOURCE', lens: 'blue' as const },
  ];
  for (const { zone, x, name, lens } of sources) {
    const box = createGasSourcePlaceholder(kit, name);
    box.position.set(x, 0, BOUNDS.minZ + FACE + 0.3);
    room.add(box);
    const alarms = computed(() => zoneAlarms(zone));
    fit(
      gasDetector(kit, { params: zone.params, state: zone.state }),
      'north',
      x + 1.6,
      0.45,
      `${zone.params.gas} DETECTOR`,
      0.2,
    );
    fit(
      gasBeacon(kit, {
        lens,
        flashing: computed(() => alarms.value.beacon),
        sounding: computed(() => alarms.value.sounder),
      }),
      'north',
      x + 1.6,
      2.2,
    );
    fit(
      pushButton(kit, {
        colour: 'yellow',
        legend: 'ACCEPT',
        action: zone.accept,
      }),
      'north',
      x + 1.35,
      1.35,
    );
    fit(
      pushButton(kit, { colour: 'blue', legend: 'RESET', action: zone.reset }),
      'north',
      x + 1.85,
      1.35,
    );
    fit(
      ledPushbutton(kit, {
        colour: 'green',
        legend: 'EXTRACT FAN',
        bound: bind(zone.fan),
      }),
      'north',
      x + 2.55,
      1.35,
    );
    fit(
      pilotLight(kit, {
        colour: 'amber',
        legend: 'PURGE',
        drive: computed(() => zone.fan.value && zone.state.value.a2),
      }),
      'north',
      x + 2.55,
      1.05,
    );
  }
  // The sources' own buttons, on the wall beside each box.
  const weeping = signal(false);
  const stopWeep = effect(() => {
    chlorine.leak.value = weeping.value ? 2 : 0;
  });
  fit(
    ledPushbutton(kit, {
      colour: 'yellow',
      legend: 'WEEPING FITTING',
      bound: bind(weeping),
    }),
    'north',
    1.2,
    1.5,
  );
  fit(
    pushButton(kit, {
      colour: 'red',
      legend: 'ACID INTO HYPO',
      action: chlorine.misdeliver,
    }),
    'north',
    1.2,
    1.15,
  );
  const leaking = signal(false);
  const stopLeak = effect(() => {
    ozone.leak.value = leaking.value ? 2 : 0;
  });
  fit(
    ledPushbutton(kit, {
      colour: 'yellow',
      legend: 'GENERATOR LEAK',
      bound: bind(leaking),
    }),
    'north',
    6.2,
    1.5,
  );

  // `?leak=chlorine,ozone` starts those leaks at once (for trying the
  // alarms, and for screenshots): a mis-delivery and a leaking generator.
  const leaks =
    new URLSearchParams(location.search).get('leak')?.split(',') ?? [];
  if (leaks.includes('chlorine')) chlorine.misdeliver();
  if (leaks.includes('ozone')) leaking.value = true;
  // `?gasAfter=s` runs the gas zones on that many seconds first.
  const after = Number(new URLSearchParams(location.search).get('gasAfter'));
  if (after > 0) for (const zone of zones) zone.step(after);

  // ---- West wall: the door released in a fire ---------------------------
  // The maglocked door unlocks in a fire, and its green emergency door
  // release is an escape device, so it stays here with the fire system.
  const A = model.access;
  board('DOOR RELEASED IN A FIRE', 'west', -2, 3.4);
  fit(
    accessDoor(kit, {
      locked: A.locked,
      open: A.doorOpen,
      broken: A.breakGlass,
      card: A.presentCard,
      exit: A.pushToExit,
      breakGlass: A.breakDoorRelease,
      resetGlass: A.resetDoorRelease,
      work: A.workDoor,
    }),
    'west',
    -2.2,
    0,
  );

  // ---- South and west walls: the catalogue's fire fittings -------------
  // The fire safety fittings of the architectural catalogue, the ones the
  // warehouse installs, as numbered specimens: small ones on boards along
  // the south wall, tall ones standing on the floor by the west wall.
  // They are specimens on a model of their own, not wired into this
  // room's alarm.
  board('WAREHOUSE FIRE FITTINGS (SPECIMENS)', 'south', 0, 6);
  const numbered = showSpecimens(
    kit,
    room,
    parts,
    createArchitecturalServices(),
    FIRE_KINDS,
    [
      ...Array.from({ length: 10 }, (_, i) => ({
        x: 10.6 - i * (21.2 / 9),
        z: BOUNDS.maxZ,
        facing: Math.PI,
        y: 1.5,
        width: 2.25,
      })),
      ...[4.6, 1.6, -4.6, -6.8].map((z) => ({
        x: BOUNDS.minX,
        z,
        facing: Math.PI / 2,
        y: 1.5,
        tall: true,
      })),
    ],
  );

  // ---- Walking and working ---------------------------------------------
  const portals = createPortals('dev2', devPortals('dev2', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObjects([room, portals.group], true)[0];
    if (!hit || hit.distance > 4 * m) return null;
    for (let o: Object3D | null = hit.object; o; o = o.parent) {
      const travel = portals.uses.get(o as Mesh);
      if (travel) return () => travel();
      const work = parts.uses.get(o);
      if (work) {
        const at = o;
        return () => work(knobDirection(at, hit.point, camera));
      }
    }
    return null;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    overview: { x: 0, z: 5 * m, yaw: 0, pitch: 0.05 },
    lighting: { x: -6 * m, z: -4.5 * m, yaw: 0, pitch: 0.15 },
    gas: { x: 5.5 * m, z: -3.2 * m, yaw: 0, pitch: 0.05 },
    fire: { x: 8 * m, z: -2.5 * m, yaw: Math.PI / 2, pitch: 0.05 },
    bin: {
      // From one side, so the pedestal does not hide the bin.
      x: (FIRE_SEAT.x - 3.6) * m,
      z: (FIRE_SEAT.z + 1.5) * m,
      yaw: 1.09,
      pitch: -0.3,
    },
    catalogue: { x: 0, z: 3.5 * m, yaw: Math.PI, pitch: 0.02 },
    tall: { x: -8 * m, z: -1 * m, yaw: Math.PI / 2, pitch: 0.05 },
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    start:
      views[params.get('view') ?? ''] ??
      portals.arrival(params.get('from')) ??
      views.bin,
    solids: () => [
      ...outer,
      ...[
        { x: FIRE_SEAT.x, z: FIRE_SEAT.z, r: 0.2 },
        { x: FIRE_SEAT.x - 1.5, z: FIRE_SEAT.z, r: 0.22 },
        { x: 2.3, z: BOUNDS.minZ + 0.45, r: 0.45 },
        { x: 7.3, z: BOUNDS.minZ + 0.45, r: 0.45 },
      ].map(({ x, z, r }) => ({
        minX: (x - r) * m,
        maxX: (x + r) * m,
        minZ: (z - r) * m,
        maxZ: (z + r) * m,
      })),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
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
  (window as unknown as { devFittings: unknown }).devFittings = {
    model,
    /** The catalogue's fire fittings, in their numbered order. */
    catalogue: () => numbered.map((k, i) => `${i + 1}. ${k}`),
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    parts: () => [...parts.uses.keys()].map((o) => o.name).filter(Boolean),
    /** The gas zones: `gas.chlorine.misdeliver()`, `gas.ozone.leak.value = 2`. */
    gas: { chlorine, ozone },
  };

  // ---- Each frame --------------------------------------------------------
  let last = 0;
  let seen = { x: NaN, z: NaN, yaw: NaN };
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    walk.update(delta);
    // The occupancy sensor sees anyone who moves or turns.
    const { x, z, yaw } = walk.walker;
    if (x !== seen.x || z !== seen.z || yaw !== seen.yaw) {
      L.motion();
      seen = { x, z, yaw };
    }
    model.tick(delta);
    for (const zone of zones) zone.step(delta);
    parts.update(delta);
    const level = L.roomLight.value;
    panel.color.setScalar(0.12 + 0.88 * level);
    for (const light of lights) light.intensity = level * 1.6 * m * m;
    ambient.intensity = 0.04 + level * 0.5;
    sky.intensity = 0.04 + level * 0.6;
    for (const { light } of emergencyLamps)
      light.intensity = L.emergencyLit.value ? 0.8 * m * m : 0;
    glow.intensity =
      F.flames.value > 0
        ? (0.4 + F.flames.value * 2) * m * m * (0.85 + Math.random() * 0.3)
        : 0;
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
    stopWeep();
    stopLeak();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devFittings?: unknown }).devFittings;
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
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
