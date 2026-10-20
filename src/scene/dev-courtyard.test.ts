import { PerspectiveCamera, Scene } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vite-plus/test';
import { countDraws } from '../toolkit/components/core/views/draw-count';
import { createPanelKit } from '../toolkit/components/core/views/eighties-controls';
import { EYE_HEIGHT_METRES } from '../toolkit/controls/input/first-person';
import { COURTYARD_HALF, createDevCourtyard } from './dev-courtyard';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const gradient = () => ({ addColorStop() {} });
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createRadialGradient: gradient,
          createLinearGradient: gradient,
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

it('has a door back to each side of the corridor, and draws within the budget', () => {
  const courtyard = createDevCourtyard(createPanelKit());
  expect(courtyard.doors.map((d) => d.side)).toEqual([
    'north',
    'east',
    'south',
    'west',
  ]);
  const scene = new Scene();
  scene.add(courtyard.group);
  const camera = new PerspectiveCamera(62, 16 / 9, 0.05, 400);
  camera.position.set(0, EYE_HEIGHT_METRES, COURTYARD_HALF - 2);
  camera.lookAt(0, EYE_HEIGHT_METRES, -COURTYARD_HALF);
  scene.updateMatrixWorld();
  // The sun's shadow pass draws it again: half the budget each.
  const draws = countDraws(scene, camera);
  expect(draws.total, JSON.stringify(draws)).toBeLessThanOrEqual(500);
  courtyard.parts.dispose();
});
