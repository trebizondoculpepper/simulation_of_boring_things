import {
  ACESFilmicToneMapping,
  AmbientLight,
  Group,
  HemisphereLight,
  HalfFloatType,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createRenderer } from '../../components/core/parts/render-style';
import { partAudio } from '../../components/core/audio/part-audio';
import { METRE } from '../../components/core/logic/units';
import {
  createFirstPerson,
  WALKER_RADIUS_METRES,
} from '../../controls/input/first-person';
import {
  corridorFloorAt,
  corridorFootprints,
} from '../../components/architectural/logic/corridor-path';
import {
  corridorEnds,
  LOOP_LEGS,
  loopStep,
  roomCorridors,
} from '../logic/pool-loop';
import type { CorridorCopy, LoopRoom, LoopState } from '../logic/pool-loop';
import { registerJoint } from '../logic/door-joins';
import { doorwayStops, overlaps } from '../logic/doorway';
import type { DoorFrame, Joint } from '../logic/door-joins';
import type { RoomId } from '../logic/dev-room-links';
import { enterDevRoom } from '../logic/dev-room-links';
import { DEFAULT_POOL_LOOK, POOL_LOOKS } from '../logic/pool-looks';
import { createPoolHall } from '../views/pool-hall';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { createPoolInfoSign } from '../../components/pool/views/pool-info-sign';
import { createSignState } from '../../components/pool/logic/pool-info-sign';
import { createPaceClock } from '../../components/pool/views/pace-clock';
import { worldStore } from '../../save/world-store';
import { serviceAvailable } from '../../../game/plant/services';
import { JACUZZI_EXHIBIT, JACUZZI_PLATE_EXHIBIT } from './plant/pool-amenities';
import { plantRoomDoor } from '../../components/architectural/parts/plant-door';
import { cardReader } from '../../components/architectural/parts/card-reader';
import { doorwayBlock, PLANT_DOORWAY, PLANT_SILL } from '../logic/plant-rooms';
import {
  galleryOfficeDoor,
  galleryPlan,
  hallFloorAt,
  throughGalleryOfficeDoor,
  hallSolids,
  POOL_HALLS,
} from '../logic/pool-halls';
import type { PoolHallId } from '../logic/pool-halls';
import { bindRoomLights } from '../views/room-lights';
import { zoneOfRoom } from '../../../game/plant/lighting';

/**
 * A version-one pool hall (pool_01 to pool_04), in its own scene. None has
 * doors yet: each is reached by its URL until corridors join them.
 */
export function startPoolHallRoom(
  canvas: HTMLCanvasElement,
  id: PoolHallId,
  { inGallery = false }: { inGallery?: boolean } = {},
) {
  const spec = POOL_HALLS[id];
  // In the underwater gallery (pool_02_gallery) the walker is kept to it,
  // but for the door in the middle of its north wall to the engineer's
  // office.
  const gallery = inGallery ? galleryPlan(spec) : null;
  const officeWay = gallery ? galleryOfficeDoor(gallery) : null;
  const metre = METRE;
  const scene = new Scene();
  scene.background = null;
  const renderer = createRenderer(canvas, true);
  renderer.toneMapping = ACESFilmicToneMapping;
  const look = POOL_LOOKS[DEFAULT_POOL_LOOK];
  renderer.toneMappingExposure = look.exposure;
  renderer.setClearColor('#d8e1df', 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  // The sun through the skylights casts shadows.
  renderer.shadowMap.enabled = true;
  const camera = new PerspectiveCamera(68, 1, 0.05 * metre, 140 * metre);
  // The general fill: in a hall with skylights, partly the daylight's
  // bounce, which stays when its lights are out (`room-lights.ts`).
  const daylit = spec.skylights.length > 0 ? 0.35 : 0;
  const fill = new AmbientLight('#f4f7f5', 0.25);
  const sky = new HemisphereLight('#e9f3f1', '#65716f', 0.6);
  fill.userData.daylightShare = daylit;
  sky.userData.daylightShare = daylit;
  scene.add(fill, sky);
  const rooms = createPoolHall(spec, metre, {
    underwater: Boolean(gallery),
    loopRoom: gallery ? 'pool_02_gallery' : id,
  });
  const poolsideKit = createPanelKit();
  const world = worldStore('dev');
  const poolside = !gallery
    ? (() => {
        const mounts =
          id === 'pool_01'
            ? [
                { x: -spec.w / 2 + 0.012, z: 3.26, yaw: Math.PI / 2 },
                { x: spec.w / 2 - 0.012, z: -6.53, yaw: -Math.PI / 2 },
              ]
            : id === 'pool_02'
              ? [{ x: -spec.w / 2 + 0.012, z: -1.94, yaw: Math.PI / 2 }]
              : id === 'pool_03'
                ? [{ x: -spec.w / 2 + 0.012, z: 2.92, yaw: Math.PI / 2 }]
                : [{ x: -1.15, z: spec.d / 2 - 0.012, yaw: Math.PI }];
        const signs = mounts.map(({ x, z, yaw }, index) => {
          const sign = createPoolInfoSign(poolsideKit, 'wall');
          sign.object.name = `${spec.title} water quality sign ${index + 1}`;
          sign.object.position.set(x, 2, z);
          sign.object.rotation.y = yaw;
          rooms.add(sign.object);
          return sign;
        });
        const clock = id === 'pool_02' ? createPaceClock(2) : null;
        if (clock) {
          // Its case's back on the east wall.
          clock.object.position.set(spec.w / 2 - 0.04 * 2 - 0.002, 7.5, -5.25);
          clock.object.rotation.y = -Math.PI / 2;
          rooms.add(clock.object);
        }
        const state = createSignState(
          id === 'pool_02'
            ? 'OLYMPIC POOL'
            : id === 'pool_01'
              ? 'LOUNGE POOL'
              : id === 'pool_03'
                ? 'JACUZZI'
                : 'FOOTBATH',
        );
        return { signs, clock, state };
      })()
    : null;
  const spaTub =
    id === 'pool_03' && !gallery ? JACUZZI_EXHIBIT.build(poolsideKit) : null;
  const spaPanel =
    id === 'pool_03' && !gallery
      ? JACUZZI_PLATE_EXHIBIT.build(poolsideKit)
      : null;
  if (spaTub && 'object' in spaTub) {
    spaTub.object.position.x = -2.7;
    rooms.add(spaTub.object);
  }
  if (spaPanel && 'object' in spaPanel) {
    // Flat in the plinth's top deck, in its south-east corner, where the
    // square deck stands clear of the round gutter: sunk flush, its top
    // toward the tub, so it reads from outside it; clear of the doors.
    const corner = new Group();
    corner.position.set(-2.7 + 1.3, 0.9 - 0.026, 1.3);
    corner.rotation.y = Math.PI / 4;
    spaPanel.object.rotation.x = -Math.PI / 2;
    corner.add(spaPanel.object);
    rooms.add(corner);
  }
  scene.add(rooms);

  const composer = new EffectComposer(
    renderer,
    new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
  );
  const base = new RenderPass(scene, camera);
  base.clearAlpha = 0;
  composer.addPass(base);
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({
    distanceExponent: 1.4,
    thickness: 1.2 * metre,
    scale: 1,
    samples: 12,
    radius: look.ao.radius * metre,
  });
  ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6 });
  ao.blendIntensity = look.ao.blend;
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(
    new Vector2(1, 1),
    look.bloom.strength,
    look.bloom.radius,
    look.bloom.threshold,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      grain: { value: look.grain },
      vignette: { value: look.vignette },
    },
    vertexShader:
      'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vignette; varying vec2 vUv;
float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
void main() { vec2 c = vUv - 0.5; vec2 shift = c * dot(c, c) * 0.006;
vec4 sampleColour = texture2D(tDiffuse, vUv);
vec3 colour = vec3(texture2D(tDiffuse, vUv + shift).r, sampleColour.g, texture2D(tDiffuse, vUv - shift).b);
colour *= 1.0 - vignette * smoothstep(0.25, 0.85, length(c * vec2(1.15, 1.0)));
colour += (rand(vUv * 731.0) - 0.5) * grain;
gl_FragColor = vec4(colour, sampleColour.a); }`,
  });
  composer.addPass(film);

  const half = 0.6;
  // Its place in the pool loop, and the loop's corridors in its scene.
  const loopRoom: LoopRoom = gallery ? 'pool_02_gallery' : id;
  const { leaving, arriving } = roomCorridors(loopRoom);
  const corridors = [...leaving.placed, ...arriving.placed];
  const walls = [
    ...(gallery
      ? [
          // The gallery's long walls; its ends open onto the corridors,
          // its north wall onto the office's door.
          ...officeWay!.pieces.map(([minX, maxX]) => ({
            minX,
            maxX,
            minZ: gallery.z - half - 1,
            maxZ: gallery.z - half,
          })),
          {
            minX: gallery.x0,
            maxX: gallery.x1,
            minZ: gallery.z + half,
            maxZ: gallery.z + half + 1,
          },
        ]
      : hallSolids(spec)),
    ...corridorFootprints(corridors),
    // Closed at their far ends until the room beyond is seen through them:
    // the walker waits there if it is not built yet.
    ...corridorEnds(leaving, arriving),
  ].map((s) => ({
    minX: s.minX * metre,
    maxX: s.maxX * metre,
    minZ: s.minZ * metre,
    maxZ: s.maxZ * metre,
  }));
  // The plant room door in the west wall, working, self-closing: through
  // it, the walker is in its plant room's scene (`plant-room-shell-room.ts`).
  const plantDoor =
    spec.plantDoor && !gallery ? plantRoomDoor(poolsideKit) : null;
  if (plantDoor && spec.plantDoor) {
    const west = spec.plantDoor.wall === 'west';
    plantDoor.object.position.set(
      ((west ? -1 : 1) * spec.w) / 2,
      PLANT_SILL,
      spec.plantDoor.z,
    );
    // Its hall face toward the hall.
    plantDoor.object.rotation.y = west ? Math.PI / 2 : -Math.PI / 2;
    rooms.add(plantDoor.object);
  }
  // The plant room doorway, metres: its leaf's place across the wall, and
  // a stop just beyond it.
  const plantWay =
    plantDoor && spec.plantDoor
      ? (() => {
          const west = spec.plantDoor.wall === 'west';
          const leaf = doorwayBlock(spec.plantDoor.wall, {
            x: ((west ? -1 : 1) * spec.w) / 2,
            z: spec.plantDoor.z,
          });
          const out = west ? -0.3 : 0.3;
          return {
            leaf,
            beyond: { ...leaf, minX: leaf.minX + out, maxX: leaf.maxX + out },
          };
        })()
      : null;
  // The door to the engineer's office (`shell-rooms.ts`): the same single
  // leaf as its side of the doorway, pulled open from the office, so here
  // its push side, at the wall's far face, turned toward the office; a
  // card reader on this side of the wall, by its latch.
  const officeDoor = officeWay
    ? plantRoomDoor(poolsideKit, [], 'UNDERWATER GALLERY')
    : null;
  const officeReader = officeWay ? cardReader(poolsideKit) : null;
  if (gallery && officeWay && officeDoor && officeReader) {
    officeDoor.object.position.set(
      officeWay.x,
      gallery.floor,
      officeWay.line - officeWay.wall,
    );
    officeDoor.object.rotation.y = Math.PI;
    // Its push side's shoe covering warning is for those going poolside
    // from a plant room: not for this door.
    const shoes = officeDoor.object.getObjectByName(
      'plant side shoe covering warning',
    );
    if (shoes) shoes.visible = false;
    rooms.add(officeDoor.object);
    officeReader.object.position.set(
      officeWay.x - (officeWay.opening / 2 + 0.16),
      gallery.floor + 1.1,
      officeWay.line,
    );
    rooms.add(officeReader.object);
  }
  const inOfficeWay = () =>
    Boolean(officeWay) &&
    overlaps(
      officeWay!.leaf,
      walk.walker.x / metre,
      walk.walker.z / metre,
      WALKER_RADIUS_METRES,
    );
  const inPlantWay = () =>
    Boolean(plantWay) &&
    overlaps(
      plantWay!.leaf,
      walk.walker.x / metre,
      walk.walker.z / metre,
      WALKER_RADIUS_METRES,
    );
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const useSpaPanel = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    for (const [object, uses] of [
      ...(spaPanel && 'object' in spaPanel && spaPanel.parts
        ? ([[spaPanel.object, spaPanel.parts.uses]] as const)
        : []),
      ...(plantDoor ? ([[plantDoor.object, plantDoor.uses]] as const) : []),
      ...(officeDoor ? ([[officeDoor.object, officeDoor.uses]] as const) : []),
      ...(officeReader
        ? ([[officeReader.object, officeReader.uses]] as const)
        : []),
    ]) {
      const hit = raycaster.intersectObject(object, true)[0];
      if (!hit || hit.distance > 3 * metre) continue;
      for (let o = hit.object; o; o = o.parent!) {
        const use = uses.get(o);
        if (use) return use();
        if (o === object) break;
      }
    }
  };
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre,
    floorY: (gallery?.floor ?? 0) * metre,
    // In the gallery, at its west end looking east along the windows.
    start: gallery
      ? { x: (gallery.x0 + 1) * metre, z: gallery.z * metre, yaw: Math.PI / 2 }
      : {
          x: spec.start.x * metre,
          z: spec.start.z * metre,
          yaw: spec.start.yaw,
        },
    floorAt: (x, z) =>
      (corridorFloorAt(corridors, x / metre, z / metre) ??
        (gallery ? gallery.floor : hallFloorAt(spec, x / metre, z / metre))) *
      metre,
    // The plant room doorway: its leaf while shut, but never where the
    // walker stands; a stop just beyond until the plant room is seen.
    // So too the office's doorway.
    solids: () => [
      ...walls,
      ...[
        ...(plantDoor && plantWay
          ? doorwayStops(
              {
                inside: inPlantWay(),
                shut: plantDoor.angle() < 0.6,
                seen: plantSeen,
              },
              plantWay.leaf,
              plantWay.beyond,
            )
          : []),
        ...(officeDoor && officeWay
          ? doorwayStops(
              {
                inside: inOfficeWay(),
                shut: officeDoor.angle() < 0.6,
                seen: officeSeen,
              },
              officeWay.leaf,
              officeWay.beyond,
            )
          : []),
      ].map((f) => ({
        minX: f.minX * metre,
        maxX: f.maxX * metre,
        minZ: f.minZ * metre,
        maxZ: f.maxZ * metre,
      })),
    ],
    use: useSpaPanel,
  });
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    composer.setSize(Math.round(width), Math.round(height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  let visual = true;
  // The loop's corridors as doorways the app sees through (`door-joins.ts`):
  // each opens in its middle piece, the room beyond built and drawn
  // through its far end; in its far short straight, the walker is handed
  // over. Lazy: loaded only while open, let go when closed.
  let loading: LoopState = { leaving: false, arriving: false };
  const seen = { leaving: false, arriving: false };
  let handing = false;
  let leavingForPlant = false;
  const nextRoom = LOOP_LEGS[leaving.leg].to;
  const lastRoom = LOOP_LEGS[arriving.leg].from;
  // A corridor copy's start as a door frame: +z into the room the walker
  // came from (back along a corridor leaving; along a corridor arriving).
  const frameAt = (copy: CorridorCopy, back: boolean): DoorFrame => {
    const [dx, dz] = [
      [1, 0],
      [0, -1],
      [-1, 0],
      [0, 1],
    ][copy.start.heading];
    const sign = back ? -1 : 1;
    return {
      x: copy.start.x * metre,
      z: copy.start.z * metre,
      y: copy.start.y * metre,
      yaw: Math.atan2(sign * dx, sign * dz),
    };
  };
  const joint = (side: 'leaving' | 'arriving', frame: DoorFrame): Joint => ({
    frame,
    lazy: true,
    open: () => loading[side],
    angle: () => 0,
    swingTo: () => {},
    // No wall is cut: the corridor runs on, open.
    opening: () => ({ minX: 1e9, maxX: 1e9, minZ: 1e9, maxZ: 1e9 }),
    see: (on) => {
      seen[side] = on;
    },
    peek: () => {},
  });
  // The plant room door, as a doorway the app sees through (`door-joins.ts`):
  // open, its plant room is built and drawn beyond it; walked through, the
  // walker is handed over to it without a break.
  let plantSeen = false;
  const plantRoom = spec.plantDoor ? (`plant_${spec.id}` as RoomId) : null;
  const plantFrame: DoorFrame | null = spec.plantDoor
    ? {
        x: ((spec.plantDoor.wall === 'west' ? -1 : 1) * spec.w * metre) / 2,
        z: spec.plantDoor.z * metre,
        // The sill's height: the plant room's landing meets it level.
        y: PLANT_SILL * metre,
        yaw: spec.plantDoor.wall === 'west' ? Math.PI / 2 : -Math.PI / 2,
      }
    : null;
  const lobby = rooms.getObjectByName('plant door lobby');
  // The office's door, as a doorway the app sees through, as the plant
  // room door is: its frame on the wall's face here, at the gallery's
  // floor, where the office's frame (on its east wall's outer face) meets
  // it, so the two rooms share the one wall.
  let officeSeen = false;
  let leavingForOffice = false;
  const officeLobby = rooms.getObjectByName('office door lobby');
  const withdraw = [
    ...(plantDoor && plantRoom && plantFrame && !gallery
      ? [
          registerJoint(loopRoom as RoomId, plantRoom, {
            frame: plantFrame,
            onOpen: true,
            open: () => plantDoor.angle() > 0.05,
            angle: () => plantDoor.angle(),
            swingTo: (a) => plantDoor.swingTo(a),
            opening: () => {
              const wx = plantFrame.x / metre;
              const side = spec.plantDoor!.wall === 'west' ? -1 : 1;
              const z = spec.plantDoor!.z;
              return {
                minX: (Math.min(wx, wx + side * 2) - 0.1) * metre,
                maxX: (Math.max(wx, wx + side * 2) + 0.1) * metre,
                minZ: (z - PLANT_DOORWAY / 2) * metre,
                maxZ: (z + PLANT_DOORWAY / 2) * metre,
              };
            },
            see: (on) => {
              plantSeen = on;
              if (lobby) lobby.visible = !on;
            },
            peek: (on) => plantDoor.showLeaf(!on),
          }),
        ]
      : []),
    ...(officeDoor && officeWay
      ? [
          registerJoint('pool_02_gallery', 'engineers_office', {
            frame: {
              x: officeWay.frame.x * metre,
              z: officeWay.frame.z * metre,
              y: officeWay.frame.y * metre,
              yaw: officeWay.frame.yaw,
            },
            onOpen: true,
            open: () => officeDoor.angle() > 0.05,
            angle: () => officeDoor.angle(),
            swingTo: (a) => officeDoor.swingTo(a),
            // Through the wall, and on a little way beyond it.
            opening: () => ({
              minX: (officeWay.x - officeWay.opening / 2) * metre,
              maxX: (officeWay.x + officeWay.opening / 2) * metre,
              minZ: (officeWay.line - officeWay.wall - 2) * metre,
              maxZ: (officeWay.line + 0.4) * metre,
            }),
            see: (on) => {
              officeSeen = on;
              if (officeLobby) officeLobby.visible = !on;
            },
            peek: (on) => officeDoor.showLeaf(!on),
          }),
        ]
      : []),
    registerJoint(loopRoom, nextRoom, joint('leaving', frameAt(leaving, true))),
    registerJoint(
      loopRoom,
      lastRoom,
      joint('arriving', frameAt(arriving, false)),
    ),
  ];
  // Its lights, following their lighting zones (`room-lights.ts`): the
  // gallery's the corridors'.
  const roomLights = bindRoomLights(
    scene,
    gallery ? 'corridors' : zoneOfRoom(id),
  );
  let last = 0;
  let officeWasOpen = false;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) return;
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    walk.update(delta);
    roomLights.update(delta);
    partAudio.listen(camera, metre);
    if (spaTub && 'object' in spaTub) spaTub.update?.(delta);
    if (spaPanel && 'object' in spaPanel) spaPanel.parts?.update(delta);
    plantDoor?.update(delta);
    officeDoor?.update(delta);
    officeReader?.update(delta);
    // Present a card, or open it from either side: the reader shows green.
    if (officeDoor && officeReader) {
      const open = officeDoor.angle() > 0.05;
      if (open && !officeWasOpen) officeReader.doorOpened(true);
      officeWasOpen = open;
    }
    if (officeDoor && inOfficeWay()) officeDoor.holdOpen();
    // Through the office's door, once the office is seen beyond it.
    if (
      officeWay &&
      officeSeen &&
      !leavingForOffice &&
      !walk.following &&
      throughGalleryOfficeDoor(
        officeWay,
        walk.walker.x / metre,
        walk.walker.z / metre,
      )
    ) {
      leavingForOffice = true;
      enterDevRoom('engineers_office', 'pool_02_gallery', true);
    }
    // It never closes on someone standing in its doorway.
    if (plantDoor && inPlantWay()) plantDoor.holdOpen();
    // Through the plant room door, once its room is seen beyond it: handed
    // over to it, without a break.
    if (
      plantDoor &&
      spec.plantDoor &&
      plantRoom &&
      plantSeen &&
      !leavingForPlant &&
      !walk.following
    ) {
      const x = walk.walker.x / metre;
      const z = walk.walker.z / metre;
      if (
        (spec.plantDoor.wall === 'west'
          ? x < -spec.w / 2 - 0.05
          : x > spec.w / 2 + 0.05) &&
        Math.abs(z - spec.plantDoor.z) < PLANT_DOORWAY / 2
      ) {
        leavingForPlant = true;
        enterDevRoom(plantRoom, loopRoom as RoomId, true);
      }
    }
    if (poolside) {
      const w = world.world.value;
      const pool = w.pools[id];
      const room = `plant_${id}` as const;
      const flowing = pool.flow > 0.1;
      poolside.state.power = serviceAvailable(w.plant, room, 'power');
      const reading = (
        field: 'water' | 'ph' | 'free' | 'redox' | 'air' | 'humidity',
        value: number,
      ) => {
        if (flowing || field === 'air' || field === 'humidity')
          poolside.state.readings[field] = { value, at: w.time };
      };
      reading('water', pool.temperature);
      reading('ph', pool.ph);
      reading('free', pool.freeChlorine);
      reading('redox', pool.redox);
      reading('air', pool.temperature - 1.5);
      reading('humidity', serviceAvailable(w.plant, room, 'air') ? 55 : 68);
      if (poolside.state.readings.combined.value === null)
        poolside.state.readings.combined = {
          value: pool.combinedChlorine,
          at: w.time,
        };
      const date = new Date();
      const seconds =
        date.getHours() * 3600 +
        date.getMinutes() * 60 +
        date.getSeconds() +
        date.getMilliseconds() / 1000;
      poolside.state.clock = seconds;
      for (const sign of poolside.signs) {
        sign.show(poolside.state, w.time);
        sign.update(w.time);
      }
      poolside.clock?.update();
    }
    // Where the walker is in the loop's corridors: what to load, and when
    // to hand over (`loopStep`). Not while it follows another room's eye.
    if (!walk.following && !handing) {
      const r = loopStep(
        loopRoom,
        walk.walker.x / metre,
        walk.walker.z / metre,
        loading,
        seen,
      );
      loading = r.state;
      if (r.handTo) {
        handing = true;
        enterDevRoom(r.handTo, loopRoom, true);
      }
    }
    if (visual) {
      film.uniforms.time.value = (time / 1000) % 100;
      composer.render(delta);
    }
  });
  return Object.assign(
    () => {
      renderer.setAnimationLoop(null);
      for (const w of withdraw) w();
      observer.disconnect();
      composer.dispose();
      walk.dispose();
      poolside?.clock?.dispose();
      if (spaTub && 'object' in spaTub) spaTub.dispose?.();
      if (spaPanel && 'object' in spaPanel) {
        spaPanel.parts?.dispose();
        plantDoor?.dispose();
        spaPanel.dispose?.();
      }
      officeDoor?.dispose();
      officeReader?.dispose();
      for (const material of poolsideKit.materials) material.dispose();
      for (const texture of poolsideKit.textures) texture.dispose();
      rooms.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      renderer.dispose();
    },
    {
      setVisual(enabled: boolean) {
        visual = enabled;
      },
      // Shown again (walked back into): ready to hand on once more.
      resume() {
        handing = false;
        leavingForPlant = false;
        leavingForOffice = false;
      },
    },
  );
}
