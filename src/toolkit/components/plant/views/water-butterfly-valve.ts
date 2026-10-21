import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import type { DN } from './plant-tools';

/** A manually operated wafer butterfly isolator on a pool-water pipe. */
export function createWaterButterflyValve(
  kit: PanelKit,
  dn: DN,
  axis: 'x' | 'y' | 'z',
  name: string,
) {
  const a = beginPart(kit, name);
  const lever = plantTools(kit).butterflyValve(a.object, dn, [0, 0, 0], axis);
  let open = true;
  let angle = 0;
  const toggle = () => {
    open = !open;
  };
  lever.traverse((piece) => {
    if (piece !== lever) a.uses.set(piece, toggle);
  });
  a.updates.push((delta) => {
    const target = open ? 0 : Math.PI / 2;
    angle += (target - angle) * Math.min(1, delta * 8);
    lever.rotation.y = (axis === 'y' ? -Math.PI / 2 : 0) + angle;
  });
  return Object.defineProperty(a.part(), 'open', {
    get: () => open,
  }) as ReturnType<typeof a.part> & { readonly open: boolean };
}
