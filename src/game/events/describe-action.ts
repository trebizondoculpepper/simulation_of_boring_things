import type { World, WorldAction } from '../world';
import type { GameEvent } from './game-event';
import { INSTALLED_VALVES } from '../plant/installed-valves';
import { identifiedPart } from '../plant/identification';
import { MOTORS } from '../plant/motor-starters';

/**
 * A line for an action done to the world (`doc/prompts/058-developer-console.md`):
 * what was done, said as a plant logbook would, and "no change" when it
 * changed nothing. Every action has one: the switch is exhaustive, so a
 * new action without a line does not compile. Pure.
 */

/** Each installed valve's run and name, by its asset id and its tag. */
const INSTALLED_NAMES = new Map<string, { tag: string; name: string }>();
for (const [key, valve] of Object.entries(INSTALLED_VALVES)) {
  const [room, run, name] = key.split('|');
  const label = { tag: valve.tag, name: `${name} (${run}, ${room})` };
  INSTALLED_NAMES.set(valve.assetId, label);
  INSTALLED_NAMES.set(valve.tag, label);
}

/** A part's tag and what it is called, by any id a command may give. */
export function partLabel(world: World, id: string) {
  const installed = INSTALLED_NAMES.get(id);
  if (installed) return installed;
  try {
    const part = identifiedPart(world.identifiedPlant, id);
    if (part) return { tag: part.id, name: part.name };
  } catch {
    // An unreadable model names nothing.
  }
  return { tag: id, name: id };
}

const onOff = (on: boolean) => (on ? 'on' : 'off');
const openShut = (open: boolean) => (open ? 'opened' : 'shut');

/** Subject and text for an action, before anything is said about change. */
function said(
  before: World,
  action: WorldAction,
  after: World,
): { subject: string; text: string; severity?: GameEvent['severity'] } {
  switch (action.type) {
    case 'demo/set':
      return {
        subject: 'dev14',
        text: `demonstration button ${onOff(action.on)}`,
      };
    case 'demo/reset':
      return { subject: 'dev14', text: 'demonstration button reset' };
    case 'plant/source':
      return {
        subject: action.utility.toUpperCase(),
        text: `${action.utility} supply to the plant ${onOff(action.on)}`,
        severity: action.on ? 'info' : 'notice',
      };
    case 'plant/feeder':
      return {
        subject: action.room,
        text: `electrical feeder ${onOff(action.on)}`,
        severity: action.on ? 'info' : 'notice',
      };
    case 'plant/isolator':
      return {
        subject: action.name,
        text: action.on ? 'isolator on' : 'isolator off, locked',
      };
    case 'plant/delivery':
      return {
        subject: action.chemical,
        text: `${action.litres} L delivered`,
      };
    case 'plant/booster-reset':
      return { subject: 'BOOSTER', text: 'booster set RESET' };
    case 'plant/full-off':
      return {
        subject: 'PLANT',
        text: 'FULL OFF: every service shut down',
        severity: 'notice',
      };
    case 'plant/full-on':
      return { subject: 'PLANT', text: 'FULL ON: every service on' };
    case 'plant/slow-start':
      return { subject: 'PLANT', text: 'SLOW START begun' };
    case 'weather/ambient':
      return { subject: 'WEATHER', text: `outside ${action.celsius} °C` };
    case 'lighting/supply':
      return {
        subject: 'DB-LIGHTING',
        text: `lighting supply ${onOff(action.on)}`,
        severity: action.on ? 'info' : 'notice',
      };
    case 'lighting/zone':
      return {
        subject: `LTG ${action.zone}`,
        text: `lighting zone ${onOff(action.on)}`,
      };
    case 'gas/leak':
      return {
        subject: action.zone,
        text:
          action.gramsPerHour > 0
            ? `gas leaking, ${action.gramsPerHour} g/h`
            : 'gas leak stopped',
        severity: action.gramsPerHour > 0 ? 'notice' : 'info',
      };
    case 'gas/act':
      return {
        subject: action.zone,
        text:
          action.act === 'accept'
            ? 'gas alarm accepted'
            : action.act === 'reset'
              ? 'gas alarm RESET'
              : 'chemicals misdelivered: gas released',
        severity: action.act === 'misdeliver' ? 'alarm' : 'info',
      };
    case 'plant/valve': {
      const { tag, name } = partLabel(before, action.id);
      return { subject: tag, text: `${name}: valve ${openShut(action.open)}` };
    }
    case 'plant/switch': {
      const { tag, name } = partLabel(before, action.id);
      return { subject: tag, text: `${name}: switched ${onOff(action.on)}` };
    }
    case 'olympic/makeup':
      return {
        subject: 'PL2-T1',
        text: `Olympic balance tank make-up to ${action.mode.toUpperCase()}`,
      };
    case 'pool/drain-down':
      return {
        subject: action.pool,
        text: `drain-down ${action.open ? 'opened to waste' : 'shut'}`,
        severity: action.open ? 'notice' : 'info',
      };
    case 'pool/make-up':
      return { subject: action.pool, text: `make-up ${openShut(action.open)}` };
    case 'pool/setpoint':
      return {
        subject: action.pool,
        text: `thermostat set to ${after.pools[action.pool].setpoint} °C`,
      };
    case 'time/skip':
      return { subject: 'TIME', text: `skipped ${action.seconds} s on` };
    case 'air/unit': {
      const a = action.action;
      return {
        subject: action.tag,
        text:
          a.act === 'isolator'
            ? `isolator ${onOff(a.on)}`
            : a.act === 'mode'
              ? `mode to ${a.mode.toUpperCase()}`
              : a.act === 'reset'
                ? 'RESET'
                : 'filters changed',
      };
    }
    case 'air/occupied':
      return {
        subject: `AIR ${action.hall}`,
        text: action.on ? 'hall occupied' : 'hall unoccupied',
      };
    case 'motor/starter': {
      const a = action.action;
      const was = before.motors.starters[action.tag];
      const now = after.motors.starters[action.tag];
      const what =
        a.act === 'mode'
          ? `selector to ${a.mode.toUpperCase()}`
          : `${a.act.toUpperCase()} pressed`;
      const result =
        was.running !== now.running
          ? now.running
            ? ', running'
            : ', stopped'
          : was.tripped && !now.tripped
            ? ', trip cleared'
            : '';
      return {
        subject: action.tag,
        text: `${MOTORS[action.tag].role} pump starter: ${what}${result}`,
      };
    }
    case 'motor/stop':
      return {
        subject: `${action.pool} MCC`,
        text: action.stopped
          ? 'EMERGENCY STOP struck: every motor stopped'
          : 'emergency stop released',
        severity: action.stopped ? 'alarm' : 'info',
      };
    case 'jacuzzi': {
      const a = action.action;
      return {
        subject: 'pool_03',
        text:
          a.act === 'toggle'
            ? `jacuzzi ${a.what} ${after.jacuzzi[a.what] ? 'started' : 'stopped'}`
            : a.act === 'start'
              ? `jacuzzi START: ${after.jacuzzi.jets ? 'jets and air on' : 'refused'}`
              : 'jacuzzi STOP',
      };
    }
    case 'spa-filter': {
      const f = after.spaFilters[action.pool];
      const cabinet = action.pool === 'pool_03' ? 'PL3-CAB1' : 'PL4-CAB1';
      return {
        subject: cabinet,
        text:
          action.action.act === 'mode'
            ? `filter backwash schedule ${f.schedule === 'off' ? 'OFF' : `every ${f.schedule}`}`
            : 'filter WASH NOW',
      };
    }
    case 'jacuzzi/cabinet': {
      const a = action.action;
      return {
        subject: 'JAC-CAB',
        text:
          a.act === 'power'
            ? `jacuzzi cabinet POWER ${onOff(a.on)}`
            : `jacuzzi cabinet RESET${after.jacuzziCabinet.trip ? ': still tripped' : ''}`,
      };
    }
    case 'jacuzzi/fibre-illuminator': {
      const a = action.action;
      return {
        subject: 'JAC-FIBRE',
        text: `fibre illuminator ${a.control} ${typeof a.value === 'boolean' ? onOff(a.value) : a.value}`,
      };
    }
    case 'boiler-gas': {
      const a = action.action;
      return {
        subject: 'BOILER-GAS',
        text:
          a.act === 'stop'
            ? a.pressed
              ? 'boiler house EMERGENCY STOP struck'
              : 'boiler house emergency stop released'
            : a.act === 'reset'
              ? `GAS RESET${after.boilerGas.ssovOpen ? ': SSOV open' : ': SSOV still shut'}`
              : a.act === 'ecv'
                ? `emergency control valve ${openShut(a.open)}`
                : 'gas detector TEST',
        severity: a.act === 'stop' && a.pressed ? 'alarm' : 'info',
      };
    }
    case 'music': {
      const a = action.action;
      return {
        subject: `MUSIC ${a.zone}`,
        text:
          a.type === 'toggle'
            ? 'music switched'
            : a.type === 'volume'
              ? `volume ${a.volume}`
              : 'next track',
      };
    }
  }
}

/**
 * Whether an action changed the world: some give a new world with the same
 * contents, so the parts that are new objects are compared by content.
 */
export function changed(before: World, after: World) {
  if (before === after) return false;
  return (Object.keys(after) as (keyof World)[]).some(
    (key) =>
      before[key] !== after[key] &&
      JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

/** The line for `action`, done to `before` and giving `after`. */
export function describeAction(
  before: World,
  action: WorldAction,
  after: World,
  by: 'you' | 'console' = 'you',
): GameEvent {
  const s = said(before, action, after);
  return {
    time: after.time,
    kind: 'action',
    severity: s.severity ?? 'info',
    subject: s.subject,
    text: changed(before, after) ? s.text : `${s.text}: no change`,
    by,
  };
}
