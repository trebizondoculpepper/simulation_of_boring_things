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
export const BAKE_VERSION = 4;

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
  // A word at a time (not byte by byte): a room's hundreds of thousands
  // of vertices hash in milliseconds.
  const word = (value: number) => {
    a = Math.imul(a ^ value, 0x01000193);
    b = Math.imul(b ^ value, 0x5bd1e995);
    b ^= b >>> 15;
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
  /** Which triangles may be split (1) and which are kept whole (0); all may, if not given. */
  mask?: Uint8Array,
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
  const whole: boolean[] = [];
  for (let t = count - 1; t >= 0; t--) {
    stack.push([vertex(t, 0), vertex(t, 1), vertex(t, 2)]);
    whole.push(Boolean(mask && !mask[t]));
  }
  while (stack.length) {
    const [a, b, c] = stack.pop()!;
    if (whole.pop()) {
      out.push(a, b, c);
      continue;
    }
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
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
      whole.push(false);
    }
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

/**
 * Spread a subdivision mask (`subdivideLongEdges`) across shared long
 * edges to coplanar neighbours, until it settles: two triangles of one
 * flat face then split their shared edge alike, so no crack opens between
 * them. Triangles are consecutive triples of `positions`; `maxEdge` as
 * for the subdivision. Changes `mask` in place and returns it.
 */
export function spreadSubdivision(
  positions: Float32Array,
  normals: Float32Array,
  mask: Uint8Array,
  maxEdge: number,
): Uint8Array {
  const count = positions.length / 9;
  const key = (i: number) =>
    `${Math.round(positions[i * 3] * 1e4)},${Math.round(positions[i * 3 + 1] * 1e4)},${Math.round(positions[i * 3 + 2] * 1e4)}`;
  const edges = new Map<string, number[]>();
  const edgeKey = (a: number, b: number) => {
    const ka = key(a);
    const kb = key(b);
    return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
  };
  const max2 = maxEdge * maxEdge;
  const long = (a: number, b: number) =>
    (positions[a * 3] - positions[b * 3]) ** 2 +
      (positions[a * 3 + 1] - positions[b * 3 + 1]) ** 2 +
      (positions[a * 3 + 2] - positions[b * 3 + 2]) ** 2 >
    max2;
  const triEdges: string[][] = [];
  for (let t = 0; t < count; t++) {
    const list: string[] = [];
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      const va = t * 3 + a;
      const vb = t * 3 + b;
      if (!long(va, vb)) continue;
      const k = edgeKey(va, vb);
      list.push(k);
      let on = edges.get(k);
      if (!on) edges.set(k, (on = []));
      on.push(t);
    }
    triEdges.push(list);
  }
  const normalOf = (t: number) => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = 0; k < 3; k++) {
      x += normals[(t * 3 + k) * 3];
      y += normals[(t * 3 + k) * 3 + 1];
      z += normals[(t * 3 + k) * 3 + 2];
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
  const todo: number[] = [];
  for (let t = 0; t < count; t++) if (mask[t]) todo.push(t);
  while (todo.length) {
    const t = todo.pop()!;
    const n = normalOf(t);
    for (const k of triEdges[t])
      for (const u of edges.get(k)!) {
        if (mask[u]) continue;
        const m = normalOf(u);
        if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0.99) continue;
        mask[u] = 1;
        todo.push(u);
      }
  }
  return mask;
}

/**
 * Whether a large triangle needs subdividing, from its sample points'
 * bakes (corners, edge midpoints, centre; 0–255): not if all are buried
 * (dark) or all open (light), since the whole face is then alike.
 */
export function needsDetail(samples: ArrayLike<number>) {
  let buried = true;
  let open = true;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i] > 5) buried = false;
    if (samples[i] < 250) open = false;
  }
  return !buried && !open;
}

/** Rays a vertex for a room of `triangles`: fewer for big rooms, to bake them sooner. */
export const raysFor = (triangles: number, rays = 32) =>
  triangles > 20_000 ? Math.min(rays, 16) : rays;

/**
 * One pass of smoothing over a non-indexed mesh's vertex bakes: each
 * place takes the mean of itself and its neighbours along the triangles'
 * edges (vertices at the same place and normal count as one), so a few
 * rays' noise is evened out. A `buried` place (inside a flange or a wall)
 * counts for nothing and takes its unburied neighbours' mean, or stays
 * unoccluded if it has none, so a part's buried end never darkens the
 * whole of a long face reaching from it. Returns a new array.
 */
export function smoothVertexAo(
  positions: Float32Array,
  normals: Float32Array,
  ao: Uint8Array,
  buried?: Uint8Array,
): Uint8Array {
  const n = ao.length;
  const q = (v: number) => Math.round(v * 1e4);
  const ids = new Map<string, number>();
  const idOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = `${q(positions[i * 3])},${q(positions[i * 3 + 1])},${q(positions[i * 3 + 2])},${Math.round(normals[i * 3] * 100)},${Math.round(normals[i * 3 + 1] * 100)},${Math.round(normals[i * 3 + 2] * 100)}`;
    let id = ids.get(k);
    if (id === undefined) ids.set(k, (id = ids.size));
    idOf[i] = id;
  }
  const places = ids.size;
  const own = new Float64Array(places);
  const known = new Uint8Array(places);
  for (let i = 0; i < n; i++) {
    own[idOf[i]] = ao[i];
    known[idOf[i]] = buried?.[i] ? 0 : 1;
  }
  const sum = new Float64Array(places);
  const weight = new Float64Array(places);
  for (let k = 0; k < places; k++)
    if (known[k]) {
      sum[k] = own[k];
      weight[k] = 1;
    }
  const seen = new Set<number>();
  for (let t = 0; t + 2 < n; t += 3)
    for (const [a, b] of [
      [t, t + 1],
      [t + 1, t + 2],
      [t + 2, t],
    ]) {
      const ia = idOf[a];
      const ib = idOf[b];
      if (ia === ib) continue;
      const pair = ia < ib ? ia * places + ib : ib * places + ia;
      if (seen.has(pair)) continue;
      seen.add(pair);
      if (known[ib]) {
        sum[ia] += own[ib];
        weight[ia]++;
      }
      if (known[ia]) {
        sum[ib] += own[ia];
        weight[ib]++;
      }
    }
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++)
    out[i] = weight[idOf[i]] ? Math.round(sum[idOf[i]] / weight[idOf[i]]) : 255;
  return out;
}
