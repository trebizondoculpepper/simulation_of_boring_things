/**
 * Baked ambient occlusion, the geometry side (`doc/reports/baked-lighting-and-reflections.md`):
 * the hash a room's bake is cached under, and the subdivision of large flat
 * faces so a per-vertex bake has vertices enough to show occlusion on them.
 * Pure: plain arrays in, plain arrays out.
 */

/**
 * The baker's version: bumped whenever the bake's method changes, so every
 * bake cached by an older baker misses and is made again.
 */
export const BAKE_VERSION = 1;

/** How a room is baked: part of its cache key, so a change re-bakes. */
export interface BakeSettings {
  /** Rays a vertex (cosine-weighted over its hemisphere). */
  rays: number;
  /** How far an occluder counts, metres; beyond it, nothing occludes. */
  distance: number;
  /** The longest edge a receiving triangle keeps, metres; longer edges are split. */
  maxEdge: number;
}

export const DEFAULT_BAKE: BakeSettings = {
  rays: 32,
  distance: 1.5,
  maxEdge: 0.5,
};

/** One mesh of a room's static geometry, in world space (scene units). */
export interface BakeMeshData {
  /** x, y, z per vertex; triangles are consecutive triples unless `index` is given. */
  positions: Float32Array;
  normals: Float32Array;
  index?: Uint32Array | Uint16Array | null;
  /** Whether it takes a bake (else it only occludes). */
  receiver: boolean;
}

/**
 * FNV-1a over 32-bit words, two lanes with different offsets, so a key is
 * 64 bits: enough that two rooms' geometries never meet by chance.
 */
export function createHasher() {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  const word = (value: number) => {
    let v = value | 0;
    for (let i = 0; i < 4; i++) {
      const byte = v & 0xff;
      v >>>= 8;
      a = Math.imul(a ^ byte, 0x01000193);
      b = Math.imul(b ^ byte, 0x01000193) ^ (b >>> 15);
    }
  };
  return {
    word,
    text(value: string) {
      for (let i = 0; i < value.length; i++) word(value.charCodeAt(i));
    },
    digest() {
      const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
      return hex(a) + hex(b);
    },
  };
}

/**
 * The hash of a room's baked inputs: every mesh's positions (to the
 * millimetre) and normals (to 1/127), its index, whether it receives, in
 * the order given, with the settings and `BAKE_VERSION`. The same build
 * gives the same hash; any change of geometry, a bake setting or the
 * baker gives another. `unit` is scene units a metre.
 */
export function geometryHash(
  meshes: readonly BakeMeshData[],
  settings: BakeSettings,
  unit = 1,
): string {
  const h = createHasher();
  h.text(
    `ao${BAKE_VERSION}|${settings.rays}|${settings.distance}|${settings.maxEdge}`,
  );
  h.word(meshes.length);
  const mm = 1000 / unit;
  for (const mesh of meshes) {
    h.word(mesh.receiver ? 1 : 0);
    h.word(mesh.positions.length);
    for (let i = 0; i < mesh.positions.length; i++)
      h.word(Math.round(mesh.positions[i] * mm));
    for (let i = 0; i < mesh.normals.length; i++)
      h.word(Math.round(mesh.normals[i] * 127));
    const index = mesh.index;
    h.word(index ? index.length : -1);
    if (index) for (let i = 0; i < index.length; i++) h.word(index[i]);
  }
  return h.digest();
}

/** Non-indexed triangles: three floats a vertex for positions and normals, two for uvs. */
export interface TriangleSoup {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array | null;
}

/**
 * Split every triangle with an edge longer than `maxEdge` (scene units) at
 * the midpoints of its long edges, again and again until none is longer.
 * Whether an edge is split depends on that edge alone, so two triangles
 * sharing an edge split it alike and no crack (T-junction) opens between
 * them: a large wall becomes a fine mesh, a small fitting is left as it is.
 * Normals and uvs are interpolated (normals renormalised). Stops splitting
 * once the result would pass `maxTriangles`, returning what it has.
 */
export function subdivideLongEdges(
  soup: TriangleSoup,
  maxEdge: number,
  maxTriangles = 400_000,
): TriangleSoup {
  const stride = soup.uvs ? 8 : 6;
  const count = soup.positions.length / 9;
  const vertex = (t: number, k: number) => {
    const v = new Float64Array(stride);
    const p = (t * 3 + k) * 3;
    v[0] = soup.positions[p];
    v[1] = soup.positions[p + 1];
    v[2] = soup.positions[p + 2];
    v[3] = soup.normals[p];
    v[4] = soup.normals[p + 1];
    v[5] = soup.normals[p + 2];
    if (soup.uvs) {
      const u = (t * 3 + k) * 2;
      v[6] = soup.uvs[u];
      v[7] = soup.uvs[u + 1];
    }
    return v;
  };
  const max2 = maxEdge * maxEdge;
  const long = (a: Float64Array, b: Float64Array) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 > max2;
  const mid = (a: Float64Array, b: Float64Array) => {
    const m = new Float64Array(stride);
    for (let i = 0; i < stride; i++) m[i] = (a[i] + b[i]) / 2;
    const l = Math.hypot(m[3], m[4], m[5]) || 1;
    m[3] /= l;
    m[4] /= l;
    m[5] /= l;
    return m;
  };
  const out: Float64Array[] = [];
  let triangles = count;
  const stack: Float64Array[][] = [];
  for (let t = count - 1; t >= 0; t--)
    stack.push([vertex(t, 0), vertex(t, 1), vertex(t, 2)]);
  while (stack.length) {
    const [a, b, c] = stack.pop()!;
    const ab = long(a, b);
    const bc = long(b, c);
    const ca = long(c, a);
    const splits = Number(ab) + Number(bc) + Number(ca);
    if (!splits || triangles + splits > maxTriangles) {
      out.push(a, b, c);
      continue;
    }
    triangles += splits;
    // Children in order, winding kept; pushed reversed so they come out in order.
    const children: Float64Array[][] = [];
    if (splits === 3) {
      const mab = mid(a, b);
      const mbc = mid(b, c);
      const mca = mid(c, a);
      children.push(
        [a, mab, mca],
        [mab, b, mbc],
        [mca, mbc, c],
        [mab, mbc, mca],
      );
    } else if (splits === 1) {
      if (ab) {
        const m = mid(a, b);
        children.push([a, m, c], [m, b, c]);
      } else if (bc) {
        const m = mid(b, c);
        children.push([a, b, m], [a, m, c]);
      } else {
        const m = mid(c, a);
        children.push([a, b, m], [m, b, c]);
      }
    } else {
      // Two long edges: split both, and the quad left by the corner between.
      const [p, q, r] = !ab
        ? [c, a, b] // corner c: edges c-a and b-c
        : !bc
          ? [a, b, c] // corner a: edges a-b and c-a
          : [b, c, a]; // corner b: edges b-c and a-b
      // The corner p's two edges p-q and r-p are long; q-r is not.
      const mpq = mid(p, q);
      const mrp = mid(r, p);
      children.push([p, mpq, mrp], [mpq, q, r], [mpq, r, mrp]);
    }
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]);
  }
  const n = out.length;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const uvs = soup.uvs ? new Float32Array(n * 2) : null;
  for (let i = 0; i < n; i++) {
    const v = out[i];
    positions.set([v[0], v[1], v[2]], i * 3);
    normals.set([v[3], v[4], v[5]], i * 3);
    if (uvs) uvs.set([v[6], v[7]], i * 2);
  }
  return { positions, normals, uvs };
}
