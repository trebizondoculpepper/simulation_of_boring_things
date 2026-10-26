import {
  CubeCamera,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Vector3,
  WebGLCubeRenderTarget,
} from 'three';
import type { Material, Object3D, Texture } from 'three';

/**
 * A reflective surface's view of its room (the owner, 2026-10-26): the
 * room as it is, captured once from just in front of the surface, so a
 * sight glass's pane shows its real lights, walls and plant at their real
 * distances, not a stand-in studio's. Self-contained: a tiny hidden marker
 * on the surface learns the renderer and scene the first times it is
 * drawn, and a few frames on (once the room is built) the capture is
 * taken between frames and given to the surface's materials.
 */
export function attachRoomReflection(
  owner: Object3D,
  materials: readonly (Material & { envMap?: Texture | null })[],
  // Small, so it is soft: stretched over the surface, a 40 px capture
  // blurs the room as a thick glass would, and costs less than a sharp one
  // (the owner, 2026-10-26).
  { size = 40, out = 0.05, frames = 4 } = {},
) {
  const target = new WebGLCubeRenderTarget(size, { type: HalfFloatType });
  const marker = new Mesh(
    new PlaneGeometry(0.0001, 0.0001),
    new MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
  );
  marker.frustumCulled = false;
  owner.add(marker);
  let seen = 0;
  let taken = false;
  marker.onBeforeRender = (renderer, scene) => {
    if (taken || ++seen < frames) return;
    taken = true;
    // Between frames, not inside this one's render.
    setTimeout(() => {
      const at = owner.localToWorld(new Vector3(0, 0, out));
      const scale = owner.getWorldScale(new Vector3()).x || 1;
      const camera = new CubeCamera(0.01 * scale, 200 / scale, target);
      camera.position.copy(at);
      const shown = owner.visible;
      owner.visible = false;
      camera.update(renderer, scene);
      owner.visible = shown;
      for (const m of materials) {
        m.envMap = target.texture;
        m.needsUpdate = true;
      }
    }, 0);
  };
  return () => target.dispose();
}
