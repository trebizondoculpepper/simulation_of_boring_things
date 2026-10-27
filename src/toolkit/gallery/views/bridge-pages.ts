import type { PanelKit } from '../../components/core/views/eighties-controls';

import type { LiveExhibit } from '../rooms/plant/exhibit';
import { PANEL_PAGES } from '../logic/bridge-pages';
import {
  createOlympicFilterWashingPanel,
  olympicFilterWashingPage,
} from './olympic-filter-washing';
import type { LivePage, PageLive } from './olympic-filter-washing';

/**
 * The bridge's own pages built (`logic/bridge-pages.ts`): each as a page
 * of `ui2d` for a panel to carry after its own, and as a touch surface of
 * its own, its glass `size` about its origin facing +z, for a console
 * that shows it alone. Each reads the world and asks it only through
 * `live`.
 */
export interface CustomPageBuilder {
  page(live: PageLive): LivePage;
  surface(
    kit: PanelKit,
    size: { w: number; h: number },
    live: PageLive,
  ): LiveExhibit;
}

export const CUSTOM_PAGES: Readonly<Record<string, CustomPageBuilder>> = {
  'olympic-filter-washing': {
    page: olympicFilterWashingPage,
    surface: (kit, size, live) =>
      createOlympicFilterWashingPanel(kit, live, size),
  },
};

/** The pages panel `code` shows after its own, built for it. */
export const livePagesFor = (code: string, live: PageLive): LivePage[] =>
  (PANEL_PAGES[code] ?? []).flatMap((id) => {
    const b = CUSTOM_PAGES[id];
    return b ? [b.page(live)] : [];
  });
