import type { PanelKit } from '../../../components/core/views/eighties-controls';
import type { LiveExhibit } from '../plant/exhibit';
import type { MuseumHallId } from '../../logic/museum-plan';

/**
 * A museum hall's exhibit (107-0): a working exhibit (`LiveExhibit`: its
 * model, the parts a visitor works, what it does each frame, what it puts
 * in the walker's way), built in the hall's own frame in metres, and put
 * back to its reset state, its clock at `now`, by `reset` (rule 1: walking
 * in is pressing its RESET button). A hall finds its exhibit by its
 * number's room id, never by where the hall stands.
 */
export interface HallExhibit extends LiveExhibit {
  /** Back to the start, its clock at `now`, seconds after the visitor's midnight. */
  reset(now: number): void;
}

export interface HallExhibitModule {
  buildHallExhibit(kit: PanelKit): HallExhibit;
}

/** Each hall's exhibit, loaded when the hall is built; a hall still empty has none. */
export const HALL_EXHIBITS: Partial<
  Record<MuseumHallId, () => Promise<HallExhibitModule>>
> = {
  museum1: () => import('./hall-1-warm-water'),
  museum7: () => import('./hall-7-grout'),
  museum8: () => import('./hall-8-never-again'),
};
