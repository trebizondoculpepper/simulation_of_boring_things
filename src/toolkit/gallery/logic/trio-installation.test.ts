import { describe, expect, it } from 'vite-plus/test';
import {
  LOUNGE_TRIO,
  LOUNGE_TRIO_SITE,
  OLYMPIC_TRIO,
  OLYMPIC_TRIO_SITE,
  SAMPLE_POINT,
  TRIO_CABINET_VALVES,
  TRIO_UNLINKED_PORTS,
  trioCabinetValve,
  trioIsolator,
} from '../../../game/plant/aqualis-schematic';
import { TRIO_WINDOWS } from '../../../game/plant/aqualis-annunciator';
import { LOCATION_ANNUNCIATORS } from '../../../game/plant/location-annunciators';
import { loungeAlarms } from '../../../game/plant/lounge-annunciator';
import { olympicAlarms } from '../../../game/plant/olympic-annunciator';
import { INSTALLED_VALVES } from '../../../game/plant/installed-valves';
import { newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import { roomIsolators, roomPipes } from './room-pipes';
import { olympicPlumbing } from './olympic-plumbing';
import {
  ANNUNCIATOR_FRAME_GAP,
  TRIO_FRAME_GAP,
  layoutRoom,
} from './room-equipment';
import { EQUIPMENT_OPENING } from './plant-rooms';

/**
 * The Dr Aqualis Trios as installed (mission 114): in each room, nothing
 * of the Trio drawn that is not in its model, and nothing of its model left
 * undrawn; its annunciator's windows; its place.
 */

const ROOMS = [
  { room: 'plant_pool_01', site: LOUNGE_TRIO_SITE, parts: LOUNGE_TRIO },
  { room: 'plant_pool_02', site: OLYMPIC_TRIO_SITE, parts: OLYMPIC_TRIO },
] as const;

const bindingOf = (r: ReturnType<typeof roomPipes>[number]) =>
  r.model ?? { link: r.name };

describe.each(ROOMS)('$room’s Trio', ({ room, site, parts }) => {
  const runs = roomPipes(room);
  const links = new Set(parts.links.map((l) => l.id));

  it('stands in the room, its cabinet the model’s controller node', () => {
    const placed = layoutRoom(room)!.placed.filter(
      (p) => p.item.key === 'dosing-controller',
    );
    expect(placed).toHaveLength(1);
    expect(placed[0].item.label).toMatch(/Dr Aqualis Trio$/);
    expect(placed[0].item.mount).toBe('floor');
  });

  it('draws every one of its links, and its sample point', () => {
    for (const id of links)
      expect(
        runs.some((r) => {
          const b = bindingOf(r);
          return 'link' in b && b.link === id;
        }),
        id,
      ).toBe(true);
    expect(
      runs.some((r) => {
        const b = bindingOf(r);
        return 'node' in b && b.node === SAMPLE_POINT;
      }),
    ).toBe(true);
  });

  it('draws nothing of its own that is not in its model', () => {
    // Every run touching the Trio's ports or named for it is one of its links.
    for (const r of runs.filter((x) =>
      /^(Sample|Dosing controller)/.test(x.name),
    )) {
      const b = bindingOf(r);
      if ('node' in b) expect(b.node).toBe(SAMPLE_POINT);
      else expect(links.has(b.link), r.name).toBe(true);
    }
  });

  it('draws every one of its valves: on its lines, or on its cabinet', () => {
    const drawn = new Set(
      runs.flatMap((r) => r.valves.map((v) => v.fitting).filter(Boolean)),
    );
    for (const f of parts.fittings.filter((x) => x.kind === 'isolating-valve'))
      expect(drawn.has(f.id) || TRIO_CABINET_VALVES.has(f.id), f.id).toBe(true);
    // Its cabinet's inlet valve is an installed valve, kept by the world.
    expect(
      Object.values(INSTALLED_VALVES).some(
        (v) => v.assetId === trioCabinetValve(site),
      ),
    ).toBe(true);
  });

  it('draws its supply’s isolator, or its fused tap-off', () => {
    const iso = trioIsolator(site);
    if (iso)
      expect(roomIsolators(room).isolators.map((i) => i.name)).toContain(iso);
    else
      expect(olympicPlumbing().fittings.map((f) => f.id)).toContain(
        `${site.power.link}.tap-off`,
      );
  });

  it('leaves its blanked CO₂ gland unlinked and undrawn', () => {
    for (const id of TRIO_UNLINKED_PORTS)
      expect(
        parts.links.some(
          (l) =>
            (l.sourceId === site.cabinet && l.sourcePort === id) ||
            (l.targetId === site.cabinet && l.targetPort === id),
        ),
      ).toBe(false);
  });
});

describe('the Lounge’s Trio’s place', () => {
  it('stands east of the equipment doors, its west edge clear of their frame', () => {
    const layout = layoutRoom('plant_pool_01')!;
    const trio = layout.placed.find((p) => p.item.key === 'dosing-controller')!;
    const ann = layout.placed.find((p) =>
      p.item.key.startsWith('annunciator'),
    )!;
    const hz = layout.box.d / 2;
    const door = layout.box.keepClear.find((k) => k.maxZ >= hz - 1e-9)!;
    const middle = (door.minX + door.maxX) / 2;
    expect(trio.footprint.minX).toBeGreaterThanOrEqual(
      middle + EQUIPMENT_OPENING / 2 + TRIO_FRAME_GAP - 1e-9,
    );
    expect(trio.footprint.minX).toBeGreaterThanOrEqual(door.maxX - 1e-9);
    // PL1-CP3 on the other side, as it was placed.
    expect(ann.footprint.maxX).toBeLessThanOrEqual(
      middle - EQUIPMENT_OPENING / 2 - ANNUNCIATOR_FRAME_GAP + 1e-9,
    );
  });
});

describe('the Trios’ windows on their annunciators', () => {
  it('grows the Lounge’s board to 24 windows and the Olympic’s to 30', () => {
    expect(LOCATION_ANNUNCIATORS.pool_01.alarms).toHaveLength(24);
    expect(LOCATION_ANNUNCIATORS.pool_02.alarms).toHaveLength(30);
    for (const w of TRIO_WINDOWS.pool_01)
      expect(LOCATION_ANNUNCIATORS.pool_01.alarms).toContain(w);
    for (const w of [...TRIO_WINDOWS.pool_02, 'dosing-inhibit'])
      expect(LOCATION_ANNUNCIATORS.pool_02.alarms).toContain(w);
    for (const id of ['pool_01', 'pool_02'] as const)
      for (const a of LOCATION_ANNUNCIATORS[id].alarms)
        expect(LOCATION_ANNUNCIATORS[id].text[a], a).toBeDefined();
  });

  /** A world whose pools' water is in band but whose Trios read chlorine low and pH high. */
  const misread = (): World => {
    const w = newWorld();
    const off = (id: 'pool_01' | 'pool_02') => ({
      ...w.aqualis[id],
      readings: { ...w.aqualis[id].readings, freeChlorine: 0.4, ph: 8.0 },
    });
    return {
      ...w,
      aqualis: { pool_01: off('pool_01'), pool_02: off('pool_02') },
    };
  };

  it('reads chlorine and pH from the Trio’s analyser, not the pool’s water', () => {
    const fresh = newWorld();
    expect(loungeAlarms(fresh)).not.toContain('chlorine');
    expect(olympicAlarms(fresh)).not.toContain('cl-low');
    const w = misread();
    expect(w.pools.pool_01.freeChlorine).toBeGreaterThan(1);
    expect(loungeAlarms(w)).toEqual(expect.arrayContaining(['chlorine', 'ph']));
    expect(olympicAlarms(w)).toEqual(expect.arrayContaining(['cl-low', 'ph']));
  });

  it('lights DOSING INHIBITED with the Trio’s knob at OFF', () => {
    const w = newWorld();
    const off = (id: 'pool_01' | 'pool_02') => ({
      ...w.aqualis[id],
      selector: 'off' as const,
    });
    const o = {
      ...w,
      aqualis: { pool_01: off('pool_01'), pool_02: off('pool_02') },
    };
    expect(loungeAlarms(o)).toContain('dosing-inhibit');
    expect(olympicAlarms(o)).toContain('dosing-inhibit');
    expect(olympicAlarms(w)).not.toContain('dosing-inhibit');
  });
});
