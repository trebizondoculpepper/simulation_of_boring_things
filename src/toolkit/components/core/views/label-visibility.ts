import { Vector3 } from 'three';
import type { Camera, Material, Mesh, WebGLRenderer } from 'three';
import { METRE } from '../logic/units';

/** Fade printed lettering according to its actual cap height on screen. */
export function labelOpacity(pixels: number): number {
  const t = Math.max(0, Math.min(1, (pixels - 5) / 7));
  return t * t * (3 - 2 * t);
}

const top = new Vector3();
const bottom = new Vector3();
const eye = new Vector3();
const middle = new Vector3();

/**
 * How much further off small lettering stays readable, metres (the owner,
 * 2026-10-25): it fades as if the camera stood this much nearer.
 */
export const LABEL_REACH = 1.5;

/**
 * A label's on-screen cap height, in pixels, as it is judged for fading:
 * as if seen `LABEL_REACH` nearer than it is (so wholly clear within that
 * distance).
 */
export function reachedLabelHeight(pixels: number, distance: number): number {
  if (distance <= LABEL_REACH) return Infinity;
  return (pixels * distance) / (distance - LABEL_REACH);
}

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
    // In metres: rooms are drawn `METRE` scene units to the metre.
    const distance =
      camera.getWorldPosition(eye).distanceTo(mesh.getWorldPosition(middle)) /
      METRE;
    material.opacity =
      baseOpacity *
      labelOpacity(
        reachedLabelHeight(
          projectedLabelHeight(mesh, camera, renderer, capHeight),
          distance,
        ),
      );
  };
}
