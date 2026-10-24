import { roomWorld } from '../../save/world-store';
import { serviceAvailable } from '../../../game/plant/services';
import type { MusicBinding } from '../../components/sound/parts/music-binding';

/** Both halls and plant rooms read the same saved transport and amplifier. */
export function bindJacuzziMusic(): MusicBinding {
  const store = roomWorld();
  return {
    source: store.read((w) => w.music.zones.jacuzzi.source),
    amplifier: store.read((w) => w.music.zones.jacuzzi.amplifier),
    powered: store.read((w) =>
      serviceAvailable(w.plant, 'plant_pool_03', 'power'),
    ),
    skip: () =>
      store.dispatch({
        type: 'music',
        action: { type: 'skip', zone: 'jacuzzi' },
      }),
    toggle: () =>
      store.dispatch({
        type: 'music',
        action: { type: 'toggle', zone: 'jacuzzi' },
      }),
    volume: (volume) =>
      store.dispatch({
        type: 'music',
        action: { type: 'volume', zone: 'jacuzzi', volume },
      }),
  };
}
