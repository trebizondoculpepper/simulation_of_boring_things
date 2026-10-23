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
import { createEndSuctionPump } from '../../../components/plant/views/pumps-plant';
import {
  createPowerCabinet,
  createPumpLocalPanel,
} from '../../../components/plant/views/power-conversion';
import type { CabinetRole } from '../../../components/plant/views/power-conversion';
import {
  RIG_ITEMS,
  RIG_PIPES,
  RIG_SIZE,
  createBatteryPumpModel,
  plumbBatteryPumpRig,
} from '../../logic/battery-pump-rig';
import type {
  BatteryPumpModel,
  BatteryPumpRig,
  RigItem,
} from '../../logic/battery-pump-rig';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Battery-backed pump: a 450 V supply through a rectifier, battery and inverter to a pump. Isolate the supply and the battery runs the pump until flat.';

let rig: BatteryPumpRig | null = null;
let model: BatteryPumpModel | null = null;

/** Its own layout: the supply and the UPS's cabinets along the north wall, the pump and its water in the room. */
export function layoutRoom() {
  rig = plumbBatteryPumpRig();
  return rig.layout;
}

/** Make the rig's model before its exhibits are built. */
export function prepareRoom() {
  rig ??= plumbBatteryPumpRig();
  model = createBatteryPumpModel(rig);
}

const TITLES: Record<RigItem, [string, string]> = {
  supply: ['Supply: 450 V, endless', 'experimental source'],
  rectifier: ['Rectifier', 'AC to DC'],
  battery: ['Battery', '4.32 kWh'],
  inverter: ['Inverter', 'DC to AC'],
  pump: ['Pump set', 'Grundflow end-suction, 30 kW, about 300 m³/h'],
  'water-source': ['Water: endless source', 'experimental source'],
  'water-sink': ['Water: endless sink', 'experimental sink'],
};

const build =
  (item: RigItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    const m = () => model!;
    if (item === 'supply' || item === 'water-source' || item === 'water-sink') {
      const view = createExperimentalSourceView(
        kit,
        item === 'supply'
          ? m().supply
          : item === 'water-source'
            ? m().water
            : m().sink,
      );
      object.add(view.group);
      return { object, update: () => view.update() };
    }
    if (item === 'pump') {
      const pump = createEndSuctionPump(kit);
      object.add(pump);
      const panel = createPumpLocalPanel(kit);
      panel.group.position.set(-0.3, 0, 0.6);
      object.add(panel.group);
      return {
        object,
        update: (delta) => {
          const r = m().readings();
          panel.update(r.pumpRunning, r.flow);
          // Its suction and discharge gauges, live.
          pump.gauges.suction.set(r.suctionBar);
          pump.gauges.discharge.set(r.dischargeBar);
          pump.gauges.suction.update(delta);
          pump.gauges.discharge.update(delta);
        },
      };
    }
    const cabinet = createPowerCabinet(kit, item as CabinetRole);
    object.add(cabinet.group);
    return { object, update: () => cabinet.update(m().readings()) };
  };

export const EXHIBITS: readonly PlantExhibit[] = RIG_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...RIG_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

/**
 * The plumber's work, drawn and working: the conduit and pipe, and each
 * fitting, which a click works (the isolators switch, the valves open and
 * shut; the non-return valve has nothing to work). Each frame steps the rig.
 */
export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Battery-backed pump rig';
  const parts = createPartSet();
  const plumbed = rig ?? plumbBatteryPumpRig();
  const working = model ?? createBatteryPumpModel(plumbed);
  for (const line of plumbed.lines) {
    const pipe = RIG_PIPES[line.medium];
    const run = createPipe(pipe.kind as PipeKindId, pipe.od, line.points, {
      colour: pipe.colour,
    });
    run.name = `Line: ${line.id}`;
    object.add(run);
  }
  for (const f of plumbed.fittings) {
    const line = plumbed.lines.find((l) => l.id === f.edge)!;
    const part = parts.add(
      createInlineFitting(
        kit,
        {
          kind: f.kind,
          medium: f.medium,
          operator: f.kind === 'non-return-valve' ? 'self' : 'hand',
          od: RIG_PIPES[line.medium].od,
          // About 59 A from the 450 V supply, 46 A to the pump: 63 A units.
          rating: '3P  63A',
        },
        f.kind === 'non-return-valve'
          ? undefined
          : {
              open: () => working.isOpen(f.id),
              set: (v) => working.setOpen(f.id, v),
            },
      ),
    );
    placeFitting(part.object, f.kind, f.at, f.along, [0, 1]);
    part.object.name = f.id;
    object.add(part.object);
  }
  return { object, parts, update: (delta) => working.step(delta) };
}
