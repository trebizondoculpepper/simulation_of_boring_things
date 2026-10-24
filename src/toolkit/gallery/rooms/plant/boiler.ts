import { computed, signal } from '@preact/signals-core';
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
  setBoilerSetpoint,
  stepBoiler,
} from '../../../components/plant/logic/boiler-house';
import type {
  BoilerState,
  GasHouse,
} from '../../../components/plant/logic/boiler-house';
import {
  boilersPermitted,
  newCombustion,
  resetCombustion,
  setFan,
  stepCombustion,
} from '../../../components/plant/logic/combustion';
import type { CombustionState } from '../../../components/plant/logic/combustion';
import { createCombustionPanel } from '../../../components/plant/views/combustion-panel';
import { currentPlant } from './live-plant';
import { GAS_MIMIC, gasState } from '../../logic/pool-mimics';
import {
  BOILER_HEAT_MIMIC,
  boilerHeatState,
} from '../../logic/boiler-heat-mimic';
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
import { gasBeacon } from '../../../components/general-safety/parts/gas-parts';
import { roomWorld } from '../../../save/world-store';
import {
  actOnBoilerGas,
  newBoilerGas,
  stepBoilerGas,
} from '../../../../game/plant/boiler-gas';
import type {
  BoilerGasAction,
  BoilerGasState,
} from '../../../../game/plant/boiler-gas';

/**
 * The boiler house, working: two boilers' controllers and the gas they
 * share, stepped once a frame by the cascade's exhibit; the gas train,
 * the emergency stop, the gas detector and the gas mimic read and change
 * it. The heat demand comes from the plant's reading
 * (`control-room-demo.ts`): boiler 1 leads, boiler 2 follows when the
 * load is high. Closing the emergency control valve or striking the
 * emergency stop takes the boilers' gas away: a boiler loses its flame,
 * retries and locks out until the gas is back and RESET is pressed.
 *
 * The gas safety itself (the ECV, the emergency stop, the detector and
 * the SSOV) is the world's (`game/plant/boiler-gas.ts`): it survives a
 * reload, the control room sees it, and with the SSOV shut the world's
 * pools get no heat. Here it is shown and worked; the boilers'
 * controllers and their isolators stay the room's.
 */
const house = {
  boilers: Array.from({ length: 6 }, () => newBoiler()) as BoilerState[],
  gas: newGasHouse(6) as GasHouse,
  isolators: [] as BallValveView[],
  ecv: null as BallValveView | null,
  /** The boiler house's electrical supply: on, unless bound to the world's. */
  powered: () => true,
  seconds: 0,
  /** Flue temperatures, the combustion air fan and the room's CO. */
  combustion: newCombustion(6) as CombustionState,
  /**
   * How fouled each boiler's heat exchanger is, 0 to 1: B-502's is due a
   * clean, so its flue runs hotter than B-501's.
   */
  fouling: [0, 0.35, 0.1, 0.25, 0.15, 0.3],
};

// A development handle for the console: the boiler house's state.
if (typeof window !== 'undefined')
  (window as unknown as { boilerHouse: unknown }).boilerHouse = house;

/** The world, where there is a page to keep it (not in tests). */
const store = () => (typeof window === 'undefined' ? null : roomWorld());
/** The gas safety where there is no world (no page): the room's own. */
const ownGas = signal<BoilerGasState>(newBoilerGas());
/** The boiler house's gas safety, as the world has it. */
const gasSafety = (): BoilerGasState =>
  store()?.world.value.boilerGas ?? ownGas.value;
/** Work the gas safety: in the world, else the room's own. */
const actOnGas = (action: BoilerGasAction) => {
  const world = store();
  if (world) world.dispatch({ type: 'boiler-gas', action });
  else ownGas.value = actOnBoilerGas(ownGas.value, action);
};

/** Bring the gas house up to date with the world's gas safety and the isolators. */
const settle = () => {
  const g = gasSafety();
  house.gas = {
    ecvOpen: g.ecvOpen,
    stopPressed: g.stopPressed,
    gasDetected: g.gasDetected,
    ssovOpen: g.ssovOpen,
    isolators: house.isolators.length
      ? house.isolators.map((v) => v.open)
      : house.gas.isolators,
  };
};

/** What this plant room is for, printed on its title card. */
export const PURPOSE =
  'Boilers, low-loss header, heating pumps, pressurisation and gas safety';

/** A physical pair of controllers in one of the room's three cascades. */
/** Bind the boiler house's supply, as the leisure centre's world has it. */
export function bindBoilerSupply(powered: () => boolean) {
  house.powered = powered;
}

export function createLiveBoilerCascade(
  kit: Parameters<PlantExhibit['build']>[0],
  first: number,
): LiveExhibit {
  const parts = createPartSet();
  const panels = [0, 1].map((offset) => {
    const i = first + offset;
    const panel = createBoilerPanel(
      kit,
      (key) => {
        house.boilers[i] = pressBoiler(house.boilers[i], key);
      },
      (celsius) => {
        house.boilers[i] = setBoilerSetpoint(house.boilers[i], celsius);
      },
    );
    for (const [o, use] of panel.parts.uses) parts.uses.set(o, use);
    return panel;
  });
  const cascade = createBoilerCascade(kit, {
    panels: panels.map((panel) => panel.group),
    first: first + 1,
  });
  return {
    object: cascade,
    parts,
    update(delta) {
      // One cascade advances the shared model once; each physical pair
      // displays only its own boiler controllers.
      if (first === 0) {
        house.seconds += delta;
        settle();
        const plant = currentPlant();
        const lag = Math.sin(plant.t / 45) > 0;
        house.boilers = house.boilers.map((boiler, i) =>
          stepBoiler(
            boiler,
            {
              demand:
                plant.boilersFiring &&
                i < 5 &&
                (i === 0 || lag) &&
                boilersPermitted(house.combustion),
              gas: gasTo(house.gas, i),
              systemReturn: plant.lthw - 14,
              pressure: 2.4,
              powered: house.powered(),
            },
            delta,
          ),
        );
        house.combustion = stepCombustion(
          house.combustion,
          house.boilers,
          house.fouling,
          delta,
        );
      }
      // Each display says GAS while no gas reaches its boiler, firing or not.
      panels.forEach((panel, offset) =>
        panel.show(
          house.boilers[first + offset],
          house.seconds,
          delta,
          gasTo(house.gas, first + offset),
        ),
      );
    },
  };
}

/**
 * The room's equipment, in the order it is shown: each after a real
 * product (`doc/research/plant-products-boiler-air.md`).
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'Condensing boilers in cascade',
    maker: 'hamwarmy',
    reference:
      'After 2 × Remeha Gas 220 Ace 300 kW (800 × 1662 × 657 mm); top flue, LTHW and gas ports for room pipe routing',
    size: { w: 2.2, d: 1.0, h: 1.9, mount: 'floor' },
    build: (kit) => createLiveBoilerCascade(kit, 0),
  },
  {
    title: 'Low-loss header',
    maker: 'gorskiy',
    reference: 'After Hamworthy sizing: DN200, length 4 × diameter, < 0.5 m/s',
    size: { w: 1.0, d: 0.5, h: 1.7, mount: 'floor' },
    build: createLowLossHeader,
  },
  {
    title: 'Twin-head LTHW circulator',
    maker: 'grundflow',
    reference: 'After Grundfos MAGNA3 D 65-120 F, DN65, 340 mm port to port',
    size: { w: 1.6, d: 0.8, h: 1.3, mount: 'floor' },
    build: createTwinHeadPump,
  },
  {
    title: 'Pressurisation unit and expansion vessel',
    maker: 'hamwarmy',
    reference:
      'After Reflex G 300 (Ø634 × 1272 mm) and Mikrofill MIDI (504 × 415 × 270 mm)',
    size: { w: 1.4, d: 0.7, h: 1.6, mount: 'floor' },
    build: createPressurisation,
  },
  {
    title: 'Hot-water calorifier',
    maker: 'hamwarmy',
    reference: 'After ICS Cool Energy Calorifier 1000, Ø1000 × 1850 mm',
    size: { w: 1.7, d: 1.2, h: 2.3, mount: 'floor' },
    build: createCalorifier,
  },
  {
    title: 'Gas train',
    maker: 'trager-feinstein',
    reference:
      'After Itron G25 meter (280 mm centres) and Elektrogas VMR6 2" safety valve',
    size: { w: 2.2, d: 0.6, h: 1.7, mount: 'floor' },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      house.ecv = createGasBallValve(kit, {
        pipeRadius: 0.03,
        name: 'Gas emergency control valve',
        binding: {
          open: () => gasSafety().ecvOpen,
          set: (open) => actOnGas({ act: 'ecv', open }),
        },
      });
      parts.add(house.ecv);
      const train = createGasTrain(kit, { ecv: house.ecv.object });
      return {
        object: train,
        parts,
        update: () => {
          settle();
          train.setSsov(house.gas.ssovOpen);
        },
      };
    },
  },
  {
    title: 'Dosing pot',
    maker: 'gorskiy',
    reference: 'After Flamco 11 litre, Ø215 × 935 mm, ¾", 16 bar',
    size: { w: 0.7, d: 0.3, h: 1.2, mount: 'wall', y: 1.2 },
    build: createDosingPot,
  },
  {
    title: 'Gas detection and emergency stop',
    maker: 'kessler-moody',
    reference: 'After Crowcon Gasflag (210 × 145 × 46 mm); boiler house stop',
    size: { w: 1.4, d: 0.15, h: 1.8, mount: 'wall', y: 1.6 },
    build(kit): LiveExhibit {
      const parts = createPartSet();
      // The stop, struck in, shuts the SSOV until it is pulled out and
      // GAS RESET pressed: the world's (`boiler-gas.ts`).
      const stop = parts.add(
        mushroomStop(kit, {
          name: 'Boiler house emergency stop',
          bound: {
            get value() {
              return gasSafety().stopPressed;
            },
            set: (pressed: boolean) => actOnGas({ act: 'stop', pressed }),
          },
        }),
      );
      // TEST simulates a leak at the detector head; GAS RESET reopens the
      // gas safety valve once all is well, and does nothing otherwise.
      const test = parts.add(
        pushButton(kit, {
          colour: 'black',
          legend: 'TEST',
          action: () => actOnGas({ act: 'test' }),
        }),
      );
      const reset = parts.add(
        pushButton(kit, {
          colour: 'green',
          legend: 'GAS RESET',
          action: () => actOnGas({ act: 'reset' }),
        }),
      );
      // The sounder-beacon: flashing and sounding while the stop is in
      // or gas is detected.
      const alarm = computed(() => {
        const g = gasSafety();
        return g.stopPressed || g.gasDetected;
      });
      const beacon = parts.add(
        gasBeacon(kit, { lens: 'red', flashing: alarm, sounding: alarm }),
      );
      const board = createGasSafetyBoard(kit, {
        stop: stop.object,
        test: test.object,
        reset: reset.object,
        beacon: beacon.object,
      });
      let seconds = 0;
      return {
        object: board,
        parts,
        update(delta) {
          seconds += delta;
          // With no world the room runs its own detector's TEST.
          if (!store()) ownGas.value = stepBoilerGas(ownGas.value, delta);
          settle();
          const g = house.gas;
          const flash = Math.floor(seconds * 2) % 2 === 0;
          // Healthy; fault (the SSOV shut), flashing while the stop is
          // in; gas detected.
          board.setLamps(
            !g.gasDetected && !g.stopPressed && g.ssovOpen,
            !g.ssovOpen && (!g.stopPressed || flash),
            g.gasDetected,
          );
        },
      };
    },
  },
  {
    title: 'Combustion and ventilation panel',
    maker: 'penfold',
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
    maker: 'penfold',
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
  {
    title: 'Mimic: boiler status and heat output',
    maker: 'penfold',
    reference:
      'Hard-wired boiler cascade mimic: ready, firing and fault indications; estimated output in kW per 300 kW boiler and total',
    size: {
      w: BOILER_HEAT_MIMIC.width + 0.1,
      d: 0.08,
      h: BOILER_HEAT_MIMIC.height + 0.1,
      mount: 'wall',
      y: 1.7,
    },
    build(kit): LiveExhibit {
      const board = createMimicBoard(kit, BOILER_HEAT_MIMIC);
      return {
        object: board.group,
        parts: board.parts,
        update: () => board.show(boilerHeatState(house.boilers)),
      };
    },
  },
];
