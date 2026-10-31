import {
  AmbientLight,
  Group,
  HemisphereLight,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
} from 'three';
import type { Object3D } from 'three';
import { METRE } from '../../components/core/logic/units';
import {
  createPanelKit,
  disposeKit,
} from '../../components/core/views/eighties-controls';
import { createSectionBoard } from '../../components/core/views/signage';
import { tools } from '../../components/core/views/fitting-tools';
import {
  createRenderer,
  useEnvironment,
  layoutSize,
} from '../../components/core/parts/render-style';
import { createFirstPerson } from '../../controls/input/first-person';
import { CHALLENGES } from '../../../game/plant/museum-4-cards';
import {
  cardWords,
  canDose,
  doseGame,
  dosesLeft,
  newGame,
  resetGame,
  scenarioView,
  startCard,
  stepGame,
  toFreePlay,
} from '../../../game/plant/museum-4-challenge';
import type { Hall4Game } from '../../../game/plant/museum-4-challenge';
import {
  CYCLED_STATES,
  DEMO_STATES,
  demoCloseness,
  demoView,
} from '../logic/dosing-console';
import { gameCloseness } from '../logic/water-closeness';
import { CELEBRATION_SECONDS } from '../logic/console-celebration';
import type { DemoState } from '../logic/dosing-console';
import { createConsoleSounds } from '../views/console-sounds';
import { createDosingConsole, CONSOLE } from '../views/dosing-console';

/** The room inside, metres. */
const ROOM = { w: 8, d: 7, h: 3.4, wall: 0.2 };
/** Real seconds each demonstration state shows with `?console=cycle`. */
const CYCLE = 4;
/** Real seconds a narration's words stay on the scenario screen (about as long as it is read). */
const CAPTION_SECONDS = 20;

/**
 * Dev57, the dosing console (mission 113; the owner, 2026-10-31): Hall 4's
 * new console alone in a plain room, its three Aero touch screens on their
 * stand (DOSE a glossy button on the dose screen), driven by the real challenge engine (free play and the
 * first eight cards, the lab at 1,000×). `?console=free|challenge|holding|won|out`
 * shows the scenario screen in that state instead, `?console=celebrate|commiserate`
 * plays the won or lost celebration over all three screens every few seconds, `?console=cycle` cycles
 * them every four seconds; `?view=screens|scenario|chemical|dose` frames it.
 */
export function startDosingConsoleRoom(canvas: HTMLCanvasElement) {
  const m = METRE;
  const params = new URLSearchParams(location.search);
  const scene = new Scene();
  const renderer = createRenderer(canvas);
  const freeEnvironment = useEnvironment(renderer, scene, 0.45);
  const camera = new PerspectiveCamera(60, 1, 0.05, 40 * m);
  const kit = createPanelKit();
  const t = tools(kit);
  const room = new Group();
  room.scale.setScalar(m);
  scene.add(room);
  scene.add(new HemisphereLight('#f4f7fa', '#5d5a55', 1.5));
  scene.add(new AmbientLight('#ffffff', 0.4));
  const lamp = new PointLight('#fff6e8', 8, 10 * m, 2);
  lamp.position.set(0, (ROOM.h - 0.3) * m, 1 * m);
  scene.add(lamp);

  // ---- The room ---------------------------------------------------------------
  const { w, d, h, wall } = ROOM;
  const plaster = t.paint('#dfe3e4', 0.9);
  t.box(
    room,
    t.paint('#7e8a8f', 0.85),
    w + 2 * wall,
    wall,
    d + 2 * wall,
    0,
    -wall / 2,
    0,
  );
  t.box(room, plaster, w + 2 * wall, wall, d + 2 * wall, 0, h + wall / 2, 0);
  t.box(room, plaster, w + 2 * wall, h, wall, 0, h / 2, -d / 2 - wall / 2);
  t.box(room, plaster, w + 2 * wall, h, wall, 0, h / 2, d / 2 + wall / 2);
  t.box(room, plaster, wall, h, d, -w / 2 - wall / 2, h / 2, 0);
  t.box(room, plaster, wall, h, d, w / 2 + wall / 2, h / 2, 0);
  const sign = createSectionBoard(kit, 'DEV57 · THE DOSING CONSOLE', 4);
  sign.position.set(0, 2.7, -d / 2 + 0.03);
  room.add(sign);

  // ---- The console and its engine -------------------------------------------------
  let game: Hall4Game = newGame();
  const asked = params.get('console');
  const demo: DemoState | 'cycle' | null =
    asked === 'cycle' || DEMO_STATES.includes(asked as DemoState)
      ? (asked as DemoState | 'cycle')
      : null;
  let clock = 0;
  const demoState = (): DemoState =>
    demo === 'cycle'
      ? CYCLED_STATES[Math.floor(clock / CYCLE) % CYCLED_STATES.length]
      : (demo ?? 'free');
  let caption: {
    kind: 'briefing' | 'clue' | 'explanation';
    text: string;
  } | null = null;
  let seenSeq = 0;
  let captionLeft = 0;
  // The console's Aero sounds, from the console (`logic/console-sounds`).
  const sounds = createConsoleSounds(() => desk.group);
  const desk = createDosingConsole(kit, {
    sound: sounds.play,
    titles: CHALLENGES.map((c) => c.title),
    scenario: () => (demo ? demoView(demoState()) : scenarioView(game)),
    closeness: () => (demo ? demoCloseness(demoState()) : gameCloseness(game)),
    caption: () => (demo ? null : caption),
    left: () =>
      demo
        ? demoState() === 'free'
          ? null
          : demoState() === 'challenge'
            ? 2
            : 1
        : game.card
          ? dosesLeft(game)
          : null,
    ready: () => (demo ? demoState() !== 'out' : canDose(game)),
    effect: (e) => {
      if (demo) return;
      if (e.type === 'start')
        game = startCard(game, CHALLENGES[e.card], e.level);
      else if (e.type === 'reset') game = resetGame(game);
      else if (e.type === 'retry' && game.card)
        game = startCard(game, game.card, game.level);
      else game = toFreePlay(game);
    },
    dose: (tank, size) => {
      if (demo || !canDose(game)) return false;
      game = doseGame(game, tank, size);
      return true;
    },
  });
  desk.group.position.set(0, 0, 0);
  room.add(desk.group);
  const touchSet = new Set<Object3D>(desk.touchables);

  // ---- Walking and touching ---------------------------------------------------------
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const touchAt = (x: number, y: number) => {
    raycaster.setFromCamera(pointer.set(x, y), camera);
    const hit = raycaster.intersectObject(room, true)[0];
    if (!hit || hit.distance > 2.5 * m || !touchSet.has(hit.object))
      return null;
    return hit;
  };
  const views: Record<
    string,
    { x: number; z: number; yaw: number; pitch: number }
  > = {
    room: { x: 0, z: 2.6 * m, yaw: 0, pitch: -0.25 },
    screens: { x: 0, z: 1.49 * m, yaw: 0, pitch: -0.42 },
    scenario: { x: -0.72 * m, z: 0.86 * m, yaw: 0, pitch: -0.62 },
    chemical: { x: 0, z: 0.86 * m, yaw: 0, pitch: -0.62 },
    dose: { x: 0.72 * m, z: 0.86 * m, yaw: 0, pitch: -0.62 },
  };
  const half = (s: number) => (s / 2) * m;
  const walk = createFirstPerson({
    scene,
    canvas,
    camera,
    metre: m,
    floorY: 0,
    objects: scene,
    start: views[params.get('view') ?? ''] ?? views.room,
    solids: () => [
      { minX: -half(w) - m, maxX: -half(w), minZ: -half(d), maxZ: half(d) },
      { minX: half(w), maxX: half(w) + m, minZ: -half(d), maxZ: half(d) },
      { minX: -half(w), maxX: half(w), minZ: -half(d) - m, maxZ: -half(d) },
      { minX: -half(w), maxX: half(w), minZ: half(d), maxZ: half(d) + m },
      {
        minX: -half(CONSOLE.w),
        maxX: half(CONSOLE.w),
        minZ: -half(CONSOLE.d),
        maxZ: half(CONSOLE.d),
      },
    ],
    use: (x, y) => {
      const hit = touchAt(x, y);
      if (hit) desk.touch(hit.object, hit.uv);
    },
    aimed: () => {
      const hit = touchAt(0, 0);
      return Boolean(hit && desk.aimed(hit.object, hit.uv));
    },
  });
  const resize = () => {
    const { width, height } = layoutSize(canvas);
    if (!width || !height) return;
    renderer.setSize(Math.round(width), Math.round(height), false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  Object.assign(window, {
    dev57: {
      get game() {
        return game;
      },
      console: desk,
      /** Touch a screen region by id, for checks: `dev57.press('row-2')`. */
      press: (id: string) => desk.press(id),
      /** Touch DOSE on the dose screen (only once a chemical and a size are picked). */
      dose: () => desk.press('dose'),
    },
  });

  // ---- Each frame --------------------------------------------------------------------
  let last = 0;
  let encore = 0.5;
  renderer.setAnimationLoop((time) => {
    if (canvas.parentElement?.hidden) {
      last = 0;
      return;
    }
    const delta = last ? Math.min(0.1, (time - last) / 1000) : 0;
    last = time;
    clock += delta;
    if (!demo) {
      game = stepGame(game, delta);
      sounds.watch(game);
      const n = game.narration;
      if (n && n.seq !== seenSeq && game.card) {
        seenSeq = n.seq;
        caption = {
          kind: n.kind,
          text: cardWords(game.card, n.kind, game.level),
        };
        // The explanation waits under the celebration, then shows its full time.
        captionLeft =
          CAPTION_SECONDS +
          (n.kind === 'explanation' ? CELEBRATION_SECONDS.won : 0);
      }
      captionLeft -= delta;
      if (!game.card || captionLeft <= 0) caption = null;
    }
    // The celebration demonstrations: again, two seconds after each ends.
    if (demo === 'celebrate' || demo === 'commiserate') {
      encore -= delta;
      if (!desk.celebrating && encore <= 0) {
        const kind = demo === 'celebrate' ? 'won' : 'lost';
        desk.celebrate(kind);
        sounds.play(kind);
        encore = CELEBRATION_SECONDS[kind] + 2;
      }
    }
    walk.update(delta);
    desk.update(delta);
    renderer.render(scene, camera);
  });
  const dispose = () => {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    walk.dispose();
    disposeKit(kit, scene as unknown as Group);
    freeEnvironment();
    renderer.dispose();
  };
  return Object.assign(dispose, {
    enter() {
      const view =
        views[new URLSearchParams(location.search).get('view') ?? ''];
      if (view) walk.place(view.x, view.z, view.yaw, view.pitch);
    },
  });
}
