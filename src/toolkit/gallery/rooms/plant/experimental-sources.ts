import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import {
  createPartSet,
  pushButton,
} from '../../../components/core/parts/parts';
import {
  SOURCE_SHAPE,
  createExperimentalSourceView,
} from '../../../components/plant/views/experimental-source';
import {
  SUBSTANCES,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import type { ExperimentalSourceSpec } from '../../../../game/plant/experimental-source';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Experimental sources: placeholders for any substance, with typed outputs and a readout of what is left';

/** The sources shown: some endless, some that run down when drawn from. */
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
    const source = createExperimentalSource(spec);
    const view = createExperimentalSourceView(kit, source);
    const object = new Group();
    object.add(view.group);
    const parts = createPartSet();
    // A finite source can be drawn from here, a tenth of its start at a press.
    if (!source.endless) {
      const draw = parts.add(
        pushButton(kit, {
          colour: 'black',
          legend: 'DRAW',
          name: `Draw from ${spec.id}`,
          action: () => source.draw(source.spec.quantity / 10),
        }),
      );
      draw.object.position.set(
        0.18,
        SOURCE_SHAPE.height * 0.4,
        SOURCE_SHAPE.radius + 0.02,
      );
      object.add(draw.object);
    }
    return {
      object,
      parts,
      update: (delta) => {
        parts.update(delta);
        view.update();
      },
    };
  },
}));
