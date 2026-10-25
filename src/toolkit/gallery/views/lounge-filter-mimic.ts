import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMimicBoard } from '../../components/industrial-control/views/mimic-board';
import type { WorldStore } from '../../save/world-store';
import {
  LOUNGE_FILTER_MIMIC,
  LOUNGE_FILTER_MIMIC_PARTS,
  loungeFilterMimicCommand,
  loungeFilterMimicOf,
} from '../logic/lounge-filter-mimic';

/**
 * The lounge pool's filter mimic (prompt 066), one component for both its
 * installations: PL1-CP1's fascia in the lounge plant room and the
 * control room's wall. Each binds its buttons to the same world commands
 * and shows the same world, so the two always agree; neither carries a
 * pump's HAND · OFF · AUTO or RESET, which are on PL1-CP1's doors alone.
 */
export function createLoungeFilterMimic(
  kit: PanelKit,
  store: WorldStore | null,
) {
  const mimic = createMimicBoard(kit, LOUNGE_FILTER_MIMIC, {
    maker: 'penfold',
    press: (button) => {
      const action = loungeFilterMimicCommand(button);
      if (action) store?.dispatch(action);
    },
    parts: LOUNGE_FILTER_MIMIC_PARTS,
  });
  return {
    ...mimic,
    update(delta: number) {
      mimic.parts.update(delta);
      if (store) mimic.show(loungeFilterMimicOf(store.world.value));
    },
  };
}
