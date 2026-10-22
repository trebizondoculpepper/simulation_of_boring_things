import { describe, expect, it } from 'vite-plus/test';
import { brandById } from '../../toolkit/components/core/logic/brands';
import { applyAction, newWorld } from '../world';
import { ROOM_SWITCH_FUSES } from './installed-feeders';
import {
  EQUIPPED_ROOMS,
  roomEquipment,
} from '../../toolkit/gallery/logic/room-equipment';
import {
  EQUIPMENT_ROOM_CODES,
  catalogueItems,
  equipmentCatalogue,
  plantInventory,
} from './equipment-catalogue';

describe('placed equipment catalogue', () => {
  it('classifies and numbers each functional item in every equipped room', () => {
    const parts = equipmentCatalogue();
    expect(new Set(parts.map((p) => p.id)).size).toBe(parts.length);
    expect(new Set(parts.map((p) => p.assetId)).size).toBe(parts.length);
    for (const room of EQUIPPED_ROOMS) {
      const items = roomEquipment(room)!.items;
      const numbered = parts.filter((p) => p.room === room);
      expect(numbered.length).toBeGreaterThan(0);
      expect(numbered.length).toBeLessThanOrEqual(items.length);
      for (const part of numbered) {
        expect(part.id.startsWith(`${EQUIPMENT_ROOM_CODES[room]}-`)).toBe(true);
        expect(part.name).not.toBe('');
        expect(part.purpose).not.toBe('');
      }
    }
  });

  it('keeps permanent identities and tags when room items are reordered', () => {
    const room = 'plant_pool_02';
    const items = roomEquipment(room)!.items;
    const before = catalogueItems(room, items);
    const after = catalogueItems(room, [...items].reverse());
    expect(new Map(before.map((p) => [p.name, [p.assetId, p.id]]))).toEqual(
      new Map(after.map((p) => [p.name, [p.assetId, p.id]])),
    );
    const all = plantInventory();
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    const permanent = all.flatMap((part) =>
      part.assetId ? [part.assetId] : [],
    );
    expect(new Set(permanent).size).toBe(permanent.length);
    for (const part of all) {
      expect(part.kind).not.toBe('');
      expect(part.brand).not.toBe('');
      if (part.brand !== 'unbranded')
        expect(brandById(part.brand).id).toBe(part.brand);
    }
    expect(all.find((part) => part.id === 'PL2-F2-IV1')?.kind).toBe(
      'butterfly-valve',
    );
    expect(all.find((part) => part.id === 'PL2-F2-IV1')?.brand).toBe(
      'unbranded',
    );
    expect(all.find((part) => part.id === 'PL2-F2')?.brand).toBe('lidoluxe');
  });

  it('gives each working room switch-fuse one catalogue ID and one feeder state', () => {
    const world = newWorld();
    const inventory = plantInventory(
      world.identifiedPlant,
      world.installedValves,
      world.plant.feeders,
    );
    for (const [room, switchFuse] of Object.entries(ROOM_SWITCH_FUSES)) {
      const matches = inventory.filter(
        (part) => part.assetId === switchFuse.assetId,
      );
      expect(matches, room).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        id: switchFuse.tag,
        kind: 'switch-fuse',
        brand: 'voltara',
        state: { on: true },
      });
      const off = applyAction(world, {
        type: 'plant/feeder',
        room: room as keyof typeof ROOM_SWITCH_FUSES,
        on: false,
      });
      expect(off.plant.feeders[room as keyof typeof ROOM_SWITCH_FUSES]).toBe(
        false,
      );
      expect(
        plantInventory(
          off.identifiedPlant,
          off.installedValves,
          off.plant.feeders,
        ).find((part) => part.assetId === switchFuse.assetId)?.state,
      ).toEqual({ on: false });
    }
  });
});
