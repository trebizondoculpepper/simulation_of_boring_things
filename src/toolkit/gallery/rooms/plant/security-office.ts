import type { LiveExhibit, PlantExhibit } from './exhibit';
import { createCctvMonitor } from '../../../components/security/views/cctv';
import { POOL_CAMERA } from '../../../components/security/logic/cctv-signal';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The security office: the CCTV monitor watching dev16’s pool';

/**
 * Dev18, the security office, opening off dev16: a desk and the CCTV
 * monitor showing dev16's camera, at the 1/16 resolution it is sent
 * (`logic/cctv-signal.ts`). Switched on, the monitor watches the camera,
 * and asks for dev16 to be running, unseen, if it is not, so that its
 * camera has a pool to see.
 */
export const EXHIBITS: readonly PlantExhibit[] = [
  {
    title: 'CCTV monitor',
    reference:
      'After a JVC TM-A140 14-inch colour CCTV monitor (340 × 330 × 370 mm) on an office desk; CAM 1, dev16’s pool, at 1/16 resolution',
    size: { w: 1.45, d: 0.8, h: 1.1, mount: 'floor' },
    build(kit): LiveExhibit {
      const monitor = createCctvMonitor(kit, {
        camera: POOL_CAMERA,
        title: 'CAM 1  ·  DEV16 POOL',
      });
      // A development handle for the console: the monitor's POWER.
      (window as unknown as { securityOffice: unknown }).securityOffice = {
        power: monitor.power,
        group: monitor.group,
      };
      window.dispatchEvent(
        new CustomEvent('pool-plant:run-room', { detail: 'dev16' }),
      );
      return {
        object: monitor.group,
        parts: monitor.parts,
        update: () => monitor.show(performance.now() / 1000),
        dispose: monitor.dispose,
      };
    },
  },
];
