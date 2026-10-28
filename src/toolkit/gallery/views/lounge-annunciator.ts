import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { createAnnunciatorPanel } from '../../components/industrial-control/views/cabinet-fittings';
import { FLASH_HZ } from '../../components/industrial-control/logic/annunciator';
import { signal } from '@preact/signals-core';
import {
  beginPart,
  createPartSet,
  pushButton,
} from '../../components/core/parts/parts';
import { createBrandBadge } from '../../components/core/views/brand-badge';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import { plantTools } from '../../components/plant/views/plant-tools';
import { ALARM_BUZZER } from '../../components/core/audio/part-loops';
import { markComponent } from '../../components/core/views/component-identity';
import type { World, WorldAction } from '../../../game/world';
import {
  LOUNGE_ALARMS,
  LOUNGE_ALARM_TEXT,
  newLoungeAnnunciator,
} from '../../../game/plant/lounge-annunciator';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * The lounge pool's annunciator (the owner, 2026-10-28), one on the wall
 * of its plant room and an identical one in the control room: Penfold's
 * assembly round Warden's sixteen-window annunciator, four by four, with
 * its horn, ACCEPT, RESET, LAMP TEST and MUTE. Its windows are the
 * world's (`game/plant/lounge-annunciator.ts`), so ACCEPT or RESET at one
 * is done at the other. The first-out window flashes twice as fast as the
 * rest. The horn sounds while any window flashes, until ACCEPT, or MUTE,
 * which quiets it until another alarm comes in. Without a world (a
 * gallery), it shows its windows dark. Metres, facing +z, its middle at
 * the origin.
 */
export function createLoungeAnnunciator(
  kit: PanelKit,
  store?: {
    readonly world: { readonly value: World };
    dispatch(action: WorldAction): void;
  },
): LiveExhibit {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#3b3f42', 0.5), 0.86, 0.84, 0.12, 0, 0, 0.06);
  const title = createMicroLabel(kit, 'PL1 · LOUNGE POOL PLANT', {
    height: 0.03,
    ink: '#f2f2ee',
  });
  title.position.set(0, 0.37, 0.121);
  group.add(title);
  const labels = LOUNGE_ALARMS.map((id) => LOUNGE_ALARM_TEXT[id]);
  const panel = createAnnunciatorPanel(kit, labels, { columns: 4, cell: 0.17 });
  panel.group.position.set(0, 0.05, 0.12);
  panel.group.traverse((o) => (o.userData.live = true));
  group.add(panel.group);
  const parts = createPartSet();
  const state = () =>
    store?.world.value.loungeAnnunciator ?? newLoungeAnnunciator();
  let testUntil = 0;
  let now = 0;
  let mutedAt = -1;
  let flashingCount = 0;
  const button = (
    legend: string,
    colour: 'black' | 'white' | 'red',
    x: number,
    action: () => void,
  ) => {
    const part = pushButton(kit, { colour, legend, action });
    part.object.position.set(x, -0.335, 0.12);
    part.object.traverse((o) => (o.userData.live = true));
    group.add(part.object);
    parts.add(part);
  };
  button('ACCEPT', 'black', -0.27, () =>
    store?.dispatch({ type: 'lounge-alarms/accept' }),
  );
  button('RESET', 'black', -0.09, () =>
    store?.dispatch({ type: 'lounge-alarms/reset' }),
  );
  button('LAMP TEST', 'white', 0.09, () => (testUntil = now + 2));
  button('MUTE', 'red', 0.27, () => (mutedAt = flashingCount));
  // The horn on top.
  t.cyl(group, t.paint('#c8261c', 0.45), 0.05, 0.06, 0.3, 0.47, 0.06, 'z', 20);
  t.cyl(group, t.paint('#2a2b2c', 0.5), 0.03, 0.02, 0.3, 0.47, 0.1, 'z', 20);
  const badge = createBrandBadge(kit, 'warden', { height: 0.02 });
  badge.position.set(-0.3, -0.395, 0.1205);
  group.add(badge);
  panelMakerMark(kit, group, {
    width: 0.86,
    height: 0.84,
    z: 0.12,
    corner: 'bottom-right',
  });
  // The horn, a part, so it hushes with its room and stops when let go.
  const hornOn = signal(false);
  const hornPart = beginPart(kit, 'Annunciator horn');
  hornPart.holdWhile(hornOn, ALARM_BUZZER, group);
  parts.add(hornPart.part());
  return {
    object: markComponent(group, {
      name: 'Lounge pool annunciator',
      part: {
        kind: 'visible',
        label: 'Lounge pool annunciator',
        shows: () => {
          const s = state();
          const lit = LOUNGE_ALARMS.filter((id) => s.windows[id] !== 'off');
          return lit.length
            ? lit
                .map(
                  (id) =>
                    `${LOUNGE_ALARM_TEXT[id].replace('\n', ' ')}${s.windows[id] === 'flashing' ? ' (flashing)' : ''}${s.firstOut === id ? ', first out' : ''}`,
                )
                .join('; ')
            : 'all clear';
        },
      },
    }),
    parts,
    update(delta) {
      now += delta;
      const s = state();
      const blink = Math.floor(now * FLASH_HZ * 2) % 2 === 0;
      const fast = Math.floor(now * FLASH_HZ * 4) % 2 === 0;
      const test = now < testUntil;
      panel.set(
        LOUNGE_ALARMS.map(
          (id) =>
            test ||
            s.windows[id] === 'steady' ||
            (s.windows[id] === 'flashing' &&
              (s.firstOut === id ? fast : blink)),
        ),
      );
      // The horn while a window flashes, until MUTE (until another comes in).
      flashingCount = LOUNGE_ALARMS.filter(
        (id) => s.windows[id] === 'flashing',
      ).length;
      if (flashingCount === 0) mutedAt = -1;
      hornOn.value = flashingCount > 0 && flashingCount > mutedAt;
    },
  };
}
