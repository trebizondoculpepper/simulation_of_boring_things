import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../../components/core/views/pipe-kinds';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  SOURCE_SHAPE,
  SUBSTANCES,
  createExperimentalSink,
  createExperimentalSource,
  transfer,
} from '../../../../game/plant/experimental-source';
import type {
  ExperimentalSink,
  ExperimentalSource,
  Substance,
} from '../../../../game/plant/experimental-source';
import {
  plumbSourceSinkRoom,
  sinkId,
  sourceId,
} from '../../logic/source-sink-plumbing';
import type { SourceSinkPlumbing } from '../../logic/source-sink-plumbing';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Source to sink: each experimental source plumbed to its sink by the plumber, a valve at each end, all closed. Open both and it flows.';

/** Some sources and sinks a little different from the rest: finite, so they visibly run down or fill. */
const QUANTITY: Partial<Record<Substance, number>> = {
  chlorine: 25,
  hypochlorite: 200,
  'heating-oil': 2500,
};
const CAPACITY: Partial<Record<Substance, number>> = {
  'dirty-water': 30,
  hypochlorite: 50,
  'heating-oil': 1200,
};

const SUBSTANCE_LIST = Object.keys(SUBSTANCES) as Substance[];

/** The room's model: its sources and sinks, made afresh each time the room is built. */
let sources = new Map<Substance, ExperimentalSource>();
let sinks = new Map<Substance, ExperimentalSink>();
let plumbing: SourceSinkPlumbing | null = null;

const makeSource = (s: Substance) =>
  createExperimentalSource({
    id: sourceId(s),
    substance: s,
    ...(QUANTITY[s] !== undefined ? { quantity: QUANTITY[s] } : {}),
  });
const makeSink = (s: Substance) =>
  createExperimentalSink({
    id: sinkId(s),
    substance: s,
    ...(CAPACITY[s] !== undefined ? { capacity: CAPACITY[s] } : {}),
  });

/** Its own layout: the sources along the north wall, their sinks facing them on the south. */
export function layoutRoom() {
  plumbing = plumbSourceSinkRoom(SUBSTANCE_LIST);
  return plumbing.layout;
}

/** Make the room's sources and sinks before its exhibits are built. */
export function prepareRoom() {
  sources = new Map(SUBSTANCE_LIST.map((s) => [s, makeSource(s)]));
  sinks = new Map(SUBSTANCE_LIST.map((s) => [s, makeSink(s)]));
}

const size = {
  w: 0.7,
  d: 0.7,
  h: SOURCE_SHAPE.height + 0.1,
  mount: 'floor' as const,
};

const terminalExhibit = (
  title: string,
  reference: string,
  get: () => ExperimentalSource | ExperimentalSink,
): PlantExhibit => ({
  title,
  reference,
  size,
  build(kit): LiveExhibit {
    const view = createExperimentalSourceView(kit, get());
    const object = new Group();
    object.add(view.group);
    return { object, update: () => view.update() };
  },
});

export const EXHIBITS: readonly PlantExhibit[] = [
  ...SUBSTANCE_LIST.map((s) =>
    terminalExhibit(
      `Source: ${SUBSTANCES[s].label.toLowerCase()}`,
      sourceId(s),
      () => sources.get(s)!,
    ),
  ),
  ...SUBSTANCE_LIST.map((s) =>
    terminalExhibit(
      `Sink: ${SUBSTANCES[s].label.toLowerCase()}`,
      sinkId(s),
      () => sinks.get(s)!,
    ),
  ),
];

/**
 * The plumber's work, drawn and working: each line's pipe, in its kind of
 * pipe and its substance's identification colour, and its two fittings,
 * which a click opens or shuts. Each frame, a line whose fittings are both
 * open carries its substance from source to sink.
 */
export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Source-to-sink plumbing';
  const parts = createPartSet();
  const plumbed = plumbing ?? plumbSourceSinkRoom(SUBSTANCE_LIST);
  const open = new Map(
    plumbed.fittings.map((f) => [f.id, f.normally === 'open']),
  );
  for (const line of plumbed.lines) {
    const pipe = createPipe(line.pipe as PipeKindId, line.od, line.points, {
      colour: SUBSTANCES[line.substance].colour,
    });
    pipe.name = `Line: ${line.edge}`;
    object.add(pipe);
  }
  for (const f of plumbed.fittings) {
    const line = plumbed.lines.find((l) => l.edge === f.edge)!;
    const part = parts.add(
      createInlineFitting(
        kit,
        {
          kind: f.kind,
          medium: f.medium,
          operator: 'hand',
          od: line.od,
        },
        {
          open: () => open.get(f.id) ?? false,
          set: (v) => open.set(f.id, v),
        },
      ),
    );
    // Its top toward the room's middle on an upright pipe.
    placeFitting(part.object, f.kind, f.at, f.along, [0, -Math.sign(f.at[2])]);
    part.object.name = f.id;
    object.add(part.object);
  }
  // Which fittings each line has, source end first.
  const lineFittings = new Map(
    plumbed.lines.map((l) => [
      l.substance,
      plumbed.fittings.filter((f) => f.edge === l.edge).map((f) => f.id),
    ]),
  );
  return {
    object,
    parts,
    update(delta) {
      for (const [s, ids] of lineFittings) {
        const source = sources.get(s);
        const sink = sinks.get(s);
        if (!source || !sink) continue;
        transfer(
          source,
          sink,
          ids.every((id) => open.get(id)),
          delta,
        );
      }
    },
  };
}
