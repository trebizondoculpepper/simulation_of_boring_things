import { describe, expect, it } from 'vite-plus/test';
import { exchangerPorts } from '../../components/plant/logic/shell-tube-exchanger';

describe('the pool heat exchanger as each of its variants', () => {
  it('keeps the same four ports in every variant, so the graph does not change', () => {
    for (const v of [
      'shell-tube-plinth',
      'plate-floor',
      'plate-plinth',
    ] as const)
      expect(Object.keys(exchangerPorts(v)).sort()).toEqual([
        'pool-in',
        'pool-out',
        'primary-in',
        'primary-out',
      ]);
  });
});
