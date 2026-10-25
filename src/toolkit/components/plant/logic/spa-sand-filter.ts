import type { IdealFilterSpec } from '../../../../game/plant/ideal-filter';
import { filterSizing } from '../../../../game/plant/ideal-filter';

/**
 * A spa cabinet's sand filter's one geometry (the owner, 2026-10-25), for
 * its drawing (`createSpaSandFilter`) and its ports alike: its vessel
 * sized as its filter, its base, shell and flattened dome; its valve head
 * on top, its servo over it; its inlet and outlet unions low at either
 * side; its wash to waste up out of its valve head. Metres, its own frame:
 * on the floor, its middle on its axis, its front +z. Pure.
 */
export function spaSandFilterGeometry(spec: IdealFilterSpec) {
  const z = filterSizing(spec);
  const r = spec.diameter / 2;
  const base = 0.06;
  // Its bed, and the freeboard over it for the bed to lift.
  const shell = z.bedDepth + 0.3;
  const top = base + shell;
  const head = top + r * 0.35;
  return {
    r,
    base,
    shell,
    top,
    head,
    /** Its unions: out to here either side of its middle, this high. */
    unionReach: r + 0.08,
    unionY: 0.12,
    /** Its wash's outlet, out of the back of its valve head. */
    waste: [0, head + 0.04, -0.13] as [number, number, number],
    height: head + 0.16,
  };
}
