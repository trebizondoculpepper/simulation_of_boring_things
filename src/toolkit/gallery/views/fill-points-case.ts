import {
  CurvePath,
  Group,
  LineCurve3,
  Mesh,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { markComponent } from '../../components/core/views/component-identity';
import {
  CHEMICAL_COLOUR,
  createFillCabinet,
  FILL_CABINET,
} from '../../components/plant/views/chemicals-storage';
import {
  PIPE_SIZES,
  plantTools,
} from '../../components/plant/views/plant-tools';
import { createPipeMarker } from '../../components/plant/views/pipe-marker';
import { createLeakPort } from '../../components/plant/views/leak-detection';
import { newLowPoint } from '../../../game/plant/leak-monitor';
import { CASE_PLAQUES } from '../logic/museum-8-incident';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createMuseumShowcase } from './museum-showcase';
import {
  createCamlockAdaptor,
  createCamlockCoupler,
  createGuilleminHalf,
  createHoseEnd,
} from '../../components/plant/views/chemical-couplings';

const wrap = (c: CanvasRenderingContext2D, text: string, width: number) => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

/** A paragraph wrapped to `width`, `font` with `{}` for its size; returns the next line's y. */
export const para = (
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  font: string,
  lead = 1.25,
) => {
  c.font = font.replace('{}', `${size}px`);
  for (const l of wrap(c, text, width)) {
    c.fillText(l, x, y);
    y += size * lead;
  }
  return y;
};

const paintCaseCard =
  (title: string, body: string) =>
  (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#f2efe6';
    c.fillRect(0, 0, w, h);
    const m = w * 0.04;
    c.fillStyle = '#16232b';
    const y = para(
      c,
      title,
      m,
      h * 0.2,
      w - 2 * m,
      h * 0.13,
      `bold {} ${SANS}`,
    );
    para(c, body, m, y + h * 0.02, w - 2 * m, h * 0.085, `{} ${SANS}`);
  };

/**
 * An old fill point's label, printed in 1997 and worn almost away (the
 * owner, 2026-10-30): its chemical's name in faint, broken letters, just
 * legible up close and lost from a step back, the whole point of the
 * story.
 */
const paintWornLabel =
  (text: string) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#e4dccb';
    c.fillRect(0, 0, w, h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `bold ${h * 0.34}px ${SANS}`;
    c.fillStyle = 'rgba(70, 64, 52, 0.22)';
    c.fillText(text, w / 2, h * 0.52, w * 0.9);
    // Worn: patches of the face scuffed back over the letters.
    let seed = text.length * 97;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    c.fillStyle = 'rgba(228, 220, 203, 0.6)';
    for (let k = 0; k < 18; k++) {
      c.beginPath();
      c.ellipse(
        random() * w,
        random() * h,
        w * (0.02 + random() * 0.05),
        h * (0.06 + random() * 0.14),
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    // Grime round its edge.
    c.strokeStyle = 'rgba(90, 80, 60, 0.25)';
    c.lineWidth = h * 0.08;
    c.strokeRect(0, 0, w, h);
  };

/** What the case shows: before, the open recess; after, the cabinet; its envelope on the deck. */
const CONTENTS = { w: 2.0, d: 1.04, h: 1.08 };

/**
 * Hall 8's central case (107i), the two fill points before and after, in
 * a museum showcase (`museum-showcase.ts`): before, two identical brass
 * camlocks in an open recess, their labels worn almost blank, a hose end
 * lying between them that fits either; after, the game's own fill cabinet
 * (`createFillCabinet`), its door open, the matching hose ends beside it,
 * each labelled; the four plaques on a sloped rail along its front. Museum
 * specimens, connected to nothing. Origin on the floor at its middle,
 * front +z, metres; `solid`, what a walker cannot enter, rail included.
 */
export function createFillPointsCase(kit: PanelKit): {
  object: Object3D;
  solid: Footprint;
} {
  const t = tools(kit);
  const showcase = createMuseumShowcase(kit, {
    name: 'The two fill points, before and after',
    contents: CONTENTS,
    label: {
      title: 'Fill points, 1997 and now',
      body: 'Brass camlocks, open recess\nStainless fill cabinet, PLANTROOMS',
      side: 'left',
    },
  });
  const { deck, layout } = showcase;
  const group = showcase.object;
  t.label(
    group,
    'PLANTROOMS',
    layout.w / 2 - 0.22,
    layout.deckY - 0.07,
    layout.d / 2 + 0.002,
    0.026,
    '#d9d4c6',
  );

  // Before: two identical camlocks in an open recess, labels blank.
  const before = new Group();
  before.position.set(-0.6, 0, -0.15);
  deck.add(before);
  const steel = t.paint('#7d8387', 0.4, 0.6);
  const pt = plantTools(kit);
  const rubber = t.paint('#1d1d1d', 0.85);
  const clip = t.paint('#a6abae', 0.4, 0.7);
  t.box(before, steel, 0.8, 0.55, 0.01, 0, 0.5, -0.12);
  t.box(before, steel, 0.8, 0.01, 0.25, 0, 0.225, 0);
  t.box(before, steel, 0.8, 0.01, 0.25, 0, 0.775, 0);
  for (const x of [-0.4, 0.4])
    t.box(before, steel, 0.01, 0.55, 0.25, x, 0.5, 0);
  // Its legs down to the deck.
  for (const x of [-0.36, 0.36])
    t.box(before, steel, 0.03, 0.22, 0.03, x, 0.11, -0.1);
  // The two old adaptors, identical brass 2" camlocks, out of the back
  // plate, and under each its label, worn almost away.
  for (const [x, chemical] of [
    [-0.17, 'HYDROCHLORIC ACID'],
    [0.17, 'SODIUM HYPOCHLORITE'],
  ] as const) {
    const adaptor = createCamlockAdaptor(kit, { size: 2, material: 'brass' });
    adaptor.position.set(x, 0.52, -0.115);
    before.add(adaptor);
    // Its line back through the plate, then a right angle down into the
    // plinth (the owner, 2026-10-30): old reinforced rubber hose, matt
    // black, the same as the old hose before it.
    const r = 0.031;
    const line = new CurvePath<Vector3>();
    line.add(
      new LineCurve3(new Vector3(x, 0.52, -0.105), new Vector3(x, 0.52, -0.14)),
    );
    line.add(
      new QuadraticBezierCurve3(
        new Vector3(x, 0.52, -0.14),
        new Vector3(x, 0.52, -0.24),
        new Vector3(x, 0.42, -0.24),
      ),
    );
    line.add(
      new LineCurve3(new Vector3(x, 0.42, -0.24), new Vector3(x, -0.03, -0.24)),
    );
    before.add(new Mesh(new TubeGeometry(line, 48, r, 16), rubber));
    // A worm-drive clip round it at the adaptor's tail.
    t.cyl(before, clip, r + 0.003, 0.012, x, 0.52, -0.1, 'z', 16);
    const label = t.printed(0.18, 0.06, paintWornLabel(chemical), 256);
    label.mesh.position.set(x, 0.36, -0.113);
    before.add(label.mesh);
  }
  // A hose end lying between them, its brass coupler fitting either, its
  // arms open.
  const oldHose = new Group();
  oldHose.position.set(-0.05, 0.035, 0.28);
  oldHose.rotation.y = -Math.PI / 2;
  before.add(oldHose);
  const oldCoupler = createCamlockCoupler(kit, { size: 2, material: 'brass' });
  oldCoupler.setOpen(1);
  oldHose.add(oldCoupler.object);
  oldHose.add(
    createHoseEnd(kit, { bore: 2, length: 0.3, shank: oldCoupler.shank }),
  );

  // After: the game's fill cabinet, door open, couplings inside, on its
  // stand's back plate.
  const cabinet = createFillCabinet(kit);
  const door = cabinet.userData.door as Object3D | undefined;
  if (door) door.rotation.y = 1.75;
  // Stood forward of the case's back, room behind it for the acid's line.
  cabinet.position.set(0.5, 0.5, -0.3);
  deck.add(cabinet);
  t.box(deck, steel, 0.8, 1.05, 0.01, 0.5, 0.53, -0.31);
  // The acid's line out of its back (the owner, 2026-10-30): double-
  // contained ABS, a DN25 carrier in a DN63 containment, back, down, and
  // across behind to drop into the plinth; marked to BS 1710, HYDROCHLORIC
  // ACID, its flow away; at its low run the leak detection port, its drain,
  // sight tube and probe, dry.
  const acidOut = 0.5 + FILL_CABINET.acid.at[0];
  const lineY = 0.2;
  const lineZ = -0.43;
  pt.pipe(
    deck,
    50,
    [
      [acidOut, 0.5, -0.32],
      [acidOut, 0.5, lineZ],
      [acidOut, lineY, lineZ],
      [-0.15, lineY, lineZ],
      [-0.15, -0.03, lineZ],
    ],
    '#4b4f53',
  );
  const marker = createPipeMarker(kit, {
    r: PIPE_SIZES[50].od / 2,
    chemical: 'acid',
    contained: true,
    flow: -1,
  });
  marker.object.position.set(0.06, lineY, lineZ);
  marker.object.scale.x = Math.min(1, 0.18 / marker.length);
  deck.add(marker.object);
  const port = createLeakPort(kit, PIPE_SIZES[50].od / 2);
  port.object.position.set(-0.07, lineY, lineZ);
  port.show(newLowPoint());
  deck.add(port.object);
  // The matching hose ends beside each, lying on the deck: the
  // hypochlorite's polypropylene camlock coupler, the acid's Guillemin.
  for (const [x, colour, text, acid] of [
    [
      0.25,
      CHEMICAL_COLOUR.hypochlorite,
      'SODIUM HYPOCHLORITE · 2" CAMLOCK',
      false,
    ],
    [0.75, CHEMICAL_COLOUR.acid, 'HYDROCHLORIC ACID · 1½" GUILLEMIN', true],
  ] as const) {
    const bore = acid ? 1.5 : 2;
    const hose = new Group();
    hose.position.set(x - 0.2, 0.034 * (bore / 2) * 1.25, 0.3);
    hose.rotation.y = -Math.PI / 2;
    deck.add(hose);
    const coupling = acid
      ? createGuilleminHalf(kit, { size: 1.5 })
      : createCamlockCoupler(kit, { size: 2, material: 'polypropylene' });
    hose.add(
      coupling.object,
      createHoseEnd(kit, { bore, length: 0.3, colour, shank: coupling.shank }),
    );
    t.label(deck, text, x, 0.003, 0.42, 0.015, '#111111', colour).rotation.x =
      -Math.PI / 2;
  }

  // The plaques on a sloped rail along its front, on two brackets off the
  // plinth, its top edge clear of the plinth's face.
  const bronze = t.paint('#2a2622', 0.35, 0.7);
  const railY = layout.deckY - 0.17;
  const railZ = layout.d / 2 + 0.075;
  for (const s of [-1, 1])
    t.box(
      group,
      bronze,
      0.02,
      0.05,
      0.075,
      s * (layout.w / 2 - 0.15),
      railY - 0.04,
      layout.d / 2 + 0.0375,
    );
  const rail = new Group();
  rail.position.set(0, railY, railZ);
  rail.rotation.x = -0.6;
  group.add(rail);
  const railW = 0.53;
  const step = (layout.w - 0.06) / 4;
  t.box(rail, bronze, layout.w - 0.04, 0.22, 0.012, 0, 0, 0.006);
  const cards = [
    paintCaseCard(CASE_PLAQUES.before.title, CASE_PLAQUES.before.body),
    paintCaseCard(CASE_PLAQUES.fix, CASE_PLAQUES.frankfurt),
    paintCaseCard(CASE_PLAQUES.after.title, CASE_PLAQUES.after.body),
    paintCaseCard('Museum specimens', CASE_PLAQUES.specimen),
  ];
  cards.forEach((draw, k) => {
    const p = t.printed(railW, railW * 0.37, draw, 700, true);
    p.mesh.position.set((k - 1.5) * step, 0, 0.014);
    rail.add(p.mesh);
  });
  markComponent(group, {
    name: 'Museum case: the two fill points, before and after (specimens, connected to nothing)',
    decorative: true,
  });
  return {
    object: group,
    solid: { ...layout.solid, maxZ: layout.solid.maxZ + 0.15 },
  };
}
