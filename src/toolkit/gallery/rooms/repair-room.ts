import { effect } from '@preact/signals-core';
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { click, partAudio } from '../../components/core/audio/part-audio';
import { METRE } from '../../components/core/logic/units';
import type { Readable } from '../../components/core/logic/world/components';
import { createPartSet } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import {
  createMicroLabel,
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createShortSpark } from '../../components/core/views/button-effects';
import { createDazzle } from '../../components/core/views/dazzle';
import { createMaterialise } from '../../components/core/views/materialise';
import { createSectionBoard } from '../../components/core/views/signage';
import { createCircuitBreaker } from '../../components/industrial-control/logic/machine-components';
import { machineComponent } from '../../components/industrial-control/parts/machine-components';
import type { MachineDevice } from '../../components/industrial-control/parts/machine-components';
import { createSkip } from '../../components/site-dressing/views/skip';
import { createBinTossing } from '../../components/site-dressing/parts/bin-tossing';
import { createFirstPerson } from '../../controls/input/first-person';
import { isHeldPortableHit } from '../../controls/input/object-handling';
import type { PortableObject } from '../../controls/input/object-handling';
import type { Footprint } from '../../controls/logic/walk-collision';
import { devPortals, devWalls } from '../logic/dev-room-links';
import { createPortals } from '../views/portals';
import { knobDirection } from '../../controls/input/knob-turning';
import { socketDecision } from '../logic/repair-socket';
import { createRepairFuse } from './repair-fuse';

const FLOOR = { minX: -6, maxX: 6, minZ: -5, maxZ: 5 };
const CEILING = 3.2;
const SOCKET_AIM_REACH = 3.2;

/** How long a bench place stands empty before its new part boils in, s. */
const RESTOCK = 1.5;
/** How long a new part takes to boil in, s. */
const MATERIALISE = 2;

/** Where the scrap skip stands, on the floor plan, metres. */
const SKIP_AT = { x: -3.25, z: 1.6 };

/** Dev4: isolate, extract, discard, collect a spare, align, and insert. */
export function startRepairRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.05, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.45));
  scene.add(new HemisphereLight('#dfe4ea', '#3a3a36', 0.6));
  const kit = createPanelKit();
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const parts = createPartSet();
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const floor = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#6a6d6b'));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#2c2e31'));
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
  const wallPaint = kitPaint(kit, '#4a4f47');
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
  const sign = createSectionBoard(
    kit,
    'REPAIR WORKSHOP · ISOLATE BEFORE EXTRACTION',
    5.4,
  );
  sign.position.set(0, 2.55, FLOOR.minZ + 0.154);
  room.add(sign);
  const label = (
    text: string,
    x: number,
    y: number,
    z: number,
    width = 0.85,
  ) => {
    const mesh = createMicroLabel(kit, text, {
      height: 0.024,
      ink: '#1d1f21',
      maxWidth: width,
    });
    mesh.position.set(x, y, z);
    room.add(mesh);
  };
  const controls = new Map<Object3D, () => void>();
  const statusLamps: { mesh: Mesh; rack: number }[] = [];
  const notices: {
    names: Map<string, Object3D>;
    left: number;
    current: string;
  }[] = [];
  const messages = [
    'LIVE · ISOLATE FIRST',
    'WRONG PART',
    'SLOT OCCUPIED',
    'REMOVE A CARD',
    'PULLED LIVE',
    'INSERTED LIVE',
    'INSERTING',
    'INSTALLED',
    'POWER OFF',
    'FAULT INJECTED',
  ];
  const notice = (index: number, message: string) => {
    const display = notices[index];
    if (!display) return;
    display.current = message;
    display.left = 1.8;
    for (const [name, group] of display.names) group.visible = name === message;
  };
  const stops: (() => void)[] = [];
  /**
   * An isolator for `station`: the small grey breaker with its throw
   * handle fitted inside the Encabulator's cabinets (the `breaker` machine
   * component). It will not move while a part is being slid into its board.
   */
  const isolator = (station: number, x: number, y: number, on: boolean) => {
    const busy = {
      get value() {
        return pending.some((entry) => entry.station === station);
      },
    };
    const breaker = createCircuitBreaker(undefined, `station${station}`);
    if (!on) breaker.position.set('off');
    const device = parts.add(
      machineComponent(kit, 'breaker', {
        name: `station ${station + 1} isolator`,
        breaker,
        latch: busy,
      }),
    );
    device.object.position.set(x, y, -4.63);
    room.add(device.object);
    let first = true;
    stops.push(
      effect(() => {
        const live = breaker.closed.value;
        if (!first && !live) notice(station, 'POWER OFF');
        first = false;
      }),
    );
    return breaker.closed;
  };
  const racks: {
    device: MachineDevice;
    power: Readable<boolean>;
    positions: Vector3[];
    orientations: Quaternion[];
    x: number;
  }[] = [];
  for (const [i, x] of [-1.35, 1.35].entries()) {
    const power = isolator(i, x - 0.35, 1.43, i === 1);
    const device = parts.add(
      machineComponent(kit, 'backplane', {
        name: `REPAIR BOARD ${i + 1}`,
        power,
      }),
    );
    device.object.position.set(x, 1.48, -4.68);
    room.add(device.object);
    label(`BOARD ${i + 1} · PLC BACKPLANE`, x, 2.12, -4.62, 1.5);
    label('ISOLATOR', x - 0.35, 1.6, -4.58, 0.45);
    const faultMesh = new Mesh(
      new BoxGeometry(0.12, 0.08, 0.04),
      kitPaint(kit, '#9a2722'),
    );
    faultMesh.position.set(x + 0.34, 1.44, -4.6);
    room.add(faultMesh);
    controls.set(faultMesh, () => {
      device.cards?.[0].test();
      notice(i, 'FAULT INJECTED');
    });
    label('FAULT', x + 0.34, 1.55, -4.58, 0.35);
    const lamp = new Mesh(
      new BoxGeometry(0.06, 0.06, 0.025),
      new MeshBasicMaterial({ color: '#171a17' }),
    );
    lamp.position.set(x - 0.35, 1.24, -4.56);
    room.add(lamp);
    statusLamps.push({ mesh: lamp, rack: i });
    const names = new Map<string, Object3D>();
    for (const text of messages) {
      const message = createMicroLabel(kit, text, {
        height: 0.019,
        ink: '#d3aa45',
        maxWidth: 1.35,
      });
      message.position.set(x, 1.91, -4.54);
      message.visible = false;
      room.add(message);
      names.set(text, message);
    }
    notices.push({ names, left: 0, current: '' });
    racks.push({ device, power, positions: [], orientations: [], x });
  }
  // The first board begins with a failed power card. The other is a working comparison.
  racks[0].device.cards![0].test();
  room.updateMatrixWorld(true);
  for (const rack of racks)
    rack.positions = rack.device.cards!.map((card) =>
      card.object.getWorldPosition(new Vector3()),
    );
  for (const rack of racks)
    rack.orientations = rack.device.cards!.map((card) =>
      card.object.getWorldQuaternion(new Quaternion()),
    );

  // Stock bench: one compatible power card for each board, plus a wrong-type card.
  const benchX = 3.3,
    benchZ = -0.6;
  const bench = new Mesh(
    new BoxGeometry(2.7, 0.9, 1.1),
    kitPaint(kit, '#a9a69a'),
  );
  bench.position.set(benchX, 0.45, benchZ);
  room.add(bench);
  const deck = new Mesh(
    new BoxGeometry(2.8, 0.035, 1.2),
    kitPaint(kit, '#333a3a'),
  );
  deck.position.set(benchX, 0.92, benchZ);
  deck.userData.boardSupport = true;
  room.add(deck);
  label('NEW REPLACEMENT PARTS', benchX, 1.13, benchZ + 0.57, 2.2);
  const stock: { card: MachineDevice; rack: number; x: number; z: number }[] =
    [];
  // Each place on the bench keeps its part: once the part is installed or
  // thrown in the skip, a new one boils in where it stood.
  const shelf: { item: Object3D; make: () => Object3D; due: number }[] = [];
  for (const [index, rack] of racks.entries()) {
    for (const [j, kind] of (['plc-power', 'plc-cpu'] as const).entries()) {
      const x = benchX - 0.8 + index * 1.05;
      const z = benchZ - 0.2 + j * 0.45;
      const make = () => {
        const card = parts.add(rack.device.spare!(kind));
        card.object.position.set(x, 0.94, z);
        room.add(card.object);
        stock.push({ card, rack: index, x, z });
        return card.object;
      };
      shelf.push({ item: make(), make, due: 0 });
      label(
        `${index + 1} ${kind === 'plc-power' ? 'POWER' : 'CPU'}`,
        x,
        0.95,
        z + 0.24,
        0.65,
      );
    }
  }
  // A second scale of repair: the existing 2 A cartridge and holder model.
  const fuse = createRepairFuse(kit, parts);
  const fuseX = -2.65;
  const fusePower = isolator(2, fuseX - 0.27, 1.47, false);
  const fusePlate = new Mesh(
    new BoxGeometry(0.86, 0.6, 0.055),
    kitPaint(kit, '#9b9f9b'),
  );
  fusePlate.position.set(fuseX, 1.52, -4.68);
  room.add(fusePlate);
  fuse.holder.position.set(fuseX, 1.55, -4.62);
  room.add(fuse.holder);
  const placeFuse = (object: Object3D) => {
    object.position.set(benchX + 0.85, 0.96, benchZ + 0.06);
    room.add(object);
    return object;
  };
  shelf.push({
    item: placeFuse(fuse.fresh.object),
    make: () => placeFuse(fuse.spare().object),
    due: 0,
  });
  label('2 A CONTROL FUSE', fuseX, 1.94, -4.62, 0.9);
  label('NEW 2 A FUSE', benchX + 0.85, 0.96, benchZ + 0.34, 0.8);
  label('ISOLATOR', fuseX - 0.27, 1.64, -4.58, 0.45);
  const fuseFault = new Mesh(
    new BoxGeometry(0.11, 0.08, 0.05),
    kitPaint(kit, '#9a2722'),
  );
  fuseFault.position.set(fuseX + 0.27, 1.48, -4.6);
  room.add(fuseFault);
  controls.set(fuseFault, () => {
    fuse.fault();
    notice(2, 'FAULT INJECTED');
  });
  label('FAULT', fuseX + 0.27, 1.62, -4.58, 0.35);
  const fuseLamp = new Mesh(
    new BoxGeometry(0.055, 0.055, 0.025),
    new MeshBasicMaterial({ color: '#171a17' }),
  );
  fuseLamp.position.set(fuseX, 1.28, -4.55);
  room.add(fuseLamp);
  const fuseNoticeNames = new Map<string, Object3D>();
  for (const text of messages) {
    const message = createMicroLabel(kit, text, {
      height: 0.017,
      ink: '#d3aa45',
      maxWidth: 1.1,
    });
    message.position.set(fuseX, 1.78, -4.54);
    message.visible = false;
    room.add(message);
    fuseNoticeNames.set(text, message);
  }
  notices.push({ names: fuseNoticeNames, left: 0, current: '' });
  const reset = new Mesh(
    new BoxGeometry(0.24, 0.1, 0.05),
    kitPaint(kit, '#d2ae56'),
  );
  reset.position.set(0, 0.92, -4.6);
  room.add(reset);
  label('RESET EXPERIMENT', 0, 1.05, -4.57, 1.1);
  controls.set(reset, () => location.reload());
  const reducedMotion = () =>
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
    false;
  const appearing = new Set<ReturnType<typeof createMaterialise>>();
  /** A part has gone for good from wherever it was: restock its place. */
  const used = (object: Object3D) => {
    const place = shelf.find((entry) => entry.item === object);
    if (place && place.due <= 0) place.due = RESTOCK;
  };
  const tossing = createBinTossing({
    camera,
    metre: m,
    onLanded: (object) => used(object),
  });
  const skip = tossing.add({
    name: 'scrap skip',
    ...createSkip(kit),
    x: SKIP_AT.x,
    z: SKIP_AT.z,
  });
  // Where the tossing and the walls think it is: it was drawn at the
  // room's middle, so nothing carried to it could be thrown in.
  skip.group.position.set(SKIP_AT.x, 0, SKIP_AT.z);
  room.add(skip.group);
  label('SCRAP · ACTION WITHIN 2 M', SKIP_AT.x, 1.07, SKIP_AT.z + 0.75, 2.2);
  const light = new SpotLight('#fff3e2', 16 * m * m, 0, 0.42, 0.6, 2);
  light.position.set(0, (CEILING - 0.1) * m, 0);
  light.target.position.set(0, m, -2 * m);
  scene.add(light, light.target);
  const portals = createPortals('dev4', devPortals('dev4', bounds, m), 0, m);
  scene.add(portals.group);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster
      .intersectObjects([room, portals.group], true)
      .find((hit) => !isHeldPortableHit(hit.object));
    if (!hit || hit.distance > 4 * m) return null;
    for (
      let object: Object3D | null = hit.object;
      object;
      object = object.parent
    ) {
      const travel = portals.uses.get(object as Mesh);
      if (travel) return () => travel();
      const control = controls.get(object);
      if (control) return control;
      const work = parts.uses.get(object);
      if (work) return () => work(knobDirection(object!, hit.point, camera));
    }
    return null;
  };
  const solids = () => [
    ...outer,
    {
      minX: (benchX - 1.35) * m,
      maxX: (benchX + 1.35) * m,
      minZ: (benchZ - 0.55) * m,
      maxZ: (benchZ + 0.55) * m,
    },
    {
      minX: (SKIP_AT.x - 1) * m,
      maxX: (SKIP_AT.x + 1) * m,
      minZ: (SKIP_AT.z - 0.7) * m,
      maxZ: (SKIP_AT.z + 0.7) * m,
    },
  ];
  const carrySolids = () => [
    ...outer.map(
      (piece) =>
        new Box3(
          new Vector3(piece.minX, piece.bottom, piece.minZ),
          new Vector3(piece.maxX, piece.top, piece.maxZ),
        ),
    ),
    new Box3(
      new Vector3((benchX - 1.35) * m, 0, (benchZ - 0.55) * m),
      new Vector3((benchX + 1.35) * m, 0.94 * m, (benchZ + 0.55) * m),
    ),
  ];
  const pending: {
    object: Object3D;
    portable: PortableObject;
    from: Vector3;
    to: Vector3;
    fromQ: Quaternion;
    toQ: Quaternion;
    age: number;
    seat: () => boolean;
    live: () => boolean;
    station: number;
  }[] = [];
  const refusal = (station: number, message: string, object: Object3D) => {
    notice(station, message);
    partAudio.play(
      click({ band: 850, q: 1.3, decay: 0.035, level: 0.08 }),
      object,
    );
    return 'refuse' as const;
  };
  /** The card `object` is, from either board or the bench. */
  const cardOf = (object: Object3D) =>
    [
      ...racks.flatMap((rack) => rack.device.cards!),
      ...stock.map((entry) => entry.card),
    ].find((card) => card.object === object);
  room.updateMatrixWorld(true);
  const sockets = [
    ...racks.flatMap((rack, board) =>
      rack.positions.map((position, slot) => ({
        board,
        slot,
        kind: rack.device.slots![slot].kind,
        occupied: () => Boolean(rack.device.slots![slot].occupant.value),
        live: () => rack.power.value,
        position,
        seat: (part: Object3D) => {
          // Any card of the slot's kind: its own, the other board's or a spare.
          const card = cardOf(part);
          return Boolean(card && rack.device.insert!(card, slot));
        },
        orientation: rack.orientations[slot],
      })),
    ),
    {
      board: 2,
      slot: 0,
      kind: 'fuse',
      occupied: () => Boolean(fuse.occupant),
      live: () => fusePower.value,
      position: fuse.socketPosition,
      seat: (part: Object3D) => fuse.insert(part),
      orientation: fuse.holder.getWorldQuaternion(new Quaternion()),
    },
  ];
  // Thin, visible-to-the-ray targets sit in front of each real socket.
  // They are transparent to the player and remain targetable when occupied.
  const socketTargets = sockets.map((socket) => {
    const neighbour = Math.min(
      ...sockets
        .filter((other) => other !== socket && other.board === socket.board)
        .map((other) => Math.abs(other.position.x - socket.position.x)),
    );
    const width =
      socket.kind === 'fuse' ? 0.22 * m : Math.min(0.045 * m, neighbour * 0.8);
    const target = new Mesh(
      new PlaneGeometry(width, socket.kind === 'fuse' ? 0.3 * m : 0.38 * m),
      new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    target.position.copy(socket.position).add(new Vector3(0, 0, 0.16 * m));
    // Hidden, so the pickup ray passes through to the part in the socket;
    // the socket ray still finds it.
    target.visible = false;
    scene.add(target);
    return target;
  });
  const socketRay = new Raycaster();
  const socketPoint = new Vector2();
  const aimedSocket = (x: number, y: number) => {
    camera.updateMatrixWorld(true);
    socketRay.setFromCamera(socketPoint.set(x, y), camera);
    const hit = socketRay.intersectObjects(socketTargets, false)[0];
    if (!hit || hit.distance > SOCKET_AIM_REACH * m) return null;
    return sockets[
      socketTargets.indexOf(hit.object as (typeof socketTargets)[number])
    ];
  };
  const partKind = (object: Object3D) =>
    fuse.has(object) ? 'fuse' : (cardOf(object)?.kind ?? '');
  const decisionFor = (socket: (typeof sockets)[number], object: Object3D) =>
    socketDecision({
      live: Boolean(socket.live()),
      occupied:
        socket.occupied() ||
        pending.some(
          (entry) => entry.to.distanceTo(socket.position) < 0.01 * m,
        ),
      partKind: partKind(object),
      socketKind: socket.kind,
    });
  const targetFeedback = (
    object: Object3D,
    _portable: PortableObject,
    x: number,
    y: number,
  ) => {
    const socket = aimedSocket(x, y);
    if (!socket) return null;
    const decision = decisionFor(socket, object);
    return decision === 'insert' || decision === 'insert-live'
      ? ('accept' as const)
      : ('reject' as const);
  };
  const heldAction = (
    object: Object3D,
    portable: PortableObject,
    x: number,
    y: number,
  ): boolean | 'refuse' => {
    const socket = aimedSocket(x, y);
    if (!socket) return false;
    const decision = decisionFor(socket, object);
    const message = {
      occupied: 'SLOT OCCUPIED',
      'wrong-part': 'WRONG PART',
    } as const;
    if (decision !== 'insert' && decision !== 'insert-live')
      return refusal(socket.board, message[decision], object);
    portable.component.setLocked(true);
    pending.push({
      object,
      portable,
      from: object.position.clone(),
      to: socket.position.clone(),
      fromQ: object.quaternion.clone(),
      toQ: socket.orientation.clone(),
      age: 0,
      seat: () => socket.seat(object),
      live: () => Boolean(socket.live()),
      station: socket.board,
    });
    notice(socket.board, 'INSERTING');
    return true;
  };
  // Live insertion and extraction arc as the electrical contacts meet or part.
  const arc = createShortSpark(kit, 14);
  arc.group.scale.setScalar(3 * m);
  scene.add(arc.group);
  const crack = click({ band: 3200, q: 0.7, decay: 0.09, level: 0.35 });
  const crackle = click({ band: 4200, q: 0.9, decay: 0.05, level: 0.18 });
  /** Seconds to each spark still to spit from the socket after a pop. */
  let afterSparks: number[] = [];
  const dazzle = createDazzle(canvas, camera);
  const sparkAt = (object: Object3D, station: number, message: string) => {
    object.getWorldPosition(arc.group.position);
    arc.group.position.z += 0.03 * m;
    arc.fire();
    partAudio.play(crack, object);
    dazzle.flash(object, { reduced: reducedMotion() });
    // Then none to three more, spat from the socket as it settles.
    afterSparks = [];
    let at = 0;
    for (let n = Math.floor(Math.random() * 4); n > 0; n--)
      afterSparks.push((at += 0.12 + Math.random() * 0.45));
    notice(station, message);
  };
  const allowPickup = (object: Object3D) => {
    const liveRack = racks.findIndex(
      (rack) => rack.power.value && object.parent === rack.device.object,
    );
    const station =
      liveRack >= 0
        ? liveRack
        : fusePower.value && fuse.occupant?.object === object
          ? 2
          : -1;
    if (station >= 0) sparkAt(object, station, 'PULLED LIVE');
    return true;
  };
  const views = {
    room: { x: 0, z: -1.5 * m, yaw: 0, pitch: 0 },
    boards: { x: 0, z: -2.8 * m, yaw: 0, pitch: 0 },
    fuse: { x: fuseX * m, z: -3.65 * m, yaw: 0, pitch: -0.25 },
    bench: { x: 3.2 * m, z: 0.6 * m, yaw: 0, pitch: -0.4 },
    bin: { x: -3.2 * m, z: 3.3 * m, yaw: 0, pitch: -0.5 },
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    nearbyTargetFeedback: tossing.targetFeedback,
    divert: tossing.divert,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    heldAction,
    allowPickup,
    targetFeedback,
    carrySolids,
    solids,
    start:
      views[params.get('view') as keyof typeof views] ??
      portals.arrival(params.get('from')) ??
      views.room,
    use: (x, y) => usableAt(x, y)?.(),
    useWhileHolding: (_object, x, y) => {
      if (aimedSocket(x, y)) return false;
      const action = usableAt(x, y);
      if (!action) return false;
      action();
      return true;
    },
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
  (window as unknown as { devRepair: unknown }).devRepair = {
    view(name: keyof typeof views) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    state: () => ({
      boards: racks.map((rack) => ({
        power: rack.power.value,
        slots: rack.device.slots?.map((slot) => ({
          kind: slot.kind,
          occupant: slot.occupant.value?.kind ?? null,
        })),
      })),
      fuse: {
        power: fusePower.value,
        occupant:
          fuse.occupant?.fuse.blown.value === false
            ? 'whole'
            : fuse.occupant
              ? 'blown'
              : null,
      },
      scrap: skip.filled,
      restocking: shelf.filter((place) => place.due > 0).length,
      bench: shelf.length,
    }),
    targets: () =>
      sockets.map((socket) => ({
        board: socket.board,
        slot: socket.slot,
        kind: socket.kind,
        occupied: socket.occupied(),
        screen: socketTargets[sockets.indexOf(socket)].position
          .clone()
          .project(camera)
          .toArray(),
      })),
    reset: () => location.reload(),
    /** Be dazzled by a discharge at the fuse holder. */
    dazzle: () => dazzle.flash(fuse.holder),
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
    tossing.update(delta);
    parts.update(delta);
    fuse.update(delta);
    arc.update(delta, reducedMotion());
    if (afterSparks.length) {
      afterSparks = afterSparks.map((left) => left - delta);
      if (afterSparks[0] <= 0) {
        afterSparks.shift();
        arc.fire();
        partAudio.play(crackle, arc.group);
      }
    }
    dazzle.update(delta);
    for (let i = pending.length - 1; i >= 0; i--) {
      const insertion = pending[i];
      insertion.age += delta;
      const t = Math.min(1, insertion.age / 0.22);
      const eased = t * t * (3 - 2 * t);
      insertion.object.position.copy(insertion.from).lerp(insertion.to, eased);
      insertion.object.quaternion
        .copy(insertion.fromQ)
        .slerp(insertion.toQ, eased);
      if (t < 1) continue;
      pending.splice(i, 1);
      const seated = insertion.seat();
      insertion.portable.component.setLocked(false);
      if (seated) {
        used(insertion.object);
        if (insertion.live())
          sparkAt(insertion.object, insertion.station, 'INSERTED LIVE');
        else notice(insertion.station, 'INSTALLED');
        partAudio.play(
          click({ band: 1250, q: 2.5, decay: 0.07, level: 0.14 }),
          insertion.object,
        );
      } else {
        insertion.portable.component.drop();
        refusal(insertion.station, 'SLOT OCCUPIED', insertion.object);
      }
    }
    for (const place of shelf) {
      if (place.due <= 0) continue;
      place.due -= delta;
      if (place.due > 0) continue;
      place.item = place.make();
      appearing.add(
        createMaterialise(place.item, {
          seconds: MATERIALISE,
          reduced: reducedMotion(),
        }),
      );
    }
    for (const effect of appearing)
      if (!effect.update(delta)) appearing.delete(effect);
    for (const display of notices) {
      if (display.left <= 0) continue;
      display.left -= delta;
      if (display.left > 0) continue;
      for (const group of display.names.values()) group.visible = false;
      display.current = '';
    }
    for (const { mesh, rack: index } of statusLamps) {
      const rack = racks[index];
      (mesh.material as MeshBasicMaterial).color.set(
        !rack.power.value
          ? '#171a17'
          : rack.device.faulted.value
            ? '#b32b21'
            : '#2b9b4e',
      );
    }
    (fuseLamp.material as MeshBasicMaterial).color.set(
      !fusePower.value
        ? '#171a17'
        : fuse.connected(true)
          ? '#2b9b4e'
          : '#b32b21',
    );
    portals.update(delta, walk.walker.x, walk.walker.z, !walk.following);
    partAudio.listen(camera, m, scene);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    for (const stop of stops) stop();
    observer.disconnect();
    walk.dispose();
    portals.dispose();
    parts.dispose();
    fuse.dispose();
    dazzle.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devRepair?: unknown }).devRepair;
  };
  return Object.assign(dispose, {
    enter(previous: string | null) {
      const view =
        views[
          new URLSearchParams(location.search).get('view') as keyof typeof views
        ];
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
