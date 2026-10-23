import type { Footprint } from '../../controls/logic/walk-collision';
import {
  HEADERS,
  OLYMPIC_ROOM,
  accessOf,
  footprintOf,
  keptClear,
  olympicPlan,
  olympicRoomPlan,
} from './olympic-plan';
import type { PlanDoor } from './olympic-plan';
import { plumbOlympic, scoreOlympic } from './olympic-plumbing';
import type { OlympicRun } from './olympic-plumbing';

/**
 * The Olympic plant room's plan (`olympic-plan.ts`) as an SVG drawing, for
 * the owner to look at before the pipeline places and routes it: the walls
 * and their doors, each wall's role, the landing and stair, the spaces kept
 * clear, each machine and its access, the battery's headers, and the main
 * lines' ways, coloured by what they carry. Pure: a string.
 */

/** A run's colour on the drawing, by what it carries. */
function colourOf(r: OlympicRun): { colour: string; dash?: string } {
  const n = `${r.line} ${r.name}`;
  if (r.kind === 'pvc-drain') return { colour: '#6d4c41', dash: '8 4' };
  if (r.kind === 'lagged-heating') return { colour: '#c62828' };
  if (r.kind === 'copper') return { colour: '#4fc3f7' };
  if (r.kind === 'chemical-tube') return { colour: '#8e24aa' };
  if (r.kind === 'stainless') return { colour: '#90a4ae' };
  if (r.medium === 'power') return { colour: '#ef6c00' };
  if (
    /suction|discharge|battery\.inlet|\.inlet|Inlet header|manifold/.test(n) &&
    !/contact/.test(n)
  )
    return { colour: '#1565c0' };
  return { colour: '#00897b' };
}

/** Pixels a metre, and the margin round the room. */
const S = 40;
const M = 110;

export function olympicPlanSvg(): string {
  const items = olympicPlan();
  const room = olympicRoomPlan();
  const hx = room.halfX;
  const hz = room.halfZ;
  const X = (x: number) => M + (x + hx) * S;
  const Z = (z: number) => M + (z + hz) * S;
  const W = OLYMPIC_ROOM.w * S + 2 * M;
  const H = OLYMPIC_ROOM.d * S + 2 * M + 200;
  const out: string[] = [];
  const rect = (f: Footprint, style: string) =>
    out.push(
      `<rect x="${X(f.minX)}" y="${Z(f.minZ)}" width="${(f.maxX - f.minX) * S}" height="${(f.maxZ - f.minZ) * S}" ${style}/>`,
    );
  const text = (x: number, z: number, s: string, style = '') =>
    out.push(`<text x="${X(x)}" y="${Z(z)}" ${style}>${s}</text>`);
  const turned = (
    x: number,
    z: number,
    s: string,
    angle: number,
    style: string,
  ) =>
    out.push(
      `<text x="${X(x)}" y="${Z(z)}" ${style} transform="rotate(${angle} ${X(x)} ${Z(z)})">${s}</text>`,
    );
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">`,
    `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#b8bcc0" stroke-width="2"/></pattern>`,
    `<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#fbfaf6"/>`,
    `<text x="20" y="32" font-size="20" font-weight="bold" fill="#1b2326">PLANT ROOM 2 – OLYMPIC POOL · PLUMBED PLAN, 22 × 14 m (prompt 033)</text>`,
    `<text x="${W - 20}" y="32" font-size="18" text-anchor="end" font-weight="bold">N ↑</text>`,
  );
  // A metre grid.
  for (let v = -hx; v <= hx + 1e-9; v++)
    out.push(
      `<line x1="${X(v)}" y1="${Z(-hz)}" x2="${X(v)}" y2="${Z(hz)}" stroke="#eceae2"/>`,
    );
  for (let v = -hz; v <= hz + 1e-9; v++)
    out.push(
      `<line x1="${X(-hx)}" y1="${Z(v)}" x2="${X(hx)}" y2="${Z(v)}" stroke="#eceae2"/>`,
    );

  // The spaces kept clear, the landing above, the stair.
  for (const k of keptClear())
    rect(
      k,
      'fill="none" stroke="#c9a227" stroke-width="1.5" stroke-dasharray="5 4"',
    );
  rect(room.landing, 'fill="url(#hatch)" stroke="#8a8f93"');
  rect(room.gantry, 'fill="url(#hatch)" stroke="#8a8f93"');
  turned(
    (room.gantry.minX + room.gantry.maxX) / 2 + 0.1,
    room.gantry.minZ + 3.4,
    'CANTILEVERED GANTRY ABOVE (NO LEGS)',
    90,
    'font-size="10" text-anchor="middle" fill="#55595c"',
  );
  text(
    (room.landing.minX + room.landing.maxX) / 2 - 0.5,
    room.landing.minZ + 0.45,
    'LANDING ABOVE',
    'font-size="11" text-anchor="middle" fill="#55595c"',
  );
  text(
    (room.landing.minX + room.landing.maxX) / 2 - 0.5,
    room.landing.minZ + 0.85,
    '(deck level, +3.5 m)',
    'font-size="10" text-anchor="middle" fill="#55595c"',
  );
  const st = room.stair;
  rect(
    { minX: st.minX, maxX: st.maxX, minZ: st.minZ, maxZ: st.maxZ },
    'fill="#e4e6e8" stroke="#8a8f93"',
  );
  for (let k = 1; k < st.steps - 1; k++) {
    const x = st.minX + ((st.maxX - st.minX) * k) / (st.steps - 1);
    out.push(
      `<line x1="${X(x)}" y1="${Z(st.minZ)}" x2="${X(x)}" y2="${Z(st.maxZ)}" stroke="#a5a9ad"/>`,
    );
  }
  text(
    (st.minX + st.maxX) / 2,
    (st.minZ + st.maxZ) / 2 + 0.12,
    'STAIR, DOWN WEST ←',
    'font-size="10" text-anchor="middle" fill="#3e4447"',
  );

  // The walls, each broken by its door.
  const t = 0.2;
  const doorsOn = (wall: PlanDoor['wall']) =>
    Object.values(room.doors).filter((d) => d.wall === wall);
  const wallRun = (wall: PlanDoor['wall']) => {
    const along = wall === 'north' || wall === 'south';
    const half = along ? hx : hz;
    const cuts = doorsOn(wall)
      .map((d) => [d.at - d.width / 2, d.at + d.width / 2])
      .sort((a, b) => a[0] - b[0]);
    let from = -half - t;
    for (const [a, b] of [...cuts, [half + t, half + t]]) {
      if (a > from) {
        const f = along
          ? wall === 'north'
            ? { minX: from, maxX: a, minZ: -hz - t, maxZ: -hz }
            : { minX: from, maxX: a, minZ: hz, maxZ: hz + t }
          : wall === 'west'
            ? { minX: -hx - t, maxX: -hx, minZ: from, maxZ: a }
            : { minX: hx, maxX: hx + t, minZ: from, maxZ: a };
        rect(f, 'fill="#5c6166"');
      }
      from = b;
    }
  };
  for (const w of ['north', 'south', 'east', 'west'] as const) wallRun(w);
  // The doors' names.
  const doorText = 'font-size="11" text-anchor="middle" fill="#2c3e50"';
  const { pool, main, tank } = room.doors;
  turned(hx + 0.5, pool.at, pool.label, 90, doorText);
  text(main.at - 1.2, hz + 0.75, main.label, doorText);
  turned(-hx - 0.45, tank.at, tank.label, -90, doorText);
  // Each wall's role, outside it.
  const role =
    'font-size="15" font-weight="bold" text-anchor="middle" fill="#1f3b5a"';
  text(0, -hz - 0.6, 'NORTH · THE OLYMPIC POOL', role);
  text(-3, hz + 1.7, 'SOUTH · THE MAIN PLANT', role);
  turned(-hx - 1.5, 0, 'WEST · THE BALANCE TANK HALL', -90, role);
  turned(hx + 1.5, -2, 'EAST · POWER AND CONTROL; THE POOL DOOR', 90, role);

  // The machines' access (a filter's beyond the battery's headers).
  for (const i of items) {
    if (i.mount !== 'floor') continue;
    const a = accessOf(i);
    const strip = i.key.startsWith('filter')
      ? { ...a, minZ: a.minZ + HEADERS, maxZ: a.maxZ + HEADERS }
      : a;
    rect(strip, 'fill="#f1efe3" stroke="#d6d2bd" stroke-dasharray="3 3"');
  }
  // The battery's common headers.
  const filters = items.filter((i) => i.key.startsWith('filter'));
  const front = footprintOf(filters[0]).maxZ;
  const hx0 = footprintOf(filters[0]).minX;
  const hx1 = footprintOf(filters[4]).maxX;
  rect(
    { minX: hx0, maxX: hx1, minZ: front, maxZ: front + HEADERS },
    'fill="#dfe9e0" stroke="#3d7f45"',
  );
  text(
    (hx0 + hx1) / 2,
    front + HEADERS / 2 + 0.12,
    'COMMON HEADERS: INLET · OUTLET · BACKWASH (each filter on its five-valve face pipework)',
    'font-size="10" text-anchor="middle" fill="#2c5a30"',
  );
  // The machines.
  let wallRow = 0;
  for (const i of items) {
    const f = footprintOf(i);
    if (i.key.startsWith('filter')) {
      rect(f, 'fill="none" stroke="#9aa0a4" stroke-dasharray="2 3"');
      out.push(
        `<circle class="filter" cx="${X(i.x)}" cy="${Z(i.z - 0.1)}" r="${1.5 * S}" fill="#cfd8dc" stroke="#37474f" stroke-width="2"/>`,
      );
    } else
      rect(
        f,
        `fill="${i.mount === 'wall' ? '#ffe0b2' : '#cfd8dc'}" stroke="#37474f" stroke-width="2"${i.key === 'contact' ? ' rx="6"' : ''}`,
      );
    const upright = i.facing === 'east' || i.facing === 'west';
    const thin = Math.min(f.maxX - f.minX, f.maxZ - f.minZ) < 0.9;
    if (i.mount === 'wall') {
      // Staggered, so neighbours' names do not overlap.
      const row = wallRow++ % 2;
      text(
        i.x,
        f.minZ - 0.25 - row * 0.4,
        i.label.replace(' and sample cells', ''),
        'font-size="9" text-anchor="middle" fill="#7a4a00"',
      );
    } else if (thin && upright) {
      const lx = i.facing === 'west' ? f.minX - 0.35 : f.maxX + 0.35;
      turned(
        lx,
        i.z,
        i.label,
        -90,
        'font-size="11" text-anchor="middle" fill="#1b2326"',
      );
    } else {
      const lines = i.label.split(', ');
      lines.forEach((l, k) =>
        text(
          i.x,
          i.z + 0.12 + (k - (lines.length - 1) / 2) * 0.38,
          l,
          'font-size="11" text-anchor="middle" fill="#1b2326"',
        ),
      );
    }
  }

  // The pipes as plumbed and routed (`olympic-plumbing.ts`), each at its size, in its service's colour; the fittings on them.
  const plumbed = plumbOlympic();
  const score = scoreOlympic(plumbed);
  const ordered = [...plumbed.runs].sort((a, b) => b.od - a.od);
  for (const r of ordered) {
    const c = colourOf(r);
    const width = Math.max(2, r.od * S);
    out.push(
      `<polyline points="${r.points.map(([x, , z]) => `${X(x)},${Z(z)}`).join(' ')}" fill="none" stroke="${c.colour}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${c.dash ? ` stroke-dasharray="${c.dash}"` : ''} opacity="0.8"/>`,
    );
  }
  for (const f of plumbed.fittings) {
    const fill =
      f.kind === 'fused-tap-off'
        ? '#bf360c'
        : f.kind === 'power-isolator'
          ? '#ef6c00'
          : f.kind === 'non-return-valve'
            ? '#1b2326'
            : '#2e7d32';
    out.push(
      `<circle cx="${X(f.at[0])}" cy="${Z(f.at[2])}" r="5" fill="${fill}" stroke="#ffffff" stroke-width="1.5"/>`,
    );
  }
  out.push(
    `<text x="20" y="56" font-size="13" fill="#2e7d32">Plumbed and routed: ${plumbed.runs.length} runs (${plumbed.runs.filter((r) => r.by === 'router').length} by the router), ${plumbed.fittings.length} fittings. Score ${score.total.toFixed(1)}, ${score.passes ? 'every gate passed' : `failing ${score.gates.length} gates`}.</text>`,
  );

  // A key and a scale.
  const ky = Z(hz) + 110;
  const key: [string, string, string?][] = [
    ['#1565c0', 'Pool water to the filters'],
    ['#00897b', 'Filtered and treated water, back to the pool'],
    ['#6d4c41', 'Drainage: backwash, the pool overflow and main drain', '8 4'],
    ['#c62828', 'Heating flow and return'],
    ['#4fc3f7', 'Make-up to the balance tank'],
    ['#8e24aa', 'Dosing chemicals'],
    ['#90a4ae', 'Ozone'],
    ['#ef6c00', 'Power: the busbar ring round the walls (5.75 m), its drops'],
    ['#2e7d32', '● valve  ● non-return  ● isolator  ● fused tap-off'],
  ];
  key.forEach(([c, label, dash], k) => {
    const x = M - 80 + (k % 3) * 350;
    const y = ky + Math.floor(k / 3) * 24;
    out.push(
      `<line x1="${x}" y1="${y}" x2="${x + 34}" y2="${y}" stroke="${c}" stroke-width="4"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`,
      `<text x="${x + 42}" y="${y + 4}" font-size="12" fill="#1b2326">${label}</text>`,
    );
  });
  const sy = ky + 84;
  out.push(
    `<rect x="${M}" y="${sy}" width="${5 * S}" height="8" fill="none" stroke="#1b2326"/>`,
    ...[0, 2, 4].map(
      (k) =>
        `<rect x="${M + k * S}" y="${sy}" width="${S}" height="8" fill="#1b2326"/>`,
    ),
    `<text x="${M}" y="${sy + 24}" font-size="11">0</text><text x="${M + 5 * S}" y="${sy + 24}" font-size="11" text-anchor="middle">5 m</text>`,
    `<text x="${M + 6 * S}" y="${sy + 8}" font-size="12" fill="#55595c">Dashed outline: space kept clear (inside the doors, at the stair's foot). Shaded: maintenance access.</text>`,
    `<text x="${M + 6 * S}" y="${sy + 26}" font-size="12" fill="#55595c">Hatched: the landing and the east gantry above at deck level (+3.5 m), cantilevered from the walls on brackets, no legs.</text>`,
    '</svg>',
  );
  return out.join('\n');
}
