import type { LiveExhibit, PlantExhibit } from './exhibit';
import {
  createPartSet,
  mushroomStop,
  pushButton,
} from '../../../components/core/parts/parts';
import { createBoilerPanel } from '../../../components/plant/views/boiler-controls';
import { createGasBallValve } from '../../../components/plant/views/gas-fittings';
import type { BallValveView } from '../../../components/plant/views/gas-fittings';
import { createMimicBoard } from '../../../components/industrial-control/views/mimic-board';
import {
  gasPressures,
  gasTo,
  meterFlow,
  newBoiler,
  newGasHouse,
  pressBoiler,
  resetGasHouse,
  settleGasHouse,
  stepBoiler,
} from '../../../components/plant/logic/boiler-house';
import type {
  BoilerState,
  GasHouse,
} from '../../../components/plant/logic/boiler-house';
import {
  FLUE_HIGH,
  boilersPermitted,
  newCombustion,
  resetCombustion,
  setFan,
  stepCombustion,
} from '../../../components/plant/logic/combustion';
import type { CombustionState } from '../../../components/plant/logic/combustion';
import { createCombustionPanel } from '../../../components/plant/views/combustion-panel';
import { createDialGauge } from '../../../components/industrial-control/views/dial-gauge';
import { plantAt } from '../../logic/control-room-demo';
import { GAS_MIMIC, gasState } from '../../logic/pool-mimics';
import {
  createBoilerCascade,
  createCalorifier,
  createDosingPot,
  createGasSafetyBoard,
  createGasTrain,
  createLowLossHeader,
  createPressurisation,
  createTwinHeadPump,
} from '../../../components/plant/views/boiler-plant';

/**
 * The boiler house, working: two boilers' controllers and the gas they
 * share, stepped once a frame by the cascade's exhibit; the gas train,
 * the emergency stop, the gas detector and the gas mimic read and change
 * it. The heat demand comes from the plant's reading
 * (`control-room-demo.ts`): boiler 1 leads, boiler 2 follows when the
 * load is high. Closing a boiler's isolating valve, the emergency
 * control valve, or striking the emergency stop takes its gas away: the
 * boiler loses its flame, retries and locks out, until the gas is back
 * and its RESET is pressed (and, after a stop, the gas safety RESET).
 */
const house = {
  boilers: [newBoiler(), newBoiler()] as BoilerState[],
  gas: newGasHouse(2) as GasHouse,
  isolators: [] as BallValveView[],
  ecv: null as BallValveView | null,
  stopPushed: () => false,
  seconds: 0,
  /** Flue temperatures, the combustion air fan and the room's CO. */
  combustion: newCombustion(2) as CombustionState,
  /**
   * How fouled each boiler's heat exchanger is, 0 to 1: B-502's is due a
   * clean, so its flue runs hotter than B-501's.
   */
  fouling: [0, 0.35],
};

// A development handle for the console: the boiler house's state.
if (typeof window !== 'undefined')
  (window as unknown as { boilerHouse: unknown }).boilerHouse = house;

/** Bring the gas house up to date with its valves and stop. */
const settle = () => {
  house.gas = settleGasHouse({
    ...house.gas,
    ecvOpen: house.ecv?.open ?? true,
    stopPressed: house.stopPushed(),
    isolators: house.isolators.length
      ? house.isolators.map((v) => v.open)
      : house.gas.isolators,
  });
};

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Boilers, low-loss header, heating pumps, pressurisation and gas safety';

/**
 * The room's equipment, in the order it is shown: each after a real
 * product (`doc/research/plant-products-boiler-air.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Condensing boilers in cascade',
    reference:
      'After 2 × Remeha Gas 220 Ace 300 kW (800 × 1662 × 657 mm); cascade flue header with 45° branches and non-return flaps',
    size: { w: 3.0, d: 1.0, h: 3.2, mount: 'floor' },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      const panels = house.boilers.map((_, i) => {
        const panel = createBoilerPanel(kit, (key) => {
          house.boilers[i] = pressBoiler(house.boilers[i], key);
        });
        for (const [o, use] of panel.parts.uses) parts.uses.set(o, use);
        return panel;
      });
      house.isolators = house.boilers.map((_, i) => {
        const valve = createGasBallValve(kit, {
          pipeRadius: 0.028,
          name: `B-50${i + 1} gas isolating valve`,
        });
        parts.add(valve);
        return valve;
      });
      // Permanently installed flue thermometers, 0–120 °C.
      const thermometers = ['B-501', 'B-502', 'HEADER'].map((legend) =>
        createDialGauge(kit, {
          kind: 'thermometer',
          dia: 0.08,
          min: 0,
          max: 120,
          red: { from: FLUE_HIGH, to: 120 },
          legend,
        }),
      );
      const cascade = createBoilerCascade(kit, {
        panels: panels.map((p) => p.group),
        isolators: house.isolators.map((v) => v.object),
        flueGauges: thermometers.map((g) => g.group),
      });
      return {
        object: cascade,
        parts,
        update(delta) {
          house.seconds += delta;
          settle();
          const plant = plantAt(performance.now() / 1000);
          const lag = Math.sin(plant.t / 45) > 0;
          house.boilers = house.boilers.map((b, i) =>
            stepBoiler(
              b,
              {
                demand:
                  plant.boilersFiring &&
                  (i === 0 || lag) &&
                  boilersPermitted(house.combustion),
                gas: gasTo(house.gas, i),
                systemReturn: plant.lthw - 14,
                pressure: 2.4,
              },
              delta,
            ),
          );
          panels.forEach((panel, i) =>
            panel.show(house.boilers[i], house.seconds, delta),
          );
          house.combustion = stepCombustion(
            house.combustion,
            house.boilers,
            house.fouling,
            delta,
          );
          const c = house.combustion;
          [...c.flues, c.header].forEach((v, i) => {
            thermometers[i].set(v);
            thermometers[i].update(delta);
          });
        },
      };
    },
  },
  {
    title: 'Low-loss header',
    reference: 'After Hamworthy sizing: DN200, length 4 × diameter, < 0.5 m/s',
    size: { w: 1.0, d: 0.5, h: 1.7, mount: 'floor' },
    build: createLowLossHeader,
  },
  {
    title: 'Twin-head LTHW circulator',
    reference: 'After Grundfos MAGNA3 D 65-120 F, DN65, 340 mm port to port',
    size: { w: 1.6, d: 0.8, h: 1.3, mount: 'floor' },
    build: createTwinHeadPump,
  },
  {
    title: 'Pressurisation unit and expansion vessel',
    reference:
      'After Reflex G 300 (Ø634 × 1272 mm) and Mikrofill MIDI (504 × 415 × 270 mm)',
    size: { w: 1.4, d: 0.7, h: 1.6, mount: 'floor' },
    build: createPressurisation,
  },
  {
    title: 'Hot-water calorifier',
    reference: 'After ICS Cool Energy Calorifier 1000, Ø1000 × 1850 mm',
    size: { w: 1.7, d: 1.2, h: 2.3, mount: 'floor' },
    build: createCalorifier,
  },
  {
    title: 'Gas train',
    reference:
      'After Itron G25 meter (280 mm centres) and Elektrogas VMR6 2" safety valve',
    size: { w: 2.2, d: 0.6, h: 1.7, mount: 'floor' },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      house.ecv = createGasBallValve(kit, {
        pipeRadius: 0.03,
        name: 'Gas emergency control valve',
      });
      parts.add(house.ecv);
      const train = createGasTrain(kit, { ecv: house.ecv.object });
      return {
        object: train,
        parts,
        update: () => train.setSsov(house.gas.ssovOpen),
      };
    },
  },
  {
    title: 'Dosing pot',
    reference: 'After Flamco 11 litre, Ø215 × 935 mm, ¾", 16 bar',
    size: { w: 0.7, d: 0.3, h: 1.2, mount: 'wall', y: 1.2 },
    build: createDosingPot,
  },
  {
    title: 'Gas detection and emergency stop',
    reference: 'After Crowcon Gasflag (210 × 145 × 46 mm); boiler house stop',
    size: { w: 1.4, d: 0.15, h: 1.8, mount: 'wall', y: 1.6 },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      const stop = parts.add(
        mushroomStop(kit, { name: 'Boiler house emergency stop' }),
      );
      house.stopPushed = () => stop.pushed.value;
      // TEST simulates a leak at the detector head; RESET reopens the
      // gas safety valve once all is well.
      let testing = 0;
      const test = parts.add(
        pushButton(kit, {
          colour: 'black',
          legend: 'TEST',
          action: () => (testing = 8),
        }),
      );
      const reset = parts.add(
        pushButton(kit, {
          colour: 'green',
          legend: 'GAS RESET',
          action: () => (house.gas = resetGasHouse(house.gas)),
        }),
      );
      const board = createGasSafetyBoard(kit, {
        stop: stop.object,
        test: test.object,
        reset: reset.object,
      });
      return {
        object: board,
        parts,
        update(delta) {
          testing = Math.max(0, testing - delta);
          house.gas = { ...house.gas, gasDetected: testing > 0 };
          settle();
          board.setLamps(
            !house.gas.gasDetected && !house.gas.stopPressed,
            !house.gas.ssovOpen,
            house.gas.gasDetected,
          );
        },
      };
    },
  },
  {
    title: 'Combustion and ventilation panel',
    reference:
      'Penfold Controls wall panel: flue gas temperatures, combustion air fan proving, CO in ppm, the boilers’ interlock',
    size: { w: 1.0, d: 0.25, h: 0.75, mount: 'wall', y: 1.5 },
    build(kit): LiveExhibit {
      const panel = createCombustionPanel(kit, {
        setFan: (hoa) => (house.combustion = setFan(house.combustion, hoa)),
        reset: () => (house.combustion = resetCombustion(house.combustion)),
      });
      return {
        object: panel.group,
        parts: panel.parts,
        update: () => panel.show(house.combustion),
      };
    },
  },
  {
    title: 'Mimic: boiler house gas',
    reference:
      'Hard-wired mimic board: ECV, meter, safety valve, isolators and boilers; PRESS and FLOW modes',
    size: {
      w: GAS_MIMIC.width + 0.1,
      d: 0.08,
      h: GAS_MIMIC.height + 0.1,
      mount: 'wall',
      y: 1.7,
    },
    build(kit): LiveExhibit {
      const board = createMimicBoard(kit, GAS_MIMIC);
      return {
        object: board.group,
        parts: board.parts,
        update() {
          const flow = meterFlow(house.gas, house.boilers);
          const { supply, burners } = gasPressures(house.gas, flow);
          board.show(
            gasState({
              ecvOpen: house.gas.ecvOpen,
              ssovOpen: house.gas.ssovOpen,
              stopPressed: house.gas.stopPressed,
              gasDetected: house.gas.gasDetected,
              isolators: house.gas.isolators,
              boilers: house.boilers.map((b) => ({
                firing: b.code === 3,
                lockout: b.lockout !== null,
                rate: b.rate,
              })),
              flow,
              supply,
              burners,
            }),
          );
        },
      };
    },
  },
];
