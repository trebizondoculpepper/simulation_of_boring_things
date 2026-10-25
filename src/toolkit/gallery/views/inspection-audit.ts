import { vi } from 'vite-plus/test';
import { Group } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import { owningComponent } from '../../components/core/views/component-identity';
import { createRoomEquipment } from './room-equipment';

/**
 * The inspection audit (prompt 068): in each room, the working parts
 * (every button, switch, lamp, meter a part builder makes) that have no
 * description when aimed at: neither their own as a part (each part has
 * one from its library, as it shows itself) nor their component's tag or
 * name.
 * Its counts are pinned (`inspection-coverage.json`, written by
 * `scripts/pin-inspection.test.ts`) and may only fall. For tests only:
 * it builds rooms headless.
 */

export const AUDITED_ROOMS = [
  'plant_pool_01',
  'plant_pool_02',
  'plant_pool_03',
  'plant_pool_04',
  'wet_hall',
  'boiler_house',
  'hypo_store',
  'acid_store',
  'switch_room',
  'air_plant',
  'control_room',
  'engineers_office',
];

/** Enough of a browser for the rooms' builders. */
export function stubBrowser() {
  // Enough of a browser for the rooms' builders: canvases to paint labels
  // on, and listeners that hear nothing.
  const listen = { addEventListener() {}, removeEventListener() {} };
  vi.stubGlobal('window', { ...listen, setTimeout, clearTimeout });
  const element = () => {
    const canvas = {
      ...listen,
      width: 0,
      height: 0,
      style: {},
      getContext: () => context,
    };
    const gradient = () => ({ addColorStop() {} });
    const context = new Proxy(
      {
        canvas,
        measureText: (text: string) => ({ width: text.length * 7 }),
        createRadialGradient: gradient,
        createLinearGradient: gradient,
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      },
      {
        get: (target, key) =>
          key in target ? Reflect.get(target, key) : () => {},
      },
    );
    return canvas;
  };
  vi.stubGlobal('document', {
    ...listen,
    createElement: element,
    createElementNS: element,
    hidden: false,
  });
}

/** Each audited room's working parts with no description of their own. */
export function undescribedParts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const room of AUDITED_ROOMS) {
    const g = new Group();
    g.add(createRoomEquipment(createPanelKit(), room).group);
    let n = 0;
    g.traverse((o) => {
      // Described as a part, or as the tagged or named thing it is (a valve, a meter).
      const id = owningComponent(o)?.identity;
      if (o.userData.workingPart && !(id?.part || id?.tag || id?.name)) n++;
    });
    counts[room] = n;
  }
  return counts;
}
