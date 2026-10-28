import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { markComponent } from '../../components/core/views/component-identity';
import {
  CHEMICAL_COLOUR,
  createFillCabinet,
} from '../../components/plant/views/chemicals-storage';
import { CASE_PLAQUES } from '../logic/museum-8-incident';
import type { Footprint } from '../../controls/logic/walk-collision';
import { createMuseumShowcase } from './museum-showcase';

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

/** What the case shows: before, the open recess; after, the cabinet; its envelope on the deck. */
const CONTENTS = { w: 2.0, d: 1.04, h: 1.08 };

/**
 * Hall 8's central case (107i), the two fill points before and after, in
 * a museum showcase (`museum-showcase.ts`): before, two identical brass
 * camlocks in an open recess, their labels faded blank, a hose end lying
 * between them that fits either; after, the game's own fill cabinet
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
  const brass = t.paint('#a0803e', 0.35, 0.7);
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
  t.box(before, steel, 0.8, 0.55, 0.01, 0, 0.5, -0.12);
  t.box(before, steel, 0.8, 0.01, 0.25, 0, 0.225, 0);
  t.box(before, steel, 0.8, 0.01, 0.25, 0, 0.775, 0);
  for (const x of [-0.4, 0.4])
    t.box(before, steel, 0.01, 0.55, 0.25, x, 0.5, 0);
  // Its legs down to the deck.
  for (const x of [-0.36, 0.36])
    t.box(before, steel, 0.03, 0.22, 0.03, x, 0.11, -0.1);
  const oldBrass = t.paint('#8c7440', 0.5, 0.6);
  const faded = t.paint('#e4dccb', 0.9);
  for (const x of [-0.17, 0.17]) {
    t.cyl(before, oldBrass, 0.04, 0.12, x, 0.52, -0.06, 'z', 20);
    t.cyl(before, oldBrass, 0.046, 0.02, x, 0.52, 0.01, 'z', 20);
    for (const s of [-1, 1])
      t.box(before, oldBrass, 0.012, 0.09, 0.015, x + s * 0.052, 0.55, 0.0);
    t.box(before, faded, 0.18, 0.06, 0.004, x, 0.36, -0.115);
  }
  // A hose end lying between them, its coupler fitting either.
  const rubber = t.paint('#1d1d1d', 0.8);
  t.cyl(before, rubber, 0.03, 0.35, 0.05, 0.03, 0.28, 'x', 16);
  t.cyl(before, oldBrass, 0.045, 0.1, -0.17, 0.035, 0.28, 'x', 16);

  // After: the game's fill cabinet, door open, couplings inside, on its
  // stand's back plate.
  const cabinet = createFillCabinet(kit);
  const door = cabinet.userData.door as Object3D | undefined;
  if (door) door.rotation.y = 1.75;
  cabinet.position.set(0.5, 0.5, -0.5);
  deck.add(cabinet);
  t.box(deck, steel, 0.8, 1.05, 0.01, 0.5, 0.53, -0.51);
  // The matching hose ends beside each.
  for (const [x, colour, text, small] of [
    [
      0.25,
      CHEMICAL_COLOUR.hypochlorite,
      'SODIUM HYPOCHLORITE · 2" CAMLOCK',
      false,
    ],
    [0.75, CHEMICAL_COLOUR.acid, 'HYDROCHLORIC ACID · 1½" GUILLEMIN', true],
  ] as const) {
    const r = small ? 0.024 : 0.032;
    t.cyl(deck, rubber, r, 0.3, x, r, 0.3, 'x', 16);
    const end = small ? t.paint('#d9d4d0', 0.5) : brass;
    t.cyl(deck, end, r * 1.5, 0.08, x - 0.18, r * 1.5, 0.3, 'x', 16);
    t.cyl(
      deck,
      t.paint(colour, 0.5),
      r * 1.05,
      0.03,
      x + 0.05,
      r,
      0.3,
      'x',
      16,
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
