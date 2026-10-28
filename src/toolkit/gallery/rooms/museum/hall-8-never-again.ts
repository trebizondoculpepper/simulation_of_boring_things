import { Group, SRGBColorSpace, TextureLoader } from 'three';
import type { Color, Material, Object3D } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { SANS, tools } from '../../../components/core/views/fitting-tools';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { markFrontCentre } from '../../../components/core/audio/front-centre';
import {
  createPartSet,
  pushButton,
} from '../../../components/core/parts/parts';
import {
  CHEMICAL_COLOUR,
  createFillCabinet,
} from '../../../components/plant/views/chemicals-storage';
import {
  CASE_PLAQUES,
  CHAPTERS,
  CHAPTER_SECONDS,
  DRAMATISATION,
  NARRATION_OFF,
  OPENING,
  PAPER,
  SPONSOR,
  litChapter,
  pressNarration,
  stepNarration,
} from '../../logic/museum-8-incident';
import type {
  Chapter,
  Clipping,
  Narration,
} from '../../logic/museum-8-incident';
import { createWallPanel } from '../../views/museum-exhibit';
import type { Footprint } from '../../../controls/logic/walk-collision';
import type { HallExhibit } from './exhibits';

/**
 * Hall 8, "Never again: putting safety first", sponsored by Chlorella
 * (107i): a dark gallery telling a fictional 1997 chlorine release in six
 * chapters. The visitor comes in from Hall 7 (east) and leaves west into
 * Hall 9. Chapters 1 to 3 hang on the street (south) wall, read left to
 * right, east to west; 4 to 6 on the courtyard (north) wall, read left to
 * right, west to east; the case of the two fill points in the middle,
 * between the columns; the opening panel and the narration button by the
 * way in; Chlorella's panel and the lessons by the way out. Static but for
 * the narration. In the hall's frame, metres.
 *
 * Photographs: placeholders until images are dropped in as
 * `resources/images/never-again/chapter-<n>.jpg` (or .png/.webp), found at
 * build time; narration clips likewise in `resources/sound/voice/never-again/`.
 */

const PHOTOS = import.meta.glob<string>(
  '../../../../../resources/images/never-again/*.{jpg,png,webp}',
  { eager: true, query: '?url', import: 'default' },
);
const CLIPS = import.meta.glob<string>(
  '../../../../../resources/sound/voice/never-again/*.mp3',
  { eager: true, query: '?url', import: 'default' },
);
const byName = (files: Record<string, string>) =>
  new Map(
    Object.entries(files).map(([p, url]) => [
      p.slice(p.lastIndexOf('/') + 1).replace(/\.[a-z0-9]+$/, ''),
      url,
    ]),
  );
const PHOTO_URLS = byName(PHOTOS);
const CLIP_URLS = byName(CLIPS);

/** The walls' room faces. */
const SOUTH = 6.7;
const NORTH = -6.7;
const EAST = 7.7;
const WEST = -7.7;
/** The dark lining's height: under the title vinyl and the windows' sills. */
const LINING_H = 2.55;
const SERIF = 'Georgia, "Times New Roman", serif';

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
const para = (
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

/** A photograph still to come: dark, its chapter's title and time. */
function paintPlaceholder(ch: Chapter) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#f2efe6';
    c.fillRect(0, 0, w, h);
    const b = w * 0.04;
    c.fillStyle = '#1c1e20';
    c.fillRect(b, b, w - 2 * b, h - 2 * b - h * 0.08);
    c.fillStyle = '#d9d4c6';
    c.textAlign = 'center';
    c.font = `bold ${h * 0.12}px ${SANS}`;
    c.fillText(ch.time, w / 2, h * 0.36);
    c.font = `${h * 0.09}px ${SANS}`;
    c.fillText(ch.title, w / 2, h * 0.5);
    c.fillStyle = '#8a857a';
    c.font = `italic ${h * 0.05}px ${SANS}`;
    c.fillText('photograph to come', w / 2, h * 0.64);
    c.fillStyle = '#3a3b3c';
    c.font = `italic ${h * 0.04}px ${SERIF}`;
    c.fillText(ch.caption, w / 2, h - h * 0.035, w - 2 * b);
    c.textAlign = 'left';
  };
}

/** A yellowed cutting from the fictional paper. */
function paintClipping(cl: Clipping) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#e6dab8';
    c.fillRect(0, 0, w, h);
    const m = w * 0.06;
    c.fillStyle = '#1d1a14';
    c.textAlign = 'center';
    c.font = `bold ${w * 0.075}px ${SERIF}`;
    c.fillText(PAPER.name.toUpperCase(), w / 2, h * 0.07, w - 2 * m);
    c.fillRect(m, h * 0.085, w - 2 * m, h * 0.004);
    c.font = `${w * 0.032}px ${SERIF}`;
    c.textAlign = 'left';
    c.fillText(cl.date, m, h * 0.11);
    c.textAlign = 'right';
    c.fillText(`${cl.page} · ${PAPER.price}`, w - m, h * 0.11);
    c.textAlign = 'left';
    c.fillRect(m, h * 0.12, w - 2 * m, h * 0.002);
    let y = para(
      c,
      cl.headline,
      m,
      h * 0.2,
      w - 2 * m,
      w * 0.1,
      `bold {} ${SERIF}`,
      1.05,
    );
    y = para(
      c,
      cl.standfirst,
      m,
      y + h * 0.01,
      w - 2 * m,
      w * 0.045,
      `italic {} ${SERIF}`,
    );
    // A halftone box for its picture.
    c.fillStyle = '#9d957f';
    c.fillRect(m, y, w - 2 * m, h * 0.18);
    c.fillStyle = '#1d1a14';
    y += h * 0.18 + w * 0.06;
    for (const p of cl.body)
      y = para(c, p, m, y, w - 2 * m, w * 0.038, `{} ${SERIF}`) + w * 0.015;
  };
}

/** A chapter's plaque. */
function paintPlaque(ch: Chapter) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#18191b';
    c.fillRect(0, 0, w, h);
    const m = w * 0.03;
    c.fillStyle = '#e8b33a';
    c.font = `bold ${h * 0.13}px ${SANS}`;
    c.fillText(`${ch.number} · ${ch.time} · ${ch.title}`, m, h * 0.17);
    c.fillStyle = '#e9e6de';
    let y = para(c, ch.wrong, m, h * 0.34, w - 2 * m, h * 0.085, `{} ${SANS}`);
    c.fillStyle = '#9fd3a8';
    para(
      c,
      `Lesson: ${ch.lesson}`,
      m,
      y + h * 0.04,
      w - 2 * m,
      h * 0.08,
      `bold {} ${SANS}`,
    );
  };
}

function paintOpening(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#141517';
  c.fillRect(0, 0, w, h);
  const m = w * 0.06;
  c.fillStyle = '#9b9488';
  c.font = `bold ${h * 0.03}px ${SANS}`;
  c.fillText('HALL 8', m, h * 0.06);
  c.fillStyle = '#f3efe4';
  let y = para(
    c,
    OPENING.title,
    m,
    h * 0.13,
    w - 2 * m,
    h * 0.06,
    `bold {} ${SANS}`,
    1.1,
  );
  y = para(
    c,
    OPENING.bigIdea,
    m,
    y + h * 0.02,
    w - 2 * m,
    h * 0.034,
    `{} ${SANS}`,
  );
  c.fillStyle = '#b8b2a5';
  y = para(
    c,
    OPENING.assumes,
    m,
    y + h * 0.02,
    w - 2 * m,
    h * 0.027,
    `{} ${SANS}`,
  );
  c.fillStyle = '#e8b33a';
  y = para(
    c,
    OPENING.fact,
    m,
    y + h * 0.03,
    w - 2 * m,
    h * 0.03,
    `bold {} ${SANS}`,
  );
  c.fillStyle = '#f3efe4';
  y = para(
    c,
    OPENING.ownVoice,
    m,
    y + h * 0.01,
    w - 2 * m,
    h * 0.027,
    `{} ${SANS}`,
  );
  c.fillStyle = '#9fd3a8';
  y = para(
    c,
    OPENING.tryIt,
    m,
    y + h * 0.03,
    w - 2 * m,
    h * 0.027,
    `bold {} ${SANS}`,
  );
  c.fillStyle = '#8a857a';
  para(
    c,
    `Sponsored by ${SPONSOR.maker}. ${DRAMATISATION}`,
    m,
    h * 0.93,
    w - 2 * m,
    h * 0.022,
    `italic {} ${SANS}`,
  );
}

function paintSponsor(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#f4f2ea';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#1f7a3a';
  c.fillRect(0, 0, w, h * 0.17);
  const m = w * 0.05;
  c.fillStyle = '#ffffff';
  c.font = `bold ${h * 0.065}px ${SANS}`;
  c.fillText(SPONSOR.maker, m, h * 0.085);
  c.font = `italic ${h * 0.032}px ${SANS}`;
  c.fillText(`${SPONSOR.slogan} · ${SPONSOR.since}`, m, h * 0.135);
  c.fillStyle = '#16232b';
  let y = para(
    c,
    SPONSOR.headline,
    m,
    h * 0.24,
    w - 2 * m,
    h * 0.045,
    `bold {} ${SANS}`,
  );
  y =
    para(c, SPONSOR.pride, m, y, w - 2 * m, h * 0.03, `{} ${SANS}`) + h * 0.02;
  c.fillStyle = '#1f7a3a';
  c.font = `bold ${h * 0.03}px ${SANS}`;
  c.fillText('THE LESSONS', m, y);
  y += h * 0.045;
  SPONSOR.lessons.forEach((l, k) => {
    c.fillStyle = '#1f7a3a';
    c.font = `bold ${h * 0.03}px ${SANS}`;
    c.fillText(`${k + 1}`, m, y);
    c.fillStyle = '#16232b';
    y =
      para(
        c,
        l,
        m + w * 0.06,
        y,
        w - 2 * m - w * 0.06,
        h * 0.027,
        `{} ${SANS}`,
      ) +
      h * 0.008;
  });
  c.fillStyle = '#6a6f72';
  para(
    c,
    DRAMATISATION,
    m,
    h * 0.95,
    w - 2 * m,
    h * 0.022,
    `italic {} ${SANS}`,
  );
}

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

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

export function buildHallExhibit(kit: PanelKit): HallExhibit {
  const t = tools(kit);
  const object = new Group();
  object.name = 'Hall 8: Never again';
  const parts = createPartSet();
  const solids: Footprint[] = [];
  const still = (thing: Object3D) => {
    mergeTree(thing, (o) => o.userData.live === true);
    return thing;
  };
  const frameMat = t.paint('#0e0f10', 0.6, 0.2);
  const brass = t.paint('#a0803e', 0.35, 0.7);

  // ---- The dark lining: the walls painted charcoal to the sills ----
  const lining = new Group();
  const dark = t.paint('#1b1d20', 0.9);
  const darkMat = dark as Material;
  darkMat.polygonOffset = true;
  darkMat.polygonOffsetFactor = -1;
  darkMat.polygonOffsetUnits = -2;
  const sheet = (x: number, z: number, w: number, yaw: number) => {
    const m = t.box(lining, dark, w, LINING_H, 0.002, 0, LINING_H / 2, 0);
    turnTo(m, x, LINING_H / 2, z, yaw);
  };
  sheet(0, SOUTH - 0.006, 15.4, Math.PI);
  sheet(0, NORTH + 0.006, 15.4, 0);
  for (const [x, yaw] of [
    [EAST - 0.006, -Math.PI / 2],
    [WEST + 0.006, Math.PI / 2],
  ] as const)
    for (const z of [-4.25, 4.25]) sheet(x, z, 4.9, yaw);
  lining.name = 'Dark gallery lining';
  object.add(
    still(markComponent(lining, { name: 'Gallery wall', decorative: true })),
  );

  // ---- The six chapters ----
  const photoMats: { color: Color }[] = [];
  const plaqueMats: { color: Color }[] = [];
  const lamps: { set(l: boolean | number): void }[] = [];
  const PLACES = [
    { x: 4.9, z: SOUTH, yaw: Math.PI },
    { x: 0.2, z: SOUTH, yaw: Math.PI },
    { x: -4.5, z: SOUTH, yaw: Math.PI },
    { x: -4.5, z: NORTH, yaw: 0 },
    { x: 0.2, z: NORTH, yaw: 0 },
    { x: 4.9, z: NORTH, yaw: 0 },
  ];
  CHAPTERS.forEach((ch, k) => {
    const unit = new Group();
    unit.name = `Chapter ${ch.number}: ${ch.title}`;
    const at = PLACES[k];
    turnTo(unit, at.x, 0, at.z, at.yaw);
    const px = -0.37;
    // The photograph in its black frame, with a white mount.
    t.box(unit, frameMat, 1.62, 1.12, 0.05, px, 1.85, 0.025);
    const photo = t.printed(1.5, 1.0, paintPlaceholder(ch), 768, true);
    photo.mesh.position.set(px, 1.85, 0.052);
    photo.mesh.userData.live = true;
    unit.add(photo.mesh);
    const mat = photo.mesh.material as unknown as Material & {
      color: Color;
      map: unknown;
      needsUpdate: boolean;
    };
    photoMats.push(mat);
    const url = PHOTO_URLS.get(`chapter-${ch.number}`);
    if (url)
      new TextureLoader().load(new URL(url, import.meta.url).href, (tex) => {
        tex.colorSpace = SRGBColorSpace;
        kit.textures.push(tex);
        mat.map = tex;
        mat.needsUpdate = true;
      });
    // Its picture light above it.
    t.box(unit, brass, 0.9, 0.04, 0.05, px, 2.5, 0.2);
    t.box(unit, brass, 0.03, 0.03, 0.2, px, 2.5, 0.1);
    const lamp = t.led(unit, '#ffe2a8', 0.02, px, 2.48, 0.2, 'y');
    lamp.mesh.scale.set(20, 1, 1);
    lamp.mesh.userData.live = true;
    lamps.push(lamp);
    // Its clipping, pinned in a slim frame.
    if (ch.clipping) {
      t.box(unit, frameMat, 0.68, 0.91, 0.03, 0.81, 1.85, 0.015);
      const cut = t.printed(0.62, 0.85, paintClipping(ch.clipping), 700, true);
      cut.mesh.position.set(0.81, 1.85, 0.032);
      unit.add(cut.mesh);
    }
    // Its plaque.
    const plaque = t.printed(1.5, 0.42, paintPlaque(ch), 900, true);
    plaque.mesh.position.set(px, 0.98, 0.02);
    plaque.mesh.userData.live = true;
    unit.add(plaque.mesh);
    plaqueMats.push(plaque.mesh.material as unknown as { color: Color });
    object.add(
      still(
        markComponent(unit, {
          name: `Chapter ${ch.number}, ${ch.time}: ${ch.title}`,
          decorative: true,
        }),
      ),
    );
  });

  // ---- The opening panel, by the way in ----
  const opening = createWallPanel(kit, 'Opening panel', 1.5, 1.7, paintOpening);
  turnTo(opening, EAST, 1.55, 4.4, -Math.PI / 2);
  object.add(still(opening));

  // ---- Chlorella's panel and the lessons, by the way out ----
  const sponsor = createWallPanel(
    kit,
    'Chlorella’s sponsor panel',
    2.0,
    1.75,
    paintSponsor,
  );
  turnTo(sponsor, WEST, 1.55, -4.3, Math.PI / 2);
  object.add(still(sponsor));

  // ---- The narration button, by chapter 1 ----
  let narration: Narration = NARRATION_OFF;
  let shown: number | null | undefined;
  let audio: HTMLAudioElement | null = null;
  const stopAudio = () => {
    audio?.pause();
    audio = null;
  };
  const playClip = (name: string) => {
    stopAudio();
    const url = CLIP_URLS.get(name);
    if (!url || typeof Audio === 'undefined') return;
    audio = new Audio(new URL(url, import.meta.url).href);
    void audio.play().catch(() => {});
  };
  const press = () => {
    narration = pressNarration(narration);
    if (narration.playing) playClip('account');
    else stopAudio();
  };
  const pedestal = new Group();
  pedestal.name = 'HEAR WHAT HAPPENED button';
  const yellow = t.paint('#f2c418', 0.5);
  t.box(pedestal, frameMat, 0.42, 0.04, 0.42, 0, 0.02, 0);
  t.box(pedestal, yellow, 0.28, 0.7, 0.28, 0, 0.39, -0.03);
  const top = new Group();
  top.position.set(0, 0.92, 0.04);
  top.rotation.x = -0.5;
  pedestal.add(top);
  t.box(top, yellow, 0.34, 0.26, 0.06, 0, 0, -0.03);
  const lit = signal(false);
  const button = parts.add(
    pushButton(kit, {
      colour: 'green',
      head: 'illuminated',
      lamp: lit,
      name: 'HEAR WHAT HAPPENED',
      action: press,
    }),
  );
  button.object.scale.setScalar(3.2);
  button.object.position.set(0, -0.01, 0.002);
  top.add(button.object);
  const legend = createMicroLabel(kit, 'HEAR WHAT HAPPENED', {
    height: 0.03,
    ink: '#ffffff',
    plate: '#1f2a2e',
    maxWidth: 0.32,
  });
  legend.position.set(0, 0.1, 0.002);
  top.add(legend);
  const push = createMicroLabel(kit, 'PUSH · AGAIN TO STOP', {
    height: 0.024,
    ink: '#111111',
    plate: '#ffffff',
  });
  push.position.set(0, -0.105, 0.002);
  top.add(push);
  markFrontCentre(pedestal);
  turnTo(pedestal, 6.9, 0, 5.9, (-3 * Math.PI) / 4);
  object.add(
    markComponent(pedestal, {
      name: 'HEAR WHAT HAPPENED push button',
      status: () =>
        narration.playing ? 'lit: the account is playing' : 'unlit',
    }),
  );
  solids.push({ minX: 6.65, maxX: 7.15, minZ: 5.65, maxZ: 6.15 });

  // ---- The central case: the two fill points, before and after ----
  const showcase = new Group();
  showcase.name = 'The two fill points, before and after';
  const PLINTH_H = 0.8;
  const plinth = t.paint('#202326', 0.6);
  t.box(showcase, plinth, 2.6, PLINTH_H, 1.1, 0, PLINTH_H / 2, 0);
  t.box(showcase, frameMat, 2.62, 0.08, 1.12, 0, PLINTH_H + 1.39, 0);
  const glow = t.led(showcase, '#fff4dc', 0.02, 0, PLINTH_H + 1.34, 0, 'y');
  glow.mesh.scale.set(100, 1, 40);
  glow.set(1);
  const glass = t.paint('#cfe3e6', 0.05, 0.1) as Material & {
    transparent: boolean;
    opacity: number;
    depthWrite: boolean;
  };
  glass.transparent = true;
  glass.opacity = 0.12;
  glass.depthWrite = false;
  const GH = 1.35;
  const gy = PLINTH_H + GH / 2;
  t.box(showcase, glass, 2.6, GH, 0.01, 0, gy, 0.55);
  t.box(showcase, glass, 2.6, GH, 0.01, 0, gy, -0.55);
  t.box(showcase, glass, 0.01, GH, 1.1, 1.3, gy, 0);
  t.box(showcase, glass, 0.01, GH, 1.1, -1.3, gy, 0);
  t.label(showcase, 'PLANTROOMS', 1.1, PLINTH_H - 0.08, 0.552, 0.03, '#d9d4c6');

  // Before: two identical camlocks in an open recess, labels blank.
  const before = new Group();
  before.position.set(-0.65, PLINTH_H, -0.15);
  showcase.add(before);
  const steel = t.paint('#7d8387', 0.4, 0.6);
  t.box(before, steel, 0.8, 0.55, 0.01, 0, 0.5, -0.12);
  t.box(before, steel, 0.8, 0.01, 0.25, 0, 0.225, 0);
  t.box(before, steel, 0.8, 0.01, 0.25, 0, 0.775, 0);
  for (const x of [-0.4, 0.4])
    t.box(before, steel, 0.01, 0.55, 0.25, x, 0.5, 0);
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

  // After: the game's fill cabinet, doors open, couplings inside.
  const cabinet = createFillCabinet(kit);
  const door = cabinet.userData.door as Object3D | undefined;
  if (door) door.rotation.y = 1.75;
  cabinet.position.set(0.5, PLINTH_H + 0.5, -0.5);
  showcase.add(cabinet);
  t.box(showcase, steel, 0.8, 1.05, 0.01, 0.5, PLINTH_H + 0.53, -0.51);
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
    t.cyl(showcase, rubber, r, 0.3, x, PLINTH_H + r, 0.3, 'x', 16);
    const end = small ? t.paint('#d9d4d0', 0.5) : brass;
    t.cyl(
      showcase,
      end,
      r * 1.5,
      0.08,
      x - 0.18,
      PLINTH_H + r * 1.5,
      0.3,
      'x',
      16,
    );
    t.cyl(
      showcase,
      t.paint(colour, 0.5),
      r * 1.05,
      0.03,
      x + 0.05,
      PLINTH_H + r,
      0.3,
      'x',
      16,
    );
    t.label(
      showcase,
      text,
      x,
      PLINTH_H + 0.005,
      0.42,
      0.022,
      '#111111',
      colour,
    ).rotation.x = -Math.PI / 2;
  }

  // The plaques on a sloped rail along its south face.
  const rail = new Group();
  rail.position.set(0, PLINTH_H - 0.12, 0.56);
  rail.rotation.x = -0.6;
  showcase.add(rail);
  const card = (
    w: number,
    h: number,
    x: number,
    draw: Parameters<typeof t.printed>[2],
  ) => {
    const p = t.printed(w, h, draw, 700, true);
    p.mesh.position.set(x, 0, 0.02);
    rail.add(p.mesh);
  };
  card(
    0.6,
    0.22,
    -0.95,
    paintCaseCard(CASE_PLAQUES.before.title, CASE_PLAQUES.before.body),
  );
  card(
    0.6,
    0.22,
    -0.32,
    paintCaseCard(CASE_PLAQUES.fix, CASE_PLAQUES.frankfurt),
  );
  card(
    0.6,
    0.22,
    0.31,
    paintCaseCard(CASE_PLAQUES.after.title, CASE_PLAQUES.after.body),
  );
  card(
    0.6,
    0.22,
    0.94,
    paintCaseCard('Museum specimens', CASE_PLAQUES.specimen),
  );
  object.add(
    still(
      markComponent(showcase, {
        name: 'Museum case: the two fill points, before and after (specimens, connected to nothing)',
        decorative: true,
      }),
    ),
  );
  solids.push({ minX: -1.35, maxX: 1.35, minZ: -0.6, maxZ: 0.75 });

  const show = () => {
    const now = litChapter(narration);
    if (now === shown) return;
    if (
      narration.playing &&
      now !== null &&
      now > 0 &&
      !CLIP_URLS.has('account')
    )
      playClip(`chapter-${now + 1}`);
    else if (narration.playing && now === 0 && !CLIP_URLS.has('account'))
      playClip('chapter-1');
    shown = now;
    lit.value = narration.playing;
    CHAPTERS.forEach((_, k) => {
      const level = now === null || now === k ? 1 : 0.3;
      photoMats[k].color.setScalar(level);
      plaqueMats[k].color.setScalar(level);
      lamps[k].set(level);
    });
  };

  return {
    object,
    parts,
    status: () =>
      narration.playing
        ? `narrating chapter ${(litChapter(narration) ?? 0) + 1}`
        : 'quiet',
    solids: () => solids,
    reset() {
      narration = NARRATION_OFF;
      stopAudio();
      show();
    },
    update(delta) {
      narration = stepNarration(
        narration,
        delta,
        CHAPTER_SECONDS * CHAPTERS.length,
      );
      if (!narration.playing && audio && !CLIP_URLS.has('account')) stopAudio();
      show();
    },
    dispose() {
      stopAudio();
    },
  };
}
