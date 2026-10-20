import {
  BufferGeometry,
  ShapeUtils,
  Vector2,
  Float32BufferAttribute,
  Group,
  Mesh,
  Vector3,
} from 'three';
import type { Curve } from 'three';
import { createPs1Material } from '../../core/parts/ps1-material';
import type { PanelKit } from '../../core/views/eighties-controls';

/** D-Line FC83-style rubber profile: 83×14 mm with a 30×10 mm cable channel. */
export function createFloorCableProtector(kit: PanelKit, path: Curve<Vector3>) {
  const group = new Group();
  group.name = 'Rubber floor cable protector';
  group.position.y = 0.001;
  // The recessed underside is a real channel; never roll the profile around
  // a Frenet frame, which can turn a floor cover on its side around a bend.
  const profile = [
    [-0.0415, 0],
    [-0.036, 0.004],
    [-0.015, 0.014],
    [0.015, 0.014],
    [0.036, 0.004],
    [0.0415, 0],
    [0.015, 0],
    [0.015, 0.01],
    [-0.015, 0.01],
    [-0.015, 0],
  ];
  const segments = Math.max(8, Math.ceil(path.getLength() * 24));
  const vertices: number[] = [],
    indices: number[] = [],
    uv: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const point = path.getPoint(i / segments);
    const tangent = path.getTangent(i / segments);
    const across = new Vector3(tangent.z, 0, -tangent.x).normalize();
    for (const [x, y] of profile) {
      const p = point.clone().addScaledVector(across, x);
      vertices.push(p.x, point.y + y, p.z);
      uv.push(x / 0.083 + 0.5, (i / segments) * path.getLength());
    }
    if (i < segments)
      for (let j = 0; j < profile.length; j++) {
        const a = i * profile.length + j,
          b = i * profile.length + ((j + 1) % profile.length);
        indices.push(
          a,
          a + profile.length,
          b,
          b,
          a + profile.length,
          b + profile.length,
        );
      }
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    profile.map(([x, y]) => new Vector2(x, y)),
    [],
  )) {
    indices.push(
      a,
      b,
      c,
      segments * profile.length + c,
      segments * profile.length + b,
      segments * profile.length + a,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = createPs1Material({ color: '#343632', roughness: 0.96 });
  kit.materials.push(material);
  group.add(new Mesh(geometry, material));
  return group;
}
