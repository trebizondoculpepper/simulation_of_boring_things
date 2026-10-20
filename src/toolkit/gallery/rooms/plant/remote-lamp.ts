import type { PlantExhibit } from './exhibit';
import { REMOTE_LAMP } from './remote-demo';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'A lamp showing dev14’s button from the world, and a RESET for it';

export const EXHIBITS: readonly PlantExhibit[] = [REMOTE_LAMP];
