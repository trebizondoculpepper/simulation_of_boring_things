import type { OperatorColour } from '../../components/industrial-control/views/industrial-controls';
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
import { LOCATION_ANNUNCIATORS } from '../../../game/plant/location-annunciators';
import type {
  LocationAnnunciatorSpec,
  LocationId,
} from '../../../game/plant/location-annunciators';
import type { LocationAnnunciatorState } from '../../../game/plant/location-annunciator';
import { newLocationAnnunciator } from '../../../game/plant/location-annunciator';
import type { LiveExhibit } from '../rooms/plant/exhibit';
import {
  ANNUNCIATOR_CELL,
  annunciatorBoardLayout,
} from '../logic/annunciator-board';
import type {
  AnnunciatorButton,
  AnnunciatorControls,
} from '../logic/annunciator-board';

/**
 * A location's annunciator (mission 099): the lounge pool's (the owner,
 * 2026-10-28), the Olympic's and the wet hall's, each one in its own
 * place and an identical one in the old control room: Penfold's assembly
 * round Warden's annunciator, sixteen windows four by four, or six
 * columns on the larger boards, with its horn, ACCEPT, RESET, LAMP TEST
 * and MUTE. Its windows are the world's
 * (`game/plant/location-annunciators.ts`), so ACCEPT or RESET at one is
 * done at the other, and at the bridge. The first-out window flashes twice as fast as the
 * rest. The horn sounds while any window flashes, until ACCEPT, or MUTE,
 * which quiets it until another alarm comes in. Without a world (a
 * gallery), it shows its windows dark. Its controls under its windows,
 * or down its left margin (`controls`, `logic/annunciator-board.ts`).
 * Metres, facing +z, its middle at the origin.
 */
export function createLocationAnnunciator(
  kit: PanelKit,
  location: LocationId,
  store?: {
    readonly world: { readonly value: World };
    dispatch(action: WorldAction): void;
  },
  controls: AnnunciatorControls = 'bottom',
): LiveExhibit {
  const spec = LOCATION_ANNUNCIATORS[location];
  return createAnnunciatorBoard(
    kit,
    spec,
    {
      state: () =>
        store?.world.value.locationAnnunciators[location] ??
        newLocationAnnunciator(spec.alarms),
      accept: () =>
        store?.dispatch({ type: 'location-alarms/accept', location }),
      reset: () => store?.dispatch({ type: 'location-alarms/reset', location }),
    },
    controls,
  );
}

/** What a board's windows read and what its ACCEPT and RESET do: the world's, or a hall's own state (107e). */
export interface AnnunciatorSource {
  state(): LocationAnnunciatorState<string>;
  accept(): void;
  reset(): void;
}

/**
 * The same board on any source of windows: the world's location
 * annunciators, or a museum hall's own (Hall 9's, read from its own
 * instruments). Metres, facing +z, its middle at the origin.
 */
export function createAnnunciatorBoard(
  kit: PanelKit,
  spec: Pick<
    LocationAnnunciatorSpec,
    'title' | 'name' | 'alarms' | 'text' | 'columns'
  >,
  source: AnnunciatorSource,
  controls: AnnunciatorControls = 'bottom',
): LiveExhibit {
  const ALARMS = spec.alarms;
  const text = (id: string) => spec.text[id] || 'SPARE';
  const t = plantTools(kit);
  const group = new Group();
  // Its housing round its windows (0.17 m wide, 0.119 m tall each): the
  // lounge's, four by four, 0.86 × 0.83 m with its controls under them,
  // 0.94 × 0.69 m with them down its left.
  const cell = ANNUNCIATOR_CELL;
  const layout = annunciatorBoardLayout(ALARMS.length, spec.columns, controls);
  const W = layout.w;
  const H = layout.h;
  t.box(group, t.paint('#3b3f42', 0.5), W, H, 0.12, 0, 0, 0.06);
  const title = createMicroLabel(kit, spec.title, {
    height: 0.03,
    ink: '#f2f2ee',
  });
  title.position.set(layout.title.x, layout.title.y, 0.121);
  group.add(title);
  const labels = ALARMS.map(text);
  const panel = createAnnunciatorPanel(kit, labels, {
    columns: spec.columns,
    cell,
  });
  // Its windows' top 0.12 m under the housing's, under the title.
  panel.group.position.set(layout.windows.x, layout.windows.y, 0.12);
  panel.group.traverse((o) => (o.userData.live = true));
  group.add(panel.group);
  const parts = createPartSet();
  const state = source.state;
  let testUntil = 0;
  let now = 0;
  let mutedAt = -1;
  let flashingCount = 0;
  const works: Record<
    AnnunciatorButton,
    { colour: OperatorColour; action: () => void }
  > = {
    ACCEPT: { colour: 'yellow', action: source.accept },
    RESET: { colour: 'grey', action: source.reset },
    'LAMP TEST': { colour: 'white', action: () => (testUntil = now + 2) },
    MUTE: { colour: 'blue', action: () => (mutedAt = flashingCount) },
  };
  for (const { legend, x, y } of layout.buttons) {
    const part = pushButton(kit, { legend, ...works[legend] });
    part.object.position.set(x, y, 0.12);
    part.object.traverse((o) => (o.userData.live = true));
    group.add(part.object);
    parts.add(part);
  }
  // The horn on top.
  const hornX = layout.horn.x;
  const hornY = layout.horn.y;
  t.cyl(
    group,
    t.paint('#c8261c', 0.45),
    0.05,
    0.06,
    hornX,
    hornY,
    0.06,
    'z',
    20,
  );
  t.cyl(group, t.paint('#2a2b2c', 0.5), 0.03, 0.02, hornX, hornY, 0.1, 'z', 20);
  const badge = createBrandBadge(kit, 'warden', { height: 0.02 });
  badge.position.set(layout.badge.x, layout.badge.y, 0.1205);
  group.add(badge);
  panelMakerMark(kit, group, {
    width: W,
    height: H,
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
      name: spec.name,
      part: {
        kind: 'visible',
        label: spec.name,
        shows: () => {
          const s = state();
          const lit = ALARMS.filter((id) => (s.windows[id] ?? 'off') !== 'off');
          return lit.length
            ? lit
                .map(
                  (id) =>
                    `${text(id).replace('\n', ' ')}${s.windows[id] === 'flashing' ? ' (flashing)' : ''}${s.firstOut === id ? ', first out' : ''}`,
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
        ALARMS.map(
          (id) =>
            test ||
            s.windows[id] === 'steady' ||
            (s.windows[id] === 'flashing' &&
              (s.firstOut === id ? fast : blink)),
        ),
      );
      // The horn while a window flashes, until MUTE (until another comes in).
      flashingCount = ALARMS.filter(
        (id) => s.windows[id] === 'flashing',
      ).length;
      if (flashingCount === 0) mutedAt = -1;
      hornOn.value = flashingCount > 0 && flashingCount > mutedAt;
    },
  };
}
