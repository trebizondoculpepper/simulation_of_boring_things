import type { World, WorldAction } from '../world';
import type { Reading } from '../../toolkit/components/industrial-control/logic/mimic';
import { INSTALLED_VALVES } from './installed-valves';
import { INSTALLED_FIXTURES } from './installed-fixtures';
import { MODEL_VALVES } from './model-valves';
import { componentDescription, plantInventory } from './equipment-catalogue';
import { SCHEMATICS } from './schematics';
import { loungeFlowsOf, loungeMeterReadings } from './lounge-valves';
import { olympicFlowsOf, olympicMeterReadings } from './olympic-battery';

/**
 * What a part inside a component is, for the information overlay (prompt
 * 068): a button, a lamp or a readout on a panel, said in its own words
 * rather than its panel's. Its description is typed, never parsed from a
 * painted legend or a mesh's name: a command carries the very world action
 * its press sends, so what it does and what it is said to do cannot drift
 * apart; a reading carries the selector that draws its display; a lamp the
 * condition that lights it. The words are made here from those, the first
 * line what can be proved, the second only where the model has it. Pure.
 */

export type PartDescription =
  | {
      kind: 'command';
      /** What is printed on it: OPEN, START. */
      label: string;
      /** The action its press sends, the same object. */
      action: WorldAction;
    }
  | {
      kind: 'reading';
      /** What it is: "F1 FLOW readout". */
      label: string;
      /** What it shows now, as its display shows it, or none. */
      read: (world: World) => Reading | undefined;
      /** What it measures, where the model says. */
      context?: (world: World) => string | undefined;
    }
  | {
      kind: 'setting';
      /** What it is: "HAND · OFF · AUTO selector". */
      label: string;
      /** What it sets: "P-201A’s starter". */
      of: string;
      /** Where it stands now, as its positions are printed. */
      current: (world: World) => string;
    }
  | {
      /**
       * Any working part, as it shows itself (prompt 068): its name, and
       * what can be seen of it (a lamp lit, a selector's position), no
       * more (the owner, 2026-10-25). Every part has this from its
       * builder's library until something richer is given.
       */
      kind: 'visible';
      label: string;
      shows?: () => string | undefined;
    }
  | {
      /** A control of its own panel only, which touches no plant: a LAMP TEST. */
      kind: 'local';
      label: string;
      /** What it does, in its builder's words. */
      does: string;
    }
  | {
      kind: 'indicator';
      /** What is printed by it: RUN. */
      label: string;
      /** The condition that lights it, in words: "P-201A running". */
      condition: string;
      lit: (world: World) => boolean;
    };

export interface PartLines {
  title: string;
  detail?: string;
}

/** A registered item's name, by its tag. */
let names: Map<string, string> | undefined;
const nameOf = (tag: string) => {
  names ??= new Map(plantInventory().map((e) => [e.id, e.name]));
  return names.get(tag);
};

/** A valve's plate's tag, by the asset id the world keeps it under. */
export const valveTagOf = (assetId: string): string | undefined =>
  Object.values(INSTALLED_VALVES).find((v) => v.assetId === assetId)?.tag ||
  MODEL_VALVES.find((v) => v.id === assetId)?.tag ||
  undefined;

/** A number as a display shows it: its places, its sign. */
export const formatReading = (r: Reading) =>
  `${r.value.toFixed(r.places ?? 0)} ${r.unit === 'm3/h' ? 'm³/h' : r.unit}`;

/**
 * What a command does, in words: a request, since an interlock or a dead
 * supply may refuse it. Only what the panel itself tells the player: what
 * it commands, and what its target is for (a fixed fact, as a schedule
 * would give it), never the target's state now, which the button does
 * not show (the owner, 2026-10-25: the overlay reads what is shown, and
 * gives no peek into the model).
 */
function commandLines(label: string, action: WorldAction): PartLines {
  const button = `${label} button`;
  if (action.type === 'plant/valve') {
    const tag = valveTagOf(action.id);
    if (!tag) return { title: button };
    const about = componentDescription(tag);
    return {
      title: `${button} — Requests ${tag} to ${action.open ? 'open' : 'shut'}.`,
      ...(about ? { detail: `${tag}: ${about}` } : {}),
    };
  }
  if (action.type === 'motor/starter') {
    const act = action.action.act;
    const name = nameOf(action.tag);
    const detail = name ? `${action.tag}: ${name}.` : undefined;
    if (act === 'reset')
      return {
        title: `${button} — Requests ${action.tag}’s trip be reset.`,
        ...(detail ? { detail } : {}),
      };
    if (act !== 'start' && act !== 'stop') return { title: button };
    return {
      title: `${button} — Requests ${action.tag} to ${act}.`,
      ...(detail ? { detail } : {}),
    };
  }
  if (action.type === 'air/unit') {
    const act = action.action.act;
    if (act === 'reset')
      return { title: `${button} — Requests ${action.tag}’s fault be reset.` };
    if (act === 'filters')
      return {
        title: `${button} — Tells ${action.tag}’s controller its filters have been changed.`,
      };
  }
  return { title: button };
}

/** A part's two lines, live from `world` where it is given. */
export function describePart(part: PartDescription, world?: World): PartLines {
  switch (part.kind) {
    case 'command':
      return commandLines(part.label, part.action);
    case 'reading': {
      const r = world ? part.read(world) : undefined;
      const context = world ? part.context?.(world) : undefined;
      return {
        title: r
          ? `${part.label} — ${part.label.startsWith(r.name) ? '' : `${r.name}, `}currently reading ${formatReading(r)}.`
          : `${part.label} — no reading.`,
        ...(context ? { detail: context } : {}),
      };
    }
    case 'setting':
      return {
        title: `${part.label} — Sets ${part.of}${world ? `: now ${part.current(world)}.` : '.'}`,
      };
    case 'visible': {
      const shown = part.shows?.();
      return { title: shown ? `${part.label} — ${shown}.` : `${part.label}.` };
    }
    case 'local':
      return { title: `${part.label} — ${part.does}` };
    case 'indicator': {
      const lit = world ? part.lit(world) : undefined;
      return {
        title: `${part.label} lamp — Lights for ${part.condition}${lit === undefined ? '.' : `: ${lit ? 'lit' : 'out'} now.`}`,
      };
    }
  }
}

/** A flowmeter's reading in its room's flows, by its tag, signed: up its outlet positive. */
export function flowmeterReading(
  world: World,
  tag: string,
): number | undefined {
  const fixture = INSTALLED_FIXTURES[tag];
  if (!fixture || fixture.kind !== 'flowmeter') return undefined;
  const n = /-F(\d)-FT1$/.exec(tag)?.[1];
  const key = n ? `filter-${n}` : 'pumps';
  const readings =
    fixture.room === 'plant_pool_01'
      ? loungeMeterReadings(loungeFlowsOf(world))
      : fixture.room === 'plant_pool_02'
        ? olympicMeterReadings(olympicFlowsOf(world))
        : {};
  return readings[key];
}

/**
 * A flowmeter's two lines: its reading as its display shows it, and where
 * it is installed, from its link in its room's model.
 */
export function flowmeterLines(world: World, tag: string): PartLines | null {
  const value = flowmeterReading(world, tag);
  if (value === undefined) return null;
  // As its display shows it: the size, and an arrow for the way (`mag-flowmeter.ts`).
  const title = `${tag} — Flowmeter, currently reading ${Math.abs(value).toFixed(1)} m³/h.`;
  const fixture = INSTALLED_FIXTURES[tag];
  const schematic = Object.values(SCHEMATICS).find(
    (s) => s.room === fixture.room,
  );
  const fitting = schematic?.fittings.find((f) => f.id === tag);
  const link = fitting && schematic?.links.find((l) => l.id === fitting.edge);
  const name = (id: string) =>
    `the ${schematic?.nodes.find((n) => n.id === id)?.name.toLowerCase() ?? id}`;
  const flowing = Math.abs(value) > 0.05;
  if (!link)
    // No route in a model: the arrow's way only, as the display shows it.
    return {
      title,
      detail: flowing
        ? `The direction arrow points ${value > 0 ? 'forward (->)' : 'back (<-)'}.`
        : fixture.purpose,
    };
  // What the arrow says, in the plant's words (the owner, 2026-10-25): the
  // two ends of the pipe it is installed on, which the player can see.
  const [from, to] =
    value >= 0
      ? [link.sourceId, link.targetId]
      : [link.targetId, link.sourceId];
  const commodity = link.medium === 'chemical' ? 'chemical' : link.medium;
  return {
    title,
    detail: flowing
      ? `The direction arrow indicates ${commodity} is flowing from ${name(from)} to ${name(to)}.`
      : `No flow shown; installed between ${name(link.sourceId)} and ${name(link.targetId)}.`,
  };
}
