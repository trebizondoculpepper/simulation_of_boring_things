import {
  Group,
  Matrix4,
  Mesh,
  Object3D,
  Path,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SpotLight,
} from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { METRE } from '../../../components/core/logic/units';
import { createWallPanel } from '../../views/museum-exhibit';
import { createGroutSpecimens } from '../../views/grout-specimen';
import {
  BENCH,
  CLOSING_CARD,
  HALL7,
  INTRODUCTION,
  NOTHING_TO_RESET,
  PLINTHS,
  ROW,
  TIMELINE,
  TITLE_WALL,
  hall7Solids,
  plinthX,
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
  const inset = 0.02;
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

  // ---- The row: plinths, rope posts and ropes, the timeline, merged ----
  const row = new Group();
  const { w: pw, h: ph } = ROW.plinth;
  for (const p of PLINTHS) {
    const x = plinthX(p.n);
    t.box(row, stone, pw, ph, pw, x, ph / 2, ROW.z);
    t.box(row, stone, pw + 0.08, 0.06, pw + 0.08, x, 0.03, ROW.z);
  }
  const postXs = [
    plinthX(1) + ROW.pitch / 2,
    ...PLINTHS.map((p) => plinthX(p.n) - ROW.pitch / 2),
  ];
  for (const z of [ROW.ropeNorth, ROW.ropeSouth]) {
    for (const x of postXs) {
      t.cyl(row, brass, 0.018, 0.9, x, 0.45, z, 'y', 12);
      t.cyl(row, brass, 0.11, 0.025, x, 0.0125, z, 'y', 16);
      t.cyl(row, brass, 0.03, 0.05, x, 0.92, z, 'y', 12);
    }
    for (let k = 0; k < postXs.length - 1; k++) {
      const a = postXs[k];
      const b = postXs[k + 1];
      // A rope slung between posts, as two straight lengths to its sag.
      const mid = (a + b) / 2;
      const sag = 0.12;
      for (const [x0, y0, x1, y1] of [
        [a, 0.86, mid, 0.86 - sag],
        [mid, 0.86 - sag, b, 0.86],
      ]) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const rope = t.cyl(
          row,
          velvet,
          0.016,
          Math.hypot(dx, dy),
          (x0 + x1) / 2,
          (y0 + y1) / 2,
          z,
          'y',
          8,
        );
        // Its axis (y) turned onto the length.
        rope.rotation.z = Math.atan2(-dx, dy);
      }
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
    ROW.timelineZ,
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
      ROW.timelineZ,
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
      ROW.timelineZ,
      'y',
      12,
    );
  object.add(
    markComponent(still(row), {
      name: 'The row: ten plinths of grout in date order, roped; the bronze timeline, 1840 to today',
      decorative: true,
    }),
  );
  // The timeline's years, cut in the floor beside it.
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
    label.mesh.position.set(timelineX(year), 0.007, ROW.timelineZ - 0.15);
    object.add(label.mesh);
  }

  // ---- The specimens: one model, instanced ----
  const turn = new Matrix4().makeRotationY(Math.PI);
  const specimens = createGroutSpecimens(
    PLINTHS.map((p) => ({
      matrix: new Matrix4()
        .makeTranslation(plinthX(p.n), ph, ROW.z)
        .multiply(turn),
      coloured: p.grout === 'avocado',
    })),
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
    // In its own frame the reader stands on +z; turn it to face north.
    lectern.position.set(plinthX(p.n), 0, ROW.lecternZ);
    lectern.rotation.y = Math.PI;
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
  title.position.set(0, 4.6, halfZ - 0.03);
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
  intro.position.set(halfX - 0.03, 1.65, -3.2);
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

  // ---- The light: three spots down the row and a wash on the title wall, no shadows ----
  const lampHeads = new Group();
  for (const p of PLINTHS) {
    const x = plinthX(p.n);
    t.cyl(
      lampHeads,
      t.paint('#111418', 0.6, 0.4),
      0.07,
      0.18,
      x,
      5.0,
      ROW.z - 0.4,
      'y',
      12,
    );
    t.cyl(
      lampHeads,
      bronze,
      0.006,
      h - 5.0,
      x,
      (h + 5.0) / 2,
      ROW.z - 0.4,
      'y',
      6,
    );
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
  for (const n of [2, 5.5, 9])
    spot(plinthX(n), 6.5, ROW.z - 0.6, plinthX(n), ph, ROW.z, 26, 0.36);
  spot(0, 8.6, halfZ - 3.5, 0, 4.6, halfZ, 14, 0.7);

  return {
    object,
    status: () => 'reverently lit',
    solids: () => hall7Solids(),
    // There is nothing to reset. Grout endures.
    reset: () => {},
  };
}
