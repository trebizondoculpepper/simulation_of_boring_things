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

/**
 * The amplifier's state, as an active component's (the owner, 2026-10-25):
 * no supply, switched off, or on at its volume.
 */
export function amplifierStatus(s: AmplifierState, powered: boolean): string {
  if (!powered) return 'No power';
  if (!s.on) return 'Off';
  return `On, volume ${Math.round(s.volume * 100)} %`;
}
