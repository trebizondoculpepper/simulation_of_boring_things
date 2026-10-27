import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { Group } from 'three';
import { createPanelKit } from '../../core/views/eighties-controls';
import { EQUIPMENT_DOORS, equipmentDoors } from './equipment-doors';

beforeEach(() => {
  vi.stubGlobal('document', {
    createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy(
        { canvas, measureText: (text: string) => ({ width: text.length * 7 }) },
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

const advance = (part: ReturnType<typeof equipmentDoors>, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += 0.05)
    part.update(Math.min(0.05, seconds - elapsed));
};

describe('paired equipment doors', () => {
  it('holds the first leaf until the second leaf’s hold expires', () => {
    const part = equipmentDoors(createPanelKit());
    const leaves = part.object.children.filter(
      (o): o is Group =>
        o instanceof Group && Math.abs(o.position.x) === EQUIPMENT_DOORS.w / 2,
    );
    expect(leaves).toHaveLength(2);
    part.uses.get(leaves[0])!();
    advance(part, 2.4);
    part.uses.get(leaves[1])!();
    advance(part, 0.8);
    advance(part, 2.3);
    expect(Math.abs(leaves[0].rotation.y)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(leaves[1].rotation.y)).toBeCloseTo(Math.PI / 2);
    advance(part, 0.3);
    expect(Math.abs(leaves[0].rotation.y)).toBeLessThan(Math.PI / 2);
    expect(Math.abs(leaves[1].rotation.y)).toBeLessThan(Math.PI / 2);
    expect(Math.abs(leaves[0].rotation.y)).toBeCloseTo(
      Math.abs(leaves[1].rotation.y),
    );
    part.dispose();
  });

  it('catches a leaf whose closer has already started when the other opens', () => {
    const part = equipmentDoors(createPanelKit());
    const leaves = part.object.children.filter(
      (o): o is Group =>
        o instanceof Group && Math.abs(o.position.x) === EQUIPMENT_DOORS.w / 2,
    );
    part.uses.get(leaves[0])!();
    advance(part, 3.5);
    const earlierAngle = Math.abs(leaves[0].rotation.y);
    expect(earlierAngle).toBeLessThan(Math.PI / 2);
    part.uses.get(leaves[1])!();
    advance(part, 0.8);
    const heldAngle = Math.abs(leaves[0].rotation.y);
    advance(part, 2.2);
    expect(Math.abs(leaves[0].rotation.y)).toBeCloseTo(heldAngle);
    part.dispose();
  });
});

describe('paired equipment doors with someone near (mission 090)', () => {
  const leavesOf = (part: ReturnType<typeof equipmentDoors>) =>
    part.object.children.filter(
      (o): o is Group =>
        o instanceof Group && Math.abs(o.position.x) === EQUIPMENT_DOORS.w / 2,
    );

  it('keeps an opened leaf open, and never opens the shut one', () => {
    const part = equipmentDoors(createPanelKit());
    const leaves = leavesOf(part);
    part.uses.get(leaves[0])!();
    part.setNearby(true);
    advance(part, 20);
    expect(Math.abs(leaves[0].rotation.y)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(leaves[1].rotation.y)).toBe(0);
    // Gone, the open leaf closes at once and briskly.
    part.setNearby(false);
    advance(part, 0.2);
    expect(Math.abs(leaves[0].rotation.y)).toBeCloseTo(Math.PI / 2);
    advance(part, 2);
    expect(Math.abs(leaves[0].rotation.y)).toBe(0);
    part.dispose();
  });

  it('both leaves, caught closing, open again', () => {
    const part = equipmentDoors(createPanelKit());
    const leaves = leavesOf(part);
    part.uses.get(leaves[0])!();
    part.uses.get(leaves[1])!();
    advance(part, 4);
    for (const l of leaves)
      expect(Math.abs(l.rotation.y)).toBeLessThan(Math.PI / 2 - 0.05);
    part.setNearby(true);
    advance(part, 1.5);
    for (const l of leaves)
      expect(Math.abs(l.rotation.y)).toBeCloseTo(Math.PI / 2);
    part.dispose();
  });

  it('handed over open, waits a full hold before closing', () => {
    const part = equipmentDoors(createPanelKit());
    part.swingTo(-1.3);
    advance(part, 2.3);
    expect(part.angle()).toBeCloseTo(1.3);
    part.dispose();
  });
});
