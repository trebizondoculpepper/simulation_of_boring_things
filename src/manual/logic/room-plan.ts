/**
 * A plant room's equipment location plan as SVG, for the manual: the
 * room's walls with its doorways, each item of equipment where the room's
 * layout puts it (`gallery/logic/room-equipment.ts`) as an outline with
 * its tag, a north point (north is −z) and a scale bar. Metres in, drawn
 * at `SCALE` pixels a metre. Pure.
 */

export interface PlanItem {
  tag: string;
  /** Its footprint, metres, room-centred (x east, z south). */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Wall-hung: drawn dashed, as a wall item is on a plan. */
  wall: boolean;
}

export interface PlanDoor {
  wall: 'north' | 'south' | 'east' | 'west';
  /** Its middle along the wall from the wall's middle, and its width, metres. */
  at: number;
  width: number;
  label: string;
}

export interface PlanRoom {
  title: string;
  /** Inside sizes, metres: w along x, d along z. */
  w: number;
  d: number;
  doors: readonly PlanDoor[];
  items: readonly PlanItem[];
}

export const SCALE = 60;
const MARGIN = 70;

const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function roomPlanSvg(room: PlanRoom): string {
  const W = room.w * SCALE;
  const D = room.d * SCALE;
  const width = W + 2 * MARGIN;
  const height = D + 2 * MARGIN + 30;
  // Room-centred metres to drawing pixels.
  const X = (x: number) => MARGIN + (x + room.w / 2) * SCALE;
  const Y = (z: number) => MARGIN + (z + room.d / 2) * SCALE;
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`,
  ];
  // The walls: a thick outline, broken at each doorway.
  const t = 8;
  const gaps = (wall: PlanDoor['wall']) =>
    room.doors
      .filter((d) => d.wall === wall)
      .map((d) => [d.at - d.width / 2, d.at + d.width / 2] as const)
      .sort((a, b) => a[0] - b[0]);
  const run = (wall: PlanDoor['wall'], len: number) => {
    const segs: [number, number][] = [];
    let s = -len / 2;
    for (const [a, b] of gaps(wall)) {
      segs.push([s, a]);
      s = b;
    }
    segs.push([s, len / 2]);
    return segs;
  };
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    out.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#1b1b1b" stroke-width="${t}" stroke-linecap="square"/>`,
    );
  for (const [a, b] of run('north', room.w))
    line(X(a), Y(-room.d / 2), X(b), Y(-room.d / 2));
  for (const [a, b] of run('south', room.w))
    line(X(a), Y(room.d / 2), X(b), Y(room.d / 2));
  for (const [a, b] of run('west', room.d))
    line(X(-room.w / 2), Y(a), X(-room.w / 2), Y(b));
  for (const [a, b] of run('east', room.d))
    line(X(room.w / 2), Y(a), X(room.w / 2), Y(b));
  // Each doorway's label, outside it.
  for (const d of room.doors) {
    const [x, y, anchor] =
      d.wall === 'south'
        ? [X(d.at), Y(room.d / 2) + 24, 'middle']
        : d.wall === 'north'
          ? [X(d.at), Y(-room.d / 2) - 14, 'middle']
          : d.wall === 'east'
            ? [X(room.w / 2) + 10, Y(d.at), 'start']
            : [X(-room.w / 2) - 10, Y(d.at), 'end'];
    out.push(
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="11" text-anchor="${anchor}" fill="#1b1b1b">${esc(d.label)}</text>`,
    );
  }
  // The equipment.
  for (const item of room.items) {
    const x = X(item.minX);
    const y = Y(item.minZ);
    const w = (item.maxX - item.minX) * SCALE;
    const h = (item.maxZ - item.minZ) * SCALE;
    out.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${item.wall ? 'none' : '#eceae2'}" stroke="#1b1b1b" stroke-width="1.2"${item.wall ? ' stroke-dasharray="4 3"' : ''}/>`,
    );
    // Its tag: inside it if it fits, else just off the wall it hangs on.
    const cx = x + w / 2;
    const cy = y + h / 2;
    const fits = w > 34 && h > 14;
    const tx = fits
      ? cx
      : cx + (Math.abs(w) < 20 ? (cx < width / 2 ? 22 : -22) : 0);
    const ty = fits
      ? cy + 4
      : cy + (Math.abs(h) < 20 ? (cy < height / 2 ? 18 : -10) : 4);
    out.push(
      `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" font-size="11" font-weight="bold" text-anchor="middle" fill="#1b1b1b">${esc(item.tag)}</text>`,
    );
  }
  // The north point, top right, and a 5 m scale bar, bottom left.
  const nx = width - 30;
  out.push(
    `<path d="M ${nx} 18 L ${nx - 8} 40 L ${nx} 34 L ${nx + 8} 40 Z" fill="#1b1b1b"/>`,
    `<text x="${nx}" y="54" font-size="11" text-anchor="middle" font-weight="bold">N</text>`,
  );
  const sy = height - 22;
  for (let i = 0; i < 5; i++)
    out.push(
      `<rect x="${MARGIN + i * SCALE}" y="${sy}" width="${SCALE}" height="6" fill="${i % 2 ? '#ffffff' : '#1b1b1b'}" stroke="#1b1b1b" stroke-width="1"/>`,
    );
  out.push(
    `<text x="${MARGIN}" y="${sy - 4}" font-size="10">0</text>`,
    `<text x="${MARGIN + 5 * SCALE}" y="${sy - 4}" font-size="10" text-anchor="middle">5 m</text>`,
    `<text x="${MARGIN + 5 * SCALE + 14}" y="${sy + 6}" font-size="10">${esc(room.title)}</text>`,
    '</svg>',
  );
  return out.join('\n');
}
