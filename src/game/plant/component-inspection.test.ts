import { describe, expect, it } from 'vite-plus/test';
import { inspectComponent } from './component-inspection';
import { newWorld } from '../world';

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
});
