import type { World } from './world';
import { HALL_AIR, POOL_IDS, POOL_TARGET } from './plant/pools';
import type { PoolId } from './plant/pools';
import { ROOM_SERVICES, roomRunning } from './plant/services';
import type { ServiceRoom } from './plant/services';
import { CHEMICALS, STORE_CAPACITY } from './plant/chemicals';
import { MOTORS, MOTOR_TAGS, POOL_MOTORS } from './plant/motor-starters';
import { INSTALLED_VALVES } from './plant/installed-valves';
import { LOUNGE_VALVES } from './plant/lounge-valves';
import { PLACED_KINDS } from './plant/equipment-kinds';

/**
 * The healthy New Game contract made executable (mission 067,
 * `doc/healthy-start.md`): each subsystem's findings against the world as
 * it stands, structured so a test can name the asset, what was measured,
 * what was expected and why. It is independent of the constructors it
 * checks: a configured target says what is wanted, and the check still
 * looks at what the world actually delivers. Coverage tables classify
 * every world field and every kind of installed equipment, so a new one
 * cannot pass silently: the type checker refuses a world or a catalogue
 * the tables do not cover. Pure.
 */

export type HealthSeverity = 'fault' | 'warning' | 'info';

export interface HealthFinding {
  subsystem: string;
  /** The asset or path concerned: a pool, a starter's tag, a valve's tag. */
  asset: string;
  severity: HealthSeverity;
  /** What was measured, in `unit`. */
  measured: number | string | boolean;
  /** The healthy value or band, in words. */
  expected: string;
  unit?: string;
  reason: string;
}

/**
 * The healthy bands, each inside the game's protective or alarm limits
 * (`world-reading.ts`) with room for ordinary cycling. Where no band was
 * established before, the value is a proposal recorded in
 * `doc/healthy-start.md` with its reason.
 */
export const HEALTHY = {
  /** Water temperature, °C either side of target over the handover hour. */
  temperature: 0.5,
  /** Treatment flow, a share of the pool's design flow. */
  flow: 0.8,
  /** Surface level, metres below the overflow lip at the lowest. */
  level: -0.03,
  /** pH, inside the 7.0–7.8 alarm band. */
  ph: [7.2, 7.6],
  /** Free chlorine, mg/l, the alarm band (1–3). */
  freeChlorine: [1.0, 3.0],
  /** Balance tank fill, the generic alarm's floor (a tank's own switches are finer). */
  balance: 0.2,
  /** Hall relative humidity, %, the alarm's limit. */
  rh: 62,
  /** Chemical stock, a share of capacity: weeks of ordinary use. */
  stock: 0.25,
} as const;

/** A pool's treatment and water. */
function poolFindings(world: World, id: PoolId): HealthFinding[] {
  const p = world.pools[id];
  const target = POOL_TARGET[id];
  const out: HealthFinding[] = [];
  const fault = (
    measured: HealthFinding['measured'],
    expected: string,
    reason: string,
    unit?: string,
  ) =>
    out.push({
      subsystem: 'pools',
      asset: id,
      severity: 'fault',
      measured,
      expected,
      reason,
      ...(unit ? { unit } : {}),
    });
  if (p.tripped) fault(true, 'false', 'its pumps are held off on low-low tank');
  if (p.drainDown) fault(true, 'false', 'a drain-down is under way');
  if (p.level < HEALTHY.level)
    fault(p.level, `≥ ${HEALTHY.level}`, 'its surface is low', 'm');
  if (p.flow < target.flow * HEALTHY.flow)
    fault(
      p.flow,
      `≥ ${(target.flow * HEALTHY.flow).toFixed(1)}`,
      'its treatment flow is short of design',
      'm³/h',
    );
  if (Math.abs(p.temperature - target.temp) > HEALTHY.temperature)
    fault(
      p.temperature,
      `${target.temp} ± ${HEALTHY.temperature}`,
      'its water is off its target temperature',
      '°C',
    );
  if (p.ph < HEALTHY.ph[0] || p.ph > HEALTHY.ph[1])
    fault(p.ph, `${HEALTHY.ph[0]}–${HEALTHY.ph[1]}`, 'its pH is out of band');
  if (
    p.freeChlorine < HEALTHY.freeChlorine[0] ||
    p.freeChlorine > HEALTHY.freeChlorine[1]
  )
    fault(
      p.freeChlorine,
      `${HEALTHY.freeChlorine[0]}–${HEALTHY.freeChlorine[1]}`,
      'its free chlorine is out of band',
      'mg/l',
    );
  if (p.balance < HEALTHY.balance)
    fault(p.balance, `≥ ${HEALTHY.balance}`, 'its balance tank is low');
  if (p.hallRh > HEALTHY.rh)
    fault(p.hallRh, `≤ ${HEALTHY.rh}`, 'its hall is too humid', '%');
  void HALL_AIR;
  return out;
}

/** The motors: duty running, standby ready in AUTO, nothing tripped or stopped. */
function motorFindings(world: World): HealthFinding[] {
  const out: HealthFinding[] = [];
  const m = world.motors;
  for (const pool of Object.keys(m.stopped) as (keyof typeof m.stopped)[])
    if (m.stopped[pool])
      out.push({
        subsystem: 'motors',
        asset: `${pool} emergency stop`,
        severity: 'fault',
        measured: true,
        expected: 'released',
        reason: 'its pumps’ emergency stop is pushed in',
      });
  for (const tag of MOTOR_TAGS) {
    const s = m.starters[tag];
    const finding = (
      measured: HealthFinding['measured'],
      expected: string,
      reason: string,
    ) =>
      out.push({
        subsystem: 'motors',
        asset: tag,
        severity: 'fault',
        measured,
        expected,
        reason,
      });
    if (s.tripped) finding(true, 'false', 'its starter has tripped');
    if (s.mode !== 'auto')
      finding(s.mode, 'auto', 'its selector is not in AUTO');
    if (MOTORS[tag].role === 'duty' && !s.running)
      finding(false, 'true', 'the duty pump is not running');
  }
  // A set with neither pump running has no circulation.
  for (const pool of ['pool_01', 'pool_02'] as const)
    if (!POOL_MOTORS(pool).some((t) => m.starters[t].running))
      out.push({
        subsystem: 'motors',
        asset: `${pool} pumps`,
        severity: 'fault',
        measured: 'none running',
        expected: 'duty running',
        reason: 'no circulation pump runs',
      });
  return out;
}

/** The services: every room's feeder and its needs, every isolator closed. */
function serviceFindings(world: World): HealthFinding[] {
  const out: HealthFinding[] = [];
  for (const room of Object.keys(ROOM_SERVICES) as ServiceRoom[])
    if (!roomRunning(world.plant, room))
      out.push({
        subsystem: 'services',
        asset: room,
        severity: 'fault',
        measured: false,
        expected: 'running',
        reason: 'a room lacks a service it needs',
      });
  for (const [name, on] of Object.entries(world.plant.isolators))
    if (!on)
      out.push({
        subsystem: 'services',
        asset: name,
        severity: 'fault',
        measured: 'off',
        expected: 'on',
        reason: 'a machine’s isolator is locked off',
      });
  return out;
}

/** Every installed valve at its normal position in service. */
function valveFindings(world: World): HealthFinding[] {
  const out: HealthFinding[] = [];
  const lounge = new Set(LOUNGE_VALVES.map((v) => v.assetId));
  for (const v of Object.values(INSTALLED_VALVES)) {
    const normal = v.normal === 'open';
    const actual = lounge.has(v.assetId)
      ? (world.loungeValvePositions[v.assetId] ?? (normal ? 1 : 0)) >= 0.5
      : (world.installedValves[v.assetId] ?? normal);
    if (actual !== normal)
      out.push({
        subsystem: 'valves',
        asset: v.tag,
        severity: 'fault',
        measured: actual ? 'open' : 'shut',
        expected: v.normal,
        reason: 'a valve is out of its normal service position',
      });
  }
  return out;
}

/** Gas: the boiler house's safety chain made, every detected zone clear. */
function gasFindings(world: World): HealthFinding[] {
  const out: HealthFinding[] = [];
  const g = world.boilerGas;
  const chain = [
    ['ECV', g.ecvOpen, true, 'the incoming gas valve is shut'],
    [
      'emergency stop',
      g.stopPressed,
      false,
      'the boiler house stop is pushed in',
    ],
    ['methane detector', g.gasDetected, false, 'gas is detected'],
    ['SSOV', g.ssovOpen, true, 'the safety shut-off valve is shut'],
  ] as const;
  for (const [asset, measured, healthy, reason] of chain)
    if (measured !== healthy)
      out.push({
        subsystem: 'gas',
        asset: `boiler house ${asset}`,
        severity: 'fault',
        measured,
        expected: String(healthy),
        reason,
      });
  for (const [zone, z] of Object.entries(world.gas))
    if (z.leak > 0 || z.state.a1 || z.state.a2)
      out.push({
        subsystem: 'gas',
        asset: zone,
        severity: 'fault',
        measured: z.state.reading,
        expected: 'no leak, no alarm',
        unit: 'ppm',
        reason: 'toxic gas is leaking or alarmed',
      });
  return out;
}

/** The wet hall, the stores, the air handling, the jacuzzi, the lighting. */
function otherFindings(world: World): HealthFinding[] {
  const out: HealthFinding[] = [];
  const add = (
    f: Omit<HealthFinding, 'severity'>,
    severity: HealthSeverity = 'fault',
  ) => out.push({ ...f, severity });
  if (world.wetHall.boosterTripped)
    add({
      subsystem: 'wet hall',
      asset: 'booster set',
      measured: true,
      expected: 'false',
      reason: 'the booster set has tripped on low break tank',
    });
  if (world.wetHall.spilt > 0)
    add({
      subsystem: 'wet hall',
      asset: 'backwash tank',
      measured: world.wetHall.spilt,
      expected: '0',
      unit: 'm³',
      reason: 'backwash has overflowed to waste',
    });
  for (const c of CHEMICALS)
    if (world.chemicals[c] < STORE_CAPACITY[c] * HEALTHY.stock)
      add({
        subsystem: 'chemicals',
        asset: c,
        measured: world.chemicals[c],
        expected: `≥ ${STORE_CAPACITY[c] * HEALTHY.stock}`,
        unit: 'l',
        reason: 'a chemical store is running low',
      });
  for (const [tag, u] of Object.entries(world.airHandling.units)) {
    if (u.tripped)
      add({
        subsystem: 'air',
        asset: tag,
        measured: true,
        expected: 'false',
        reason: 'an air handling unit has tripped',
      });
    if (u.mode !== 'auto' || !u.isolator)
      add({
        subsystem: 'air',
        asset: tag,
        measured: `${u.mode}, isolator ${u.isolator ? 'on' : 'off'}`,
        expected: 'auto, isolator on',
        reason: 'an air handling unit is not left in service',
      });
  }
  if (!world.jacuzziCabinet.power || world.jacuzziCabinet.trip)
    add({
      subsystem: 'jacuzzi',
      asset: 'PL3-CAB1',
      measured: world.jacuzziCabinet.trip || 'power off',
      expected: 'powered, no trip',
      reason: 'the jacuzzi’s cabinet is off or tripped',
    });
  if (
    !world.lighting.supply ||
    Object.values(world.lighting.zones).some((z) => !z)
  )
    add({
      subsystem: 'lighting',
      asset: 'DB-LIGHTING',
      measured: 'a zone off',
      expected: 'all on',
      reason: 'some of the building is unlit',
    });
  if (world.olympicTank.makeup !== 'auto')
    add({
      subsystem: 'pools',
      asset: 'Olympic make-up',
      measured: world.olympicTank.makeup,
      expected: 'auto',
      reason: 'the Olympic’s make-up is not in AUTO',
    });
  return out;
}

/** Every finding for a world: faults, and informational activity apart. */
export function healthFindings(world: World): HealthFinding[] {
  return [
    ...POOL_IDS.flatMap((id) => poolFindings(world, id)),
    ...motorFindings(world),
    ...serviceFindings(world),
    ...valveFindings(world),
    ...gasFindings(world),
    ...otherFindings(world),
  ];
}

/** The faults alone. */
export const healthFaults = (world: World) =>
  healthFindings(world).filter((f) => f.severity === 'fault');

/**
 * Every field of the world, classified: checked by a rule above, or not
 * health at all, with the reason. A new field fails to compile until it
 * is classified here.
 */
export const WORLD_HEALTH_COVERAGE = {
  time: 'not health: the clock',
  demo: 'not health: dev14’s demonstration button',
  plant: 'services: feeders, sources and isolators',
  pools: 'pools: level, flow, temperature, chemistry, tank, humidity, trips',
  chemicals: 'chemicals: stock against capacity',
  wetHall: 'wet hall: booster trip, backwash overflow',
  bathers: 'not health: the visitors, a load on the plant',
  startup: 'not health: a SLOW START sequence’s clock',
  lighting: 'lighting: supply and every zone',
  ambient: 'not health: the weather, a load on the plant',
  gas: 'gas: every detected zone clear',
  identifiedPlant:
    'not checked: the footbath’s and jacuzzi’s identified parts are judged by their pools’ flow and level; their own states have no rule yet',
  installedValves: 'valves: each at its normal position',
  loungeValvePositions: 'valves: each lounge valve’s travel at its normal',
  loungeFilters:
    'not checked: filter dirt is maintenance, a trend not a fault; the pool’s flow catches a blocked filter',
  olympic:
    'not checked: filter dirt is maintenance, a trend not a fault; the pool’s flow catches a blocked battery',
  olympicTank: 'pools: the Olympic’s make-up in AUTO',
  airHandling:
    'air: units in AUTO, isolated on, not tripped; halls’ humidity under pools',
  motors: 'motors: duty running, standby in AUTO, no trip or stop',
  jacuzzi: 'not health: the jets and air await a timed START',
  jacuzziCabinet: 'jacuzzi: cabinet powered, no trip',
  sewer: 'not health: a record of what went to sewer',
  makeUpRecord: 'not health: a record of the water used',
  centralBattery:
    'not checked: the emergency lighting’s battery; its charge and tests are maintenance, and the lighting’s own check catches a dark zone',
  cabinets:
    'not checked: a spa cabinet’s controller follows its POWER and supply; its pool’s flow catches one stopped',
  spaFilters:
    'not checked: a spa filter’s dirt is maintenance, and its wash a routine its programme runs',
  jacuzziFibreIlluminator:
    'not checked: decoration lighting, its own on switch',
  boilerGas: 'gas: the boiler house’s safety chain made',
  music: 'not health: the halls’ music',
  fireAlarm:
    'not checked: an alarm raised by hand, seen and heard where it sounds',
  washOTron:
    'not checked: the filters’ wash controller; a filter it leaves washing shows in the pool’s flow',
} as const satisfies Record<keyof World, string>;

/**
 * Every kind of installed equipment, classified: which rule judges it, or
 * why none can yet. A new kind fails to compile until it is classified.
 */
export const KIND_HEALTH_COVERAGE = {
  'balance-tank': 'pools: balance tank fill and low-low trip',
  'pump-pair': 'motors: duty running, standby ready',
  'sand-filter': 'pools: treatment flow (a blocked filter starves it)',
  'uv-unit': 'services: its isolator; it runs with circulation',
  'pump-panel': 'motors: its starters, selectors and emergency stop',
  'balance-tank-panel': 'pools: the Olympic make-up in AUTO',
  'heat-exchanger': 'pools: water temperature held',
  'ozone-monitor': 'gas: its zone clear',
  'ozone-generator':
    'not in the world: its state is its room’s own model (Codex, review of 069); its isolator is checked under services',
  'contact-tank': 'pools: treatment flow through it',
  'dosing-controller': 'pools: pH and free chlorine in band',
  'hypo-pumps': 'pools: free chlorine in band; chemicals: stock',
  'acid-pump': 'pools: pH in band; chemicals: stock',
  'jacuzzi-pack': 'jacuzzi: cabinet powered, no trip',
  'spa-pack': 'pools: the footbath’s flow and level',
  'break-tank': 'wet hall: booster trip on its low level',
  'booster-set': 'wet hall: booster not tripped',
  'water-meter': 'not health: a meter, it only counts',
  'backwash-tank': 'wet hall: no overflow',
  'mimic-wet': 'not health: a display of the wet hall',
  'sewer-monitor': 'not health: a record of what went to sewer',
  'make-up-recorder': 'not health: a record of the water used',
  'make-up-flowmeter':
    'not health: an instrument; the pools’ make-up and levels show the water',
  boiler:
    'not in the world: its individual controller state belongs to its boiler-house panel; gas: shared safety chain; pools: delivered heat',
  'boiler-cascade':
    'not in the world: its controllers’ states are their panels’ own; gas: its safety chain; pools: the heat delivered',
  'low-loss-header': 'pools: water temperature held',
  'lthw-pumps': 'not in the world: no starters yet; pools: the heat delivered',
  pressurisation:
    'not in the world: no state; the heating’s delivery stands for it',
  calorifier: 'not in the world: no hot-water state yet',
  'gas-train': 'gas: the safety chain',
  'dosing-pot': 'not health: a hand-dosed pot, no state',
  'gas-safety': 'gas: the safety chain',
  'mimic-gas': 'not health: a display of the gas chain',
  'mimic-boiler-heat': 'not health: a display of the heating',
  'combustion-panel': 'not in the world: no state yet',
  'hypo-tank': 'chemicals: hypochlorite stock',
  'acid-ibc': 'chemicals: acid stock',
  'safety-shower': 'not health: set decoration (the owner, 2026-10-22)',
  'spill-kit': 'not health: set decoration',
  'ppe-cabinet': 'not health: set decoration',
  'store-extract': 'gas: its zone clear; services: its room',
  'store-signs': 'not health: signs',
  'tanker-stand': 'not health: a delivery point',
  'fill-cabinet': 'not health: a delivery point',
  'lv-switchboard': 'services: every room’s feeder',
  mcc: 'not installed: retired (prompt 043)',
  'main-switch': 'services: the power source',
  'central-battery':
    'not in the world: emergency lighting not yet modelled (prompt 052)',
  'distribution-board': 'services: rooms’ feeders',
  'rotary-isolators': 'services: isolators on',
  'lighting-board': 'lighting: supply and zones',
  'generator-point': 'not health: a connection for a hired generator',
  'earthing-terminal': 'not in the world: no state',
  'ahu-stack': 'air: units in service, not tripped',
  'mimic-air': 'not health: a display of the air plant',
  'operator-desk': 'not health: the operator’s desk',
  'alarm-printer': 'not health: it prints what the annunciator shows',
  'water-test-kit': 'not health: set decoration for now',
  'mimic-pool': 'not health: a display of the pools',
  'mimic-heating': 'not health: a display of the heating',
  annunciator: 'not health: a display; its indications are classified below',
  'chart-recorders': 'not health: a display',
  'readout-board': 'not health: a display',
  'bms-outstation': 'not in the world: no state (prompt 050)',
  'fire-repeater': 'not in the world: no fire alarm yet (prompt 053)',
  cctv: 'not health: a camera monitor',
  desk: 'not health: furniture',
  filing: 'not health: furniture',
  'storage-cupboard': 'not health: furniture',
  'scenario-simulator':
    'not health: the engineer’s simulator switches the plant',
} as const satisfies Record<keyof typeof PLACED_KINDS, string>;

/**
 * Annunciator indications that are ordinary activity, not faults, each
 * with its reason (`doc/healthy-start.md`, "Normal activity and actual
 * faults"). The annunciator still shows them; a health check does not
 * count them.
 */
export const INFORMATIONAL_INDICATIONS = {
  'makeup-running':
    'the booster set meeting ordinary make-up demand: automatic and expected',
} as const;
