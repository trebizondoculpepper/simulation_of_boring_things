import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createBrandBadge } from '../../core/views/brand-badge';
import { FINISH, plantTools } from './plant-tools';

/**
 * A stainless steel tank access ladder by Certikind, after the fixed
 * ladders tank and pool builders fit into wet chambers (BS EN ISO
 * 14122-4 in its sizes): 316 stainless throughout, Ø42 mm stiles 450 mm
 * apart, Ø25 mm rungs every 250 mm with anti-slip grooves, stand-off
 * brackets fixed to the wall every 1.2 m, and the stiles carried 1.1 m
 * above the rim as handholds, joined across at the top. No cage: it goes
 * down into water, and is entered on a permit with a harness and line.
 *
 * Its own frame: the wall at z = 0, the ladder in front of it (+z), the
 * rim at y = 0, its feet `depth` below.
 */
export function createTankLadder(
  kit: PanelKit,
  { depth = 4.5, standOff = 0.18, extension = 1.1 } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Certikind stainless tank ladder';
  const steel = t.paint(FINISH.stainless, 0.25, 0.85);
  const half = 0.225 + 0.021;
  const z = standOff;
  // The stiles, from the floor to their handholds, joined across the top.
  for (const x of [-half, half])
    t.rod(group, steel, [x, -depth, z], [x, extension, z], 0.021, 14);
  t.rod(group, steel, [-half, extension, z], [half, extension, z], 0.021, 14);
  // The rungs.
  for (let y = -depth + 0.25; y <= -0.12; y += 0.25)
    t.rod(group, steel, [-half, y, z], [half, y, z], 0.0125, 10);
  // Its stand-off brackets to the wall, each with its fixing plate.
  // None above its top: under a hatch, nothing stands proud of the deck.
  for (let y = -depth + 0.3; y < Math.min(0.5, extension - 0.1); y += 1.2)
    for (const x of [-half, half]) {
      t.rod(group, steel, [x, y, 0.01], [x, y, z], 0.012, 8);
      t.box(group, steel, 0.08, 0.12, 0.008, x, y, 0.004);
    }
  // Its feet, on plates.
  for (const x of [-half, half])
    t.box(group, steel, 0.1, 0.01, 0.1, x, -depth + 0.005, z);
  // Its maker's plate on a stile, at the top.
  const badge = createBrandBadge(kit, 'certikind', {
    height: 0.025,
    plate: '#d9dcdd',
  });
  badge.position.set(half, Math.min(0.5, extension - 0.15), z + 0.03);
  group.add(badge);
  return group;
}
