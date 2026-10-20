import { computed, signal } from '@preact/signals-core';
import type { Readable } from '../../core/logic/world/components';

export const SCREEN_BOOT_SECONDS = 15;

/** Original BSD-style diagnostics, kept short enough for small text displays. */
const DIAGNOSTICS = [
  'EncabOS/ND 4.2',
  'Neuman Dynamik',
  'Booting kernel',
  'mem0: 16384K OK',
  'cpu0: ND/486',
  'isa0 at mainbus0',
  'vx0: modial bus',
  'io0: 24V field',
  'dingle0: found',
  'spurv0: found',
  'gram0: nominal',
  'Mounting root...',
  'fsck: clean',
  'Starting init',
  'Checking phase',
  'Loading vectors',
  'Modial sync: OK',
  'Starting encabd',
  'Network: local',
  'Services ready',
];

const CONTROLLER_DIAGNOSTICS = [
  'PLC-5/40 SELF TEST',
  'MEMORY OK',
  'I/O CONFIG OK',
  'PROCESSOR READY',
];

/**
 * Each screen's own pace. Its whole boot takes `seconds`, 0.8 to 1.25
 * times `SCREEN_BOOT_SECONDS`, from `slot`: screens take slots in turn
 * and each slot steps on by the golden ratio, so however many screens
 * there are, no two finish close together. The gap before each message
 * is uneven, from its name, some lines coming quickly and some hanging,
 * as a real boot's do: the same screen always boots the same way. `at[i]`
 * is when line `i` appears.
 */
export function bootPace(device: string, slot: number) {
  let h = 2166136261;
  for (let i = 0; i < device.length; i++)
    h = Math.imul(h ^ device.charCodeAt(i), 16777619) >>> 0;
  const random = () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const spread = (slot * 0.6180339887) % 1;
  const seconds = SCREEN_BOOT_SECONDS * (0.8 + spread * 0.45);
  // One gap before each message, and one after the last before it is
  // ready.
  const gaps = Array.from(
    { length: DIAGNOSTICS.length + 1 },
    () => 0.4 + random() * 1.4,
  );
  const total = gaps.reduce((a, b) => a + b, 0);
  const at: number[] = [];
  let t = 0;
  for (let i = 0; i < DIAGNOSTICS.length; i++) {
    t += (gaps[i] / total) * seconds;
    at.push(t);
  }
  return { seconds, at };
}

/** A controller's boot pace: its four self-test lines over 3.5 seconds. */
export const CONTROLLER_BOOT = {
  seconds: 3.5,
  at: [0.35, 1.15, 2.1, 3.15],
} as const;

/** What a controller's screen shows `elapsed` seconds into its boot. */
export function controllerBootLines(device: string, elapsed: number) {
  const count = CONTROLLER_BOOT.at.filter((at) => at <= elapsed).length;
  return [device, ...CONTROLLER_DIAGNOSTICS.slice(0, count)];
}

/** Screens made so far: each new one takes the next slot. */
let made = 0;

/** Each screen owns its clock, so its local supply can restart it independently. */
export function createScreenBoot(
  supply: Readable<boolean>,
  device: string,
  kind: 'computer' | 'controller' = 'computer',
) {
  const pace =
    kind === 'controller'
      ? { seconds: CONTROLLER_BOOT.seconds, at: [...CONTROLLER_BOOT.at] }
      : bootPace(device, made++);
  const diagnostics =
    kind === 'controller' ? CONTROLLER_DIAGNOSTICS : DIAGNOSTICS;
  const elapsed = signal(0);
  const ready = computed(() => supply.value && elapsed.value >= pace.seconds);
  return {
    ready,
    /** How long this screen takes to boot, seconds. */
    seconds: pace.seconds,
    /** Start its boot again from the beginning, as a reset does. */
    restart() {
      elapsed.value = 0;
    },
    step(delta: number) {
      elapsed.value = supply.value
        ? Math.min(pace.seconds, elapsed.value + delta)
        : 0;
    },
    get booting() {
      return supply.value && elapsed.value < pace.seconds;
    },
    lines(rows = 12, columns = 48): string[] {
      const count = pace.at.filter((at) => at <= elapsed.value).length;
      return [
        kind === 'controller' ? device : `ND boot: ${device}`,
        ...diagnostics.slice(0, count),
      ]
        .slice(-rows)
        .map((line) => line.slice(0, columns));
    },
  };
}
