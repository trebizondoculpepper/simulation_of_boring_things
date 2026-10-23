import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { beginPart, createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import { createIbc } from '../../../components/plant/views/chemicals-storage';
import { createFloorGully } from '../../../components/plant/views/floor-gully';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import { createExperimentalSource } from '../../../../game/plant/experimental-source';
import { GULLY, PLINTH, WASTE } from '../../logic/jacuzzi-drain';
import {
  FILL_ITEMS,
  FILL_PIPE,
  FILL_SIZE,
  createTankFillDrainModel,
  fillDrainRuns,
  layoutTankFillDrain,
  teeAt,
  valveSpots,
} from '../../logic/tank-fill-drain';
import type { FillItem, TankFillDrainModel } from '../../logic/tank-fill-drain';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Filling and draining a tank through its one port: open the fill valve to fill it from the mains, the drain valve to empty it to the gully.';

let model: TankFillDrainModel | null = null;

export const layoutRoom = () => layoutTankFillDrain();

export function prepareRoom() {
  model = createTankFillDrainModel();
}

const TITLES: Record<FillItem, [string, string]> = {
  tank: ['Water tank: 1000 L IBC', 'one port: in or out by the valves'],
  gully: ['Floor gully', 'Certikind 300 mm, stainless'],
  mains: ['Mains water: 3 bar', 'experimental source, up to 10 m³/h'],
};

const build =
  (item: FillItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const m = () => model!;
    if (item === 'mains') {
      const view = createExperimentalSourceView(
        kit,
        createExperimentalSource({
          id: 'fill.mains',
          substance: 'mains-water',
          maxRate: 10,
        }),
      );
      object.add(view.group);
      return { object, update: () => view.update() };
    }
    if (item === 'gully') {
      const gully = createFloorGully(kit, {
        size: GULLY.size,
        drop: GULLY.airGap,
      });
      object.add(gully.group);
      return { object, update: () => gully.setFlow(m().readings().toDrain) };
    }
    const t = tools(kit);
    t.box(
      object,
      t.paint('#b9b6ad', 0.85),
      PLINTH.w,
      PLINTH.h,
      PLINTH.d,
      0,
      PLINTH.h / 2,
      0,
    );
    const ibc = createIbc(kit, { liquid: '#9fc6dc', handle: '#2f6fb3' });
    ibc.group.position.y = PLINTH.h;
    object.add(ibc.group);
    // Its own outlet valve, the tank's leg of the tee, worked by its lever.
    const a = beginPart(kit, 'Tank outlet valve');
    ibc.lever.traverse((piece) =>
      a.uses.set(piece, () => m().setOpen('tank', !m().isOpen('tank'))),
    );
    const parts = createPartSet();
    parts.add(a.part());
    const lcd = createCharacterLcd(kit, {
      columns: 16,
      rows: 2,
      cell: 0.0092,
      backlight: true,
    });
    lcd.group.position.set(0, PLINTH.h / 2, PLINTH.d / 2 + 0.002);
    object.add(lcd.group);
    let shown = '';
    return {
      object,
      parts,
      update: () => {
        const r = m().readings();
        ibc.setLevel(r.level);
        ibc.setOpen(m().isOpen('tank'));
        const flow =
          Math.abs(r.port) < 0.005
            ? 'STILL'
            : `${r.port > 0 ? 'IN ' : 'OUT'} ${Math.abs(r.port).toFixed(2)} l/s`;
        const lines = [
          `CONTENTS${`${r.litres.toFixed(0)} L`.padStart(8)}`,
          r.spilling ? 'OVERFLOWING!' : `PORT${flow.padStart(12)}`,
        ];
        const key = lines.join('|');
        if (key !== shown) {
          shown = key;
          lcd.show(lines);
        }
      },
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = FILL_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...FILL_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

/** The three legs, the tee, the fill and drain valves; and each frame, the tank on its tee. */
export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Tank fill and drain';
  const parts = createPartSet();
  const m = model ?? createTankFillDrainModel();
  const runs = fillDrainRuns();
  object.add(
    createPipe('pvc-pressure', WASTE.od, runs.tank, { colour: '#3d7f45' }),
  );
  object.add(
    createPipe('pvc-pressure', FILL_PIPE.od, runs.fill, { colour: '#3d7f45' }),
  );
  object.add(createPipe('pvc-drain', WASTE.od, runs.drain));
  // The tee's body.
  const t = tools(kit);
  const [x, y, z] = teeAt();
  t.box(object, t.paint('#2f6a37', 0.5), 0.09, 0.09, 0.07, x, y, z);
  const spots = valveSpots();
  for (const leg of ['fill', 'drain'] as const) {
    const part = parts.add(
      createInlineFitting(
        kit,
        {
          kind: 'isolating-valve',
          medium: 'water',
          operator: 'hand',
          od: leg === 'fill' ? FILL_PIPE.od : WASTE.od,
        },
        { open: () => m.isOpen(leg), set: (v) => m.setOpen(leg, v) },
      ),
    );
    placeFitting(
      part.object,
      'isolating-valve',
      spots[leg].at,
      spots[leg].along,
      [0, 1],
    );
    part.object.name = `${leg} valve`;
    object.add(part.object);
  }
  return { object, parts, update: (delta) => m.step(delta) };
}
