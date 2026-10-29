import {
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Sphere,
  Vector3,
} from 'three';
import type { Material, Object3D, Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { displayIsLive, displayKindOf } from './display-reach';

const isLive = displayIsLive;

/**
 * A model's far version (the owner, 2026-10-29: "no textures, just flat
 * colours, no working screens, just the approximate shape"): every
 * visible, opaque mesh under `root` above `minRadius` (its bounding
 * sphere's, in `root`'s units), baked where it is now, merged into one
 * mesh for each of a few flat colours. Screens show as dark glass, and
 * changing printed canvases (a chart, a dial face) are left out; static
 * signs are kept as they are (the owner, 2026-10-29), one draw each; glass
 * and other see-through parts, lines, points and sprites are left out. It draws in a handful of calls however
 * many parts the model has, shows nothing that moves or changes, and is
 * placed as `root` is: add it to `root`'s parent.
 */
export function createFarVersion(
  root: Object3D,
  { minRadius = 0.03, name = `${root.name || 'Model'} (far)` } = {},
) {
  const group = new Group();
  group.name = name;
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const byColour = new Map<number, BufferGeometry[]>();
  const matrix = new Matrix4();
  const instance = new Matrix4();
  const sphere = new Sphere();
  const scale = new Vector3();

  const materials: Material[] = [];
  const take = (mesh: Mesh, at: Matrix4) => {
    const geometry = mesh.geometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    sphere.copy(geometry.boundingSphere!);
    scale.setFromMatrixScale(at);
    if (sphere.radius * Math.max(scale.x, scale.y, scale.z) < minRadius) return;
    // A static sign is kept as it is, its picture and all (the owner,
    // 2026-10-29: static signs should always be visible): it never
    // changes, so it costs one draw and nothing more.
    if (isSign(mesh.material)) {
      const own = [mesh.material].flat().map((m) => {
        const copy = m.clone();
        copy.opacity = 1;
        materials.push(copy);
        return copy;
      });
      const sign = new Mesh(geometry, own.length === 1 ? own[0] : own);
      sign.matrixAutoUpdate = false;
      sign.matrix.copy(at);
      sign.name = `${mesh.name} (far)`;
      signs.push(sign);
      return;
    }
    const colour = flatColour(mesh.material);
    if (colour === null) return;
    const baked = bare(geometry).applyMatrix4(at);
    let list = byColour.get(colour);
    if (!list) byColour.set(colour, (list = []));
    list.push(baked);
  };

  const signs: Mesh[] = [];
  root.traverseVisible((object) => {
    if (object instanceof InstancedMesh) {
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, instance);
        matrix.multiplyMatrices(toRoot, object.matrixWorld).multiply(instance);
        take(object, matrix);
      }
      return;
    }
    if (!(object instanceof Mesh)) return;
    matrix.multiplyMatrices(toRoot, object.matrixWorld);
    take(object, matrix);
  });

  for (const [colour, geometries] of byColour) {
    const merged = mergeGeometries(geometries, false);
    for (const g of geometries) g.dispose();
    if (!merged) continue;
    const material = new MeshLambertMaterial({ color: colour });
    materials.push(material);
    const mesh = new Mesh(merged, material);
    mesh.name = `${name}: ${new Color(colour).getHexString()}`;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  for (const sign of signs) group.add(sign);
  // Where `root` is, in its parent's frame.
  root.updateMatrix();
  group.matrix.copy(root.matrix);
  group.matrixAutoUpdate = false;
  return {
    group,
    materials,
    dispose() {
      for (const child of group.children)
        if (child instanceof Mesh && !signs.includes(child))
          child.geometry.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

/**
 * Whether a mesh is a static sign: drawn from a canvas that is not a
 * screen (printed lettering, a label, a poster, made by
 * `createCanvasTexture` as `printed` or straight as a `CanvasTexture`)
 * that has not changed since it was first drawn.
 */
function isSign(material: Material | Material[]) {
  return [material].flat().some((m) =>
    [
      (m as { map?: Texture | null }).map,
      (m as { emissiveMap?: Texture | null }).emissiveMap,
    ].some((t) => {
      if (!(t as { isCanvasTexture?: boolean } | null)?.isCanvasTexture)
        return false;
      const kind = displayKindOf(t!);
      return (kind === undefined || kind === 'printed') && !isLive(t!);
    }),
  );
}

/** Dark glass, for any screen or canvas. */
const SCREEN = 0x1c1f22;
const colour = new Color();

/**
 * A material's flat colour, its channels rounded to eight levels so the
 * many near-alike paints of a model merge together; null if it is
 * see-through or not a surface.
 */
function flatColour(material: Material | Material[]): number | null {
  const m = (Array.isArray(material) ? material[0] : material) as
    | (Material & {
        color?: Color;
        map?: Texture | null;
        emissiveMap?: Texture | null;
      })
    | undefined;
  if (!m || !m.visible) return null;
  if (m.transparent && m.opacity < 0.9) return null;
  for (const t of [m.map, m.emissiveMap]) {
    if (!(t as { isCanvasTexture?: boolean } | null)?.isCanvasTexture) continue;
    const kind = displayKindOf(t!);
    return kind && kind !== 'printed' && kind !== 'ui' ? SCREEN : null;
  }
  colour.copy(m.color ?? new Color(0x808080));
  const q = (c: number) => Math.round(c * 7) / 7;
  colour.setRGB(q(colour.r), q(colour.g), q(colour.b));
  return colour.getHex();
}

/** Its positions and normals only, unindexed, so any two merge. */
function bare(geometry: BufferGeometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const out = new BufferGeometry();
  out.setAttribute('position', source.getAttribute('position').clone());
  const normal = source.getAttribute('normal');
  if (normal) out.setAttribute('normal', normal.clone());
  else out.computeVertexNormals();
  if (source !== geometry) source.dispose();
  return out;
}
