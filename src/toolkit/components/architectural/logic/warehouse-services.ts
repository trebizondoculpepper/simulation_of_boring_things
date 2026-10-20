import { signal } from '@preact/signals-core';
import type { ReadonlySignal, Signal } from '@preact/signals-core';
import type { FireAlarmSystem } from '../../fire/logic/fire-alarm-system';
import { createBuildingServices } from './building-services';
import type { BuildingServices } from './building-services';

/** Physical pendant-head locations; room-wide service wiring is deliberately deferred. */
export const WAREHOUSE_HEADS = Array.from({ length: 10 }, (_, z) =>
  Array.from({ length: 10 }, (_, x) => ({
    x: -13.5 + x * 3,
    z: -13.5 + z * 3,
  })),
).flat();
/**
 * The services a building's installed fittings bind to: its building
 * services model (a fresh one, or a room's own, so that its catalogue
 * fittings and its working ones share one supply), its call points and a
 * test drain.
 */
export function createArchitecturalServices(
  model: BuildingServices = createBuildingServices(),
) {
  const callPoints = [signal(false), signal(false)];
  let serial = 0;
  return {
    model,
    callPoints,
    testDrain: model.g.input('architectural.testDrain', false),
    id: () => `architectural.${serial++}`,
    press(index: number) {
      callPoints[index].value = true;
      model.fire.pressCallPoint();
    },
    reset(index: number) {
      callPoints[index].value = false;
      if (!callPoints.some((p) => p.value)) model.fire.resetCallPoint();
    },
  };
}
export type ArchitecturalServices = ReturnType<
  typeof createArchitecturalServices
>;

/** What a building's fire fittings bind to: its fire alarm and sprinklers. */
export type FireSource = Pick<
  FireAlarmSystem,
  | 'panelKey'
  | 'riserValve'
  | 'detector'
  | 'sounding'
  | 'panelLamps'
  | 'heads'
  | 'discharging'
  | 'pressCallPoint'
  | 'resetCallPoint'
  | 'silence'
  | 'evacuate'
  | 'reset'
  | 'resetSprinklers'
>;

/**
 * A warehouse's fire fittings wired to one fire alarm system, so they
 * work together as a real installation does: any call point sets the
 * whole alarm off and latches on its own, every sounder and detector
 * shows the one system, and each sprinkler head is its own head in it.
 * `tone`, from a voice alarm, cues the sounders between its messages.
 */
export function createWarehouseFire(
  system: FireSource,
  tone?: ReadonlySignal<boolean>,
) {
  const callPoints: Signal<boolean>[] = [];
  const latch = (i: number) => (callPoints[i] ??= signal<boolean>(false));
  return {
    system,
    tone,
    latch,
    press(i: number) {
      latch(i).value = true;
      system.pressCallPoint();
    },
    reset(i: number) {
      latch(i).value = false;
      if (!callPoints.some((p) => p?.value)) system.resetCallPoint();
    },
  };
}
export type WarehouseFire = ReturnType<typeof createWarehouseFire>;
