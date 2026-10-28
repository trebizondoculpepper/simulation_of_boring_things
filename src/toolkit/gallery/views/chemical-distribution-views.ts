import { doseDemand, doseRates } from '../../../game/plant/pool-dosing';
import { Group } from 'three';
import { computed } from '@preact/signals-core';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import { chemControlRunning, transferRunsIn } from '../../../game/world';
import { newWorld } from '../../../game/world';
import type { World, WorldAction } from '../../../game/world';
import { createOt216Terminal } from '../../components/industrial-control/views/ot216-terminal';
import { createChemControlBox } from '../../components/plant/views/chem-control-box';
import { boxLive } from '../../../game/plant/chem-control';
import { installedTagOf } from '../../../game/plant/installed-asset-ids';
import {
  worldTerminalFeed,
  worldTerminalLink,
} from '../logic/chem-terminal-feed';
import { serviceAvailable } from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';
import { roomWorld } from '../../save/world-store';
import { STORE_CAPACITY } from '../../../game/plant/chemicals';
import type { Chemical } from '../../../game/plant/chemicals';
import { DAY_TANKS } from '../../../game/plant/chemical-distribution';
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
  bottlePumpWords,
  bottleReadout,
  isDoseBottle,
} from '../../../game/plant/dose-bottle';
import type { DoseBottle } from '../../../game/plant/dose-bottle';
import {
  SELECTOR_OUTLETS,
  createDayTankStation,
  createTransferPumpSkid,
  createTransferSelector,
  createTransferStore,
} from '../../components/plant/views/chemical-handling-kit';
import type { TransferStore } from '../../components/plant/views/chemical-handling-kit';
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
 * - `chem-terminal:<chemical>`: its line's OT-216 operator terminal;
 * - `chem-control-box`: the transfer control box both terminals link to;
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
    pumpOn: computed(() => transferRunsIn(world.world.value, c)),
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

/** A world for a model built without one (a test, the manual): a new one, made once. */
let fresh: World | null = null;
const built = () => (fresh ??= newWorld());

/** Each line's band on its terminal, and its chemical across it. */
const TERMINAL: Record<Chemical, { title: string; band: string }> = {
  hypochlorite: { title: 'HYPOCHLORITE', band: '#d2ae20' },
  acid: { title: 'ACID', band: '#b92b24' },
};

/**
 * A line's OT-216 terminal (prompt 091), bound to the world: it shows
 * what the world's control box sends it and sends back what is set and
 * commanded there, logged under its tag (the register's).
 */
function chemTerminal(kit: PanelKit, c: Chemical): LiveExhibit {
  const tag = installedTagOf('wet_hall', `chem-terminal:${c}`) ?? '';
  const live = typeof window !== 'undefined';
  const now = (): World => roomWorld().world.value;
  const term = createOt216Terminal(kit, {
    ...TERMINAL[c],
    tag,
    read: () =>
      live
        ? {
            feed: worldTerminalFeed(now(), c),
            link: worldTerminalLink(now(), c),
          }
        : {
            feed: worldTerminalFeed(built(), c),
            link: { powered: false, comms: false },
          },
    send: (command) =>
      roomWorld().dispatch({
        type: 'chem-control',
        action: { act: 'terminal', chemical: c, tag, command },
      }),
  });
  return term;
}

/**
 * The chemical transfer control box (prompt 091), bound to the world's:
 * its door isolator and MCB the world's, its controller's LEDs, its I/O
 * and its comms ports showing the world's lines.
 */
function chemControlBox(kit: PanelKit): LiveExhibit {
  const tag = installedTagOf('wet_hall', 'chem-control-box') ?? '';
  const live = typeof window !== 'undefined';
  const now = (): World => (live ? roomWorld().world.value : built());
  const dispatch = (action: WorldAction) => {
    if (live) roomWorld().dispatch(action);
  };
  const box = createChemControlBox(kit, {
    tag,
    fedFrom: 'WET HALL DISTRIBUTION',
    isolatorBinding: {
      get value() {
        return now().chemControl.isolator ? 'on' : 'off';
      },
      set: (v) =>
        dispatch({
          type: 'chem-control',
          action: { act: 'isolator', on: v === 'on' },
        }),
    },
    mcbBinding: {
      get value() {
        return now().chemControl.mcbTripped ? 'tripped' : 'on';
      },
      set: (v) =>
        dispatch({
          type: 'chem-control',
          action: { act: 'mcb', tripped: v !== 'on' },
        }),
    },
    read: () => {
      const w = now();
      const hall = serviceAvailable(w.plant, 'wet_hall', 'power');
      const h = w.distribution.hypochlorite;
      const a = w.distribution.acid;
      const outlets = (l: typeof h) =>
        [0, 1, 2, 3].map((i) => l.mode === 'auto' && l.serving === i);
      const run = (l: typeof h) =>
        l.serving !== null && l.mode === 'auto' && !l.tripped;
      return {
        live: boxLive(w.chemControl, hall),
        running: chemControlRunning(w),
        hung: w.chemControl.hung,
        inputs: [
          h.mode === 'auto',
          h.hoa === 'auto',
          !h.tripped,
          a.mode === 'auto',
          a.hoa === 'auto',
          !a.tripped,
        ],
        outputs: [run(h), ...outlets(h), run(a), ...outlets(a)],
        links: [w.chemControl.links.hypochlorite, w.chemControl.links.acid],
      };
    },
  });
  return box;
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
  const site = DAY_TANKS[c][index].site;
  const state = (): DoseBottle => {
    const w =
      typeof window === 'undefined' ? undefined : roomWorld().world.value;
    const t = w?.distribution[c].tanks[index];
    // What its pool's dosing asks of it and what it gives, from the model,
    // not guessed from its level (the owner, 2026-10-28: the footbath's
    // draws so little its level never seemed to move).
    const asked = w ? doseDemand(w, site)[c] : 0;
    const given = w ? doseRates(w, site)[c] : 0;
    const litres = t?.litres ?? capacity * 0.7;
    return {
      capacity,
      litres,
      calling: t?.calling ?? false,
      pumping: asked > 0 && litres > capacity * BOTTLE.empty,
      asked,
      given,
    };
  };
  return {
    object: bottle.object,
    parts: bottle.parts,
    update(delta) {
      const s = state();
      trend.sample(s.litres, delta);
      // Its head on its plant room's supply.
      const powered =
        typeof window === 'undefined' ||
        serviceAvailable(
          roomWorld().world.value.plant,
          `plant_${site}` as ServiceRoom,
          'power',
        );
      bottle.show(s, powered, delta);
    },
    status: () => {
      const b = state();
      const powered =
        typeof window === 'undefined' ||
        serviceAvailable(
          roomWorld().world.value.plant,
          `plant_${site}` as ServiceRoom,
          'power',
        );
      return `${describeTank(`${NAME[c]} dose bottle ${tag}`, bottleLevel(b), trend.lpm())}; pump ${bottlePumpWords(bottleReadout(b, powered)).toLowerCase()}`;
    },
  };
}

/** The model for a chemical distribution key, bound to the world; null if the key is another's. */
export function chemicalModel(kit: PanelKit, key: string): LiveExhibit | null {
  const [kind, chemical, arg] = key.split(':');
  if (kind === 'chem-control-box') return chemControlBox(kit);
  if (!isChemical(chemical)) return null;
  if (kind === 'chem-terminal') return chemTerminal(kit, chemical);
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
        valves: {
          inlet: boundValve(v.actuated),
          isolation: boundValve(v.inlet),
          outlet: boundValve(v.outlet),
        },
      });
    }
  }
  return null;
}
