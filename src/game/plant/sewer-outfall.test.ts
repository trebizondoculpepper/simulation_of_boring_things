import { describe, expect, it } from 'vite-plus/test';
import { advance, applyAction, newWorld } from '../world';
import { SEWER_LOG, overConsent } from './sewer-monitor';
import { WET_HALL_PLANT as P } from './wet-hall';
import { installedValveByCommandId } from './installed-valves';

/**
 * The sewer outfall's flowmeter and recorder in the world (the owner,
 * 2026-10-26): what the plant puts down the sewer, read and recorded
 * where it leaves.
 */
describe('the sewer outfall, in the world', () => {
  it('reads nothing at rest', () => {
    const w = advance(newWorld(), 600, 1);
    expect(w.sewer.flow).toBe(0);
    expect(w.sewer.log.length).toBe(2);
    expect(w.sewer.log.every((f) => f === 0)).toBe(true);
  });

  it('reads and records the pit’s pump at the consented rate, and totals what it sends', () => {
    let w = newWorld();
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 50 } };
    w = advance(w, 3600, 1);
    expect(w.sewer.flow).toBeCloseTo(P.dischargeRate, 6);
    expect(w.sewer.total).toBeCloseTo(P.dischargeRate, 1);
    expect(w.sewer.log.length).toBe(3600 / SEWER_LOG.step);
    expect(w.sewer.log.at(-1)).toBeCloseTo(P.dischargeRate, 6);
    expect(overConsent(w.sewer, P.sewerConsent)).toBe(false);
  });

  it('takes a spa’s drain-down into the pit, the sewer seeing only the pit’s pump', () => {
    let w = applyAction(
      applyAction(advance(newWorld(), 10, 1), {
        type: 'pool/make-up',
        pool: 'pool_04',
        open: false,
      }),
      { type: 'pool/drain-down', pool: 'pool_04', open: true },
    );
    w = advance(w, 1800, 5);
    expect(w.wetHall.backwashTank).toBeGreaterThan(0.5);
    expect(w.sewer.flow).toBeLessThanOrEqual(P.dischargeRate + 1e-6);
  });

  it('shows the pit’s discharge valve putting more down the sewer than the consent', () => {
    let w = newWorld();
    w = { ...w, wetHall: { ...w.wetHall, backwashTank: 50 } };
    w = applyAction(w, {
      type: 'plant/valve',
      id: installedValveByCommandId('WH-DR1-DV1')!.assetId,
      open: true,
    });
    w = advance(w, 60, 1);
    expect(overConsent(w.sewer, P.sewerConsent)).toBe(true);
  });
});
