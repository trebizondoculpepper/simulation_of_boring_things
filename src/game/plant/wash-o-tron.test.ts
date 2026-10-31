import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { installedValveByCommandId } from './installed-valves';
import { filterValves } from './wash-o-tron-world';
import { act, allDue } from './wash-o-tron.test-support';

describe('the Lidoluxe Wash-O-Tron', () => {
  it('sets a filter’s state from its button: its old path shut first, then its new opened and proved', () => {
    let w = act(newWorld(), { act: 'mode', filter: 1, mode: 'backwash' });
    w = advance(w, 5, 1);
    // Shutting: everything shut, nothing yet open.
    expect(Object.values(filterValves(w.installedValves, 1))).toEqual(
      Array(6).fill(false),
    );
    w = advance(w, 30, 1);
    expect(filterValves(w.installedValves, 1)).toMatchObject({
      V1: false,
      V2: false,
      V3: true,
      V4: true,
      V5: false,
    });
    expect(w.washOTron.filters[1]).toMatchObject({
      mode: 'backwash',
      phase: 'steady',
    });
  });

  it('waits for room in the pit before starting a wash', () => {
    // Its programme is in AUTO from the start.
    let w = allDue(newWorld());
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 80 } };
    w = advance(w, 5, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.waiting).toBe('PIT CAPACITY');
  });

  it('will not wash while too few filters are left in service', () => {
    let w = act(newWorld(), { act: 'mode', filter: 0, mode: 'isolate' });
    w = advance(w, 30, 1);
    w = allDue(w);
    w = advance(w, 5, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.waiting).toBe('FILTER UNAVAILABLE');
  });

  it('holds its programme with a valve fault when a valve is worked by hand mid-wash', () => {
    // Its programme is in AUTO from the start.
    let w = allDue(newWorld());
    w = advance(w, 60, 1);
    const n = w.washOTron.washing!;
    expect(n).not.toBe(null);
    w = applyAction(w, {
      type: 'plant/valve',
      id: installedValveByCommandId(`PL2-F${n + 1}-V3`)!.assetId,
      open: false,
    });
    w = advance(w, 2, 1);
    expect(w.washOTron.hold).toBe(true);
    expect(w.washOTron.alarms.valveFault.on).toBe(true);
  });

  it('keeps a locked-out filter isolated, out of the programme', () => {
    let w = act(newWorld(), { act: 'lockout', filter: 2 });
    w = advance(w, 30, 1);
    w = act(w, { act: 'mode', filter: 2, mode: 'filter' });
    w = advance(w, 30, 1);
    expect(w.washOTron.filters[2]).toMatchObject({
      lockout: true,
      mode: 'isolate',
    });
  });

  it('changes a setpoint only while PROGRAMME has unlocked it, and stores it on ENTER', () => {
    let w = newWorld();
    for (let k = 0; k < 3; k++) w = act(w, { act: 'view' });
    expect(w.washOTron.view).toBe(3);
    w = act(w, { act: 'adjust', by: 1 });
    expect(w.washOTron.editing).toBe(null);
    w = act(w, { act: 'unlock' });
    w = act(w, { act: 'adjust', by: 1 });
    w = act(w, { act: 'enter' });
    expect(w.washOTron.setpoints.backwash).toBe(310);
  });

  it('starts with its programme in AUTO', () => {
    expect(newWorld().washOTron.running).toBe(true);
  });

  it('washes a filter in AUTO forced to BACKWASH by hand without taking it out of AUTO', () => {
    let w = act(newWorld(), { act: 'mode', filter: 2, mode: 'backwash' });
    expect(w.washOTron.filters[2].auto).toBe(true);
    expect(w.washOTron.washNow).toBe(2);
    w = advance(w, 60, 1);
    expect(w.washOTron.washing).toBe(2);
    expect(w.washOTron.step).toBe('backwash');
    // Through SETTLE and RINSE on its own timers, back to FILTER, still in AUTO.
    w = advance(w, 900, 1);
    expect(w.washOTron.washing).toBe(null);
    expect(w.washOTron.filters[2].mode).toBe('filter');
    expect(w.washOTron.filters[2].auto).toBe(true);
  });

  it('still takes a filter out of AUTO when another state is chosen by hand', () => {
    const w = act(newWorld(), { act: 'mode', filter: 1, mode: 'isolate' });
    expect(w.washOTron.filters[1].auto).toBe(false);
  });
});
