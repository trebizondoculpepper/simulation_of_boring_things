import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { beginPart, createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import { createFloorGully } from '../../../components/plant/views/floor-gully';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import { createMultiportFilter } from '../../../components/plant/views/multiport-filter';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import {
  createExperimentalSink,
  createExperimentalSource,
} from '../../../../game/plant/experimental-source';
import { POSITION_LABEL } from '../../../../game/plant/multiport-filter';
import { GULLY, WASTE } from '../../logic/jacuzzi-drain';
import {
  BACKWASH_ITEMS,
  BACKWASH_PIPE,
  BACKWASH_SIZE,
  SUPPLY_VALVE,
  backwashRuns,
  createFilterBackwashModel,
  layoutFilterBackwash,
} from '../../logic/filter-backwash';
import type {
  BackwashItem,
  FilterBackwashModel,
} from '../../logic/filter-backwash';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Backwashing a sand filter: shut the supply, turn the multiport to BACKWASH, open the supply and watch the waste run clear; then RINSE, and back to FILTER.';

let model: FilterBackwashModel | null = null;

export const layoutRoom = () => layoutFilterBackwash();

export function prepareRoom() {
  model = createFilterBackwashModel();
}

const TITLES: Record<BackwashItem, [string, string]> = {
  source: ['Pool water from the pump', 'experimental source, 2 bar'],
  filter: ['Sand filter', 'Lidoluxe 600 mm, multiport valve'],
  sink: ['Return to the pool', 'experimental sink'],
  gully: ['Floor gully', 'backwash to waste'],
};

/** The sink the return fills, for its display. */
const sink = createExperimentalSink({
  id: 'bw.sink',
  substance: 'pool-water',
  maxRate: 100,
});

const build =
  (item: BackwashItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const m = () => model!;
    if (item === 'source') {
      const view = createExperimentalSourceView(
        kit,
        createExperimentalSource({ id: 'bw.source', substance: 'pool-water' }),
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
          gully.setFlow(r.toWaste / 3.6);
          // Brown with the bed's dirt, clearing as it washes out.
          gully.setTint(r.wasteDirt / 400);
        },
      };
    }
    const filter = createMultiportFilter(kit);
    object.add(filter.group);
    const a = beginPart(kit, 'Multiport valve lever');
    filter.lever.traverse((piece) => a.uses.set(piece, () => m().turn()));
    const parts = createPartSet();
    parts.add(a.part());
    // Its local display, on a post beside it.
    const t = tools(kit);
    t.box(
      object,
      t.paint('#9aa0a2', 0.5, 0.4),
      0.05,
      1.3,
      0.05,
      0.45,
      0.65,
      0.25,
    );
    const lcd = createCharacterLcd(kit, {
      columns: 16,
      rows: 2,
      cell: 0.0092,
      backlight: true,
    });
    lcd.group.position.set(0.45, 1.35, 0.28);
    object.add(lcd.group);
    let shown = '';
    return {
      object,
      parts,
      update: (delta) => {
        const r = m().readings();
        filter.show(r.position, r.gaugeBar, delta);
        const lines = [
          `${POSITION_LABEL[r.position].padEnd(8)}${`${r.flow.toFixed(1)}m3/h`.padStart(8)}`,
          r.warning ? 'STOP FLOW FIRST!' : `BED dP ${r.bedBar.toFixed(2)} bar`,
        ];
        const key = lines.join('|');
        if (key !== shown) {
          shown = key;
          lcd.show(lines);
        }
      },
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = BACKWASH_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...BACKWASH_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Filter backwash pipework';
  const parts = createPartSet();
  const m = model ?? createFilterBackwashModel();
  const runs = backwashRuns();
  object.add(
    createPipe('pvc-pressure', BACKWASH_PIPE.od, runs.supply, {
      colour: '#3d7f45',
    }),
  );
  object.add(
    createPipe('pvc-pressure', BACKWASH_PIPE.od, runs.return, {
      colour: '#3d7f45',
    }),
  );
  object.add(createPipe('pvc-drain', WASTE.od, runs.waste));
  const valve = parts.add(
    createInlineFitting(
      kit,
      {
        kind: 'isolating-valve',
        medium: 'water',
        operator: 'hand',
        od: BACKWASH_PIPE.od,
      },
      { open: () => m.isSupplyOpen(), set: (v) => m.setSupply(v) },
    ),
  );
  placeFitting(
    valve.object,
    'isolating-valve',
    SUPPLY_VALVE.at,
    SUPPLY_VALVE.along,
    [0, 1],
  );
  valve.object.name = 'Supply valve';
  object.add(valve.object);
  return {
    object,
    parts,
    update: (delta) => {
      m.step(delta);
      sink.accept((m.readings().toReturn * delta) / 3600, delta);
    },
  };
}
