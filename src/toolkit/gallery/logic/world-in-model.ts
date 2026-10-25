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
import {
  JACUZZI_LINKS,
  JACUZZI_NODES,
  JACUZZI_ROOM,
  jacuzziExpansion,
} from '../../../game/plant/jacuzzi-schematic';
import { modelValveOn } from '../../../game/plant/model-valves';
import type {
  Expansion,
  PlumbEdge,
} from '../../../game/plant/plumbing-expansion';
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

/** The enhanced networks of the rooms built from a schematic. */
const ENHANCED: Partial<
  Record<string, () => { expansion: Expansion; links: readonly PlumbEdge[] }>
> = {
  plant_pool_02: () => {
    const { expansion, schematic } = olympicPlumbing();
    return { expansion, links: schematic.edges };
  },
  [JACUZZI_ROOM]: () => ({
    expansion: jacuzziExpansion(),
    links: JACUZZI_LINKS,
  }),
};

export function roomModel(room: string): RoomModel | undefined {
  const built = ENHANCED[room]?.();
  if (!built) return undefined;
  const { expansion } = built;
  const schematic = { edges: built.links };
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

/** The schematic nodes of rooms built from one, by room. */
const SCHEMATIC_NODES: Partial<
  Record<string, readonly { id: string; kind: string }[]>
> = { [JACUZZI_ROOM]: JACUZZI_NODES };

/** The one node of a kind in a room's schematic, if it has exactly one. */
const nodeOfKind = (room: string, kind: string) => {
  const found = (SCHEMATIC_NODES[room] ?? []).filter((n) => n.kind === kind);
  return found.length === 1 ? found[0].id : undefined;
};

/** A drawn machine, bound to its room's one node of its kind, if there is one. */
const machineOfKind = (
  room: string,
  name: string,
  kind: string,
  as: DrawnKind = 'machine',
): DrawnThing => {
  const node = nodeOfKind(room, kind);
  return { kind: as, name, ...(node ? { binding: { node } } : {}) };
};

/** The power isolator its room's model sets on a link, as a binding. */
const isolatorOn = (room: string, link: string) => {
  const found = ENHANCED[room]?.().expansion.fittings.find(
    (f) => f.edge === link && f.kind === 'power-isolator',
  );
  return found ? { binding: { fitting: found.id } } : {};
};

/** What a room draws, from the data its scene builders draw from. */
export function drawnThings(room: string): DrawnThing[] {
  const things: DrawnThing[] =
    room === 'plant_pool_02'
      ? olympicThings()
      : [
          ...(layoutRoom(room)?.placed ?? []).map((p): DrawnThing =>
            decorativeKind(p.item.key)
              ? { kind: 'machine', name: p.item.label, ...DECORATIVE }
              : machineOfKind(room, p.item.label, p.item.key.split(':')[0]),
          ),
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
          ...cabinetPipes(room).flatMap((r): DrawnThing[] => {
            // A run bound to its link; the busbar's trunking to its machine.
            const busbar = nodeOfKind(room, 'busbar');
            const run: DrawnThing = {
              kind: 'pipe',
              name: r.name,
              ...(r.link
                ? { binding: { link: r.link } }
                : r.service === 'electrical' && busbar
                  ? { binding: { node: busbar } }
                  : {}),
            };
            const valve = r.link ? modelValveOn(room, r.link) : undefined;
            return [
              run,
              ...(r.valve
                ? [
                    {
                      kind: 'valve' as const,
                      name: r.valve.id,
                      ...(valve ? { binding: { fitting: valve.id } } : {}),
                    },
                  ]
                : []),
            ];
          }),
          ...(cabinetBalanceTank(room)
            ? [machineOfKind(room, 'Balance tank', 'balance-tank')]
            : []),
          ...(cabinetIsolator(room)
            ? [
                {
                  kind: 'isolator' as const,
                  name: 'Cabinet isolator',
                  // The isolator its feed's link carries in the room's model.
                  ...isolatorOn(room, 'Switch-fuse to the cabinet'),
                },
              ]
            : []),
          ...(cabinetValvePanel(room)
            ? [machineOfKind(room, 'Valve panel', 'valve-panel', 'electrical')]
            : []),
          ...(cabinetBusbar(room)
            ? [machineOfKind(room, 'Cabinet busbar', 'busbar', 'electrical')]
            : []),
        ];
  // Every room's electrical services, the Olympic's included.
  if (room in ROOM_SWITCH_FUSES)
    things.push(
      machineOfKind(
        room,
        ROOM_SWITCH_FUSES[room as keyof typeof ROOM_SWITCH_FUSES].tag,
        'switch-fuse',
        'electrical',
      ),
    );
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
