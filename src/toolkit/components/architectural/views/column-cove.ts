import { BufferGeometry, Float32BufferAttribute } from 'three';

/** A tiled floor-to-square-column cove, including rounded outside corners. */
export function createColumnCove(side: number, radius: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  const corners = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  const around = 8;
  const rises = 12;
  const count = 4 * (around + 1);
  for (let row = 0; row <= rises; row++) {
    const angle = ((row / rises) * Math.PI) / 2;
    // A quarter circle tangent to both the deck and the column face.
    const offset = radius * (1 - Math.sin(angle));
    const y = radius * (1 - Math.cos(angle));
    corners.forEach(([sx, sz], corner) => {
      for (let step = 0; step <= around; step++) {
        const turn = ((corner + step / around) * Math.PI) / 2;
        positions.push(
          (sx * side) / 2 + Math.cos(turn) * offset,
          y,
          (sz * side) / 2 + Math.sin(turn) * offset,
        );
      }
    });
  }
  for (let row = 0; row < rises; row++) {
    for (let col = 0; col < count; col++) {
      const a = row * count + col;
      const b = row * count + ((col + 1) % count);
      const c = a + count;
      const d = b + count;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
