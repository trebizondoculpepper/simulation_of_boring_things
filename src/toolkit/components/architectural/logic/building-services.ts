import { createGraph } from '../../core/logic/world/graph';
import { createFireAlarmSystem } from '../../fire/logic/fire-alarm-system';
import { SUPPLY_CONDITIONS, supplyVoltage } from './supply-quality';
import { DETECTOR_TIMEOUT } from './presence-detector';

/**
 * Dev8's world model: the building services of one room of a present-day
 * English office, on the world graph, so that every fitting in the room
 * does what it would do in a real building. Each development room may
 * have a world model of its own like this one; the fittings are bound to
 * it and show it, and none of them decides anything for itself.
 *
 * - **Power**: a distribution board's main switch and its circuits
 *   (lighting, sockets, HVAC), each a breaker.
 * - **Lighting**: the room's lights on two-way switching (a switch at
 *   each end of the room; either one changes them), a dimmer, and an
 *   occupancy sensor that turns them off when nobody has moved for a
 *   while. Emergency lights are non-maintained: they light only when the
 *   lighting circuit loses power or its voltage sags too far (each at its
 *   own threshold), which the test key switch simulates for them alone. The exit sign is
 *   maintained: always lit.
 * - **Supply quality**: the incoming supply's voltage, steady or pulled
 *   about by a machine (a brownout, a severe disturbance), which the
 *   luminaires' drivers follow (`led-driver.ts`).
 * - **Fire**: a two-stage fire alarm with a voice alarm, as in a UK
 *   office (BS 5839-1 and -8), set off by the dev room's joke: a steel
 *   waste-paper bin under the smoke detector, lit by a button on a
 *   pedestal. A few seconds after it is lit its smoke sets off the
 *   detector, and the alert stage begins: the door holders let the fire
 *   doors close, and the voice alarm asks everyone to stay where they are
 *   while it is investigated, for `INVESTIGATION_SECONDS`. The
 *   investigation finds, at random, a fire (full evacuation) or a false
 *   alarm, announced while the bin is still alight, so that its smoke soon
 *   sets the detector off again, and a second activation goes straight to
 *   evacuation. In evacuation the access door unlocks and the brigade is
 *   called; the fire grows, and when the hot gas at a sprinkler head
 *   reaches 68 °C its glass bulb bursts and it sprays, which puts the bin
 *   out. A call point, or water flowing, goes straight to evacuation. The
 *   panel's SILENCE, RESOUND/EVACUATE and RESET work only with its key
 *   turned, and RESET only once nothing is still in alarm; then the
 *   all-clear is announced. At the valve set, the main valve stops the
 *   water and RESET replaces the burst heads.
 * - **Climate**: an air-conditioning unit with a wall controller (power,
 *   mode, setpoint), a radiator with a room thermostat and a thermostatic
 *   radiator valve, an opening window vent and blinds. The room's
 *   temperature follows from all of them and the weather outside.
 * - **Ventilation**: the WC's extractor fan runs with its light and for a
 *   while after (run-on).
 * - **Access**: a maglocked door released for a few seconds by a card or
 *   the push-to-exit button, or until reset by the green emergency door
 *   release; the door closes itself.
 * - **Welfare**: the accessible toilet's emergency pull cord, which
 *   sounds and lights an alarm until reset.
 */

export {
  ALL_CLEAR_SECONDS,
  HEAD_OPENS_AT,
  INVESTIGATION_SECONDS,
  SMOKE_ALARM,
  SMOKE_RISE,
} from '../../fire/logic/fire-alarm-system';
export type { FireStage } from '../../fire/logic/fire-alarm-system';

/** Seconds without movement before the occupancy sensor turns the lights off. */
export const VACANCY_SECONDS = 90;
/**
 * Lighting the bin: it smoulders, smoking a little, for `SMOULDER_SECONDS`;
 * then flames catch at `FIRE_START` and grow at `IGNITION_GROWTH` a second
 * to `IGNITION_SIZE`, where they hold while the alarm is investigated.
 * Once the building is evacuating the fire grows on at `FIRE_GROWTH`, and
 * a sprinkler puts it out at `FIRE_QUENCH` a second.
 */
export const SMOULDER_SECONDS = 6;
export const FIRE_START = 0.04;
export const IGNITION_GROWTH = 0.02;
export const IGNITION_SIZE = 0.2;
export const FIRE_GROWTH = 0.015;
export const FIRE_QUENCH = 0.04;
/** Where the waste-paper bin stands, under the smoke detector: mid-room. */
export const FIRE_SEAT = { x: 0.4, z: 0.3 };
/** The sprinkler heads in the ceiling, metres. */
export const SPRINKLER_HEADS: readonly { x: number; z: number }[] = [
  // The head over the bin, which is the one that goes off.
  { x: FIRE_SEAT.x + 0.3, z: FIRE_SEAT.z },
  { x: 1.5, z: 2 },
  { x: -1.5, z: 2 },
  { x: 1.5, z: -2 },
  { x: -1.5, z: -2 },
  { x: 4.5, z: 2 },
  { x: -4.5, z: 2 },
  { x: 4.5, z: -2 },
  { x: -4.5, z: -2 },
];

/**
 * The hot gas at sprinkler head `i` under a fire of `size` (0 to 1):
 * hotter the bigger the fire and the nearer the head, °C.
 */
export function headTemperature(size: number, i: number) {
  const { x, z } = SPRINKLER_HEADS[i];
  const distance = Math.hypot(x - FIRE_SEAT.x, z - FIRE_SEAT.z);
  return 20 + (192 * size) / (distance + 1.5);
}
/** Seconds the door stays released after a card or the exit button. */
export const DOOR_RELEASE_SECONDS = 6;
/** Seconds the WC extractor runs on after its light goes off. */
export const FAN_RUN_ON_SECONDS = 20;
export const OUTSIDE_TEMPERATURE = 9;
/** Air-conditioning modes, in the order the MODE button steps them. */
export const HVAC_MODES = ['auto', 'heat', 'cool', 'fan'] as const;

/** A large space's lighting zones. */
export const ZONES = [1, 2, 3] as const;
/** Seconds of a severe disturbance before its fault trips the lighting. */
export const SEVERE_TRIP_SECONDS = 10;

export function createBuildingServices() {
  const g = createGraph();

  // ---- Power -----------------------------------------------------------
  const main = g.input('board.main', true, { where: 'main switch' });
  const lightingBreaker = g.input('board.lighting', true, {
    where: 'lighting breaker',
  });
  const socketsBreaker = g.input('board.sockets', true, {
    where: 'sockets breaker',
  });
  const hvacBreaker = g.input('board.hvac', true, { where: 'HVAC breaker' });
  // A large space's lighting zones, each a circuit of its own on the
  // board (`doc/research/warehouse-lighting-control.md`).
  const zoneBreakers = ZONES.map((n) =>
    g.input(`board.zone${n}`, true, { where: `LIGHTING ZONE ${n} breaker` }),
  );
  const emergencyTest = g.input('emergency.test', false, {
    where: 'emergency lighting test key switch',
  });
  // The lighting circuit. The emergency fittings are fed from its
  // unswitched live through the test key switch, which interrupts their
  // supply alone, as a failure of the circuit would: the room's own
  // lights stay on.
  const lightingSupply = g.derive(
    'lighting.supply',
    [main, lightingBreaker],
    (m, b) => m && b,
  );
  const emergencySupply = g.derive(
    'emergency.supply',
    [lightingSupply, emergencyTest],
    (supply, test) => supply && !test,
  );
  /** A fault on the lighting: every lighting breaker trips. */
  const tripLighting = g.action(
    'board.lighting.trip',
    [],
    [lightingBreaker, ...zoneBreakers],
    () => {
      lightingBreaker.set(false);
      for (const zone of zoneBreakers) zone.set(false);
    },
    'lighting fault',
  );
  /** A fault on one zone's circuit (1 to 3): its breaker trips. */
  const tripZone = g.action(
    'board.zone.trip',
    [],
    zoneBreakers,
    (n: number) => zoneBreakers[n - 1]?.set(false),
    'zone fault',
  );

  // ---- Supply quality ----------------------------------------------------
  // The incoming supply's voltage, a fraction of nominal: steady, or
  // pulled about by a machine on the same supply (`supply-quality.ts`).
  // A severe disturbance's fault current soon trips the lighting breaker.
  const supplyCondition = g.input('supply.condition', 0, {
    where: 'SUPPLY test selector',
  });
  /**
   * The supply's voltage as something outside sets it (a machine on the
   * same supply: Level 0's), in place of the test selector's, or null.
   */
  const supplyFeed = g.input<number | null>('supply.feed', null, {
    where: 'a machine on the same supply',
  });
  const supplyClock = g.state('supply.clock', 0);
  const supplyVolts = g.state('supply.volts', 1);
  const severeFor = g.state('supply.severeFor', 0);
  g.process(
    'supply',
    [supplyCondition, supplyFeed, lightingBreaker, ...zoneBreakers],
    [supplyClock, supplyVolts, severeFor, lightingBreaker, ...zoneBreakers],
    (dt) => {
      const t = supplyClock.peek() + dt;
      supplyClock.set(t);
      const condition = SUPPLY_CONDITIONS[supplyCondition.peek()] ?? 'normal';
      supplyVolts.set(supplyFeed.peek() ?? supplyVoltage(condition, t));
      const lit = [lightingBreaker, ...zoneBreakers].some((b) => b.peek());
      const severe = condition === 'severe' && lit;
      const lasted = severe ? severeFor.peek() + dt : 0;
      if (lasted >= SEVERE_TRIP_SECONDS) {
        lightingBreaker.set(false);
        for (const zone of zoneBreakers) zone.set(false);
        severeFor.set(0);
      } else severeFor.set(lasted);
    },
  );
  /** The voltage at the lighting circuit's fittings, 0 with it off. */
  const lightingVolts = g.output(
    'lighting.volts',
    [lightingSupply, supplyVolts],
    (supply, volts) => (supply ? volts : 0),
    { where: 'luminaires' },
  );
  /**
   * The voltage at the emergency fittings, 0 with their supply cut: each
   * changes over to its battery at its own threshold
   * (`../../general-safety/logic/emergency-changeover.ts`).
   */
  const emergencyVolts = g.output(
    'emergency.volts',
    [emergencySupply, supplyVolts],
    (supply, volts) => (supply ? volts : 0),
    { where: 'emergency lights' },
  );
  const socketSupply = g.derive(
    'sockets.supply',
    [main, socketsBreaker],
    (m, b) => m && b,
  );
  const hvacSupply = g.derive(
    'hvac.supply',
    [main, hvacBreaker],
    (m, b) => m && b,
  );

  // ---- Lighting --------------------------------------------------------
  const switchDoor = g.input('lights.switch.door', true, {
    where: 'light switch by the door',
  });
  const switchFar = g.input('lights.switch.far', false, {
    where: 'light switch at the far end',
  });
  const dimmer = g.input('lights.dimmer', 10, { where: 'dimmer' });
  const stillFor = g.state('room.still', 0);
  g.process('occupancy', [], [stillFor], (dt) =>
    stillFor.set(stillFor.peek() + dt),
  );
  const motion = g.action('room.motion', [], [stillFor], () => stillFor.set(0));
  const occupied = g.output(
    'room.occupied',
    [stillFor],
    (s) => s < VACANCY_SECONDS,
    { where: 'occupancy sensor LED' },
  );
  const roomLight = g.output(
    'lights.room',
    [lightingSupply, switchDoor, switchFar, dimmer, occupied],
    (supply, a, b, level, here) =>
      supply && a !== b && here ? Math.max(0.1, level / 10) : 0,
    { where: 'ceiling lights' },
  );
  /** Their supply cut: every emergency light lit. */
  // A large space's lighting is switched by zone (rows of fittings), from
  // a bank of grid switches by each exit, two-way, as a corridor is, and
  // by a presence detector over each zone, which holds it on for its
  // time-out after it last saw anyone (`presence-detector.ts`). Each zone
  // is a circuit of its own; its emergency fittings are fed from it,
  // unswitched, through the test key.
  const zoneSwitches = ZONES.map((n) => ({
    a: g.input(`lights.zone${n}.a`, true, { where: `ZONE ${n}, first bank` }),
    b: g.input(`lights.zone${n}.b`, false, {
      where: `ZONE ${n}, second bank`,
    }),
  }));
  const detectorTimeout = g.input('lights.detector.timeout', DETECTOR_TIMEOUT, {
    where: 'presence detectors, set by handset',
  });
  const unseen = ZONES.map((n) => g.state(`lights.zone${n}.unseen`, 0));
  g.process('presence', [], unseen, (dt) => {
    for (const s of unseen) s.set(s.peek() + dt);
  });
  /** The detector over zone `n` (1 to 3) sees someone. */
  const seen = g.action(
    'lights.zone.seen',
    [],
    unseen,
    (n: number) => unseen[n - 1]?.set(0),
    'presence detectors',
  );
  const zoneOccupied = unseen.map((s, i) =>
    g.output(
      `lights.zone${i + 1}.occupied`,
      [s, detectorTimeout],
      (since, timeout) => since < timeout,
      { where: `zone ${i + 1} presence detector LED` },
    ),
  );
  const zoneSupply = zoneBreakers.map((breaker, i) =>
    g.derive(`lights.zone${i + 1}.supply`, [main, breaker], (m, b) => m && b),
  );
  const zoneLight = ZONES.map((n, i) =>
    g.output(
      `lights.zone${n}.on`,
      [zoneSupply[i], zoneSwitches[i].a, zoneSwitches[i].b, zoneOccupied[i]],
      (supply, a, b, here) => (supply && a !== b && here ? 1 : 0),
      { where: `zone ${n} luminaires` },
    ),
  );
  /** The voltage at each zone's fittings, 0 with its circuit off. */
  const zoneVolts = ZONES.map((n, i) =>
    g.output(
      `lights.zone${n}.volts`,
      [zoneSupply[i], supplyVolts],
      (supply, volts) => (supply ? volts : 0),
      { where: `zone ${n} luminaires` },
    ),
  );
  /** The voltage at each zone's emergency fittings. */
  const zoneEmergencyVolts = ZONES.map((n, i) =>
    g.output(
      `emergency.zone${n}.volts`,
      [zoneSupply[i], emergencyTest, supplyVolts],
      (supply, test, volts) => (supply && !test ? volts : 0),
      { where: `zone ${n} emergency lights` },
    ),
  );
  const emergencyLit = g.output(
    'lights.emergency',
    [emergencySupply],
    (supply) => !supply,
    { where: 'emergency lights' },
  );
  const charging = g.output(
    'lights.charging',
    [emergencySupply],
    (supply) => supply,
    { where: 'emergency lights charging LEDs' },
  );
  const exitSign = g.output(
    'lights.exit',
    [emergencyLit],
    (battery) => (battery ? 0.75 : 1),
    { where: 'exit sign' },
  );
  const wcCord = g.input('wc.cord', false, { where: 'WC pull-cord switch' });
  const wcLight = g.output(
    'wc.light',
    [lightingSupply, wcCord],
    (supply, on) => supply && on,
    { where: 'WC light' },
  );

  // ---- Ventilation -----------------------------------------------------
  const runOn = g.state('fan.runOn', 0);
  g.process('fan.run-on', [wcLight], [runOn], (dt) =>
    runOn.set(
      wcLight.peek() ? FAN_RUN_ON_SECONDS : Math.max(0, runOn.peek() - dt),
    ),
  );
  const fanRunning = g.output(
    'fan.running',
    [lightingSupply, wcLight, runOn],
    (supply, light, left) => supply && (light || left > 0),
    { where: 'extractor fan' },
  );

  // ---- Fire ------------------------------------------------------------
  // The fire in the bin; the alarm and sprinklers are the shared system
  // (`../../fire/logic/fire-alarm-system.ts`), which the bin's smoke and
  // heat set off.
  /** The fire itself: 0 when out, growing towards 1. */
  const fireSize = g.state('fire.size', 0);
  /** Seconds the lit bin has left to smoulder before its flames catch. */
  const smoulder = g.state('fire.smoulder', 0);
  const alight = g.derive(
    'fire.alight',
    [fireSize, smoulder],
    (size, left) => size > 0 || left > 0,
  );
  const smokeTarget = g.derive(
    'fire.smokeMade',
    [fireSize, smoulder],
    (size, left) =>
      size > 0 ? Math.min(1, 0.3 + size * 1.5) : left > 0 ? 0.22 : 0,
  );
  const headTemperatures = g.derive('sprinkler.heat', [fireSize], (size) =>
    SPRINKLER_HEADS.map((_, i) => headTemperature(size, i)),
  );
  const system = createFireAlarmSystem(g, {
    heads: SPRINKLER_HEADS.length,
    mains: main,
    smokeTarget,
    alight,
    headTemperatures,
  });
  const {
    panelKey,
    riserValve,
    callPoint,
    calledFalse,
    smoke,
    detector,
    stage,
    sounding,
    voice,
    announcement,
    doorsHeld,
    panelLamps,
    heads,
    discharging,
    smokeShown,
    pressCallPoint,
    resetCallPoint,
    silence,
    evacuate,
    reset,
    resetSprinklers,
  } = system;
  const flames = g.output('fire.flames', [fireSize], (s) => s, {
    where: 'the fire in the bin',
  });
  g.process('fire', [heads, stage, smoulder], [fireSize, smoulder], (dt) => {
    // The fire in the bin: smouldering while it is investigated, growing
    // once the building is evacuating, and put out by a sprinkler head.
    const spraying = heads.peek().some((h) => h.spraying);
    let size = fireSize.peek();
    if (smoulder.peek() > 0) {
      // Smouldering: smoke, no flames yet; water puts it out.
      smoulder.set(spraying ? 0 : Math.max(0, smoulder.peek() - dt));
      if (smoulder.peek() <= 0 && !spraying) size = FIRE_START;
    } else if (size > 0) {
      const rate = spraying
        ? -FIRE_QUENCH
        : stage.peek() === 'evacuate'
          ? FIRE_GROWTH
          : size < IGNITION_SIZE
            ? IGNITION_GROWTH
            : 0;
      size = Math.min(1, Math.max(0, size + dt * rate));
    }
    if (size !== fireSize.peek()) fireSize.set(size);
  });
  /** LIGHT THE BIN: set fire to the waste-paper bin under the detector. */
  const startFire = g.action('fire.start', [], [smoulder, calledFalse], () => {
    if (fireSize.peek() > 0 || smoulder.peek() > 0) return false;
    smoulder.set(SMOULDER_SECONDS);
    calledFalse.set(false);
    return true;
  });

  // ---- Climate ---------------------------------------------------------
  const outside = g.fixed('weather.outside', OUTSIDE_TEMPERATURE);
  const acPower = g.input('hvac.power', false, {
    where: 'AC controller ON/OFF',
  });
  const acMode = g.input('hvac.mode', 0, { where: 'AC controller MODE' });
  const acSetpoint = g.input('hvac.setpoint', 21, {
    where: 'AC controller up and down',
  });
  const thermostat = g.input('heating.thermostat', 20, {
    where: 'room thermostat dial',
  });
  const valve = g.input('heating.trv', 3, {
    where: 'thermostatic radiator valve',
  });
  const vent = g.input('window.vent', false, { where: 'window vent' });
  const blindsOpen = g.input('blinds.open', true, { where: 'blinds' });
  const temperature = g.state('room.temperature', 18);
  const acDuty = g.derive(
    'hvac.duty',
    [hvacSupply, acPower, acMode, acSetpoint, temperature],
    (supply, on, mode, set, t): -1 | 0 | 1 => {
      if (!supply || !on) return 0;
      const name = HVAC_MODES[mode] ?? 'auto';
      if ((name === 'heat' || name === 'auto') && t < set - 0.3) return 1;
      if ((name === 'cool' || name === 'auto') && t > set + 0.3) return -1;
      return 0;
    },
  );
  const acRunning = g.output(
    'hvac.running',
    [hvacSupply, acPower, acMode, acDuty],
    (supply, on, mode, duty) =>
      supply && on && (duty !== 0 || HVAC_MODES[mode] === 'fan'),
    { where: 'AC cassette' },
  );
  const calling = g.output(
    'heating.calling',
    [thermostat, temperature],
    (set, t) => t < set,
    { where: 'thermostat lamp' },
  );
  const radiatorHot = g.output(
    'heating.radiator',
    [calling, valve],
    (call, open) => (call ? open / 5 : 0),
    { where: 'radiator' },
  );
  g.process(
    'room heat',
    [outside, acDuty, radiatorHot, vent, blindsOpen],
    [temperature],
    (dt) => {
      const t = temperature.peek();
      // Losses to outside, worse with the vent open; a little sun through
      // open blinds; the radiator and the air conditioning.
      const loss = (vent.peek() ? 0.006 : 0.002) * (t - outside.peek());
      const sun = blindsOpen.peek() ? 0.004 : 0;
      const radiator = radiatorHot.peek() * 0.03;
      const ac = acDuty.peek() * 0.05;
      temperature.set(t + (sun + radiator + ac - loss) * dt);
    },
  );

  // ---- Access ----------------------------------------------------------
  const releasedFor = g.state('door.releasedFor', 0);
  const breakGlass = g.state('door.breakGlass', false);
  const doorOpen = g.state('door.open', false);
  const locked = g.output(
    'door.locked',
    [main, releasedFor, breakGlass, stage],
    (m, left, broken, s) => m && left <= 0 && !broken && s !== 'evacuate',
    { where: 'maglock and its reader LED' },
  );
  const openFor = g.state('door.openFor', 0);
  const doorShown = g.output('door.swing', [doorOpen], (open) => open, {
    where: 'door leaf',
  });
  g.process('door release', [], [releasedFor, doorOpen, openFor], (dt) => {
    releasedFor.set(Math.max(0, releasedFor.peek() - dt));
    if (doorOpen.peek()) {
      openFor.set(openFor.peek() + dt);
      // The closer brings it to after a few seconds.
      if (openFor.peek() > 5) doorOpen.set(false);
    } else openFor.set(0);
  });
  const presentCard = g.action('door.card', [], [releasedFor], () =>
    releasedFor.set(DOOR_RELEASE_SECONDS),
  );
  const pushToExit = g.action('door.exit', [], [releasedFor], () =>
    releasedFor.set(DOOR_RELEASE_SECONDS),
  );
  const breakDoorRelease = g.action('door.break', [], [breakGlass], () =>
    breakGlass.set(true),
  );
  const resetDoorRelease = g.action('door.break.reset', [], [breakGlass], () =>
    breakGlass.set(false),
  );
  /** Push or pull the door: opens if the lock lets it. */
  const workDoor = g.action('door.work', [locked], [doorOpen], () => {
    if (doorOpen.peek()) {
      doorOpen.set(false);
      return true;
    }
    if (locked.peek()) return false;
    doorOpen.set(true);
    return true;
  });

  // ---- Welfare ---------------------------------------------------------
  const wcAlarm = g.state('wc.alarm', false);
  const wcAlarmOn = g.output('wc.alarmOn', [wcAlarm], (a) => a, {
    where: 'over-door alarm light and buzzer',
  });
  const pullWcAlarm = g.action('wc.alarm.pull', [], [wcAlarm], () =>
    wcAlarm.set(true),
  );
  const resetWcAlarm = g.action('wc.alarm.reset', [], [wcAlarm], () =>
    wcAlarm.set(false),
  );

  // ---- Sockets ---------------------------------------------------------
  const socketLeft = g.input('socket.left', false, { where: 'left socket' });
  const socketRight = g.input('socket.right', true, { where: 'right socket' });
  const spur = g.input('spur', true, { where: 'fused spur' });
  const socketsLive = g.output(
    'sockets.live',
    [socketSupply, socketLeft, socketRight],
    (supply, l, r) => ({ left: supply && l, right: supply && r }),
    {
      where: 'socket tester lamps',
      equals: (a: { left: boolean; right: boolean }, b: typeof a) =>
        a.left === b.left && a.right === b.right,
    },
  );
  const spurLive = g.output(
    'spur.live',
    [socketSupply, spur],
    (supply, on) => supply && on,
    { where: 'fused spur neon' },
  );

  return {
    g,
    /** Advance `dt` seconds; `random` decides the investigation's finding. */
    tick: (dt: number, random?: () => number) => g.tick(dt, random),
    power: {
      main,
      lightingBreaker,
      socketsBreaker,
      hvacBreaker,
      tripLighting,
      tripZone,
      zoneBreakers,
      supplyCondition,
      supplyFeed,
      supplyVolts,
    },
    lighting: {
      switchDoor,
      switchFar,
      dimmer,
      emergencyTest,
      motion,
      occupied,
      roomLight,
      zoneSwitches,
      zoneOccupied,
      zoneUnseen: unseen,
      detectorTimeout,
      seen,
      zoneLight,
      zoneVolts,
      zoneEmergencyVolts,
      lightingVolts,
      emergencyVolts,
      emergencyLit,
      charging,
      exitSign,
      wcCord,
      wcLight,
    },
    fan: { running: fanRunning },
    fire: {
      panelKey,
      riserValve,
      callPoint,
      smoke,
      detector,
      stage,
      sounding,
      voice,
      announcement,
      doorsHeld,
      panelLamps,
      heads,
      discharging,
      flames,
      smokeShown,
      startFire,
      pressCallPoint,
      resetCallPoint,
      silence,
      evacuate,
      reset,
      resetSprinklers,
    },
    climate: {
      acPower,
      acMode,
      acSetpoint,
      acRunning,
      thermostat,
      calling,
      valve,
      radiatorHot,
      vent,
      blindsOpen,
      temperature,
    },
    access: {
      locked,
      doorOpen: doorShown,
      breakGlass,
      presentCard,
      pushToExit,
      breakDoorRelease,
      resetDoorRelease,
      workDoor,
    },
    welfare: { wcAlarmOn, pullWcAlarm, resetWcAlarm },
    sockets: { socketLeft, socketRight, spur, socketsLive, spurLive },
  };
}

export type BuildingServices = ReturnType<typeof createBuildingServices>;
