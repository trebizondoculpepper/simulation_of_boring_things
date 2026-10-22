import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { plantTools } from '../../components/plant/views/plant-tools';
import { createSafetySign } from '../../components/general-safety/views/safety-signs';
import {
  createElectricShockPoster,
  createFirstAidNotice,
  createGasEmergencyNotice,
  createInsuranceCertificate,
  createLawPoster,
  createNeverMixNotice,
  createSpillageNotice,
} from '../../components/general-safety/views/safety-notices';
import { SIGN_ITEMS } from '../logic/building-signs';
import type { SignItemId } from '../logic/building-signs';

/**
 * A room's notice or sign (`logic/building-signs.ts`), as hung: its back
 * on the wall's face at the origin, its front +z. Noticeboards are cork
 * on a timber frame, their notices pinned to them.
 */
export function createBuildingSign(kit: PanelKit, id: SignItemId): Object3D {
  const t = plantTools(kit);
  const on = (item: Object3D, x = 0, y = 0, z = 0.004) => {
    item.position.set(x, y, z);
    return item;
  };
  const group = new Group();
  group.name = id;
  switch (id) {
    case 'staff-noticeboard': {
      // Cork in a timber frame, its size the room's (`building-signs.ts`);
      // the law poster, the certificate (the staff's board) or the fire
      // action notice, the first-aid notice, spread across it.
      const { w, h } = SIGN_ITEMS[id];
      t.box(group, t.paint('#6e4b2c', 0.7), w, h, 0.025, 0, 0, 0.0125);
      t.box(
        group,
        t.paint('#a9835a', 0.95),
        w - 0.06,
        h - 0.06,
        0.004,
        0,
        0,
        0.026,
      );
      const scale = Math.min(1, (h - 0.1) / 0.42);
      const law = createLawPoster(kit);
      law.scale.setScalar(scale);
      group.add(on(law, -w / 2 + 0.05 + (0.297 * scale) / 2, 0, 0.03));
      const middle = createInsuranceCertificate(kit);
      middle.scale.setScalar(scale);
      group.add(on(middle, 0.02, 0.05 * scale, 0.03));
      const aid = createFirstAidNotice(kit);
      aid.scale.setScalar(scale);
      group.add(on(aid, w / 2 - 0.05 - (0.21 * scale) / 2, 0, 0.03));
      break;
    }
    case 'shock-poster':
      group.add(on(createElectricShockPoster(kit)));
      break;
    case 'gas-emergency':
      group.add(on(createGasEmergencyNotice(kit)));
      break;
    case 'spillage':
      group.add(on(createSpillageNotice(kit)));
      break;
    case 'never-mix':
      group.add(on(createNeverMixNotice(kit)));
      break;
    case 'no-flames':
      group.add(
        on(createSafetySign(kit, ['no-flames'], ['NO NAKED', 'FLAMES'])),
      );
      break;
    case 'no-smoking':
      group.add(
        on(
          createSafetySign(
            kit,
            ['no-smoking'],
            ['NO SMOKING', 'It is against the law', 'to smoke here'],
          ),
        ),
      );
      break;
    case 'fire-exit-clear':
      group.add(
        on(createSafetySign(kit, ['mandatory'], ['FIRE EXIT', 'KEEP CLEAR'])),
      );
      break;
  }
  return group;
}
