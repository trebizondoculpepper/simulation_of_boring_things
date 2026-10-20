import { computed, signal } from '@preact/signals-core';
import type { Readable } from '../../core/logic/world/components';
import { createSwitch } from '../../core/logic/world/components';
import { createGraph } from '../../core/logic/world/graph';

/** Fictional in-world designation; catalogue references describe the physical models. */
export const BETAFORM_BOARD = {
  maker: 'PEPPERDYNE',
  type: 'BETAFORM AMPLIFIER',
  family: 'MODIAL INTERACTION',
} as const;

/** The shared inventory of machine devices, instantiated in dev0 and dev6. */
export const MACHINE_COMPONENTS = [
  ['breaker', 'MOULDED-CASE BREAKER'],
  ['contactor', 'THREE-POLE CONTACTOR'],
  ['overload', 'THERMAL OVERLOAD'],
  ['fuse', 'CONTROL FUSE'],
  ['capacitors', 'DC BUS CAPACITORS'],
  ['relay', 'CONTROL RELAY'],
  ['terminal', 'SCREW TERMINAL'],
  ['plc-power', 'PLC POWER SUPPLY'],
  ['plc-cpu', 'PLC PROCESSOR'],
  ['plc-input', 'DIGITAL INPUT'],
  ['plc-output', 'DIGITAL OUTPUT'],
  ['plc-analog', 'ANALOGUE INPUT'],
  ['plc-comms', 'COMMUNICATIONS'],
  ['drive-power', 'DRIVE POWER STAGE'],
  ['rack-unit', 'RACK CHASSIS / SLIDES'],
  ['motor-unit', 'MOTOR CONTROL UNIT'],
  ['motor', 'INDUCTION MOTOR'],
  ['backplane', 'PCB BACKPLANE REV C'],
  ['capacitor', 'ELECTROLYTIC CAPACITOR'],
] as const;
export type MachineComponentKind = (typeof MACHINE_COMPONENTS)[number][0];
export type ServiceKind = Extract<
  MachineComponentKind,
  `plc-${string}` | 'terminal' | 'drive-power' | 'backplane'
>;

/** Five physical expansion cards, left to right; story identity is independent of removal order. */
export const EXPANSION_CARD_KINDS = [
  'plc-power',
  'plc-cpu',
  'plc-input',
  'plc-output',
  'plc-analog',
] as const;
export const CARD_DESIGNATIONS = {
  'plc-power': { name: 'Betaform Amplifier', face: 'BETAFORM\nAMPLIFIER' },
  'plc-cpu': {
    name: 'Modial Interaction Controller',
    face: 'MODIAL INTERACTION\nCONTROLLER',
  },
  'plc-input': {
    name: 'Plynost Modulation Rectifier',
    face: 'PLYNOST MODULATION\nRECTIFIER',
  },
  'plc-output': {
    name: 'Hydrocoptic Phase Regulator',
    face: 'HYDROCOPTIC PHASE\nREGULATOR',
  },
  'plc-analog': {
    name: 'Baltovsky Flux Compensator',
    face: 'BALTOVSKY FLUX\nCOMPENSATOR',
  },
  'plc-comms': { name: 'Fankel Bus Interface', face: 'FANKEL BUS\nINTERFACE' },
} as const;
export function cardDesignation(kind: MachineComponentKind) {
  return kind.startsWith('plc-')
    ? CARD_DESIGNATIONS[kind as keyof typeof CARD_DESIGNATIONS]
    : null;
}

/** A real breaker position: tripping requires OFF before it can close again. */
export function createCircuitBreaker(g = createGraph(), prefix = 'breaker') {
  const position = g.input<'off' | 'on' | 'tripped'>(
    `${prefix}.position`,
    'on',
  );
  const closed = g.output(`${prefix}.closed`, [position], (p) => p === 'on', {
    where: 'breaker contacts',
  });
  const trip = g.action(`${prefix}.trip`, [position], [position], () => {
    if (position.peek() === 'on') position.set('tripped');
  });
  const operate = g.action(`${prefix}.operate`, [position], [position], () =>
    position.set(position.peek() === 'off' ? 'on' : 'off'),
  );
  return { g, position, closed, trip, operate };
}

/**
 * Serviceable electronics and terminal connections. Insertion/connection,
 * supply, enable and fault are independent: an unplugged or failed unit
 * cannot pass a signal or keep a processor/link running.
 */
export function createServiceComponent(
  kind: ServiceKind,
  options: {
    power?: Readable<boolean>;
    enabled?: Readable<boolean>;
    input?: Readable<number>;
  } = {},
) {
  const connected = createSwitch({ initial: true });
  const failed = signal(false);
  const input = signal(0.5);
  const cycles = signal(0);
  const ready = computed(
    () =>
      connected.state.value && !failed.value && (options.power?.value ?? true),
  );
  const running = computed(
    () => ready.value && (options.enabled?.value ?? true),
  );
  const sample = computed(() =>
    Math.max(0, Math.min(1, options.input?.value ?? input.value)),
  );
  const output = computed(() => {
    if (!running.value) return 0;
    switch (kind) {
      case 'backplane':
      case 'plc-power':
        return 5;
      case 'plc-cpu':
        return 1;
      case 'plc-comms':
        return Math.floor(cycles.value);
      case 'plc-input':
      case 'plc-output':
        return Math.round(sample.value * 65535);
      case 'plc-analog':
        return sample.value * 10;
      case 'drive-power':
        return sample.value * 650;
      case 'terminal':
        return sample.value * 24;
    }
  });
  const channels = computed(() =>
    Array.from(
      { length: 16 },
      (_, i) =>
        running.value && (Math.round(sample.value * 65535) & (1 << i)) !== 0,
    ),
  );
  return {
    kind,
    connected,
    failed,
    ready,
    running,
    input,
    output,
    channels,
    cycles,
    fail: () => {
      failed.value = true;
    },
    repair: () => {
      failed.value = false;
    },
    tick: (dt: number) => {
      if (running.value) cycles.value += dt * (kind === 'plc-cpu' ? 100 : 10);
    },
    dispose: connected.dispose,
  };
}
