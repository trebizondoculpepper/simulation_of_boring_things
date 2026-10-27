import { Group } from 'three';
import { Banner, Frame, List, PageStack, Stack } from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createTouchSurface } from '../../components/industrial-control/views/touch-surface';
import type { Annunciator } from '../../components/industrial-control/logic/annunciator';
import { createPartSet } from '../../components/core/parts/parts';
import { ALARM_TEXT, ANNUNCIATOR_ALARMS } from '../logic/control-room-demo';
import { viewscreenShows } from '../logic/bridge-bindings';
import { stationSchematic } from './station-schematics';
import type { BridgeContext } from '../logic/bridge-bindings';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/**
 * The bridge's main viewscreen (mission 095, stage 4: a live overview for
 * now; its full modes are mission 093's stage 2): the plant's schematics
 * (the owner, 2026-10-27), its own designs turning (the Olympic's,
 * lounge's, heating's and power's hydrodynamic overviews, the plant at a
 * glance, the alarms swept), any of the overviews brought up from its
 * list by a touch, as a station's browser; and, while any alarm on the bridge's annunciator is
 * unaccepted, the alarm list instead, flashing, each with the room to go
 * to, until it is accepted (at Central Control or the annunciator).
 * It shows only: a touch picks what it shows, never the plant. Repainted on change, its flows at
 * most ten times a second (the touch surface's).
 */
export function createViewscreen(
  kit: PanelKit,
  size: { w: number; h: number },
  context: () => BridgeContext | null,
  annunciator: Annunciator,
): LiveExhibit {
  // The plant's schematics, the main viewscreen's own designs turning,
  // any overview brought up from its list (`station-schematics.ts`).
  const browser = stationSchematic('MAIN VIEWSCREEN', { period: 24 });
  const banner = new Banner({ size: 90 });
  const list = new List({ rowHeight: 56 });
  const alarms = new Stack('column', [banner, list]);
  const frame = new Frame({
    title: 'ALERT',
    code: 'VS-01',
    footer: '',
    colour: 'golden-tanoi',
    sidebar: [],
    content: alarms,
  });
  const pages = new PageStack({ SCHEMATIC: browser.tree, ALARMS: frame });
  const surface = createTouchSurface(kit, {
    name: 'Main viewscreen',
    bezel: 0.02,
    // Coarse for its size: it is seen from across the room (fine enough
    // for its browser's list to be read).
    screens: [
      { rect: { x: 0, y: 0, ...size }, tree: pages, pixelsPerMetre: 150 },
    ],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  object.add(surface.group);
  let next = 0;
  let seconds = 0;
  const read = () => {
    const c = context();
    if (!c) return;
    // The alarms the annunciator senses, as its board's.
    annunciator.sense(
      ANNUNCIATOR_ALARMS.map((id) => c.reading.alarms.includes(id)),
    );
    const flashing = ANNUNCIATOR_ALARMS.filter(
      (_, i) => annunciator.states[i] === 'flashing',
    );
    const mode = viewscreenShows(flashing.length);
    pages.show(mode);
    if (mode === 'ALARMS') {
      banner.set(
        `${flashing.length} ALARM${flashing.length > 1 ? 'S' : ''} · ACCEPT AT CENTRAL CONTROL`,
        true,
      );
      list.set(
        ANNUNCIATOR_ALARMS.filter((id) => c.reading.alarms.includes(id)).map(
          (id) => ({
            words: ALARM_TEXT[id].window.replace('\n', ' '),
            right: `GO TO ${ALARM_TEXT[id].room}`,
            colour: flashing.includes(id) ? 'alert' : 'golden-tanoi',
            flashing: flashing.includes(id),
          }),
        ),
      );
      return;
    }
    browser.update(c, seconds);
  };
  return {
    object,
    parts,
    update(delta) {
      seconds += delta;
      if (seconds >= next) {
        next = seconds + 0.5;
        read();
      }
      parts.update(delta);
    },
    status: () =>
      `The main viewscreen: ${pages.current === 'ALARMS' ? 'the alarms' : browser.titles[browser.current()]}`,
  };
}
