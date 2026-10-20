/*
 * A port to TypeScript of ThreeVolumetricFire (src/ThreeVolumetricFire.js,
 * https://github.com/Housz/ThreeVolumetricFire, fetched 19 October 2026),
 * itself a port of yomotsu/VolumetricFire, after Fuller et al., "Real-time
 * procedural volumetric fire" (2007). Its noise and profile textures are
 * in ../assets/volumetric-fire/. Changed here: types, the textures loaded
 * and filtered as its demo does, the camera passed to `update`, and the
 * debugging lattice left out.
 *
 * MIT License
 *
 * Copyright (c) 2025 Housz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ClampToEdgeWrapping,
  DoubleSide,
  DynamicDrawUsage,
  LinearFilter,
  Matrix4,
  Mesh,
  Quaternion,
  RawShaderMaterial,
  RepeatWrapping,
  TextureLoader,
  Vector3,
  Vector4,
} from 'three';
import type { Camera, Texture } from 'three';

const vertexShader = /* glsl */ `
  attribute vec3 position;
  attribute vec3 tex;
  uniform mat4 projectionMatrix;
  uniform mat4 modelViewMatrix;
  varying vec3 texOut;
  void main(void) {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    texOut = tex;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float time;
  uniform sampler2D nzw;
  uniform sampler2D fireProfile;
  uniform float magnitude;
  uniform float lacunarity;
  uniform float gain;
  uniform float level;
  uniform vec4 noiseScale;

  vec2 mBBS(vec2 val, float modulus) {
    val = mod(val, modulus);
    return mod(val * val, modulus);
  }
  const float modulus = 61.0;

  float mnoise(vec3 pos) {
    float intArg = floor(pos.z);
    float fracArg = fract(pos.z);
    vec2 hash = mBBS(intArg * 3.0 + vec2(0, 3), modulus);
    vec4 g = vec4(
      texture2D(nzw, vec2(pos.x, pos.y + hash.x) / modulus).xy,
      texture2D(nzw, vec2(pos.x, pos.y + hash.y) / modulus).xy
    ) * 2.0 - 1.0;
    return mix(g.x + g.y * fracArg, g.z + g.w * (fracArg - 1.0), smoothstep(0.0, 1.0, fracArg));
  }

  float turbulence(vec3 pos) {
    float sum = 0.0;
    float freq = 1.0;
    float amp = 1.0;
    for (int i = 0; i < 4; i++) {
      sum += abs(mnoise(pos * freq)) * amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sum;
  }

  vec4 sampleFire(vec3 loc, vec4 scale) {
    loc.xz = loc.xz * 2.0 - 1.0;
    vec2 st = vec2(sqrt(dot(loc.xz, loc.xz)), loc.y);
    loc.y -= time * scale.w;
    loc *= scale.xyz;
    float offset = sqrt(st.y) * magnitude * turbulence(loc);
    st.y += offset;
    if (st.y > 1.0) return vec4(0.0);
    vec4 result = texture2D(fireProfile, st);
    if (st.y < 0.1) result *= st.y / 0.1;
    return result;
  }

  varying vec3 texOut;
  void main(void) {
    vec4 color = sampleFire(texOut, noiseScale);
    gl_FragColor = vec4(color.rgb * 1.5 * level, color.a * level);
  }
`;

/** Textures shared by every volumetric fire, loaded once. */
let textures: { noise: Texture; profile: Texture } | null = null;
function fireTextures() {
  if (textures) return textures;
  const loader = new TextureLoader();
  const load = (name: string) =>
    loader.load(
      new URL(`../assets/volumetric-fire/${name}.png`, import.meta.url).href,
    );
  const noise = load('noise');
  noise.wrapS = noise.wrapT = RepeatWrapping;
  // Mipmaps garble the noise into speckles: filtered, not mipmapped.
  noise.minFilter = noise.magFilter = LinearFilter;
  noise.generateMipmaps = false;
  const profile = load('profile');
  profile.wrapS = profile.wrapT = ClampToEdgeWrapping;
  profile.minFilter = profile.magFilter = LinearFilter;
  profile.generateMipmaps = false;
  textures = { noise, profile };
  return textures;
}

interface ControlPoint {
  pos: Vector3;
  scale: Vector3;
  rot: Quaternion;
}

interface Edge {
  sIdx: number;
  eIdx: number;
  dPos: Vector3;
  dTex: Vector3;
  pos: Vector3;
  tex: Vector3;
  prev: number;
  next: number;
  expired: boolean;
}

class PriorityQueue<T> {
  contents: { object: T; priority: number }[] = [];
  sorted = false;
  sort() {
    this.contents.sort((a, b) => a.priority - b.priority);
    this.sorted = true;
  }
  pop() {
    if (!this.sorted) this.sort();
    return this.contents.pop()!;
  }
  top() {
    if (!this.sorted) this.sort();
    return this.contents[this.contents.length - 1];
  }
  push(object: T, priority: number) {
    this.contents.push({ object, priority });
    this.sorted = false;
  }
}

const CORNER_NEIGHBOURS = [
  [1, 2, 4],
  [0, 5, 3],
  [0, 3, 6],
  [1, 7, 2],
  [0, 6, 5],
  [1, 4, 7],
  [2, 7, 4],
  [3, 5, 6],
];
const INCOMING_EDGES = [
  [-1, 2, 4, -1, 1, -1, -1, -1],
  [5, -1, -1, 0, -1, 3, -1, -1],
  [3, -1, -1, 6, -1, -1, 0, -1],
  [-1, 7, 1, -1, -1, -1, -1, 2],
  [6, -1, -1, -1, -1, 0, 5, -1],
  [-1, 4, -1, -1, 7, -1, -1, 1],
  [-1, -1, 7, -1, 2, -1, -1, 4],
  [-1, -1, -1, 5, -1, 6, 3, -1],
];

/**
 * Volumetric fire: a box of procedural flame (turbulence noise read
 * through a colour profile), drawn as slices across it turned square to
 * the camera, recut on the CPU every frame (`update`), added to what is
 * behind it. One draw call. Its middle is at its origin; it is `width` by
 * `height` by `depth` in its own units, and its shape can follow a spline
 * (`setControlPoints`). Smaller `sliceSpacing` is smoother and dearer.
 * `level` (0 to 1) dims it out.
 */
export class VolumetricFire extends Mesh<BufferGeometry, RawShaderMaterial> {
  private sliceSpacing: number;
  private segments: number;
  private viewVector = new Vector3();
  private posCurve = new CatmullRomCurve3();
  private controlPoints: ControlPoint[] = [];

  constructor({
    width = 1,
    height = 2,
    depth = 1,
    sliceSpacing = 0.1,
    segments = 32,
  }: {
    width?: number;
    height?: number;
    depth?: number;
    sliceSpacing?: number;
    segments?: number;
  } = {}) {
    const { noise, profile } = fireTextures();
    const maxVerts = segments * 300 * 6;
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(maxVerts * 3), 3).setUsage(
        DynamicDrawUsage,
      ),
    );
    geometry.setAttribute(
      'tex',
      new BufferAttribute(new Float32Array(maxVerts * 3), 3).setUsage(
        DynamicDrawUsage,
      ),
    );
    geometry.setIndex(new BufferAttribute(new Uint32Array(maxVerts), 1));
    const material = new RawShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        nzw: { value: noise },
        fireProfile: { value: profile },
        time: { value: 0 },
        magnitude: { value: 1.3 },
        lacunarity: { value: 2 },
        gain: { value: 0.5 },
        level: { value: 1 },
        noiseScale: { value: new Vector4(1, 2, 1, 0.3) },
      },
      side: DoubleSide,
      blending: AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    super(geometry, material);
    this.name = 'Volumetric fire';
    this.frustumCulled = false;
    this.raycast = () => {};
    this.sliceSpacing = sliceSpacing;
    this.segments = segments;
    this.posCurve.curveType = 'centripetal';
    this.setRectangularShape(width, height, depth);
  }

  /** A plain upright column. */
  setRectangularShape(width: number, height: number, depth: number) {
    const half = height / 2;
    const scale = new Vector3(width, 1, depth);
    this.setControlPoints(
      [-half, 0, half].map((y) => ({
        pos: new Vector3(0, y, 0),
        scale: scale.clone(),
        rot: new Quaternion(),
      })),
    );
  }

  /** Bend it along a spline: positions, scales and turns, bottom to top. */
  setControlPoints(points: ControlPoint[]) {
    this.controlPoints = points;
    this.posCurve.points = points.map((p) => p.pos);
    this.posCurve.updateArcLengths();
  }

  /** How bright it is, 0 (out) to 1. */
  set level(value: number) {
    this.material.uniforms.level.value = value;
    this.visible = value > 0.001;
  }

  /** Run it on to `elapsed` seconds and recut its slices for `camera`. */
  update(elapsed: number, camera: Camera) {
    this.material.uniforms.time.value = elapsed;
    if (!this.visible) return;
    const modelView = new Matrix4().multiplyMatrices(
      camera.matrixWorldInverse,
      this.matrixWorld,
    );
    const e = modelView.elements;
    this.viewVector.set(-e[2], -e[6], -e[10]).normalize();
    this.slice();
  }

  private stateAt(t: number) {
    const points = this.controlPoints;
    const point = t * (points.length - 1);
    let i0 = Math.floor(point);
    let i1 = i0 + 1;
    let weight = point - i0;
    if (i1 >= points.length) {
      i0 = i1 = points.length - 1;
      weight = 0;
    }
    const pos = this.posCurve.getPoint(t);
    const scale = new Vector3().lerpVectors(
      points[i0].scale,
      points[i1].scale,
      weight,
    );
    const quat = points[i0].rot.clone().slerp(points[i1].rot, weight);
    return { pos, scale, quat };
  }

  private slice() {
    const positions: number[] = [];
    const texCoords: number[] = [];
    const indices: number[] = [];
    const rings: Vector3[][] = [];
    for (let i = 0; i <= this.segments; i++) {
      const t = this.posCurve.getUtoTmapping(i / this.segments, 0);
      const state = this.stateAt(t);
      const hw = state.scale.x * 0.5;
      const hd = state.scale.z * 0.5;
      rings.push(
        [
          new Vector3(-hw, 0, -hd),
          new Vector3(hw, 0, -hd),
          new Vector3(hw, 0, hd),
          new Vector3(-hw, 0, hd),
        ].map((v) => v.applyQuaternion(state.quat).add(state.pos)),
      );
    }
    let vertexOffset = 0;
    for (let s = 0; s < this.segments; s++) {
      const r1 = rings[s];
      const r2 = rings[s + 1];
      const corners = [r1[0], r1[1], r2[0], r2[1], r1[3], r1[2], r2[3], r2[2]];
      const uv0 = s / this.segments;
      const uv1 = (s + 1) / this.segments;
      const texs = [
        new Vector3(0, uv0, 0),
        new Vector3(1, uv0, 0),
        new Vector3(0, uv1, 0),
        new Vector3(1, uv1, 0),
        new Vector3(0, uv0, 1),
        new Vector3(1, uv0, 1),
        new Vector3(0, uv1, 1),
        new Vector3(1, uv1, 1),
      ];
      const result = this.sliceHexahedron(corners, texs, vertexOffset);
      for (const v of result.p) positions.push(v);
      for (const v of result.t) texCoords.push(v);
      for (const v of result.i) indices.push(v);
      vertexOffset = result.nextIndex;
    }
    const geometry = this.geometry;
    const position = geometry.attributes.position as BufferAttribute;
    if (positions.length > position.array.length) return;
    geometry.index!.array.set(indices);
    position.array.set(positions);
    (geometry.attributes.tex as BufferAttribute).array.set(texCoords);
    geometry.index!.needsUpdate = true;
    position.needsUpdate = true;
    geometry.attributes.tex.needsUpdate = true;
    geometry.setDrawRange(0, indices.length);
  }

  private sliceHexahedron(
    corners: Vector3[],
    texCoords: Vector3[],
    startIndex: number,
  ) {
    const spacing = this.sliceSpacing;
    const cornerDist = corners.map((v) => v.dot(this.viewVector));
    const minD = Math.min(...cornerDist);
    const maxD = Math.max(...cornerDist);
    const maxCorner = cornerDist.indexOf(maxD);
    let sliceD = Math.floor(maxD / spacing) * spacing;
    const activeEdges: Edge[] = [];
    let nextEdge = 0;
    const expirations = new PriorityQueue<Edge>();
    const createEdge = (sIdx: number, eIdx: number) => {
      if (nextEdge >= 12) return undefined;
      const edge: Edge = {
        sIdx,
        eIdx,
        dPos: new Vector3(),
        dTex: new Vector3(),
        pos: new Vector3(),
        tex: new Vector3(),
        prev: 0,
        next: 0,
        expired: false,
      };
      const range = cornerDist[sIdx] - cornerDist[eIdx];
      if (Math.abs(range) > 1e-5) {
        const ir = 1 / range;
        edge.dPos.subVectors(corners[eIdx], corners[sIdx]).multiplyScalar(ir);
        edge.dTex
          .subVectors(texCoords[eIdx], texCoords[sIdx])
          .multiplyScalar(ir);
        const step = cornerDist[sIdx] - sliceD;
        edge.pos.addVectors(
          edge.dPos.clone().multiplyScalar(step),
          corners[sIdx],
        );
        edge.tex.addVectors(
          edge.dTex.clone().multiplyScalar(step),
          texCoords[sIdx],
        );
        edge.dPos.multiplyScalar(spacing);
        edge.dTex.multiplyScalar(spacing);
      }
      expirations.push(edge, cornerDist[eIdx]);
      activeEdges[nextEdge++] = edge;
      return edge;
    };
    for (let i = 0; i < 3; i++) {
      const e = createEdge(maxCorner, CORNER_NEIGHBOURS[maxCorner][i])!;
      e.prev = (i + 2) % 3;
      e.next = (i + 1) % 3;
    }
    const p: number[] = [];
    const t: number[] = [];
    const idx: number[] = [];
    let nextIndex = startIndex;
    let firstEdge = 0;
    while (sliceD > minD) {
      while (
        expirations.contents.length > 0 &&
        expirations.top().priority >= sliceD
      ) {
        const edge = expirations.pop().object;
        if (edge.expired) continue;
        if (!activeEdges[edge.prev] || !activeEdges[edge.next]) continue;
        if (
          edge.eIdx !== activeEdges[edge.prev].eIdx &&
          edge.eIdx !== activeEdges[edge.next].eIdx
        ) {
          // Split the edge.
          edge.expired = true;
          const e1 = createEdge(
            edge.eIdx,
            INCOMING_EDGES[edge.eIdx][edge.sIdx],
          );
          if (!e1) break;
          e1.prev = edge.prev;
          activeEdges[edge.prev].next = nextEdge - 1;
          e1.next = nextEdge;
          const e2 = createEdge(edge.eIdx, INCOMING_EDGES[edge.eIdx][e1.eIdx]);
          if (!e2) break;
          e2.prev = nextEdge - 2;
          e2.next = edge.next;
          activeEdges[edge.next].prev = nextEdge - 1;
          activeEdges[e2.next].prev = nextEdge - 1;
          firstEdge = nextEdge - 1;
        } else {
          // Merge two edges.
          let prev: Edge;
          let next: Edge;
          if (edge.eIdx === activeEdges[edge.prev].eIdx) {
            prev = activeEdges[edge.prev];
            next = edge;
          } else {
            prev = edge;
            next = activeEdges[edge.next];
          }
          if (!prev || !next) continue;
          prev.expired = true;
          next.expired = true;
          const merged = createEdge(
            edge.eIdx,
            INCOMING_EDGES[edge.eIdx][prev.sIdx],
          );
          if (!merged) break;
          merged.prev = prev.prev;
          if (activeEdges[prev.prev])
            activeEdges[prev.prev].next = nextEdge - 1;
          merged.next = next.next;
          if (activeEdges[next.next])
            activeEdges[next.next].prev = nextEdge - 1;
          firstEdge = nextEdge - 1;
        }
      }
      let cur = firstEdge;
      let count = 0;
      let guard = 0;
      while (guard++ < 15) {
        const ae = activeEdges[cur];
        if (!ae) break;
        p.push(ae.pos.x, ae.pos.y, ae.pos.z);
        t.push(ae.tex.x, ae.tex.y, ae.tex.z);
        ae.pos.add(ae.dPos);
        ae.tex.add(ae.dTex);
        cur = ae.next;
        count++;
        if (cur === firstEdge) break;
      }
      if (count >= 3) {
        for (let i = 2; i < count; i++)
          idx.push(nextIndex, nextIndex + i - 1, nextIndex + i);
        nextIndex += count;
      }
      sliceD -= spacing;
    }
    return { p, t, i: idx, nextIndex };
  }
}
