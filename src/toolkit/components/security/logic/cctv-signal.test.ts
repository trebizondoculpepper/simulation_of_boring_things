import { describe, expect, it } from 'vite-plus/test';
import {
  FEED,
  SIGNAL_TIMEOUT,
  adjust,
  createCctvNetwork,
  snow,
} from './cctv-signal';

const frame = (at: number) => ({
  width: FEED.width,
  height: FEED.height,
  data: new Uint8Array(FEED.width * FEED.height * 4).fill(100),
  at,
});

describe('the CCTV network', () => {
  it('carries a camera’s latest picture to a monitor in another room', () => {
    const cctv = createCctvNetwork();
    cctv.transmit('cam1', frame(10));
    cctv.transmit('cam1', frame(10.08));
    expect(cctv.receive('cam1', 10.1)?.at).toBe(10.08);
    expect(cctv.receive('cam2', 10.1)).toBeNull();
  });

  it('loses the signal when the camera stops sending', () => {
    const cctv = createCctvNetwork();
    cctv.transmit('cam1', frame(10));
    expect(cctv.receive('cam1', 10 + SIGNAL_TIMEOUT / 2)).not.toBeNull();
    expect(cctv.receive('cam1', 10 + SIGNAL_TIMEOUT * 2)).toBeNull();
  });

  it('knows while a camera is watched, by however many monitors', () => {
    const cctv = createCctvNetwork();
    expect(cctv.watched('cam1')).toBe(false);
    const a = cctv.watch('cam1');
    const b = cctv.watch('cam1');
    a();
    a();
    expect(cctv.watched('cam1')).toBe(true);
    b();
    expect(cctv.watched('cam1')).toBe(false);
  });

  it('sends its picture at 1/16 of a 1536 × 1152 camera’s', () => {
    expect(FEED.width * 16).toBe(1536);
    expect(FEED.height * 16).toBe(1152);
  });

  it('shows snow with no signal, and the monitor’s knobs change its picture', () => {
    const out = new Uint8Array(16 * 4);
    snow(out, 3);
    expect(new Set(out.filter((_, i) => i % 4 === 0)).size).toBeGreaterThan(4);
    const grey = new Uint8Array(4).fill(100);
    const shown = new Uint8Array(4);
    adjust(grey, shown, 0.5, 0.5);
    expect(shown[0]).toBe(100);
    adjust(grey, shown, 0.9, 0.5);
    expect(shown[0]).toBeGreaterThan(100);
    adjust(grey, shown, 0.5, 0);
    expect(Math.abs(shown[0] - 128)).toBeLessThan(28);
  });
});
