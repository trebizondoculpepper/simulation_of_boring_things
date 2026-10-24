import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Box3, Mesh, Vector3 } from 'three';
import { createPanelKit } from '../../../components/core/views/eighties-controls';
import { isLive } from './exhibit';
import {
  JACUZZI_PACK_EXHIBIT,
  SPA_PACK_EXHIBIT,
  cabinetPipework,
} from './spa-pack';
import { cabinetPorts } from '../../logic/cabinet-pipes';

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

describe.each([
  ['footbath', SPA_PACK_EXHIBIT, false],
  ['jacuzzi', JACUZZI_PACK_EXHIBIT, true],
] as const)('the %s cabinet', (_, exhibit, jets) => {
  it('has a stub through its back panel at each of its ports', () => {
    const built = exhibit.build(createPanelKit());
    const object = isLive(built) ? built.object : built;
    object.updateMatrixWorld(true);
    const boxes: Box3[] = [];
    object.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      // Only small pieces, a stub's pipe, valve or cap: not the panel it is in.
      const box = new Box3().setFromObject(o);
      const size = box.getSize(new Vector3());
      if (
        Math.min(size.x, size.y) < 0.25 &&
        Math.min(size.y, size.z) < 0.25 &&
        Math.min(size.x, size.z) < 0.25 &&
        Math.max(size.x, size.y, size.z) < 1.5
      )
        boxes.push(box);
    });
    for (const port of cabinetPorts(jets)) {
      const at = new Vector3(...port.at);
      const near = boxes.some((b) => b.distanceToPoint(at) < 0.03);
      expect(near, port.name).toBe(true);
    }
  });
});

/** The least distance between two straight lengths, by their closest points. */
function gap(
  a0: readonly number[],
  a1: readonly number[],
  b0: readonly number[],
  b1: readonly number[],
) {
  const d1 = a1.map((v, k) => v - a0[k]);
  const d2 = b1.map((v, k) => v - b0[k]);
  const r = a0.map((v, k) => v - b0[k]);
  const dot = (x: number[], y: number[]) =>
    x.reduce((s, v, k) => s + v * y[k], 0);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  let s = 0;
  let t = 0;
  if (a < 1e-12 && e < 1e-12) return Math.hypot(...r);
  if (a < 1e-12) t = clamp(f / e);
  else {
    const c = dot(d1, r);
    if (e < 1e-12) s = clamp(-c / a);
    else {
      const b = dot(d1, d2);
      const denom = a * e - b * b;
      s = denom > 1e-12 ? clamp((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a);
      }
    }
  }
  const p = a0.map((v, k) => v + d1[k] * s);
  const q = b0.map((v, k) => v + d2[k] * t);
  return Math.hypot(...p.map((v, k) => v - q[k]));
}

describe.each([
  ['footbath', false],
  ['jacuzzi', true],
] as const)('the %s cabinet’s own pipework', (_, jets) => {
  it('passes no pipe through another, its machines’ own included', () => {
    const lengths = cabinetPipework(jets);
    const ends = (l: (typeof lengths)[number]) => [l.from, l.to];
    const clashes: string[] = [];
    for (const [i, a] of lengths.entries())
      for (const b of lengths.slice(i + 1)) {
        if (a.name === b.name) continue;
        // Where one meets another end to end, a joint, not a clash.
        const joined = ends(a).some((p) =>
          ends(b).some(
            (q) => Math.hypot(...p.map((v, k) => v - q[k])) < a.r + b.r,
          ),
        );
        if (joined) continue;
        const d = gap(a.from, a.to, b.from, b.to);
        if (d < a.r + b.r)
          clashes.push(`${a.name} and ${b.name}: ${d.toFixed(3)} m apart`);
      }
    expect(clashes).toEqual([]);
  });
});
