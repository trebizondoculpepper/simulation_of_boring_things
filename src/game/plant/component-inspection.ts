import type { World } from '../world';
import { plantInventory, componentDescription } from './equipment-catalogue';
import type { InventoryEntry } from './equipment-catalogue';
import { inspectionStatus } from './component-status';
import { equipmentKind } from './equipment-kinds';
import { equipmentTypeInProse } from './component-descriptions';
import { brandById } from '../../toolkit/components/core/logic/brands';
import type { BrandId } from '../../toolkit/components/core/logic/brands';
import { describePart, flowmeterLines } from './part-inspection';
import type { PartDescription } from './part-inspection';

/** Whole equipment uses identity/maker/model/type and state, with its purpose below.
 * Unregistered exhibits and individual controls use only what their identity supplies. */
export interface ComponentInspection {
  key: string;
  title: string;
  detail?: string;
}

/** Equipment headings omit unknown maker, model and state instead of guessing them. */
export function equipmentHeading(
  item: {
    id: string;
    type: string;
    brand?: BrandId | 'unbranded';
    model?: string;
  },
  status?: string,
): string {
  const brand =
    item.brand && item.brand !== 'unbranded'
      ? brandById(item.brand).name
      : undefined;
  const about = [brand, item.model, equipmentTypeInProse(item.type)]
    .filter(Boolean)
    .join(' ');
  return `${item.id} (${about})${status ? ` - ${status}` : ''}`;
}

let entries: Map<string, InventoryEntry> | undefined;
const entryOf = (tag: string) => {
  entries ??= new Map(plantInventory().map((item) => [item.id, item]));
  return entries.get(tag);
};

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
  // Individual controls without an independent equipment id retain their own words.
  if (identity.part)
    return {
      key: identity.key ?? `part:${identity.part.label}`,
      ...describePart(identity.part, world),
    };
  if (identity.tag) {
    const item = entryOf(identity.tag);
    if (!item)
      return identity.name
        ? { key: identity.tag, title: `${identity.tag} (${identity.name})` }
        : null;
    const meter = world ? flowmeterLines(world, identity.tag) : null;
    const state =
      identity.status?.() ??
      meter?.status ??
      (world ? inspectionStatus(world, identity.tag) : undefined);
    const detail = meter?.detail ?? componentDescription(identity.tag);
    return {
      key: identity.tag,
      title: equipmentHeading(
        { ...item, type: equipmentKind(item.kind).type },
        state,
      ),
      ...(detail ? { detail } : {}),
    };
  }
  // A thing with no tag: its name, and its own state where it keeps one
  // (a music source's track, an amplifier's on and volume).
  if (!identity.name) return null;
  const state = identity.status?.();
  return {
    key: `name:${identity.name}`,
    title: state ? `${identity.name} - ${state}` : identity.name,
  };
}
