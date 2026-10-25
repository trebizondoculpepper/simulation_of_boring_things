import { describe, expect, it } from 'vite-plus/test';
import { inspectComponent } from './component-inspection';
import { applyAction, newWorld, stepWorld } from '../world';

describe('the information overlay’s lines', () => {
  it('gives a valve’s tag, name and what it isolates', () => {
    expect(inspectComponent({ tag: 'PL2-F1-V1' }, newWorld())).toEqual({
      key: 'PL2-F1-V1',
      title: 'PL2-F1-V1: F1 inlet valve',
      detail:
        'Isolates water flowing from the circulation pumps to sand filter 1. Currently open.',
    });
    // The jacuzzi's, from its schematic (prompt 064).
    expect(inspectComponent({ tag: 'PL3-BT1-IV1' }, newWorld())).toEqual({
      key: 'PL3-BT1-IV1',
      title: 'PL3-BT1-IV1: Make-up to the balance tank valve',
      detail:
        'Isolates water flowing from the water service to the jacuzzi balance tank. Currently open.',
    });
  });

  it('gives the first Olympic pump its place and its live state', () => {
    const lines = inspectComponent({ tag: 'P-101A' }, newWorld());
    expect(lines?.title).toBe('P-101A: Olympic pool duty circulation pump');
    expect(lines?.detail).toMatch(/^1st Pump in PL2, currently (On|Off)$/);
  });

  it('leaves out a second line it has nothing for, names an untagged thing alone, and knows no stranger', () => {
    expect(inspectComponent({ tag: 'PL2-F-RV1' })).toEqual({
      key: 'PL2-F-RV1',
      title: 'PL2-F-RV1: Side-stream regulating valve',
    });
    expect(inspectComponent({ name: 'Cabinet RESET' })).toEqual({
      key: 'name:Cabinet RESET',
      title: 'Cabinet RESET',
    });
    expect(inspectComponent({ tag: 'XX-NOPE1' })).toBeNull();
    expect(
      inspectComponent({ tag: 'DEV-FT1', name: 'Demonstration flowmeter' }),
    ).toEqual({ key: 'DEV-FT1', title: 'DEV-FT1: Demonstration flowmeter' });
    expect(inspectComponent({})).toBeNull();
  });

  it('gives an ozone monitor its live reading, rising with a leak', () => {
    const quiet = inspectComponent({ tag: 'PL1-GD1' }, newWorld());
    expect(quiet?.detail).toBe(
      'The only Ozone-in-air monitor in PL1, currently reading 0.00 ppm',
    );
    let w = applyAction(newWorld(), {
      type: 'gas/leak',
      zone: 'plant_pool_01',
      gramsPerHour: 5,
    });
    w = stepWorld(w, 600);
    // As its display shows it: a reading above nothing, or over its range.
    expect(inspectComponent({ tag: 'PL1-GD1' }, w)?.detail).toMatch(
      /currently reading (0\.(0[1-9]|[1-9]\d)|1\.\d\d) ppm|currently reading over its range \(O-R\)/,
    );
  });

  it('says a UV unit is On or Off, as the world models it, never “operational”', () => {
    let w = stepWorld(newWorld(), 5);
    expect(inspectComponent({ tag: 'PL1-UV1' }, w)?.detail).toBe(
      'The only UV unit in PL1, currently On',
    );
    w = applyAction(w, {
      type: 'plant/isolator',
      name: 'Lounge UV unit isolator',
      on: false,
    });
    w = stepWorld(w, 2);
    expect(inspectComponent({ tag: 'PL1-UV1' }, w)?.detail).toBe(
      'The only UV unit in PL1, currently Off',
    );
  });

  it('gives a travelling lounge valve where it actually is, not where it is commanded', () => {
    const tag = 'PL1-F1-IV1';
    let w = stepWorld(newWorld(), 1);
    // PL1-F1-IV1 is kept under valve-0001.
    w = applyAction(w, { type: 'plant/valve', id: 'valve-0001', open: false });
    w = stepWorld(w, 2);
    expect(inspectComponent({ tag }, w)?.detail).toMatch(
      /Currently part open\.$/,
    );
    w = stepWorld(w, 3);
    expect(inspectComponent({ tag }, w)?.detail).toMatch(/Currently shut\.$/);
  });
});
