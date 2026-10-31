import { describe, expect, it } from 'vite-plus/test';
import { Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import { markUsable, turnAt, usableOf, visibleAll } from './use-marking';
import { markTurnable } from './knob-turning';

const push = () => ({ gesture: 'push' as const, possible: true });

describe('marking a usable thing', () => {
  it('is found from a mesh inside it, and gone once unmarked', () => {
    const cap = new Group();
    const mesh = new Mesh();
    cap.add(mesh);
    const unmark = markUsable(cap, push);
    expect(usableOf(mesh)?.object).toBe(cap);
    expect(usableOf(mesh)?.usable).toBe(push);
    unmark();
    expect(usableOf(mesh)).toBeNull();
  });

  it('takes the nearest mark, so a button on a marked panel is its own', () => {
    const panel = new Group();
    const cap = new Group();
    const mesh = new Mesh();
    panel.add(cap);
    cap.add(mesh);
    markUsable(panel, () => ({ gesture: 'use', possible: true }));
    markUsable(cap, push);
    expect(usableOf(mesh)?.object).toBe(cap);
  });

  it('is unseen under a hidden ancestor', () => {
    const room = new Group();
    const cap = new Mesh();
    room.add(cap);
    expect(visibleAll(cap)).toBe(true);
    room.visible = false;
    expect(visibleAll(cap)).toBe(false);
  });

  it('leaves a newer mark alone when an older one is undone', () => {
    const cap = new Group();
    const undoOld = markUsable(cap, push);
    const newer = () => ({ gesture: 'pull' as const, possible: true });
    markUsable(cap, newer);
    undoOld();
    expect(usableOf(cap)?.usable).toBe(newer);
  });
});

describe('a knob marked turnable', () => {
  const camera = new PerspectiveCamera(60, 1, 0.01, 100);
  camera.position.set(0, 0, 1);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const knob = new Group();
  knob.updateMatrixWorld();
  const atEnd = { canTurn: (d: -1 | 1) => d < 0 };
  const at = (x: number) => ({
    object: knob,
    point: new Vector3(),
    camera,
    x,
    pad: false,
  });

  it('answers the side aimed at, and both ways for a pad', () => {
    markTurnable(knob, atEnd);
    expect(usableOf(knob)!.usable(at(0.1))).toEqual({
      gesture: 'turn',
      direction: 1,
      possible: false,
      ways: { down: true, up: false },
    });
    expect(turnAt(at(-0.1), atEnd)).toMatchObject({
      direction: -1,
      possible: true,
    });
  });
});
