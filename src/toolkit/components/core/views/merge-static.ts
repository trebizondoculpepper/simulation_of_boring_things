import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from 'three';
import type { Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Flatten a static set piece built from many small meshes into a few: all
 * its meshes in the same material within the same `cell` (metres, in its
 * own frame) become one mesh. A drum fan of a hundred parts draws in three
 * or four calls; an office's furniture draws desk by desk rather than
 * part by part, so a distant desk can still be culled on its own. Meshes
 * listed in `keep` (things a click works, or that move) are left alone,
 * as are instanced meshes and sprites. Works in place on `root`; returns
 * the merged meshes. `root`'s world matrix must be current.
 *
 * `keepIf` keeps, with everything under it, any object it is true of (an
 * object something will reach for later); `originals` is given the meshes
 * that were merged away, so a development check can tell if anything
 * still changes them (`watchMerged`). With `share`, materials alike in
 * every respect (`likeness`) count as one, so the many separately made
 * copies of one paint merge together. Merged meshes are passed through by
 * picking up and dropping (`noCollision`), unless `solid`. With `fine`,
 * a list of sizes (radii, in `root`'s units, smallest first), pieces are
 * merged by size, those under each size apart from larger ones, each such
 * mesh saying how big its biggest piece is (`userData.pieceRadius`), so
 * it can be culled once its pieces are too small to see however far they
 * spread (`createDetailCuller`).
 *
 * Meshes within a `targets` object (a part a click works) are merged too,
 * but also left where they were, hidden, for a click to find: a raycaster
 * does not care whether a mesh is shown, so the part takes its clicks as
 * before, and its merged copy is passed over by clicks so as not to stand
 * in front of them.
 */
export function mergeStatic(
  root: Object3D,
  cell = 3,
  keep: ReadonlySet<Object3D> = new Set(),
  {
    keepIf,
    originals: report,
    share = false,
    solid = false,
    targets,
    fine = [],
  }: {
    keepIf?: (object: Object3D) => boolean;
    originals?: (meshes: readonly Mesh[]) => void;
    share?: boolean;
    solid?: boolean;
    targets?: ReadonlySet<Object3D>;
    fine?: readonly number[];
  } = {},
) {
  root.updateMatrixWorld(true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map<
    string,
    {
      material: Material;
      parts: BufferGeometry[];
      target: boolean;
      fine: boolean;
      pieceRadius: number;
    }
  >();
  const originals: Mesh[] = [];
  const kept = (mesh: Object3D) => {
    for (let o: Object3D | null = mesh; o && o !== root; o = o.parent)
      if (keep.has(o) || keepIf?.(o)) return true;
    return false;
  };
  const targeted = (mesh: Object3D) => {
    if (!targets) return false;
    for (let o: Object3D | null = mesh; o && o !== root; o = o.parent)
      if (targets.has(o)) return true;
    return false;
  };
  const clickTargets = new Set<Mesh>();
  const centre = new Vector3();
  const ids = new Map<Material | string, number>();
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object instanceof InstancedMesh) return;
    // The root stays itself, whatever it is: a part's own clickable mesh.
    if (object === root) return;
    if (Array.isArray(object.material) || kept(object)) return;
    const material = object.material as Material;
    const geometry = (object.geometry as BufferGeometry).clone();
    geometry.applyMatrix4(
      new Matrix4().multiplyMatrices(toRoot, object.matrixWorld),
    );
    // Keep only what every part has, so they can be merged.
    for (const name of Object.keys(geometry.attributes))
      if (!['position', 'normal', 'uv'].includes(name))
        geometry.deleteAttribute(name);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) return;
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.computeBoundingSphere();
    centre.copy(flat.boundingSphere!.center);
    const alike = share ? likeness(material) : null;
    if (alike) object.userData.mergedLike = alike;
    const id = alike ?? material;
    if (!ids.has(id)) ids.set(id, ids.size);
    const target = targeted(object);
    if (target) clickTargets.add(object);
    const radius = flat.boundingSphere!.radius;
    const band = fine.findIndex((size) => radius < size);
    const small = band >= 0;
    const key = `${ids.get(id)}|${target ? 't' : ''}${small ? `f${band}` : ''}${Math.floor(centre.x / cell)},${Math.floor(centre.y / cell)},${Math.floor(centre.z / cell)}`;
    let entry = groups.get(key);
    if (!entry)
      groups.set(
        key,
        (entry = { material, parts: [], target, fine: small, pieceRadius: 0 }),
      );
    entry.parts.push(flat);
    entry.pieceRadius = Math.max(entry.pieceRadius, radius);
    originals.push(object);
  });
  // Where each came from, and what it hung from below `root` (whatever
  // moves those would have moved it), for `watchMerged`.
  if (report)
    for (const mesh of originals) {
      const path: string[] = [];
      for (let o: Object3D | null = mesh; o; o = o.parent)
        if (o.name) path.push(o.name);
      const via: Object3D[] = [];
      for (let o = mesh.parent; o && o !== root; o = o.parent) via.push(o);
      mesh.userData.mergedFrom = path.join(' < ') || mesh.uuid;
      mesh.userData.mergedVia = via;
    }
  for (const mesh of originals)
    if (clickTargets.has(mesh)) mesh.visible = false;
    else mesh.parent?.remove(mesh);
  const merged: Mesh[] = [];
  const holder = new Group();
  holder.name = 'Merged';
  for (const {
    material,
    parts,
    target,
    fine,
    pieceRadius,
  } of groups.values()) {
    const geometry =
      parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    if (!solid) mesh.userData.noCollision = true;
    // Clicks go to the hidden originals of what a click works.
    if (target) mesh.raycast = () => {};
    if (fine) mesh.userData.pieceRadius = pieceRadius;
    holder.add(mesh);
    merged.push(mesh);
    if (parts.length > 1) for (const p of parts) p.dispose();
  }
  root.add(holder);
  report?.(originals);
  return merged;
}

/**
 * Merge a whole built thing at once, keeping its working structure: each
 * `boundary` object (one that moves, is shown and hidden, takes a click
 * or carries data for the room) stays where it is, and the still meshes
 * within it, down to the next boundary, are merged among themselves, as
 * are those of `root` outside every boundary. A boundary moves, hides or
 * is clicked as before, its merged meshes with it. Returns the merged
 * meshes (to cull when too small to see: `createDetailCuller`).
 */
export function mergeTree(
  root: Object3D,
  boundary: (object: Object3D) => boolean,
  cell = 3,
  options: Parameters<typeof mergeStatic>[3] = {},
) {
  const bounds: Object3D[] = [];
  root.traverse((object) => {
    if (object !== root && boundary(object)) bounds.push(object);
  });
  const keep = new Set(bounds);
  return [...bounds, root].flatMap((within) =>
    mergeStatic(within, cell, keep, options),
  );
}

/**
 * Remember how merged-away meshes stood, to find any that something still
 * moves, shows, hides or repaints: such a mesh changes nothing on screen
 * once merged, so it should have been kept (`userData.live`). `check()`
 * looks now, and should be called as things happen, since a button pressed
 * and let go is back where it was by the end; `changed()` lists every mesh
 * seen changed so far.
 */
export function watchMerged(meshes: readonly Mesh[]) {
  // Each mesh, and each thing it hung from (shared by many), once.
  const poses = new Map<
    Object3D,
    {
      position: Vector3;
      quaternion: Quaternion;
      scale: Vector3;
      visible: boolean;
      meshes: Mesh[];
    }
  >();
  for (const mesh of meshes)
    for (const object of [
      mesh,
      ...((mesh.userData.mergedVia as Object3D[] | undefined) ?? []),
    ]) {
      let pose = poses.get(object);
      if (!pose)
        poses.set(
          object,
          (pose = {
            position: object.position.clone(),
            quaternion: object.quaternion.clone(),
            scale: object.scale.clone(),
            visible: object.visible,
            meshes: [],
          }),
        );
      pose.meshes.push(mesh);
    }
  const looks = meshes.map((mesh) => ({
    mesh,
    material: mesh.material,
    geometry: mesh.geometry,
  }));
  // A material merged as one of its likes must not change after: its
  // colours, opacity and visibility (the things a part changes) are
  // compared, once for each material, as numbers, for speed.
  const paint = (material: Material) => {
    const m = material as Material & {
      color?: { r: number; g: number; b: number };
      emissive?: { r: number; g: number; b: number };
    };
    return [
      m.color?.r ?? 0,
      m.color?.g ?? 0,
      m.color?.b ?? 0,
      m.emissive?.r ?? 0,
      m.emissive?.g ?? 0,
      m.emissive?.b ?? 0,
      m.opacity,
      Number(m.visible),
      Number(m.transparent),
    ];
  };
  const shared = new Map<Material, { paint: number[]; meshes: Mesh[] }>();
  for (const mesh of meshes) {
    if (!mesh.userData.mergedLike) continue;
    const material = mesh.material as Material;
    let entry = shared.get(material);
    if (!entry)
      shared.set(material, (entry = { paint: paint(material), meshes: [] }));
    entry.meshes.push(mesh);
  }
  const seen = new Set<Mesh>();
  const check = () => {
    for (const [object, pose] of poses)
      if (
        object.visible !== pose.visible ||
        !object.position.equals(pose.position) ||
        !object.quaternion.equals(pose.quaternion) ||
        !object.scale.equals(pose.scale)
      ) {
        for (const mesh of pose.meshes) seen.add(mesh);
        poses.delete(object);
      }
    for (const { mesh, material, geometry } of looks)
      if (mesh.material !== material || mesh.geometry !== geometry)
        seen.add(mesh);
    for (const [material, entry] of shared)
      if (paint(material).some((value, i) => value !== entry.paint[i])) {
        for (const mesh of entry.meshes) seen.add(mesh);
        shared.delete(material);
      }
  };
  return {
    check,
    changed() {
      check();
      return [...seen];
    },
  };
}

/** Merging is on unless the page asks for `?merge=off`, to compare. */
export const staticMergeEnabled = () =>
  new URLSearchParams(globalThis.location?.search ?? '').get('merge') !== 'off';

/** Material kinds `likeness` can compare; any other is never shared. */
const SHAREABLE = new Set([
  'MeshBasicMaterial',
  'MeshLambertMaterial',
  'MeshStandardMaterial',
]);
/** Texture slots: a material using any is never shared. */
const MAPS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
] as const;

/**
 * Everything that makes a plain material look as it does, as one string,
 * so two made separately with the same paint compare equal; null for one
 * never to be shared: textured, of another kind, or marked `live` (a
 * lamp's, whose colour a part changes to light it).
 */
export function likeness(material: Material) {
  if (material.userData.live || !SHAREABLE.has(material.type)) return null;
  const m = material as Material & Record<string, unknown>;
  if (MAPS.some((slot) => m[slot])) return null;
  const hex = (key: string) =>
    (m[key] as { getHexString(): string } | undefined)?.getHexString() ?? '';
  const ps1 = (key: string) =>
    (m.userData[key] as { value: unknown } | undefined)?.value ?? '';
  return [
    m.type,
    hex('color'),
    hex('emissive'),
    m.emissiveIntensity,
    m.metalness,
    m.roughness,
    m.flatShading,
    m.vertexColors,
    m.transparent,
    m.opacity,
    m.alphaTest,
    m.side,
    m.blending,
    m.depthTest,
    m.depthWrite,
    m.colorWrite,
    m.polygonOffset,
    m.polygonOffsetFactor,
    m.polygonOffsetUnits,
    m.toneMapped,
    m.fog,
    m.wireframe,
    m.visible,
    m.userData.ps1Glow,
    Boolean(m.userData.ps1Room),
    ps1('ps1Precision'),
    ps1('ps1Warp'),
    ps1('ps1Pi'),
  ].join('|');
}
