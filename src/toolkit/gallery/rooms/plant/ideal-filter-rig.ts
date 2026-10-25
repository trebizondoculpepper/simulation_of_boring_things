import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import { createSandFilter } from '../../../components/plant/views/pumps-plant';
import { plantTools } from '../../../components/plant/views/plant-tools';
import {
  filterSizing,
  idealGlass,
  newFilterRig,
  rigFlows,
  stepFilterRig,
} from '../../../../game/plant/ideal-filter';
import type { FilterRig, RigFlows } from '../../../../game/plant/ideal-filter';
import {
  IDEAL_FILTER_PANEL,
  actOnRig,
  idealFilterPanelState,
  panelAction,
} from '../../logic/ideal-filter-panel';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The ideal filter on trial: the one sand filter model every filter in the plant will use, sized by its diameter alone, plumbed to an ideal clean source and an ideal dirty one, a clean outlet and a waste sink, through seven servo valves worked from its panel. Load it with dirt, watch it fissure, backwash it, rinse it, clean it; its sight glass shows its bed.';
export const FINISH = { wall: '#cbd3d0', floor: '#929a97' };

/**
 * Dev40, the ideal filter rig (the owner, 2026-10-25): the ideal filter
 * (`src/game/plant/ideal-filter.ts`), a real sand filter's body in blue and
 * white, its nozzles, gauges and sight glass, run by the model alone (no
 * world); its sources and sinks as ideal vessels, each saying what passes
 * it; its panel (`ideal-filter-panel.ts`) working every valve. The rig is
 * fresh each time the room is built; TIME ×600 runs its days in minutes.
 */

/** The filter: Ø1.2 m, as the lounge's. */
const SPEC = { diameter: 1.2 };
let rig: FilterRig = newFilterRig(SPEC);
let speed = 1;
let flows: RigFlows = rigFlows(rig);
export function prepareRoom() {
  rig = newFilterRig(SPEC);
  speed = 1;
  flows = rigFlows(rig);
}
// For trying it from the console: `idealFilter.rig`, `idealFilter.press('process/backwash')`.
if (typeof window !== 'undefined')
  (window as unknown as { idealFilter?: unknown }).idealFilter = {
    get rig() {
      return rig;
    },
    get flows() {
      return flows;
    },
    press,
  };

function press(button: string) {
  const a = panelAction(button);
  if (!a) return;
  if ('speed' in a) speed = a.speed;
  else rig = actOnRig(rig, a);
  flows = rigFlows(rig);
}

/** The rig's one clock: stepped by the panel, at its speed, in steps short enough for its servos. */
function stepRig(delta: number) {
  let left = delta * speed;
  while (left > 0) {
    const dt = Math.min(left, speed > 1 ? 5 : 1);
    rig = stepFilterRig(rig, dt);
    left -= dt;
  }
  flows = rigFlows(rig);
}

/** An ideal vessel: a painted drum and a post with its name and a two-line display. */
function idealVessel(
  kit: PanelKit,
  title: string,
  colour: string,
  lines: () => string[],
): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = title;
  t.cyl(object, t.paint(colour, 0.45), 0.4, 1.2, 0, 0.6, 0, 'y', 32);
  t.cyl(object, t.paint('#e8ecee', 0.4), 0.41, 0.06, 0, 1.2, 0, 'y', 32);
  const steel = t.paint('#55616a', 0.5);
  t.box(object, steel, 0.06, 1.1, 0.06, 0.62, 0.55, 0);
  t.box(object, t.paint('#31383b', 0.55), 0.5, 0.22, 0.04, 0.62, 1.2, 0.04);
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.01,
    backlight: true,
  });
  lcd.group.position.set(0.62, 1.2, 0.062);
  object.add(lcd.group);
  const name = createMicroLabel(kit, title, {
    height: 0.022,
    maxWidth: 0.48,
    ink: '#f2f2ea',
    plate: '#25343a',
  });
  name.position.set(0.62, 1.35, 0.062);
  object.add(name);
  let shown = '';
  return {
    object,
    update() {
      const l = lines();
      const key = l.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show(l);
    },
  };
}

const m3h = (q: number) => `${Math.abs(q).toFixed(1).padStart(5)} m3/h`;
const gm3 = (c: number) => `${c.toFixed(1).padStart(6)} g/m3`;

export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Ideal filter',
    reference: `The one sand filter model, here Ø${SPEC.diameter} m (${filterSizing(SPEC).area.toFixed(2)} m² of bed, ${filterSizing(SPEC).designFlow.toFixed(0)} m³/h design): a real filter's body, nozzles, gauges and sight glass, in blue and white`,
    size: { w: 2.0, d: 2.0, h: 2.6, mount: 'floor' },
    build(kit): LiveExhibit {
      const filter = createSandFilter(kit, {
        dia: SPEC.diameter,
        shell: 1.5,
        dn: 100,
        label: 'IDEAL FILTER',
        livery: 'certikind',
        bedDepth: filterSizing(SPEC).bedDepth,
      });
      return {
        object: filter,
        update(delta) {
          filter.show({ inlet: flows.topBar, outlet: flows.bottomBar }, delta);
          filter.showGlass(idealGlass(rig, flows), delta);
        },
      };
    },
  },
  {
    title: 'Ideal filter rig panel',
    reference:
      'The rig as a Penfold mimic, 2.4 × 1.4 m: every pipe chasing its flow, every servo valve worked and lit, the processes, the dirty source’s dirt, the rig’s time, and every flow and dirt read',
    size: { w: 2.5, d: 0.08, h: 1.5, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const board = createMimicBoard(kit, IDEAL_FILTER_PANEL, {
        maker: 'penfold',
        press,
      });
      return {
        object: board.group,
        parts: board.parts,
        update(delta) {
          // The rig's one clock.
          stepRig(delta);
          board.parts.update(delta);
          board.show(idealFilterPanelState(rig, speed));
        },
      };
    },
  },
  {
    title: 'Ideal clean source',
    reference: 'Clean water at a fixed 12 m head, as much as is drawn',
    size: { w: 1.3, d: 1.0, h: 1.5, mount: 'floor' },
    build: (kit) =>
      idealVessel(kit, 'IDEAL CLEAN SOURCE', '#2b7fc4', () => [
        `OUT ${m3h(flows.valve.clean)}`,
        `DIRT ${gm3(0)}`,
      ]),
  },
  {
    title: 'Ideal dirty source',
    reference: 'Water carrying the dirt set on the panel, at a fixed 12 m head',
    size: { w: 1.3, d: 1.0, h: 1.5, mount: 'floor' },
    build: (kit) =>
      idealVessel(kit, 'IDEAL DIRTY SOURCE', '#7a5a2a', () => [
        `OUT ${m3h(flows.valve.dirty)}`,
        `DIRT ${gm3(rig.dirtySource)}`,
      ]),
  },
  {
    title: 'Ideal clean outlet',
    reference: 'Takes the filtered water, against a fixed 2 m head',
    size: { w: 1.3, d: 1.0, h: 1.5, mount: 'floor' },
    build: (kit) =>
      idealVessel(kit, 'IDEAL CLEAN OUTLET', '#9fd0ea', () => [
        `IN  ${m3h(flows.toOutlet)}`,
        `DIRT ${gm3(flows.outletDirt)}`,
      ]),
  },
  {
    title: 'Ideal waste sink',
    reference: 'Takes backwash and rinse water, at no head',
    size: { w: 1.3, d: 1.0, h: 1.5, mount: 'floor' },
    build: (kit) =>
      idealVessel(kit, 'IDEAL WASTE SINK', '#5b4630', () => [
        `IN  ${m3h(flows.toWaste)}`,
        `DIRT ${gm3(flows.wasteDirt)}`,
      ]),
  },
];
