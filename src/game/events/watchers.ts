import type { World } from '../world';
import type { GameEvent, GameEventSeverity } from './game-event';
import { MOTOR_TAGS, MOTORS } from '../plant/motor-starters';
import { POOL_IDS } from '../plant/pools';
import { GAS_ZONE_IDS } from '../plant/gas';
import { LIGHTING_ZONE_IDS } from '../plant/lighting';

/**
 * What the plant does by itself (`doc/prompts/done/058-developer-console.md`):
 * watchers, each picking one small value from the world and saying what
 * its change means, run on the world before and after each step. Each
 * fires once on a change, never on a steady state. Pure.
 */

interface Said {
  subject: string;
  text: string;
  severity?: GameEventSeverity;
}

interface Watcher<T> {
  pick(w: World): T;
  /** What the change from `was` to `now` means, or nothing. */
  say(was: T, now: T): Said | null;
}

const watch = <T>(w: Watcher<T>) => w as Watcher<unknown>;

const WATCHERS: readonly Watcher<unknown>[] = [
  ...MOTOR_TAGS.map((tag) =>
    watch({
      pick: (w) => {
        const s = w.motors.starters[tag];
        return `${s.running ? 'run' : 'stop'}${s.tripped ? '-trip' : ''}`;
      },
      say: (was, now) => {
        const pump = `${MOTORS[tag].role} pump, ${MOTORS[tag].pool}`;
        if (now.endsWith('-trip') && !was.endsWith('-trip'))
          return { subject: tag, text: `${pump}: TRIPPED`, severity: 'alarm' };
        if (now === 'run') return { subject: tag, text: `${pump}: running` };
        if (now === 'stop' && was === 'run')
          return { subject: tag, text: `${pump}: stopped` };
        if (was.endsWith('-trip') && !now.endsWith('-trip'))
          return { subject: tag, text: `${pump}: trip cleared` };
        return null;
      },
    }),
  ),
  ...POOL_IDS.map((pool) =>
    watch({
      pick: (w) => w.pools[pool].tripped,
      say: (_was, now) =>
        now
          ? {
              subject: pool,
              text: 'pumps TRIPPED: balance tank at low-low level',
              severity: 'alarm',
            }
          : { subject: pool, text: 'low-low level trip cleared' },
    }),
  ),
  watch({
    pick: (w) => w.jacuzziCabinet.trip,
    say: (_was, now) =>
      now
        ? {
            subject: 'JAC-CAB',
            text: `jacuzzi cabinet TRIPPED: ${now.toUpperCase().replace('-', ' ')}`,
            severity: 'alarm',
          }
        : { subject: 'JAC-CAB', text: 'jacuzzi cabinet trip cleared' },
  }),
  watch({
    pick: (w) => w.wetHall.boosterTripped,
    say: (_was, now) =>
      now
        ? { subject: 'BOOSTER', text: 'booster set TRIPPED', severity: 'alarm' }
        : { subject: 'BOOSTER', text: 'booster set trip cleared' },
  }),
  watch({
    pick: (w) => w.boilerGas.ssovOpen,
    say: (_was, now) =>
      now
        ? { subject: 'BOILER-GAS', text: 'safety shut-off valve open' }
        : {
            subject: 'BOILER-GAS',
            text: 'safety shut-off valve SHUT: gas to the boilers off',
            severity: 'alarm',
          },
  }),
  watch({
    pick: (w) => w.boilerGas.gasDetected,
    say: (_was, now) =>
      now
        ? { subject: 'BOILER-GAS', text: 'GAS DETECTED', severity: 'alarm' }
        : { subject: 'BOILER-GAS', text: 'gas clear' },
  }),
  ...GAS_ZONE_IDS.map((zone) =>
    watch({
      pick: (w) => {
        const g = w.gas[zone].state;
        return g.a2 ? 2 : g.a1 ? 1 : 0;
      },
      say: (was, now) =>
        (now as number) > (was as number)
          ? {
              subject: zone,
              text: `gas ALARM ${now as number}`,
              severity: 'alarm',
            }
          : now === 0
            ? { subject: zone, text: 'gas alarms cleared' }
            : null,
    }),
  ),
  ...LIGHTING_ZONE_IDS.map((zone) =>
    watch({
      pick: (w) => w.lighting.supply && w.lighting.zones[zone],
      say: (_was, now) => ({
        subject: `LTG ${zone}`,
        text: now ? 'lights on' : 'lights out',
        severity: now ? 'info' : 'notice',
      }),
    }),
  ),
];

/** How many watchers there are, for tests. */
export const WATCHER_COUNT = WATCHERS.length;

/** What changed from `before` to `after`, a line each. */
export function diffWorld(before: World, after: World): GameEvent[] {
  if (before === after) return [];
  const found: GameEvent[] = [];
  for (const w of WATCHERS) {
    const was = w.pick(before);
    const now = w.pick(after);
    if (was === now) continue;
    const said = w.say(was, now);
    if (said)
      found.push({
        time: after.time,
        kind: 'plant',
        severity: said.severity ?? 'info',
        ...said,
      });
  }
  return found;
}
