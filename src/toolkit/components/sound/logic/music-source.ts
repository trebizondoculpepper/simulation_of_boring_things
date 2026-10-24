/** The programme transport lives in the model, independent of its speakers. */
export interface MusicSourceState {
  track: number;
  position: number;
}
export const newMusicSource = (): MusicSourceState => ({
  track: 0,
  position: 0,
});
export const skipMusicSource = (
  s: MusicSourceState,
  count: number,
): MusicSourceState =>
  count > 0 ? { track: (s.track + 1) % count, position: 0 } : s;
export function stepMusicSource(
  s: MusicSourceState,
  seconds: number,
  powered: boolean,
  durations: readonly number[],
): MusicSourceState {
  if (
    !powered ||
    seconds <= 0 ||
    !Number.isFinite(seconds) ||
    !durations.length
  )
    return s;
  const total = durations.reduce((a, b) => a + b, 0);
  if (total <= 0 || durations.some((d) => d <= 0)) return s;
  let track = Math.max(0, Math.floor(s.track)) % durations.length;
  let position = (Math.max(0, s.position) + seconds) % total;
  while (position >= durations[track]) {
    position -= durations[track];
    track = (track + 1) % durations.length;
  }
  return { track, position };
}
