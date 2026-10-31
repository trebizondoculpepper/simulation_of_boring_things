import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { Box3 } from "three";
import type { Object3D } from "three";
import { createPanelKit } from "../../../components/core/views/eighties-controls";
import { hallInterior, hallOrigin } from "../../logic/museum-plan";
import { buildHallExhibit } from "./hall-4-chemistry";

beforeEach(() => {
  vi.stubGlobal("document", {
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

/** Hall 4's wall boards (the audit, 2026-10-31: they stood 40 mm off their walls). */
const ON_THE_WALLS = [
  "Entrance panel",
  "Hall 4 mimic board",
  "Challenge cards",
  "Analyser readout board",
];

describe("Hall 4’s wall boards", () => {
  it("hang flush, their backs (brackets and all) within 0.05 m of a wall", () => {
    const hall = buildHallExhibit(createPanelKit());
    hall.object.updateMatrixWorld(true);
    const i = hallInterior("museum4");
    const o = hallOrigin("museum4");
    const hx = (i.maxX - i.minX) / 2;
    const hz = (i.maxZ - i.minZ) / 2;
    expect(Math.abs(i.minX - o.x + hx)).toBeLessThan(1e-6);
    for (const name of ON_THE_WALLS) {
      let found: Object3D | undefined;
      hall.object.traverse((x) => {
        if (x.userData.onWall === name) found = x;
      });
      expect(found, name).toBeDefined();
      const b = new Box3().setFromObject(found!);
      // Inside the hall, and its back on the nearest wall.
      expect(b.min.x, name).toBeGreaterThanOrEqual(-hx - 1e-6);
      expect(b.max.x, name).toBeLessThanOrEqual(hx + 1e-6);
      expect(b.min.z, name).toBeGreaterThanOrEqual(-hz - 1e-6);
      expect(b.max.z, name).toBeLessThanOrEqual(hz + 1e-6);
      const gap = Math.min(
        b.min.x + hx,
        hx - b.max.x,
        b.min.z + hz,
        hz - b.max.z,
      );
      expect(gap, name).toBeLessThan(0.05);
    }
  });
});
