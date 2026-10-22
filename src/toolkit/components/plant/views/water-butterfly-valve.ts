import {
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three';
import type { Object3D } from 'three';
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
  binding?: { open(): boolean; set(open: boolean): void },
) {
  const a = beginPart(kit, name);
  const lever = plantTools(kit).butterflyValve(a.object, dn, [0, 0, 0], axis);
  let open = true;
  let angle = 0;
  const toggle = () => {
    if (binding) binding.set(!binding.open());
    else open = !open;
  };
  lever.traverse((piece) => {
    if (piece !== lever) a.uses.set(piece, toggle);
  });
  a.updates.push((delta) => {
    const target = (binding?.open() ?? open) ? 0 : Math.PI / 2;
    angle += (target - angle) * Math.min(1, delta * 8);
    lever.rotation.y = (axis === 'y' ? -Math.PI / 2 : 0) + angle;
  });
  return Object.defineProperty(a.part(), 'open', {
    get: () => binding?.open() ?? open,
  }) as ReturnType<typeof a.part> & { readonly open: boolean };
}

/**
 * A chain wheel for a valve out of reach overhead (`createWaterButterflyValve`
 * built at height `at` over the floor, on a pipe of outside diameter `od`):
 * a red wheel on its spindle and its endless chain hanging to `chainTo`
 * over the floor. Returns the chain's two falls, which work the valve when
 * pulled.
 */
export function addChainWheel(
  kit: PanelKit,
  valve: Object3D,
  {
    od,
    at,
    chainTo,
    name,
  }: { od: number; at: number; chainTo: number; name: string },
): Mesh[] {
  const red = new MeshStandardMaterial({ color: '#b22a22', roughness: 0.5 });
  const steel = new MeshStandardMaterial({
    color: '#8a8f92',
    roughness: 0.4,
    metalness: 0.7,
  });
  kit.materials.push(red, steel);
  const r = od / 2 + 0.12;
  const wheel = new Mesh(new TorusGeometry(0.15, 0.012, 8, 24), red);
  wheel.position.set(0, r, 0);
  valve.add(wheel);
  const drop = at + r - chainTo;
  return [-1, 1].map((side) => {
    const chain = new Mesh(new CylinderGeometry(0.006, 0.006, drop, 6), steel);
    chain.position.set(side * 0.15, r - drop / 2, 0);
    chain.name = `${name} chain`;
    valve.add(chain);
    return chain;
  });
}
