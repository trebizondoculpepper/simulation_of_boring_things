import type { PlantExhibit } from './exhibit';
import { REMOTE_BUTTON } from './remote-demo';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'A button whose state lives in the world: its lamp is in dev15';

export const EXHIBITS: readonly PlantExhibit[] = [REMOTE_BUTTON];
