import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';

/** Cast reinforced-concrete beam over a plant-room doorway, in metres. */
export const CONCRETE_LINTEL = { height: 0.24, bearing: 0.18, proud: 0.015 };

export function addConcreteLintel(
  group: Group,
  kit: PanelKit,
  opening: number,
  thickness: number,
  x: number,
  bottom: number,
  z: number,
  alongX = true,
) {
  const { height, bearing, proud } = CONCRETE_LINTEL;
  const material = new MeshStandardMaterial({
    color: '#a9aca8',
    roughness: 0.96,
  });
  kit.materials.push(material);
  const beam = new Mesh(
    new BoxGeometry(
      alongX ? opening + 2 * bearing : thickness + 2 * proud,
      height,
      alongX ? thickness + 2 * proud : opening + 2 * bearing,
    ),
    material,
  );
  beam.name = 'reinforced concrete lintel';
  beam.position.set(x, bottom + height / 2, z);
  group.add(beam);
  return beam;
}
