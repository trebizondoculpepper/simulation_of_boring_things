import { recording } from '../../core/audio/part-audio';
import type { Binding, Readable } from '../../core/logic/world/components';
import type { PanelKit } from '../../core/views/eighties-controls';
import { beginPart } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { asset, emitter, show } from '../../core/parts/building-part-tools';
import { createFusedSpur } from '../views/fused-spur';

/** The rocker going over. */
const ROCKER = recording(asset('rocker-click.wav'), 0.08);

/**
 * A switched fused spur (`../logic/fused-spur.ts`) as a working part: a
 * click on its rocker, or anywhere on its plate, switches it, and its neon is lit while its output
 * is live. `legend` is engraved beneath (what it feeds).
 */
export function fusedSpur(
  kit: PanelKit,
  props: { bound: Binding<boolean>; live: Readable<boolean>; legend?: string },
): Part {
  const a = beginPart(
    kit,
    props.legend ? `fused spur: ${props.legend}` : 'fused spur',
  );
  const view = createFusedSpur(kit, props.legend);
  a.object.add(view.group);
  const e = emitter();
  a.voice(e, { on: ROCKER, off: ROCKER });
  const toggle = () => {
    props.bound.set(!props.bound.value);
    e.emit(props.bound.value ? 'on' : 'off');
  };
  // The rocker, or anywhere on its small plate, switches it.
  a.uses.set(view.rocker, toggle);
  a.uses.set(view.group, toggle);
  show(a, () => view.set(props.bound.value, props.live.value));
  return a.part();
}
