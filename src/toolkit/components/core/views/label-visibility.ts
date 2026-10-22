import { Vector3 } from 'three';
import type { Camera, Material, Mesh, WebGLRenderer } from 'three';

/** Fade printed lettering according to its actual cap height on screen. */
export function labelOpacity(pixels: number): number {
  const t = Math.max(0, Math.min(1, (pixels - 5) / 7));
  return t * t * (3 - 2 * t);
}

const top = new Vector3();
const bottom = new Vector3();

export function projectedLabelHeight(
  mesh: Mesh,
  camera: Camera,
  renderer: WebGLRenderer,
  capHeight: number,
): number {
  top.set(0, capHeight / 2, 0);
  bottom.set(0, -capHeight / 2, 0);
  mesh.localToWorld(top);
  mesh.localToWorld(bottom);
  top.project(camera);
  bottom.project(camera);
  return (
    (Math.hypot(top.x - bottom.x, top.y - bottom.y) *
      renderer.domElement.height) /
    2
  );
}

/** Keep a label out of static geometry merging and fade its own material. */
export function applyLabelFade<
  T extends Material & {
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
  },
>(mesh: Mesh, material: T, capHeight: number, baseOpacity = 1): void {
  material.transparent = true;
  material.depthWrite = false;
  mesh.userData.live = true;
  mesh.onBeforeRender = (renderer, _scene, camera) => {
    material.opacity =
      baseOpacity *
      labelOpacity(projectedLabelHeight(mesh, camera, renderer, capHeight));
  };
}
