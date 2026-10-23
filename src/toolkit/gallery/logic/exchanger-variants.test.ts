import { describe, expect, it } from 'vite-plus/test';
import { exhibitsFor } from '../rooms/plant/port-graph-demo';
import { BASE_MODEL, withVariant } from '../../../game/plant/demo-variants';
import { exchangerPorts } from '../../components/plant/logic/shell-tube-exchanger';
import { ADOPTED_RULES } from './port-graph-demo-routes';
import {
  DEV19C_SEED,
  dev19Candidate,
  scoreDev19,
  scoreDev19Placement,
} from './dev19-scoring';
import { rank } from './room-scorer';

const portHeights = (s: ReturnType<typeof scoreDev19Placement>) =>
  s.dimensions.find((d) => d.name === 'port heights')!.score;

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

  it('marks down a plate exchanger on the floor for its low ports, and lifts them on a plinth', () => {
    const score = (v: string) => {
      const model = withVariant(BASE_MODEL, 'demo.hx', v);
      const sizes = exhibitsFor(model).map((e) => e.size);
      return scoreDev19Placement(
        v,
        sizes,
        dev19Candidate(sizes, 1, true, model),
        model,
      );
    };
    expect(portHeights(score('plate-floor'))).toBeLessThan(
      portHeights(score('plate-plinth')),
    );
  }, 120000);

  it('ranks the shell-and-tube exchanger on its plinth first', () => {
    const scored = (
      ['shell-tube-plinth', 'plate-floor', 'plate-plinth'] as const
    ).map((v) => {
      const model = withVariant(BASE_MODEL, 'demo.hx', v);
      const sizes = exhibitsFor(model).map((e) => e.size);
      return scoreDev19(
        v,
        sizes,
        dev19Candidate(sizes, DEV19C_SEED, true, model),
        ADOPTED_RULES,
        model,
      );
    });
    expect(rank(scored)[0].name).toBe('shell-tube-plinth');
  }, 180000);
});
