import { batch, computed, effect, signal } from '@preact/signals-core';
import type { Readable } from '../../core/logic/world/components';
import { createSwitch } from '../../core/logic/world/components';

export type ScreenLine = readonly [text: string, ink: string];
export const BBC_LOAD_SECONDS = 4.5;

export interface BbcDiagnosticLink {
  online: Readable<boolean>;
  lines: Readable<readonly ScreenLine[]>;
  /** The observed machine green tier, independent of the text presentation. */
  steady?: Readable<boolean>;
  /** Whether the machine has mains: off, its steady state is forgotten. */
  powered?: Readable<boolean>;
  /**
   * Each unit's state, by name: green (on and well), failed (a failure or
   * critical fault standing), or anything else (off, starting, a warning).
   */
  units?: Readable<Readonly<Record<string, UnitHealth>>>;
}

export type UnitHealth = 'green' | 'failed' | 'other';

/** The least time between two BEWARE cues, seconds. */
export const BEWARE_INTERVAL_SECONDS = 30;
export const BBC_HANDSHAKE_SECONDS = 0.35;
export const BBC_READ_SECONDS = 1.5;

/** Read-only serial terminal; no machine actions cross this interface. */
export function createBbcComputer(link?: BbcDiagnosticLink) {
  const power = createSwitch({ initial: false });
  const elapsed = signal(0);
  const fanfare = signal(0);
  let wasSteady = link?.steady?.value ?? false;
  let fanfareArmed = !wasSteady;
  let unsteadySeconds = 0;
  const stopSteady = effect(() => {
    const green = link?.steady?.value ?? false;
    const on = power.state.value;
    if (green && !wasSteady && fanfareArmed) {
      fanfareArmed = false;
      if (on) fanfare.value = fanfare.peek() + 1;
    }
    if (green) unsteadySeconds = 0;
    wasSteady = green;
  });
  // BEWARE: once the machine has reached its steady state (remembered
  // until its mains goes off, since the first failure ends it), a unit
  // going from green to failed sounds it, while the computer is on. It is
  // the change that sounds it, not a failure standing, and not more often
  // than once every 30 s, so a cascade of failures sounds it once.
  const beware = signal(0);
  let clock = 0;
  let reachedSteady = link?.steady?.value ?? false;
  let lastBeware = -Infinity;
  let wasUnits = link?.units?.value ?? {};
  const stopBeware = effect(() => {
    const units = link?.units?.value ?? {};
    if (link?.steady?.value) reachedSteady = true;
    if (link?.powered && !link.powered.value) reachedSteady = false;
    const failed = Object.entries(units).some(
      ([name, health]) => health === 'failed' && wasUnits[name] === 'green',
    );
    wasUnits = units;
    if (
      failed &&
      reachedSteady &&
      power.state.value &&
      clock - lastBeware >= BEWARE_INTERVAL_SECONDS
    ) {
      lastBeware = clock;
      beware.value = beware.peek() + 1;
    }
  });
  const sessionElapsed = signal(0);
  const session = computed(() =>
    !link ||
    !power.state.value ||
    !link.online.value ||
    elapsed.value < BBC_LOAD_SECONDS
      ? 'disconnected'
      : sessionElapsed.value < BBC_HANDSHAKE_SECONDS - 1e-9
        ? 'handshake'
        : sessionElapsed.value < BBC_HANDSHAKE_SECONDS + BBC_READ_SECONDS - 1e-9
          ? 'reading'
          : 'connected',
  );
  const diagnosticsAvailable = computed(() => session.value === 'connected');
  const reading = computed(
    () =>
      power.state.value &&
      (link
        ? session.value === 'reading'
        : elapsed.value >= 2 && elapsed.value < BBC_LOAD_SECONDS),
  );
  const invalidate = effect(() => {
    if (!power.state.value || !(link?.online.value ?? false))
      sessionElapsed.value = 0;
  });
  const stop = power.onEvent(() => {
    elapsed.value = 0;
  });
  const phase = computed(() =>
    !power.state.value
      ? 'off'
      : elapsed.value < 2
        ? 'boot'
        : elapsed.value < BBC_LOAD_SECONDS
          ? 'loading'
          : 'ready',
  );
  const lines = computed<readonly ScreenLine[]>(() => {
    if (phase.value === 'off' || elapsed.value < 0.25) return [];
    const boot: ScreenLine[] = [
      ['BBC Computer 32K', '#f2f2ee'],
      ['Acorn DFS', '#f2f2ee'],
      ['', '#f2f2ee'],
      ['BASIC', '#f2f2ee'],
    ];
    if (phase.value === 'boot') return boot;
    if (phase.value === 'loading')
      return [
        ...boot,
        ['>CHAIN "DIAG"', '#f2f2ee'],
        ['Loading diagnostics...', '#f2f2ee'],
      ];
    if (link)
      return [
        ['NEUMANN DYNAMIK', '#5fe0e8'],
        ['NEUMANN LINK (TM) / DIAG 1.0', '#f2f2ee'],
        ['', '#f2f2ee'],
        ...(diagnosticsAvailable.value
          ? link.lines.value
          : [
              [
                session.value === 'disconnected'
                  ? 'NOT CONNECTED'
                  : session.value === 'handshake'
                    ? 'SERIAL HANDSHAKE...'
                    : 'READING DIAGNOSTICS...',
                '#f4e04a',
              ] as ScreenLine,
              ['ANNUNCIATOR ENDPOINT', '#f2f2ee'] as ScreenLine,
              ['Check ANNUNCIATOR ISOLATOR / boards.', '#ffffff'] as ScreenLine,
            ]),
      ];
    return [
      ['NEUMANN DYNAMIK', '#5fe0e8'],
      ['BBC MICRO DIAGNOSTICS', '#f2f2ee'],
      ['', '#f2f2ee'],
      ['RETRO COMPUTING EXHIBIT', '#f4e04a'],
      ['', '#f2f2ee'],
      ['RAM              32K', '#6ef06e'],
      ['FLOPPY DRIVE     READY', '#6ef06e'],
      ['DIAGNOSTIC LINK  NOT CONNECTED', '#f4e04a'],
      ['', '#f2f2ee'],
      ['Standalone demonstration', '#f2f2ee'],
    ];
  });
  return {
    power,
    elapsed,
    phase,
    lines,
    session,
    diagnosticsAvailable,
    reading,
    fanfare,
    /** Counts each BEWARE: a unit failing after the steady state. */
    beware,
    snapshot: () => ({
      powered: power.state.value,
      elapsed: elapsed.value,
      sessionElapsed: sessionElapsed.value,
      fanfareArmed,
      unsteadySeconds,
      reachedSteady,
      sinceBeware: clock - lastBeware,
    }),
    /** A geometry swap must not reboot the computer or replay its disk activity. */
    restore(snapshot: {
      powered: boolean;
      elapsed: number;
      sessionElapsed: number;
      fanfareArmed?: boolean;
      unsteadySeconds?: number;
      reachedSteady?: boolean;
      sinceBeware?: number;
    }) {
      fanfareArmed = snapshot.fanfareArmed ?? !wasSteady;
      unsteadySeconds = snapshot.unsteadySeconds ?? 0;
      reachedSteady = snapshot.reachedSteady ?? reachedSteady;
      lastBeware = clock - (snapshot.sinceBeware ?? Infinity);
      batch(() => {
        power.set(snapshot.powered);
        elapsed.value = snapshot.elapsed;
        sessionElapsed.value = snapshot.sessionElapsed;
      });
    },
    step(delta: number) {
      const dt = Math.max(0, delta);
      clock += dt;
      if (link?.steady?.value) unsteadySeconds = 0;
      else {
        unsteadySeconds = Math.min(1, unsteadySeconds + dt);
        if (unsteadySeconds >= 1) fanfareArmed = true;
      }
      if (!power.state.value) return;
      const remainingBoot = Math.max(0, BBC_LOAD_SECONDS - elapsed.value);
      elapsed.value = Math.min(BBC_LOAD_SECONDS, elapsed.value + dt);
      if (link?.online.value && elapsed.value >= BBC_LOAD_SECONDS)
        sessionElapsed.value = Math.min(
          BBC_HANDSHAKE_SECONDS + BBC_READ_SECONDS,
          sessionElapsed.value + Math.max(0, dt - remainingBoot),
        );
    },
    dispose() {
      stopSteady();
      stopBeware();
      invalidate();
      stop();
      power.dispose();
    },
  };
}
