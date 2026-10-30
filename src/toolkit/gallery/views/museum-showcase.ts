import { CanvasTexture, Group, SpotLight, SRGBColorSpace } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { kitGlow } from '../../components/core/views/eighties-controls';
import { SANS, tools } from '../../components/core/views/fitting-tools';
import { createPs1Material } from '../../components/core/parts/ps1-material';
import { markComponent } from '../../components/core/views/component-identity';
import { METRE } from '../../components/core/logic/units';
import { SHOWCASE, sizeShowcase } from '../logic/museum-showcase';
import type {
  ShowcaseContents,
  ShowcaseLayout,
} from '../logic/museum-showcase';

export interface MuseumShowcaseOptions {
  /** Its name, for the information overlay. */
  name: string;
  /** What it shows: the envelope the glass is sized round. */
  contents: ShowcaseContents;
  /** The deck's height, if not the eye-line rule's. */
  deckY?: number;
  /** The object label inside the glass: a title and a line or two. */
  label?: { title: string; body: string; side?: 'left' | 'right' };
  /** The case's spot, in watts-ish (0: none, only the attic's LED strips). */
  spot?: number;
  /** The plinth's paint. */
  plinth?: string;
  /** The deck's fabric. */
  deck?: string;
}

export interface MuseumShowcase {
  /** The whole case, origin on the floor at its middle, front +z. */
  object: Group;
  /** Where the contents go: origin on the deck's top at its middle. */
  deck: Group;
  layout: ShowcaseLayout;
}

/** The low-iron glass's reflections: a faint wash and two soft diagonal streaks, in alpha. */
function glassSheen() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const c = canvas.getContext('2d')!;
  c.fillStyle = 'rgba(235,245,248,0.025)';
  c.fillRect(0, 0, 128, 128);
  for (const [at, wide, alpha] of [
    [0.3, 0.16, 0.1],
    [0.62, 0.06, 0.07],
  ] as const) {
    const g = c.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(Math.max(0, at - wide), 'rgba(255,255,255,0)');
    g.addColorStop(at, `rgba(255,255,255,${alpha})`);
    g.addColorStop(Math.min(1, at + wide), 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A free-standing museum showcase (a table vitrine), sized round its
 * contents (`sizeShowcase`): a plinth in the gallery's dark paint on a
 * recessed black kick plate, a shadow gap under its fabric-covered deck;
 * a hood of low-iron glass, its bonded corners and edges just visible,
 * faint reflections across its faces, standing in a thin bronze-black
 * channel; over it the lighting attic, its warm LED strips glowing through
 * the diffuser and, unless `spot` is 0, one warm spot lighting the object
 * (no shadows); and a small object label on an acrylic wedge inside the
 * glass at its front right. Set decoration: its static parts are merged
 * by whatever holds it (`mergeTree`). Built in metres.
 */
export function createMuseumShowcase(
  kit: PanelKit,
  options: MuseumShowcaseOptions,
): MuseumShowcase {
  const t = tools(kit);
  const S = SHOWCASE;
  const L = sizeShowcase(options.contents, options.deckY);
  const object = new Group();
  object.name = options.name;
  const { w, d, deckY } = L;

  // The plinth: its body, the kick plate set back under it, the shadow
  // gap, and the deck.
  const body = t.paint(options.plinth ?? '#1d1e20', 0.85);
  const black = t.paint('#060606', 0.9);
  const fabric = t.paint(options.deck ?? '#4a4642', 0.95);
  const kickW = w - 2 * S.kick.setBack;
  const kickD = d - 2 * S.kick.setBack;
  t.box(object, black, kickW, S.kick.h, kickD, 0, S.kick.h / 2, 0);
  const bodyTop = deckY - S.deck - S.reveal.h;
  const bodyH = bodyTop - S.kick.h;
  t.box(object, body, w, bodyH, d, 0, S.kick.h + bodyH / 2, 0);
  t.box(
    object,
    black,
    w - 2 * S.reveal.depth,
    S.reveal.h,
    d - 2 * S.reveal.depth,
    0,
    bodyTop + S.reveal.h / 2,
    0,
  );
  t.box(object, fabric, w, S.deck, d, 0, deckY - S.deck / 2, 0);

  // The metal: a bronze-black anodised channel round the glass's foot,
  // and the attic's frame over it.
  const metal = t.paint('#2a2622', 0.35, 0.7);
  const f = S.frame;
  for (const [bw, bd, x, z] of [
    [w, f, 0, d / 2 - f / 2],
    [w, f, 0, -d / 2 + f / 2],
    [f, d - 2 * f, w / 2 - f / 2, 0],
    [f, d - 2 * f, -w / 2 + f / 2, 0],
  ] as const)
    t.box(object, metal, bw, f, bd, x, deckY + f / 2, z);
  const { atticY, topY } = L;
  t.box(
    object,
    metal,
    w + 0.004,
    topY - atticY,
    d + 0.004,
    0,
    (atticY + topY) / 2,
    0,
  );

  // The glass: low-iron, nearly colourless, faintly reflecting; its four
  // bonded corners and its top edge a pale line where the light catches.
  const sheen = glassSheen();
  kit.textures.push(sheen);
  const glass = createPs1Material({
    color: '#f4fbfb',
    map: sheen,
    transparent: true,
    roughness: 0.05,
    metalness: 0.1,
    depthWrite: false,
  });
  const edge = createPs1Material({
    color: '#d8ecea',
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    depthWrite: false,
  });
  kit.materials.push(glass, edge);
  const g = S.glass;
  const gh = L.hood.h - f;
  const gy = deckY + f + gh / 2;
  for (const s of [-1, 1]) {
    t.box(object, glass, w - 2 * g, gh, g, 0, gy, s * (d / 2 - g / 2));
    t.box(object, glass, g, gh, d, s * (w / 2 - g / 2), gy, 0);
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      t.box(
        object,
        edge,
        0.012,
        gh,
        0.012,
        sx * (w / 2 - 0.006),
        gy,
        sz * (d / 2 - 0.006),
      );
  for (const s of [-1, 1])
    t.box(
      object,
      edge,
      w - 0.02,
      0.006,
      0.012,
      0,
      atticY - 0.003,
      s * (d / 2 - 0.006),
    );

  // The attic's diffuser, and its two warm LED strips glowing through it:
  // hung 2 mm under the attic's underside, so their faces never meet
  // (the owner, 2026-10-30: it z-fought).
  const diffuser = t.paint('#d9d4ca', 0.9);
  t.box(
    object,
    diffuser,
    w - 2 * g - 0.01,
    0.004,
    d - 2 * g - 0.01,
    0,
    atticY,
    0,
  );
  const strip = kitGlow(kit, '#ffe6c0');
  for (const s of [-1, 1])
    t.box(
      object,
      strip,
      w - 0.12,
      0.004,
      0.025,
      0,
      atticY - 0.0045,
      s * (d / 2 - 0.06),
    );
  const spot = options.spot ?? 1.5;
  if (spot > 0) {
    // The spot's can, flush in the diffuser, and its light.
    t.cyl(object, black, 0.035, 0.012, 0, atticY - 0.004, 0, 'y', 16);
    const lamp = new SpotLight(
      '#ffe8c8',
      spot * METRE * METRE,
      0,
      L.spot.angle,
      0.7,
      2,
    );
    lamp.position.set(0, L.spot.y, 0);
    lamp.target.position.set(0, deckY, 0);
    lamp.castShadow = false;
    object.add(lamp, lamp.target);
  }

  // The deck, where the contents go.
  const deck = new Group();
  deck.name = 'Showcase deck';
  deck.position.y = deckY;
  object.add(deck);

  // The object label: a cream card on a clear acrylic wedge, tilted back.
  if (options.label) {
    const { title, body: text } = options.label;
    const wedge = new Group();
    const lx = options.label.side === 'left' ? -L.label.x : L.label.x;
    wedge.position.set(lx, deckY, L.label.z);
    object.add(wedge);
    const acrylic = edge as Material;
    t.box(wedge, acrylic, S.label.w, 0.006, S.label.h * 0.8, 0, 0.003, 0);
    const card = t.printed(
      S.label.w,
      S.label.h,
      (c, cw, ch) => {
        c.fillStyle = '#efeadf';
        c.fillRect(0, 0, cw, ch);
        const m = cw * 0.06;
        c.fillStyle = '#1b1b1b';
        c.textBaseline = 'top';
        c.font = `bold ${ch * 0.16}px ${SANS}`;
        c.fillText(title, m, ch * 0.12, cw - 2 * m);
        c.font = `${ch * 0.105}px ${SANS}`;
        let y = ch * 0.38;
        for (const line of text.split('\n')) {
          c.fillText(line, m, y, cw - 2 * m);
          y += ch * 0.15;
        }
      },
      512,
    );
    card.mesh.position.set(0, 0.045, 0);
    card.mesh.rotation.x = -1.1;
    wedge.add(card.mesh);
  }

  markComponent(object, {
    name: options.name,
    decorative: true,
  });
  return { object, deck, layout: L };
}
