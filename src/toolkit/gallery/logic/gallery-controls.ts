import type { MachineComponentKind } from '../../components/industrial-control/logic/machine-components';

/** Dev0 test apparatus only. A control is shown only when its effect can be observed. */
export const GALLERY_CONTROLS: Record<
  MachineComponentKind,
  {
    supply: boolean;
    input: 'LOAD' | 'VOLTS' | 'SPEED' | 'SIGNAL' | null;
    test: boolean;
  }
> = {
  breaker: { supply: false, input: null, test: true },
  contactor: { supply: true, input: null, test: true },
  overload: { supply: true, input: 'LOAD', test: true },
  fuse: { supply: true, input: 'LOAD', test: true },
  capacitors: { supply: true, input: 'VOLTS', test: true },
  relay: { supply: true, input: null, test: true },
  terminal: { supply: false, input: null, test: false },
  'plc-power': { supply: true, input: null, test: true },
  'plc-cpu': { supply: true, input: null, test: true },
  'plc-input': { supply: true, input: 'SIGNAL', test: true },
  'plc-output': { supply: true, input: 'SIGNAL', test: true },
  'plc-analog': { supply: true, input: null, test: true },
  'plc-comms': { supply: true, input: null, test: true },
  'drive-power': { supply: true, input: null, test: true },
  'rack-unit': { supply: false, input: null, test: true },
  'motor-unit': { supply: false, input: null, test: true },
  motor: { supply: true, input: 'SPEED', test: true },
  backplane: { supply: true, input: 'SIGNAL', test: true },
  capacitor: { supply: true, input: 'VOLTS', test: true },
};
