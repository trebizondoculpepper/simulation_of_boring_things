import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3 } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { hallArches } from '../../logic/museum-plan';
import { buildHallExhibit } from './hall-8-never-again';

beforeEach(() => {
  vi.stubGlobal('document', {
    // The photographs' loaders make an image; it never loads here.
    createElementNS: () => ({
      addEventListener() {},
      removeEventListener() {},
      style: {},
    }),
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        },
        {
          get: (target, key) =>
            key in target ? Reflect.get(target, key) : () => {},
        },
      );
      return canvas;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const MARGIN = 0.3;
const APPROACH = 2.5;
const arches = hallArches('museum8');

function boxes() {
  const exhibit = buildHallExhibit(createPanelKit());
  exhibit.object.updateMatrixWorld(true);
  return exhibit.object.children.map((o: Object3D) => ({
    name: o.name,
    box: new Box3().setFromObject(o),
  }));
}

/** An arch's span along its wall and its wall line, in the hall's frame. */
const spanOf = (a: (typeof arches)[number]) =>
  a.axis === 'z'
    ? {
        line: a.frame.x,
        across: 'x' as const,
        along: 'z' as const,
        mid: a.frame.z,
      }
    : {
        line: a.frame.z,
        across: 'z' as const,
        along: 'x' as const,
        mid: a.frame.x,
      };

describe('Hall 8 and its archways (the audit, 2026-10-31)', () => {
  it('hangs nothing on a wall across an archway', () => {
    for (const a of arches) {
      const s = spanOf(a);
      for (const { name, box } of boxes()) {
        const nearWall =
          Math.min(
            Math.abs(box.min[s.across] - s.line),
            Math.abs(box.max[s.across] - s.line),
          ) < 0.3;
        if (!nearWall) continue;
        const overlaps =
          box.max[s.along] > s.mid - a.w / 2 - MARGIN &&
          box.min[s.along] < s.mid + a.w / 2 + MARGIN;
        expect(overlaps, `${name} in the arch to ${a.to}`).toBe(false);
      }
    }
  });

  it("keeps every lectern out of an archway's approach", () => {
    const lecterns = boxes().filter((b) => b.name.endsWith('lectern'));
    expect(lecterns).toHaveLength(6);
    for (const a of arches) {
      const s = spanOf(a);
      for (const { name, box } of lecterns) {
        const c = (box.min[s.across] + box.max[s.across]) / 2;
        const inBand = Math.abs(c - s.line) < APPROACH;
        const across =
          box.max[s.along] > s.mid - a.w / 2 &&
          box.min[s.along] < s.mid + a.w / 2;
        expect(inBand && across, `${name} before the arch to ${a.to}`).toBe(
          false,
        );
      }
    }
  });
});
