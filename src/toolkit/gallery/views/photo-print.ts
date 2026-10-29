import { SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import type { Material, Mesh, Texture } from 'three';
import { coverCrop, showsFull } from '../logic/photo-detail';

/**
 * A museum photograph on its print (`logic/photo-detail.ts`): its
 * low-resolution copy, loaded with its hall, until the eye is close and
 * looking at it square on; then its full photograph, loaded the first
 * time it is wanted and kept; the copy again when the eye moves off.
 * Until the copy has loaded the mesh shows what it had (a placeholder),
 * or, with `hidden`, is hidden so whatever is under it shows. Cropped about its middle to the print's
 * shape when `print` is given. Judged as each camera draws it.
 */
export function showPhoto(
  mesh: Mesh,
  {
    low,
    full,
    print,
    textures,
    hidden = false,
  }: {
    low: string;
    full: string;
    print?: { width: number; height: number };
    /** Where its textures go, to be disposed with the room's. */
    textures: Texture[];
    hidden?: boolean;
  },
) {
  const material = mesh.material as Material & {
    map: Texture | null;
    needsUpdate: boolean;
  };
  const loader = new TextureLoader();
  let lowTexture: Texture | null = null;
  let fullTexture: Texture | null = null;
  let loadingFull = false;
  let inFull = false;
  const prepare = (texture: Texture) => {
    texture.colorSpace = SRGBColorSpace;
    if (print) {
      const image = texture.image as { width: number; height: number };
      const crop = coverCrop(image, print);
      texture.repeat.set(crop.repeat.x, crop.repeat.y);
      texture.offset.set(crop.offset.x, crop.offset.y);
    }
    textures.push(texture);
    return texture;
  };
  const use = (texture: Texture | null) => {
    if (!texture || material.map === texture) return;
    // A map where there was none changes the shader; a swap does not.
    if (!material.map) material.needsUpdate = true;
    material.map = texture;
  };
  if (hidden) mesh.visible = false;
  loader.load(low, (texture) => {
    lowTexture = prepare(texture);
    if (!inFull || !fullTexture) use(lowTexture);
    mesh.visible = true;
  });

  const eye = new Vector3();
  const middle = new Vector3();
  const look = new Vector3();
  const local = new Vector3();
  const before = mesh.onBeforeRender.bind(mesh);
  mesh.onBeforeRender = (renderer, scene, camera, ...rest) => {
    before(renderer, scene, camera, ...rest);
    camera.getWorldPosition(eye);
    mesh.getWorldPosition(middle);
    // The eye in the print's own frame: its face is +z, its units metres.
    local.copy(eye);
    mesh.worldToLocal(local);
    const distance = local.length();
    camera.getWorldDirection(look);
    const aim = look.dot(middle.sub(eye).normalize());
    inFull = showsFull(inFull, {
      distance,
      facing: distance > 0 ? local.z / distance : 1,
      aim,
    });
    if (inFull && !fullTexture && !loadingFull) {
      loadingFull = true;
      loader.load(full, (texture) => {
        fullTexture = prepare(texture);
        if (inFull) use(fullTexture);
      });
    }
    use(inFull && fullTexture ? fullTexture : lowTexture);
  };
}
