import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { createFloorGully } from '../../../components/plant/views/floor-gully';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createSandFilter } from '../../../components/plant/views/pumps-plant';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createFilterPanel } from '../../../components/plant/views/filter-panel';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import {
  createExperimentalSink,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import { VALVE_ROLE } from '../../../../game/plant/five-valve-filter';
import type { ValveName } from '../../../../game/plant/five-valve-filter';
import { GULLY } from '../../logic/jacuzzi-drain';
import {
  FIVE_ITEMS,
  FIVE_PIPE,
  FIVE_SIZE,
  MODES,
  OLYMPIC_FILTER,
  VALVES,
  createFiveValveModel,
  fiveValveRuns,
  layoutFiveValve,
} from '../../logic/five-valve-rig';
import type { FiveItem, FiveValveModel } from '../../logic/five-valve-rig';
import type { Vec3 } from '../../../components/core/logic/pipe-route';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'An Olympic-pool sand filter on its five-valve battery, switched by a Penfold panel: SERVICE, BACKWASH, RINSE. A flowmeter on every valve’s branch.';

let model: FiveValveModel | null = null;

export const layoutRoom = () => layoutFiveValve();

export function prepareRoom() {
  model = createFiveValveModel();
}

const TITLES: Record<FiveItem, [string, string]> = {
  source: ['Pool water from the pumps', 'experimental source, 2 bar'],
  filter: [
    'Sand filter: Olympic pool',
    `${OLYMPIC_FILTER.label}, five-valve battery`,
  ],
  sink: ['Return to the pool', 'experimental sink'],
  gully: ['Floor gully', 'backwash and rinse to waste'],
  panel: ['Backwash control panel', 'Penfold: the five valves together'],
};

const sink = createExperimentalSink({
  id: 'fv.sink',
  substance: 'pool-water',
  maxRate: 400,
});
const TAGS: Record<ValveName, string> = {
  v1: 'FT1',
  v2: 'FT2',
  v3: 'FT3',
  v4: 'FT4',
  v5: 'FT5',
};

const build =
  (item: FiveItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const m = () => model!;
    if (item === 'source') {
      const view = createExperimentalSourceView(
        kit,
        createExperimentalSource({
          id: 'fv.source',
          substance: 'pool-water',
          maxRate: 400,
        }),
      );
      object.add(view.group);
      return { object, update: () => view.update() };
    }
    if (item === 'sink') {
      const view = createExperimentalSourceView(kit, sink);
      object.add(view.group);
      return { object, update: () => view.update() };
    }
    if (item === 'gully') {
      const gully = createFloorGully(kit, {
        size: GULLY.size,
        drop: GULLY.airGap,
      });
      object.add(gully.group);
      return {
        object,
        update: () => {
          const r = m().readings();
          gully.setFlow(
            (Math.max(0, r.valve.v4) + Math.max(0, r.valve.v5)) / 3.6,
          );
          gully.setTint(r.wasteDirt / 400);
        },
      };
    }
    if (item === 'panel') {
      const panel = createFilterPanel(kit, {
        mode: () => MODES.indexOf(m().mode()),
        setMode: (i) => m().setMode(MODES[Math.max(0, Math.min(3, i))]),
        start: () => m().start(),
        stop: () => m().stop(),
        readings: () => {
          const r = m().readings();
          return {
            open: VALVES.map((v) => r.opening[v] > 0.98) as [
              boolean,
              boolean,
              boolean,
              boolean,
              boolean,
            ],
            flows: VALVES.map((v) => r.valve[v]) as [
              number,
              number,
              number,
              number,
              number,
            ],
            topBar: r.topBar,
            bottomBar: r.bottomBar,
            bedBar: r.bedBar,
            supplyOn: r.supplyOn,
            moving: r.moving,
            backwashDue: r.backwashDue,
          };
        },
      });
      object.add(panel.group);
      return { object, parts: panel.parts, update: () => panel.update() };
    }
    const filter = createSandFilter(kit, OLYMPIC_FILTER);
    // As in the plant rooms, the vessel stands 0.1 m forward of its origin.
    filter.position.z = 0.1;
    object.add(filter);
    return {
      object,
      update: (delta) => {
        const r = m().readings();
        filter.show({ inlet: r.topBar, outlet: r.bottomBar }, delta);
      },
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = FIVE_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...FIVE_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

/** The face pipework, the five actuated valves, the five flowmeters; each frame the rig steps. */
export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Five-valve battery';
  const parts = createPartSet();
  const m = model ?? createFiveValveModel();
  const { runs, spots } = fiveValveRuns();
  for (const [name, run] of Object.entries(runs))
    object.add(
      name === 'waste'
        ? createPipe('pvc-drain', FIVE_PIPE.od, run)
        : createPipe('pvc-pressure', FIVE_PIPE.od, run, { colour: '#3d7f45' }),
    );
  // Each meter and valve faces +x or +z, its positive way the model's.
  const positive = (v: Vec3): Vec3 =>
    v[0] < -0.5 || v[2] < -0.5 ? [-v[0], -v[1], -v[2]] : v;
  const meters = VALVES.map((v) => {
    const valve = parts.add(
      createInlineFitting(
        kit,
        {
          kind: 'remote-valve',
          medium: 'water',
          operator: 'motor',
          od: FIVE_PIPE.od,
        },
        // Worked by the panel, not by hand.
        { open: () => m.readings().opening[v] > 0.5, set: () => {} },
      ),
    );
    placeFitting(
      valve.object,
      'remote-valve',
      spots[v].valve.at,
      positive(spots[v].valve.along),
      [0, 1],
    );
    valve.object.name = `${v.toUpperCase()} ${VALVE_ROLE[v]}`;
    object.add(valve.object);
    const meter = createMagFlowmeter(kit, { od: FIVE_PIPE.od, tag: TAGS[v] });
    placeFitting(
      meter.group,
      'isolating-valve',
      spots[v].meter.at,
      positive(spots[v].meter.along),
      [0, 1],
    );
    object.add(meter.group);
    return meter;
  });
  return {
    object,
    parts,
    update: (delta) => {
      m.step(delta);
      const r = m.readings();
      meters.forEach((meter, k) =>
        meter.show(r.valve[VALVES[k]], VALVE_ROLE[VALVES[k]]),
      );
      sink.accept((Math.max(0, r.valve.v2) * delta) / 3600, delta);
    },
  };
}
