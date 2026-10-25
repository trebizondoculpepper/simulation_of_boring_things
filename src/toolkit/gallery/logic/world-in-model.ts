import { EQUIPPED_ROOMS, layoutRoom } from './room-equipment';
import { roomIsolators, roomPipes } from './room-pipes';
import { roomServiceRoutes } from './room-services';
import {
  cabinetBalanceTank,
  cabinetBusbar,
  cabinetIsolator,
  cabinetPipes,
  cabinetValvePanel,
} from './cabinet-pipes';
import { olympicPlumbing } from './olympic-plumbing';
import { PLACED_KINDS } from '../../../game/plant/equipment-kinds';
import { ROOM_SWITCH_FUSES } from '../../../game/plant/installed-feeders';
import { ROOM_SERVICES } from '../../../game/plant/services';

/**
 * Everything in the world is in the model (the owner, 2026-10-25): every
 * machine, valve, isolator, electrical component and pipe drawn in a plant
 * room is bound to a node, fitting or link of its room's enhanced network
 * (the plumber's expanded port graph), or is marked decorative, when it
 * just sits there and does nothing. This lists, room by room, what the
 * game draws, from the same data its scene builders draw from, each with
 * the model identity it is bound to, if any. Pure.
 */

export type DrawnKind =
  | 'machine'
  | 'valve'
  | 'meter'
  | 'isolator'
  | 'electrical'
  | 'pipe';

/**
 * What a drawn thing is bound to: exactly one of a node of its room's
 * enhanced network (a machine), a fitting (a valve, a meter, an isolator),
 * a link (a pipe or a cable), or nothing, as set decoration that does
 * nothing (a sign, furniture; never a working engineering item).
 */
export type Binding =
  | { node: string }
  | { fitting: string }
  | { link: string }
  | { decorative: true };

export interface DrawnThing {
  kind: DrawnKind;
  name: string;
  /** What it is drawn from; none if it is drawn from nothing in the model. */
  binding?: Binding;
}

/** A room's enhanced network: its nodes, fittings and links, by id. */
export interface RoomModel {
  nodes: ReadonlySet<string>;
  fittings: ReadonlySet<string>;
  links: ReadonlySet<string>;
}

export function roomModel(room: string): RoomModel | undefined {
  if (room !== 'plant_pool_02') return undefined;
  const { expansion, schematic } = olympicPlumbing();
  const fittings = new Set(expansion.fittings.map((f) => f.id));
  return {
    // The expanded graph's nodes are its machines and its fittings: a
    // machine binds to a node that is not a fitting.
    nodes: new Set(
      expansion.nodes.map((n) => n.id).filter((id) => !fittings.has(id)),
    ),
    fittings,
    links: new Set(schematic.edges.map((e) => e.id)),
  };
}

/** Whether a binding names something its room's model has, of its sort. */
export function isBound(binding: Binding | undefined, model?: RoomModel) {
  if (!binding) return false;
  if ('decorative' in binding) return true;
  if (!model) return false;
  if ('node' in binding) return model.nodes.has(binding.node);
  if ('fitting' in binding) return model.fittings.has(binding.fitting);
  return model.links.has(binding.link);
}

const DECORATIVE = { binding: { decorative: true } as const };

const decorativeKind = (key: string) => {
  const kind = key.split(':')[0];
  return (
    kind === 'sign' ||
    (Object.hasOwn(PLACED_KINDS, kind) &&
      PLACED_KINDS[kind as keyof typeof PLACED_KINDS].class === 'decorative')
  );
};

/** What the Olympic plant room draws: its plumbing, every piece by its model id. */
function olympicThings(): DrawnThing[] {
  const plumbed = olympicPlumbing();
  const kindOf = (f: { kind: string }): DrawnKind =>
    f.kind === 'flowmeter'
      ? 'meter'
      : f.kind === 'power-isolator' || f.kind === 'fused-tap-off'
        ? 'isolator'
        : 'valve';
  return [
    ...plumbed.items.map((i): DrawnThing => ({
      kind: 'machine',
      name: i.label,
      ...(decorativeKind(i.key) ? DECORATIVE : { binding: { node: i.key } }),
    })),
    ...plumbed.fittings.map((f): DrawnThing => ({
      kind: kindOf(f),
      name: f.id,
      binding: { fitting: f.id },
    })),
    ...plumbed.runs.map((r): DrawnThing => ({
      kind: 'pipe',
      name: r.name,
      binding: { link: r.line },
    })),
  ];
}

/** What a room draws, from the data its scene builders draw from. */
export function drawnThings(room: string): DrawnThing[] {
  const things: DrawnThing[] =
    room === 'plant_pool_02'
      ? olympicThings()
      : [
          ...(layoutRoom(room)?.placed ?? []).map((p): DrawnThing => ({
            kind: 'machine',
            name: p.item.label,
            ...(decorativeKind(p.item.key) ? DECORATIVE : {}),
          })),
          ...roomPipes(room).flatMap((r) => [
            { kind: 'pipe' as const, name: r.name },
            ...(r.valves ?? []).map((v) => ({
              kind: 'valve' as const,
              name: v.name,
            })),
            ...(r.meters ?? []).map((m) => ({
              kind: 'meter' as const,
              name: m.tag,
            })),
          ]),
          ...roomIsolators(room).isolators.map((i) => ({
            kind: 'isolator' as const,
            name: i.name,
          })),
          ...cabinetPipes(room).flatMap((r) => [
            { kind: 'pipe' as const, name: r.name },
            ...(r.valve ? [{ kind: 'valve' as const, name: r.valve.id }] : []),
          ]),
          ...(cabinetBalanceTank(room)
            ? [{ kind: 'machine' as const, name: 'Balance tank' }]
            : []),
          ...(cabinetIsolator(room)
            ? [{ kind: 'isolator' as const, name: 'Cabinet isolator' }]
            : []),
          ...(cabinetValvePanel(room)
            ? [{ kind: 'electrical' as const, name: 'Valve panel' }]
            : []),
          ...(cabinetBusbar(room)
            ? [{ kind: 'electrical' as const, name: 'Cabinet busbar' }]
            : []),
        ];
  // Every room's electrical services, the Olympic's included.
  if (room in ROOM_SWITCH_FUSES)
    things.push({
      kind: 'electrical',
      name: ROOM_SWITCH_FUSES[room as keyof typeof ROOM_SWITCH_FUSES].tag,
    });
  if (room in ROOM_SERVICES)
    for (const r of roomServiceRoutes(room))
      things.push({ kind: 'pipe', name: `${r.utility}: ${r.name}` });
  return things;
}

/** What a room draws that is neither in its model nor decorative. */
export function unboundThings(room: string): DrawnThing[] {
  const model = roomModel(room);
  return drawnThings(room).filter((t) => !isBound(t.binding, model));
}

/**
 * Each thing's identity in its room, for the pinned list of unbound
 * things: its kind and name, numbered where several share them.
 */
export function identities(things: readonly DrawnThing[]): string[] {
  const seen = new Map<string, number>();
  return things.map((t) => {
    const base = `${t.kind}: ${t.name}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} #${n}`;
  });
}

/** A room's unbound things by identity. */
export const unboundIdentities = (room: string) => {
  const model = roomModel(room);
  const all = drawnThings(room);
  const ids = identities(all);
  return ids.filter((_, i) => !isBound(all[i].binding, model));
};

/** The rooms the game draws plant in. */
export const MODELLED_WORLD_ROOMS: readonly string[] = EQUIPPED_ROOMS;
