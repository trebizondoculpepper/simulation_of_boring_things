import {
  ACID_PORTS,
  HYPO_PORTS,
} from '../../components/plant/logic/dosing-boards';
import { BACKWASH_PIT } from '../../../game/plant/wet-hall';
import {
  DAY_TANKS,
  dayTankSize,
} from '../../../game/plant/chemical-distribution';
import {
  bottleBund,
  bottleSize,
  isDoseBottle,
} from '../../../game/plant/dose-bottle';
import { WET_HALL_LAYOUT } from './shell-rooms';
import { OT216_SIZE } from '../../components/industrial-control/logic/ot216-terminal';

/** The OT-216's scale over its design size (its view's `OT216_SCALE`). */
const TERMINAL_SCALE = OT216_SIZE.w / 0.2;
import { spaSandFilterGeometry } from '../../components/plant/logic/spa-sand-filter';
import { SPA_FILTERS } from '../../../game/plant/spa-filter';
import {
  FILTER_CENTRE_Z,
  NOZZLE_REACH,
  sandFilterGeometry,
} from '../../components/plant/logic/sand-filter';
import type { Nozzle } from '../../components/plant/logic/sand-filter';
import type { Item, Placed } from './room-equipment';
import { stackOf, stackPorts } from './air-plant';
import {
  PAIR_DISCHARGE_X,
  PAIR_STRAINER_X,
} from '../../components/plant/logic/pump-pair';
import { PIT_DISCHARGE } from '../../components/plant/views/backwash-pit';
import {
  BOOSTER,
  BOOSTER_CONTROL,
  BREAK_TANK_OUTLET,
  FLOWMETER,
  METER,
} from '../../components/plant/logic/booster-set';

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
    | 'power'
    | 'gas'
    | 'flue'
    | 'hot-water'
    | 'air'
    | 'control';
  /** Its machine's model draws this connection itself, so no nozzle is added. */
  drawn?: boolean;
}

const port = (
  name: string,
  at: MachinePort['at'],
  outward: MachinePort['outward'],
  od: number,
  service: MachinePort['service'],
): MachinePort => ({ name, at, outward, od, service });

/**
 * A sectional tank's frame, as the tank helper builds it (`createTank`):
 * whole 1 m panels, set back by half its ladder's depth when it has one,
 * their flanges 0.05 m proud; on bearers 0.25 m high.
 */
export function tankFrame(item: Pick<Item, 'w' | 'd' | 'h'>) {
  const ny = Math.max(1, Math.floor(item.h - 0.35 + 1e-6));
  const ladder = ny >= 2 ? 0.7 : 0;
  const nx = Math.max(1, Math.floor(item.w - 0.1 + 1e-6));
  const nz = Math.max(1, Math.floor(item.d - 0.2 - ladder + 1e-6));
  const back = -ladder / 2;
  return {
    nx,
    ny,
    nz,
    back,
    front: back + nz / 2 + 0.05,
    north: back - nz / 2 - 0.05,
    top: 0.25 + ny + 0.05,
  };
}

/** Connection positions are also used by the view to draw each nozzle. */
export function machinePorts(item: Item): MachinePort[] {
  const [kind, arg] = item.key.split(':');
  // A spa cabinet's sand filter, outside it (the owner, 2026-10-25): its
  // unions either side, low, and its wash up out of its valve head.
  if (
    kind === 'sand-filter' &&
    (arg === 'spa-jacuzzi' || arg === 'spa-footSpa')
  ) {
    const g = spaSandFilterGeometry(
      SPA_FILTERS[arg === 'spa-jacuzzi' ? 'jacuzzi' : 'footSpa'],
    );
    return [
      port(
        'inlet',
        [-g.unionReach, g.unionY, 0],
        [-1, 0, 0],
        0.05,
        'pool-water',
      ),
      port(
        'outlet',
        [g.unionReach, g.unionY, 0],
        [1, 0, 0],
        0.05,
        'pool-water',
      ),
      port('waste', g.waste, [0, 0, -1], 0.05, 'drain'),
    ];
  }
  if (kind === 'sand-filter') {
    // A pressure filter's two process nozzles and its drain, each set on
    // the vessel's curved shell where it is (the room's model stands the
    // vessel 0.1 m forward of its own origin): the inlet to the top
    // distributor, high on the left; the outlet from the underdrain, low
    // in the middle; the drain, low on the right. Backwashing reverses the
    // flow through the same two, by the valves in the room's face
    // pipework. Staggered, so no nozzle's pipe crosses another's.
    // From the filter's one geometry (`sandFilterGeometry`), its flanges,
    // the vessel stood 0.1 m forward of the model's own origin.
    const g = sandFilterGeometry(Number(arg));
    // Radial: each nozzle normal to the shell where it leaves it, its
    // flange as far out along that radius as a square one's stands.
    const radial = item.nozzles === 'radial';
    const out = (n: Nozzle): [number, number, number] => {
      if (!radial) return [0, 0, 1];
      const z = Math.sqrt(g.r * g.r - n.x * n.x);
      return [n.x / g.r, 0, z / g.r];
    };
    const at = (n: Nozzle): [number, number, number] => {
      if (!radial) return [n.x, n.y, n.flange + 0.1];
      const [ux, , uz] = out(n);
      const reach = g.r + NOZZLE_REACH;
      return [ux * reach, n.y, FILTER_CENTRE_Z + uz * reach + 0.1];
    };
    return [
      port('inlet', at(g.inlet), out(g.inlet), g.inlet.od, 'pool-water'),
      port('outlet', at(g.outlet), out(g.outlet), g.outlet.od, 'pool-water'),
      port('drain', at(g.drain), out(g.drain), g.drain.od, 'drain'),
    ];
  }
  if (
    kind === 'balance-tank' ||
    kind === 'break-tank' ||
    kind === 'backwash-tank'
  ) {
    const { nx, nz, back, front, north, top } = tankFrame(item);
    const east = nx / 2 + 0.05;
    if (kind === 'break-tank')
      // The make-up's Category 5 break tank (`wet-hall.ts`): the main in
      // through its roof to the float valve over the air gap; its outlet
      // to the booster set low on its east end; its weir overflow, the
      // warning pipe, high on its west end; its drain on its face.
      return [
        // Its inlet square down through the middle of its roof, never its
        // side: the float valve inside over the air gap (the owner,
        // 2026-10-26).
        port(
          'mainsIn',
          [nx / 2 - 0.6, top, (back + front) / 2],
          [0, 1, 0],
          0.067,
          'make-up',
        ),
        // Its outlet low on its east end, at the booster set's suction
        // manifold's height, so the two line up (the owner, 2026-10-26).
        port(
          'outlet',
          [east, BREAK_TANK_OUTLET.y, back + nz / 2 - BREAK_TANK_OUTLET.in],
          [1, 0, 0],
          0.089,
          'make-up',
        ),
        port('overflow', [-east, top - 0.35, back], [-1, 0, 0], 0.11, 'drain'),
        // Its drain low on its east end, the booster set's side, toward
        // its front, falling straight to the gully beyond it (the owner,
        // 2026-10-26: a smoother run out of the tank).
        port('drain', [east, 0.3, front - 0.15], [1, 0, 0], 0.09, 'drain'),
      ];
    if (kind === 'backwash-tank' && item.pit) {
      // The wet hall's backwash pit (prompt 036), about its opening's
      // middle (its footprint shifted east for its davit): the backwash
      // in down through its gratings at its west end, over its water (an
      // air break); its pump's discharge riser up out of its sump through
      // a sleeve in its gratings just west of its hatch, not through the
      // hatch's lid (the owner, 2026-10-26: its stub showed on the lid).
      // No gravity drain or overflow: it is emptied by its pump. Both its
      // ports stand up 150 mm through its gratings, flanged stubs from
      // below, so a pipe meets each clear of the floor.
      const P = BACKWASH_PIT;
      const ox = -WET_HALL_LAYOUT.pitDavitShift;
      // Its header's middle, between its two risers.
      const hz = P.width / 2 - 0.6;
      return [
        port(
          'inlet',
          [ox - P.length / 2 + 1.2, 0.15, 0],
          [0, 1, 0],
          0.16,
          'drain',
        ),
        // Its pump station's outlet, over the header joining its two
        // sump pumps' risers west of the hatch (`PIT_DISCHARGE`).
        {
          ...port(
            'discharge',
            [
              ox + PIT_DISCHARGE.x(P.length, P.hatch, P.sump.length),
              PIT_DISCHARGE.y,
              hz,
            ],
            [0, 1, 0],
            0.11,
            'drain',
          ),
          drawn: true,
        },
      ];
    }
    if (kind === 'backwash-tank')
      // The backwash holding tank: the backwash in through its roof; its
      // submersible pump's discharge riser up through the roof beside it,
      // to the foul sewer; its overflow high on its east end; its drain.
      return [
        // Clear of its ladder's cage, at its west end.
        port('inlet', [0, top, back], [0, 1, 0], 0.16, 'drain'),
        port('discharge', [nx / 4, top, back], [0, 1, 0], 0.076, 'drain'),
        port('overflow', [east, top - 0.35, back], [1, 0, 0], 0.16, 'drain'),
        port('drain', [nx / 2 - 0.6, 0.35, front], [0, 0, 1], 0.09, 'drain'),
      ];
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
    // up its riser to the room's plumbing (and its valves).
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
        // Its supply into the cable gland on top of its motor's terminal
        // box (the box's top at 1.012 m, its middle 0.852 m along; the
        // gland 30 mm high).
        port(`power${k}`, [0.852, 1.042, z], [0, 1, 0], 0.0269, 'power'),
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
  if (kind === 'contact-tank') {
    // All on its front, toward the room: in low left, out high right, the
    // ozone's injector in the middle. Up to 2 m it is the ozone room's own
    // contact tank, flat-fronted; larger, an upright round vessel
    // (`createTank`, Ø = the smaller side less 0.1 m), each nozzle set on
    // its curved shell, 0.1 m proud of it.
    const round = item.w > 2.05;
    const r = (Math.min(item.w, item.d) - 0.1) / 2;
    const front = (x: number) =>
      round ? Math.sqrt(r * r - x * x) + 0.1 : item.d / 2;
    const side = round ? r * 0.5 : item.w * 0.25;
    return [
      port('inlet', [-side, 0.6, front(-side)], [0, 0, 1], 0.16, 'pool-water'),
      // Out high, on the shell below its dome (2.32 m on the ozone room's).
      port(
        'outlet',
        [side, round ? 2.4 : 2.0, front(side)],
        [0, 0, 1],
        0.16,
        'pool-water',
      ),
      port('ozone', [0, 1.0, front(0)], [0, 0, 1], 0.05, 'ozone'),
    ];
  }
  if (kind === 'ozone-generator')
    return [
      // Its ozone out of its top, at the end away from its power entry.
      port(
        'ozoneOut',
        [-item.w / 2 + 0.3, item.h, 0],
        [0, 1, 0],
        0.05,
        'ozone',
      ),
      port('power', [item.w / 2 - 0.3, item.h, 0], [0, 1, 0], 0.0269, 'power'),
    ];
  if (kind === 'dosing-controller')
    return [port('sample', [0, 0, item.d], [0, 0, 1], 0.012, 'sample')];
  // Each dosing board where its own pipework ends (`HYPO_PORTS`,
  // `ACID_PORTS`; the owner, 2026-10-28: the pipes did not meet them): its
  // suction in at its top edge, from its day tank's line overhead; its dose
  // out of its face at its foot, then down to its injection point.
  if (kind === 'hypo-pumps')
    return [
      port('dose', [...HYPO_PORTS.dose], [0, 0, 1], 0.012, 'chemical'),
      port('supply', [...HYPO_PORTS.supply], [0, 1, 0], 0.012, 'chemical'),
    ];
  if (kind === 'acid-pump')
    return [
      port('dose', [...ACID_PORTS.dose], [0, 0, 1], 0.012, 'chemical'),
      port('supply', [...ACID_PORTS.supply], [0, 1, 0], 0.012, 'chemical'),
    ];
  if (kind === 'chem-day') {
    // A plant room's day tank (plan 085). A dose bottle (`createDoseBottle`):
    // its fill socket's stub up out of its lid, and its dosing tube's end
    // beside it, low; both drawn by the bottle. (The Olympic's framed
    // 1,000 l has its own riser and draw-off.)
    const litres =
      DAY_TANKS[arg as 'hypochlorite' | 'acid']?.find(
        (t) => t.site === item.key.split(':')[2],
      )?.litres ?? 0;
    if (!isDoseBottle(litres)) {
      // The framed tank's station (`createDayTankStation`, centred): its
      // inlet riser's end and its draw-off's end, both at the back, high.
      const { L, W, H } = dayTankSize(litres);
      const bd = W + 0.6;
      const riser = Math.max(1.65, 0.04 + 0.12 + H + 0.5);
      const back = -bd / 2 - 0.1 - 0.05;
      return [
        {
          ...port('fill', [-0.05, riser, back], [0, 0, -1], 0.04, 'chemical'),
          drawn: true,
        },
        {
          ...port(
            'out',
            [(L + 0.4) / 2 - 0.1, riser - 0.15, back],
            [0, 0, -1],
            0.024,
            'chemical',
          ),
          drawn: true,
        },
      ];
    }
    const { d, h } = bottleSize(litres);
    const { sump } = bottleBund(litres);
    const r = d / 2;
    const top = sump + h;
    const hz = Math.min(0, r - 0.15 / 2 - 0.01);
    const fillX = Math.max(0.2 / 2 + 0.035, r * 0.55);
    const fillZ = -Math.min(r * 0.45, 0.06);
    return [
      {
        ...port(
          'fill',
          [fillX, top + 0.16, fillZ],
          [0, 1, 0],
          0.024,
          'chemical',
        ),
        drawn: true,
      },
      {
        ...port(
          'out',
          [-0.1 - 0.016, top + 0.065, hz],
          [-1, 0, 0],
          0.008,
          'chemical',
        ),
        drawn: true,
      },
    ];
  }
  if (kind === 'spa-pack' || kind === 'jacuzzi-pack')
    // A packaged spa cabinet's dosing inlets on its top, at the front, clear
    // of its jets' discharge at the back: its
    // day tanks' dosing tubes come in here to its own dosing.
    return [
      port(
        'hypochlorite',
        [item.w / 2 - 0.15, item.h, item.d / 2 - 0.15],
        [0, 1, 0],
        0.012,
        'chemical',
      ),
      port(
        'acid',
        [item.w / 2 - 0.3, item.h, item.d / 2 - 0.15],
        [0, 1, 0],
        0.012,
        'chemical',
      ),
    ];
  if (kind === 'chem-bulk')
    // A store's framed bulk tank (`createFramedChemicalTank`, 2.3 × 1.15 m,
    // set 0.2 m back on its footprint): its draw-off, out of its outlet
    // valve and turned to its left, low.
    return [
      {
        ...port('out', [-1.1, 0.3, 0.755], [-1, 0, 0], 0.06, 'chemical'),
        drawn: true,
      },
      // Its fill, from the fill point: the end of its fill line, down the
      // front to its inlet valve (`fillAt`).
      {
        ...port('fill', [0.85, 0.45, 0.575], [0, 0, 1], 0.06, 'chemical'),
        drawn: true,
      },
    ];
  if (kind === 'chem-pump')
    // A store's transfer skid (`createTransferPumpSkid`): its suction
    // header's free end, low at the front; its discharge main's, high at
    // the back.
    return [
      {
        ...port('in', [-0.7, 0.31, 0.32], [-1, 0, 0], 0.056, 'chemical'),
        drawn: true,
      },
      // A tee on the suction header from above for each bulk tank.
      ...[1, 2, 3].map((k) => ({
        ...port(
          `in-${k}`,
          [-0.5 + 0.4 * (k - 1), 0.34, 0.32],
          [0, 1, 0],
          0.05,
          'chemical',
        ),
        drawn: true,
      })),
      {
        ...port('out', [0.7, 0.88, -0.35], [1, 0, 0], 0.056, 'chemical'),
        drawn: true,
      },
    ];
  if (kind === 'fill-cabinet')
    // The delivery fill cabinet (`createFillCabinet`, its `FILL_CABINET`):
    // both lines up out of its top, each through its port's isolating
    // valve and non-return valve on its riser (plan 085), the acid's then
    // back through the wall behind it.
    return [
      {
        ...port(
          'hypochlorite',
          [-0.17, 0.45, 0.12],
          [0, 1, 0],
          0.05,
          'chemical',
        ),
        drawn: true,
      },
      {
        ...port('acid', [0.17, 0.45, 0.12], [0, 1, 0], 0.04, 'chemical'),
        drawn: true,
      },
    ];
  if (kind === 'chem-selector')
    // The transfer selector (`createTransferSelector`, six outlets at
    // 0.32 m, its header 0.75 m up along x): its main dropping in from
    // above at the header's feed end, each live outlet up out of its riser's top at 1.75 m.
    return [
      {
        ...port('in', [-1.31, 0.75, 0], [0, 1, 0], 0.064, 'chemical'),
        drawn: true,
      },
      ...[1, 2, 3, 4].map((r) => ({
        ...port(
          `outlet-${r}`,
          [-0.8 + (r - 1) * 0.32, 1.75, 0],
          [0, 1, 0],
          0.044,
          'chemical',
        ),
        drawn: true,
      })),
    ];
  if (kind === 'pump-panel')
    return [port('supply', [0, item.h, 0], [0, 1, 0], 0.05, 'power')];
  if (kind === 'chem-terminal')
    // An OT-216 terminal (prompt 091): its serial cable out of its one
    // gland underneath, in its conduit, down to where it turns away.
    return [
      {
        ...port(
          'data',
          // On the wall's conduit saddles, 35 mm out (its gland 30 mm).
          [0.06 * TERMINAL_SCALE, -0.204 * TERMINAL_SCALE, 0.035],
          [0, -1, 0],
          0.02,
          'control',
        ),
        drawn: true,
      },
    ];
  if (kind === 'chem-control-box')
    // The chemical transfer control box (`chem-control-box.ts`'s
    // `BOX_GLANDS`): the two terminals' serial cables' glands underneath
    // (its supply drops into its top; its field wiring is not drawn).
    return [
      ['data-hypochlorite', -0.2, 'control'],
      ['data-acid', -0.1, 'control'],
    ].map(([name, x, service]) => ({
      ...port(
        name as string,
        [x as number, -item.h / 2 - 0.016, 0.1],
        [0, -1, 0],
        0.02,
        service as MachinePort['service'],
      ),
      drawn: true,
    }));
  if (kind === 'boiler-cascade') {
    // Two condensing boilers on a plinth (`createBoilerCascade`): each a
    // body 0.8 × 0.657 × 1.662 m standing 0.1 m up and 0.1 m forward,
    // 0.25 m apart, its connections on top at the back (the model's own):
    // the flue spigot (Ø250) and the gas (R2), A on the left, B on the right.
    const W = 0.8,
      D = 0.657,
      H = 1.662;
    const back = 0.1 - D / 2;
    return (
      [
        ['A', -(W + 0.25) / 2],
        ['B', (W + 0.25) / 2],
      ] as const
    ).flatMap(([k, x]) => [
      {
        ...port(
          `flue${k}`,
          [x, 0.1 + H + 0.14, back + 0.2],
          [0, 1, 0],
          0.25,
          'flue',
        ),
        drawn: true,
      },
      // The LTHW flow and return (DN65), either side of the flue.
      {
        ...port(
          `flow${k}`,
          [x - 0.27, 0.1 + H + 0.12, back + 0.12],
          [0, 1, 0],
          0.0761,
          'heating',
        ),
        drawn: true,
      },
      {
        ...port(
          `return${k}`,
          [x + 0.27, 0.1 + H + 0.12, back + 0.12],
          [0, 1, 0],
          0.0761,
          'heating',
        ),
        drawn: true,
      },
      {
        ...port(
          `gas${k}`,
          [x + 0.2, 0.1 + H + 0.1, back + 0.28],
          [0, 1, 0],
          0.0603,
          'gas',
        ),
        drawn: true,
      },
      // Its power, by a gland in its back, under the connections on top.
      port(`power${k}`, [x - 0.1, 1.4, back], [0, 0, -1], 0.0269, 'power'),
    ]);
  }
  if (kind === 'low-loss-header') {
    // A vertical DN200 header (`createLowLossHeader`), its DN80 flanges
    // 0.32 m out each side: the boilers' flow (high) and return (low) on
    // +x, the system's on -x.
    const out = 0.2191 / 2 + 0.32;
    const flange = (name: string, side: 1 | -1, y: number) => ({
      ...port(name, [side * out, y, 0], [side, 0, 0], 0.0889, 'heating'),
      drawn: true,
    });
    return [
      flange('boilerFlow', 1, 1.3),
      flange('boilerReturn', 1, 0.65),
      flange('systemFlow', -1, 1.3),
      flange('systemReturn', -1, 0.65),
    ];
  }
  if (kind === 'lthw-pumps')
    // The twin-head circulator's run of DN65 (`createTwinHeadPump`): in at
    // -x, out at +x, 0.75 m up.
    return [
      {
        ...port('suction', [-0.75, 0.75, 0], [-1, 0, 0], 0.0761, 'heating'),
        drawn: true,
      },
      {
        ...port('discharge', [0.75, 0.75, 0], [1, 0, 0], 0.0761, 'heating'),
        drawn: true,
      },
      // Each head's power into the top of its control box, the heads
      // tilted out to either side.
      port('powerA', [0, 0.84, -0.23], [0, 1, 0], 0.0269, 'power'),
      port('powerB', [0, 0.84, 0.23], [0, 1, 0], 0.0269, 'power'),
    ];
  if (kind === 'pressurisation')
    // The pressurisation unit's copper fill to the system, up at its side,
    // and its power into the top of its cabinet (`createPressurisation`).
    return [
      {
        ...port('system', [0.55, 1.5, 0], [0, 1, 0], 0.022, 'heating'),
        drawn: true,
      },
      port('power', [0.32, 1.004, 0], [0, 1, 0], 0.0269, 'power'),
    ];
  if (kind === 'calorifier') {
    // `createCalorifier`: Ø1000, 1.85 m tall. The LTHW coil's flanged
    // flow and return on +x; the cold feed and secondary return on -x;
    // the hot draw-off on top.
    const R = 0.5,
      H = 1.85;
    return [
      {
        ...port(
          'primaryFlow',
          [R + 0.3, 0.85, 0],
          [1, 0, 0],
          0.0603,
          'heating',
        ),
        drawn: true,
      },
      {
        ...port(
          'primaryReturn',
          [R + 0.3, 0.55, 0],
          [1, 0, 0],
          0.0603,
          'heating',
        ),
        drawn: true,
      },
      {
        ...port('coldFeed', [-R - 0.3, 0.4, 0], [-1, 0, 0], 0.054, 'make-up'),
        drawn: true,
      },
      {
        ...port('hotFlow', [0, H + 0.4, 0], [0, 1, 0], 0.054, 'hot-water'),
        drawn: true,
      },
      {
        ...port(
          'secondaryReturn',
          [-R - 0.3, 1.2, 0],
          [-1, 0, 0],
          0.034,
          'hot-water',
        ),
        drawn: true,
      },
    ];
  }
  if (kind === 'ahu-stack') {
    // A stack of air handling units (`air-plant.ts`): four duct spigots
    // on each unit's ends, drawn by its model.
    const stack = stackOf(item.key);
    return (stack ? stackPorts(stack) : []).map((p) => ({
      ...port(p.name, p.at, p.outward, p.w, 'air'),
      drawn: true,
    }));
  }
  if (kind === 'booster-set')
    // The make-up booster set (`createBoosterSet`): its suction manifold
    // in at its west end, low across its front; its discharge manifold
    // out at its east end, low across its back. Drawn by its model.
    return [
      {
        ...port(
          'suction',
          [-BOOSTER.w / 2, BOOSTER.manifoldY, BOOSTER.suctionZ],
          [-1, 0, 0],
          0.089,
          'make-up',
        ),
        drawn: true,
      },
      {
        ...port(
          'discharge',
          [BOOSTER.w / 2, BOOSTER.manifoldY, BOOSTER.dischargeZ],
          [1, 0, 0],
          0.076,
          'make-up',
        ),
        drawn: true,
      },
      // Its control port: the gland on top of its control unit (the
      // owner, 2026-10-26), its status to the mimic.
      {
        ...port('status', BOOSTER_CONTROL, [0, 1, 0], 0.02, 'control'),
        drawn: true,
      },
    ];
  if (kind === 'water-meter')
    // The utility's meter's run, flanged at both ends (`createWaterMeter`):
    // read by its dial, not wired into.
    return (['inlet', 'outlet'] as const).map((name, i) => ({
      ...port(
        name,
        [(i ? 1 : -1) * METER.half, METER.y, 0],
        [i ? 1 : -1, 0, 0],
        0.06,
        'make-up',
      ),
      drawn: true,
    }));
  if (kind === 'make-up-flowmeter')
    // Our own flowmeter's run (`createMakeUpFlowmeter`), and its
    // converter's cable gland on top of its head.
    return [
      ...(['inlet', 'outlet'] as const).map((name, i) => ({
        ...port(
          name,
          [(i ? 1 : -1) * FLOWMETER.half, METER.y, 0],
          [i ? 1 : -1, 0, 0],
          0.076,
          'make-up',
        ),
        drawn: true,
      })),
      {
        ...port(
          'power',
          [0, METER.y + FLOWMETER.gland, 0],
          [0, 1, 0],
          0.0269,
          'power',
        ),
        drawn: true,
      },
    ];
  if (kind === 'gas-train')
    // In from the floor at its left, out at the top of its right
    // (`createGasTrain`), DN50.
    return [
      {
        ...port('inlet', [-1.0, 0, 0], [0, -1, 0], 0.0603, 'gas'),
        drawn: true,
      },
      {
        ...port('outlet', [1.0, 1.6, 0], [0, 1, 0], 0.0603, 'gas'),
        drawn: true,
      },
    ];
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
