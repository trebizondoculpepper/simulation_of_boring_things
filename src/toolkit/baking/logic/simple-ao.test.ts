import { describe, expect, it } from 'vite-plus/test';
import {
  SIMPLE_AO_LOOKS,
  boxDistance,
  chooseOccluders,
  simpleOcclusion,
  simpleVertexAo,
} from './simple-ao';
import type { Box, SimpleAoScene } from './simple-ao';

const room: Box = [-5, 0, -5, 5, 3, 5];
const plinth: Box = [-0.5, 0, -0.5, 0.5, 1, 0.5];
const look = { ...SIMPLE_AO_LOOKS.standard, strength: 0.3, floor: 0 };
const scene = (over: Partial<SimpleAoScene> = {}): SimpleAoScene => ({
  interiors: [room],
  occluders: [plinth],
  lights: [],
  unit: 1,
  look,
  ...over,
});
const floorAt = (x: number, z: number, s = scene()) =>
  simpleOcclusion(x, 0, z, 0, 1, 0, s);

describe('SIMPLE ambient occlusion', () => {
  it('measures a box’s signed distance', () => {
    expect(boxDistance(0, 2, 0, plinth)).toBeCloseTo(1);
    expect(boxDistance(0, 0.5, 0, plinth)).toBeCloseTo(-0.5);
  });

  it('leaves an open floor open, darker by a wall, darker still in a corner', () => {
    const open = floorAt(2.5, 2.5);
    const byWall = floorAt(4.95, 2.5);
    const corner = floorAt(4.95, 4.95);
    expect(open).toBe(1);
    expect(byWall).toBeLessThan(0.85);
    expect(corner).toBeLessThan(byWall);
  });

  it('darkens the floor round a plinth, never the plinth itself', () => {
    expect(floorAt(0.55, 0)).toBeLessThan(0.85);
    expect(simpleOcclusion(0, 1, 0, 0, 1, 0, scene())).toBe(1);
    // Its side high up, away from the floor: open.
    expect(
      simpleOcclusion(
        0.5,
        1.5,
        0,
        1,
        0,
        0,
        scene({ occluders: [[-0.5, 0, -0.5, 0.5, 2.4, 0.5]] }),
      ),
    ).toBe(1);
  });

  it('leaves the interiors out for a point outside them all', () => {
    expect(floorAt(8, 0)).toBe(1);
  });

  it('darkens a corner more far from the lamps in a plant room', () => {
    const plant = { ...SIMPLE_AO_LOOKS.plant, strength: 0.2 };
    const lit = scene({ look: plant, lights: [4.5, 2.5, 4.5] });
    const dark = scene({ look: plant, lights: [-4.5, 2.5, -4.5] });
    expect(floorAt(4.95, 4.95, dark)).toBeLessThan(floorAt(4.95, 4.95, lit));
  });

  it('keeps big solid things only', () => {
    const wall: Box = [4.9, 0, -5, 5, 3, 5];
    const cable: Box = [-4, 2, 0, 4, 2.05, 0.05];
    const bolt: Box = [0, 0.9, 0, 0.2, 1, 0.2];
    const pipeRun: Box = [-1, 0, 2, 1, 2, 2.5];
    const sign: Box = [2, 1, 4.8, 2.6, 1.6, 4.9];
    const pump: Box = [2, 0, -2, 3, 1, -1.5];
    expect(
      chooseOccluders(
        [
          { box: wall },
          { box: cable },
          { box: bolt },
          { box: pipeRun, fill: 0.2 },
          { box: sign },
          { box: plinth, fill: 1.2 },
          { box: pump, excluded: true },
        ],
        [room],
        1,
      ),
    ).toEqual([plinth]);
  });

  it('darkens a wall’s foot within about 0.6 m, not beyond', () => {
    const plant = scene({ look: { ...SIMPLE_AO_LOOKS.plant }, occluders: [] });
    const wallAt = (y: number) => simpleOcclusion(5, y, 0, -1, 0, 0, plant);
    expect(wallAt(0.05)).toBeLessThan(0.85);
    expect(wallAt(0.7)).toBe(1);
  });

  it('counts a wall a little off the plan’s line as the plan’s wall', () => {
    const s2 = scene({ occluders: [] });
    // A wall face 4 cm outside the plan, near the floor: still darkened.
    expect(simpleOcclusion(5.04, 0.05, 0, -1, 0, 0, s2)).toBeLessThan(0.9);
  });

  it('gives a byte a vertex, 255 open', () => {
    const ao = simpleVertexAo(
      new Float32Array([2.5, 0, 2.5, 4.95, 0, 4.95]),
      new Float32Array([0, 1, 0, 0, 1, 0]),
      scene(),
    );
    expect(ao[0]).toBe(255);
    expect(ao[1]).toBeLessThan(200);
  });
});
