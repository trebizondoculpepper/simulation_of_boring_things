import {
  CanvasTexture,
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';

/**
 * The finishes of a services ceiling's parts (`service-parts.ts`): hot-dip
 * galvanised steel for the deck, trays, strut and duct, black for the
 * beams, red for sprinkler pipe, foil for lagging. The perforations, wire
 * mesh, spiral seam, foil crinkle and a diffuser's slots are textures
 * drawn here, so the parts stay simple geometry.
 */

/** A canvas texture `px` square, drawn by `draw`, repeating every `size` m. */
function drawn(
  px: number,
  size: number,
  draw: (c: CanvasRenderingContext2D, px: number) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  draw(canvas.getContext('2d')!, px);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1 / size, 1 / size);
  return texture;
}

/** A seeded scatter of soft light and dark blobs, for foil's crinkle. */
function crinkle(c: CanvasRenderingContext2D, px: number) {
  let a = 12345;
  const random = () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296;
  c.fillStyle = '#808080';
  c.fillRect(0, 0, px, px);
  for (let i = 0; i < 900; i++) {
    const x = random() * px;
    const y = random() * px;
    const r = 2 + random() * 10;
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    const v = random() < 0.5 ? 255 : 0;
    g.addColorStop(0, `rgba(${v},${v},${v},0.35)`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

export function createServiceMaterials() {
  const galv = (extra: Partial<MeshStandardMaterial> = {}) =>
    Object.assign(
      new MeshStandardMaterial({
        color: '#c6cbce',
        metalness: 0.4,
        roughness: 0.42,
        side: DoubleSide,
      }),
      extra,
    );
  // Perforated tray: staggered slots, cut by alpha.
  const slots = drawn(128, 0.12, (c, px) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, px, px);
    c.fillStyle = '#000';
    for (const [x, y] of [
      [0.25, 0.25],
      [0.75, 0.75],
    ])
      c.fillRect(x * px - px * 0.06, y * px - px * 0.14, px * 0.12, px * 0.28);
  });
  // Wire basket: a 50 mm grid of wire.
  const wire = drawn(128, 0.05, (c, px) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, px, px);
    c.fillStyle = '#fff';
    c.fillRect(0, 0, px, px * 0.08);
    c.fillRect(0, 0, px * 0.08, px);
  });
  // Spiral duct: its lock seam winding round it.
  const seam = drawn(128, 0.3, (c, px) => {
    c.fillStyle = '#808080';
    c.fillRect(0, 0, px, px);
    c.strokeStyle = '#ffffff';
    c.lineWidth = px * 0.05;
    for (const o of [-px, 0, px]) {
      c.beginPath();
      c.moveTo(o, 0);
      c.lineTo(o + px, px);
      c.stroke();
    }
  });
  const foil = drawn(256, 0.5, crinkle);
  // A swirl diffuser's face: a disc, its radial slots dark.
  const face = document.createElement('canvas');
  face.width = face.height = 256;
  const f = face.getContext('2d')!;
  f.fillStyle = '#c4cacd';
  f.fillRect(0, 0, 256, 256);
  f.translate(128, 128);
  f.fillStyle = '#1a1c1e';
  for (let i = 0; i < 24; i++) {
    f.save();
    f.rotate((i / 24) * Math.PI * 2);
    f.translate(0, -70);
    f.rotate(0.35);
    f.fillRect(-6, -40, 12, i % 2 ? 46 : 30);
    f.restore();
  }
  const swirl = new CanvasTexture(face);
  swirl.colorSpace = SRGBColorSpace;
  // Acoustic felt: a soft, fine-grained board.
  const fuzz = drawn(256, 0.4, crinkle);
  const flat = (color: string) =>
    new MeshStandardMaterial({ color, roughness: 0.6, side: DoubleSide });
  const deck = galv({ metalness: 0.3, roughness: 0.5 });
  deck.color.set('#c3c9cc');
  return {
    deck,
    beam: new MeshStandardMaterial({
      color: '#2c3033',
      roughness: 0.7,
      side: DoubleSide,
    }),
    tray: galv({ alphaMap: slots, alphaTest: 0.5 }),
    basket: galv({ alphaMap: wire, alphaTest: 0.5 }),
    ladder: galv(),
    strut: galv(),
    rod: new MeshStandardMaterial({
      color: '#8d9396',
      metalness: 0.6,
      roughness: 0.4,
    }),
    duct: galv({ bumpMap: seam, bumpScale: 0.6 }),
    lagged: new MeshStandardMaterial({
      color: '#d7dbdd',
      metalness: 0.75,
      roughness: 0.3,
      bumpMap: foil,
      bumpScale: 2.5,
    }),
    sprinkler: new MeshStandardMaterial({ color: '#b3231c', roughness: 0.45 }),
    coupling: new MeshStandardMaterial({ color: '#c8302a', roughness: 0.35 }),
    brass: new MeshStandardMaterial({
      color: '#c9a64a',
      metalness: 0.8,
      roughness: 0.35,
    }),
    pipe: new MeshStandardMaterial({ color: '#9a4a2c', roughness: 0.5 }),
    conduit: new MeshStandardMaterial({
      color: '#9ca3a6',
      metalness: 0.6,
      roughness: 0.45,
    }),
    cable: new MeshStandardMaterial({ color: '#141516', roughness: 0.55 }),
    /** Fire-resisting alarm cable, red (as FP200). */
    fireCable: new MeshStandardMaterial({ color: '#c41d1d', roughness: 0.5 }),
    detector: new MeshStandardMaterial({ color: '#f2f1ea', roughness: 0.45 }),
    felt: new MeshStandardMaterial({
      color: '#cfc7b6',
      roughness: 1,
      bumpMap: fuzz,
      bumpScale: 0.4,
    }),
    /** Flow-direction arrows: the two halves of a duct's, and a pipe's. */
    arrowRed: flat('#c8102e'),
    arrowBlue: flat('#1f5fa8'),
    arrowWhite: flat('#f4f4ef'),
    diffuser: new MeshStandardMaterial({
      map: swirl,
      metalness: 0.4,
      roughness: 0.4,
    }),
  };
}

export type ServiceMaterials = ReturnType<typeof createServiceMaterials>;
