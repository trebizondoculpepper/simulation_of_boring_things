import { solveNetwork } from '../sim/hydraulics';
import type { NetLink, NetNode } from '../sim/hydraulics';
import type { GlassInputs } from '../../toolkit/components/plant/logic/sight-glass';
import { WATERS, loseHeat, mix } from '../water/water-condition';
import type { WaterCondition } from '../water/water-condition';

/**
 * The ideal filter (the owner, 2026-10-25): one pressure sand filter model
 * for every filter in the plant, of any size and specification, tried
 * first on its own in an ideal rig (dev40) before the Olympic's battery and
 * the lounge's filters are moved onto it. It understands the basics:
 *
 * - **Dirt.** Filtering down through the bed, it captures the water's
 *   dirt, less well the more it holds (breakthrough near its capacity), the
 *   more it is fissured, and while it is still unsettled after a wash. Its
 *   dirt adds to its resistance: its pressure difference rises, its flow
 *   falls.
 * - **Fissuring.** Left loaded and unwashed, the bed cracks and channels
 *   (mud balls, fissures): water finds a way round the sand, so it filters
 *   worse and resists less. Only a proper backwash, lifting the bed fully,
 *   heals it.
 * - **Backwashing.** Up through the bed at its wash rate, the bed lifts and
 *   its dirt washes out to waste, murky at first, then clear; too gentle a
 *   backwash washes some out and heals nothing.
 * - **Rinsing.** After a backwash the bed is unsettled and lets fines
 *   through: a rinse down to waste settles it before it goes back into
 *   service.
 * - **Cleaning.** Maintenance (a chemical clean or new media) takes its dirt
 *   and fissures away, and puts back any sand it has lost.
 * - **Sand loss** (an option, off by default; the owner, 2026-10-28: "make
 *   it so our ideal filter model can have sand loss disabled"). With a
 *   filter's `sandLoss` on, a backwash rising faster than the bed's safe
 *   rate (`FILTER_PHYSICS.safeRiseRate`) expands it past its freeboard and
 *   carries sand to waste, in proportion to the excess. The bed is then
 *   shallower: less clean head, less room for dirt, and less depth to catch
 *   it with. Off, nothing is ever lost, as before; nothing in the game
 *   turns it on yet (dev51 keeps it off: "do what's simplest").
 *
 * Its rig: an ideal clean source and an ideal dirty one, each through its
 * own valve into a supply header; the five valves of a filter's face (V1
 * inlet, V2 outlet, V3 backwash in, V4 backwash out, V5 rinse); a clean
 * outlet (the return) and a dirty sink (waste). Every valve is a servo,
 * travelling to its command. Pure; metres of head, m³/h, kg of dirt, g/m³
 * of dirt in water, seconds.
 */

/**
 * A filter is its size alone (the owner, 2026-10-25): every filter is the
 * one model, and all else follows from its physical size and the ideal
 * filter's physics (`FILTER_PHYSICS`). It has no failure modes: it is only
 * its capability to filter.
 */
export interface IdealFilterSpec {
  /** The vessel's inside diameter, m. */
  diameter: number;
  /** Its sand bed's depth, m (`FILTER_PHYSICS.bedDepth` unless given). */
  bedDepth?: number;
  /** Whether a too-fierce backwash washes its sand away (off unless given). */
  sandLoss?: boolean;
}

/**
 * The ideal filter's physics: the same for every filter. Each constant is
 * per unit of the bed (its area or its volume), so a filter's figures follow
 * from its size. Rates after PWTAG's medium-rate filtration.
 */
export const FILTER_PHYSICS = {
  /** A standard sand bed's depth, m. */
  bedDepth: 1.0,
  /** Design filtration rate and backwash rate, m/h: flow over the bed's area. */
  filtrationRate: 25,
  backwashRate: 30,
  /** A clean bed's head loss at its design rate, m per m of bed depth. */
  cleanHeadPerDepth: 3,
  /** The dirt that doubles a bed's resistance, kg per m³ of sand; it is full at three times that. */
  dirtPerMedia: 1,
  capacityPerMedia: 3,
  /** The share of the water's dirt a sound, settled, unloaded bed keeps. */
  capture: 0.97,
  /** Fines a just-lifted bed lets through, g/m³. */
  fines: 30,
  /** Time constants, s: a rinse settling the bed at design rate; a backwash washing out dirt, and healing fissures, at full wash rate. */
  rinseTime: 90,
  washTime: 60,
  healTime: 120,
  /** A bed loaded to its dirt reference, unwashed, fissures about half-way in this long, s. */
  fissureTime: 4 * 86400,
  /** The bed lifts at this share of its wash flow, upwards; fissures heal only from this share. */
  liftShare: 0.5,
  healShare: 0.8,
  /**
   * Sand loss (when a filter's `sandLoss` is on): the fastest a backwash
   * may rise, m/h, before the bed expands past its freeboard (sand of
   * 0.5–1 mm, its wash rate 30 m/h); above it, the share of the bed lost a
   * second for each share the rate is over, and the least of it left.
   */
  safeRiseRate: 40,
  sandLossRate: 1 / 600,
  leastSand: 0.2,
} as const;

/** A Ø1.2 m filter, as the lounge's. */
export const LOUNGE_SIZE: IdealFilterSpec = { diameter: 1.2 };

/** What a filter's size gives: its bed's area, depth and volume, its flows and head, its dirt reference and capacity. */
export function filterSizing(spec: IdealFilterSpec) {
  const P = FILTER_PHYSICS;
  const area = (Math.PI * spec.diameter ** 2) / 4;
  const bedDepth = spec.bedDepth ?? P.bedDepth;
  const media = area * bedDepth;
  return {
    area,
    bedDepth,
    media,
    designFlow: area * P.filtrationRate,
    washFlow: area * P.backwashRate,
    /** A clean bed's head loss at its design flow, m. */
    cleanHead: P.cleanHeadPerDepth * bedDepth,
    dirtRef: media * P.dirtPerMedia,
    capacity: media * P.capacityPerMedia,
  };
}

/**
 * A bed's sizing as it stands, its sand partly lost: its depth, media, clean
 * head, dirt reference and capacity in proportion to the sand left; its
 * area, and so its flows, as its vessel's. With all its sand, its size's.
 */
export function bedSizing(spec: IdealFilterSpec, f: IdealFilterState) {
  const z = filterSizing(spec);
  const sand = f.sand ?? 1;
  if (sand === 1) return z;
  return {
    ...z,
    bedDepth: z.bedDepth * sand,
    media: z.media * sand,
    cleanHead: z.cleanHead * sand,
    dirtRef: z.dirtRef * sand,
    capacity: z.capacity * sand,
  };
}

/** The rig's valves: the two sources' and the filter's five. */
export const RIG_VALVES = [
  'clean',
  'dirty',
  'v1',
  'v2',
  'v3',
  'v4',
  'v5',
] as const;
export type RigValve = (typeof RIG_VALVES)[number];

export interface IdealFilterState {
  /** Dirt in the bed, kg. */
  dirt: number;
  /** How fissured the bed is, 0 sound to 1 channelled through. */
  fissuring: number;
  /** How unsettled after a wash, 0 settled to 1 just lifted. */
  unsettled: number;
  /** The share of its sand left, 0 to 1 (all of it unless given): kept only where sand loss is on. */
  sand?: number;
}

export const newIdealFilter = (): IdealFilterState => ({
  dirt: 0,
  fissuring: 0,
  unsettled: 0,
});

/** The rig around it: its sources, valves and sinks. */
export interface FilterRig {
  spec: IdealFilterSpec;
  filter: IdealFilterState;
  /** Each valve's opening, 0 to 1, and its command. */
  opening: Record<RigValve, number>;
  command: Record<RigValve, boolean>;
  /** Dirt in the dirty source's water, g/m³: its suspended solids, set on the panel. */
  dirtySource: number;
  /** Each source's water (prompt 070); the dirty one's solids are `dirtySource`. */
  sources: { clean: WaterCondition; dirty: WaterCondition };
  /** The rig room's air, °C, which the filter's vessel loses heat to. */
  ambient: number;
}

/** A servo valve's stroke, s. */
export const SERVO_STROKE = 10;
/** The rig's heads, m: both sources, the clean outlet's back-pressure, the waste sink. */
export const RIG_HEADS = { source: 12, outlet: 2, waste: 0 } as const;
/** An open valve's loss at the filter's design flow, m. */
const VALVE_LOSS = 0.3;

export function newFilterRig(spec: IdealFilterSpec = LOUNGE_SIZE): FilterRig {
  const shut = Object.fromEntries(RIG_VALVES.map((v) => [v, 0])) as Record<
    RigValve,
    number
  >;
  return {
    spec,
    filter: newIdealFilter(),
    opening: shut,
    command: Object.fromEntries(RIG_VALVES.map((v) => [v, false])) as Record<
      RigValve,
      boolean
    >,
    dirtySource: 20,
    sources: { clean: WATERS.clean, dirty: WATERS.dirty },
    ambient: 18,
  };
}

export interface RigFlows {
  /** Through each valve, m³/h, in its own direction. */
  valve: Record<RigValve, number>;
  /** Through the bed, + down, − up, m³/h. */
  bed: number;
  toOutlet: number;
  toWaste: number;
  /** The heads at the bed's top and bottom, as its gauges read them, bar; and their difference. */
  topBar: number;
  bottomBar: number;
  bedBar: number;
  /** Whether the bed is lifted. */
  lifted: boolean;
  /** Dirt in the supply, the clean outlet and the waste, g/m³. */
  supplyDirt: number;
  outletDirt: number;
  wasteDirt: number;
  /** The water's whole condition (prompt 070): the supply's, the clean outlet's, the waste's. */
  supply: WaterCondition;
  outlet: WaterCondition;
  waste: WaterCondition;
}

const BAR = 1 / 10.2;

/** The rig's network and its flows, as its valves stand. */
export function rigFlows(rig: FilterRig): RigFlows {
  const f = rig.filter;
  const z = bedSizing(rig.spec, f);
  const q = z.designFlow;
  const r = (loss: number, flow = q) => loss / (flow * flow);
  // A sound bed's resistance, raised by its dirt, lowered by its fissures;
  // lifted, about its depth of head whatever its dirt.
  const bedR =
    r(z.cleanHead) * (1 + f.dirt / z.dirtRef) * (1 - 0.6 * f.fissuring);
  const liftR = r(z.bedDepth, z.washFlow);
  // The runs sized so a clean filter takes its design flow in service and
  // its wash flow in a backwash, every valve open.
  const serviceRun =
    RIG_HEADS.source - RIG_HEADS.outlet - 3 * VALVE_LOSS - z.cleanHead;
  const washRun =
    RIG_HEADS.source -
    RIG_HEADS.waste -
    3 * VALVE_LOSS * (z.washFlow / q) ** 2 -
    z.bedDepth;
  const valve = (id: RigValve, from: string, to: string, extra = 0): NetLink =>
    rig.opening[id] < 0.02
      ? { id, kind: 'closed', from, to }
      : {
          id,
          kind: 'resistance',
          from,
          to,
          r: r(VALVE_LOSS) / rig.opening[id] ** 2 + extra,
        };
  const solve = (lifted: boolean) => {
    const nodes: NetNode[] = [
      { id: 'cleanSource', head: RIG_HEADS.source },
      { id: 'dirtySource', head: RIG_HEADS.source },
      { id: 'supply' },
      { id: 'top' },
      { id: 'bottom' },
      { id: 'outlet', head: RIG_HEADS.outlet },
      { id: 'waste', head: RIG_HEADS.waste },
    ];
    const links: NetLink[] = [
      valve('clean', 'cleanSource', 'supply'),
      valve('dirty', 'dirtySource', 'supply'),
      valve('v1', 'supply', 'top'),
      valve('v3', 'supply', 'bottom'),
      valve('v2', 'bottom', 'outlet', r(serviceRun)),
      valve('v4', 'top', 'waste', r(washRun, z.washFlow)),
      valve('v5', 'bottom', 'waste', r(serviceRun)),
      {
        id: 'bed',
        kind: 'resistance',
        from: 'top',
        to: 'bottom',
        r: lifted ? liftR : bedR,
      },
    ];
    return solveNetwork(nodes, links);
  };
  // Lifted if water goes up through it at its lift share of its wash flow or more.
  let sol = solve(false);
  const up = -(sol.flows.bed ?? 0);
  const lifted = up >= FILTER_PHYSICS.liftShare * z.washFlow;
  if (lifted) sol = solve(true);
  const flow = (id: string) => {
    const v = sol.flows[id] ?? 0;
    return Math.abs(v) < 0.05 ? 0 : v;
  };
  const valves = Object.fromEntries(
    RIG_VALVES.map((v) => [v, flow(v)]),
  ) as Record<RigValve, number>;
  const bed = flow('bed');
  const supplied = Math.max(0, valves.clean) + Math.max(0, valves.dirty);
  // The supply: the two sources' waters, mixed by their flows.
  const supply = mix([
    { condition: rig.sources.clean, share: Math.max(0, valves.clean) },
    {
      condition: { ...rig.sources.dirty, solids: rig.dirtySource },
      share: Math.max(0, valves.dirty),
    },
  ]);
  const supplyDirt = supplied ? supply.solids : 0;
  // Down through the bed: what it lets past. Up: what it washes out.
  const passed = bed > 0 ? filtered(rig, supplyDirt) : supplyDirt;
  const washed =
    bed < 0 && lifted
      ? (f.dirt * 1000 * Math.min(1, -bed / z.washFlow)) /
        FILTER_PHYSICS.washTime /
        (-bed / 3600)
      : 0;
  // Each sink's water: what came to it, by which way.
  const toOutlet = Math.max(0, valves.v2);
  const fromTop = Math.max(0, valves.v4);
  const fromBottom = Math.max(0, valves.v5);
  const toWaste = fromTop + fromBottom;
  const topDirt = bed < 0 ? supplyDirt + washed : supplyDirt;
  // The filter as a black box on the water: through the bed, its solids as
  // it lets them past, and a trace of heat lost by its vessel to the room.
  const through = loseHeat(
    { ...supply, solids: passed },
    vesselUa(rig.spec),
    rig.ambient,
    Math.abs(bed),
  );
  const outlet = through;
  const waste = mix([
    { condition: { ...supply, solids: topDirt }, share: fromTop },
    { condition: through, share: fromBottom },
  ]);
  return {
    valve: valves,
    bed,
    toOutlet,
    toWaste,
    topBar: (sol.heads.top ?? 0) * BAR,
    bottomBar: (sol.heads.bottom ?? 0) * BAR,
    bedBar: Math.abs((sol.heads.top ?? 0) - (sol.heads.bottom ?? 0)) * BAR,
    lifted,
    supplyDirt,
    outletDirt: toOutlet ? passed : 0,
    wasteDirt: toWaste
      ? (fromTop * topDirt + fromBottom * passed) / toWaste
      : 0,
    supply,
    outlet,
    waste,
  };
}

/** A vessel's heat loss to its room, W per kelvin: its shell and ends, uninsulated steel and GRP, about 5 W/m²K. */
export function vesselUa(spec: IdealFilterSpec): number {
  const z = filterSizing(spec);
  const shell = Math.PI * spec.diameter * (z.bedDepth + 1);
  return 5 * (shell + 2 * z.area);
}

/** What a bed lets past, g/m³, filtering water carrying `dirt` g/m³: its size, its state. */
export function bedPasses(
  spec: IdealFilterSpec,
  f: IdealFilterState,
  dirt: number,
): number {
  const z = bedSizing(spec, f);
  // Near its capacity, dirt breaks through.
  const room = Math.max(0, 1 - (f.dirt / z.capacity) ** 3);
  // A shallower bed (sand lost) lets more past: what gets through a full
  // depth, to the power of the share of the depth left.
  const sand = f.sand ?? 1;
  const sound =
    sand === 1
      ? FILTER_PHYSICS.capture
      : 1 - (1 - FILTER_PHYSICS.capture) ** sand;
  const capture = sound * room * (1 - f.fissuring);
  return dirt * (1 - capture) + FILTER_PHYSICS.fines * f.unsettled;
}

/** What the rig's bed lets past. */
export const filtered = (rig: FilterRig, dirt: number) =>
  bedPasses(rig.spec, rig.filter, dirt);

/** Whether `bed` m³/h through a filter of this size lifts it: upwards, at its lift share of its wash flow. */
export const bedLifted = (spec: IdealFilterSpec, bed: number) =>
  -bed >= FILTER_PHYSICS.liftShare * filterSizing(spec).washFlow;

/**
 * A filter's bed `dt` seconds on, given the flow through it (+ down, −
 * up) and the dirt in the water coming to it, g/m³: it loads, settles,
 * washes, heals and fissures. Any filter, in a rig or a packaged cabinet,
 * steps its bed by this.
 */
export function stepFilterBed(
  spec: IdealFilterSpec,
  bedState: IdealFilterState,
  bed: number,
  inDirt: number,
  dt: number,
): IdealFilterState {
  if (!(dt > 0)) return bedState;
  const z = bedSizing(spec, bedState);
  let { dirt, fissuring, unsettled } = bedState;
  let sand = bedState.sand ?? 1;
  const down = Math.max(0, bed);
  const up = Math.max(0, -bed);
  const lifted = bedLifted(spec, bed);
  if (down > 0) {
    // Capture: what came in less what got past.
    const caught = Math.max(
      0,
      inDirt -
        bedPasses(spec, bedState, inDirt) +
        FILTER_PHYSICS.fines * unsettled,
    );
    dirt += (caught * down * dt) / 3600 / 1000;
    // Settling, down through it.
    unsettled *= Math.exp(
      -((down / z.designFlow) * dt) / FILTER_PHYSICS.rinseTime,
    );
  }
  if (lifted) {
    const share = Math.min(1, up / z.washFlow);
    dirt *= Math.exp(-(share * dt) / FILTER_PHYSICS.washTime);
    unsettled = 1;
    // Only a proper lift heals fissures.
    if (up >= FILTER_PHYSICS.healShare * z.washFlow)
      fissuring *= Math.exp(-dt / FILTER_PHYSICS.healTime);
    // Too fierce, with sand loss on: the bed expands past its freeboard.
    const rate = up / z.area;
    const over = rate / FILTER_PHYSICS.safeRiseRate - 1;
    if (spec.sandLoss && over > 0)
      sand = Math.max(
        FILTER_PHYSICS.leastSand,
        sand * Math.exp(-over * FILTER_PHYSICS.sandLossRate * dt),
      );
  } else
    // Loaded and not being washed, the bed cracks and channels.
    fissuring = Math.min(
      1,
      fissuring +
        ((1 - fissuring) * (dirt / z.dirtRef) * 0.5 * dt) /
          FILTER_PHYSICS.fissureTime,
    );
  // Off, nothing is lost and no sand is kept: the state is as it always was.
  return spec.sandLoss || bedState.sand !== undefined
    ? { dirt, fissuring, unsettled, sand }
    : { dirt, fissuring, unsettled };
}

/** What a lifted bed washes out into the water going up through it, g/m³. */
export function washedOut(
  spec: IdealFilterSpec,
  f: IdealFilterState,
  bed: number,
): number {
  if (!bedLifted(spec, bed)) return 0;
  const z = filterSizing(spec);
  return (
    (f.dirt * 1000 * Math.min(1, -bed / z.washFlow)) /
    FILTER_PHYSICS.washTime /
    (-bed / 3600)
  );
}

/** The rig `dt` seconds on: its servos travel, its bed loads, washes, settles and fissures. */
export function stepFilterRig(rig: FilterRig, dt: number): FilterRig {
  if (!(dt > 0)) return rig;
  const opening = { ...rig.opening };
  for (const v of RIG_VALVES) {
    const want = rig.command[v] ? 1 : 0;
    const step = dt / SERVO_STROKE;
    opening[v] =
      want > opening[v]
        ? Math.min(want, opening[v] + step)
        : Math.max(want, opening[v] - step);
  }
  const moved = { ...rig, opening };
  const flows = rigFlows(moved);
  return {
    ...moved,
    filter: stepFilterBed(
      rig.spec,
      rig.filter,
      flows.bed,
      flows.supplyDirt,
      dt,
    ),
  };
}

/** Maintenance: a chemical clean or new media, the bed as new. */
export const cleanFilter = (rig: FilterRig): FilterRig => ({
  ...rig,
  filter: newIdealFilter(),
});

/** The valves set for each process, the rest shut. */
export const PROCESSES = {
  service: ['dirty', 'v1', 'v2'],
  backwash: ['clean', 'v3', 'v4'],
  rinse: ['clean', 'v1', 'v5'],
  off: [],
} as const satisfies Record<string, readonly RigValve[]>;
export type FilterProcess = keyof typeof PROCESSES;

/** Command the valves for a process. */
export const commandProcess = (
  rig: FilterRig,
  p: FilterProcess,
): FilterRig => ({
  ...rig,
  command: Object.fromEntries(
    RIG_VALVES.map((v) => [
      v,
      (PROCESSES[p] as readonly RigValve[]).includes(v),
    ]),
  ) as Record<RigValve, boolean>,
});

/**
 * What the sight glass shows of the bed (`sight-glass.ts`), from the model
 * itself: its dirt as the crust, its fissuring as the channelled surface,
 * the waste water's dirt as the murk in a backwash, and in a rinse the
 * fines it is settling.
 */
export function idealGlass(rig: FilterRig, flows: RigFlows): GlassInputs {
  const z = bedSizing(rig.spec, rig.filter);
  const mode =
    Math.abs(flows.bed) < 1
      ? 'stopped'
      : flows.bed < 0
        ? 'backwash'
        : flows.valve.v5 > 0 && flows.toOutlet === 0
          ? 'rinse'
          : 'service';
  return {
    mode,
    dirt: rig.filter.dirt / z.dirtRef,
    channelling: rig.filter.fissuring,
    murk:
      mode === 'backwash'
        ? Math.min(1, flows.wasteDirt / 400)
        : mode === 'rinse'
          ? Math.min(1, rig.filter.unsettled * 0.6)
          : 0,
  };
}
