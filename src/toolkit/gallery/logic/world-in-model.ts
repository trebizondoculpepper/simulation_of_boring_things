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

export interface DrawnThing {
  kind: DrawnKind;
  name: string;
  /** The id in its room's enhanced network it is drawn from, if any. */
  node?: string;
  /** Set decoration: drawn, doing nothing, outside the model. */
  decorative?: boolean;
}

/** A room's enhanced network: every node, fitting and link id. */
export function roomModel(room: string): ReadonlySet<string> | undefined {
  if (room !== 'plant_pool_02') return undefined;
  const { expansion, schematic } = olympicPlumbing();
  return new Set([
    ...expansion.nodes.map((n) => n.id),
    ...expansion.fittings.map((f) => f.id),
    ...expansion.headers.map((h) => h.id),
    ...schematic.edges.map((e) => e.id),
  ]);
}

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
    ...plumbed.items.map((i) => ({
      kind: 'machine' as const,
      name: i.label,
      node: i.key,
      ...(decorativeKind(i.key) ? { decorative: true } : {}),
    })),
    ...plumbed.fittings.map((f) => ({
      kind: kindOf(f),
      name: f.id,
      node: f.id,
    })),
    ...plumbed.runs.map((r) => ({
      kind: 'pipe' as const,
      name: r.name,
      node: r.line,
    })),
  ];
}

/** What a room draws, from the data its scene builders draw from. */
export function drawnThings(room: string): DrawnThing[] {
  const things: DrawnThing[] =
    room === 'plant_pool_02'
      ? olympicThings()
      : [
          ...(layoutRoom(room)?.placed ?? []).map((p) => ({
            kind: 'machine' as const,
            name: p.item.label,
            ...(decorativeKind(p.item.key) ? { decorative: true } : {}),
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
  return drawnThings(room).filter(
    (t) => !t.decorative && !(t.node !== undefined && model?.has(t.node)),
  );
}

/** The rooms the game draws plant in. */
export const MODELLED_WORLD_ROOMS: readonly string[] = EQUIPPED_ROOMS;
