import { createDropProfile } from '../../../controls/logic/drop-profile';
import type { DropProfile } from '../../../controls/logic/drop-profile';
import type { MachineComponentKind } from './machine-components';

/** Every catalogue component brings its own drop settings into any room. */
export const MACHINE_DROP_PROFILES: Readonly<
  Record<MachineComponentKind, DropProfile>
> = {
  capacitor: createDropProfile('round', 0.045, 'metal', 0.0175, 'y'),
  backplane: createDropProfile('flat', 0.48, 'board', 0.015),
  breaker: createDropProfile('box', 0.161, 'plastic', 0.055),
  contactor: createDropProfile('box', 0.085, 'plastic', 0.025),
  overload: createDropProfile('box', 0.066, 'plastic', 0.024),
  // The removable cartridge has its own cylindrical profile; the holder is box-shaped.
  fuse: createDropProfile('box', 0.06, 'plastic', 0.015),
  capacitors: createDropProfile('flat', 0.24, 'board', 0.035),
  relay: createDropProfile('box', 0.029, 'plastic', 0.012),
  terminal: createDropProfile('box', 0.0425, 'plastic', 0.012),
  'plc-power': createDropProfile('flat', 0.18, 'board', 0.015),
  'plc-cpu': createDropProfile('flat', 0.18, 'board', 0.02),
  'plc-input': createDropProfile('flat', 0.18, 'board', 0.015),
  'plc-output': createDropProfile('flat', 0.18, 'board', 0.015),
  'plc-analog': createDropProfile('flat', 0.18, 'board', 0.015),
  'plc-comms': createDropProfile('flat', 0.18, 'board', 0.015),
  'drive-power': createDropProfile('flat', 0.45, 'board', 0.025),
  'rack-unit': createDropProfile('flat', 0.483, 'metal', 0.045),
  'motor-unit': createDropProfile('box', 0.5, 'metal', 0.16),
  motor: createDropProfile('box', 0.32, 'metal', 0.12),
};
export const FUSE_CARTRIDGE_DROP = createDropProfile(
  'round',
  0.0381,
  'ceramic',
  0.00515,
);
