export interface AmplifierState {
  on: boolean;
  volume: number;
}
export const newAmplifier = (): AmplifierState => ({ on: false, volume: 0.4 });
export const amplifierOutput = (state: AmplifierState, powered: boolean) =>
  powered && state.on ? state.volume : 0;
export const amplifierVolume = (
  s: AmplifierState,
  volume: number,
): AmplifierState => ({
  ...s,
  volume: Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : s.volume,
});
