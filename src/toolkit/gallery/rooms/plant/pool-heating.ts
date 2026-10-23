import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createPartSet } from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { tools } from '../../../components/core/views/fitting-tools';
import {
  createCondensingBoiler,
  createTwinHeadPump,
} from '../../../components/plant/views/boiler-plant';
import { createBoilerPanel } from '../../../components/plant/views/boiler-controls';
import { setBoilerSetpoint } from '../../../components/plant/logic/boiler-house';
import { createShellTubeExchanger } from '../../../components/plant/views/shell-tube-exchanger';
import {
  ON_PLINTH,
  SHELL_TUBE,
} from '../../../components/plant/logic/shell-tube-exchanger';
import { createExperimentalSourceView } from '../../../components/plant/views/experimental-source';
import {
  createInlineFitting,
  placeFitting,
} from '../../../components/plant/views/inline-fittings';
import { createDigitalThermometer } from '../../../components/plant/views/digital-thermometer';
import { createMagFlowmeter } from '../../../components/plant/views/mag-flowmeter';
import { createHeatingMimic } from '../../../components/plant/views/heating-mimic';
import { createExperimentalSource } from '../../../../game/plant/experimental-source';
import {
  HEATING,
  newPoolHeating,
  pressHeating,
  stepPoolHeating,
} from '../../../../game/plant/pool-heating';
import type {
  HeatingEvent,
  PoolHeatingState,
} from '../../../../game/plant/pool-heating';
import {
  CIRCULATOR,
  HEATING_ITEMS,
  HEATING_PIPES,
  HEATING_SIZE,
  heatingRuns,
  instrumentSpots,
  layoutPoolHeating,
} from '../../logic/pool-heating-rig';
import type { HeatingItem } from '../../logic/pool-heating-rig';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'Heat exchange: one gas boiler heating pool water through a shell-and-tube exchanger, a three-way valve holding the pool outlet at its set point; digital thermometers and a mimic board show it all.';

/** The room's working model, made afresh each time it is built. */
let state: PoolHeatingState = newPoolHeating();
let seconds = 0;
const press = (e: HeatingEvent) => {
  state = pressHeating(state, e);
};

export const layoutRoom = () => layoutPoolHeating();
export function prepareRoom() {
  state = newPoolHeating();
  seconds = 0;
}

const TITLES: Record<HeatingItem, [string, string]> = {
  boiler: ['Boiler B-1', 'Hamwarmy condensing boiler, 160 kW, on natural gas'],
  gas: ['Gas: unlimited', 'experimental source, natural gas'],
  power: ['Power: unlimited', 'experimental source, 230 V'],
  'pool-source': ['Pool water in, 26 °C', 'experimental source'],
  'pool-sink': ['Pool water out', 'experimental sink'],
  exchanger: [
    'Heat exchanger HX-1',
    'Bowman-type shell and tube, on its plinth',
  ],
};

const build =
  (item: HeatingItem) =>
  (kit: PanelKit): LiveExhibit => {
    const object = new Group();
    if (item === 'boiler') {
      const panel = createBoilerPanel(
        kit,
        (key) => press({ type: 'boiler', key }),
        (celsius) => {
          state = {
            ...state,
            boiler: setBoilerSetpoint(state.boiler, celsius),
          };
        },
      );
      object.add(createCondensingBoiler(kit, 160, panel.group));
      panel.group.traverse((o) => {
        o.userData.live = true;
      });
      return {
        object,
        parts: panel.parts,
        update: (delta) => panel.show(state.boiler, seconds, delta),
      };
    }
    if (item === 'exchanger') {
      const t = tools(kit);
      const exchanger = createShellTubeExchanger(kit);
      exchanger.position.y = ON_PLINTH.axis;
      object.add(exchanger);
      const top = ON_PLINTH.axis - SHELL_TUBE.feetBelow;
      t.box(
        object,
        t.paint('#b9b6ad', 0.85),
        ON_PLINTH.plinth.w,
        top,
        ON_PLINTH.plinth.d,
        0,
        top / 2,
        0,
      );
      return { object };
    }
    const substance =
      item === 'gas'
        ? 'natural-gas'
        : item === 'power'
          ? 'power-230v'
          : 'pool-water';
    const view = createExperimentalSourceView(
      kit,
      createExperimentalSource({ id: `heat.${item}`, substance }),
    );
    object.add(view.group);
    return { object, update: () => view.update() };
  };

export const EXHIBITS: readonly PlantExhibit[] = HEATING_ITEMS.map((item) => ({
  title: TITLES[item][0],
  reference: TITLES[item][1],
  size: { ...HEATING_SIZE[item], mount: 'floor' as const },
  build: build(item),
}));

/** The pipework, circulator, valves, thermometers, flowmeters and the mimic board; each frame the loop steps. */
export function buildRoomServices(kit: PanelKit): LiveExhibit {
  const object = new Group();
  object.name = 'Pool heating';
  const parts = createPartSet();
  const t = tools(kit);
  const r = heatingRuns();
  const primary = HEATING_PIPES.primary;
  for (const run of [
    r.flowToPump,
    r.flowToValve,
    r.valveToExchanger,
    r.bypass,
    r.exchangerToTee,
    r.returnToBoiler,
  ])
    object.add(
      createPipe('steel-screwed', primary.od, run, { colour: primary.colour }),
    );
  for (const run of [r.poolIn, r.poolOut])
    object.add(
      createPipe('pvc-pressure', HEATING_PIPES.pool.od, run, {
        colour: HEATING_PIPES.pool.colour,
      }),
    );
  object.add(
    createPipe('steel-screwed', HEATING_PIPES.gas.od, r.gas, {
      colour: HEATING_PIPES.gas.colour,
    }),
  );
  object.add(
    createPipe('steel-screwed', HEATING_PIPES.power.od, r.power, {
      colour: HEATING_PIPES.power.colour,
    }),
  );
  object.add(createPipe('twin-wall-flue', HEATING_PIPES.flue.od, r.flue));
  // The tee where the bypass meets the return.
  const tee = r.bypass.at(-1)!;
  t.box(object, t.paint('#2f6a37', 0.5), 0.07, 0.07, 0.07, ...tee);
  // The circulator, in its run along x.
  const pump = createTwinHeadPump(kit);
  pump.position.set(CIRCULATOR.x, 0, CIRCULATOR.z);
  object.add(pump);
  const spots = instrumentSpots();
  // The three-way valve, actuated, worked by its controller.
  const valve = parts.add(
    createInlineFitting(
      kit,
      {
        kind: 'remote-valve',
        medium: 'water',
        operator: 'motor',
        od: primary.od,
      },
      { open: () => state.valve > 0.5, set: () => {} },
    ),
  );
  placeFitting(
    valve.object,
    'remote-valve',
    spots.valve.at,
    spots.valve.along,
    [0, 1],
  );
  object.add(valve.object);
  // The gas valve and the power isolator, by hand.
  const gasValve = parts.add(
    createInlineFitting(
      kit,
      {
        kind: 'isolating-valve',
        medium: 'gas',
        operator: 'hand',
        od: HEATING_PIPES.gas.od,
      },
      { open: () => state.gas, set: (v) => press({ type: 'gas', on: v }) },
    ),
  );
  placeFitting(
    gasValve.object,
    'isolating-valve',
    spots.gasValve.at,
    spots.gasValve.along,
    [0, 1],
  );
  object.add(gasValve.object);
  const isolator = parts.add(
    createInlineFitting(
      kit,
      {
        kind: 'power-isolator',
        medium: 'power',
        operator: 'hand',
        od: HEATING_PIPES.power.od,
        rating: '1P+N  20A',
      },
      { open: () => state.power, set: (v) => press({ type: 'power', on: v }) },
    ),
  );
  placeFitting(
    isolator.object,
    'power-isolator',
    spots.powerIsolator.at,
    spots.powerIsolator.along,
    [0, 1],
  );
  object.add(isolator.object);
  // The thermometers and flowmeters.
  const tts = (['tt1', 'tt2', 'tt3', 'tt4', 'tt5'] as const).map((key, k) => {
    const od =
      key === 'tt4' || key === 'tt5' ? HEATING_PIPES.pool.od : primary.od;
    const tt = createDigitalThermometer(kit, { tag: `TT${k + 1}`, pipeOd: od });
    placeFitting(
      tt.group,
      'isolating-valve',
      spots[key].at,
      spots[key].along,
      [0, 1],
    );
    object.add(tt.group);
    return tt;
  });
  const ft1 = createMagFlowmeter(kit, { od: primary.od, tag: 'FT1' });
  placeFitting(
    ft1.group,
    'isolating-valve',
    spots.ft1.at,
    spots.ft1.along,
    [0, 1],
  );
  object.add(ft1.group);
  const ft2 = createMagFlowmeter(kit, {
    od: HEATING_PIPES.pool.od,
    tag: 'FT2',
  });
  placeFitting(
    ft2.group,
    'isolating-valve',
    spots.ft2.at,
    spots.ft2.along,
    [0, 1],
  );
  object.add(ft2.group);
  // The mimic board, on the south wall facing the plant.
  const mimic = createHeatingMimic(kit, {
    readings: () => ({
      tt: state.tt,
      primaryFlow: state.power ? HEATING.primaryFlow : 0,
      poolFlow: HEATING.poolFlow,
      valve: state.valve,
      duty: state.duty,
      gas: state.gasRate,
      setpoint: state.setpoint,
      burner: state.boiler.code === 3,
      lockout: state.boiler.lockout !== null,
      pump: state.power,
      auto: state.auto,
    }),
    setAuto: (on) => press({ type: 'auto', on }),
    setpoint: (by) => press({ type: 'setpoint', by }),
    drive: (to) => press({ type: 'drive', to }),
  });
  mimic.group.position.set(0.5, 1.75, 4.32);
  mimic.group.rotation.y = Math.PI;
  object.add(mimic.group);
  for (const [o, use] of mimic.parts.uses) parts.uses.set(o, use);
  return {
    object,
    parts,
    update: (delta) => {
      state = stepPoolHeating(state, delta);
      seconds += delta;
      mimic.parts.update(delta);
      mimic.update();
      pump.show(state.power);
      tts.forEach((tt, k) => tt.show(state.tt[k]));
      ft1.show(state.power ? HEATING.primaryFlow : 0, 'PRIMARY');
      ft2.show(HEATING.poolFlow, 'POOL');
    },
  };
}
