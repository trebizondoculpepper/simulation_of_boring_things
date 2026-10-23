import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  createExperimentalSink,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import type {
  ExperimentalSinkSpec,
  ExperimentalSourceSpec,
  ExperimentalTerminal,
  Substance,
} from '../../../../game/plant/experimental-source';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Experimental sources and sinks: placeholders for any substance, typed, with a readout of what is left or what room remains';

/** Some sources and sinks a little different from the rest: finite, or with more ports. */
const SOURCE_SHOWN: Partial<
  Record<Substance, Omit<ExperimentalSourceSpec, 'id' | 'substance'>>
> = {
  chlorine: { quantity: 25 },
  hypochlorite: { outputs: 2, quantity: 200 },
  'pool-water': { outputs: 2 },
  'heating-oil': { quantity: 2500 },
  'power-400v': { outputs: 3 },
  'power-230v': { outputs: 2 },
};
const SINK_SHOWN: Partial<
  Record<Substance, Omit<ExperimentalSinkSpec, 'id' | 'substance'>>
> = {
  'dirty-water': { inputs: 2, capacity: 30 },
  hypochlorite: { capacity: 50 },
  'heating-oil': { capacity: 1200 },
};

const SUBSTANCE_LIST = Object.keys(SUBSTANCES) as Substance[];

const exhibit = (
  title: string,
  reference: string,
  make: () => ExperimentalTerminal,
): PlantExhibit => ({
  title,
  reference,
  size: {
    w: 0.7,
    d: 0.7,
    h: SOURCE_SHAPE.height + 0.1,
    mount: 'floor' as const,
  },
  build(kit): LiveExhibit {
    // No switch: a valve starts and stops what flows.
    const terminal = make();
    const view = createExperimentalSourceView(kit, terminal);
    const object = new Group();
    object.add(view.group);
    return { object, update: () => view.update() };
  },
});

const describe = (t: ExperimentalTerminal, ports: string, amount: string) => {
  const { unit } = SUBSTANCES[t.spec.substance];
  return `${t.spec.id} · ${ports} · ${amount} · up to ${t.flow.maxRate} ${unit}/h at ${t.flow.potential} ${t.flow.potentialUnit}`;
};

export const EXHIBITS: readonly PlantExhibit[] = [
  ...SUBSTANCE_LIST.map((substance) => {
    const spec = {
      id: `exp.${substance}`,
      substance,
      ...SOURCE_SHOWN[substance],
    };
    const s = createExperimentalSource(spec);
    const n = s.spec.outputs;
    return exhibit(
      `Experimental source: ${SUBSTANCES[substance].label.toLowerCase()}`,
      describe(
        s,
        `${n} output${n === 1 ? '' : 's'}`,
        s.endless
          ? 'endless'
          : `${s.spec.quantity} ${SUBSTANCES[substance].unit}`,
      ),
      () => createExperimentalSource(spec),
    );
  }),
  ...SUBSTANCE_LIST.map((substance) => {
    const spec = {
      id: `sink.${substance}`,
      substance,
      ...SINK_SHOWN[substance],
    };
    const s = createExperimentalSink(spec);
    const n = s.spec.inputs;
    return exhibit(
      `Experimental sink: ${SUBSTANCES[substance].label.toLowerCase()}`,
      describe(
        s,
        `${n} input${n === 1 ? '' : 's'}`,
        s.endless
          ? 'no limit'
          : `holds ${s.spec.capacity} ${SUBSTANCES[substance].unit}`,
      ),
      () => createExperimentalSink(spec),
    );
  }),
];
