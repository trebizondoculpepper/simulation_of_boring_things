import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import type {
  ExperimentalSourceSpec,
  Substance,
} from '../../../../game/plant/experimental-source';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Experimental sources: placeholders for any substance, with typed outputs and a readout of what is left';

/**
 * The sources shown: one of every substance, some finite, some endless,
 * with one to three outputs.
 */
const SHOWN: Partial<
  Record<Substance, Omit<ExperimentalSourceSpec, 'id' | 'substance'>>
> = {
  chlorine: { quantity: 25 },
  hypochlorite: { outputs: 2, quantity: 200 },
  'pool-water': { outputs: 2 },
  'dirty-water': { quantity: 12 },
  'heating-oil': { quantity: 2500 },
  'power-400v': { outputs: 3 },
  'power-230v': { outputs: 2 },
};
const SOURCES: ExperimentalSourceSpec[] = (
  Object.keys(SUBSTANCES) as Substance[]
).map((substance) => ({
  id: `exp.${substance}`,
  substance,
  outputs: 1,
  ...SHOWN[substance],
}));

export const EXHIBITS: readonly PlantExhibit[] = SOURCES.map((spec) => ({
  title: `Experimental source: ${SUBSTANCES[spec.substance].label.toLowerCase()}`,
  reference: `${spec.id} · ${spec.outputs} output${spec.outputs === 1 ? '' : 's'} · ${spec.quantity === undefined ? 'endless' : `${spec.quantity} ${SUBSTANCES[spec.substance].unit}`}`,
  size: {
    w: 0.7,
    d: 0.7,
    h: SOURCE_SHAPE.height + 0.1,
    mount: 'floor' as const,
  },
  build(kit): LiveExhibit {
    // No switch: a valve downstream starts and stops its supply.
    const source = createExperimentalSource(spec);
    const view = createExperimentalSourceView(kit, source);
    const object = new Group();
    object.add(view.group);
    return { object, update: () => view.update() };
  },
}));
