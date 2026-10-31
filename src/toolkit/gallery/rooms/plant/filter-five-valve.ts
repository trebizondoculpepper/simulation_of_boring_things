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
import { tools } from '../../../components/core/views/fitting-tools';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createSightGlass } from '../../../components/plant/views/sight-glass';
import type { GlassInputs } from '../../../components/plant/logic/sight-glass';

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
        filter.showGlass(r.glass, delta);
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
  // A board of sight glasses, each held in one state, to compare.
  const board = sightGlassBoard(kit);
  board.group.position.set(4.4, 0, -4.1);
  object.add(board.group);
  return {
    object,
    parts,
    update: (delta) => {
      board.update(delta);
      m.step(delta);
      const r = m.readings();
      meters.forEach((meter, k) =>
        meter.show(r.valve[VALVES[k]], VALVE_ROLE[VALVES[k]]),
      );
      sink.accept((Math.max(0, r.valve.v2) * delta) / 3600, delta);
    },
  };
}

/**
 * The states the board shows (the owner, 2026-10-31: clean, half loaded,
 * very dirty, pitted, backwashing, and the rest), the backwash one
 * cycling through a whole backwash.
 */
const BOARD: { label: string; inputs: (t: number) => GlassInputs }[] = [
  {
    label: 'CLEAN',
    inputs: () => ({ mode: 'service', dirt: 0, channelling: 0, murk: 0 }),
  },
  {
    label: 'HALF LOADED',
    inputs: () => ({ mode: 'service', dirt: 1, channelling: 0, murk: 0 }),
  },
  {
    label: 'VERY DIRTY',
    inputs: () => ({ mode: 'service', dirt: 2.4, channelling: 0, murk: 0 }),
  },
  {
    // Fissured past where its condition calls it pitted (0.2).
    label: 'PITTED',
    inputs: () => ({ mode: 'service', dirt: 1.6, channelling: 1, murk: 0 }),
  },
  {
    // 3 s stopped, then a 30 s backwash clearing as it goes, round again.
    label: 'BACKWASH',
    inputs: (t) => {
      const k = t % 33;
      return k < 3
        ? { mode: 'stopped', dirt: 1.5, channelling: 0, murk: 0 }
        : {
            mode: 'backwash',
            dirt: 1.5,
            channelling: 0,
            murk: Math.max(0, 1 - (k - 3) / 25),
          };
    },
  },
  {
    label: 'RINSE',
    // Clear by now: only a backwash clouds the glass (the owner, 2026-10-23).
    inputs: () => ({ mode: 'rinse', dirt: 0, channelling: 0, murk: 0 }),
  },
  {
    // A tenth of its sand washed away by too fierce a backwash.
    label: 'SAND LOST',
    inputs: () => ({
      mode: 'service',
      dirt: 0.3,
      channelling: 0,
      murk: 0,
      sand: 0.88,
    }),
  },
  {
    label: 'DRAINED DOWN',
    inputs: () => ({
      mode: 'stopped',
      dirt: 0.6,
      channelling: 0,
      murk: 0,
      water: 0.2,
    }),
  },
];

function sightGlassBoard(kit: PanelKit) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Sight glass states';
  t.box(group, t.paint('#9aa0a2', 0.5, 0.4), 0.05, 2.05, 0.05, -0.9, 1.025, 0);
  t.box(group, t.paint('#9aa0a2', 0.5, 0.4), 0.05, 2.05, 0.05, 0.9, 1.025, 0);
  t.box(group, t.paint('#e8e8e2', 0.7), 2.0, 1.05, 0.03, 0, 1.47, 0);
  const title = createMicroLabel(kit, 'SIGHT GLASS: WHAT YOU SEE', {
    height: 0.035,
    ink: '#1d2326',
    maxWidth: 1.6,
  });
  title.position.set(0, 1.93, 0.02);
  group.add(title);
  const glasses = BOARD.map((b, k) => {
    // Two rows of four.
    const x = -0.6 + (k % 4) * 0.4;
    const y = k < 4 ? 1.66 : 1.18;
    const g = createSightGlass(kit, { radius: 0.15, seed: 11 + k });
    g.group.position.set(x, y, 0.02);
    group.add(g.group);
    const label = createMicroLabel(kit, b.label, {
      height: 0.025,
      ink: '#1d2326',
      maxWidth: 0.34,
    });
    label.position.set(x, y - 0.19, 0.02);
    group.add(label);
    return g;
  });
  let time = 0;
  return {
    group,
    update(dt: number) {
      time += dt;
      glasses.forEach((g, k) => g.update(BOARD[k].inputs(time), dt));
    },
  };
}
