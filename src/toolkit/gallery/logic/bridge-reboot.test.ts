import { describe, expect, it } from 'vite-plus/test';
import { BootGroup, BootScreen, Label } from '../../../ui2d';
import { applyAction, newWorld } from '../../../game/world';
import type { World } from '../../../game/world';
import { serviceAvailable } from '../../../game/plant/services';
import {
  CENTRAL_CONTROL,
  CONFIRM_WINDOW,
  REBOOT_COMMAND,
  REBOOT_DISPLAYS,
  REBOOT_OFF_FOR,
  BRIDGE_BINDINGS,
  confirmAt,
  pressConfirm,
  unwired,
} from './bridge-bindings';
import { ENTRANCE_BOOT } from './bridge-lights-up';

/** REBOOT DISPLAYS on Central Control (the owner, 2026-10-27). */
describe('rebooting the bridge’s displays from Central Control', () => {
  it('is on Central Control, wired, and asks to be confirmed', () => {
    const labels = CENTRAL_CONTROL.pages.flatMap((p) =>
      p.columns.flat().flatMap((w) => (w.kind === 'buttons' ? w.labels : [])),
    );
    expect(labels).toContain(REBOOT_DISPLAYS);
    const binding = BRIDGE_BINDINGS['CC-01'];
    expect(unwired(CENTRAL_CONTROL, binding)).toEqual([]);
    expect(binding.buttons?.[REBOOT_DISPLAYS]).toBe(REBOOT_COMMAND);
    expect(REBOOT_COMMAND.kind).toBe('confirm');
  });

  it('is carried out only by a second press within its window, else it lapses', () => {
    // The first press arms it.
    let r = pressConfirm(null, REBOOT_DISPLAYS, 10);
    expect(r.confirmed).toBe(false);
    expect(r.armed).toEqual({
      label: REBOOT_DISPLAYS,
      until: 10 + CONFIRM_WINDOW,
    });
    // Confirmed in time.
    const confirmed = pressConfirm(r.armed, REBOOT_DISPLAYS, 12);
    expect(confirmed).toEqual({ armed: null, confirmed: true });
    // Left too long: lapsed, and a press then only arms it again.
    expect(confirmAt(r.armed, 10 + CONFIRM_WINDOW)).toEqual(r.armed);
    expect(confirmAt(r.armed, 10 + CONFIRM_WINDOW + 0.1)).toBeNull();
    r = pressConfirm(r.armed, REBOOT_DISPLAYS, 10 + CONFIRM_WINDOW + 0.1);
    expect(r.confirmed).toBe(false);
    // Another command's press does not confirm it.
    expect(pressConfirm(r.armed, 'OTHER', 16).confirmed).toBe(false);
  });

  it('blacks every display, then boots each on its own durations, the main viewscreen last; lights and theme untouched', () => {
    if (REBOOT_COMMAND.kind !== 'confirm') throw new Error('not a confirm');
    let w: World = applyAction(newWorld(), { type: 'bridge/theme-heard' });
    w = applyAction(w, { type: 'bridge/displays', on: true });
    const before = w;
    // The bridge's displays following the world, as its room's effect does.
    const group = new BootGroup(() => 0.5);
    const screens = Array.from({ length: 6 }, (_, i) =>
      group.add(new BootScreen(new Label(`${i}`))),
    );
    const main = group.add(
      new BootScreen(new Label('viewscreen'), { lastAfter: 2 }),
    );
    const power = (x: World) =>
      serviceAvailable(x.plant, 'control_room', 'power') && x.bridgeDisplaysOn;
    let ready = 0;
    const follow = () => {
      const on = power(w);
      if (on !== group.powered) ready = group.setPower(on, ENTRANCE_BOOT);
    };
    follow();
    const all = [...screens, main];
    expect(new Set(all.map((s) => s.displayState))).toEqual(
      new Set(['running']),
    );
    const steps = [...REBOOT_COMMAND.steps].sort((a, b) => a.after - b.after);
    expect(steps.map((s) => s.after)).toEqual([0, REBOOT_OFF_FOR]);
    // Confirmed: off at once…
    w = applyAction(w, steps[0].action);
    follow();
    expect(new Set(all.map((s) => s.displayState))).toEqual(
      new Set(['unpowered']),
    );
    // …and on again a second later: every one booting.
    w = applyAction(w, steps[1].action);
    follow();
    expect(new Set(all.map((s) => s.displayState))).toEqual(
      new Set(['booting']),
    );
    // Their clocks from the switching on.
    for (const s of all) s.tick(0);
    for (const s of all) s.tick(ready - 0.01);
    // The main viewscreen the last to be operational.
    expect(main.displayState).toBe('booting');
    for (const s of all) s.tick(ready + 0.01);
    expect(new Set(all.map((s) => s.displayState))).toEqual(
      new Set(['running']),
    );
    // Not the first view: its theme heard still, its lights as they were.
    expect(w.bridgeThemeHeard).toBe(true);
    expect(w.lighting).toEqual(before.lighting);
  });
});
