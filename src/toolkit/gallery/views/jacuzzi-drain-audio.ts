import { computed, signal } from '@preact/signals-core';
import { beginPart } from '../../components/core/parts/parts';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { drainGurgle } from '../../components/plant/audio/drain';
import { worldStore } from '../../save/world-store';
import { jacuzziDischarging } from '../../../game/world';
import { jacuzziDrainDoorGain } from '../logic/jacuzzi-acoustics';

/** Receive the actual plant drain in the hall, through its opening or closed door. */
export function createJacuzziDrainAudio(kit: PanelKit) {
  const a = beginPart(kit, 'Jacuzzi drain through plant door');
  const store = worldStore('dev');
  const angle = signal(0);
  const draining = store.read(jacuzziDischarging);
  const level = computed(() => 0.08 * jacuzziDrainDoorGain(angle.value));
  const part = a.part();
  part.setAudible(false);
  a.holdWhile(draining, drainGurgle(level), null);
  return {
    ...part,
    setDoorAngle(value: number) {
      angle.value = value;
    },
  };
}
