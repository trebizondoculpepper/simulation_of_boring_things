import { DOCKS, CHAMBERS, FREIGHT_LIFT, RISERS, span } from './warren-plan';
import type { Chamber } from './warren-plan';
import { packAll } from './packing';
import { placements } from './placement';
import type { Level } from './placement';
import { LEVEL_HEIGHT } from './placement';
import { majorRoutes } from './routes';

/**
 * A plan drawing of one level of the plant rooms, as SVG: its chambers
 * (tinted by ring: core warm, edge cool, outer pale, ways grey), every
 * machine where the packing puts it, the risers and the freight lift,
 * and the major pipes and cables routed through it in their colours,
 * with a key. Pure: the drawing is made from the plan and the routes.
 */

const RING: Record<string, string> = {
  core: '#e6dccb',
  peripheral: '#cfdae2',
  outer: '#efefe9',
};
const MEDIUM: Record<string, string> = {
  lthw: '#c0392b',
  gas: '#c9a400',
  power: '#7d8a8f',
  chemical: '#8e6fd0',
  'make-up': '#2e9e5b',
  drain: '#222426',
};
const MEDIUM_NAME: Record<string, string> = {
  lthw: 'Heating hot water',
  gas: 'Gas',
  power: 'Power',
  chemical: 'Chemical lines',
  'make-up': 'Make-up water',
  drain: 'Drains',
};

const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Whether a pipe's height (y) is on `level`'s storey: the level whose run height (3 m over its floor) it is nearest. */
function onLevel(level: Level, y: number): boolean {
  const levels = Object.keys(LEVEL_HEIGHT) as Level[];
  const nearest = levels.reduce((best, l) =>
    Math.abs(LEVEL_HEIGHT[l] + 3 - y) < Math.abs(LEVEL_HEIGHT[best] + 3 - y)
      ? l
      : best,
  );
  return nearest === level;
}

export function planSvg(level: Level): string {
  const scale = 10; // px per metre
  const chambers = CHAMBERS.filter((c) => c.level === level);
  const ringOf = new Map(placements().map((p) => [p.room, p.ring]));
  // The drawing's extent: every chamber of every level, so the plans line up.
  const all = CHAMBERS.map((c) => c.rect);
  const minX = Math.min(...all.map((r) => r.minX)) - 4;
  const maxX = Math.max(...all.map((r) => r.maxX)) + 4;
  const minZ = Math.min(...all.map((r) => r.minZ)) - 4;
  const maxZ = Math.max(...all.map((r) => r.maxZ)) + 4;
  const X = (x: number) => ((x - minX) * scale).toFixed(1);
  const Z = (z: number) => ((z - minZ) * scale).toFixed(1);
  const W = (maxX - minX) * scale;
  const H = (maxZ - minZ) * scale;
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H + 60}" width="${W}" height="${H + 60}" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="100%" height="100%" fill="#fafaf8"/>`,
    `<text x="12" y="24" font-size="18" font-weight="bold" fill="#1f2a33">The plant rooms: ${level} level (${LEVEL_HEIGHT[level] >= 0 ? '+' : ''}${LEVEL_HEIGHT[level]} m)</text>`,
  );
  // Ghosts of the other levels, faint, to place this one.
  for (const c of CHAMBERS.filter((x) => x.level !== level))
    out.push(
      `<rect x="${X(c.rect.minX)}" y="${Z(c.rect.minZ)}" width="${((c.rect.maxX - c.rect.minX) * scale).toFixed(1)}" height="${((c.rect.maxZ - c.rect.minZ) * scale).toFixed(1)}" fill="none" stroke="#d9d9d4" stroke-dasharray="4 4"/>`,
    );
  const fillOf = (c: Chamber) =>
    c.to !== undefined
      ? '#e3e3df'
      : c.room
        ? (RING[ringOf.get(c.room) ?? ''] ?? '#e8e8e4')
        : '#e8e8e4';
  for (const c of chambers) {
    const w = (c.rect.maxX - c.rect.minX) * scale;
    const h = (c.rect.maxZ - c.rect.minZ) * scale;
    out.push(
      `<rect x="${X(c.rect.minX)}" y="${Z(c.rect.minZ)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${fillOf(c)}" stroke="#555a5e" stroke-width="2"/>`,
    );
    if (c.to !== undefined) {
      // A stair: treads across it.
      const along = c.along === 'z';
      for (let k = 1; k < 12; k++) {
        const t = k / 12;
        out.push(
          along
            ? `<line x1="${X(c.rect.minX)}" x2="${X(c.rect.maxX)}" y1="${Z(c.rect.minZ + t * (c.rect.maxZ - c.rect.minZ))}" y2="${Z(c.rect.minZ + t * (c.rect.maxZ - c.rect.minZ))}" stroke="#b3b3ae"/>`
            : `<line y1="${Z(c.rect.minZ)}" y2="${Z(c.rect.maxZ)}" x1="${X(c.rect.minX + t * (c.rect.maxX - c.rect.minX))}" x2="${X(c.rect.minX + t * (c.rect.maxX - c.rect.minX))}" stroke="#b3b3ae"/>`,
        );
      }
    }
  }
  // Machines.
  for (const p of packAll().placed.filter((m) =>
    chambers.some((c) => c.id === m.chamber),
  ))
    out.push(
      `<rect x="${X(p.rect.minX)}" y="${Z(p.rect.minZ)}" width="${((p.rect.maxX - p.rect.minX) * scale).toFixed(1)}" height="${((p.rect.maxZ - p.rect.minZ) * scale).toFixed(1)}" fill="#8f9aa1" stroke="#3d4448" stroke-width="1"><title>${escape(p.name)}</title></rect>`,
    );
  // Shafts.
  for (const s of [...RISERS, FREIGHT_LIFT]) {
    const levels = ['roof', 'surface', 'treatment', 'basement'] as const;
    const i = levels.indexOf(level);
    if (i < levels.indexOf(s.top) || i > levels.indexOf(s.bottom)) continue;
    out.push(
      `<rect x="${X(s.rect.minX)}" y="${Z(s.rect.minZ)}" width="${((s.rect.maxX - s.rect.minX) * scale).toFixed(1)}" height="${((s.rect.maxZ - s.rect.minZ) * scale).toFixed(1)}" fill="#4b5054"/>`,
      `<line x1="${X(s.rect.minX)}" y1="${Z(s.rect.minZ)}" x2="${X(s.rect.maxX)}" y2="${Z(s.rect.maxZ)}" stroke="#f2c230" stroke-width="2"/>`,
    );
  }
  // Docks onto the white.
  if (level === 'surface') {
    const bay = CHAMBERS.find((c) => c.id === 'loading-bay')!;
    for (const [a, b] of DOCKS)
      out.push(
        `<line x1="${X(a)}" x2="${X(b)}" y1="${Z(bay.rect.maxZ)}" y2="${Z(bay.rect.maxZ)}" stroke="#ffffff" stroke-width="6"/>`,
      );
  }
  // Routes on this level.
  const used = new Set<string>();
  for (const r of majorRoutes().routes)
    for (let i = 1; i < r.points.length; i++) {
      const [ax, ay, az] = r.points[i - 1];
      const [bx, by, bz] = r.points[i];
      if (!onLevel(level, ay) || !onLevel(level, by)) continue;
      if (Math.abs(ax - bx) < 1e-6 && Math.abs(az - bz) < 1e-6) continue;
      used.add(r.medium);
      out.push(
        `<line x1="${X(ax)}" y1="${Z(az)}" x2="${X(bx)}" y2="${Z(bz)}" stroke="${MEDIUM[r.medium]}" stroke-width="${r.medium === 'power' ? 4 : 2.5}" stroke-linecap="round" opacity="0.85"/>`,
      );
    }
  // Labels, over everything.
  for (const c of chambers) {
    if (c.to !== undefined) continue;
    const cx = (c.rect.minX + c.rect.maxX) / 2;
    const name = c.name.replace(/^Plant room: /, 'Plant: ');
    const width = (c.rect.maxX - c.rect.minX) * scale;
    const size = Math.max(8, Math.min(13, (width / name.length) * 1.7));
    out.push(
      `<text x="${X(cx)}" y="${Z(c.rect.minZ + 1.6)}" font-size="${size.toFixed(1)}" text-anchor="middle" fill="#1f2a33" font-weight="bold">${escape(name)}</text>`,
    );
    const { high } = span(c);
    out.push(
      `<text x="${X(cx)}" y="${Z(c.rect.minZ + 1.6)} " dy="${(size + 3).toFixed(0)}" font-size="9" text-anchor="middle" fill="#5a6166">${(c.rect.maxX - c.rect.minX).toFixed(0)} × ${(c.rect.maxZ - c.rect.minZ).toFixed(0)} m · ${c.open ? 'open' : `${c.height} m high`} · floor ${high >= 0 ? '+' : ''}${high} m</text>`,
    );
  }
  // The key.
  let kx = 12;
  for (const m of Object.keys(MEDIUM).filter((k) => used.has(k))) {
    out.push(
      `<line x1="${kx}" x2="${kx + 24}" y1="${H + 36}" y2="${H + 36}" stroke="${MEDIUM[m]}" stroke-width="4"/>`,
      `<text x="${kx + 30}" y="${H + 40}" font-size="12" fill="#1f2a33">${MEDIUM_NAME[m]}</text>`,
    );
    kx += 30 + MEDIUM_NAME[m].length * 7 + 20;
  }
  out.push(
    `<rect x="${kx}" y="${H + 30}" width="12" height="12" fill="#4b5054"/><text x="${kx + 18}" y="${H + 40}" font-size="12" fill="#1f2a33">Riser or freight lift</text>`,
    `</svg>`,
  );
  return out.join('\n');
}
