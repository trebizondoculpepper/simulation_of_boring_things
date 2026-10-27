import type { PlumbEdge } from '../../../game/plant/plumbing-expansion';
import { dayTanks } from '../../../game/plant/schematic-parts';

/**
 * The Olympic plant room's model beyond its plumber's expansion (prompt
 * 064; the owner, 2026-10-25: keep every room's design, attach every
 * component): what the room's plumbing (`olympic-plumbing.ts`) lays
 * besides the expanded schematic, each under the id the room already gives
 * it. Its wall-mounted machines; the pumps' two discharges (the schematic
 * gives the pump block one), the battery's headers, the side-stream and
 * the regulating valve; the pool's overflow and main drain; the dosing,
 * sample and ozone lines; the busbar and its fused tap-offs; and the
 * room's supply. The model is the expansion with this annex. Pure.
 */

const link = (
  id: string,
  from: [string, string],
  to: [string, string],
  medium: PlumbEdge['medium'],
): PlumbEdge => ({
  id,
  sourceId: from[0],
  sourcePort: from[1],
  targetId: to[0],
  targetPort: to[1],
  medium,
});

const DAY_TANKS = dayTanks({
  hypochlorite: ['hypo', 'in'],
  acid: ['acid', 'in'],
});

export const OLYMPIC_ANNEX = {
  nodes: [
    {
      id: 'tank-level-transmitter',
      kind: 'level-transmitter',
      name: 'Balance tank level transmitter',
    },
    { id: 'tankPanel', kind: 'balance-tank-panel', name: 'Balance tank panel' },
    {
      id: 'controller',
      kind: 'dosing-controller',
      name: 'Dosing controller and sample cells',
    },
    { id: 'hypo', kind: 'hypo-pumps', name: 'Hypochlorite dosing pumps' },
    { id: 'acid', kind: 'acid-pump', name: 'Acid dosing pump' },
    { id: 'manifold', kind: 'header', name: 'Pump discharge manifold' },
    { id: 'inlet-header', kind: 'header', name: 'Inlet header' },
    { id: 'outlet-header', kind: 'header', name: 'Outlet header' },
    { id: 'backwash-header', kind: 'header', name: 'Backwash header' },
    // Its day tanks, filled from the wet hall's selectors (plan 085).
    ...DAY_TANKS.nodes,
    { id: 'switch-fuse', kind: 'switch-fuse', name: 'Room supply switch-fuse' },
    { id: 'room-supply', kind: 'room-supply', name: 'Room supply' },
    { id: 'ozone-monitor', kind: 'ozone-monitor', name: 'Ozone monitor' },
  ],
  links: [
    link('tank.drain', ['tank', 'drain'], ['main-plant', 'drain'], 'water'),
    link(
      'tank.level-signal',
      ['tank-level-transmitter', 'signal'],
      ['tankPanel', 'level'],
      'power',
    ),
    link(
      'pumps.dischargeA',
      ['pumps', 'dischargeA'],
      ['manifold', 'in'],
      'water',
    ),
    link(
      'pumps.dischargeB',
      ['pumps', 'dischargeB'],
      ['manifold', 'in'],
      'water',
    ),
    link('battery.inlet', ['manifold', 'out'], ['inlet-header', 'in'], 'water'),
    link(
      'battery.outlet',
      ['outlet-header', 'out'],
      ['contact', 'inlet'],
      'water',
    ),
    link(
      'battery-to-contact',
      ['outlet-header', 'contact'],
      ['contact', 'inlet'],
      'water',
    ),
    link(
      'battery.drain',
      ['backwash-header', 'out'],
      ['main-plant', 'drain'],
      'water',
    ),
    link('pool.overflow', ['pool', 'overflow'], ['tank', 'overflow'], 'water'),
    link(
      'pool.mainDrain',
      ['pool', 'mainDrain'],
      ['tank', 'mainDrain'],
      'water',
    ),
    // Each branch into its day tank; each day tank's draw-off its supply
    // line to its dosing pump, as the room draws it.
    ...DAY_TANKS.links.filter((l) => l.id.endsWith('to its day tank')),
    link(
      'hypo-supply',
      ['hypochlorite-day', 'out'],
      ['hypo', 'in'],
      'chemical',
    ),
    link('acid-supply', ['acid-day', 'out'], ['acid', 'in'], 'chemical'),
    link('hypo-dose', ['hypo', 'out'], ['uv', 'dose'], 'chemical'),

    link('acid-dose', ['acid', 'out'], ['uv', 'dose'], 'chemical'),
    link('sample', ['pumps', 'discharge'], ['controller', 'sample'], 'water'),
    link('ozone', ['generator', 'ozone'], ['contact', 'ozone'], 'gas'),
    // The pumps' drain to the backwash floor channel (the owner, 2026-10-25).
    link(
      'pumps.drain',
      ['manifold', 'drain'],
      ['main-plant', 'drain'],
      'water',
    ),
    link('bus', ['switch-fuse', 'bus'], ['bus', 'in'], 'power'),
    link(
      'plant_pool_02 room supply',
      ['room-supply', 'out'],
      ['switch-fuse', 'in'],
      'power',
    ),
    link(
      'plant_pool_02 room feed',
      ['switch-fuse', 'out'],
      ['bus', 'feed'],
      'power',
    ),
  ],
  /** Fittings the room sets that the expansion does not, by their ids there. */
  fittings: [
    'tank.drain.iso',
    'pool.mainDrain.iso',
    'pumps.dischargeA.nrv',
    'pumps.dischargeA.iso',
    'pumps.dischargeB.nrv',
    'pumps.dischargeB.iso',
    'power-panel.tap-off',
    'power-generator.tap-off',
    'power-pump-A.tap-off',
    'power-pump-B.tap-off',
    'power-uv.tap-off',
    'battery.outlet.regulating',
    'pumps.drain.iso',
  ],
};
