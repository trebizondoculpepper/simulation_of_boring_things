import type { Object3D } from 'three';
import type { PartDescription } from '../../../../game/plant/part-inspection';

/**
 * A described component's identity on its scene objects (prompt 061): the
 * plate's tag of the piece of plant an object belongs to, set once by the
 * scene builder that builds it, so the information overlay can say what
 * the player is looking at. Every piece of the object (a valve's lever,
 * plaques and body) is the one component: picking walks up the parents
 * to the nearest marked owner. An object marked without a tag (`name`
 * alone) is a thing with no identifier, shown by its name.
 */

export interface ComponentIdentity {
  /** Its plate's tag, a key of the plant's registers. */
  tag?: string;
  /** Its name, for a thing with no tag. */
  name?: string;
  /**
   * What it is drawn from in its room's model (prompt 064): a machine's
   * node, a valve's or isolator's fitting, a pipe's link. Everything drawn
   * is bound to the model or is decorative.
   */
  model?: { node: string } | { fitting: string } | { link: string };
  /** Set decoration: it sits there and does nothing (never a working item). */
  decorative?: true;
  /**
   * A part inside a component (prompt 068): a button, lamp or readout,
   * described in its own words; the nearest marked owner, so it wins over
   * its panel. Every mesh of it (cap, bezel, legend) is the one part.
   */
  part?: PartDescription;
  /** Its stable pick key, one per part per scene instance (two copies of a mimic differ). */
  key?: string;
  /** Its own live state, from the machine's own model where the world has none. */
  status?: () => string | undefined;
}

const KEY = 'component';

/** Mark `object` as the component `identity`; it returns the object. */
export function markComponent<T extends Object3D>(
  object: T,
  identity: ComponentIdentity | string,
): T {
  object.userData[KEY] =
    typeof identity === 'string' ? { tag: identity } : identity;
  return object;
}

/** The component an object is marked as, itself only, not its parents. */
export const componentOf = (object: Object3D): ComponentIdentity | undefined =>
  object.userData[KEY] as ComponentIdentity | undefined;

/**
 * The nearest marked owner of `object`, itself or up its parents: the most
 * specific described component (a switch over its cabinet).
 */
export function owningComponent(
  object: Object3D,
): { object: Object3D; identity: ComponentIdentity } | undefined {
  for (let o: Object3D | null = object; o; o = o.parent) {
    const identity = componentOf(o);
    if (identity) return { object: o, identity };
  }
  return undefined;
}
