import { Group } from 'three';
import { signal } from '@preact/signals-core';
import { drainGurgle } from '../../../components/plant/audio/drain';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { beginPart, createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import { createIbc } from '../../../components/plant/views/chemicals-storage';
import { createFloorGully } from '../../../components/plant/views/floor-gully';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import {
  DRAIN_ITEMS,
  DRAIN_SIZE,
  GULLY,
  PLINTH,
  WASTE,
  createJacuzziDrainModel,
  drainRun,
  layoutJacuzziDrain,
} from '../../logic/jacuzzi-drain';
import type { DrainItem, JacuzziDrainModel } from '../../logic/jacuzzi-drain';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Draining a jacuzzi: a 1000 L tank of water on a plinth, piped to a floor gully. Open its outlet valve and it empties by gravity.';

let model: JacuzziDrainModel | null = null;

/** Its own layout: the tank on its plinth, the gully across the floor from it. */
export const layoutRoom = () => layoutJacuzziDrain();

/** Fill the tank afresh each time the room is built. */
export function prepareRoom() {
  model = createJacuzziDrainModel();
}

const TITLES: Record<DrainItem, [string, string]> = {
  tank: [
    'Spa water: 1000 L IBC',
    'on a 300 mm plinth; its outlet valve drains it',
  ],
  gully: ['Floor gully', 'Certikind 300 mm, stainless'],
};

const build =
  (item: DrainItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const m = () => model!;
    if (item === 'gully') {
      const gully = createFloorGully(kit, {
        size: GULLY.size,
        drop: GULLY.airGap,
      });
      object.add(gully.group);
      const flowing = signal(false);
      const sound = beginPart(kit, 'Drain demonstration gully');
      object.add(sound.object);
      sound.holdWhile(flowing, drainGurgle(), gully.group);
      const parts = createPartSet();
      parts.add(sound.part());
      return {
        object,
        parts,
        update: () => {
          const flow = m().readings().flow;
          gully.setFlow(flow);
          flowing.value = flow > 0.01;
        },
      };
    }
    const t = tools(kit);
    // The plinth, concrete.
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
    ibc.setLevel(1);
    // Its outlet valve, worked by a click on its lever.
    const a = beginPart(kit, 'Tank outlet valve');
    const toggle = () => m().setOpen(!m().isOpen());
    ibc.lever.traverse((piece) => a.uses.set(piece, toggle));
    const parts = createPartSet();
    parts.add(a.part());
    // A level display on the plinth: what is in the tank, and what is running out.
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
        ibc.setOpen(m().isOpen());
        const lines = [
          `CONTENTS${`${r.litres.toFixed(0)} L`.padStart(8)}`,
          `FLOW${`${r.flow.toFixed(2)} l/s`.padStart(12)}`,
        ];
        const key = lines.join('|');
        if (key !== shown) {
          shown = key;
          lcd.show(lines);
        }
      },
    };
  };

export const EXHIBITS: readonly PlantExhibit[] = DRAIN_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...DRAIN_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

/** The drain run, and each frame the tank draining through it. */
export function buildRoomServices(): LiveExhibit {
  const object = new Group();
  object.name = 'Spa drain';
  const run = createPipe('pvc-drain', WASTE.od, drainRun());
  run.name = 'Waste pipe to gully';
  object.add(run);
  return { object, update: (delta) => model?.step(delta) };
}
