import type { RoomSchematic, SchematicNode } from './schematics';
import { link, roomElectrics } from './schematic-parts';

/**
 * The switch room's schematic (prompt 064; the owner, 2026-10-25: every
 * room's design kept, every component in the model): the building's
 * incoming supply through its main switch to the LV switchboard, which
 * feeds the rooms, the lighting board and the emergency lighting's central
 * battery; the mains/generator changeover switch between the main switch
 * and the switchboard, the loading bay's generator cable (a boundary) on
 * its II side (prompt 089, item 6: the room's own generator connection
 * point was a duplicate of the bay's, and is gone); the main earthing
 * terminal; and the room's own electrics. Pure.
 */

const room = 'switch_room';
const machine = (id: string, kind: string, name: string): SchematicNode => ({
  id,
  kind,
  name,
});
const electrics = roomElectrics(room, []);

export const SWITCH_ROOM_SCHEMATIC: RoomSchematic = {
  room,
  code: 'SR',
  nodes: [
    machine('incoming', 'incoming-supply', 'Incoming supply'),
    machine('main-switch', 'main-switch', 'Main incoming switch'),
    machine('switchboard', 'lv-switchboard', 'LV main switchboard'),
    machine(
      'central-battery',
      'central-battery',
      'Emergency lighting central battery',
    ),
    machine(
      'lighting-board',
      'lighting-board',
      'Lighting distribution board DB-L1',
    ),
    machine(
      'changeover',
      'changeover-switch',
      'Mains/generator changeover switch',
    ),
    // The loading bay's generator cable, in over the cable ladder (a
    // boundary: its connection cabinet is the bay's).
    machine(
      'generator-cable',
      'generator-cable',
      'Generator cable from the loading bay',
    ),
    machine('earthing', 'earthing-terminal', 'Main earthing terminal'),
    machine('rooms', 'room-feeders', 'The rooms’ supplies'),
    machine('lighting-zones', 'lighting-zones', 'Lighting zones'),
    ...electrics.nodes,
  ],
  links: [
    link(
      'Incoming supply',
      ['incoming', 'out'],
      ['main-switch', 'in'],
      'power',
    ),
    link(
      'Main switch to the changeover switch',
      ['main-switch', 'out'],
      ['changeover', 'mains'],
      'power',
    ),
    link(
      'Changeover switch to the switchboard',
      ['changeover', 'out'],
      ['switchboard', 'in'],
      'power',
    ),
    link(
      'Switchboard to the rooms',
      ['switchboard', 'ways'],
      ['rooms', 'in'],
      'power',
    ),
    link(
      'Switchboard to the lighting board',
      ['switchboard', 'lighting'],
      ['lighting-board', 'in'],
      'power',
    ),
    link(
      'Lighting board to the lighting zones',
      ['lighting-board', 'out'],
      ['lighting-zones', 'in'],
      'power',
    ),
    link(
      'Switchboard to the central battery',
      ['switchboard', 'battery'],
      ['central-battery', 'in'],
      'power',
    ),
    link(
      'Emergency lighting',
      ['central-battery', 'out'],
      ['lighting-zones', 'emergency'],
      'power',
    ),
    link(
      'Generator cable to the changeover switch',
      ['generator-cable', 'out'],
      ['changeover', 'generator'],
      'power',
    ),
    link(
      'Main earthing conductor',
      ['earthing', 'bond'],
      ['switchboard', 'earth'],
      'power',
    ),
    ...electrics.links,
  ],
  fittings: [],
  rules: { isolate: new Set(), pumps: new Set() },
};
