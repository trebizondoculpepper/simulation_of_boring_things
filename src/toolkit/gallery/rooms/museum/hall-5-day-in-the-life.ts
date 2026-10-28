import { Box3, Group, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import type { Camera, Material, Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { mergeTree } from '../../../components/core/views/merge-static';
import { markComponent } from '../../../components/core/views/component-identity';
import { tools } from '../../../components/core/views/fitting-tools';
import { createPoolClock } from '../../../components/architectural/views/pool-clock';
import { createSkip } from '../../../components/site-dressing/views/skip';
import { createBinTossing } from '../../../components/site-dressing/parts/bin-tossing';
import type { TossBin } from '../../../components/site-dressing/parts/bin-tossing';
import { objectImpact } from '../../../components/core/audio/object-impact';
import { METRE } from '../../../components/core/logic/units';
import { createPortableBoard } from '../../../controls/logic/portable-board';
import { createDropProfile } from '../../../controls/logic/drop-profile';
import type { DropProfile } from '../../../controls/logic/drop-profile';
import type { PortableObject } from '../../../controls/input/object-handling';
import type { PlacementTarget } from '../../../controls/input/placement-target';
import {
  click,
  partAudio,
  recording,
} from '../../../components/core/audio/part-audio';
import type { SoundRecipe } from '../../../components/core/audio/part-audio';
import { markFrontCentre } from '../../../components/core/audio/front-centre';
import {
  CLEARED_LINE,
  SKIMMER_TAGS,
  actOnSkimmer,
  cleared,
  findOf,
  held,
  inBasket,
  newSkimmerGame,
} from '../../logic/museum-5-skimmer';
import type {
  FindId,
  SkimmerAction,
  SkimmerGame,
} from '../../logic/museum-5-skimmer';
import {
  BAY,
  OPENING_CHECKS,
  POOLSIDE,
  SKIMMER_PLACARD,
  SKIP_SIGN,
  WALL,
  bayPlaces,
  hall5Entrance,
} from '../../logic/museum-5-gallery';
import type { Decade, PhotoLook } from '../../logic/museum-5-gallery';
import { RESET_SIGN } from '../../logic/ideal-pool-plant-placards';
import { localNow } from '../../logic/museum-time';
import {
  createLectern,
  createResetPedestal,
  createWallPanel,
  paintEntrance,
  paintResetSign,
} from '../../views/museum-exhibit';
import { createFindProps } from './hall-5-finds';
import type { CarryingExhibit, ExhibitHands } from './exhibit-carrying';

/**
 * Hall 5, "A Day in the Life" (107l): a poolman's duties through the
 * decades as a photographic exhibition round the north and east walls,
 * earliest on the visitor's left, and in the middle of the floor its
 * hands-on duty, "What's in the Skimmer?" (107f): a dry painted poolside
 * with a Certikind wall skimmer, its lid lifted aside, its finds taken
 * out one at a time and carried to a skip. The game is pure
 * (`museum-5-skimmer.ts`); the words and places too
 * (`museum-5-gallery.ts`). In the hall's frame, metres.
 *
 * Carrying is the control scheme's own pick-up, carry and drop, through
 * the museum's exhibit hook (`exhibit-carrying.ts`): the lid and the finds
 * are portable objects, the skimmer hands its next find over (`give`), and
 * the skip takes finds tossed into it (`bin-tossing.ts`), not the lid.
 */

const FACE_NORTH = Math.PI;
const FACE_EAST = Math.PI / 2;
const SANS = 'Arial, Helvetica, sans-serif';

/** Voice clips, where recorded (107f): a missing one is simply absent. */
const CLIPS = import.meta.glob(
  '../../../../../resources/sound/voice/skimmer/*.mp3',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
const clipFor = (name: string) => {
  const key = Object.keys(CLIPS).find((k) => k.endsWith(`/${name}.mp3`));
  return key ? new URL(CLIPS[key], location.href) : null;
};

const PICK_UP: SoundRecipe = click({
  band: 1800,
  q: 1.2,
  decay: 0.06,
  level: 0.25,
});
/** The finds are drawn a little larger than life, to be seen on the deck. */
const FIND_SCALE = 1.6;
/** The lid: a flat plastic disc 250 mm across. */
const LID_DROP = createDropProfile('flat', 0.25, 'plastic');
/** Finds that ring when dropped. */
const METAL_FINDS = new Set<FindId>([
  'coins',
  'sixpence',
  'wedding-ring',
  'earring',
  'car-key',
  'hair-grips',
]);
const CHIME: SoundRecipe = {
  tones: [
    { at: 0, hz: 784, seconds: 0.18, level: 0.2, type: 'sine' },
    { at: 0.16, hz: 988, seconds: 0.18, level: 0.2, type: 'sine' },
    { at: 0.32, hz: 1175, seconds: 0.4, level: 0.2, type: 'sine' },
  ],
};

/** A photograph's colours by its decade's look. */
const LOOKS: Record<
  PhotoLook,
  { paper: string; dark: string; light: string; mid: string }
> = {
  sepia: {
    paper: '#efe2c4',
    dark: '#4a3420',
    light: '#d8c29a',
    mid: '#8a6a44',
  },
  'black-and-white': {
    paper: '#f2f2ee',
    dark: '#202020',
    light: '#d4d4d0',
    mid: '#7a7a76',
  },
  'faded-colour': {
    paper: '#f6efe2',
    dark: '#5a4a3a',
    light: '#e4cfa8',
    mid: '#7aa0a0',
  },
  'colour-print': {
    paper: '#ffffff',
    dark: '#24384a',
    light: '#d6e6ee',
    mid: '#3a8ab0',
  },
  'early-digital': {
    paper: '#ffffff',
    dark: '#1a2a3a',
    light: '#cfe4f0',
    mid: '#2a90c8',
  },
  digital: {
    paper: '#ffffff',
    dark: '#0e2230',
    light: '#e6f4fa',
    mid: '#1aa0d8',
  },
};

function wrapText(c: CanvasRenderingContext2D, text: string, width: number) {
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
}

/** A decade's bay: its heading, three placeholder photographs with their captions, and its stretch of the timeline. */
function paintBay(d: Decade) {
  return (c: CanvasRenderingContext2D, w: number, h: number) => {
    const look = LOOKS[d.look];
    c.fillStyle = '#f6f4ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#16232b';
    c.font = `bold ${h * 0.085}px ${SANS}`;
    c.fillText(d.decade, w * 0.02, h * 0.09);
    c.font = `italic ${h * 0.045}px ${SANS}`;
    c.fillStyle = '#4c5a62';
    c.fillText(d.strap, w * 0.2, h * 0.085, w * 0.78);
    const fw = (BAY.frameW / BAY.w) * w;
    const gap = (w - 3 * fw) / 4;
    const top = h * 0.14;
    const fh = (BAY.frameH / BAY.w) * w;
    d.photos.forEach((p, k) => {
      const x = gap + k * (fw + gap);
      // The mount and the print, in the decade's look, a placeholder scene.
      c.fillStyle = '#fbfaf6';
      c.fillRect(x, top, fw, fh);
      const m = fw * 0.07;
      const px = x + m;
      const py = top + m;
      const pw = fw - 2 * m;
      const ph = fh - 2 * m;
      const grad = c.createLinearGradient(0, py, 0, py + ph);
      grad.addColorStop(0, look.light);
      grad.addColorStop(1, look.mid);
      c.fillStyle = grad;
      c.fillRect(px, py, pw, ph);
      // A poolside, a figure at work: the shape of the picture to come.
      c.fillStyle = look.mid;
      c.fillRect(px, py + ph * 0.62, pw, ph * 0.38);
      c.fillStyle = look.paper;
      c.fillRect(px, py + ph * 0.6, pw, ph * 0.04);
      c.fillStyle = look.dark;
      const fx = px + pw * (0.3 + 0.2 * k);
      c.beginPath();
      c.arc(fx, py + ph * 0.3, ph * 0.06, 0, Math.PI * 2);
      c.fill();
      c.fillRect(fx - ph * 0.05, py + ph * 0.36, ph * 0.1, ph * 0.24);
      c.globalAlpha = 0.85;
      c.fillStyle = look.paper;
      c.fillRect(px, py + ph * 0.78, pw, ph * 0.22);
      c.globalAlpha = 1;
      c.fillStyle = look.dark;
      c.font = `bold ${ph * 0.1}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText(
        `${d.decade} · ${p.when.toUpperCase()}`,
        px + pw / 2,
        py + ph * 0.86,
      );
      c.font = `${ph * 0.07}px ${SANS}`;
      c.fillText('PHOTOGRAPH TO COME', px + pw / 2, py + ph * 0.95);
      c.textAlign = 'left';
      // Its caption below.
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.04}px ${SANS}`;
      c.fillText(p.when, x, top + fh + h * 0.06);
      c.font = `${h * 0.036}px ${SANS}`;
      wrapText(c, p.caption, fw).forEach((line, n) =>
        c.fillText(line, x, top + fh + h * 0.11 + n * h * 0.045),
      );
    });
    // The timeline rail's stretch, the decade marked on it.
    c.fillStyle = '#0f6f7c';
    c.fillRect(0, h * 0.94, w, h * 0.02);
    c.beginPath();
    c.arc(w * 0.03, h * 0.95, h * 0.022, 0, Math.PI * 2);
    c.fill();
  };
}

/** The cut-away of a skimmer, as a museum diagram. */
function paintCutaway(c: CanvasRenderingContext2D, w: number, h: number) {
  c.fillStyle = '#f6f4ec';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#0f6f7c';
  c.fillRect(0, 0, w, h * 0.12);
  c.fillStyle = '#ffffff';
  c.font = `bold ${h * 0.07}px ${SANS}`;
  c.fillText('Inside a skimmer', w * 0.04, h * 0.085);
  const ox = w * 0.1;
  const oy = h * 0.25;
  // The pool's wall and its water, on the left.
  c.fillStyle = '#5fb0d6';
  c.fillRect(ox, oy + h * 0.18, w * 0.25, h * 0.55);
  c.fillStyle = '#d9e2e4';
  c.fillRect(ox + w * 0.25, oy, w * 0.04, h * 0.73);
  // The deck and the lid.
  c.fillStyle = '#c9c2b2';
  c.fillRect(ox + w * 0.25, oy, w * 0.5, h * 0.05);
  c.fillStyle = '#f4f4f0';
  c.fillRect(ox + w * 0.36, oy - h * 0.02, w * 0.2, h * 0.03);
  // The body, the weir flap, the basket, the suction port capped.
  c.strokeStyle = '#16232b';
  c.lineWidth = w * 0.004;
  c.strokeRect(ox + w * 0.29, oy + h * 0.05, w * 0.35, h * 0.5);
  c.fillStyle = '#e8e4d8';
  c.fillRect(ox + w * 0.25, oy + h * 0.14, w * 0.08, h * 0.14);
  c.fillStyle = '#16232b';
  c.save();
  c.translate(ox + w * 0.29, oy + h * 0.15);
  c.rotate(0.35);
  c.fillRect(0, 0, w * 0.007, h * 0.12);
  c.restore();
  c.fillStyle = '#9aa6aa';
  c.fillRect(ox + w * 0.37, oy + h * 0.22, w * 0.18, h * 0.2);
  c.fillStyle = '#16232b';
  c.fillRect(ox + w * 0.44, oy + h * 0.55, w * 0.04, h * 0.12);
  c.fillRect(ox + w * 0.42, oy + h * 0.67, w * 0.08, h * 0.02);
  c.font = `${h * 0.04}px ${SANS}`;
  const label = (t: string, x: number, y: number) =>
    c.fillText(t, x, y, w * 0.3);
  label('LID', ox + w * 0.58, oy - h * 0.03);
  label('WEIR FLAP', ox + w * 0.02, oy + h * 0.12);
  label('BASKET', ox + w * 0.66, oy + h * 0.32);
  label('TO THE PUMP (capped)', ox + w * 0.52, oy + h * 0.66);
  label('WATER', ox + w * 0.05, oy + h * 0.5);
  c.font = `italic ${h * 0.038}px ${SANS}`;
  c.fillStyle = '#4c5a62';
  wrapText(
    c,
    'The weir flap floats on the water and lets only the top few millimetres in. The basket catches the big things before the pump. This one is dry: its suction line is capped.',
    w * 0.9,
  ).forEach((line, n) => c.fillText(line, w * 0.05, h * 0.86 + n * h * 0.05));
}

/** The dry poolside's paint: deck tiles, coping, the skimmer edge's stepped tile face, and the water, flat. */
function paintPoolside(c: CanvasRenderingContext2D, w: number, h: number) {
  const { deck, water, coping, skimmer } = POOLSIDE;
  const sx = w / (deck.maxX - deck.minX);
  const sz = h / (deck.maxZ - deck.minZ);
  const X = (x: number) => (x - deck.minX) * sx;
  const Z = (z: number) => (z - deck.minZ) * sz;
  c.fillStyle = '#d8d3c6';
  c.fillRect(0, 0, w, h);
  c.strokeStyle = '#bdb6a6';
  c.lineWidth = 1;
  for (let x = 0; x < w; x += sx * 0.15) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, h);
    c.stroke();
  }
  for (let z = 0; z < h; z += sz * 0.15) {
    c.beginPath();
    c.moveTo(0, z);
    c.lineTo(w, z);
    c.stroke();
  }
  // The coping, round the water.
  c.fillStyle = '#efece4';
  c.fillRect(
    X(water.minX - coping),
    Z(water.minZ - coping),
    (water.maxX - water.minX + 2 * coping) * sx,
    (water.maxZ - water.minZ + 2 * coping) * sz,
  );
  // The water, its surface a little below the coping: a strip of the
  // tiled wall's face shows above it, painted, on every side.
  const face = 0.1;
  c.fillStyle = '#e4f0f2';
  c.fillRect(
    X(water.minX),
    Z(water.minZ),
    (water.maxX - water.minX) * sx,
    (water.maxZ - water.minZ) * sz,
  );
  c.strokeStyle = '#b8ccd0';
  for (let x = water.minX; x < water.maxX; x += 0.05) {
    c.beginPath();
    c.moveTo(X(x), Z(water.minZ));
    c.lineTo(X(x), Z(water.minZ + face));
    c.stroke();
  }
  const wx = X(water.minX + face);
  const wz = Z(water.minZ + face);
  const ww = (water.maxX - water.minX - 2 * face) * sx;
  const wd = (water.maxZ - water.minZ - 2 * face) * sz;
  const g = c.createLinearGradient(0, wz, 0, wz + wd);
  g.addColorStop(0, '#5ab8dc');
  g.addColorStop(1, '#2a7fb4');
  c.fillStyle = g;
  c.fillRect(wx, wz, ww, wd);
  // Its light's ripples, painted.
  c.strokeStyle = 'rgba(255,255,255,0.28)';
  c.lineWidth = Math.max(1, sx * 0.02);
  for (let k = 0; k < 160; k++) {
    const x = wx + ((k * 137.5) % ww);
    const z = wz + ((k * 71.3) % wd);
    c.beginPath();
    c.moveTo(x, z);
    c.quadraticCurveTo(x + sx * 0.12, z - sz * 0.05, x + sx * 0.25, z);
    c.stroke();
  }
  // Lane lines on the floor of the painted water.
  c.fillStyle = 'rgba(16,40,80,0.45)';
  for (let k = 1; k <= 3; k++) {
    const z = wz + (k * wd) / 4;
    c.fillRect(wx + sx * 0.6, z - sz * 0.05, ww - sx * 1.2, sz * 0.1);
  }
  // The skimmer's throat, a dark mouth in the painted tile face, its weir flap.
  const tx = X(skimmer.x - 0.12);
  c.fillStyle = '#1b2226';
  c.fillRect(tx, Z(water.minZ), 0.24 * sx, face * sz);
  c.fillStyle = '#e8e6de';
  c.fillRect(tx, Z(water.minZ + face * 0.55), 0.24 * sx, face * 0.2 * sz);
}

export function buildHallExhibit(kit: PanelKit): CarryingExhibit {
  let game: SkimmerGame = newSkimmerGame(1);
  let sinceReset = 0;
  const object = new Group();
  object.name = 'Hall 5: A Day in the Life';
  const parts = createPartSet();
  const t = tools(kit);
  const updates: ((delta: number) => void)[] = [];
  const solids: { minX: number; maxX: number; minZ: number; maxZ: number }[] =
    [];
  const footprint = (x: number, z: number, rx: number, rz = rx) =>
    solids.push({ minX: x - rx, maxX: x + rx, minZ: z - rz, maxZ: z + rz });
  const still = (thing: Object3D) => {
    mergeTree(thing, (o) => o.userData.live === true);
    return thing;
  };
  const turnTo = (
    o: Object3D,
    x: number,
    y: number,
    z: number,
    yaw: number,
  ) => {
    o.position.set(x, y, z);
    o.rotation.y = yaw;
    return o;
  };
  const noRay = (o: Object3D) =>
    o.traverse((m) => {
      m.raycast = () => {};
    });

  // ---- The gallery: the decades' bays, the timeline rail, picture lights ----
  const frameWood = t.paint('#2a2420', 0.5);
  const brass = t.paint('#b08a3e', 0.35, 0.8);
  for (const b of bayPlaces()) {
    const bay = new Group();
    bay.name = `${b.decade.decade} photographs`;
    const H = 1.25;
    const face = t.printed(BAY.w, H, paintBay(b.decade), 1024);
    face.mesh.position.set(0, 0, 0.012);
    bay.add(face.mesh);
    t.box(
      bay,
      t.paint('#e9e5da', 0.8),
      BAY.w + 0.04,
      H + 0.04,
      0.01,
      0,
      0,
      0.005,
    );
    // Each photograph's frame, standing proud round its print.
    const fw = BAY.frameW;
    const gap = (BAY.w - 3 * fw) / 4;
    const fy = H / 2 - H * 0.14 - ((BAY.frameH / BAY.w) * BAY.w) / 2;
    for (let k = 0; k < 3; k++) {
      const x = -BAY.w / 2 + gap + fw / 2 + k * (fw + gap);
      const fh = BAY.frameH;
      t.box(bay, frameWood, fw + 0.03, 0.025, 0.03, x, fy + fh / 2, 0.02);
      t.box(bay, frameWood, fw + 0.03, 0.025, 0.03, x, fy - fh / 2, 0.02);
      t.box(bay, frameWood, 0.025, fh, 0.03, x - fw / 2, fy, 0.02);
      t.box(bay, frameWood, 0.025, fh, 0.03, x + fw / 2, fy, 0.02);
      // A picture light over each frame (set decoration: the hall's own lamps light it).
      t.box(bay, brass, fw * 0.6, 0.03, 0.05, x, fy + fh / 2 + 0.08, 0.06);
    }
    turnTo(bay, b.x, 1.65, b.z, b.yaw);
    object.add(
      markComponent(still(bay), {
        name: `Photographs: ${b.decade.decade}, ${b.decade.strap} (placeholders: the pictures are still to be made)`,
        decorative: true,
      }),
    );
  }
  // The timeline rail, brass, at hand height along both walls.
  const rail = new Group();
  t.box(rail, brass, 12.8, 0.03, 0.03, -0.25, 0.92, WALL.north + 0.05);
  t.box(rail, brass, 0.03, 0.03, 12.8, WALL.east - 0.05, 0.92, -0.25);
  object.add(
    markComponent(still(rail), { name: 'Timeline rail', decorative: true }),
  );

  // ---- The dry poolside, painted ----
  const { deck, skimmer: sk, skip: sp } = POOLSIDE;
  const deckW = deck.maxX - deck.minX;
  const deckD = deck.maxZ - deck.minZ;
  const floor = t.printed(deckW, deckD, paintPoolside, 2048);
  floor.mesh.rotation.x = -Math.PI / 2;
  floor.mesh.position.set(
    (deck.minX + deck.maxX) / 2,
    0.004,
    (deck.minZ + deck.maxZ) / 2,
  );
  floor.mesh.name = 'Painted poolside';
  floor.mesh.userData.live = true;
  // The eye that sees the hall, read as it is drawn: where the held thing goes.
  let eye: Camera | null = null;
  floor.mesh.frustumCulled = false;
  floor.mesh.onBeforeRender = (_r, _s, camera) => {
    eye = camera;
  };
  object.add(
    markComponent(floor.mesh, {
      name: 'Poolside (dry: the water is paint)',
      decorative: true,
    }),
  );

  // ---- The skimmer: collar, lid, basket ----
  const certikind = t.paint('#f2f1ec', 0.45);
  const dark = t.paint('#15191b', 0.9);
  const skimmerGroup = new Group();
  skimmerGroup.position.set(sk.x, 0, sk.z);
  t.cyl(skimmerGroup, certikind, 0.155, 0.008, 0, 0.004, 0, 'y', 32);
  t.cyl(skimmerGroup, dark, 0.13, 0.002, 0, 0.0085, 0, 'y', 32);
  // The basket's rim and handle, seen with the lid off.
  const basket = new Group();
  basket.userData.live = true;
  const grey = t.paint('#8a9498', 0.6);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const seg = t.box(
      basket,
      grey,
      0.05,
      0.01,
      0.008,
      Math.cos(a) * 0.09,
      0.009,
      Math.sin(a) * 0.09,
    );
    seg.rotation.y = -a + Math.PI / 2;
  }
  t.box(basket, grey, 0.17, 0.008, 0.01, 0, 0.012, 0);
  skimmerGroup.add(basket);
  // What shows in the basket: the next find on top.
  const inside = new Group();
  inside.userData.live = true;
  inside.position.y = 0.006;
  skimmerGroup.add(inside);
  object.add(
    markComponent(skimmerGroup, {
      name: `${SKIMMER_TAGS.skimmer} wall skimmer (Certikind; dry, its suction capped)`,
      status: () =>
        game.lid.at === 'on'
          ? 'lid on'
          : `lid off; ${inBasket(game) === 0 ? 'basket empty' : 'basket has things in it'}`,
    }),
  );

  const lid = new Group();
  lid.name = 'Skimmer lid';
  lid.userData.live = true;
  t.cyl(lid, certikind, 0.125, 0.012, 0, 0.006, 0, 'y', 32);
  t.cyl(lid, dark, 0.012, 0.013, -0.05, 0.006, 0, 'y', 12);
  t.cyl(lid, dark, 0.012, 0.013, 0.05, 0.006, 0, 'y', 12);
  t.label(lid, 'CERTIKIND', 0, 0.0125, 0.07, 0.016, '#5a6266').rotation.x =
    -Math.PI / 2;
  object.add(markComponent(lid, { name: `${SKIMMER_TAGS.lid} skimmer lid` }));

  // ---- The skip, and its sign ----
  const skipModel = createSkip(kit);
  const skip = skipModel.group;
  skip.position.set(sp.x, 0, sp.z);
  object.add(
    markComponent(skip, {
      name: 'Mini skip (for things found in the skimmer)',
      status: () => `${game.binned} thing${game.binned === 1 ? '' : 's'} in it`,
    }),
  );
  footprint(sp.x, sp.z, 0.98, 0.68);
  const signPost = new Group();
  t.box(signPost, t.paint('#2b3438', 0.5), 0.05, 1.1, 0.05, 0, 0.55, -0.03);
  const signFace = t.printed(0.6, 0.42, () => {}, 512);
  signFace.mesh.position.set(0, 1.25, 0);
  signPost.add(signFace.mesh);
  t.box(signPost, t.paint('#2b3438', 0.5), 0.63, 0.45, 0.02, 0, 1.25, -0.012);
  turnTo(signPost, sp.x - 1.3, 0, sp.z - 0.2, FACE_EAST - 0.6);
  object.add(
    markComponent(signPost, {
      name: 'Skip sign',
      status: () => (cleared(game) ? 'SKIMMER CLEARED!' : SKIP_SIGN.headline),
    }),
  );
  footprint(sp.x - 1.3, sp.z - 0.2, 0.08);
  let signShown = '';
  const drawSign = () => {
    const done = cleared(game);
    const key = `${done}|${game.binned}`;
    if (key === signShown) return;
    signShown = key;
    const c = signFace.context;
    const { width: w, height: h } = c.canvas;
    c.fillStyle = done ? '#ffd21f' : '#f6f4ec';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#16232b';
    c.font = `bold ${h * 0.12}px ${SANS}`;
    if (done) {
      c.fillText('SKIMMER CLEARED!', w * 0.06, h * 0.25, w * 0.88);
      c.font = `${h * 0.09}px ${SANS}`;
      wrapText(
        c,
        CLEARED_LINE(game.binned).replace('SKIMMER CLEARED! ', ''),
        w * 0.88,
      ).forEach((l, n) => c.fillText(l, w * 0.06, h * 0.45 + n * h * 0.12));
    } else {
      wrapText(c, SKIP_SIGN.headline, w * 0.88).forEach((l, n) =>
        c.fillText(l, w * 0.06, h * 0.2 + n * h * 0.14),
      );
      c.font = `${h * 0.075}px ${SANS}`;
      wrapText(c, SKIP_SIGN.body, w * 0.88).forEach((l, n) =>
        c.fillText(l, w * 0.06, h * 0.55 + n * h * 0.1),
      );
      c.font = `bold ${h * 0.09}px ${SANS}`;
      c.fillText(`In the skip: ${game.binned}`, w * 0.06, h * 0.92);
    }
    signFace.texture.needsUpdate = true;
  };

  // ---- The finds ----
  const propOf = createFindProps(t);
  let props: Group[] = [];
  const findsGroup = new Group();
  findsGroup.userData.live = true;
  object.add(findsGroup);

  // The caption card: shown before the eye, a few seconds or until the next.
  const card = t.printed(0.36, 0.07, () => {}, 768);
  card.mesh.name = 'Caption card';
  card.mesh.userData.live = true;
  card.mesh.renderOrder = 10;
  for (const m of [card.mesh.material].flat() as Material[]) {
    m.depthTest = false;
    m.transparent = true;
  }
  card.mesh.visible = false;
  object.add(card.mesh);
  noRay(card.mesh);
  let cardFor = -1;
  let cardTime = 0;
  const drawCard = (text: string) => {
    const c = card.context;
    const { width: w, height: h } = c.canvas;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(16,24,28,0.82)';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.font = `${h * 0.3}px ${SANS}`;
    const lines = wrapText(c, text, w * 0.94).slice(0, 2);
    lines.forEach((l, n) =>
      c.fillText(l, w * 0.03, h * (lines.length === 1 ? 0.6 : 0.42 + n * 0.38)),
    );
    card.texture.needsUpdate = true;
  };

  // ---- The voice, front centre ----
  const voice = new Group();
  markFrontCentre(voice);
  object.add(voice);
  let stopVoice: () => void = () => {};
  const speak = (name: string) => {
    const url = clipFor(name);
    if (!url) return;
    stopVoice();
    stopVoice = partAudio.play(recording(url, 1), voice);
  };

  // ---- Working it: the control scheme's pick-up, carry and drop ----
  // The lid and the finds are portable objects; the skip takes finds
  // tossed into it (`bin-tossing.ts`), the skimmer's seat takes the lid
  // back, and the skimmer hands over its next find (`give`). The game
  // follows what the hands do.
  let hands: ExhibitHands | null = null;
  let hadIntro = false;
  const act = (a: SkimmerAction) => {
    const wasHeld = held(game);
    game = actOnSkimmer(game, a);
    const now = held(game);
    if (a.type === 'lid' && !hadIntro) {
      hadIntro = true;
      speak('intro');
    }
    if (typeof now === 'number' && now !== wasHeld) speak(game.order[now]);
    refresh();
  };
  /** Where an object lies on the hall's floor plan, metres. */
  const plan = (o: Object3D) => {
    const p = object.worldToLocal(o.getWorldPosition(new Vector3()));
    return { x: p.x, z: p.z };
  };
  const portable = (
    o: Object3D,
    profile: DropProfile,
    events: { pickUp(): void; drop(): void },
  ) => {
    const component = createPortableBoard(profile);
    component.onEvent((e) => {
      if (e === 'pick-up') {
        partAudio.play(PICK_UP, voice);
        events.pickUp();
      } else if (e === 'drop') events.drop();
      else {
        const sound = objectImpact(
          profile,
          component.impactSpeed.value,
          component.impacts.value,
        );
        if (sound) partAudio.play(sound, o);
      }
    });
    o.userData.portable = {
      component,
      flat: 'upright',
      detach() {},
    } satisfies PortableObject;
    return component;
  };
  const lidCarry = portable(lid, LID_DROP, {
    pickUp: () => {
      if (game.lid.at !== 'held') act({ type: 'lid' });
    },
    drop: () => {
      if (game.lid.at === 'held') act({ type: 'deck', ...plan(lid) });
    },
  });
  const seatLid = () => {
    object.attach(lid);
    lid.position.set(sk.x, 0.004, sk.z);
    lid.rotation.set(0, 0, 0);
    lid.scale.setScalar(1);
  };
  // The skimmer's seat takes the lid back, nothing else.
  skimmerGroup.userData.placementTarget = {
    accepts: (o) => o === lid,
    place: (_lid, p) => {
      act({ type: 'skimmer' });
      p.component.drop();
      p.component.settle();
      seatLid();
    },
  } satisfies PlacementTarget;
  // The skip: finds tossed in land and count; the lid is refused.
  const tossing = createBinTossing({
    camera: new PerspectiveCamera(),
    metre: METRE,
    onLanded: (o) => {
      const i = props.indexOf(o as Group);
      if (i < 0) return;
      act({ type: 'land', index: i });
      if (cleared(game)) {
        partAudio.play(CHIME, voice);
        speak('cleared');
      }
    },
  });
  const bin: TossBin = {
    name: 'skip',
    group: skip,
    shape: skipModel.shape,
    footprint: skipModel.footprint,
    x: sp.x,
    z: sp.z,
    takes: (o) => props.includes(o as Group),
  };
  tossing.add(bin);
  // Reaching into the skimmer: the next find, handed over.
  const workSkimmer = () => {
    if (hands?.holding()) return;
    const was = held(game);
    act({ type: 'skimmer' });
    const now = held(game);
    if (typeof now !== 'number' || now === was) return;
    const prop = props[now];
    prop.position.set(sk.x, 0.05, sk.z);
    prop.visible = true;
    // No hands (not the hall walked in): back it goes.
    if (!hands?.give(prop))
      game = {
        ...game,
        places: game.places.map((q, k) => (k === now ? { at: 'basket' } : q)),
      };
    refresh();
  };
  const uses = parts.uses;
  uses.set(skimmerGroup, workSkimmer);
  const refresh = () => {
    basket.visible = game.lid.at !== 'on';
    inside.clear();
    const next = game.places.findIndex((p) => p.at === 'basket');
    if (basket.visible && next >= 0) {
      const peek = propOf(game.order[next]);
      peek.scale.setScalar(0.9);
      noRay(peek);
      inside.add(peek);
    }
    game.places.forEach((p, i) => {
      props[i].visible = p.at !== 'basket';
    });
    drawSign();
  };
  const reset = () => {
    game = newSkimmerGame(Math.floor(Math.random() * 2 ** 31));
    sinceReset = 0;
    hadIntro = false;
    stopVoice();
    cardFor = game.saidCount;
    card.mesh.visible = false;
    // Everything out of the hands and back in its place.
    hands?.forget(lid);
    lidCarry.reset();
    seatLid();
    tossing.remove(bin);
    tossing.add(bin);
    for (const p of props) {
      hands?.forget(p);
      p.removeFromParent();
      (p.userData.portable as PortableObject).component.dispose();
    }
    props = game.order.map((id, i) => {
      const prop = propOf(id);
      prop.visible = false;
      prop.scale.setScalar(FIND_SCALE);
      const size = new Box3().setFromObject(prop).getSize(new Vector3());
      portable(
        prop,
        createDropProfile(
          'flat',
          Math.max(size.x, size.y, size.z, 0.02),
          METAL_FINDS.has(id) ? 'metal' : 'plastic',
        ),
        {
          pickUp: () => {
            if (game.places[i].at === 'deck') act({ type: 'pick', index: i });
          },
          drop: () => {
            if (game.places[i].at === 'held')
              act({ type: 'deck', ...plan(prop) });
          },
        },
      );
      findsGroup.add(
        markComponent(prop, {
          name: findOf(id).name,
          status: () => {
            const p = game.places[i];
            return p.at === 'skip'
              ? 'in the skip'
              : p.at === 'held'
                ? 'in your hands'
                : 'on the deck';
          },
        }),
      );
      return prop;
    });
    refresh();
  };

  // ---- The words: entrance, RESET, the skimmer's placard and cut-away, the opening checks ----
  const entrance = createWallPanel(
    kit,
    'Entrance panel',
    1.9,
    1.5,
    paintEntrance(hall5Entrance(), 'Hall 5 · A Day in the Life'),
  );
  turnTo(entrance, WALL.west, 1.65, -3.9, FACE_EAST);
  object.add(still(entrance));
  const resetSign = createWallPanel(
    kit,
    'RESET sign',
    1.0,
    0.56,
    paintResetSign(RESET_SIGN),
  );
  turnTo(resetSign, WALL.west, 1.75, 3.5, FACE_EAST);
  object.add(still(resetSign));
  const resetButton = createResetPedestal(kit, {
    reset: () => reset(),
    lit: () => sinceReset < 2.5,
  });
  turnTo(resetButton.group, WALL.west + 0.45, 0, 3.5, FACE_EAST);
  object.add(resetButton.group);
  for (const [o, use] of resetButton.parts.uses) uses.set(o, use);
  updates.push(resetButton.update);
  footprint(WALL.west + 0.45, 3.5, 0.25);

  const lectern = createLectern(kit, SKIMMER_PLACARD);
  turnTo(lectern, -4.9, 0, -1.1, -Math.PI / 2);
  object.add(still(lectern));
  footprint(-4.9, -1.1, 0.2);

  const cutaway = createWallPanel(
    kit,
    'Skimmer cut-away',
    1.4,
    1.0,
    paintCutaway,
  );
  turnTo(cutaway, -3.4, 1.55, WALL.south, FACE_NORTH);
  object.add(still(cutaway));
  const checks = createWallPanel(
    kit,
    'Opening checks sheet',
    0.42,
    0.6,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#0f6f7c';
      c.fillRect(0, 0, w, h * 0.1);
      c.fillStyle = '#ffffff';
      c.font = `bold ${h * 0.055}px ${SANS}`;
      c.fillText('OPENING CHECKS', w * 0.06, h * 0.07);
      c.font = `${h * 0.036}px ${SANS}`;
      OPENING_CHECKS.forEach(([item, done], k) => {
        const y = h * (0.18 + k * 0.1);
        c.strokeStyle = '#16232b';
        c.lineWidth = 2;
        c.strokeRect(w * 0.06, y - h * 0.03, h * 0.04, h * 0.04);
        if (done) {
          c.fillStyle = '#1a7a2a';
          c.fillText('✓', w * 0.065, y + h * 0.005);
        }
        c.fillStyle = '#16232b';
        c.fillText(item, w * 0.18, y, w * 0.78);
      });
    },
  );
  turnTo(checks, -1.8, 1.5, WALL.south, FACE_NORTH);
  object.add(still(checks));
  const noRunning = createWallPanel(
    kit,
    'No running sign',
    0.4,
    0.5,
    (c, w, h) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c8102e';
      c.lineWidth = w * 0.08;
      c.beginPath();
      c.arc(w / 2, h * 0.38, w * 0.34, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.moveTo(w * 0.26, h * 0.2);
      c.lineTo(w * 0.74, h * 0.56);
      c.stroke();
      c.fillStyle = '#16232b';
      c.font = `bold ${h * 0.11}px ${SANS}`;
      c.textAlign = 'center';
      c.fillText('No running', w / 2, h * 0.9);
    },
  );
  turnTo(noRunning, 1.9, 1.6, WALL.south, FACE_NORTH);
  object.add(still(noRunning));

  // ---- The pool clock (rule 2: the visitor's local time, ×1) ----
  const clock = createPoolClock(kit, { dia: 0.7 });
  turnTo(clock.group, -3.4, 2.75, WALL.south, FACE_NORTH);
  object.add(
    markComponent(clock.group, {
      name: 'Pool clock',
      status: () => 'shows the time now',
    }),
  );
  updates.push((delta) =>
    clock.show(localNow(), 1, delta > 0 ? Math.min(240, 1 / delta) : 60),
  );

  // ---- Set decoration: the lifeguard's chair, bench, net and hook, gloves, lost property ----
  const deco = new Group();
  const white = t.paint('#eef0ee', 0.4);
  const steel = t.paint('#a8b0b4', 0.3, 0.8);
  const chairAt = { x: 4.05, z: 2.4 };
  for (const [dx, dz] of [
    [-0.3, -0.3],
    [0.3, -0.3],
    [-0.3, 0.3],
    [0.3, 0.3],
  ])
    t.box(deco, steel, 0.04, 1.6, 0.04, chairAt.x + dx, 0.8, chairAt.z + dz);
  t.box(deco, white, 0.7, 0.05, 0.7, chairAt.x, 1.6, chairAt.z);
  t.box(deco, white, 0.7, 0.6, 0.05, chairAt.x + 0.0, 1.9, chairAt.z + 0.33);
  for (let k = 1; k < 5; k++)
    t.box(deco, steel, 0.6, 0.03, 0.03, chairAt.x, k * 0.3, chairAt.z - 0.32);
  footprint(chairAt.x, chairAt.z, 0.4);
  const bench = { x: -2.6, z: 5.05 };
  t.box(deco, t.paint('#3a6e8a', 0.6), 1.8, 0.05, 0.4, bench.x, 0.45, bench.z);
  t.box(deco, steel, 0.05, 0.45, 0.35, bench.x - 0.8, 0.22, bench.z);
  t.box(deco, steel, 0.05, 0.45, 0.35, bench.x + 0.8, 0.22, bench.z);
  t.box(
    deco,
    t.paint('#f0c020', 0.7),
    0.12,
    0.03,
    0.2,
    bench.x + 0.4,
    0.49,
    bench.z,
  );
  t.box(
    deco,
    t.paint('#f0c020', 0.7),
    0.12,
    0.03,
    0.2,
    bench.x + 0.55,
    0.49,
    bench.z + 0.03,
  );
  footprint(bench.x, bench.z, 0.95, 0.25);
  // The leaf net and the basket hook, on brackets on the south wall.
  t.box(deco, steel, 3.0, 0.03, 0.03, 4.0, 1.4, WALL.south - 0.06);
  t.box(
    deco,
    t.paint('#2a5a8a', 0.8),
    0.45,
    0.3,
    0.02,
    5.6,
    1.4,
    WALL.south - 0.06,
  );
  t.box(deco, steel, 1.6, 0.025, 0.025, 4.2, 1.1, WALL.south - 0.06);
  t.box(deco, steel, 0.025, 0.12, 0.025, 3.42, 1.06, WALL.south - 0.06);
  // The lost property box beside the chair.
  t.box(
    deco,
    t.paint('#4a7a3a', 0.7),
    0.5,
    0.35,
    0.4,
    chairAt.x,
    0.175,
    chairAt.z + 0.9,
  );
  t.label(
    deco,
    'LOST PROPERTY',
    chairAt.x,
    0.3,
    chairAt.z + 1.101,
    0.05,
    '#ffffff',
    '#2a4a22',
  );
  footprint(chairAt.x, chairAt.z + 0.9, 0.28, 0.22);
  object.add(
    markComponent(still(deco), {
      name: 'Poolside furniture',
      decorative: true,
    }),
  );

  reset();

  return {
    object,
    parts,
    status: () =>
      cleared(game)
        ? 'skimmer cleared'
        : `${game.binned} of ${game.order.length} in the skip`,
    solids: () => solids,
    reset: () => reset(),
    carrying: {
      bind(h) {
        hands = h;
      },
      divert: (o, p) => tossing.divert(o, p),
      nearbyTargetFeedback: (o) => tossing.targetFeedback(o),
    },
    update(delta) {
      sinceReset += delta;
      // The caption card, before the eye.
      const cam = eye as Camera | null;
      if (cam) {
        const parentQ = object.getWorldQuaternion(new Quaternion()).invert();
        const scale = object.getWorldScale(new Vector3()).x;
        const p = cam.localToWorld(new Vector3(0, -0.17 * scale, -0.5 * scale));
        card.mesh.position.copy(object.worldToLocal(p));
        card.mesh.quaternion.copy(parentQ).multiply(cam.quaternion);
      }
      // Finds on their way into the skip.
      tossing.update(delta);
      // The caption card: freshly said, shown a few seconds.
      if (game.saidCount !== cardFor) {
        cardFor = game.saidCount;
        cardTime =
          game.said === findOf(game.order[0]).caption || game.said.length > 40
            ? 5
            : 2.5;
        drawCard(game.said);
      }
      cardTime -= delta;
      card.mesh.visible = cardTime > 0 && cam !== null;
      for (const u of updates) u(delta);
    },
  };
}
