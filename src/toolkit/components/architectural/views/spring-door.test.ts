import { describe, expect, it } from 'vite-plus/test';
import { SPRING_LEAF, SPRING_OPENING } from './spring-door';

describe('spring door fit', () => {
  it('keeps the leaf within a narrow rebate of its frame', () => {
    expect(SPRING_OPENING.width - SPRING_LEAF.width).toBeGreaterThan(0);
    expect(SPRING_OPENING.width - SPRING_LEAF.width).toBeLessThan(0.02);
    // The leaf is raised 10 mm above the floor in createSpringDoorView.
    expect(SPRING_OPENING.height - SPRING_LEAF.height - 0.01).toBeGreaterThan(
      0,
    );
    expect(SPRING_OPENING.height - SPRING_LEAF.height - 0.01).toBeLessThan(
      0.02,
    );
  });
});
