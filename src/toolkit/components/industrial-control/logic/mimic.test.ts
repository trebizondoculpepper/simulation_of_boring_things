import { describe, expect, it } from 'vite-plus/test';
import { checkMimic, legendText, readoutText } from './mimic';
import type { MimicSpec } from './mimic';

describe('a mimic panel', () => {
  it('shows a reading right-aligned in four digits, with its decimals', () => {
    expect(readoutText({ value: 612, unit: 'm3/h', name: 'FLOW' })).toBe(
      ' 612',
    );
    expect(
      readoutText({ value: 29.24, unit: 'C', places: 1, name: 'POOL' }),
    ).toBe(' 29.2');
    expect(
      readoutText({ value: 0.72, unit: 'bar', places: 2, name: 'DP' }),
    ).toBe(' 0.72');
  });

  it('blanks a readout with nothing to show, and dashes one that overflows', () => {
    expect(readoutText(undefined)).toBe('    ');
    expect(readoutText({ value: 12345, unit: 'x', name: 'BIG' })).toBe('----');
  });

  it('says what a readout shows on its legend, within ten characters', () => {
    expect(legendText({ value: 1, unit: 'bar', name: 'P1 OUT' })).toBe(
      'P1 OUT bar',
    );
    expect(legendText({ value: 1, unit: 'm3/h', name: 'FILTER BANK' })).toBe(
      'FILTE m3/h',
    );
    expect(legendText(undefined)).toBe('');
  });

  it('finds what is wrong with a board', () => {
    const spec: MimicSpec = {
      title: 'TEST',
      width: 1,
      height: 0.5,
      lines: [
        {
          colour: '#000',
          points: [
            [0, 0],
            [0.6, 0],
          ],
        },
      ],
      shapes: [],
      lamps: [
        { id: 'a', at: [0, 0], colour: 'green' },
        { id: 'a', at: [0.1, 0], colour: 'red' },
      ],
      readouts: [{ id: 'r', at: [0, 0.1] }],
      modes: [{ id: 'flow', legend: 'FLOW' }],
    };
    const problems = checkMimic(spec, { lamps: {}, readouts: {} });
    expect(problems).toContain('duplicate id a');
    expect(problems.some((p) => p.startsWith('a line runs off'))).toBe(true);
    expect(problems).toContain('lamp a is not driven');
    expect(problems).toContain('readout r shows nothing in any mode');
  });
});
