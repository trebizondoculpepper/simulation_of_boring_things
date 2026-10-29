import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Raycaster,
  Scene,
  SpotLight,
  Vector2,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { partAudio } from '../../components/core/audio/part-audio';
import { markFrontCentre } from '../../components/core/audio/front-centre';
import { devWalls } from '../logic/dev-room-links';
import {
  CARD_DESIGNATIONS,
  EXPANSION_CARD_KINDS,
} from '../../components/industrial-control/logic/machine-components';
import { METRE } from '../../components/core/logic/units';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createSectionBoard } from '../../components/core/views/signage';
import {
  createPanelKit,
  disposeKit,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { createFirstPerson } from '../../controls/input/first-person';
import { machineComponent } from '../../components/industrial-control/parts/machine-components';
import { createPartSet } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
} from '../../components/core/parts/render-style';
import { bannerLine } from '../logic/skimmer-reveal';
import {
  cinematicFrame,
  lidPose,
  pickAnother,
} from '../logic/skimmer-cinematic';
import type { CinematicPhase, Pose } from '../logic/skimmer-cinematic';
import { createSkimmerCaustics } from '../views/skimmer-caustics';
import { createSkimmerWell, drawOver } from '../views/skimmer-well';
import { revealCue } from './museum/hall-5-reveal-music';

const FLOOR = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 };
const CEILING = 3;
/** The skimmer, in the deck by the pool's edge. */
const SK = { x: 0, z: -1.9 };
/** The pool's edge, metres north. */
const EDGE = -2.6;
/** The find shown: its size across and how far before the eye, metres. */
const REVEAL_SIZE = 0.24;
const REVEAL_AHEAD = 0.5;
const SANS = 'Arial, Helvetica, sans-serif';
const GOLD = '#ffc44a';

/** A seeded random number generator (mulberry32). */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dev53, the skimmer reveal: Hall 5's skimmer as a film, tried on its own
 * (the owner, 2026-10-29). Use the lid and it comes off with gold
 * caustics rising from the rim; the camera orbits the skimmer, sinking,
 * through the suspense cue; a jump cut to a look diagonally up, the
 * big-item cue, and a Pepperdyne card chosen at random turning above
 * with its banner; then back to where the walker stood as the lid goes
 * back on (`logic/skimmer-cinematic.ts`). By its URL only.
 */
export function startSkimmerRevealRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.35);
  renderer.setClearColor('#0b0c0d');
  const camera = new PerspectiveCamera(62, 1, 0.02, 80 * m);
  scene.add(new AmbientLight('#e4e6ea', 0.35));
  scene.add(new HemisphereLight('#dfe8ee', '#3a3a36', 0.45));
  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  const parts = createPartSet();
  const random = seeded(53);

  // ---- The room: a dry poolside, the water painted ------------------------
  const W = FLOOR.maxX - FLOOR.minX;
  const D = FLOOR.maxZ - FLOOR.minZ;
  const deck = new Mesh(new PlaneGeometry(W, D), kitPaint(kit, '#c9c2b2'));
  deck.rotation.x = -Math.PI / 2;
  room.add(deck);
  const water = new Mesh(
    new PlaneGeometry(W, EDGE - FLOOR.minZ),
    kitPaint(kit, '#4f9fc4'),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.002, (FLOOR.minZ + EDGE) / 2);
  room.add(water);
  t.box(room, t.paint('#f1efe8', 0.4), W, 0.02, 0.3, 0, 0.01, EDGE + 0.15);
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
  const wallPaint = kitPaint(kit, '#3d4a52');
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
  const sign = createSectionBoard(kit, 'THE SKIMMER REVEAL', 4.4);
  sign.position.set(0, 2.3, FLOOR.maxZ - 0.154);
  sign.rotation.y = Math.PI;
  room.add(sign);
  const light = new SpotLight('#fff3e2', 14 * m * m, 0, 0.5, 0.6, 2);
  light.position.set(SK.x * m, (CEILING - 0.1) * m, (SK.z + 0.8) * m);
  light.target.position.set(SK.x * m, 0, SK.z * m);
  scene.add(light, light.target);

  // ---- The skimmer: a hole in the deck, its basket, its lid ---------------
  // The well is painted over the flat deck where its opening is seen
  // (`skimmer-well.ts`); the lid is drawn after it.
  const certikind = t.paint('#f2f1ec', 0.45);
  const dark = t.paint('#15191b', 0.9);
  const skimmer = new Group();
  skimmer.position.set(SK.x, 0, SK.z);
  room.add(skimmer);
  const well = createSkimmerWell();
  skimmer.add(well.group);
  const caustics = createSkimmerCaustics({ radius: 0.135, random });
  skimmer.add(caustics.mesh);
  const goldLight = new PointLight(GOLD, 0, 3 * m, 2);
  goldLight.position.set(SK.x * m, 0.35 * m, SK.z * m);
  scene.add(goldLight);
  const lid = new Group();
  lid.name = 'Skimmer lid';
  t.cyl(lid, certikind, 0.125, 0.012, 0, 0.006, 0, 'y', 32);
  t.cyl(lid, dark, 0.012, 0.013, -0.05, 0.006, 0, 'y', 12);
  t.cyl(lid, dark, 0.012, 0.013, 0.05, 0.006, 0, 'y', 12);
  t.label(lid, 'CERTIKIND', 0, 0.0125, 0.07, 0.016, '#5a6266').rotation.x =
    -Math.PI / 2;
  drawOver(lid);
  skimmer.add(lid);
  const placeLid = (k: number) => {
    const p = lidPose(k);
    lid.position.set(p.x, p.y, 0);
    lid.rotation.z = p.tilt;
  };

  // ---- The finds: the Pepperdyne cards, one at random each time -----------
  const finds = EXPANSION_CARD_KINDS.map((kind) => {
    const device = parts.add(machineComponent(kit, kind));
    const pivot = new Group();
    device.object.updateMatrixWorld(true);
    const box = new Box3().setFromObject(device.object);
    // Turning about its own middle.
    device.object.position.sub(box.getCenter(new Vector3()));
    pivot.add(device.object);
    pivot.visible = false;
    room.add(pivot);
    const size = box.getSize(new Vector3());
    return {
      pivot,
      across: Math.max(size.x, size.y, size.z),
      name: CARD_DESIGNATIONS[kind].name,
    };
  });
  let lastFind = -1;
  const banner = t.printed(0.42, 0.11, () => {}, 1024, true);
  banner.mesh.name = 'Reveal banner';
  banner.mesh.renderOrder = 10;
  for (const material of [banner.mesh.material].flat() as Material[]) {
    material.depthTest = false;
    material.transparent = true;
  }
  banner.mesh.visible = false;
  room.add(banner.mesh);
  const drawBanner = (name: string) => {
    const c = banner.context;
    const { width: w, height: h } = c.canvas;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(10,16,40,0.86)';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e8c45a';
    c.lineWidth = h * 0.03;
    c.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h * 0.92);
    c.textAlign = 'center';
    c.fillStyle = '#ffe9a0';
    c.font = `bold ${h * 0.24}px ${SANS}`;
    c.fillText(bannerLine(`a ${name.toUpperCase()}`), w / 2, h * 0.42, w * 0.9);
    c.fillStyle = '#ffffff';
    c.font = `${h * 0.15}px ${SANS}`;
    c.fillText(
      'A Pepperdyne card. Nobody knows how it got in there.',
      w / 2,
      h * 0.72,
      w * 0.88,
    );
    banner.texture.needsUpdate = true;
  };
  const voice = new Group();
  markFrontCentre(voice);
  room.add(voice);

  // ---- The film ---------------------------------------------------------------
  let film: {
    t: number;
    start: Pose;
    from: { x: number; z: number; yaw: number; pitch: number };
    find: number;
    phase: CinematicPhase;
  } | null = null;
  const skimmerAt = new Vector3(SK.x * m, 0, SK.z * m);
  const play = () => {
    if (film) return;
    const pose = walk.pose();
    const find = pickAnother(finds.length, lastFind, random);
    lastFind = find;
    film = {
      t: 0,
      start: {
        x: (pose.x - skimmerAt.x) / m,
        y: pose.y / m,
        z: (pose.z - skimmerAt.z) / m,
        yaw: pose.yaw,
        pitch: pose.pitch,
      },
      from: {
        x: walk.walker.x,
        z: walk.walker.z,
        yaw: pose.yaw,
        pitch: pose.pitch,
      },
      find,
      phase: 'suspense',
    };
    walk.hold(true);
    drawBanner(finds[find].name);
    partAudio.play(revealCue('reveal-suspense'), voice);
  };
  const stepFilm = (delta: number, time: number) => {
    if (!film) return false;
    film.t += delta;
    const f = cinematicFrame(film.t, film.start);
    const find = finds[film.find];
    if (f.phase !== film.phase) {
      film.phase = f.phase;
      if (f.phase === 'reveal')
        partAudio.play(revealCue('reveal-big-item'), voice);
      // Back where the walker stood, held while the lid goes on.
      if (f.phase === 'replace') {
        const { x, z, yaw, pitch } = film.from;
        walk.place(x, z, yaw, pitch);
      }
    }
    placeLid(f.lid);
    caustics.update(time, f.rise, f.glow);
    well.glow(f.glow);
    goldLight.intensity = 2.5 * m * m * f.glow;
    find.pivot.visible = f.size > 0;
    banner.mesh.visible = f.banner;
    if (f.phase === 'done') {
      film = null;
      walk.hold(false);
      return false;
    }
    if (!f.eye) return false;
    const e = f.eye;
    camera.position.set(skimmerAt.x + e.x * m, e.y * m, skimmerAt.z + e.z * m);
    camera.lookAt(
      camera.position.x + Math.sin(e.yaw) * Math.cos(e.pitch),
      camera.position.y + Math.sin(e.pitch),
      camera.position.z - Math.cos(e.yaw) * Math.cos(e.pitch),
    );
    camera.updateMatrixWorld();
    if (f.size > 0 && f.rest) {
      // Where the whip comes to rest, before the eye: the camera swings
      // onto it, past it a little, and back.
      const r = f.rest;
      const at = new Vector3(
        SK.x + r.x + Math.sin(r.yaw) * Math.cos(r.pitch) * REVEAL_AHEAD,
        r.y + Math.sin(r.pitch) * REVEAL_AHEAD + 0.02,
        SK.z + r.z - Math.cos(r.yaw) * Math.cos(r.pitch) * REVEAL_AHEAD,
      );
      find.pivot.position.copy(at);
      find.pivot.rotation.set(0, f.spin, 0);
      find.pivot.scale.setScalar((REVEAL_SIZE / find.across) * f.size);
    }
    if (f.banner) {
      const b = camera.localToWorld(new Vector3(0, -0.13 * m, -0.5 * m));
      banner.mesh.position.copy(room.worldToLocal(b));
      banner.mesh.quaternion.copy(camera.quaternion);
    }
    return true;
  };

  // ---- Walking and working ------------------------------------------------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const usableAt = (x: number, y: number) => {
    if (film) return null;
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(skimmer, true)[0];
    if (!hit || hit.distance > 3 * m) return null;
    return play;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 2.5 * m, yaw: 0, pitch: -0.2 },
    // Just south of the skimmer, looking down at it.
    skimmer: { x: SK.x * m, z: (SK.z + 1.2) * m, yaw: 0, pitch: -0.85 },
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: views[params.get('view') ?? ''] ?? views.skimmer,
    solids: () => outer,
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
  (window as unknown as { devSkimmer: unknown }).devSkimmer = {
    view(name: string) {
      const pose = views[name];
      if (pose) walk.place(pose.x, pose.z, pose.yaw, pose.pitch);
    },
    /** Pull the lid, as a use on it does. */
    play,
    /** Jump the film to `t` seconds in, pulling the lid first if need be. */
    seek(t: number) {
      play();
      if (film) film.t = t;
    },
    /** Where the film is: its phase and time, or null. */
    film: () => (film ? { phase: film.phase, t: film.t } : null),
  };

  // ---- Each frame ----------------------------------------------------------
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    if (!stepFilm(delta, time / 1000)) walk.update(delta);
    parts.update(delta);
    partAudio.listen(camera, m, scene);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    parts.dispose();
    caustics.dispose();
    well.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
    delete (window as unknown as { devSkimmer?: unknown }).devSkimmer;
  };
  return Object.assign(dispose, {
    enter() {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) walk.place(view.x, view.z, view.yaw, view.pitch);
    },
    suspend: () => parts.setAudible(false),
    resume: () => parts.setAudible(true),
  });
}
