import type { Item, Placed } from './room-equipment';
import {
  PAIR_DISCHARGE_X,
  PAIR_STRAINER_X,
} from '../../components/plant/logic/pump-pair';

/** A physical connection on a machine, in its own metre frame. */
export interface MachinePort {
  name: string;
  at: readonly [number, number, number];
  outward: readonly [number, number, number];
  od: number;
  service:
    | 'pool-water'
    | 'drain'
    | 'make-up'
    | 'heating'
    | 'ozone'
    | 'sample'
    | 'chemical'
    | 'power';
}

const port = (
  name: string,
  at: MachinePort['at'],
  outward: MachinePort['outward'],
  od: number,
  service: MachinePort['service'],
): MachinePort => ({ name, at, outward, od, service });

/** Connection positions are also used by the view to draw each nozzle. */
export function machinePorts(item: Item): MachinePort[] {
  const [kind, arg] = item.key.split(':');
  if (kind === 'sand-filter') {
    // A pressure filter's two process nozzles and its drain, each set on
    // the vessel's curved shell where it is (the room's model stands the
    // vessel 0.1 m forward of its own origin): the inlet to the top
    // distributor, high on the left; the outlet from the underdrain, low
    // in the middle; the drain, low on the right. Backwashing reverses the
    // flow through the same two, by the valves in the room's face
    // pipework. Staggered, so no nozzle's pipe crosses another's.
    const dia = Number(arg);
    const r = dia / 2;
    const shell = dia * 0.57;
    const cy = 0.3 + r * 0.35 + shell / 2;
    const zc = -0.35 + 0.1;
    // On the shell at `x`, the nozzle's flange 0.1 m proud of it; the
    // low two either side of the service hatch (0.22 m in radius, low in
    // the middle), clear of it.
    const side = Math.min(0.45, r * 0.7);
    const on = (x: number) => zc + Math.sqrt(r * r - x * x) + 0.1;
    const od = r >= 1 ? 0.225 : 0.09;
    const high = cy + shell / 2 - 0.15;
    const low = cy - shell / 2 + 0.15;
    return [
      port(
        'inlet',
        [-r * 0.55, high, on(-r * 0.55)],
        [0, 0, 1],
        od,
        'pool-water',
      ),
      port('outlet', [-side, low, on(-side)], [0, 0, 1], od, 'pool-water'),
      port('drain', [side, low, on(side)], [0, 0, 1], 0.09, 'drain'),
    ];
  }
  if (
    kind === 'balance-tank' ||
    kind === 'break-tank' ||
    kind === 'backwash-tank'
  ) {
    // The tank as the tank helper builds it (`createTank`): whole 1 m
    // panels, set back by half its ladder's depth when it has one, their
    // flanges 0.05 m proud; on bearers 0.25 m high.
    const ny = Math.max(1, Math.floor(item.h - 0.35 + 1e-6));
    const ladder = ny >= 2 ? 0.7 : 0;
    const nx = Math.max(1, Math.floor(item.w - 0.1 + 1e-6));
    const nz = Math.max(1, Math.floor(item.d - 0.2 - ladder + 1e-6));
    const back = -ladder / 2;
    const front = back + nz / 2 + 0.05;
    const north = back - nz / 2 - 0.05;
    const top = 0.25 + ny + 0.05;
    return [
      // The pool's water in high on its back, under its roof.
      port(
        'overflow',
        [-nx * 0.25, top - 0.3, north],
        [0, 0, -1],
        0.355,
        'pool-water',
      ),
      port(
        'mainDrain',
        [nx * 0.25, top - 0.3, north],
        [0, 0, -1],
        0.355,
        'pool-water',
      ),
      // The pumps' suction out through its floor, toward its west end and
      // its face, past its ladder, into a duct under the room's floor.
      port(
        'suction',
        [-nx / 2 + 1.5, 0.25, front - 0.4],
        [0, -1, 0],
        0.355,
        'pool-water',
      ),
      // The make-up in through its roof.
      port('makeUp', [nx / 2 - 1, top, back], [0, 1, 0], 0.054, 'make-up'),
      // Its drain, low on its face at its east end, to waste.
      port('drain', [nx / 2 - 0.6, 0.35, front], [0, 0, 1], 0.09, 'drain'),
    ];
  }
  if (kind === 'pump-pair') {
    // Two pump sets side by side, duty and standby (`createPumpPair`): each
    // draws through its strainer, whose inlet faces west, and discharges
    // up through its isolating valve's riser.
    const ports: MachinePort[] = [];
    for (const [z, k] of [
      [-0.75, 'A'],
      [0.75, 'B'],
    ] as const) {
      ports.push(
        port(
          `suction${k}`,
          [PAIR_STRAINER_X - 0.36, 0.53, z],
          [-1, 0, 0],
          0.225,
          'pool-water',
        ),
        port(
          `discharge${k}`,
          [PAIR_DISCHARGE_X, 1.75, z + 0.12],
          [0, 1, 0],
          0.16,
          'pool-water',
        ),
        // Its motor's terminal box, on top of the motor (the pump stands
        // 0.45 m along in its pair).
        port(`power${k}`, [0.9, 0.98, z], [0, 1, 0], 0.0269, 'power'),
      );
    }
    return ports;
  }
  if (kind === 'uv-unit')
    // The ends of its chamber's stubs, as the room's model (set back 0.3 m
    // in its exhibit) has them.
    return [
      port('inlet', [-0.8, 0.8, -0.3], [-1, 0, 0], 0.225, 'pool-water'),
      port('outlet', [0.8, 0.8, -0.3], [1, 0, 0], 0.225, 'pool-water'),
      // Its control box, on its stand at the front.
      port('power', [0.2, 1.45, 0.3], [0, 1, 0], 0.0269, 'power'),
    ];
  if (kind === 'heat-exchanger') {
    // Its four ports on its frame plate, out toward −x, where the room's
    // model (moved 0.4 m along in its exhibit) has their flanges.
    const x = -0.4 - 0.22;
    return [
      port('poolIn', [x, 0.22, 0.12], [-1, 0, 0], 0.11, 'pool-water'),
      port('poolOut', [x, 0.884, 0.12], [-1, 0, 0], 0.11, 'pool-water'),
      port('primaryFlow', [x, 0.884, -0.12], [-1, 0, 0], 0.114, 'heating'),
      port('primaryReturn', [x, 0.22, -0.12], [-1, 0, 0], 0.114, 'heating'),
    ];
  }
  if (kind === 'contact-tank')
    // All on its front, toward the room: in low left, out high right, the
    // ozone's injector in the middle.
    return [
      port(
        'inlet',
        [-item.w * 0.25, 0.6, item.d / 2],
        [0, 0, 1],
        0.16,
        'pool-water',
      ),
      port(
        'outlet',
        [item.w * 0.25, 2.4, item.d / 2],
        [0, 0, 1],
        0.16,
        'pool-water',
      ),
      port('ozone', [0, 1.0, item.d / 2], [0, 0, 1], 0.05, 'ozone'),
    ];
  if (kind === 'ozone-generator')
    return [
      port('ozoneOut', [0, 1.6, item.d / 2], [0, 0, 1], 0.05, 'ozone'),
      port('power', [item.w / 2 - 0.3, item.h, 0], [0, 1, 0], 0.0269, 'power'),
    ];
  if (kind === 'dosing-controller')
    return [port('sample', [0, 0, item.d], [0, 0, 1], 0.012, 'sample')];
  if (kind === 'hypo-pumps')
    return [
      port('dose', [0, 0, item.d], [0, 0, 1], 0.012, 'chemical'),
      // Its suction from the store's line, in at its top.
      port(
        'supply',
        [0.3, item.h / 2, item.d / 2],
        [0, 1, 0],
        0.012,
        'chemical',
      ),
    ];
  if (kind === 'acid-pump')
    return [
      port('dose', [0, 0, item.d], [0, 0, 1], 0.012, 'chemical'),
      port(
        'supply',
        [0.15, item.h / 2, item.d / 2],
        [0, 1, 0],
        0.012,
        'chemical',
      ),
    ];
  if (kind === 'pump-panel')
    return [port('supply', [0, item.h, 0], [0, 1, 0], 0.05, 'power')];
  return [];
}

/** A port turned and moved with its machine into the room's frame. */
export function placedPort(placed: Placed, name: string) {
  const p = machinePorts(placed.item).find(
    (candidate) => candidate.name === name,
  );
  if (!p) throw new Error(`Missing ${name} port on ${placed.item.key}`);
  const c = Math.cos(placed.yaw);
  const s = Math.sin(placed.yaw);
  const turn = ([x, y, z]: readonly [number, number, number]) =>
    [x * c + z * s, y, -x * s + z * c] as const;
  const [x, y, z] = turn(p.at);
  return {
    ...p,
    at: [placed.x + x, placed.y + y, placed.z + z] as const,
    outward: turn(p.outward),
  };
}
