import type { RoomSchematic, SchematicNode } from './schematics';
import { link, roomElectrics } from './schematic-parts';

/**
 * The switch room's schematic (prompt 064; the owner, 2026-10-25: every
 * room's design kept, every component in the model): the building's
 * incoming supply through its main switch to the LV switchboard, which
 * feeds the rooms, the lighting board and the emergency lighting's central
 * battery; the generator connection into the switchboard; the main
 * earthing terminal; and the room's own electrics. Pure.
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
    machine('generator-point', 'generator-point', 'Generator connection point'),
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
      'Main switch to the switchboard',
      ['main-switch', 'out'],
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
      'Generator to the switchboard',
      ['generator-point', 'out'],
      ['switchboard', 'generator'],
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
