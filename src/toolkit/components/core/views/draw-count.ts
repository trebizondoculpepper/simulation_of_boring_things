import { Frustum, Matrix4 } from 'three';
import type {
  Camera,
  Light,
  LightShadow,
  Material,
  Mesh,
  Object3D,
  Scene,
} from 'three';

/**
 * How many draw calls Three's WebGLRenderer makes for one frame of
 * `scene` seen by `camera`, counted as it decides them, without a GPU:
 * one for each visible mesh, line, points or sprite (each material group
 * of a multi-material mesh) that its frustum culling lets through, and
 * one more for each shadow caster inside each shadow-casting light's own
 * frustum. The draw budget tests hold rooms to a number with it.
 */
export function countDraws(scene: Scene, camera: Camera) {
  scene.updateMatrixWorld();
  camera.updateMatrixWorld();
  const view = frustumOf(camera);
  const lights: (Light & { shadow: LightShadow })[] = [];
  let main = 0;
  const casters: Object3D[] = [];
  const visit = (object: Object3D) => {
    if (!object.visible) return;
    if ((object as Light).isLight) {
      const light = object as Light & { shadow?: LightShadow };
      if (light.castShadow && light.shadow)
        lights.push(light as Light & { shadow: LightShadow });
    }
    const draws = drawsOf(object);
    if (draws > 0) {
      if (!object.frustumCulled || inside(view, object)) main += draws;
      if (object.castShadow) casters.push(object);
    }
    for (const child of object.children) visit(child);
  };
  visit(scene);
  let shadow = 0;
  for (const light of lights) {
    light.shadow.updateMatrices(light);
    // A point light's shadow is drawn six times, once for each face.
    const passes = light.shadow.getViewportCount();
    const frustum = light.shadow.getFrustum();
    for (const object of casters)
      if (!object.frustumCulled || inside(frustum, object))
        shadow += drawsOf(object) * passes;
  }
  return { main, shadow, total: main + shadow };
}

const frustumOf = (camera: Camera) =>
  new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    ),
  );

const inside = (frustum: Frustum, object: Object3D) =>
  (object as { isSprite?: boolean }).isSprite
    ? frustum.intersectsSprite(object as never)
    : frustum.intersectsObject(object);

/** The draw calls one object makes, if seen: none for anything not drawn. */
function drawsOf(object: Object3D) {
  const drawn = object as Mesh & {
    isLine?: boolean;
    isPoints?: boolean;
    isSprite?: boolean;
  };
  if (!drawn.isMesh && !drawn.isLine && !drawn.isPoints && !drawn.isSprite)
    return 0;
  const material = drawn.material as Material | Material[];
  if (!Array.isArray(material)) return material.visible ? 1 : 0;
  const groups = drawn.geometry.groups;
  return groups.filter((group) => material[group.materialIndex ?? 0]?.visible)
    .length;
}
