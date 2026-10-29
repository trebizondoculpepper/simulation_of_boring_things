import { Group, Mesh, Shape, ShapeGeometry, Vector3 } from 'three';
import type { Camera, Color, Material, Object3D } from 'three';
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
  CHAPTERS,
  CHAPTER_SECONDS,
  DRAMATISATION,
  NARRATION_OFF,
  OPENING,
  PAPER,
  SPONSOR,
  litChapter,
  narrationClip,
  nearestChapter,
  pressNarration,
  stepNarration,
} from '../../logic/museum-8-incident';
import type {
  Chapter,
  Clipping,
  Narration,
} from '../../logic/museum-8-incident';
import { createWallPanel } from '../../views/museum-exhibit';
import { createFillPointsCase, para } from '../../views/fill-points-case';
import { windowShape } from '../../views/museum-hall';
import { showPhoto } from '../../views/photo-print';
import {
  HALL_TITLE,
  MUSEUM_ARCH,
  MUSEUM_SQUARE,
  MUSEUM_WALL,
  beyondAt,
  hallArches,
  hallOrigin,
  hallWalls,
  wallWindows,
} from '../../logic/museum-plan';
import type { HallWall } from '../../logic/museum-plan';
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
/** Their low-resolution copies (`scripts/photo-lows.ts`). */
const LOW_URLS = byName(
  import.meta.glob<string>(
    '../../../../../resources/images/never-again/lo/*.jpg',
    {
      eager: true,
      query: '?url',
      import: 'default',
    },
  ),
);
const CLIP_URLS = byName(CLIPS);

/** The walls' room faces. */
const SOUTH = 6.7;
const NORTH = -6.7;
const EAST = 7.7;
const WEST = -7.7;
/** The black walls' finish (the owner, 2026-10-28: "Make hall 7, 'Never again' black walls"). */
const BLACK = '#0d0d0e';
const SERIF = 'Georgia, "Times New Roman", serif';

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
    const y = para(
      c,
      ch.wrong,
      m,
      h * 0.34,
      w - 2 * m,
      h * 0.085,
      `{} ${SANS}`,
    );
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
  para(
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

const turnTo = (o: Object3D, x: number, y: number, z: number, yaw: number) => {
  o.position.set(x, y, z);
  o.rotation.y = yaw;
  return o;
};

const HALL = 'museum8';
/** The paint's lift off the brick, so the two never fight. */
const PROUD = 0.006;

/**
 * One wall's black paint, a sheet on its inside face in the wall's own
 * (along, up), mirrored so it faces into the hall once turned (`placeLining`):
 * floor to roof deck, its archways notched out and its windows cut out,
 * and on the street wall a white panel left round the hall's title vinyl,
 * whose dark letters would be lost on black.
 */
function blackWall(wall: HallWall) {
  const n = [-wall.out[0], -wall.out[1]] as const;
  const yaw = Math.atan2(n[0], n[1]);
  // The sheet's x along the wall, after turning: its sign.
  const dir = Math.round(wall.axis === 'x' ? Math.cos(yaw) : -Math.sin(yaw));
  const half = MUSEUM_WALL / 2;
  const [lo, hi] = [wall.from + half, wall.to - half]
    .map((u) => u * dir)
    .sort((p, q) => p - q);
  const top = MUSEUM_SQUARE.h;
  const shape = new Shape();
  shape.moveTo(lo, 0);
  const arches = hallArches(HALL)
    .filter(
      (a) =>
        a.axis === wall.axis &&
        Math.abs((wall.axis === 'x' ? a.at.z : a.at.x) - wall.line) < 1e-9,
    )
    .map((a) => ({ a, u: (wall.axis === 'x' ? a.at.x : a.at.z) * dir }))
    .sort((p, q) => p.u - q.u);
  for (const { a, u } of arches) {
    const r = a.w / 2;
    shape.lineTo(u - r, 0);
    if (a.kind === 'arch') {
      shape.lineTo(u - r, MUSEUM_ARCH.spring);
      shape.absarc(u, MUSEUM_ARCH.spring, r, Math.PI, 0, true);
    } else {
      shape.lineTo(u - r, a.top);
      shape.lineTo(u + r, a.top);
    }
    shape.lineTo(u + r, 0);
  }
  shape.lineTo(hi, 0);
  shape.lineTo(hi, top);
  shape.lineTo(lo, top);
  shape.closePath();
  for (const w of wallWindows(HALL, wall))
    shape.holes.push(windowShape({ ...w, u: w.u * dir }));
  const mid = (wall.from + wall.to) / 2;
  if (beyondAt(wall, mid) === 'street') {
    const panel = new Shape();
    const pw = HALL_TITLE.w / 2 + 0.35;
    // Down to the vinyl's foot only: clear of the picture lights below.
    const foot = HALL_TITLE.y - HALL_TITLE.h / 2;
    const head = HALL_TITLE.y + HALL_TITLE.h / 2 + 0.35;
    const u = mid * dir;
    panel.moveTo(u - pw, foot);
    panel.lineTo(u + pw, foot);
    panel.lineTo(u + pw, head);
    panel.lineTo(u - pw, head);
    panel.closePath();
    shape.holes.push(panel);
  }
  return new ShapeGeometry(shape, 24);
}

/** Stand a wall's black sheet on its inside face, in the hall's frame. */
function placeLining(sheet: Mesh, wall: HallWall) {
  const o = hallOrigin(HALL);
  const n = [-wall.out[0], -wall.out[1]] as const;
  sheet.rotation.y = Math.atan2(n[0], n[1]);
  const face =
    wall.line + (wall.axis === 'x' ? n[1] : n[0]) * (MUSEUM_WALL / 2 + PROUD);
  if (wall.axis === 'x') sheet.position.set(-o.x, 0, face - o.z);
  else sheet.position.set(face - o.x, 0, -o.z);
}

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

  // ---- The black walls: the brick painted matt black, floor to roof ----
  const lining = new Group();
  const dark = t.paint(BLACK, 0.95);
  const darkMat = dark as Material;
  darkMat.polygonOffset = true;
  darkMat.polygonOffsetFactor = -1;
  darkMat.polygonOffsetUnits = -2;
  for (const wall of hallWalls(HALL)) {
    const sheet = new Mesh(blackWall(wall), dark);
    placeLining(sheet, wall);
    lining.add(sheet);
  }
  lining.name = 'Black gallery walls';
  object.add(
    still(markComponent(lining, { name: 'Gallery wall', decorative: true })),
  );

  // ---- The six chapters ----
  const photoMats: { color: Color }[] = [];
  const photoMeshes: Object3D[] = [];
  // The visitor's eye, caught as a photograph is drawn (as Hall 7 does).
  let eye: Camera | null = null;
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
    photo.mesh.onBeforeRender = (_r, _s, camera) => {
      eye = camera;
    };
    photoMeshes.push(photo.mesh);
    unit.add(photo.mesh);
    const mat = photo.mesh.material as unknown as Material & {
      color: Color;
    };
    photoMats.push(mat);
    // Its low-resolution copy until looked at close to (`photo-print.ts`).
    const url = PHOTO_URLS.get(`chapter-${ch.number}`);
    const low = LOW_URLS.get(`chapter-${ch.number}`);
    if (url && low)
      showPhoto(photo.mesh, {
        low: new URL(low, import.meta.url).href,
        full: new URL(url, import.meta.url).href,
        textures: kit.textures,
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
  // It tells the chapter whose photograph the visitor stands nearest: its
  // clip if recorded (until the clip ends), else its photograph lit alone
  // for CHAPTER_SECONDS, silently.
  let narration: Narration = NARRATION_OFF;
  let shown: number | null | undefined;
  let audio: HTMLAudioElement | null = null;
  const stopAudio = () => {
    audio?.pause();
    audio = null;
  };
  const playClip = (name: string): boolean => {
    stopAudio();
    const url = CLIP_URLS.get(name);
    if (!url || typeof Audio === 'undefined') return false;
    const clip = new Audio(new URL(url, import.meta.url).href);
    clip.addEventListener('ended', () => {
      if (audio !== clip) return;
      audio = null;
      narration = NARRATION_OFF;
      show();
    });
    audio = clip;
    void clip.play().catch(() => {});
    return true;
  };
  /** How long the chapter playing lasts: its clip's length, or CHAPTER_SECONDS. */
  let seconds = CHAPTER_SECONDS;
  const seen = new Vector3();
  /** On the hall's floor plan, metres. */
  const plan = (o: Object3D) => {
    object.worldToLocal(o.getWorldPosition(seen));
    return { x: seen.x, z: seen.z };
  };
  const press = () => {
    const chapter = eye ? nearestChapter(plan(eye), photoMeshes.map(plan)) : 0;
    narration = pressNarration(narration, chapter);
    if (narration.playing) {
      const heard = playClip(narrationClip(CHAPTERS[chapter]));
      seconds = heard ? Infinity : CHAPTER_SECONDS;
    } else stopAudio();
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
        narration.playing
          ? `lit: chapter ${narration.chapter + 1} is told`
          : 'unlit',
    }),
  );
  solids.push({ minX: 6.65, maxX: 7.15, minZ: 5.65, maxZ: 6.15 });

  // ---- The central case: the two fill points, before and after ----
  const showcase = createFillPointsCase(kit);
  object.add(still(showcase.object));
  solids.push(showcase.solid);

  const show = () => {
    const now = litChapter(narration);
    if (now === shown) return;
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
      narration = stepNarration(narration, delta, seconds);
      if (!narration.playing && audio) stopAudio();
      show();
    },
    dispose() {
      stopAudio();
    },
  };
}
