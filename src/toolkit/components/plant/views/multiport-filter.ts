import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { MULTIPORT } from '../logic/multiport';
import { plantTools } from './plant-tools';
import {
  POSITIONS,
  POSITION_LABEL,
} from '../../../../game/plant/multiport-filter';
import type { MultiportPosition } from '../../../../game/plant/multiport-filter';

/**
 * A small fibreglass sand filter with a top-mount multiport valve, after
 * the Lidoluxe 600 mm domestic and light-commercial range: the vessel on
 * its base, the valve on its top with three unions (PUMP, RETURN, WASTE),
 * a dial of its positions round its lever, and its pressure gauge. A click
 * on the lever turns it to the next position (`onTurn`); `show` sets the
 * lever, the dial's lit position and the gauge. Its own frame: on the
 * floor, the WASTE union toward +z.
 */
export function createMultiportFilter(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Lidoluxe 600 mm sand filter, multiport valve';
  const livery = brandLivery(kit, 'lidoluxe');
  const r = 0.3;
  t.cyl(group, livery.paint.shade, r * 0.8, 0.15, 0, 0.075, 0, 'y', 32);
  t.cyl(group, livery.paint.casing, r, 0.95, 0, 0.15 + 0.475, 0, 'y', 40);
  t.cyl(group, livery.paint.casing, r * 0.75, 0.1, 0, 1.15, 0, 'y', 40);
  // The valve: its body, its three unions, and its dial.
  const grey = t.paint('#3e4448', 0.5);
  const white = t.paint('#e8e8e2', 0.5);
  t.cyl(group, grey, 0.14, 0.12, 0, MULTIPORT.y, 0, 'y', 32);
  for (const p of Object.values(MULTIPORT.ports)) {
    const mid: [number, number, number] = [
      p.at[0] - p.out[0] * 0.05,
      p.at[1],
      p.at[2] - p.out[2] * 0.05,
    ];
    t.cyl(group, grey, 0.03, 0.1, ...mid, p.out[0] !== 0 ? 'x' : 'z', 16);
  }
  t.cyl(group, white, 0.13, 0.01, 0, MULTIPORT.y + 0.065, 0, 'y', 32);
  // Each position's label round the dial, the lit one marked.
  const labels = POSITIONS.map((p, k) => {
    const a = (k * Math.PI) / 2;
    const label = createMicroLabel(kit, POSITION_LABEL[p], {
      height: 0.014,
      ink: '#1d2326',
      maxWidth: 0.1,
    });
    label.rotation.x = -Math.PI / 2;
    label.rotation.z = -a;
    label.position.set(
      Math.sin(a) * 0.09,
      MULTIPORT.y + 0.072,
      Math.cos(a) * 0.09,
    );
    group.add(label);
    return label;
  });
  // The lever, pivoting on the valve's top.
  const lever = new Group();
  lever.position.set(0, MULTIPORT.y + 0.08, 0);
  group.add(lever);
  t.cyl(lever, grey, 0.025, 0.04, 0, 0, 0, 'y', 16);
  t.box(lever, t.paint('#1d4f9e', 0.5), 0.03, 0.025, 0.16, 0, 0.03, 0.06);
  lever.userData.live = true;
  const gauge = t.pressureGauge(group, [-0.06, MULTIPORT.y + 0.11, -0.09], {
    max: 4,
    dia: 0.07,
    legend: 'FILTER',
  });
  let at: MultiportPosition | null = null;
  return {
    group,
    lever,
    show(position: MultiportPosition, gaugeBar: number, delta: number) {
      if (position !== at) {
        at = position;
        const k = POSITIONS.indexOf(position);
        lever.rotation.y = (k * Math.PI) / 2;
        labels.forEach((l, i) => {
          l.scale.setScalar(i === k ? 1.25 : 1);
        });
      }
      gauge.set(gaugeBar);
      gauge.update(delta);
    },
  };
}
