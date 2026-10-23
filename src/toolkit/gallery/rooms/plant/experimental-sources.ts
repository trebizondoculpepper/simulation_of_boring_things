import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import type { ExperimentalSourceSpec } from '../../../../game/plant/experimental-source';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Experimental sources: placeholders for any substance, with typed outputs and a readout of what is left';

/** The sources shown: some endless, some finite. */
const SOURCES: ExperimentalSourceSpec[] = [
  { id: 'exp.chlorine', substance: 'chlorine', outputs: 1, quantity: 25 },
  {
    id: 'exp.hypochlorite',
    substance: 'hypochlorite',
    outputs: 2,
    quantity: 200,
  },
  { id: 'exp.ozone', substance: 'ozone', outputs: 1 },
  { id: 'exp.poolWater', substance: 'pool-water', outputs: 2 },
  { id: 'exp.power', substance: 'power-400v', outputs: 3 },
];

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
