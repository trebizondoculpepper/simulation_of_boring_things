import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

/**
 * The title logo's art (the owner, 2026-10-29): the roundel
 * `doc/marketing/logos/05-circle-notext.png` (kept there, unchanged)
 * cropped to the roundel and shrunk to 760 px wide with macOS's `sips`,
 * then the flat dark-blue backdrop of its lower part, behind the plant, made
 * transparent with the roundel's dark rim round that part (the same blue),
 * so the attract sequence shows through between the motors, valves and
 * pipes. The plant keeps a thin dark outline (the drawing's own
 * line colour), and the pixels at its edges are unmixed from the backdrop,
 * so no blue fringe is left. The water above, the tiled edge and the rim
 * round them stay as they are. Written to
 * `resources/images/title/the-pool-logo.png`, for `title-logo.ts`. Run
 * `node scripts/title-logo.ts` to make it again (`--probe x,y ...` prints
 * the colours at those pixels of the result instead, `--probe-source x,y
 * ...` of the art before its backdrop is cleared).
 */

const SOURCE = 'doc/marketing/logos/05-circle-notext.png';
const OUT = 'resources/images/title/the-pool-logo.png';
/** The roundel in the source: crop (x, y, width, height), then the width. */
const CROP = { x: 60, y: 270, width: 1165, height: 1140 };
const WIDTH = 760;
/** The first row below the tiled edge, where the backdrop begins. */
const PLANT_TOP = 320;
/** The backdrop's colour is found as the commonest colour in the plant's region. */
/** Colour distance at or under which a pixel is all backdrop, and over which all plant. */
const KEY_NEAR = 26;
const KEY_FAR = 70;
/** The plant's outline kept around it, in pixels, and its soft edge. */
const OUTLINE = 2;
const OUTLINE_SOFT = 1.2;
/**
 * Parts of the plant drawn in the backdrop's own dark blue (the pump's
 * casing): a patch of that colour shut in by the drawing, and starting
 * within one of these boxes, is kept. Other shut-in patches are gaps
 * between pipes and stanchions, and are cleared like the rest.
 */
const KEEP = [{ x0: 356, y0: 570, x1: 418, y1: 640 }];

// --- PNG, 8-bit RGB or RGBA, not interlaced ------------------------------

interface Image {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function decodePng(file: Buffer): Image {
  let at = 8;
  let width = 0;
  let height = 0;
  let type = 0;
  const idat: Buffer[] = [];
  while (at < file.length) {
    const length = file.readUInt32BE(at);
    const kind = file.toString('latin1', at + 4, at + 8);
    const data = file.subarray(at + 8, at + 8 + length);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0)
        throw new Error('only 8-bit, non-interlaced PNGs');
      type = data[9]!;
    } else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    at += 12 + length;
  }
  const channels = type === 6 ? 4 : type === 2 ? 3 : 0;
  if (!channels) throw new Error(`PNG colour type ${type} not handled`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? pixels[y * stride + i - channels]! : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + i]! : 0;
      const c =
        y > 0 && i >= channels ? pixels[(y - 1) * stride + i - channels]! : 0;
      let v = row[i]!;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      pixels[y * stride + i] = v & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    for (let k = 0; k < 3; k++) rgba[p * 4 + k] = pixels[p * channels + k]!;
    rgba[p * 4 + 3] = channels === 4 ? pixels[p * 4 + 3]! : 255;
  }
  return { width, height, rgba };
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function chunk(kind: string, data: Buffer) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(kind, 4, 'latin1');
  let crc = 0xffffffff;
  for (const byte of [...head.subarray(4), ...data])
    crc = CRC[(crc ^ byte) & 255]! ^ (crc >>> 8);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([head, data, tail]);
}

function encodePng({ width, height, rgba }: Image) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    // Each row with the filter that leaves the smallest sum, as encoders do.
    let best: Buffer | null = null;
    let bestScore = Infinity;
    for (let filter = 0; filter <= 4; filter++) {
      const row = Buffer.alloc(stride + 1);
      row[0] = filter;
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const x = rgba[y * stride + i]!;
        const a = i >= 4 ? rgba[y * stride + i - 4]! : 0;
        const b = y > 0 ? rgba[(y - 1) * stride + i]! : 0;
        const c = y > 0 && i >= 4 ? rgba[(y - 1) * stride + i - 4]! : 0;
        const p = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]!;
        const v = (x - p) & 255;
        row[i + 1] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) [best, bestScore] = [row, score];
    }
    best!.copy(raw, y * (stride + 1));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- The art -------------------------------------------------------------

function cropAndShrink(): Image {
  const dir = mkdtempSync(join(tmpdir(), 'title-logo-'));
  try {
    const cropped = join(dir, 'crop.png');
    const shrunk = join(dir, 'shrunk.png');
    const { x, y, width, height } = CROP;
    execFileSync('sips', [
      '-c',
      String(height),
      String(width),
      '--cropOffset',
      String(y),
      String(x),
      SOURCE,
      '--out',
      cropped,
    ]);
    execFileSync('sips', [
      '--resampleWidth',
      String(WIDTH),
      cropped,
      '--out',
      shrunk,
    ]);
    return decodePng(readFileSync(shrunk));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function clearBackdrop(image: Image) {
  const { width, height, rgba } = image;
  // The lower part, below the tiled edge, rim and all: the rim is the
  // backdrop's own colour, and goes with it (the owner, 2026-10-29).
  const inPlant = (_x: number, y: number) => y >= PLANT_TOP;

  // The backdrop: the commonest colour of the plant's region.
  const counts = new Map<number, number>();
  for (let y = PLANT_TOP; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!inPlant(x, y)) continue;
      const i = (y * width + x) * 4;
      const key =
        ((rgba[i]! >> 2) << 12) |
        ((rgba[i + 1]! >> 2) << 6) |
        (rgba[i + 2]! >> 2);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  const [common] = [...counts].reduce((a, b) => (b[1] > a[1] ? b : a));
  const back = [
    ((common >> 12) << 2) + 2,
    (((common >> 6) & 63) << 2) + 2,
    ((common & 63) << 2) + 2,
  ] as const;
  console.info(`backdrop rgb(${back.join(', ')})`);

  // How far each pixel is from the backdrop: its share of plant (0–1).
  const plant = new Float32Array(width * height).fill(1);
  for (let y = PLANT_TOP; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!inPlant(x, y)) continue;
      const i = (y * width + x) * 4;
      const d = Math.hypot(
        rgba[i]! - back[0],
        rgba[i + 1]! - back[1],
        rgba[i + 2]! - back[2],
      );
      // Already clear (outside the roundel) counts as backdrop too.
      plant[y * width + x] =
        Math.min(1, Math.max(0, (d - KEY_NEAR) / (KEY_FAR - KEY_NEAR))) *
        (rgba[i + 3]! / 255);
    }

  // The distance of each pixel from the plant (a two-pass chamfer), to keep
  // a thin outline round it.
  const far = new Float32Array(width * height);
  for (let p = 0; p < far.length; p++) far[p] = plant[p]! >= 0.5 ? 0 : 1e9;
  const D = Math.SQRT2;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      let v = far[p]!;
      if (x > 0) v = Math.min(v, far[p - 1]! + 1);
      if (y > 0) {
        v = Math.min(v, far[p - width]! + 1);
        if (x > 0) v = Math.min(v, far[p - width - 1]! + D);
        if (x < width - 1) v = Math.min(v, far[p - width + 1]! + D);
      }
      far[p] = v;
    }
  for (let y = height - 1; y >= 0; y--)
    for (let x = width - 1; x >= 0; x--) {
      const p = y * width + x;
      let v = far[p]!;
      if (x < width - 1) v = Math.min(v, far[p + 1]! + 1);
      if (y < height - 1) {
        v = Math.min(v, far[p + width]! + 1);
        if (x < width - 1) v = Math.min(v, far[p + width + 1]! + D);
        if (x > 0) v = Math.min(v, far[p + width - 1]! + D);
      }
      far[p] = v;
    }

  // Patches of backdrop colour shut in by the drawing within `KEEP` (the
  // pump's dark casing) are part of the plant and stay.
  const clear = (p: number) => plant[p]! < 0.5 && far[p]! > OUTLINE;
  const seen = new Uint8Array(width * height);
  for (let y = PLANT_TOP; y < height; y++)
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (seen[start] || !inPlant(x, y) || !clear(start)) continue;
      const patch: number[] = [start];
      seen[start] = 1;
      let open = false;
      for (let n = 0; n < patch.length; n++) {
        const p = patch[n]!;
        const px = p % width;
        const py = (p - px) / width;
        if (
          py <= PLANT_TOP ||
          py === height - 1 ||
          px === 0 ||
          px === width - 1
        )
          open = true;
        for (const q of [p - 1, p + 1, p - width, p + width]) {
          const qx = q % width;
          const qy = (q - qx) / width;
          if (Math.abs(qx - px) > 1 || seen[q] || !inPlant(qx, qy) || !clear(q))
            continue;
          seen[q] = 1;
          patch.push(q);
        }
      }
      const kept = KEEP.some(
        (b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1,
      );
      if (!open && kept) for (const p of patch) plant[p] = 1;
      if (!open && process.env.HOLES)
        console.info(
          `shut-in patch ${patch.length} px at ${x},${y}${kept ? ', kept' : ''}`,
        );
    }

  for (let y = PLANT_TOP; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (!inPlant(x, y)) continue;
      const p = y * width + x;
      const i = p * 4;
      const keyed = plant[p]!;
      const outline = Math.min(
        1,
        Math.max(0, 1 - (far[p]! - OUTLINE) / OUTLINE_SOFT),
      );
      const alpha = Math.max(keyed, outline);
      if (alpha <= 0) {
        rgba[i] = back[0];
        rgba[i + 1] = back[1];
        rgba[i + 2] = back[2];
        rgba[i + 3] = 0;
        continue;
      }
      // Within the outline the backdrop's own colour is the line; at a
      // keyed edge, unmix the backdrop so it leaves no fringe.
      if (keyed > 0 && keyed < 1 && keyed >= outline)
        for (let k = 0; k < 3; k++)
          rgba[i + k] = Math.round(
            Math.min(
              255,
              Math.max(0, (rgba[i + k]! - (1 - keyed) * back[k]!) / keyed),
            ),
          );
      rgba[i + 3] = Math.round(alpha * rgba[i + 3]!);
    }
}

const probe = process.argv.findIndex((a) => a.startsWith('--probe'));
if (probe >= 0) {
  const image =
    process.argv[probe] === '--probe-source'
      ? cropAndShrink()
      : decodePng(readFileSync(OUT));
  for (const at of process.argv.slice(probe + 1)) {
    const [x, y] = at.split(',').map(Number) as [number, number];
    const i = (y * image.width + x) * 4;
    console.info(at, [...image.rgba.subarray(i, i + 4)].join(' '));
  }
} else {
  const image = cropAndShrink();
  clearBackdrop(image);
  writeFileSync(OUT, encodePng(image));
  console.info(`wrote ${OUT} (${image.width} × ${image.height})`);
}
