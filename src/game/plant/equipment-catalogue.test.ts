import { describe, expect, it } from 'vite-plus/test';
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
  });
});
