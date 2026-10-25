import { describe, expect, it } from 'vite-plus/test';
import {
  EQUIPMENT_ROOM_CODES,
  componentDescription,
  plantInventory,
} from './equipment-catalogue';
import { INSTALLED_ASSET_IDS } from './installed-asset-ids';
import { INSTALLED_VALVES } from './installed-valves';
import { ROOM_SWITCH_FUSES } from './installed-feeders';
import { INSTALLED_FIXTURES } from './installed-fixtures';
import { newWorld } from '../world';
import { roomPipes } from '../../toolkit/gallery/logic/room-pipes';

/**
 * Everything registered (the owner, 2026-10-25): every piece of installed
 * plant the game draws or names has a permanent asset id and its plate's
 * tag in one of the registers (the rooms' layouts, the valves, the
 * switch-fuses, the fixtures drawn outside the layouts), so the inventory,
 * the console's `status` and the information overlay all know it. A tag
 * written in the code that no register holds is a piece of plant drawn
 * without an identity: the jacuzzi's balance tank was one.
 */

const SOURCES = import.meta.glob<string>(
  ['../../**/*.ts', '!../../**/*.test.ts'],
  { query: '?raw', import: 'default', eager: true },
);

/** The code, its comments removed: a tag in an example is not plant. */
const uncommented = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const registers = () => {
  const world = newWorld();
  return {
    layout: Object.values(INSTALLED_ASSET_IDS),
    valves: Object.values(INSTALLED_VALVES),
    feeders: Object.values(ROOM_SWITCH_FUSES),
    fixtures: Object.entries(INSTALLED_FIXTURES).map(([tag, f]) => ({
      ...f,
      tag,
    })),
    inventory: plantInventory(
      world.identifiedPlant,
      world.installedValves,
      world.plant.feeders,
    ),
  };
};

describe('registration', () => {
  it('registers every plant tag written in the code', () => {
    const r = registers();
    const known = new Set([
      ...r.layout.map((a) => a.tag),
      ...r.valves.map((v) => v.tag),
      ...r.feeders.map((s) => s.tag),
      ...r.fixtures.map((f) => f.tag),
      ...r.inventory.map((e) => e.id),
    ]);
    const codes = Object.values(EQUIPMENT_ROOM_CODES).join('|');
    const tag = new RegExp(
      `['"\`]((?:${codes})-[A-Z]{1,4}\\d+[A-Z]?(?:-[A-Z]{1,4}\\d+[A-Z]?)?)['"\`]`,
      'g',
    );
    const unregistered: string[] = [];
    for (const [path, text] of Object.entries(SOURCES))
      for (const m of uncommented(text).matchAll(tag))
        if (!known.has(m[1])) unregistered.push(`${m[1]} in ${path}`);
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
    expect(unregistered).toEqual([]);
  });

  it('registers the two separately installed ozone monitors', () => {
    for (const [tag, room] of [
      ['PL1-GD1', 'plant_pool_01'],
      ['PL2-GD1', 'plant_pool_02'],
    ] as const)
      expect(INSTALLED_FIXTURES[tag]).toMatchObject({
        room,
        kind: 'ozone-monitor',
        brand: 'warden',
      });
  });

  it('registers every flowmeter drawn in the plant rooms', () => {
    const tags = new Set(Object.keys(INSTALLED_FIXTURES));
    const meters = Object.keys(EQUIPMENT_ROOM_CODES).flatMap((room) =>
      roomPipes(room).flatMap((run) => run.meters ?? []),
    );
    expect(meters.length).toBeGreaterThan(0);
    for (const meter of meters)
      expect(tags.has(meter.tag), meter.tag).toBe(true);
  });

  it('never gives two pieces of plant one asset id or one tag', () => {
    const r = registers();
    const all = [...r.layout, ...r.valves, ...r.feeders, ...r.fixtures];
    const ids = all.map((a) => a.assetId);
    const tags = all.map((a) => a.tag);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('lists every fixture in the inventory, with its maker and description', () => {
    const inventory = registers().inventory;
    for (const [tag, fixture] of Object.entries(INSTALLED_FIXTURES)) {
      const entry = inventory.find((e) => e.id === tag);
      expect(entry, tag).toMatchObject({
        assetId: fixture.assetId,
        name: fixture.name,
        brand: fixture.brand,
        purpose: componentDescription(tag),
      });
      // Its description is inferred (prompt 060), not its documentation's sentence.
      expect(entry?.purpose, tag).not.toBe(fixture.purpose);
    }
  });
});
