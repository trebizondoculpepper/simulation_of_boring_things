import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { PLATE_WHITE, tools } from '../../core/views/fitting-tools';

/**
 * A switched fused spur (`../logic/fused-spur.ts`), facing +z with its back
 * on the wall at z = 0: its plate, rocker, fuse carrier and neon, and what
 * it feeds engraved beneath (`legend`, such as DISPLAY), as installers mark
 * them. `set` shows it switched and its neon lit.
 */
export function createFusedSpur(kit: PanelKit, legend?: string) {
  const t = tools(kit);
  const group = new Group();
  t.box(group, t.paint(PLATE_WHITE, 0.35), 0.086, 0.086, 0.01, 0, 0, 0.005);
  const pivot = new Group();
  pivot.position.set(0.018, 0.016, 0.01);
  group.add(pivot);
  const rocker = t.box(
    pivot,
    t.paint('#ecebe4', 0.3),
    0.016,
    0.026,
    0.006,
    0,
    0,
    0.003,
  );
  t.box(
    group,
    t.paint('#e3e2da', 0.3),
    0.022,
    0.03,
    0.006,
    -0.018,
    0.012,
    0.013,
  );
  t.label(group, 'FUSE', -0.018, -0.008, 0.0105, 0.004);
  const neon = t.led(group, '#ff4a2a', 0.004, 0.018, -0.025, 0.011);
  if (legend) t.label(group, legend, 0, -0.035, 0.0105, 0.005);
  return {
    group,
    rocker,
    set(on: boolean, live: boolean) {
      pivot.rotation.x = on ? -0.15 : 0.15;
      neon.set(live);
    },
  };
}
