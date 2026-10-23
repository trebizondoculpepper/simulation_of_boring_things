import type { Footprint } from '../../controls/logic/walk-collision';
import {
  HEADERS,
  accessOf,
  footprintOf,
  olympicBox,
  olympicPlan,
  olympicRoomPlan,
} from './olympic-plan';
import { EQUIPMENT_OPENING, PLANT_DOORWAY } from './plant-rooms';

/**
 * The Olympic plant room's plan (`olympic-plan.ts`) as an SVG drawing, for
 * the owner to look at before the pipeline places and routes it: the walls
 * and their doors, each wall's role, the landing and stair, the spaces kept
 * clear, each machine and its access, the battery's headers, and the main
 * lines' ways, coloured by what they carry. Pure: a string.
 */

const S = 40;
const M = 110;

type Line = {
  colour: string;
  dash?: string;
  points: [number, number][];
  label?: string;
};

export function olympicPlanSvg(): string {
  const items = olympicPlan();
  const box = olympicBox();
  const plan = olympicRoomPlan();
  const h = box.w / 2;
  const X = (x: number) => M + (x + h) * S;
  const Z = (z: number) => M + (z + h) * S;
  const W = 2 * h * S + 2 * M;
  const out: string[] = [];
  const rect = (f: Footprint, style: string) =>
    out.push(
      `<rect x="${X(f.minX)}" y="${Z(f.minZ)}" width="${(f.maxX - f.minX) * S}" height="${(f.maxZ - f.minZ) * S}" ${style}/>`,
    );
  const text = (x: number, z: number, s: string, style = '') =>
    out.push(
      `<text x="${X(x)}" y="${Z(z)}" ${style}>${s.replace(/&/g, '&amp;')}</text>`,
    );
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W + 160} ${W + 160}" width="${W + 160}" height="${W + 160}" font-family="Arial, Helvetica, sans-serif">`,
    `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#b8bcc0" stroke-width="2"/></pattern>`,
    `<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#fbfaf6"/>`,
  );
  // A metre grid.
  for (let v = -h; v <= h + 1e-9; v++) {
    out.push(
      `<line x1="${X(v)}" y1="${Z(-h)}" x2="${X(v)}" y2="${Z(h)}" stroke="#eceae2" stroke-width="1"/>`,
      `<line x1="${X(-h)}" y1="${Z(v)}" x2="${X(h)}" y2="${Z(v)}" stroke="#eceae2" stroke-width="1"/>`,
    );
  }
  // The landing above (deck level), the stair, the spaces kept clear.
  rect(plan.landing, 'fill="url(#hatch)" stroke="#8a8f93" stroke-width="1"');
  text(
    0,
    (plan.landing.minZ + plan.landing.maxZ) / 2 + 0.15,
    'LANDING / VIEWING GANTRY ABOVE (DECK LEVEL, +3.5 m)',
    'font-size="11" text-anchor="middle" fill="#55595c"',
  );
  const st = plan.stair;
  rect(
    { minX: st.minX, maxX: st.maxX, minZ: st.top, maxZ: st.bottom },
    'fill="#e4e6e8" stroke="#8a8f93"',
  );
  for (let k = 1; k < st.steps - 1; k++) {
    const z = st.top + ((st.bottom - st.top) * k) / (st.steps - 1);
    out.push(
      `<line x1="${X(st.minX)}" y1="${Z(z)}" x2="${X(st.maxX)}" y2="${Z(z)}" stroke="#a5a9ad" stroke-width="1"/>`,
    );
  }
  text(
    (st.minX + st.maxX) / 2,
    st.bottom - 0.3,
    'STAIR',
    'font-size="10" text-anchor="middle" fill="#55595c" transform="rotate(-90 ' +
      X((st.minX + st.maxX) / 2) +
      ' ' +
      Z(st.bottom - 0.3) +
      ')"',
  );
  for (const k of box.keepClear)
    rect(
      k,
      'fill="none" stroke="#c9a227" stroke-width="1.5" stroke-dasharray="5 4"',
    );
  // The walls, with their doors.
  const t = 0.2;
  const wall = (f: Footprint) => rect(f, 'fill="#5c6166"');
  const dx = plan.door.x;
  wall({ minX: -h - t, maxX: dx - PLANT_DOORWAY / 2, minZ: -h - t, maxZ: -h });
  wall({ minX: dx + PLANT_DOORWAY / 2, maxX: h + t, minZ: -h - t, maxZ: -h });
  wall({ minX: -h - t, maxX: -EQUIPMENT_OPENING / 2, minZ: h, maxZ: h + t });
  wall({ minX: EQUIPMENT_OPENING / 2, maxX: h + t, minZ: h, maxZ: h + t });
  const tz = plan.tankDoor!.z;
  wall({ minX: -h - t, maxX: -h, minZ: -h, maxZ: tz - EQUIPMENT_OPENING / 2 });
  wall({ minX: -h - t, maxX: -h, minZ: tz + EQUIPMENT_OPENING / 2, maxZ: h });
  wall({ minX: h, maxX: h + t, minZ: -h, maxZ: h });
  // The doors' names.
  text(
    dx,
    -h - 0.45,
    'POOL DOOR (deck level)',
    'font-size="11" text-anchor="middle" fill="#2c3e50"',
  );
  text(
    0,
    h + 0.75,
    'EQUIPMENT DOORS',
    'font-size="11" text-anchor="middle" fill="#2c3e50"',
  );
  text(
    -h - 0.45,
    tz,
    'BALANCE TANK DOORS',
    `font-size="11" text-anchor="middle" fill="#2c3e50" transform="rotate(-90 ${X(-h - 0.45)} ${Z(tz)})"`,
  );
  // Each wall's role, outside it.
  const role =
    'font-size="15" font-weight="bold" text-anchor="middle" fill="#1f3b5a"';
  text(0, -h - 1.4, 'NORTH · THE OLYMPIC POOL', role);
  text(0, h + 1.6, 'SOUTH · THE MAIN PLANT', role);
  out.push(
    `<text x="${X(-h - 1.5)}" y="${Z(0)}" ${role} transform="rotate(-90 ${X(-h - 1.5)} ${Z(0)})">WEST · THE BALANCE TANK HALL</text>`,
  );
  out.push(
    `<text x="${X(h + 1.4)}" y="${Z(0)}" ${role} transform="rotate(90 ${X(h + 1.4)} ${Z(0)})">EAST · POWER AND CONTROL</text>`,
  );
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
    'fill="#dfe9e0" stroke="#3d7f45" stroke-width="1"',
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
    const round = i.key.startsWith('filter') || i.key === 'contact';
    if (i.key.startsWith('filter')) {
      rect(f, 'fill="none" stroke="#9aa0a4" stroke-dasharray="2 3"');
      out.push(
        `<circle cx="${X(i.x)}" cy="${Z(i.z - 0.1)}" r="${1.5 * S}" fill="#cfd8dc" stroke="#37474f" stroke-width="2"/>`,
      );
    } else
      rect(
        f,
        `fill="${i.mount === 'wall' ? '#ffe0b2' : '#cfd8dc'}" stroke="#37474f" stroke-width="2"${round ? ' rx="6"' : ''}`,
      );
    // Its name: inside it, across it if it is upright on a wall, or beside it if it is too small.
    const upright = i.facing === 'east' || i.facing === 'west';
    const thin = Math.min(f.maxX - f.minX, f.maxZ - f.minZ) < 0.9;
    const lines = i.label.split(', ');
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
      const lx = i.facing === 'west' ? f.minX - 0.25 : f.maxX + 0.25;
      out.push(
        `<text x="${X(lx)}" y="${Z(i.z)}" font-size="11" text-anchor="middle" fill="#1b2326" transform="rotate(-90 ${X(lx)} ${Z(i.z)})">${i.label}</text>`,
      );
    } else
      lines.forEach((l, k) =>
        text(
          i.x,
          i.z + 0.12 + (k - (lines.length - 1) / 2) * 0.38,
          l,
          'font-size="11" text-anchor="middle" fill="#1b2326"',
        ),
      );
  }
  // The main lines' ways, schematic, in plan.
  const by = (k: string) => items.find((i) => i.key === k)!;
  const pumps = footprintOf(by('pumps'));
  const contact = footprintOf(by('contact'));
  const uv = footprintOf(by('uv'));
  const hxr = footprintOf(by('exchanger'));
  const panel = footprintOf(by('panel'));
  const dosing = footprintOf(by('hypo'));
  const pz = (pumps.minZ + pumps.maxZ) / 2;
  const headerIn = front + 0.15;
  const headerOut = front + 0.45;
  // Up between filters 3 and 4, over the headers, to the north wall.
  const gap34 =
    (footprintOf(filters[2]).maxX + footprintOf(filters[3]).minX) / 2;
  const lines: Line[] = [
    // Suctions from the balance tank, through the west wall.
    {
      colour: '#1565c0',
      points: [
        [-h - 0.6, pz - 0.7],
        [pumps.minX + 0.3, pz - 0.7],
      ],
      label: 'suction',
    },
    {
      colour: '#1565c0',
      points: [
        [-h - 0.6, pz + 0.7],
        [pumps.minX + 0.3, pz + 0.7],
      ],
    },
    // Discharge north to the inlet header.
    {
      colour: '#1565c0',
      points: [
        [pumps.maxX, pz],
        [pumps.maxX + 0.5, pz],
        [pumps.maxX + 0.5, headerIn],
      ],
    },
    // Filtered water from the outlet header to the contact tank (ozone injected).
    {
      colour: '#00897b',
      points: [
        [hx1 - 0.3, headerOut],
        [hx1 - 0.3, (contact.minZ + contact.maxZ) / 2],
        [contact.maxX, (contact.minZ + contact.maxZ) / 2],
      ],
    },
    // Contact tank to the heat exchanger, to the UV, and out north to the pool (high level).
    {
      colour: '#00897b',
      points: [
        [(contact.minX + contact.maxX) / 2, contact.maxZ],
        [(contact.minX + contact.maxX) / 2, contact.maxZ + 0.8],
        [(hxr.minX + hxr.maxX) / 2, contact.maxZ + 0.8],
        [(hxr.minX + hxr.maxX) / 2, hxr.minZ],
      ],
    },
    {
      colour: '#00897b',
      points: [
        [hxr.maxX, (hxr.minZ + hxr.maxZ) / 2],
        [(uv.minX + uv.maxX) / 2, (hxr.minZ + hxr.maxZ) / 2],
        [(uv.minX + uv.maxX) / 2, uv.maxZ],
      ],
    },
    {
      colour: '#00897b',
      dash: '10 5',
      points: [
        [uv.minX, (uv.minZ + uv.maxZ) / 2],
        [gap34, (uv.minZ + uv.maxZ) / 2],
        [gap34, -h - 0.6],
      ],
      label: 'return to pool (high level, between filters 3 and 4)',
    },
    // Backwash and drainage south to the main plant, in a floor channel.
    {
      colour: '#6d4c41',
      dash: '8 4',
      points: [
        [-5.5, front + HEADERS],
        [-5.5, h + 0.6],
      ],
      label: 'backwash to drain (floor channel)',
    },
    // Heating flow and return from the main plant.
    {
      colour: '#c62828',
      points: [
        [hxr.minX + 0.3, h + 0.6],
        [hxr.minX + 0.3, hxr.maxZ],
      ],
    },
    {
      colour: '#c62828',
      points: [
        [hxr.maxX - 0.3, h + 0.6],
        [hxr.maxX - 0.3, hxr.maxZ],
      ],
    },
    // Make-up from the main plant to the balance tank (high level).
    {
      colour: '#4fc3f7',
      dash: '10 5',
      points: [
        [-2.6, h + 0.6],
        [-2.6, pumps.maxZ + 1.2],
        [-h - 0.6, pumps.maxZ + 1.2],
      ],
      label: 'make-up to the tank (high level)',
    },
    // Chemicals in from the main plant to the dosing.
    {
      colour: '#8e24aa',
      points: [
        [(dosing.minX + dosing.maxX) / 2, h + 0.6],
        [(dosing.minX + dosing.maxX) / 2, dosing.maxZ],
      ],
    },
    // Power and control in by the east wall, to the panel.
    {
      colour: '#ef6c00',
      points: [
        [h + 0.6, (panel.minZ + panel.maxZ) / 2],
        [panel.maxX, (panel.minZ + panel.maxZ) / 2],
      ],
    },
  ];
  for (const l of lines) {
    out.push(
      `<polyline points="${l.points.map(([x, z]) => `${X(x)},${Z(z)}`).join(' ')}" fill="none" stroke="${l.colour}" stroke-width="4" stroke-linejoin="round"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''} marker-end="url(#arrow)" opacity="0.85"/>`,
    );
  }
  // A key, a scale and a north point.
  const ky = W + 10;
  const key: [string, string, string?][] = [
    ['#1565c0', 'Pool water to the filters'],
    ['#00897b', 'Filtered and treated water, back to the pool'],
    ['#6d4c41', 'Backwash and drainage', '8 4'],
    ['#c62828', 'Heating flow and return'],
    ['#4fc3f7', 'Make-up to the balance tank', '10 5'],
    ['#8e24aa', 'Dosing chemicals'],
    ['#ef6c00', 'Power and control'],
  ];
  key.forEach(([c, label, dash], k) => {
    const x = M + (k % 4) * 300;
    const y = ky + Math.floor(k / 4) * 26;
    out.push(
      `<line x1="${x}" y1="${y}" x2="${x + 34}" y2="${y}" stroke="${c}" stroke-width="4"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`,
      `<text x="${x + 42}" y="${y + 4}" font-size="12" fill="#1b2326">${label}</text>`,
    );
  });
  const sy = ky + 70;
  out.push(
    `<rect x="${M}" y="${sy}" width="${5 * S}" height="8" fill="none" stroke="#1b2326"/>`,
    ...[0, 1, 2, 3, 4].map((k) =>
      k % 2
        ? ''
        : `<rect x="${M + k * S}" y="${sy}" width="${S}" height="8" fill="#1b2326"/>`,
    ),
    `<text x="${M}" y="${sy + 24}" font-size="11">0</text><text x="${M + 5 * S}" y="${sy + 24}" font-size="11" text-anchor="middle">5 m</text>`,
    `<text x="${M + 6 * S}" y="${sy + 8}" font-size="12" fill="#55595c">Dashed outline: space kept clear (doors, stair foot). Hatched: the landing above. Shaded strip: a machine's maintenance access. Room 22 × 22 m inside, two storeys.</text>`,
    `<text x="${W + 120}" y="30" font-size="18" text-anchor="end" font-weight="bold">N ↑</text>`,
    `<text x="${M - 80}" y="30" font-size="20" font-weight="bold" fill="#1b2326">PLANT ROOM 2 – OLYMPIC POOL · PROPOSED PLAN (prompt 033)</text>`,
    '</svg>',
  );
  return out.join('\n');
}
