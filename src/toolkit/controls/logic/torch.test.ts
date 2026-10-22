import { describe, expect, it } from 'vite-plus/test';
import { TORCH, angleBetween, followAim, torch } from './torch';

const frame = 1 / 60;

describe('the torch’s beam', () => {
  it('lags the eye a little: after one frame of a quick turn it is still mostly behind', () => {
    const after = followAim(
      { yaw: 0, pitch: 0 },
      { yaw: 1, pitch: 0.5 },
      frame,
    );
    expect(after.yaw).toBeGreaterThan(0);
    expect(after.yaw).toBeLessThan(0.3);
    expect(after.pitch).toBeLessThan(0.15);
  });

  it('catches up within a few tenths of a second, without overshooting', () => {
    let aim = { yaw: 0, pitch: 0 };
    let most = 0;
    for (let t = 0; t < 0.4; t += frame) {
      aim = followAim(aim, { yaw: 1, pitch: 0 }, frame);
      most = Math.max(most, aim.yaw);
    }
    expect(aim.yaw).toBeGreaterThan(0.99);
    expect(most).toBeLessThanOrEqual(1);
  });

  it('is noticeably late, but only just: within a tenth of a second it has closed half the gap', () => {
    let aim = { yaw: 0, pitch: 0 };
    let t = 0;
    while (aim.yaw < 0.5) {
      aim = followAim(aim, { yaw: 1, pitch: 0 }, frame);
      t += frame;
    }
    expect(t).toBeGreaterThan(0.02);
    expect(t).toBeLessThan(0.1);
    expect(TORCH.lag).toBeGreaterThan(0);
  });

  it('turns the short way round, across the back', () => {
    expect(angleBetween(3, -3)).toBeCloseTo(2 * Math.PI - 6, 9);
    const after = followAim({ yaw: 3, pitch: 0 }, { yaw: -3, pitch: 0 }, 1);
    expect(Math.abs(angleBetween(after.yaw, -3))).toBeLessThan(1e-3);
  });

  it('is switched on and off by its one control, for every room', () => {
    const was = torch.on;
    expect(torch.toggle()).toBe(!was);
    expect(torch.toggle()).toBe(was);
  });
});
