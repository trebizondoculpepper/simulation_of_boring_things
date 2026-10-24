import {
  amplifierVolume,
  newAmplifier,
} from '../../toolkit/components/sound/logic/amplifier';
import type { AmplifierState } from '../../toolkit/components/sound/logic/amplifier';
import {
  newMusicSource,
  skipMusicSource,
  stepMusicSource,
} from '../../toolkit/components/sound/logic/music-source';
import type { MusicSourceState } from '../../toolkit/components/sound/logic/music-source';
export const MUSIC_ZONES = [
  'jacuzzi',
  'lazy_pool',
  'olympic',
  'footbath',
] as const;
export type MusicZone = (typeof MUSIC_ZONES)[number];
export const JACUZZI_TRACKS = [
  { title: 'Bamboo and Morning Mist', duration: 209.4 },
  { title: 'Glass Water Garden', duration: 127.344 },
  { title: 'Pavilion at First Light', duration: 106.32 },
  { title: 'Petals on Slow Water', duration: 225.192 },
  { title: 'Softly, Slowly Rising', duration: 232.872 },
  { title: 'The Weightless Hour', duration: 188.232 },
] as const;
export const JACUZZI_DURATIONS = JACUZZI_TRACKS.map((t) => t.duration);
export interface MusicChannel {
  source: MusicSourceState;
  amplifier: AmplifierState;
}
export interface ZoneMusicState {
  zones: Record<MusicZone, MusicChannel>;
}
const channel = (): MusicChannel => ({
  source: newMusicSource(),
  amplifier: newAmplifier(),
});
export const newZoneMusic = (): ZoneMusicState => ({
  zones: {
    jacuzzi: channel(),
    lazy_pool: channel(),
    olympic: channel(),
    footbath: channel(),
  },
});
export type ZoneMusicAction =
  | { type: 'toggle'; zone: MusicZone }
  | { type: 'volume'; zone: MusicZone; volume: number }
  | { type: 'skip'; zone: MusicZone };
export function actOnZoneMusic(
  s: ZoneMusicState,
  a: ZoneMusicAction,
): ZoneMusicState {
  const zone = s.zones[a.zone];
  const next =
    a.type === 'skip'
      ? {
          ...zone,
          source: skipMusicSource(
            zone.source,
            a.zone === 'jacuzzi' ? JACUZZI_TRACKS.length : 0,
          ),
        }
      : {
          ...zone,
          amplifier:
            a.type === 'toggle'
              ? { ...zone.amplifier, on: !zone.amplifier.on }
              : amplifierVolume(zone.amplifier, a.volume),
        };
  return { zones: { ...s.zones, [a.zone]: next } };
}
export function stepZoneMusic(
  s: ZoneMusicState,
  seconds: number,
  powered: boolean,
): ZoneMusicState {
  const source = stepMusicSource(
    s.zones.jacuzzi.source,
    seconds,
    powered,
    JACUZZI_DURATIONS,
  );
  return source === s.zones.jacuzzi.source
    ? s
    : { zones: { ...s.zones, jacuzzi: { ...s.zones.jacuzzi, source } } };
}
