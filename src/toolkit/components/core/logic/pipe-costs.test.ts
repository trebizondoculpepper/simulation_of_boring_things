import { describe, expect, it } from 'vite-plus/test';
import { pricePerMetre } from './pipe-costs';

describe('what pipework costs', () => {
  it('costs more the bigger it is', () => {
    expect(pricePerMetre('pvc-pressure', 0.09)).toBeGreaterThan(
      pricePerMetre('pvc-pressure', 0.05),
    );
    expect(pricePerMetre('copper', 0.028)).toBeGreaterThan(
      pricePerMetre('copper', 0.015),
    );
  });
  it('costs more in steel than in plastic, and more lagged than bare', () => {
    expect(pricePerMetre('steel-screwed', 0.0483)).toBeGreaterThan(
      pricePerMetre('pvc-pressure', 0.05),
    );
    expect(pricePerMetre('lagged-heating', 0.0483)).toBeGreaterThan(
      pricePerMetre('steel-screwed', 0.0483),
    );
    expect(pricePerMetre('twin-wall-flue', 0.2)).toBeGreaterThan(
      pricePerMetre('lagged-heating', 0.0483),
    );
  });
  it('prices conduit carrying cables as conduit, not as screwed pipe', () => {
    expect(
      pricePerMetre('steel-screwed', 0.0213, { conduit: true }),
    ).toBeLessThan(pricePerMetre('steel-screwed', 0.0213));
  });
});
