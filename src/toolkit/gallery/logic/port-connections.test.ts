import { BEING_LAID_OUT } from './room-pipes';
import { describe, expect, it } from 'vite-plus/test';
import { EQUIPPED_ROOMS, layoutRoom } from './room-equipment';
import { machinePorts, placedPort } from './machine-ports';
import type { MachinePort } from './machine-ports';
import { roomPipes } from './room-pipes';
import { roomServiceRoutes } from './room-services';
import { cabinetPipes, cabinetPortsInRoom } from './cabinet-pipes';
import { airBox, airDucts } from './air-plant';

/**
 * Every machine's every port, connected: some run ends exactly on it, of
 * the right kind of pipe for what the port carries, leaving it along the
 * port's own direction. One check for every room, so a port that is moved,
 * a run that is rerouted or a machine that is turned cannot quietly come
 * adrift.
 */

type V = readonly [number, number, number];
interface AnyRun {
  name: string;
  kind: string;
  points: readonly V[];
}

/** The kinds of pipe each service may be carried in. */
const KINDS: Record<MachinePort['service'], readonly string[]> = {
  'pool-water': ['pvc-pressure'],
  drain: ['pvc-drain', 'pvc-pressure'],
  'make-up': ['copper'],
  heating: ['lagged-heating', 'copper'],
  ozone: ['stainless'],
  sample: ['chemical-tube'],
  chemical: ['chemical-tube'],
  power: ['steel-screwed'],
  gas: ['steel-screwed'],
  flue: ['flue'],
  'hot-water': ['copper'],
  air: ['duct'],
  // A control port, by the room's control bus's stub (`control-bus.ts`).
  control: ['steel-screwed'],
};

/** Within this angle of the port's direction, its run leaves it. */
const ANGLE = (5 * Math.PI) / 180;
const near = (a: V, b: V) =>
  [0, 1, 2].every((k) => Math.abs(a[k] - b[k]) < 1e-3);

/** Every run in a room, whoever routed it. */
function runsIn(room: string): AnyRun[] {
  return [
    ...roomPipes(room),
    ...cabinetPipes(room),
    ...roomServiceRoutes(room).filter((r) => r.kind !== 'rectangular-duct'),
    // The air plant's ducts (`air-plant.ts`).
    ...(room === 'air_plant'
      ? airDucts(layoutRoom(room)!.placed, airBox()).map((d) => ({
          name: d.name,
          kind: 'duct',
          points: d.points,
        }))
      : []),
  ];
}

/** A run ending on `at`, and the way it leaves (from there to its next point). */
function endingAt(runs: readonly AnyRun[], at: V) {
  const found: { run: AnyRun; leaving: V }[] = [];
  for (const run of runs) {
    const pts = run.points;
    for (const [end, next] of [
      [0, 1],
      [pts.length - 1, pts.length - 2],
    ] as const) {
      if (!near(pts[end], at)) continue;
      // The first point that differs: a zero-length start is skipped.
      let k = next;
      const step = next > end ? 1 : -1;
      while (k >= 0 && k < pts.length && near(pts[k], pts[end])) k += step;
      if (k < 0 || k >= pts.length) continue;
      const d = [0, 1, 2].map((i) => pts[k][i] - pts[end][i]);
      const length = Math.hypot(d[0], d[1], d[2]);
      found.push({
        run,
        leaving: [d[0] / length, d[1] / length, d[2] / length],
      });
    }
  }
  return found;
}

/** Each room's ports, in the room's frame. */
function portsIn(room: string) {
  const layout = layoutRoom(room);
  if (!layout) return [];
  const ports = layout.placed.flatMap((p) =>
    machinePorts(p.item).map((port) => ({
      machine: p.item.label,
      ...placedPort(p, port.name),
      service: port.service,
      kinds: KINDS[port.service],
    })),
  );
  const cabinet = cabinetPortsInRoom(room).map((port) => ({
    machine: 'cabinet',
    name: port.name,
    at: port.at,
    outward: port.outward,
    service: port.service,
    kinds: [port.kind] as readonly string[],
  }));
  return [...ports, ...cabinet];
}

/** The rooms whose pipework is laid out, so every port must be connected. */
const PIPED = [
  'air_plant',
  'boiler_house',
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'wet_hall',
];

describe.each(PIPED.filter((r) => !BEING_LAID_OUT.includes(r)))(
  '%s: every port connected',
  (room) => {
    const runs = runsIn(room);
    it.each(
      portsIn(room)
        .filter((p) => p.kinds.length > 0)
        .map((p) => [`${p.machine}: ${p.name}`, p] as const),
    )('%s', (_, port) => {
      const ends = endingAt(runs, port.at);
      expect(ends.length, 'a run ends on it').toBeGreaterThan(0);
      const right = ends.filter((e) => port.kinds.includes(e.run.kind));
      expect(
        right.map((e) => e.run.kind),
        `of the right kind (${port.kinds.join(' or ')}); found ${ends.map((e) => `${e.run.name}: ${e.run.kind}`).join(', ')}`,
      ).not.toEqual([]);
      const along = right.some(
        (e) =>
          e.leaving[0] * port.outward[0] +
            e.leaving[1] * port.outward[1] +
            e.leaving[2] * port.outward[2] >=
          Math.cos(ANGLE),
      );
      expect(along, 'leaving along the port’s direction').toBe(true);
    });
  },
);

/**
 * The rooms not yet piped: their unconnected ports, listed, so the work
 * left is plain. Not a failure, for now.
 */
describe('ports still to connect', () => {
  it('are listed room by room', () => {
    const left: string[] = [];
    for (const room of EQUIPPED_ROOMS.filter((r) => !PIPED.includes(r))) {
      const runs = runsIn(room);
      for (const p of portsIn(room))
        if (!endingAt(runs, p.at).length)
          left.push(`${room}: ${p.machine}: ${p.name}`);
    }
    console.log(
      `Ports still to connect (${left.length}):\n  ${left.join('\n  ')}`,
    );
    expect(Array.isArray(left)).toBe(true);
  });
});
