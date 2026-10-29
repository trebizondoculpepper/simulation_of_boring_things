import {
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SpotLight,
  Vector3,
} from 'three';
import type { Camera } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { METRE } from '../../../components/core/logic/units';
import { createWallPanel } from '../../views/museum-exhibit';
import { createGroutSpecimens } from '../../views/grout-specimen';
import { createOilWheelProjector } from '../../views/oil-wheel-projector';
import {
  BENCH,
  CLOSING_CARD,
  HALL7,
  INTRODUCTION,
  NOTHING_TO_RESET,
  PLACES,
  PLINTH,
  PLINTHS,
  PROJECTOR,
  ROPE_HALF,
  SPECIMEN,
  TIMELINE,
  TITLE_WALL,
  approachedPlinth,
  facingStep,
  facingYaw,
  hall7Solids,
  lecternAt,
  timelineX,
} from '../../logic/museum-7-grout';
import type { GroutPlinth } from '../../logic/museum-7-grout';
import { MUSEUM_ARCH } from '../../logic/museum-plan';
import type { HallExhibit } from './exhibits';

/**
 * Hall 7, "Grout: The Unsung Hero of the Aquatics World" (107k): a
 * reverent, static gallery. Ten plinths in date order across the hall's
 * south half, each with the same tiled specimen (one instanced model; the
 * 1970s' grout alone in avocado), a plaque on a bronze lectern before it,
 * a rope on brass posts either side and a bronze timeline in the floor,
 * 1840 to today; the walls lined dark, a few spotlights, the title wall
 * gilt on the south wall ahead of the way in. Nothing moves and nothing
 * resets: everything is drawn once and merged. In the hall's frame, metres
 * (the logic file has its plan).
 */

const SERIF = 'Georgia, "Times New Roman", serif';
const GILT = '#c9a54e';
const GROUND = '#141a22';
const WALL = '#1f2a33';

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
    y = serifParagraph(c, `${p.n}`, m, y, width, s(0.05), 'bold');
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

/** A dark wall's lining, `w` × `h`, with an archway's hole at `holeX` along it if given. */
function lining(w: number, h: number, holeX: number | null) {
  const s = new Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h);
  s.lineTo(-w / 2, h);
  s.closePath();
  if (holeX !== null) {
    const r = MUSEUM_ARCH.w / 2;
    const hole = new Path();
    hole.moveTo(holeX - r, 0.001);
    hole.lineTo(holeX + r, 0.001);
    hole.lineTo(holeX + r, MUSEUM_ARCH.spring);
    hole.absellipse(
      holeX,
      MUSEUM_ARCH.spring,
      r,
      MUSEUM_ARCH.rise,
      0,
      Math.PI,
      false,
    );
    hole.lineTo(holeX - r, 0.001);
    s.holes.push(hole);
  }
  return new ShapeGeometry(s, 24);
}

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const object = new Group();
  object.name = 'Hall 7: Grout';
  const t = tools(kit);
  const still = (thing: Object3D) => {
    mergeTree(thing, () => false);
    return thing;
  };

  const wallPaint = t.paint(WALL, 0.9);
  const stone = t.paint('#3d4246', 0.85);
  const bronze = t.paint('#8a6a32', 0.4, 0.8);
  const brass = t.paint('#b8963e', 0.3, 0.9);
  const velvet = t.paint('#5a1420', 0.95);
  const wood = t.paint('#2a1c14', 0.7);

  // ---- The chapel: the walls, ceiling and floor lined dark ----
  const shell = new Group();
  const { halfX, halfZ, h } = HALL7;
  // Behind the museum's signs (15 mm off their walls), never in front (the
  // owner, 2026-10-29: it fought the room's sign).
  const inset = 0.005;
  const north = new Mesh(lining(2 * halfX, h, 0), wallPaint);
  north.position.set(0, 0, -halfZ + inset);
  const south = new Mesh(lining(2 * halfX, h, null), wallPaint);
  south.position.set(0, 0, halfZ - inset);
  south.rotation.y = Math.PI;
  const east = new Mesh(lining(2 * halfZ, h, null), wallPaint);
  east.position.set(halfX - inset, 0, 0);
  east.rotation.y = -Math.PI / 2;
  // The west wall faces east; along it, +x of the shape runs to −z.
  const west = new Mesh(lining(2 * halfZ, h, 0), wallPaint);
  west.position.set(-halfX + inset, 0, 0);
  west.rotation.y = Math.PI / 2;
  const ceiling = new Mesh(
    new PlaneGeometry(2 * halfX, 2 * halfZ),
    t.paint('#151b22', 0.95),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = h - inset;
  const floor = new Mesh(
    new PlaneGeometry(2 * halfX, 2 * halfZ),
    t.paint('#22262a', 0.8),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.004;
  shell.add(north, south, east, west, ceiling, floor);
  object.add(
    markComponent(still(shell), {
      name: 'The gallery’s dark lining',
      decorative: true,
    }),
  );

  // ---- The plinths, each roped round; the timeline; merged ----
  const row = new Group();
  const { w: pw, h: ph } = PLINTH;
  const post = (x: number, z: number) => {
    t.cyl(row, brass, 0.018, 0.9, x, 0.45, z, 'y', 12);
    t.cyl(row, brass, 0.11, 0.025, x, 0.0125, z, 'y', 16);
    t.cyl(row, brass, 0.03, 0.05, x, 0.92, z, 'y', 12);
  };
  // A rope slung between posts, as two straight lengths to its sag.
  const rope = (x0: number, z0: number, x1: number, z1: number) => {
    const sag = 0.1;
    const length = Math.hypot(x1 - x0, z1 - z0);
    const half = new Group();
    half.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    half.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    // In the half's frame the rope runs along z, −length/2 to +length/2.
    for (const [za, ya, zb, yb] of [
      [-length / 2, 0.86, 0, 0.86 - sag],
      [0, 0.86 - sag, length / 2, 0.86],
    ]) {
      const piece = t.cyl(
        half,
        velvet,
        0.016,
        Math.hypot(zb - za, yb - ya),
        0,
        (ya + yb) / 2,
        (za + zb) / 2,
        'y',
        8,
      );
      // Its axis (y) turned onto the length.
      piece.rotation.x = Math.atan2(zb - za, yb - ya);
    }
    row.add(half);
  };
  for (const p of PLINTHS) {
    const { x, z } = PLACES[p.n];
    t.box(row, stone, pw, ph, pw, x, ph / 2, z);
    t.box(row, stone, pw + 0.08, 0.06, pw + 0.08, x, 0.03, z);
    const r = ROPE_HALF;
    const corners: [number, number][] = [
      [x - r, z - r],
      [x + r, z - r],
      [x + r, z + r],
      [x - r, z + r],
    ];
    for (const [cx, cz] of corners) post(cx, cz);
    for (let k = 0; k < 4; k++) {
      const [x0, z0] = corners[k];
      const [x1, z1] = corners[(k + 1) % 4];
      rope(x0, z0, x1, z1);
    }
  }
  // The timeline: a bronze strip in the floor, a tick each decade, longer each half-century.
  const span = TIMELINE.east - TIMELINE.west;
  t.box(
    row,
    bronze,
    span,
    0.004,
    0.025,
    (TIMELINE.east + TIMELINE.west) / 2,
    0.006,
    TIMELINE.z,
  );
  for (let year = 1840; year <= TIMELINE.to; year += 10) {
    const long = year % 50 === 0;
    t.box(
      row,
      bronze,
      0.012,
      0.004,
      long ? 0.16 : 0.08,
      timelineX(year),
      0.006,
      TIMELINE.z,
    );
  }
  // Each plinth's first year marked by a stud on the line.
  for (const p of PLINTHS)
    t.cyl(
      row,
      brass,
      0.022,
      0.005,
      timelineX(p.from),
      0.007,
      TIMELINE.z,
      'y',
      12,
    );
  object.add(
    markComponent(still(row), {
      name: 'Ten plinths of grout in date order, roped; the bronze timeline, 1840 to today',
      decorative: true,
    }),
  );
  // The timeline's years, cut in the floor beside it, read from the way in.
  for (const year of [1850, 1900, 1950, 2000]) {
    const label = t.printed(
      0.3,
      0.1,
      (c, w, hh) => {
        c.fillStyle = '#22262a';
        c.fillRect(0, 0, w, hh);
        c.fillStyle = GILT;
        c.font = `bold ${hh * 0.7}px ${SERIF}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(`${year}`, w / 2, hh / 2);
      },
      128,
    );
    label.mesh.rotation.x = -Math.PI / 2;
    label.mesh.position.set(timelineX(year), 0.007, TIMELINE.z - 0.15);
    object.add(label.mesh);
  }

  // ---- The specimens: one model, instanced, each facing its visitor ----
  const specimens = createGroutSpecimens(
    PLINTHS.map((p) => {
      const place = PLACES[p.n];
      return {
        matrix: new Matrix4()
          .makeTranslation(place.x, ph, place.z)
          .multiply(new Matrix4().makeRotationY(facingYaw(place.facing))),
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

  // ---- The 1970s' oil-wheel projector, high over the island ----
  // (the owner, 2026-10-28: "high in the ceiling, focusing down on the
  // 1970s exhibit"): hung on a rod from the roof, aimed down at the
  // avocado specimen's tiled face.
  const seventies = PLACES[PLINTHS.find((p) => p.grout === 'avocado')!.n];
  const [fx, fz] = facingStep(seventies.facing);
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
    const face = t.printed(
      0.6,
      0.42,
      (c, w, hh) => paintPlaque(c, p, w, hh),
      768,
    );
    face.mesh.position.z = 0.0005;
    head.add(face.mesh);
    // In its own frame the reader stands on +z; turn it to face its visitor.
    const at = lecternAt(p.n);
    lectern.position.set(at.x, 0, at.z);
    lectern.rotation.y = facingYaw(PLACES[p.n].facing);
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
  // Clear above the room's sign (its top 4.6 m; the owner, 2026-10-29).
  title.position.set(0, 6.0, halfZ - 0.03);
  title.rotation.y = Math.PI;
  object.add(still(title));

  // ---- The introduction, on the east wall by the way in ----
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
  intro.position.set(halfX - 0.03, 1.65, -5.0);
  intro.rotation.y = -Math.PI / 2;
  object.add(still(intro));

  // ---- Where the RESET pedestal would stand: a small card ----
  const card = createWallPanel(
    kit,
    'Card: nothing to reset',
    0.42,
    0.28,
    (c, w, hh) => {
      c.fillStyle = '#efe7d3';
      c.fillRect(0, 0, w, hh);
      c.fillStyle = '#1c1812';
      serifParagraph(
        c,
        NOTHING_TO_RESET.headline,
        w / 2,
        hh * 0.42,
        w * 0.9,
        hh * 0.13,
        '',
        'center',
      );
      serifParagraph(
        c,
        NOTHING_TO_RESET.body,
        w / 2,
        hh * 0.7,
        w * 0.9,
        hh * 0.13,
        'italic',
        'center',
      );
    },
  );
  card.position.set(2.9, 1.3, -halfZ + 0.03);
  object.add(still(card));

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

  // ---- The light: a lamp head over each plinth, four spots on its groups and a wash on the title wall, no shadows ----
  const lampHeads = new Group();
  const lampPaint = t.paint('#111418', 0.6, 0.4);
  for (const p of PLINTHS) {
    const place = PLACES[p.n];
    const [dx, dz] = facingStep(place.facing);
    const x = place.x + dx * 0.4;
    const z = place.z + dz * 0.4;
    t.cyl(lampHeads, lampPaint, 0.07, 0.18, x, 5.0, z, 'y', 12);
    t.cyl(lampHeads, bronze, 0.006, h - 5.0, x, (h + 5.0) / 2, z, 'y', 6);
  }
  object.add(
    markComponent(still(lampHeads), {
      name: 'Gallery spotlights',
      decorative: true,
    }),
  );
  const spot = (
    x: number,
    y: number,
    z: number,
    tx: number,
    ty: number,
    tz: number,
    power: number,
    angle: number,
  ) => {
    const light = new SpotLight(
      '#ffe7c2',
      power * METRE * METRE,
      0,
      angle,
      0.6,
      2,
    );
    light.position.set(x, y, z);
    light.target.position.set(tx, ty, tz);
    object.add(light, light.target);
  };
  // The east wall's three, the island, the south wall's three, the coda.
  spot(4.6, 6.5, 0.1, PLACES[2].x, ph, PLACES[2].z, 40, 0.6);
  spot(0, 6.5, -0.8, PLACES[5].x, ph, PLACES[5].z, 40, 0.6);
  spot(0, 6.5, 3.8, PLACES[8].x, ph, PLACES[8].z, 48, 0.75);
  spot(-5.0, 6.5, PLACES[10].z, PLACES[10].x, ph, PLACES[10].z, 22, 0.36);
  spot(0, 8.6, halfZ - 3.5, 0, 6.0, halfZ, 14, 0.7);

  // The approach light (the owner, 2026-10-29): one spotlight, from the
  // lamp head over the plinth approached, over its specimen and its
  // lectern, faded up as the visitor comes near and out as they leave.
  const approach = new SpotLight('#fff1d8', 0, 0, 0.26, 0.45, 2);
  object.add(approach, approach.target);
  const APPROACH_POWER = 14 * METRE * METRE;
  /** The plinth under the oil wheel: the 1970s' coloured grout. */
  const OIL_WHEEL_PLINTH = 5;
  let lit: number | null = null;
  let shown: number | null = null;
  let level = 0;
  let eye: Camera | null = null;
  // The eye, caught as a mesh is drawn: one of its own, drawn always and
  // writing nothing (the lining is merged, its floor never drawn itself).
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
  const aim = (n: number) => {
    const place = PLACES[n];
    const [dx, dz] = facingStep(place.facing);
    const at = lecternAt(n);
    approach.position.set(place.x + dx * 0.4, 5.0, place.z + dz * 0.4);
    approach.target.position.set(
      (place.x + at.x) / 2,
      0.9,
      (place.z + at.z) / 2,
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
    // There is nothing to reset. Grout endures.
    reset: () => {},
  };
}
