import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Group, Mesh } from 'three';
import type { Object3D } from 'three';
import { createPanelKit } from '../../components/core/views/eighties-controls';
import {
  markComponent,
  owningComponent,
} from '../../components/core/views/component-identity';
import { createLoungeFilterMimic } from './lounge-filter-mimic';
import { LOUNGE_VALVES } from '../../../game/plant/lounge-valves';

beforeEach(() => {
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
});
afterEach(() => vi.unstubAllGlobals());

/** Every mesh under `root`, each with what the overlay finds as its owner. */
const owners = (root: Object3D) => {
  const out: { mesh: Mesh; key?: string; tag?: string; part: boolean }[] = [];
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    const id = owningComponent(o)?.identity;
    out.push({ mesh: o, key: id?.key, tag: id?.tag, part: !!id?.part });
  });
  return out;
};
const named = (root: Object3D, test: (o: Object3D) => boolean) => {
  let found: Object3D | undefined;
  root.traverse((o) => {
    if (!found && test(o)) found = o;
  });
  return found!;
};

describe('parts inside a component, in the scene (prompt 068)', () => {
  it('names the part aimed at over its panel, one key for all its meshes, and the panel where no part is', () => {
    const kit = createPanelKit();
    const panel = markComponent(new Group(), { tag: 'PL1-CP1' });
    const mimic = createLoungeFilterMimic(kit, null);
    panel.add(mimic.group);
    const valve = LOUNGE_VALVES.find((v) => v.tag === 'PL1-F1-IV1')!.assetId;
    const button = named(mimic.group, (o) =>
      (owningComponent(o)?.identity.key ?? '').endsWith(`.${valve}/open`),
    );
    const meshes = owners(button);
    expect(meshes.length).toBeGreaterThan(1);
    // Its cap, bezel and legend: the one part.
    expect(new Set(meshes.map((m) => m.key)).size).toBe(1);
    expect(meshes.every((m) => m.part)).toBe(true);
    // The board itself is no part: it names its panel.
    const all = owners(mimic.group);
    expect(all.some((m) => !m.part && m.tag === 'PL1-CP1')).toBe(true);
  });

  it('keeps two copies of the board apart', () => {
    const kit = createPanelKit();
    const keys = (root: Object3D) =>
      new Set(owners(root).flatMap((m) => (m.key ? [m.key] : [])));
    const a = keys(createLoungeFilterMimic(kit, null).group);
    const b = keys(createLoungeFilterMimic(kit, null).group);
    expect(a.size).toBeGreaterThan(40);
    expect([...a].some((k) => b.has(k))).toBe(false);
  });
});
