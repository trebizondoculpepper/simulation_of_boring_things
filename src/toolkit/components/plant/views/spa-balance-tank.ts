import { Group, MeshStandardMaterial, SphereGeometry, Mesh } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { createEngravedPlate } from '../../core/views/plant-signs';

/**
 * A spa's balance tank (`spa-balance-tank.ts`; the owner, 2026-10-24: a
 * deck-level spa cannot work without one), by Lidoluxe, after the
 * one-piece GRP tanks of the commercial spa makers: a cream GRP cylinder,
 * its seams banded, a shallow domed lid with a bolted access hatch, and on
 * its lid the float valve its make-up feeds. On its east side, toward the
 * room, a sight gauge: a clear tube from its foot to its lid, its water at
 * the tank's level, its float (green) and its low-low (red) marked beside
 * it. A plate on it says what it is. Its pipes' nozzles are where its
 * room's runs end (`cabinetBalanceTank`).
 *
 * Its own frame: its foot's middle at the origin, standing up y, its east
 * (its gauge) toward +x.
 */
export function createSpaBalanceTank(
  kit: PanelKit,
  {
    diameter,
    height,
    depth,
    float,
    lowLow,
    volume,
    tag = 'BT1',
  }: {
    diameter: number;
    height: number;
    /** Its water's depth full, m. */
    depth: number;
    /** Its float's and low-low's fill shares. */
    float: number;
    lowLow: number;
    volume: number;
    tag?: string;
  },
) {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Spa balance tank';
  const r = diameter / 2;
  const grp = t.paint('#d8d0b4', 0.7);
  const band = t.paint('#b8ae8e', 0.7);
  const dark = t.paint('#3c4042', 0.5, 0.3);
  // Its body, and the bands of its moulding's seams.
  t.cyl(group, grp, r, height, 0, height / 2, 0, 'y', 40);
  for (const y of [0.04, height * 0.5, height - 0.05])
    t.cyl(group, band, r + 0.008, 0.035, 0, y, 0, 'y', 40);
  // Its lid, a shallow dome, and its bolted access hatch.
  const dome = new Mesh(
    new SphereGeometry(r, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    grp,
  );
  dome.scale.y = 0.12;
  dome.position.y = height;
  group.add(dome);
  t.cyl(group, band, 0.22, 0.05, 0.15, height + 0.04, 0.1, 'y', 24);
  t.cyl(group, grp, 0.2, 0.03, 0.15, height + 0.08, 0.1, 'y', 24);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    t.cyl(
      group,
      dark,
      0.008,
      0.02,
      0.15 + Math.cos(a) * 0.19,
      height + 0.1,
      0.1 + Math.sin(a) * 0.19,
      'y',
      6,
    );
  }
  // Its float valve's body on its lid, where its make-up comes down.
  t.box(
    group,
    t.paint('#7b8487', 0.4, 0.5),
    0.09,
    0.07,
    0.07,
    -0.4,
    height + 0.05,
    0.2,
  );
  // Its sight gauge on its east side: a clear tube and the water in it,
  // clamped top and bottom, its float and low-low marked.
  const gx = r + 0.05;
  const lo = 0.1;
  const hi = height - 0.08;
  const tube = new MeshStandardMaterial({
    color: '#e3f4f8',
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
  });
  kit.materials.push(tube);
  t.cyl(group, tube, 0.014, hi - lo, gx, (hi + lo) / 2, 0, 'y', 12);
  for (const y of [lo, hi])
    t.box(group, dark, 0.07, 0.03, 0.04, gx - 0.025, y, 0);
  const water = t.cyl(
    group,
    t.paint('#2f8fb0', 0.2),
    0.01,
    1,
    gx,
    lo,
    0,
    'y',
    10,
  );
  water.userData.live = true;
  /** Its water's height for a fill share: its depth over its floor. */
  const toGauge = (share: number) => Math.min(hi, Math.max(lo, share * depth));
  for (const [share, colour] of [
    [float, '#2f7d3a'],
    [lowLow, '#b03a2e'],
  ] as const)
    t.box(
      group,
      t.paint(colour, 0.5),
      0.004,
      0.012,
      0.05,
      gx + 0.018,
      toGauge(share),
      0,
    );
  // Its plate, and its maker's badge.
  const plate = createEngravedPlate(
    kit,
    [`BALANCE TANK ${tag}`, `${volume.toFixed(1)} m³ · GRP`],
    { colour: 'white', width: 0.32, height: 0.09 },
  );
  plate.position.set(
    r * Math.cos(0.45) + 0.004,
    height * 0.68,
    r * Math.sin(0.45),
  );
  plate.rotation.y = Math.PI / 2 - 0.45;
  group.add(plate);
  const badge = brandLivery(kit, 'lidoluxe').badge(0.05);
  badge.position.set(
    r * Math.cos(-0.45) + 0.004,
    height * 0.68,
    r * Math.sin(-0.45),
  );
  badge.rotation.y = Math.PI / 2 + 0.45;
  group.add(badge);
  let shown = -1;
  return {
    group,
    /** Show its water at `share` of its volume, in its gauge. */
    setLevel(share: number) {
      const s = Math.max(0, Math.min(1, share));
      if (Math.abs(s - shown) < 0.002) return;
      shown = s;
      const top = toGauge(s);
      water.visible = top > lo + 0.002;
      water.scale.y = Math.max(0.001, top - lo);
      water.position.y = lo + (top - lo) / 2;
    },
  };
}
