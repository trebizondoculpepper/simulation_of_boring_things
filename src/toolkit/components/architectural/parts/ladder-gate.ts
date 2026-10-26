import { beginPart } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createSafetySign } from '../../general-safety/views/safety-signs';
import {
  initialPlantDoor,
  workDoor,
  stepPlantDoor,
  holdDoorOpen,
} from '../logic/plant-door';

/** A spring-return ladder-access gate, opening away from the pit; frame at its left hinge. */
export function ladderGate(kit: PanelKit, width: number) {
  const a = beginPart(kit, 'Ladder access gate');
  const t = tools(kit);
  const yellow = t.paint('#e3b520', 0.5);
  for (const y of [0.5, 1])
    t.box(a.object, yellow, width, 0.035, 0.035, width / 2, y, 0);
  for (const x of [0.02, width])
    t.box(a.object, yellow, 0.035, 0.6, 0.035, x, 0.75, 0);
  for (const y of [0.5, 1])
    t.cyl(a.object, t.paint('#747b7b', 0.4, 0.7), 0.027, 0.09, 0, y, 0);
  const sign = createSafetySign(
    kit,
    ['confined'],
    ['Confined space', 'Entry by permit only'],
  );
  sign.position.set(width / 2, 0.75, 0.03);
  a.object.add(sign);
  let state = initialPlantDoor();
  a.uses.set(a.object, () => {
    state = workDoor(state);
  });
  a.shows(() =>
    state.angle < 0.05
      ? 'Closed'
      : state.phase === 'closing'
        ? 'Closing'
        : 'Open',
  );
  a.updates.push((dt) => {
    state = stepPlantDoor(state, dt).state;
    a.object.rotation.y = -state.angle;
  });
  return {
    ...a.part(),
    angle: () => state.angle,
    holdOpen: () => {
      state = holdDoorOpen(state);
    },
  };
}
