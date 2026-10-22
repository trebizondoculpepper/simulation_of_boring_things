import type { Object3D } from 'three';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import type { PartSet } from '../../../components/core/parts/parts';
import type { ExhibitSize } from '../../logic/plant-room-layout';
import type { BrandId } from '../../../components/core/logic/brands';

/**
 * One piece of plant shown in a plant development room: a model built at
 * true size from a referenced commercial product, under a maker's name of
 * our own.
 *
 * `build` makes it in metres. Floor equipment: origin on the floor at the
 * middle of its footprint, front facing +z, `size.w` along x and `size.d`
 * along z. Wall equipment: origin in the wall's face at the middle of its
 * back, front facing +z, standing `size.d` out from the wall. `size` must
 * enclose the model, so the room can lay it out and keep walkers out of it.
 */
export interface PlantExhibit {
  /** What it is, as an engineer would name it: "Pressure sand filter". */
  title: string;
  /** The product it is modelled on and its key size: "After … , 2.8 m dia." */
  reference: string;
  size: ExhibitSize;
  /** Its maker in the game's world (`brands.ts`), for schedules such as the manual's. */
  maker?: BrandId;
  build(kit: PanelKit): Object3D | LiveExhibit;
}

/**
 * A working exhibit: its model, the parts a player can work (each click
 * routed by the room), and what it does each frame. Objects that change
 * as it runs carry `userData.live = true` so the room does not merge them
 * into still geometry.
 */
export interface LiveExhibit {
  object: Object3D;
  parts?: PartSet;
  update?(delta: number): void;
  dispose?(): void;
}

/** Whether `built` is a working exhibit rather than a bare model. */
export const isLive = (built: Object3D | LiveExhibit): built is LiveExhibit =>
  'object' in built && !('isObject3D' in built);
