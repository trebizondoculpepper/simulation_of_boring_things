import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createPartSet } from '../../core/parts/parts';
import { createIncomingIsolator } from '../../industrial-control/views/incoming-isolator';
import { MAIN_SWITCH } from '../../../gallery/logic/switch-room';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';

/** The whole site's supply, as the switch shows and sets it. */
export interface MainsFeed {
  on(): boolean;
  set(on: boolean): void;
}

/**
 * The main incoming switch (`MAIN_SWITCH`): the Encabulator's incoming
 * supply isolator, its heavy-throw handle the whole site's supply, rated
 * for the UK, the supply rising into its foot from the floor; its
 * outgoing cables leave by trunking from its top, up to the cable ladder
 * (`cable-containment.ts`). Unbound, its handle is its own. On the floor
 * at the middle of its footprint, front +z, its posts against the wall.
 */
export function createMainSwitch(kit: PanelKit, feed?: MainsFeed): LiveExhibit {
  const object = new Group();
  object.name = 'Main incoming switch';
  const isolator = createIncomingIsolator(
    kit,
    feed?.on() === false ? 'off' : 'on',
    {
      bound: feed && {
        get value() {
          return feed.on() ? ('on' as const) : ('off' as const);
        },
        set: (p: 'on' | 'off' | 'tripped') => feed.set(p === 'on'),
      },
      rating: 'SITE INCOMER  400 V  3 PH  50 Hz',
      danger: 'DANGER  400 V',
      branch: false,
    },
  );
  // Its posts' backs (0.6 m behind its own origin) against the wall.
  isolator.group.position.z = -MAIN_SWITCH.d / 2 + 0.6;
  object.add(isolator.group);
  const parts = createPartSet();
  parts.add(isolator.handle);
  return {
    object,
    parts,
    dispose() {
      parts.dispose();
    },
  };
}
