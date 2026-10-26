import { describe, expect, it } from 'vite-plus/test';
import { renderShutterRattle } from './shutter-rattle';

describe('the shutter’s rattle', () => {
  it('renders a quiet loop that never clips and starts and ends silent', () => {
    const s = renderShutterRattle(16000);
    const peak = s.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeGreaterThan(0.01);
    expect(peak).toBeLessThan(1);
    expect(Math.abs(s[0])).toBeLessThan(1e-6);
    expect(Math.abs(s[s.length - 1])).toBeLessThan(1e-6);
  });
});
