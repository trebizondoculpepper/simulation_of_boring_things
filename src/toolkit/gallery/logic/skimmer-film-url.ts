/**
 * The skimmer film's URL switches (the owner, 2026-10-29), for watching
 * and capturing it: `skimmer=reveal` starts the film as soon as the room
 * (Hall 5, `?room=museum5`, or dev53) can play it; `filmSpeed=0.25` runs
 * it at a quarter speed; `filmFps=10` advances it exactly 1/10 s per
 * frame drawn, whatever the clock says, so a headless browser captures
 * every frame alike. Absent, the film runs as it always has. Pure.
 */

export interface SkimmerFilmUrl {
  /** Start the film at once. */
  reveal: boolean;
  /** The film's time scale (1 is real time). */
  speed: number;
  /** Seconds of film per frame drawn, fixed; null to follow the clock. */
  fixedStep: number | null;
}

const positive = (text: string | null) => {
  if (text === null) return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** The switches in a URL's query (`location.search`). */
export function skimmerFilmUrl(search: string): SkimmerFilmUrl {
  const q = new URLSearchParams(search);
  const fps = positive(q.get('filmFps'));
  return {
    reveal: q.get('skimmer') === 'reveal',
    speed: positive(q.get('filmSpeed')) ?? 1,
    fixedStep: fps === null ? null : 1 / fps,
  };
}

/** Seconds of film to advance for a frame `delta` seconds after the last. */
export function filmStep(url: SkimmerFilmUrl, delta: number): number {
  return (url.fixedStep ?? delta) * url.speed;
}
