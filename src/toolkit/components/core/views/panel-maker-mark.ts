import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { BrandId } from '../logic/brands';
import type { PanelKit } from './eighties-controls';
import { createBrandBadge } from './brand-badge';

/**
 * The panel builder's mark: a small, discreet badge in a corner of a
 * control board, panel or mimic, as panel shops sign their work. Every
 * control panel in the back rooms carries one (Penfold Controls builds
 * them), in its top right corner, or its bottom right where the top right
 * is in use. Each instrument set into a panel keeps its own maker's
 * badge as well.
 */

export type MarkCorner = 'top-right' | 'bottom-right';

export function panelMakerMark(
  kit: PanelKit,
  parent: Object3D,
  {
    width,
    height,
    z,
    corner = 'top-right',
    size = 0.018,
    inset = 0.025,
    maker = 'penfold',
  }: {
    /** The face's size, metres, centred on the parent's origin. */
    width: number;
    height: number;
    /** The face's z. */
    z: number;
    corner?: MarkCorner;
    /** The badge's height, metres. */
    size?: number;
    /** Its distance in from the face's edges. */
    inset?: number;
    maker?: BrandId;
  },
) {
  const badge = createBrandBadge(kit, maker, { height: size });
  const span = new Box3().setFromObject(badge).getSize(new Vector3());
  const y = height / 2 - inset - size / 2;
  badge.position.set(
    width / 2 - inset - span.x / 2,
    corner === 'top-right' ? y : -y,
    z + 0.0006,
  );
  badge.name = `${maker} panel maker's mark`;
  parent.add(badge);
  return badge;
}
