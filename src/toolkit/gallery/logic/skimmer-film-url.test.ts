import { describe, expect, it } from 'vite-plus/test';
import { filmStep, skimmerFilmUrl } from './skimmer-film-url';

describe('skimmerFilmUrl', () => {
  it('leaves the film alone when absent', () => {
    const url = skimmerFilmUrl('?room=museum5');
    expect(url).toEqual({ reveal: false, speed: 1, fixedStep: null });
    expect(filmStep(url, 0.016)).toBe(0.016);
  });

  it('starts the film, slowed, at a fixed rate', () => {
    const url = skimmerFilmUrl(
      '?room=museum5&skimmer=reveal&filmSpeed=0.25&filmFps=10',
    );
    expect(url.reveal).toBe(true);
    expect(filmStep(url, 0.5)).toBeCloseTo(0.025);
  });

  it('ignores nonsense', () => {
    const url = skimmerFilmUrl('?skimmer=yes&filmSpeed=-1&filmFps=abc');
    expect(url).toEqual({ reveal: false, speed: 1, fixedStep: null });
  });
});
