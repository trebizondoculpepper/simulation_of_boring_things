import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Material, Mesh, Object3D, Texture } from 'three';
import { createPanelKit } from '../../core/views/eighties-controls';
import { displayKindOf } from '../../core/views/display-reach';
import { createAqualisCabinet } from './aqualis-cabinet';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        {
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop: () => {} }),
          createRadialGradient: () => ({ addColorStop: () => {} }),
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

const build = () =>
  createAqualisCabinet(createPanelKit(), { screenTouch() {} });

type Cabinet = ReturnType<typeof build>;
type Mapped = Material & { map: Texture };

/** Whether an object is drawn: it and every one of its parents visible. */
const drawn = (o: Object3D) => {
  for (let p: Object3D | null = o; p; p = p.parent)
    if (!p.visible) return false;
  return true;
};

const doorName = (cab: Cabinet) => `${cab.group.name} lower door`;
const doorOf = (cab: Cabinet) =>
  cab.touchables.find((o) => o.name === doorName(cab) && (o as Mesh).isMesh)!;
/** The developer's Post-it: the door's one textured face. */
const noteOf = (cab: Cabinet) =>
  cab.touchables.find(
    (o) =>
      o.name === doorName(cab) &&
      !!((o as Mesh).material as Mapped | undefined)?.map,
  )!;
const overlayOf = (cab: Cabinet) =>
  cab.touchables.find((o) => o.name.includes('(Dr Aqualis)'))!;
const lit = (m: Material) =>
  (m.userData as { lcdLit: { value: number } }).lcdLit.value;

describe('the Aqualis cabinet’s lower section', () => {
  it('draws nothing inside while its door is shut', () => {
    const cab = build();
    expect(cab.doorOpen).toBe(false);
    expect(cab.contents.visible).toBe(false);
    let meshes = 0;
    cab.contents.traverse((o) => {
      if ((o as Mesh).isMesh) meshes++;
    });
    // The flow cell, probes, rotameter, bottles, pump, tubing and boards.
    expect(meshes).toBeGreaterThan(40);
    // The Post-it inside the door goes with them.
    expect(drawn(noteOf(cab))).toBe(false);
  });

  it('has an opaque door', () => {
    const cab = build();
    for (const o of cab.touchables)
      if (o.name === doorName(cab) && (o as Mesh).isMesh && o !== noteOf(cab))
        expect(((o as Mesh).material as Material).transparent).toBe(false);
  });

  it('keeps the sample valve and the pipes leaving it drawn', () => {
    const cab = build();
    const handle = cab.group.getObjectByName('Aqualis sample inlet valve')!;
    expect(drawn(handle)).toBe(true);
    // The sample pipes out of its left side, beyond its carcass.
    const pipes = cab.group.children.filter(
      (o) => (o as Mesh).isMesh && o.position.x < -0.3 && o.position.y < 0.3,
    );
    expect(pipes.length).toBeGreaterThanOrEqual(2);
    for (const p of pipes) expect(drawn(p)).toBe(true);
  });

  it('shows its insides while the door opens and is open, and hides them once it is shut', () => {
    const cab = build();
    expect(cab.touch(doorOf(cab))).toBe(true);
    expect(cab.contents.visible).toBe(true);
    expect(drawn(noteOf(cab))).toBe(true);
    for (let i = 0; i < 30; i++) cab.update(0.05);
    expect(cab.contents.visible).toBe(true);
    cab.touch(doorOf(cab));
    cab.update(0.05);
    // Still swinging shut: still drawn.
    expect(cab.contents.visible).toBe(true);
    for (let i = 0; i < 30; i++) cab.update(0.05);
    expect(cab.contents.visible).toBe(false);
    expect(drawn(noteOf(cab))).toBe(false);
  });
});

describe('the Aqualis cabinet’s screen', () => {
  it('is a colour LCD, and so is Dr Aqualis’s overlay', () => {
    const cab = build();
    expect(displayKindOf((cab.screen.material as Mapped).map)).toBe('lcd');
    const over = overlayOf(cab) as Mesh;
    expect(displayKindOf((over.material as Mapped).map)).toBe('lcd');
  });

  it('goes black with its power off, and holds back its drawings until it is on', () => {
    const cab = build();
    const material = cab.screen.material as Mapped;
    const overlay = overlayOf(cab);
    cab.overlay.visible(true);
    expect(overlay.visible).toBe(true);
    cab.setPower(false);
    expect(cab.powered).toBe(false);
    expect(lit(material)).toBe(0);
    expect(lit((overlay as Mesh).material as Material)).toBe(0);
    expect(overlay.visible).toBe(false);
    cab.overlay.visible(true);
    expect(overlay.visible).toBe(false);
    const version = material.map.version;
    cab.screenChanged();
    expect(material.map.version).toBe(version);
    cab.setPower(true);
    expect(lit(material)).toBe(1);
    expect(overlay.visible).toBe(true);
  });
});
