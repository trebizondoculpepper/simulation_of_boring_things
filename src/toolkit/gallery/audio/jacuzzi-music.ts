import { JACUZZI_TRACKS } from '../../../game/plant/music';
/** Owner-supplied Still Water Garden tracks; fixed jacuzzi-only programme. */
const files = [
  new URL(
    '../../../../resources/sound/music/jacuzzi/Still Water Garden - Bamboo and Morning Mist - Treblo.mp3',
    import.meta.url,
  ),
  new URL(
    '../../../../resources/sound/music/jacuzzi/Still Water Garden - Glass Water Garden - Treblo.mp3',
    import.meta.url,
  ),
  new URL(
    '../../../../resources/sound/music/jacuzzi/Still Water Garden - Pavilion at First Light - Treblo.mp3',
    import.meta.url,
  ),
  new URL(
    '../../../../resources/sound/music/jacuzzi/Still Water Garden - Petals on Slow Water - Treblo.mp3',
    import.meta.url,
  ),
  new URL(
    '../../../../resources/sound/music/jacuzzi/Still Water Garden - Softly, Slowly Rising - Treblo.mp3',
    import.meta.url,
  ),
  new URL(
    '../../../../resources/sound/music/jacuzzi/Still Water Garden - The Weightless Hour - Treblo.mp3',
    import.meta.url,
  ),
] as const;

export const JACUZZI_MUSIC = files.map((url, index) => ({
  url,
  ...JACUZZI_TRACKS[index],
}));
