import { CIRCUITS } from './plant/inventory';
import { balanceTankArea } from './plant/capacity';

export type SharedZone =
  | 'utilities'
  | 'boilers'
  | 'electrical'
  | 'chemicals'
  | 'loading_bay'
  | 'balance'
  | 'water_services'
  | 'air'
  | 'control'
  | 'office';
export interface Machine {
  id: string;
  label: string;
  zone: SharedZone;
  model?: string;
  w: number;
  d: number;
  h: number;
  proxy?: boolean;
}
export interface PlacedMachine extends Machine {
  x: number;
  z: number;
  allowance: { w: number; d: number };
}
export interface ZonePlan {
  id: SharedZone;
  label: string;
  x: number;
  z: number;
  w: number;
  d: number;
  machines: PlacedMachine[];
}

/** Shared inventory only. Attraction-specific filters, pumps, UV, ozone and dosing are excluded. */
export const SHARED_MACHINES: Machine[] = [
  {
    id: 'gas-intake',
    label: 'Gas meter and governor',
    zone: 'utilities',
    model: 'Gas train',
    w: 2.2,
    d: 0.6,
    h: 1.7,
  },
  {
    id: 'power-intake',
    label: '800 A electricity intake',
    zone: 'utilities',
    w: 1.5,
    d: 0.8,
    h: 2,
    proxy: true,
  },
  {
    id: 'water-intake',
    label: 'Water main and stopcock',
    zone: 'utilities',
    model: 'Make-up water meter',
    w: 1.6,
    d: 0.3,
    h: 1.2,
  },
  {
    id: 'sewer',
    label: 'Sewer effluent meter',
    zone: 'utilities',
    w: 1.4,
    d: 0.7,
    h: 1.1,
    proxy: true,
  },
  {
    id: 'boiler-bank',
    label: 'Four 300 kW boilers (one standby)',
    zone: 'boilers',
    model: 'Condensing boilers in cascade',
    w: 3,
    d: 1,
    h: 3.2,
  },
  {
    id: 'header',
    label: 'Low-loss header',
    zone: 'boilers',
    model: 'Low-loss header',
    w: 1,
    d: 0.5,
    h: 1.7,
  },
  {
    id: 'lthw-pump',
    label: 'Twin LTHW circulator',
    zone: 'boilers',
    model: 'Twin-head LTHW circulator',
    w: 1.6,
    d: 0.8,
    h: 1.3,
  },
  {
    id: 'pressure',
    label: 'Pressurisation and expansion',
    zone: 'boilers',
    model: 'Pressurisation unit and expansion vessel',
    w: 1.4,
    d: 0.7,
    h: 1.6,
  },
  {
    id: 'calorifier',
    label: 'Hot-water calorifier',
    zone: 'boilers',
    model: 'Hot-water calorifier',
    w: 1.7,
    d: 1.2,
    h: 2.3,
  },
  {
    id: 'lv-board',
    label: 'LV main switchboard',
    zone: 'electrical',
    model: 'LV main switchboard',
    w: 2.62,
    d: 0.66,
    h: 2,
  },
  {
    id: 'lighting-panel',
    label: 'Lighting control panel',
    zone: 'electrical',
    w: 1.2,
    d: 0.6,
    h: 1.8,
    proxy: true,
  },
  {
    id: 'battery',
    label: 'Emergency lighting battery',
    zone: 'electrical',
    model: 'Emergency lighting central battery',
    w: 0.62,
    d: 0.5,
    h: 1.8,
  },
  {
    id: 'ups',
    label: 'Control room UPS',
    zone: 'electrical',
    w: 0.8,
    d: 0.7,
    h: 1.4,
    proxy: true,
  },
  {
    id: 'hypo',
    label: 'Bulk hypochlorite tank',
    zone: 'chemicals',
    model: 'Sodium hypochlorite bulk tank',
    w: 1.75,
    d: 1.75,
    h: 2,
  },
  {
    id: 'acid',
    label: 'Bulk acid IBC',
    zone: 'chemicals',
    model: 'Acid IBC on spill pallet',
    w: 2,
    d: 1.4,
    h: 2.2,
  },
  {
    id: 'spill',
    label: 'Spill kit',
    zone: 'chemicals',
    model: 'Chemical spill kit',
    w: 0.65,
    d: 0.75,
    h: 1,
  },
  {
    id: 'shower',
    label: 'Safety shower',
    zone: 'chemicals',
    model: 'Safety shower and eyewash',
    w: 1.25,
    d: 1.4,
    h: 2.3,
  },
  {
    id: 'hypo-fill',
    label: 'Hypochlorite fill point',
    zone: 'loading_bay',
    w: 1.1,
    d: 0.8,
    h: 1.2,
    proxy: true,
  },
  {
    id: 'acid-fill',
    label: 'Acid fill point',
    zone: 'loading_bay',
    w: 1.1,
    d: 0.8,
    h: 1.2,
    proxy: true,
  },
  ...CIRCUITS.map((c): Machine => {
    const side = Math.sqrt(balanceTankArea(c.volume)) - 2;
    return {
      id: `balance-${c.id}`,
      label: `Balance tank: ${c.id.replaceAll('-', ' ')}`,
      zone: 'balance',
      model: 'Balance tank, main pool',
      w: Math.max(1.2, side),
      d: Math.max(1.2, side),
      h: 3.5,
    };
  }),
  {
    id: 'break-tank',
    label: 'Make-up break tank',
    zone: 'water_services',
    model: 'Make-up break tank',
    w: 2.2,
    d: 1.9,
    h: 2.5,
  },
  {
    id: 'makeup-meter',
    label: 'Make-up water meter',
    zone: 'water_services',
    model: 'Make-up water meter',
    w: 1.6,
    d: 0.3,
    h: 1.2,
  },
  {
    id: 'backwash-tank',
    label: 'Backwash holding tank and pump',
    zone: 'water_services',
    model: 'Backwash holding tank',
    w: 4.5,
    d: 2.6,
    h: 2.4,
  },
  ...['Municipal', 'Tunnel', 'Reservoir', 'White Room', 'Slide Atrium'].map(
    (name, i): Machine => ({
      id: `ahu-${i}`,
      label: `${name} AHU`,
      zone: 'air',
      model: 'Pool hall air handling unit',
      w: 4.6,
      d: 1.4,
      h: 2.8,
    }),
  ),
  {
    id: 'extract',
    label: 'Changing village extract fan',
    zone: 'air',
    model: 'Changing area extract fan',
    w: 1.4,
    d: 0.8,
    h: 1.4,
  },
  {
    id: 'bms',
    label: 'BMS outstation',
    zone: 'control',
    w: 0.62,
    d: 0.75,
    h: 0.78,
    proxy: true,
  },
  {
    id: 'desk',
    label: 'Control and alarm desk',
    zone: 'control',
    model: "Operator's desk, POOLMON",
    w: 1.3,
    d: 1.5,
    h: 1.4,
  },
  {
    id: 'engineer-desk',
    label: "Engineer's desk",
    zone: 'office',
    w: 1.6,
    d: 0.8,
    h: 0.75,
    proxy: true,
  },
];

const ZONES: {
  id: SharedZone;
  label: string;
  column: number;
  row: number;
  width: number;
  offsetX?: number;
}[] = [
  {
    id: 'utilities',
    label: 'UTILITIES INTAKE',
    column: 0,
    row: 0,
    width: 12,
    offsetX: 8,
  },
  {
    id: 'electrical',
    label: 'ELECTRICAL SWITCH ROOM',
    column: 1,
    row: 0,
    width: 13,
  },
  { id: 'boilers', label: 'BOILER HOUSE', column: 2, row: 0, width: 15 },
  {
    id: 'loading_bay',
    label: 'CHEMICAL LOADING BAY',
    column: 0,
    row: 1,
    width: 8,
  },
  {
    id: 'chemicals',
    label: 'CHEMICAL STORE',
    column: 0,
    row: 1,
    width: 12,
    offsetX: 8,
  },
  { id: 'office', label: "ENGINEER'S OFFICE", column: 1, row: 1, width: 13 },
  { id: 'control', label: 'CONTROL ROOM', column: 2, row: 1, width: 15 },
  { id: 'balance', label: 'BALANCE-TANK HALL', column: 0, row: 2, width: 12 },
  {
    id: 'water_services',
    label: 'MAKE-UP / BACKWASH',
    column: 1,
    row: 2,
    width: 13,
  },
  { id: 'air', label: 'AIR HANDLING PLANT', column: 2, row: 2, width: 15 },
];
const CLEAR = 1; // clear around each footprint
const GAP = 2; // clear spine between zones
export function makeSharedPlantLayout() {
  const plans = ZONES.map((z) => {
    const machines = SHARED_MACHINES.filter((m) => m.zone === z.id);
    let cursorX = 1.5,
      cursorZ = 2.5,
      rowDepth = 0;
    const placed: PlacedMachine[] = [];
    for (const machine of machines) {
      const aw = machine.w + 2 * CLEAR,
        ad = machine.d + 2 * CLEAR;
      if (cursorX + aw > z.width - 0.5 && cursorX > 1.5) {
        cursorX = 1.5;
        cursorZ += rowDepth + 1;
        rowDepth = 0;
      }
      placed.push({
        ...machine,
        x: cursorX + aw / 2,
        z: cursorZ + ad / 2,
        allowance: { w: aw, d: ad },
      });
      cursorX += aw + 0.5;
      rowDepth = Math.max(rowDepth, ad);
    }
    return {
      ...z,
      w: z.width,
      d: Math.ceil(cursorZ + rowDepth + 1),
      machines: placed,
    };
  });
  const rowHeights = [0, 1, 2].map((row) =>
    Math.max(...plans.filter((z) => z.row === row).map((z) => z.d)),
  );
  const colWidths = [0, 1, 2].map((col) =>
    Math.max(
      ...plans
        .filter((z) => z.column === col)
        .map((z) => z.w + (z.offsetX ?? 0)),
    ),
  );
  const zones: ZonePlan[] = plans.map((z) => ({
    id: z.id,
    label: z.label,
    w: z.w,
    d: z.d,
    x:
      colWidths.slice(0, z.column).reduce((a, b) => a + b, 0) +
      z.column * GAP +
      (z.offsetX ?? 0),
    z:
      rowHeights.slice(0, z.row).reduce((a, b) => a + b, 0) +
      z.row * GAP +
      (z.id === 'office' ? (rowHeights[z.row] - z.d) / 2 : 0),
    machines: z.machines.map((m) => ({
      ...m,
      x:
        m.x +
        colWidths.slice(0, z.column).reduce((a, b) => a + b, 0) +
        z.column * GAP +
        (z.offsetX ?? 0),
      z:
        m.z +
        rowHeights.slice(0, z.row).reduce((a, b) => a + b, 0) +
        z.row * GAP +
        (z.id === 'office' ? (rowHeights[z.row] - z.d) / 2 : 0),
    })),
  }));
  const width = colWidths.reduce((a, b) => a + b, 0) + 2 * GAP;
  const depth = rowHeights.reduce((a, b) => a + b, 0) + 2 * GAP;
  return {
    zones,
    width,
    depth,
    area: width * depth,
    equipmentArea: SHARED_MACHINES.reduce((a, m) => a + m.w * m.d, 0),
    zoneArea: zones.reduce((a, z) => a + z.w * z.d, 0),
  };
}

/** Walking height on the perimeter gantry and its south-west access stair, metres. */
export function sharedGantryFloor(
  width: number,
  depth: number,
  x: number,
  z: number,
  previousY = 0,
): number {
  const onRing =
    x >= -3 &&
    x <= width + 3 &&
    z >= -3 &&
    z <= depth + 3 &&
    !(x > 0 && x < width && z > 0 && z < depth);
  if (onRing) return previousY >= 4.5 ? 6 : 0;
  if (x >= -2.5 && x <= -0.5 && z > depth + 3 && z <= depth + 12)
    return (6 * (depth + 12 - z)) / 9;
  return 0;
}
