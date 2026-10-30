import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  SpotLight,
  Vector3,
} from 'three';
import type { Camera } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { METRE } from '../../../components/core/logic/units';
import { WALL_PANEL_REACH, createWallPanel } from '../../views/museum-exhibit';
import { createGroutSpecimens } from '../../views/grout-specimen';
import { createOilWheelProjector } from '../../views/oil-wheel-projector';
import {
  BENCH,
  CLOSING_CARD,
  HALL7,
  INTRODUCTION,
  PLACES,
  PLINTH,
  PLINTHS,
  PROJECTOR,
  SPECIMEN,
  TITLE_WALL,
  approachedPlinth,
  approachLampAt,
  stepOf,
  yawOf,
  hall7Solids,
  MUSIC_LEVEL,
  lecternAt,
  musicFor,
} from '../../logic/museum-7-grout';
import { partAudio } from '../../../components/core/audio/part-audio';
import { recordedLoop } from '../../../components/core/audio/recorded-loop';
import type { GroutPlinth } from '../../logic/museum-7-grout';
import type { HallExhibit } from './exhibits';

/**
 * The era loops that exist (`resources/sound/music/grout/`, prompts in
 * `doc/prompts/art/grout-music.md`), by file name: a plinth whose file is
 * missing is simply silent, nothing fetched.
 */
const MUSIC = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../../../../resources/sound/music/grout/*.ogg', {
      eager: true,
      query: '?url',
      import: 'default',
    }) as Record<string, string>,
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]),
);
const MUSIC_PRESENT: ReadonlySet<string> = new Set(Object.keys(MUSIC));

/**
 * Hall 7, "Grout: The Unsung Hero of the Aquatics World" (107k): a
 * reverent, static gallery. Ten plinths in date order round its walls,
 * each with the same tiled specimen (one instanced model; the 1970s'
 * grout alone in avocado) and a plaque on a bronze lectern before it; in
 * a black box (the hall shell's, `isBlackBox`), a round spotlight over
 * each plinth, the title wall gilt high on the south wall. Nothing moves and nothing
 * resets: everything is drawn once and merged. In the hall's frame, metres
 * (the logic file has its plan).
 */

const SERIF = 'Georgia, "Times New Roman", serif';
const GILT = '#c9a54e';
const GROUND = '#141a22';

/** Wrap and fill `text` at `size` px, returning the y it ends at. */
function serifParagraph(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  style = '',
  align: CanvasTextAlign = 'left',
) {
  c.font = `${style} ${size}px ${SERIF}`.trim();
  c.textAlign = align;
  let line = '';
  const out: string[] = [];
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  for (const l of out) {
    c.fillText(l, x, y);
    y += size * 1.28;
  }
  return y;
}

/** The title wall's middle, metres up: 8 × 2.4 m, its top 1 m under the roof. */
const TITLE_Y = 7.3;
/** The spots' lamp heads, metres up. */
const LAMP_Y = 5.0;
/** Each plinth's pool of light on the floor: its radius to the outside of its fading edge, metres, and the share of its cone that fades. */
const POOL = { radius: 1.5, penumbra: 0.6 } as const;
/** Each pool's light. */
const POOL_POWER = 28 * METRE * METRE;
/**
 * The approach spot's light at full, on the plinth approached (the owner,
 * 2026-10-30). It was once only a little more in the round pool overhead,
 * too little to see, so it seemed never to switch on.
 */
const APPROACH_POWER = 90 * METRE * METRE;

/** A plaque's face, metres. */
const PLAQUE = { w: 0.6, h: 0.42 } as const;
/** How far the index number stands above the text's flow, metres (the owner, 2026-10-30). */
const INDEX_LIFT = 0.005;

function paintPlaque(
  c: CanvasRenderingContext2D,
  p: GroutPlinth,
  w: number,
  h: number,
) {
  c.fillStyle = '#efe7d3';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#7a5a26';
  c.lineWidth = w * 0.006;
  c.strokeRect(w * 0.02, w * 0.02, w - w * 0.04, h - w * 0.04);
  const m = w * 0.06;
  const width = w - 2 * m;
  // Shrink to fit: the plaques say what they must, however long.
  for (let scale = 1; scale > 0.5; scale -= 0.05) {
    c.fillStyle = '#efe7d3';
    c.fillRect(w * 0.03, w * 0.03, w - w * 0.06, h - w * 0.06);
    const s = (k: number) => h * k * scale;
    c.fillStyle = '#5b4520';
    let y = m + s(0.05);
    // The index number raised by `INDEX_LIFT`, the text after it where it was.
    const lift = (h * INDEX_LIFT) / PLAQUE.h;
    y = serifParagraph(c, `${p.n}`, m, y - lift, width, s(0.05), 'bold') + lift;
    c.fillStyle = '#1c1812';
    y = serifParagraph(c, p.name, m, y, width, s(0.07), 'bold');
    c.fillStyle = '#5b4520';
    y = serifParagraph(c, p.years, m, y, width, s(0.045), 'italic');
    y += s(0.02);
    c.fillStyle = '#1c1812';
    y = serifParagraph(c, p.what, m, y, width, s(0.04));
    y += s(0.015);
    y = serifParagraph(
      c,
      `In its favour: ${p.benefits.join(' ')}`,
      m,
      y,
      width,
      s(0.04),
    );
    y = serifParagraph(
      c,
      `Against it: ${p.drawbacks.join(' ')}`,
      m,
      y,
      width,
      s(0.04),
    );
    y += s(0.02);
    c.fillStyle = '#5b4520';
    y = serifParagraph(c, p.reverence, m, y, width, s(0.045), 'italic');
    if (y < h - m) return;
  }
}

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const object = new Group();
  object.name = 'Hall 7: Grout';
  const t = tools(kit);
  const still = (thing: Object3D) => {
    mergeTree(thing, () => false);
    return thing;
  };

  const { halfX, halfZ, h } = HALL7;
  const stone = t.paint('#3d4246', 0.85);
  const bronze = t.paint('#8a6a32', 0.4, 0.8);
  const wood = t.paint('#2a1c14', 0.7);

  // ---- The plinths; merged ----
  const row = new Group();
  const { w: pw, h: ph } = PLINTH;
  // Each plinth turned to face its visitor (a corner's, the middle).
  for (const p of PLINTHS) {
    const { x, z } = PLACES[p.n];
    const plinth = new Group();
    plinth.position.set(x, 0, z);
    plinth.rotation.y = yawOf(p.n);
    row.add(plinth);
    t.box(plinth, stone, pw, ph, pw, 0, ph / 2, 0);
    t.box(plinth, stone, pw + 0.08, 0.06, pw + 0.08, 0, 0.03, 0);
  }
  object.add(
    markComponent(still(row), {
      name: 'Ten plinths of grout in date order',
      decorative: true,
    }),
  );
  // ---- The specimens: one model, instanced, each facing its visitor ----
  const specimens = createGroutSpecimens(
    PLINTHS.map((p) => {
      const place = PLACES[p.n];
      return {
        matrix: new Matrix4()
          .makeTranslation(place.x, ph, place.z)
          .multiply(new Matrix4().makeRotationY(yawOf(p.n))),
        coloured: p.grout === 'avocado',
      };
    }),
    {
      tile: t.paint('#f3f3ee', 0.15),
      grout: t.paint('#9a9c98', 0.9),
      avocado: t.paint('#6f7d2c', 0.9),
      stone: t.paint('#565b5e', 0.8),
    },
  );
  object.add(
    markComponent(specimens.grey, {
      name: 'Grout specimen: white 150 mm tiles, 3 mm grey joints',
      decorative: true,
    }),
    markComponent(specimens.avocado, {
      name: 'Grout specimen: white 150 mm tiles, 3 mm avocado joints (the 1970s)',
      decorative: true,
    }),
  );

  // ---- The 1970s' oil-wheel projector, high before its plinth ----
  // (the owner, 2026-10-28: "high in the ceiling, focusing down on the
  // 1970s exhibit"): hung on a rod from the roof, aimed down at the
  // avocado specimen's tiled face.
  const seventiesN = PLINTHS.find((p) => p.grout === 'avocado')!.n;
  const seventies = PLACES[seventiesN];
  const [fx, fz] = stepOf(seventiesN);
  const projector = createOilWheelProjector(kit, {
    at: [PROJECTOR.x, PROJECTOR.y, PROJECTOR.z],
    mount: { ceiling: PROJECTOR.ceiling },
    target: [
      seventies.x + fx * SPECIMEN.tileThick,
      ph + 0.06 + SPECIMEN.size / 2,
      seventies.z + fz * SPECIMEN.tileThick,
    ],
    normal: [fx, 0, fz],
    width: SPECIMEN.size,
    height: SPECIMEN.size,
  });
  object.add(projector.object);

  // ---- The plaques, each on a bronze lectern before its plinth ----
  for (const p of PLINTHS) {
    const lectern = new Group();
    lectern.name = `Plaque: ${p.name}`;
    t.box(lectern, bronze, 0.3, 0.025, 0.24, 0, 0.0125, 0);
    t.box(lectern, bronze, 0.05, 0.85, 0.05, 0, 0.45, 0);
    const head = new Group();
    head.position.set(0, 0.95, -0.02);
    head.rotation.x = -0.65;
    lectern.add(head);
    t.box(head, bronze, 0.64, 0.46, 0.02, 0, 0, -0.011);
    // Its lettering drawn in full anywhere in the hall, so it is there to
    // read as the visitor arrives (the owner, 2026-10-30: it came too late).
    const face = t.printed(
      PLAQUE.w,
      PLAQUE.h,
      (c, w, hh) => paintPlaque(c, p, w, hh),
      768,
      false,
      WALL_PANEL_REACH,
    );
    face.mesh.position.z = 0.0005;
    head.add(face.mesh);
    // In its own frame the reader stands on +z; turn it to face its visitor.
    const at = lecternAt(p.n);
    lectern.position.set(at.x, 0, at.z);
    lectern.rotation.y = yawOf(p.n);
    object.add(
      markComponent(still(lectern), {
        name: `Plaque ${p.n}: ${p.name}`,
        decorative: true,
      }),
    );
  }

  // ---- The title wall, gilt on the south wall, ahead of the way in ----
  const title = createWallPanel(kit, 'The title wall', 8, 2.4, (c, w, hh) => {
    c.fillStyle = GROUND;
    c.fillRect(0, 0, w, hh);
    c.fillStyle = GILT;
    const y = serifParagraph(
      c,
      TITLE_WALL.line,
      w / 2,
      hh * 0.3,
      w * 0.86,
      hh * 0.13,
      '',
      'center',
    );
    c.fillRect(w * 0.4, y - hh * 0.02, w * 0.2, hh * 0.006);
    serifParagraph(
      c,
      TITLE_WALL.title,
      w / 2,
      y + hh * 0.1,
      w * 0.86,
      hh * 0.07,
      'italic',
      'center',
    );
    c.font = `${hh * 0.04}px ${SERIF}`;
    c.textAlign = 'right';
    c.fillText('PLANTROOMS', w * 0.97, hh * 0.94);
  });
  // High over the plinths below it (the owner, 2026-10-30; it was at
  // 6.0 m, clear above the room's sign, its top 4.6 m, 2026-10-29).
  title.position.set(0, TITLE_Y, halfZ - 0.03);
  title.rotation.y = Math.PI;
  object.add(still(title));

  // ---- The introduction, high in the middle of the east wall ----
  const intro = createWallPanel(
    kit,
    'Introduction: Grout',
    1.7,
    2.1,
    (c, w, hh) => {
      c.fillStyle = GROUND;
      c.fillRect(0, 0, w, hh);
      c.fillStyle = GILT;
      let y = serifParagraph(
        c,
        INTRODUCTION.heading,
        w * 0.08,
        hh * 0.1,
        w * 0.84,
        hh * 0.06,
        'bold',
      );
      c.fillStyle = '#e4dcc8';
      for (const para of INTRODUCTION.body)
        y = serifParagraph(
          c,
          para,
          w * 0.08,
          y + hh * 0.015,
          w * 0.84,
          hh * 0.029,
        );
      c.fillStyle = GILT;
      c.font = `${hh * 0.022}px ${SERIF}`;
      c.textAlign = 'right';
      c.fillText('PLANTROOMS', w * 0.94, hh * 0.97);
    },
  );
  // In the middle of the wall, a metre above eye level (the owner, 2026-10-30).
  intro.position.set(halfX - 0.03, 2.65, 0);
  intro.rotation.y = -Math.PI / 2;
  object.add(still(intro));

  // ---- The bench at the row's end, facing back along it, and the closing card ----
  const bench = new Group();
  t.box(bench, wood, BENCH.depth, 0.06, BENCH.length, BENCH.x, 0.45, BENCH.z);
  for (const dz of [-1, 1])
    t.box(
      bench,
      wood,
      BENCH.depth - 0.05,
      0.42,
      0.06,
      BENCH.x,
      0.21,
      BENCH.z + (dz * (BENCH.length - 0.15)) / 2,
    );
  object.add(
    markComponent(still(bench), {
      name: 'Bench, for contemplation',
      decorative: true,
    }),
  );
  const closing = createWallPanel(
    kit,
    'The closing card',
    0.9,
    0.4,
    (c, w, hh) => {
      c.fillStyle = GROUND;
      c.fillRect(0, 0, w, hh);
      c.fillStyle = GILT;
      serifParagraph(
        c,
        CLOSING_CARD,
        w / 2,
        hh * 0.38,
        w * 0.86,
        hh * 0.15,
        'italic',
        'center',
      );
    },
  );
  closing.position.set(-halfX + 0.03, 1.7, BENCH.z);
  closing.rotation.y = Math.PI / 2;
  object.add(still(closing));

  // ---- The light (the owner, 2026-10-30): over each plinth a lamp head
  // and its round spot, straight down from above the middle of its plinth
  // and lectern, so it casts a circle on the floor with a soft, fading
  // edge, taking in the specimen's tiles, the lectern and the floor round
  // them; a spot switched on over the plinth approached (below); a wash on the title wall;
  // no shadows ----
  const lampHeads = new Group();
  const lampPaint = t.paint('#111418', 0.6, 0.4);
  /** Where a plinth's pool of light falls: between its plinth and its lectern. */
  const poolAt = (n: number) => {
    const place = PLACES[n];
    const at = lecternAt(n);
    return { x: (place.x + at.x) / 2, z: (place.z + at.z) / 2 };
  };
  for (const p of PLINTHS) {
    const { x, z } = poolAt(p.n);
    t.cyl(lampHeads, lampPaint, 0.07, 0.18, x, LAMP_Y, z, 'y', 12);
    t.cyl(lampHeads, bronze, 0.006, h - LAMP_Y, x, (h + LAMP_Y) / 2, z, 'y', 6);
  }
  object.add(
    markComponent(still(lampHeads), {
      name: 'Gallery spotlights',
      decorative: true,
    }),
  );
  for (const p of PLINTHS) {
    const { x, z } = poolAt(p.n);
    const light = new SpotLight(
      '#ffe7c2',
      POOL_POWER,
      0,
      Math.atan(POOL.radius / LAMP_Y),
      POOL.penumbra,
      2,
    );
    light.position.set(x, LAMP_Y - 0.1, z);
    light.target.position.set(x, 0, z);
    object.add(light, light.target);
  }
  // The title wall's wash.
  const wash = new SpotLight('#ffe7c2', 14 * METRE * METRE, 0, 0.7, 0.6, 2);
  wash.position.set(0, h - 0.4, halfZ - 3.5);
  wash.target.position.set(0, TITLE_Y, halfZ);
  object.add(wash, wash.target);

  // The approach (the owner, 2026-10-29): a spot over the
  // plinth approached switches on as the visitor comes near, goes out
  // as they leave; from its lamp head, down on the plinth's foot
  // (`approachLampAt`), a pool round the plinth. Always in the scene, dark when off, so the
  // count of lights (and so the shaders) never changes.
  const approach = new SpotLight('#fff1d8', 0, 0, 0.25, 0.5, 2);
  approach.name = 'Approach spot';
  object.add(approach, approach.target);
  const aim = (n: number) => {
    const { from, to } = approachLampAt(n, LAMP_Y - 0.1);
    approach.position.set(from.x, from.y, from.z);
    approach.target.position.set(to.x, to.y, to.z);
  };
  /** The 1970s' coloured grout's plinth, under the oil wheel. */
  const OIL_WHEEL_PLINTH = 5;
  let lit: number | null = null;
  let shown: number | null = null;
  let level = 0;
  let eye: Camera | null = null;
  // The eye, caught as a mesh is drawn: one of its own, drawn always and
  // writing nothing (the rest is merged, and may not be drawn).
  const watcher = new Mesh(
    new PlaneGeometry(0.01, 0.01),
    new MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  watcher.frustumCulled = false;
  watcher.onBeforeRender = (_r, _s, camera) => {
    eye = camera;
  };
  object.add(watcher);
  const seen = new Vector3();
  // The era loop of the plinth shown, heard from above it: changed as its
  // light goes out and comes in on another, silent with none. Held from
  // the hall's own scene, it is hushed when the hall is left.
  const speaker = new Object3D();
  object.add(speaker);
  let playing: string | null = null;
  const play = (n: number | null) => {
    const file = musicFor(n, MUSIC_PRESENT);
    if (file === playing) return;
    playing = file;
    if (file !== null && n !== null) {
      const place = PLACES[n];
      speaker.position.set(place.x, 3.0, place.z);
    }
    partAudio.hold(
      speaker,
      file === null
        ? null
        : recordedLoop(new URL(MUSIC[file], location.href), MUSIC_LEVEL),
      speaker,
    );
  };

  const lightApproach = (delta: number) => {
    if (eye) {
      object.worldToLocal(eye.getWorldPosition(seen));
      lit = approachedPlinth(seen.x, seen.z, lit);
    }
    // Out first if it must move; then in on its new plinth.
    const want = lit !== null && lit === shown ? 1 : 0;
    if (want === 0 && level === 0 && lit !== shown) {
      shown = lit;
      if (shown !== null) aim(shown);
      play(shown);
    }
    if (level === want) return;
    level =
      want > level
        ? Math.min(1, level + delta / 0.6)
        : Math.max(0, level - delta / 0.3);
    approach.intensity = APPROACH_POWER * level;
  };

  return {
    object,
    status: () => 'reverently lit',
    solids: () => hall7Solids(),
    update: (delta: number) => {
      lightApproach(delta);
      // The oil wheel lit only for the 1970s' plinth, as its spotlight is
      // (the owner, 2026-10-29).
      projector.update(delta, shown === OIL_WHEEL_PLINTH ? level : 0);
    },
    dispose: () => play(null),
    // There is nothing to reset. Grout endures.
    reset: () => {},
  };
}
