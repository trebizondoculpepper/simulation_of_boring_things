import { expandForPlumbing } from './plumbing-expansion';
import type {
  ExpandOptions,
  Expansion,
  GivenFitting,
  PlumbEdge,
  PlumbNode,
} from './plumbing-expansion';
import { JACUZZI_SCHEMATIC } from './jacuzzi-schematic';
import { FOOTBATH_SCHEMATIC } from './footbath-schematic';
import { LOUNGE_SCHEMATIC } from './lounge-schematic';
import { WET_HALL_SCHEMATIC } from './wet-hall-schematic';
import { BOILER_HOUSE_SCHEMATIC } from './boiler-house-schematic';

/**
 * The rooms' schematics (prompt 064): for each room built from its model,
 * its machines, the links between them as its runs are drawn, and every
 * valve and isolator on them. The plumber expands each and should add
 * nothing; everything the room draws is bound to it. Pure.
 */

/** A machine of a room, with the code its tag is built from (PL3-CAB1). */
export interface SchematicNode extends PlumbNode {
  /** Its tag's code within the room: CAB1, BT1; none for a boundary. */
  code?: string;
  name: string;
}

/** A schematic's fitting: what it is for, how it is worked, and where the world keeps its state. */
export type SchematicFitting = GivenFitting & {
  role?: string;
  /**
   * Where the world keeps it, if not among the model's installed valves:
   * the identified model (`identification.ts`), its id that model's tag;
   * or the installed valves' register (`installed-valves.ts`), under its
   * asset id and plate, for a room whose valves are not yet retagged.
   */
  keptBy?: 'identified' | 'register';
};

export interface RoomSchematic {
  room: string;
  /** The room's code, the first part of its tags: PL3. */
  code: string;
  nodes: readonly SchematicNode[];
  links: readonly PlumbEdge[];
  fittings: readonly SchematicFitting[];
  /** The plumber's rules for the room, its schematic's fittings given. */
  rules: Omit<ExpandOptions, 'given'>;
}

export const SCHEMATICS: Readonly<Record<string, RoomSchematic>> = {
  [JACUZZI_SCHEMATIC.room]: JACUZZI_SCHEMATIC,
  [FOOTBATH_SCHEMATIC.room]: FOOTBATH_SCHEMATIC,
  [LOUNGE_SCHEMATIC.room]: LOUNGE_SCHEMATIC,
  [WET_HALL_SCHEMATIC.room]: WET_HALL_SCHEMATIC,
  [BOILER_HOUSE_SCHEMATIC.room]: BOILER_HOUSE_SCHEMATIC,
};

const expanded = new Map<string, Expansion>();
/** A room's enhanced network: its schematic, expanded by the plumber. */
export function schematicExpansion(room: string): Expansion | undefined {
  const s = SCHEMATICS[room];
  if (!s) return undefined;
  if (!expanded.has(room))
    expanded.set(
      room,
      expandForPlumbing(s.nodes, s.links, { ...s.rules, given: s.fittings }),
    );
  return expanded.get(room);
}
