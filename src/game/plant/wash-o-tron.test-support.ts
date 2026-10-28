import { applyAction } from '../world';
import type { World } from '../world';
import type { WashAction } from './wash-o-tron';

export const act = (w: World, action: WashAction) =>
  applyAction(w, { type: 'wash-o-tron', action });

/** Every filter due a wash: last washed long ago. */
export const allDue = (w: World): World => ({
  ...w,
  washOTron: {
    ...w.washOTron,
    filters: w.washOTron.filters.map((f) => ({ ...f, lastWash: -1e9 })),
  },
});
