import { computed, signal } from '@preact/signals-core';
import { beginPart } from '../../components/core/parts/parts';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { drainGurgle } from '../../components/plant/audio/drain';
import { worldStore } from '../../save/world-store';
import { jacuzziDischarging } from '../../../game/world';
import type { Object3D } from 'three';
import {
  JACUZZI_DRAIN_AT_DOOR,
  jacuzziDrainDoorGain,
} from '../logic/jacuzzi-acoustics';

/**
 * The plant room's drain heard in the hall: from its plant room door,
 * `from`, as fallen off on its way there from the tundish behind the
 * cabinet, and through the door, open or shut; quieter again further
 * into the hall. Always quieter than at the tundish itself.
 */
export function createJacuzziDrainAudio(kit: PanelKit, from: Object3D) {
  const a = beginPart(kit, 'Jacuzzi drain through plant door');
  const store = worldStore('dev');
  const angle = signal(0);
  const draining = store.read(jacuzziDischarging);
  const level = computed(
    () => 0.08 * JACUZZI_DRAIN_AT_DOOR * jacuzziDrainDoorGain(angle.value),
  );
  const part = a.part();
  part.setAudible(false);
  a.holdWhile(draining, drainGurgle(level), from);
  return {
    ...part,
    setDoorAngle(value: number) {
      angle.value = value;
    },
  };
}
