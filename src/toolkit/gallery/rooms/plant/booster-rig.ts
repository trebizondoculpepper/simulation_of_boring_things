import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import {
  PIPE_KINDS,
  createPipe,
} from '../../../components/core/views/pipe-kinds';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  SOURCE_SHAPE,
  createExperimentalSink,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import { createBoosterSet } from '../../../components/plant/views/booster-set';
import { BOOSTER } from '../../../components/plant/logic/booster-set';
import {
  actOnChangeover,
  changeoverFlow,
  newBoosterChangeover,
  stepChangeover,
} from '../../../components/plant/logic/booster-changeover';
import type { BoosterChangeover } from '../../../components/plant/logic/booster-changeover';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The make-up booster set, modelled: an ideal clean water source into its suction, its discharge into an ideal sink. Choose its duty pump with DUTY 1 or DUTY 2: the running pump coasts down, its valves drive shut, the other pump’s open and it runs up, so only the pump running ever has its valves open and nothing can run back through the standby. RUN and STOP start and stop the duty pump. BOOST runs the standby beside it, for about 1.7 times the flow (two in parallel share one pressure), both working harder.';

/**
 * Dev42, the booster set's rig (the owner, 2026-10-26): the Grundflow
 * set the wet hall uses, its duty changeover modelled
 * (`booster-changeover.ts`), between the standard ideal clean water source
 * and sink, each showing what it has given or taken. Fresh each time it is built.
 */

let set: BoosterChangeover = newBoosterChangeover();
export function prepareRoom() {
  set = newBoosterChangeover();
}
// For trying it from the console: `boosterRig.act({ act: 'duty', pump: 1 })`.
if (typeof window !== 'undefined')
  (window as unknown as { boosterRig?: unknown }).boosterRig = {
    get state() {
      return set;
    },
    act: (a: Parameters<typeof actOnChangeover>[1]) =>
      (set = actOnChangeover(set, a)),
  };

function rig(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Booster set rig';
  const B = BOOSTER;
  const booster = createBoosterSet(kit, {
    read: () => {
      const flow = changeoverFlow(set);
      return {
        powered: true,
        tripped: false,
        running: flow > 0,
        flow,
        breakTank: 1,
      };
    },
    reset: () => {},
    // Its suction fed by the ideal source alone (the owner, 2026-10-26):
    // its supply pressure, less what its resistance takes at the flow.
    suction: () =>
      Math.max(
        0,
        source.flow.potential - source.flow.resistance * changeoverFlow(set),
      ),
    changeover: {
      state: () => set,
      act: (a) => (set = actOnChangeover(set, a)),
    },
  });
  object.add(booster.object);
  // The standard ideal source and sink (`experimental-source.ts`), each
  // drawn the one way: mains water, endless, piped from the stud on its
  // top down to the set's manifolds.
  // Rated for the set, boosting (the owner, 2026-10-26): a 5 m³/h
  // source would starve it; at 20 m³/h its 3 bar falls to about 2.5 with
  // one pump drawing and 2.2 with both.
  const source = createExperimentalSource({
    id: 'booster.source',
    substance: 'mains-water',
    maxRate: 20,
  });
  const sink = createExperimentalSink({
    id: 'booster.sink',
    substance: 'mains-water',
  });
  const y = B.manifoldY;
  const over = 1.45;
  const westX = -B.w / 2 - 0.9;
  const eastX = B.w / 2 + 0.9;
  const top = SOURCE_SHAPE.height + SOURCE_SHAPE.stud;
  const bend = ((PIPE_KINDS.stainless.bend ?? 1.5) * 0.089) / 0.076;
  // The set's delivery flowmeter, in the discharge's run overhead.
  const meterX = (B.w / 2 + 0.3 + eastX) / 2;
  const meter = createMagFlowmeter(kit, { od: 0.076, tag: 'FT-1' });
  meter.group.position.set(meterX, over, B.dischargeZ);
  object.add(meter.group);
  const views = (
    [
      [source, westX, B.suctionZ],
      [sink, eastX, B.dischargeZ],
    ] as const
  ).map(([terminal, x, z]) => {
    const view = createExperimentalSourceView(kit, terminal);
    view.group.position.set(x, 0, z);
    object.add(view.group);
    return view;
  });
  object.add(
    createPipe('stainless', 0.089, [
      [westX, top, B.suctionZ],
      [westX, over, B.suctionZ],
      [-B.w / 2 - 0.3, over, B.suctionZ],
      [-B.w / 2 - 0.3, y, B.suctionZ],
      [-B.w / 2, y, B.suctionZ],
    ]),
    // Its bends as round as the suction's (the owner, 2026-10-26): the
    // same radius on the smaller pipe. A flowmeter in its level run
    // overhead (the owner, 2026-10-26), the pipe either side of it.
    createPipe(
      'stainless',
      0.076,
      [
        [B.w / 2, y, B.dischargeZ],
        [B.w / 2 + 0.3, y, B.dischargeZ],
        [B.w / 2 + 0.3, over, B.dischargeZ],
        [meterX - 0.15, over, B.dischargeZ],
      ],
      { bend },
    ),
    createPipe(
      'stainless',
      0.076,
      [
        [meterX + 0.15, over, B.dischargeZ],
        [eastX, over, B.dischargeZ],
        [eastX, top, B.dischargeZ],
      ],
      { bend },
    ),
  );
  return {
    object,
    parts: booster.parts,
    update(delta) {
      set = stepChangeover(set, delta);
      // What the set delivers, drawn from the source into the sink.
      sink.accept(
        source.draw((changeoverFlow(set) * delta) / 3600, delta),
        delta,
      );
      booster.update?.(delta);
      meter.show(changeoverFlow(set), 'DELIVERY');
      for (const v of views) v.update();
    },
    dispose() {
      booster.dispose?.();
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Make-up booster set: duty changeover',
    reference:
      'Grundflow twin-pump set, each pump’s suction and discharge valves motorised, between an ideal clean water source and an ideal sink',
    size: { w: BOOSTER.w + 2.6, d: 1.4, h: 1.6, mount: 'floor' as const },
    build: rig,
  },
];
