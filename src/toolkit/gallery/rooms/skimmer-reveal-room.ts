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
import { createPartSet } from '../../components/core/parts/parts';
import { ps1Uniforms } from '../../components/core/parts/ps1-material';
import {
  createRenderer,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';
import { bannerLine, fanfareOf } from '../logic/skimmer-reveal';
import { filmStep, skimmerFilmUrl } from '../logic/skimmer-film-url';
import {
  LENS_50_FOV,
  cinematicFrame,
  lidPose,
  pickFind,
} from '../logic/skimmer-cinematic';
import type { CinematicPhase, Pose } from '../logic/skimmer-cinematic';
import { createSkimmerCaustics } from '../views/skimmer-caustics';
import { createBinTossing } from '../../components/site-dressing/parts/bin-tossing';
import { createSkip } from '../../components/site-dressing/views/skip';
import { createSkimmerWell, drawOver } from '../views/skimmer-well';
import { revealCue } from './museum/hall-5-reveal-music';
import { createFindProps } from './museum/hall-5-finds';
import { FINDS } from '../logic/museum-5-skimmer';
import { EXTRA_FINDS } from '../logic/skimmer-extras';
import { createExtraFinds } from './museum/hall-5-extra-finds';
import { createPortableBoard } from '../../controls/logic/portable-board';
import { createDropProfile } from '../../controls/logic/drop-profile';
import type { PortableObject } from '../../controls/input/object-handling';

const FLOOR = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 };
const CEILING = 3;
/** The skimmer, in the deck by the pool's edge. */
const SK = { x: 0, z: -1.9 };
/** The skip, across the deck from the skimmer, by the east wall. */
const SKIP = { x: 3, z: 1.8 };
/** The pool's edge, metres north. */
const EDGE = -2.6;
/** The find shown: its size across and how far before the eye, metres. */
const REVEAL_SIZE = 0.24;
const REVEAL_AHEAD = 0.9;
/** Held, as Hall 5's are: a little larger than life (its `FIND_SCALE`). */
const FIND_SCALE = 1.6;
/** The field of view the banner's place is set for, degrees: it keeps its size on screen through the zoom. */
const BANNER_FOV = 62;
const SANS = 'Arial, Helvetica, sans-serif';
/** A find the film can show: its banner's words, its caption, and a fresh one of it (null while its model loads). */
interface Find {
  id: string;
  got: string;
  caption: string;
  prop: () => Group | null;
}
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
 * big-item cue, and one of Hall 5's finds chosen at random turning above
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
  // Its throat runs back under the deck to beyond the pool's edge.
  const well = createSkimmerWell({ reach: SK.z - EDGE + 0.1, random });
  well.sludge(true);
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

  // ---- The finds: Hall 5's, one at random each time ------------------------
  // Each film's is a fresh one (`hall-5-finds.ts`), shown turning, then
  // handed over: a portable thing, to be carried off or dropped.
  // Hall 5's six and the further finds on trial (`skimmer-extras.ts`),
  // these from models still loading at first.
  const propOf = createFindProps(t, kit.materials);
  const extras = createExtraFinds(t);
  const POOL: readonly Find[] = [
    ...FINDS.map((f) => ({ ...f, prop: () => propOf(f.id) })),
    ...EXTRA_FINDS.map((f) => ({ ...f, prop: () => extras.propOf(f) })),
  ];
  /** The next film's find, by id, chosen (`devSkimmer.choose`), or null for chance. */
  let nextFind: string | null = null;
  /** Every find shown so far, for those that come only after another (`pickFind`). */
  const found = new Set<string>();
  /** How many films have run, for the cues' turns (`fanfareOf`). */
  let films = 0;
  const makeFind = (find: Find, prop: Group) => {
    const pivot = new Group();
    prop.updateMatrixWorld(true);
    const box = new Box3().setFromObject(prop);
    const size = box.getSize(new Vector3());
    // Turning about its own middle.
    prop.position.sub(box.getCenter(new Vector3()));
    pivot.add(prop);
    pivot.visible = false;
    room.add(pivot);
    const component = createPortableBoard(
      createDropProfile(
        'flat',
        Math.max(size.x, size.y, size.z, 0.02) * FIND_SCALE,
        'plastic',
      ),
    );
    return {
      prop,
      component,
      pivot,
      across: Math.max(size.x, size.y, size.z, 0.02),
      find,
    };
  };
  type Shown = ReturnType<typeof makeFind>;
  /** Out of the pivot and into the walker's hands, as Hall 5 shows it. */
  const handOver = (shown: Shown) => {
    const { prop, pivot, component } = shown;
    // Only now a thing to carry: shown, it is not to be grabbed.
    prop.userData.portable = {
      component,
      flat: 'upright',
      detach() {},
    } satisfies PortableObject;
    pivot.remove(prop);
    pivot.removeFromParent();
    prop.position.copy(pivot.position);
    prop.rotation.set(0, 0, 0);
    prop.scale.setScalar(FIND_SCALE);
    room.add(prop);
    if (!walk.hands?.give(prop)) prop.removeFromParent();
  };
  let lastFind = -1;
  const banner = t.printed(0.42, 0.13, () => {}, 1024, true);
  banner.mesh.name = 'Reveal banner';
  banner.mesh.renderOrder = 10;
  for (const material of [banner.mesh.material].flat() as Material[]) {
    material.depthTest = false;
    material.transparent = true;
  }
  banner.mesh.visible = false;
  room.add(banner.mesh);
  const drawBanner = (find: Find) => {
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
    c.fillText(bannerLine(find.got), w / 2, h * 0.34, w * 0.9);
    c.fillStyle = '#ffffff';
    c.font = `${h * 0.12}px ${SANS}`;
    // Its caption, in up to three lines.
    const lines: string[] = [];
    for (const word of find.caption.split(' ')) {
      const line = lines.length ? `${lines[lines.length - 1]} ${word}` : word;
      if (lines.length && c.measureText(line).width <= w * 0.88)
        lines[lines.length - 1] = line;
      else lines.push(word);
    }
    lines
      .slice(0, 3)
      .forEach((l, n) => c.fillText(l, w / 2, h * (0.56 + n * 0.14), w * 0.9));
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
    find: Shown;
    phase: CinematicPhase;
    /** The walker's own field of view, degrees, to zoom from and back to. */
    fov: number;
  } | null = null;
  const skimmerAt = new Vector3(SK.x * m, 0, SK.z * m);
  /** The film held still where it is (`devSkimmer.seek`), for a look. */
  let frozen = false;
  /** `?skimmer=reveal`, `filmSpeed`, `filmFps` (`skimmer-film-url.ts`). */
  const filmUrl = skimmerFilmUrl(location.search);
  let autoPlayed = false;
  const play = () => {
    if (film) return;
    // Whatever was in hand goes back in the skimmer.
    const held = walk.hands?.holding();
    if (held) {
      walk.hands!.forget(held);
      (
        held.userData.portable as PortableObject | undefined
      )?.component.dispose();
      held.removeFromParent();
    }
    const pose = walk.pose();
    const chosen = POOL.findIndex((f) => f.id === nextFind);
    nextFind = null;
    let pick =
      chosen >= 0
        ? chosen
        : pickFind(
            POOL.map((f) => f.id),
            lastFind,
            found,
            random,
          );
    // One whose model is still loading gives way to the first of the hall's.
    let prop = POOL[pick].prop();
    if (!prop) {
      pick = 0;
      prop = POOL[0].prop()!;
    }
    lastFind = pick;
    found.add(POOL[pick].id);
    const find = makeFind(POOL[pick], prop);
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
      fov: camera.fov,
    };
    walk.hold(true);
    // Full again: whatever comes out comes out of the sludge.
    well.sludge(true);
    drawBanner(find.find);
    partAudio.play(revealCue('reveal-suspense'), voice);
  };
  /** The film's field of view now, degrees, or null for the walker's own. */
  let lens: number | null = null;
  const useLens = () => {
    if (lens === null || camera.fov === lens) return;
    camera.fov = lens;
    camera.updateProjectionMatrix();
  };
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const stepFilm = (delta: number, time: number) => {
    if (!film) return false;
    if (!frozen) film.t += filmStep(filmUrl, delta);
    const f = cinematicFrame(film.t, film.start);
    const find = film.find;
    lens = f.phase === 'done' ? null : lerp(film.fov, LENS_50_FOV, f.zoom);
    useLens();
    if (f.phase !== film.phase) {
      film.phase = f.phase;
      // The find out, the sludge with it: the basket left clean.
      if (f.phase === 'reveal') {
        partAudio.play(revealCue(fanfareOf(film.find.find.id, films++)), voice);
        well.sludge(false);
      }
      // Back where the walker stood, looking at the skimmer as the lid
      // goes on, the find in hand.
      if (f.phase === 'replace') {
        const { x, z, yaw, pitch } = film.from;
        walk.place(x, z, yaw, pitch);
        handOver(find);
      }
    }
    placeLid(f.lid);
    caustics.update(time, f.rise, f.glow);
    well.glow(f.glow);
    goldLight.intensity = 1.2 * m * m * f.glow;
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
      // As far off as keeps its size and place on screen through the zoom.
      const k =
        Math.tan(((BANNER_FOV / 2) * Math.PI) / 180) /
        Math.tan(((camera.fov / 2) * Math.PI) / 180);
      const b = camera.localToWorld(new Vector3(0, -0.13 * m, -0.5 * m * k));
      banner.mesh.position.copy(room.worldToLocal(b));
      banner.mesh.quaternion.copy(camera.quaternion);
    }
    return true;
  };

  // ---- The skip, for throwing finds away (`bin-tossing.ts`) ---------------
  const tossing = createBinTossing({ camera, metre: m, random });
  const skip = tossing.add({ name: 'skip', ...createSkip(kit), ...SKIP });
  room.add(skip.group);

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
    // Over the skimmer's south edge, looking down into it.
    into: { x: SK.x * m, z: (SK.z + 0.55) * m, yaw: 0, pitch: -1.2 },
  };
  const params = new URLSearchParams(location.search);
  const walk = createFirstPerson({
    scene,
    nearbyTargetFeedback: tossing.targetFeedback,
    divert: tossing.divert,
    // Nothing is picked up while the film runs.
    allowPickup: () => !film,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: views[params.get('view') ?? ''] ?? views.skimmer,
    solids: () => [
      ...outer,
      ...tossing.bins.map((bin) => ({
        minX: (bin.x - bin.footprint.x / 2 - 0.05) * m,
        maxX: (bin.x + bin.footprint.x / 2 + 0.05) * m,
        minZ: (bin.z - bin.footprint.z / 2 - 0.05) * m,
        maxZ: (bin.z + bin.footprint.z / 2 + 0.05) * m,
      })),
    ],
    use: (x, y) => usableAt(x, y)?.(),
    aimed: () => Boolean(usableAt(0, 0)),
  });
  const resize = () => {
    const { width, height } = layoutSize(canvas);
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
    /** Lift the lid aside, or put it back, with no film: to look into the well. */
    peek(off = true) {
      if (!film) placeLid(off ? 1 : 0);
    },
    /** Jump the film to `t` seconds in, pulling the lid first if need be; `hold` to stop it there. */
    seek(t: number, hold = false) {
      play();
      if (film) film.t = t;
      frozen = hold;
    },
    /** Stand at (x, z) metres, facing `yaw`, looking `pitch` up. */
    place(x: number, z: number, yaw = 0, pitch = 0) {
      walk.place(x * m, z * m, yaw, pitch);
    },
    /** The basket dirty, full of sludge, or clean. */
    sludge: (dirty: boolean) => well.sludge(dirty),
    /** How many things are in the skip. */
    inSkip: () => skip.filled,
    /** Choose the next film's find, by id. */
    choose(id: string) {
      nextFind = id;
    },
    /** Every find the film can show, by id. */
    finds: () => POOL.map((f) => f.id),
    /** What the walker holds, by name, or null. */
    held: () => walk.hands?.holding()?.name ?? null,
    /** Where the film is: its phase and time, or null. */
    film: () => (film ? { phase: film.phase, t: film.t } : null),
  };

  // ---- Each frame ----------------------------------------------------------
  const eyeAt = new Vector3();
  let last = 0;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    ps1Uniforms.time.value = time / 1000;
    // `?skimmer=reveal`: the film at once, from where the walker stands.
    if (filmUrl.reveal && !autoPlayed && delta > 0) {
      autoPlayed = true;
      play();
    }
    if (!stepFilm(delta, time / 1000)) walk.update(delta);
    // The walker's controller sets its own field of view: the film's wins.
    useLens();
    well.seenFrom(skimmer.worldToLocal(eyeAt.copy(camera.position)));
    tossing.update(delta);
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
