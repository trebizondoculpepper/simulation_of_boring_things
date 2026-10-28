import { actOnHall9, runHall9 } from './museum-9-faults';
import type { FaultNo, Hall9 } from './museum-9-faults';
import type { Hall9PlantAction } from './museum-9-plant';

/** Hall 9's faults' fixes, as a visitor would do them at the machines, for the tests. */
const p = (h: Hall9, action: Hall9PlantAction) =>
  actOnHall9(h, { type: 'plant', action });
const water = (h: Hall9, id: string, opening: number) =>
  p(h, { type: 'water', action: { type: 'valve', id: id as never, opening } });
const mode = (h: Hall9, m: 'hand' | 'off' | 'auto') =>
  p(h, { type: 'starter-mode', mode: m });

export const FIXES: Record<FaultNo, (h: Hall9) => Hall9> = {
  1: (h) => {
    h = mode(h, 'off');
    h = water(h, 'pump.suction.iso', 0);
    h = water(h, 'pump.discharge.iso', 0);
    h = p(h, { type: 'lid', open: true });
    h = p(h, { type: 'clean-basket' });
    h = p(h, { type: 'lid', open: false });
    h = water(h, 'pump.suction.iso', 1);
    h = water(h, 'pump.discharge.iso', 1);
    return mode(h, 'auto');
  },
  2: (h) => {
    h = mode(h, 'off');
    h = water(h, 'filter.inlet.iso', 0);
    h = water(h, 'filter.outlet.iso', 0);
    h = water(h, 'filter.backwash-in.iso', 1);
    h = water(h, 'filter.backwash-out.iso', 1);
    h = runHall9(mode(h, 'auto'), 300);
    h = mode(h, 'off');
    h = water(h, 'filter.backwash-in.iso', 0);
    h = water(h, 'filter.backwash-out.iso', 0);
    h = water(h, 'filter.inlet.iso', 1);
    h = water(h, 'filter.rinse.iso', 1);
    h = runHall9(mode(h, 'auto'), 60);
    h = mode(h, 'off');
    h = water(h, 'filter.rinse.iso', 0);
    h = water(h, 'filter.outlet.iso', 1);
    return mode(h, 'auto');
  },
  3: (h) => p(h, { type: 'starter-reset' }),
  4: (h) => p(h, { type: 'free-valve' }),
  5: (h) =>
    p(p(h, { type: 'mv-override', on: true }), { type: 'replace-actuator' }),
  6: (h) => {
    h = p(h, {
      type: 'heat',
      action: { type: 'valve', id: 'gas.ecv', open: true },
    });
    return p(h, { type: 'heat', action: { type: 'boiler', key: 'reset' } });
  },
  7: (h) => {
    h = p(h, {
      type: 'chem',
      action: { type: 'valve', id: 'hypoTank.fill', open: true },
    });
    h = runHall9(h, 400);
    h = p(h, {
      type: 'chem',
      action: { type: 'valve', id: 'hypoTank.fill', open: false },
    });
    return p(h, {
      type: 'chem',
      action: { type: 'pump-ack', channel: 'hypochlorite' },
    });
  },
  8: (h) => {
    h = p(h, {
      type: 'chem',
      action: { type: 'valve', id: 'hypoPump.bleed', open: true },
    });
    h = runHall9(h, 60);
    h = p(h, {
      type: 'chem',
      action: { type: 'valve', id: 'hypoPump.bleed', open: false },
    });
    return p(h, {
      type: 'chem',
      action: { type: 'pump-ack', channel: 'hypochlorite' },
    });
  },
  9: (h) => {
    h = p(h, { type: 'clear-needle' });
    return p(h, {
      type: 'chem',
      action: { type: 'controller-act', action: { kind: 'ack' } },
    });
  },
  10: (h) => {
    h = p(h, { type: 'chem', action: { type: 'test' } });
    const dpd = h.plant.chem.test!.dpd1;
    const c = (action: never) =>
      p(h, { type: 'chem', action: { type: 'controller-act', action } });
    h = c({ kind: 'cal-begin', probe: 'free' } as never);
    h = c({ kind: 'cal-skip' } as never);
    h = c({ kind: 'cal-span', value: dpd } as never);
    return c({ kind: 'cal-end' } as never);
  },
};

/** Accept and reset the annunciator, a little plant time apart, until every window is dark. */
export function settle(h: Hall9, seconds = 1200): Hall9 {
  for (let k = 0; k < 6; k++) {
    h = actOnHall9(h, { type: 'accept' });
    h = runHall9(h, seconds / 6);
    h = actOnHall9(h, { type: 'reset-alarms' });
  }
  return runHall9(h, 2);
}
