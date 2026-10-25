import type { World } from '../world';
import { plantInventory } from './equipment-catalogue';
import { describeForWorld } from './component-status';
import { componentDescription } from './equipment-catalogue';
import { describePart, flowmeterLines } from './part-inspection';
import type { PartDescription } from './part-inspection';

/**
 * What the information overlay says of a component (prompt 061): its
 * plate's tag and its name on the first line, and its description (prompt
 * 060) on the second, live where the world is given; the second line left
 * out where nothing is known of it. A thing with no tag shows its name
 * alone; a tag no register holds shows the name it is marked with, or
 * nothing. Pure.
 */

export interface ComponentInspection {
  key: string;
  title: string;
  detail?: string;
}

/** Each registered tag's name, built once: the plant's layout is fixed. */
let names: Map<string, string> | undefined;
const nameOf = (tag: string) => {
  names ??= new Map(plantInventory().map((e) => [e.id, e.name]));
  return names.get(tag);
};

/** The overlay's lines for a component marked `identity`, or null. */
export function inspectComponent(
  identity: {
    tag?: string;
    name?: string;
    part?: PartDescription;
    key?: string;
    status?: () => string | undefined;
  },
  world?: World,
): ComponentInspection | null {
  // A part inside a component, in its own words (prompt 068).
  if (identity.part)
    return {
      key: identity.key ?? `part:${identity.part.label}`,
      ...describePart(identity.part, world),
    };
  // An installed flowmeter: its reading and its path (prompt 068).
  const meter =
    identity.tag && world ? flowmeterLines(world, identity.tag) : null;
  if (meter) return { key: identity.tag!, ...meter };
  if (identity.tag) {
    const name = nameOf(identity.tag);
    // A tag no register holds (a development room's exhibit): its own name, nothing more.
    if (!name)
      return identity.name
        ? { key: identity.tag, title: `${identity.tag}: ${identity.name}` }
        : null;
    // Its own live state, from its machine's model, where it gives one.
    const own = identity.status?.();
    const base = world
      ? describeForWorld(world, identity.tag)
      : componentDescription(identity.tag);
    const detail =
      own && !/, currently /.test(base) ? `${base}, currently ${own}` : base;
    return {
      key: identity.tag,
      title: `${identity.tag}: ${name}`,
      ...(detail ? { detail } : {}),
    };
  }
  return identity.name
    ? { key: `name:${identity.name}`, title: identity.name }
    : null;
}
