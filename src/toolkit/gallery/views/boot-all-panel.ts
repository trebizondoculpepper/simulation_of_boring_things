import { Group } from 'three';
import { Button, Frame, Label, Stack } from '../../../ui2d';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import {
  bootGroupOf,
  createTouchSurface,
} from '../../components/industrial-control/views/touch-surface';
import type { LiveExhibit } from '../rooms/plant/exhibit';

/** The panel's glass, metres. */
export const BOOT_ALL_PANEL = { w: 0.9, h: 0.5 };

/** How far apart the room's screens begin their boots, seconds. */
export const BOOT_ALL_SPREAD = 1.5;

/**
 * BOOT ALL (the owner, 2026-10-27): a small touch panel that reboots every
 * touch screen in its room (every screen made with the same `kit`, through
 * `bootGroupOf`), each at its own offset over `BOOT_ALL_SPREAD` seconds;
 * SKIP puts them all straight on. It never boots itself. Built first in a
 * room with `onEntry`, every screen built after it boots as it is made,
 * so the room's screens boot as the walker comes in.
 */
export function createBootAllPanel(
  kit: PanelKit,
  options: { onEntry?: boolean } = {},
): LiveExhibit {
  const group = bootGroupOf(kit);
  if (options.onEntry) group.autoBoot({ spread: BOOT_ALL_SPREAD });
  const status = new Label('', { colour: 'accent', scale: 0.7 });
  const bootAll = new Button({
    label: 'BOOT ALL',
    sub: 'STAGGERED',
    colour: 'golden-tanoi',
    onPress: () => {
      group.autoBoot(null);
      group.bootAll(BOOT_ALL_SPREAD);
    },
  });
  const skip = new Button({
    label: 'SKIP',
    sub: 'ALL ON',
    colour: 'secondary',
    onPress: () => {
      group.autoBoot(null);
      group.skipAll();
    },
  });
  const tree = new Frame({
    title: 'DISPLAY BOOT',
    code: 'DB-01',
    footer: '',
    colour: 'golden-tanoi',
    sidebar: [],
    content: new Stack('column', [
      status,
      new Stack('row', [bootAll, skip], { grow: 2 }),
    ]),
  });
  const surface = createTouchSurface(kit, {
    name: 'BOOT ALL touch panel',
    bezel: 0.012,
    screens: [
      {
        rect: { x: 0, y: 0, ...BOOT_ALL_PANEL },
        tree,
        pixelsPerMetre: 700,
        boot: false,
      },
    ],
  });
  const parts = createPartSet();
  parts.add(surface.part);
  const object = new Group();
  surface.group.position.z = 0.02;
  object.add(surface.group);
  const words = () => {
    let booting = 0;
    for (const s of group.screens) if (s.booting) booting++;
    const n = group.screens.size;
    return booting ? `${booting} OF ${n} BOOTING` : `${n} DISPLAYS OPERATIONAL`;
  };
  let next = 0;
  let seconds = 0;
  let first = true;
  return {
    object,
    parts,
    update(delta) {
      // The room built: screens made later (none, yet) start on.
      if (first) group.autoBoot(null);
      first = false;
      seconds += delta;
      if (seconds >= next) {
        next = seconds + 0.25;
        status.setText(words());
      }
      parts.update(delta);
    },
    status: () => `BOOT ALL: ${words().toLowerCase()}`,
  };
}
