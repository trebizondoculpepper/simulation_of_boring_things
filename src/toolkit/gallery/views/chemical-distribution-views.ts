import { Group } from 'three';
import { computed } from '@preact/signals-core';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { LiveExhibit } from '../rooms/plant/exhibit';
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

/** The distribution as its panel shows it, from the world. */
function readDistribution(): Record<Chemical, DistributionReading> | null {
  if (typeof window === 'undefined') return null;
  const w = roomWorld().world.value;
  const line = (c: Chemical): DistributionReading => {
    const d = w.distribution[c];
    return {
      store: w.chemicals[c] / STORE_CAPACITY[c],
      days: d.tanks.map((t, i) => t.litres / DAY_TANKS[c][i].litres),
      serving: d.serving,
      mode: d.mode,
      running: transferRunning(d, w.chemicals[c], STORE_CAPACITY[c]),
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
  const tank = createFramedChemicalTank(kit, {
    tag,
    product: PRODUCT[c],
    litres: each,
    acid: c === 'acid',
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
    update(delta) {
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
      bottle.show(s, true, delta);
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
      const skid = createTransferPumpSkid(kit, chemical, storeOf(chemical));
      return { ...skid, update: (d) => skid.update(d) };
    }
    case 'chem-selector': {
      const sel = createTransferSelector(kit, chemical, storeOf(chemical));
      return sel;
    }
    case 'chem-day': {
      const index = DAY_TANKS[chemical].findIndex((t) => t.site === arg);
      if (index < 0) return null;
      const litres = DAY_TANKS[chemical][index].litres;
      const room = Number(arg?.slice(-1));
      const tag = `PL${room}-DT${chemical === 'acid' ? 2 : 1}`;
      if (isDoseBottle(litres)) return dayBottle(kit, chemical, index, tag);
      return createDayTankStation(kit, chemical, storeOf(chemical), index, {
        litres,
        tag,
        withPump: false,
        withGear: false,
        centred: true,
      });
    }
  }
  return null;
}
