import { Group } from 'three';
import { computed } from '@preact/signals-core';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import { distributionPower } from '../../../game/world';
import { serviceAvailable } from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';
import { roomWorld } from '../../save/world-store';
import { STORE_CAPACITY } from '../../../game/plant/chemicals';
import type { Chemical } from '../../../game/plant/chemicals';
import {
  DAY_TANKS,
  transferRunning,
} from '../../../game/plant/chemical-distribution';
import type { DistributionAction } from '../../../game/plant/chemical-distribution';
import {
  describeTank,
  levelTrend,
} from '../../../game/plant/chemical-transfer-demo';
import type {
  TransferAction,
  TransferTrial,
} from '../../../game/plant/chemical-transfer-demo';
import { createFramedChemicalTank } from '../../components/plant/views/framed-chemical-tank';
import { createDoseBottle } from '../../components/plant/views/dose-bottle';
import {
  BOTTLE,
  bottleLevel,
  isDoseBottle,
} from '../../../game/plant/dose-bottle';
import type { DoseBottle } from '../../../game/plant/dose-bottle';
import {
  SELECTOR_OUTLETS,
  createDayTankStation,
  createDistributionPanel,
  createTransferPumpSkid,
  createTransferSelector,
  createTransferStore,
} from '../../components/plant/views/chemical-handling-kit';
import type {
  DistributionReading,
  TransferStore,
} from '../../components/plant/views/chemical-handling-kit';
import type { BoundChemicalValve } from '../../components/plant/views/chemical-ball-valve';
import {
  bulkTankValves,
  dayTankValves,
  selectorValves,
  transferPumpValves,
} from '../../../game/plant/chemical-valves';
import type { ModelValve } from '../../../game/plant/model-valves';
import type { DayTankSite } from '../../../game/plant/chemical-distribution';

/**
 * A machine's valve as its model gives it (plan 085): its tag and name,
 * its fitting, and, for a valve worked by hand that the world keeps, the
 * world's state, which its handle sets.
 */
function boundValve(v: ModelValve | undefined): BoundChemicalValve | undefined {
  if (!v) return undefined;
  const byHand =
    !v.keptBy && v.kind === 'isolating-valve' && v.operator !== 'motor';
  return {
    tag: v.tag,
    name: v.name,
    fitting: v.id,
    ...(byHand && typeof window !== 'undefined'
      ? {
          binding: {
            open: () =>
              roomWorld().world.value.installedValves[v.id] ??
              v.normal === 'open',
            set: (open: boolean) =>
              roomWorld().dispatch({ type: 'plant/valve', id: v.id, open }),
          },
        }
      : {}),
  };
}

/**
 * The chemical distribution's machines in the building (plan 085), each
 * bound to the world's (`game/plant/chemical-distribution.ts`): the stores'
 * bulk tanks, their transfer pumps, the wet hall's selectors and each
 * plant room's day tanks. Their keys (`logic/room-equipment.ts`):
 *
 * - `chem-bulk:<chemical>:<n>`: a store's bulk tank, its level the store's;
 * - `chem-pump:<chemical>`: its transfer pump on its skid;
 * - `chem-selector:<chemical>`: its six-way transfer selector;
 * - `chem-day:<chemical>:<pool>`: a plant room's day tank.
 */

const NAME: Record<Chemical, string> = {
  hypochlorite: 'Sodium hypochlorite',
  acid: 'Hydrochloric acid',
};
const PRODUCT: Record<Chemical, string> = {
  hypochlorite: 'SODIUM HYPOCHLORITE 14%',
  acid: 'HYDROCHLORIC ACID 10%',
};
const STORE_CODE: Record<Chemical, string> = { hypochlorite: 'HS', acid: 'AS' };
/** Each store's bulk tanks. */
export const BULK_TANKS: Record<Chemical, number> = {
  hypochlorite: 3,
  acid: 1,
};

/**
 * The world's distribution of a chemical, as the dev44 kit's trial state
 * shows it, so the same models work on it: its pump, selector and day
 * tanks bound to the world's, their switches and buttons acting on it.
 */
function worldTransferStore(c: Chemical): TransferStore {
  if (typeof window === 'undefined') return createTransferStore();
  const world = roomWorld();
  const state = computed<TransferTrial>(() => {
    const line = world.world.value.distribution[c];
    return {
      tanks: line.tanks.map((t, i) => ({
        name: SELECTOR_OUTLETS[i] ?? '',
        litres: t.litres,
        capacity: DAY_TANKS[c][i].litres,
        calling: t.calling,
        doseLpm: 0,
      })),
      mode: line.mode,
      pick: line.pick,
      serving: line.serving,
      hoa: line.hoa,
      tripped: line.tripped,
      delivered: 0,
    };
  });
  const send = (action: DistributionAction) =>
    world.dispatch({ type: 'distribution', action });
  return {
    state,
    pumpOn: computed(() => {
      const w = world.world.value;
      return transferRunning(
        w.distribution[c],
        w.chemicals[c],
        STORE_CAPACITY[c],
        distributionPower(w.plant)[c],
      );
    }),
    act(a: TransferAction) {
      if (a.act === 'hoa') send({ act: 'hoa', chemical: c, to: a.to });
      else if (a.act === 'mode') send({ act: 'mode', chemical: c, to: a.to });
      else if (a.act === 'pick')
        send({ act: 'pick', chemical: c, outlet: a.tank });
      else if (a.act === 'reset') send({ act: 'reset', chemical: c });
    },
    // The world steps itself.
    step() {},
  };
}

/**
 * The distribution as its panel shows it, from the world; null, the panel
 * dark, while the wet hall, where it hangs, has no power.
 */
function readDistribution(): Record<Chemical, DistributionReading> | null {
  if (typeof window === 'undefined') return null;
  const w = roomWorld().world.value;
  if (!serviceAvailable(w.plant, 'wet_hall', 'power')) return null;
  const power = distributionPower(w.plant);
  const line = (c: Chemical): DistributionReading => {
    const d = w.distribution[c];
    return {
      store: w.chemicals[c] / STORE_CAPACITY[c],
      days: d.tanks.map((t, i) => t.litres / DAY_TANKS[c][i].litres),
      serving: d.serving,
      mode: d.mode,
      running: transferRunning(d, w.chemicals[c], STORE_CAPACITY[c], power[c]),
      tripped: d.tripped,
      inAuto: d.hoa === 'auto',
    };
  };
  return { hypochlorite: line('hypochlorite'), acid: line('acid') };
}

/** One store per chemical, shared by its machines in whichever room is drawn. */
const stores = new Map<Chemical, TransferStore>();
const storeOf = (c: Chemical) => {
  if (!stores.has(c)) stores.set(c, worldTransferStore(c));
  return stores.get(c)!;
};

const isChemical = (s: string | undefined): s is Chemical =>
  s === 'hypochlorite' || s === 'acid';

/** A store's bulk tank: framed, its level the store's, its words its own. */
function bulkTank(kit: PanelKit, c: Chemical, n: number): LiveExhibit {
  const each = STORE_CAPACITY[c] / BULK_TANKS[c];
  const tag = `${STORE_CODE[c]}-T${n}`;
  const valves = bulkTankValves(c, n);
  const tank = createFramedChemicalTank(kit, {
    tag,
    product: PRODUCT[c],
    litres: each,
    acid: c === 'acid',
    valves: {
      fill: boundValve(valves.fill),
      outlet: boundValve(valves.outlet),
    },
  });
  // Centred on its footprint: its fill line and outlet stand out in front.
  const object = new Group();
  tank.object.position.z = -0.2;
  object.add(tank.object);
  const trend = levelTrend();
  const level = () => {
    if (typeof window === 'undefined') return 1;
    return roomWorld().world.value.chemicals[c] / STORE_CAPACITY[c];
  };
  return {
    object,
    parts: tank.parts,
    update(delta) {
      tank.parts.update(delta);
      const v = level();
      tank.setLevel(v);
      trend.sample(v * each, delta);
    },
    status: () =>
      describeTank(`${NAME[c]} bulk tank ${tag}`, level(), trend.lpm()),
  };
}

/**
 * A plant room's day tank as a dose bottle, its contents and its call the
 * world's line's; its pump seen running while its contents fall.
 */
function dayBottle(
  kit: PanelKit,
  c: Chemical,
  index: number,
  tag: string,
): LiveExhibit {
  const capacity = DAY_TANKS[c][index].litres;
  const bottle = createDoseBottle(kit, {
    tag,
    product: PRODUCT[c],
    litres: capacity,
    acid: c === 'acid',
  });
  const trend = levelTrend();
  const state = (): DoseBottle => {
    const t =
      typeof window === 'undefined'
        ? undefined
        : roomWorld().world.value.distribution[c].tanks[index];
    return {
      capacity,
      litres: t?.litres ?? capacity * 0.7,
      calling: t?.calling ?? false,
      pumping:
        trend.lpm() < -1e-4 && (t?.litres ?? 0) > capacity * BOTTLE.empty,
    };
  };
  return {
    object: bottle.object,
    parts: bottle.parts,
    update(delta) {
      const s = state();
      trend.sample(s.litres, delta);
      // Its head on its plant room's supply.
      const site = DAY_TANKS[c][index].site;
      const powered =
        typeof window === 'undefined' ||
        serviceAvailable(
          roomWorld().world.value.plant,
          `plant_${site}` as ServiceRoom,
          'power',
        );
      bottle.show(s, powered, delta);
    },
    status: () =>
      describeTank(
        `${NAME[c]} dose bottle ${tag}`,
        bottleLevel(state()),
        trend.lpm(),
      ),
  };
}

/** The model for a chemical distribution key, bound to the world; null if the key is another's. */
export function chemicalModel(kit: PanelKit, key: string): LiveExhibit | null {
  const [kind, chemical, arg] = key.split(':');
  if (kind === 'chem-panel')
    return createDistributionPanel(kit, readDistribution);
  if (!isChemical(chemical)) return null;
  switch (kind) {
    case 'chem-bulk':
      return bulkTank(kit, chemical, Number(arg) || 1);
    case 'chem-pump': {
      const v = transferPumpValves(chemical);
      const skid = createTransferPumpSkid(kit, chemical, storeOf(chemical), {
        suction: boundValve(v.suction),
        check: boundValve(v.check),
        discharge: boundValve(v.discharge),
      });
      return { ...skid, update: (d) => skid.update(d) };
    }
    case 'chem-selector': {
      const sel = createTransferSelector(
        kit,
        chemical,
        storeOf(chemical),
        undefined,
        (i) => {
          if (i >= DAY_TANKS[chemical].length) return {};
          const v = selectorValves(chemical, i);
          return {
            isolation: boundValve(v.isolation),
            actuated: boundValve(v.actuated),
          };
        },
      );
      return sel;
    }
    case 'chem-day': {
      const index = DAY_TANKS[chemical].findIndex((t) => t.site === arg);
      if (index < 0) return null;
      const litres = DAY_TANKS[chemical][index].litres;
      const room = Number(arg?.slice(-1));
      const tag = `PL${room}-DT${chemical === 'acid' ? 2 : 1}`;
      if (isDoseBottle(litres)) return dayBottle(kit, chemical, index, tag);
      const v = dayTankValves(chemical, arg as DayTankSite);
      return createDayTankStation(kit, chemical, storeOf(chemical), index, {
        litres,
        tag,
        withPump: false,
        withGear: false,
        centred: true,
        valves: { inlet: boundValve(v.actuated), outlet: boundValve(v.outlet) },
      });
    }
  }
  return null;
}
