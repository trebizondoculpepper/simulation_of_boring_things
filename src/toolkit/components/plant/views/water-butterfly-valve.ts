import {
  CylinderGeometry,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import { PIPE_SIZES, plantTools } from './plant-tools';
import { createValvePlaques } from './valve-plaques';
import type { DN } from './plant-tools';

/** A manually operated wafer butterfly isolator on a pool-water pipe. */
export function createWaterButterflyValve(
  kit: PanelKit,
  dn: DN,
  axis: 'x' | 'y' | 'z',
  name: string,
  binding?: { open(): boolean; set(open: boolean): void },
  operator: 'lever' | 'chain' = 'lever',
  /** Its designation, printed on plaques round its body (`valve-plaques.ts`). */
  plaque?: { tag: string; name: string },
) {
  const a = beginPart(kit, name);
  const lever = plantTools(kit).butterflyValve(
    a.object,
    dn,
    [0, 0, 0],
    axis,
    operator,
  );
  if (plaque)
    a.object.add(createValvePlaques(kit, dn, axis, plaque.tag, plaque.name));
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
    // Open, the lever lies along the pipe; shut, across it (the owner,
    // 2026-10-25). On an upright pipe it swings about its sideways stem,
    // up along the pipe when open and out level (its frame's +x) when shut.
    lever.rotation.y = angle;
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
    dn,
    axis,
    at,
    chainTo,
    name,
  }: {
    dn: DN;
    axis: 'x' | 'y' | 'z';
    at: number;
    chainTo: number;
    name: string;
  },
): Mesh[] {
  const red = new MeshStandardMaterial({ color: '#b22a22', roughness: 0.5 });
  const steel = new MeshStandardMaterial({
    color: '#8a8f92',
    roughness: 0.4,
    metalness: 0.7,
  });
  kit.materials.push(red, steel);
  const size = PIPE_SIZES[dn];
  const stemTip = size.flange * 0.42 + Math.max(0.08, size.od * 0.6);
  const wheel = new Mesh(new TorusGeometry(0.15, 0.012, 8, 24), red);
  // On an upright pipe the spindle projects toward +z, not above the pipe.
  wheel.position.set(0, axis === 'y' ? 0 : stemTip, axis === 'y' ? stemTip : 0);
  valve.add(wheel);
  const wheelY = axis === 'y' ? 0 : stemTip;
  const drop = at + wheelY - chainTo;
  return [-1, 1].map((side) => {
    const chain = new Mesh(new CylinderGeometry(0.006, 0.006, drop, 6), steel);
    chain.position.set(side * 0.15, wheelY - drop / 2, wheel.position.z);
    chain.name = `${name} chain`;
    valve.add(chain);
    return chain;
  });
}
