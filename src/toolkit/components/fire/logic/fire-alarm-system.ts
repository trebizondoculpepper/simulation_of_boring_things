import type { Graph, Node } from '../../core/logic/world/graph';

/**
 * The investigation period of a two-stage alarm (BS 5839-1): how long
 * the alert stage lasts after a detector, before full evacuation.
 */
export const INVESTIGATION_SECONDS = 90;
/** How long the all-clear lasts before the system is normal again. */
export const ALL_CLEAR_SECONDS = 10;
/** How fast smoke builds up at the detector, a second: a few seconds' worth. */
export const SMOKE_RISE = 0.06;
/** How fast smoke at the detector clears, a second. */
export const SMOKE_CLEARS = 0.03;
/** Smoke at the detector, 0 to 1, above which it goes into alarm. */
export const SMOKE_ALARM = 0.3;
/** A sprinkler head's glass bulb bursts at this temperature, °C. */
export const HEAD_OPENS_AT = 68;
/** The fire alarm's stages. */
export type FireStage = 'normal' | 'alert' | 'evacuate' | 'all-clear';

export interface SprinklerHead {
  burst: boolean;
  spraying: boolean;
}

/**
 * A building's fire alarm and sprinklers, as in a UK office or warehouse
 * (BS 5839-1 and -8, a two-stage alarm with a voice alarm), on a world
 * graph, set off by whatever fire its host models. The host says how much
 * smoke its fire is making at the detector, how hot the gas is at each
 * sprinkler head, and whether its fire is still alight; the system does
 * the rest.
 *
 * Smoke builds up at the detector over a few seconds and clears slowly;
 * above `SMOKE_ALARM` the detector goes into alarm and the alert stage
 * begins: the door holders let go and the voice alarm asks everyone to
 * stay where they are while it is investigated, for
 * `INVESTIGATION_SECONDS`. The investigation finds, at random, a fire
 * (full evacuation) or a false alarm; a false alarm called while the fire
 * is still alight lets its smoke set the detector off again, and that
 * second activation goes straight to evacuation. In evacuation the brigade
 * is called. A call point, or water flowing, goes straight to evacuation.
 * Each head's glass bulb bursts at 68 °C, whatever the panel says, and
 * sprays while the main valve is open. The panel's SILENCE quiets the
 * sounders and voice, RESOUND/EVACUATE sounds full evacuation, and RESET
 * clears it once nothing is still in alarm (no call point, no water, no
 * fire, the smoke cleared), with its key turned; then the all-clear is
 * announced. At the valve set, the main valve stops the water and RESET
 * replaces the burst heads.
 */
export function createFireAlarmSystem(
  g: Graph,
  {
    heads: headCount,
    mains,
    smokeTarget,
    alight,
    headTemperatures,
  }: {
    /** How many sprinkler heads there are. */
    heads: number;
    /** Whether the building's mains is on (the panel is on battery if not). */
    mains: Node<boolean>;
    /** The smoke the host's fire makes at the detector, 0 to 1. */
    smokeTarget: Node<number>;
    /** Whether the host's fire is still alight, smouldering included. */
    alight: Node<boolean>;
    /** The hot gas at each sprinkler head, °C. */
    headTemperatures: Node<readonly number[]>;
  },
) {
  const panelKey = g.input('fire.panel.key', false, {
    where: 'fire panel access key',
  });
  const riserValve = g.input('sprinkler.main', true, {
    where: 'sprinkler main valve',
  });
  const callPoint = g.state('fire.callPoint', false);
  /**
   * What the investigation will find (decided, at random, when the alert
   * begins): a fire, or a false alarm.
   */
  const willFindFire = g.state('fire.willFindFire', true);
  /** A false alarm has been called while the fire was still alight. */
  const calledFalse = g.state('fire.calledFalse', false);
  const smoke = g.state('fire.smoke', 0);
  const detector = g.state('fire.detector', false);
  const silenced = g.state('fire.silenced', false);
  const brigade = g.state('fire.brigade', false);
  const stage = g.state<FireStage>('fire.stage', 'normal');
  const investigation = g.state('fire.investigation', 0);
  const allClearFor = g.state('fire.allClearFor', 0);
  /** One-off announcements, numbered so a repeat is heard as new. */
  const message = g.state<{
    kind: 'false-alarm' | 'all-clear' | null;
    n: number;
  }>('fire.message', { kind: null, n: 0 });
  /** Each sprinkler head's glass bulb: burst, or whole. */
  const bulbs = g.state<boolean[]>(
    'sprinkler.bulbs',
    Array.from({ length: headCount }, () => false),
    { equals: (a: boolean[], b: boolean[]) => a.every((v, i) => v === b[i]) },
  );
  const heads = g.output(
    'sprinkler.heads',
    [bulbs, riserValve],
    (burst, open): SprinklerHead[] =>
      burst.map((b) => ({ burst: b, spraying: b && open })),
    {
      where: 'sprinkler heads',
      equals: (a: SprinklerHead[], b: SprinklerHead[]) =>
        a.every(
          (h, i) => h.burst === b[i].burst && h.spraying === b[i].spraying,
        ),
    },
  );
  const discharging = g.output(
    'sprinkler.discharge',
    [heads],
    (hs) => hs.some((h) => h.spraying),
    { where: 'sprinkler flow switch and alarm bell' },
  );
  const fire = g.derive(
    'fire.fire',
    [callPoint, detector, discharging],
    (c, d, flow) => c || d || flow,
  );
  const alarm = g.derive(
    'fire.alarm',
    [stage],
    (s) => s === 'alert' || s === 'evacuate',
  );
  const sounding = g.output(
    'fire.sounding',
    [alarm, silenced],
    (a, s) => a && !s,
    { where: 'sounder-beacons' },
  );
  const voice = g.output(
    'fire.voice',
    [stage, silenced],
    (s, quiet): 'alert' | 'evacuate' | null =>
      quiet ? null : s === 'alert' || s === 'evacuate' ? s : null,
    { where: 'voice alarm speakers' },
  );
  const announcement = g.output('fire.announcement', [message], (m) => m, {
    where: 'voice alarm speakers',
  });
  const doorsHeld = g.output(
    'fire.doorsHeld',
    [alarm, mains],
    (a, m) => !a && m,
    { where: 'door holders' },
  );
  const smokeShown = g.output('fire.smokeShown', [smoke], (s) => s, {
    where: 'smoke under the ceiling',
  });
  const panelLamps = g.output(
    'fire.panel.lamps',
    [
      fire,
      callPoint,
      detector,
      discharging,
      stage,
      investigation,
      silenced,
      brigade,
      mains,
      panelKey,
    ],
    (f, c, d, flow, s, left, quiet, called, m, key) => ({
      fire: f,
      zone1: c,
      zone2: d || flow,
      alarm: s === 'alert' || s === 'evacuate',
      stage: s,
      countdown: Math.ceil(left),
      sprinkler: flow,
      brigade: called,
      silenced: quiet,
      power: true,
      onBattery: !m,
      enabled: key,
    }),
    {
      where: 'fire alarm panel',
      equals: (a: Record<string, unknown>, b: Record<string, unknown>) =>
        Object.keys(a).every((k) => a[k] === b[k]),
    },
  );
  const announce = (kind: 'false-alarm' | 'all-clear') =>
    message.set({ kind, n: message.peek().n + 1 });
  const finish = (kind: 'false-alarm' | 'all-clear') => {
    stage.set('all-clear');
    allClearFor.set(ALL_CLEAR_SECONDS);
    silenced.set(false);
    brigade.set(false);
    announce(kind);
  };
  g.process(
    'fire alarm',
    [
      riserValve,
      callPoint,
      smokeTarget,
      alight,
      headTemperatures,
      willFindFire,
      calledFalse,
      allClearFor,
      investigation,
      stage,
    ],
    [
      willFindFire,
      calledFalse,
      smoke,
      detector,
      bulbs,
      stage,
      investigation,
      brigade,
      allClearFor,
      silenced,
      message,
    ],
    (dt, random) => {
      // Heat at each head: a head's bulb bursts at 68 °C.
      const burst = bulbs.peek();
      const hot = headTemperatures.peek();
      const next = burst.map((b, i) => b || hot[i] >= HEAD_OPENS_AT);
      if (next.some((b, i) => b !== burst[i])) bulbs.set(next);
      // Smoke builds up over a few seconds and clears slowly.
      const target = smokeTarget.peek();
      const now = smoke.peek();
      smoke.set(
        target > now
          ? Math.min(target, now + dt * SMOKE_RISE)
          : Math.max(target, now - dt * SMOKE_CLEARS),
      );
      if (smoke.peek() > SMOKE_ALARM) detector.set(true);
      // The fire alarm's stages.
      const flow = next.some((b) => b) && riserValve.peek();
      switch (stage.peek()) {
        case 'normal':
          if (callPoint.peek() || flow) {
            stage.set('evacuate');
            silenced.set(false);
          } else if (detector.peek()) {
            // A second activation after a false alarm is not investigated
            // again: everyone leaves.
            if (calledFalse.peek()) stage.set('evacuate');
            else {
              stage.set('alert');
              investigation.set(INVESTIGATION_SECONDS);
              willFindFire.set(random() < 0.5);
            }
            silenced.set(false);
          }
          break;
        case 'alert':
          investigation.set(Math.max(0, investigation.peek() - dt));
          if (callPoint.peek() || flow) {
            stage.set('evacuate');
            silenced.set(false);
          } else if (investigation.peek() <= 0) {
            if (willFindFire.peek()) {
              stage.set('evacuate');
              silenced.set(false);
            } else {
              // Called a false alarm, and the panel reset, though the fire
              // may still be alight: its smoke will soon be back.
              detector.set(false);
              smoke.set(Math.min(smoke.peek(), SMOKE_ALARM * 0.5));
              calledFalse.set(alight.peek());
              finish('false-alarm');
            }
          }
          break;
        case 'evacuate':
          // The panel calls the fire brigade (an alarm receiving centre).
          if (!brigade.peek()) brigade.set(true);
          break;
        case 'all-clear':
          allClearFor.set(allClearFor.peek() - dt);
          if (allClearFor.peek() <= 0) stage.set('normal');
          break;
      }
    },
  );
  const pressCallPoint = g.action('fire.callPoint.press', [], [callPoint], () =>
    callPoint.set(true),
  );
  const resetCallPoint = g.action('fire.callPoint.reset', [], [callPoint], () =>
    callPoint.set(false),
  );
  /** SILENCE: quiet the sounders and the voice, with the key turned. */
  const silence = g.action(
    'fire.panel.silence',
    [panelKey, alarm],
    [silenced],
    () => {
      if (!panelKey.peek() || !alarm.peek()) return false;
      silenced.set(true);
      return true;
    },
  );
  /** RESOUND or EVACUATE: sound full evacuation, with the key turned. */
  const evacuate = g.action(
    'fire.panel.evacuate',
    [panelKey],
    [stage, silenced],
    () => {
      if (!panelKey.peek()) return false;
      stage.set('evacuate');
      silenced.set(false);
      return true;
    },
  );
  /**
   * RESET, with the key turned. It succeeds only once nothing is still in
   * alarm: no call point latched, no water flowing, no fire and the smoke
   * cleared; then the voice gives the all-clear.
   */
  const reset = g.action(
    'fire.panel.reset',
    [panelKey, smoke, alight, callPoint, discharging],
    [detector, stage, silenced, brigade, allClearFor, message],
    () => {
      if (!panelKey.peek()) return false;
      const clear =
        !callPoint.peek() &&
        !discharging.peek() &&
        !alight.peek() &&
        smoke.peek() <= SMOKE_ALARM;
      if (!clear) return false;
      detector.set(false);
      if (stage.peek() === 'normal') return true;
      finish('all-clear');
      return true;
    },
  );
  /** At the valve set: replace the burst heads (shut the main valve first). */
  const resetSprinklers = g.action('sprinkler.reset', [], [bulbs], () =>
    bulbs.set(Array.from({ length: headCount }, () => false)),
  );
  /**
   * A head fails and sprays, whatever the heat: struck by something, or a
   * cracked bulb. Its water sets the system off like any other.
   */
  const fail = g.action('sprinkler.fail', [], [bulbs], (i: number) => {
    if (bulbs.peek()[i]) return false;
    bulbs.set(bulbs.peek().map((b, j) => b || j === i));
    return true;
  });
  /** Put the whole system back as installed (development and scenarios). */
  const restore = g.action(
    'fire.restore',
    [],
    [
      callPoint,
      calledFalse,
      smoke,
      detector,
      silenced,
      brigade,
      stage,
      investigation,
      allClearFor,
      bulbs,
    ],
    () => {
      callPoint.set(false);
      calledFalse.set(false);
      smoke.set(0);
      detector.set(false);
      silenced.set(false);
      brigade.set(false);
      stage.set('normal');
      investigation.set(0);
      allClearFor.set(0);
      bulbs.set(Array.from({ length: headCount }, () => false));
    },
  );
  return {
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
    fail,
    restore,
  };
}

export type FireAlarmSystem = ReturnType<typeof createFireAlarmSystem>;
