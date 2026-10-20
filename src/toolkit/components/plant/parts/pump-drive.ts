import type { PanelKit } from '../../core/views/eighties-controls';
import { createPartSet, disconnectHandle } from '../../core/parts/parts';
import { createDriveView } from '../views/pumps-plant';

/** The development drive, supplied through the standard rotary disconnect. */
export function createPumpDrive(kit: PanelKit) {
  const view = createDriveView(kit);
  const parts = createPartSet();
  const isolator = parts.add(
    disconnectHandle(kit, {
      style: 'rotary',
      sound: 'soft-click',
      initial: 'on',
      name: 'Pump drive rotary isolator',
    }),
  );
  view.isolatorFace.add(isolator.object);
  return {
    object: view.group,
    parts,
    update() {
      view.setPowered(isolator.on.value);
    },
  };
}
