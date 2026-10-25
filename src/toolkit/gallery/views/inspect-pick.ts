import { Box3, InstancedMesh, Mesh, Raycaster, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Camera, Intersection, Object3D } from 'three';
import type { World } from '../../../game/world';
import { inspectComponent } from '../../../game/plant/component-inspection';
import { owningComponent } from '../../components/core/views/component-identity';
import type { ComponentIdentity } from '../../components/core/views/component-identity';
import { INSPECT_REACH_METRES } from '../../controls/logic/inspection';
import type { InspectionTarget } from '../../controls/logic/inspection';

/**
 * What the information overlay names at a point of the view (prompt 061):
 * the first surface the aim meets, within reach, blocks what is behind it
 * (a wall, a closed cabinet door); its nearest marked owner up its parents
 * is the component named (`component-identity.ts`), or nothing. Hidden
 * meshes are passed through, except a deliberate pick mesh
 * (`userData.pick`); lines and points never block. Inspecting only looks.
 */

const shown = (object: Object3D) => {
  if (object.userData.pick) return true;
  for (let o: Object3D | null = object; o; o = o.parent)
    if (!o.visible) return false;
  return true;
};

export interface InspectorOptions {
  /** What to look among: the room's scene or its built rooms. */
  root: Object3D;
  camera: Camera;
  /** Scene units per metre. */
  metre: number;
  /** The world whose live state the second line reads, if any. */
  world?: () => World | undefined;
  /** Another way to know a hit object, for a room whose things are not marked (dev0). */
  identify?: (object: Object3D) => ComponentIdentity | undefined;
}

export function createInspector(options: InspectorOptions) {
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const box = new Box3();
  const at = new Vector3();
  const hits: Intersection[] = [];
  /**
   * The meshes the aim might meet within reach, in the shown part of the
   * scene: a whole room's every mesh tested against the ray costs a frame's
   * time (about 11 ms in the Olympic plant room, most of it the services
   * ceiling's few large merged meshes, far overhead); each mesh's bounding
   * box must be entered within reach first.
   */
  const nearby = (from: Vector3, far: number, out: Mesh[]) => {
    const visit = (o: Object3D) => {
      if (!o.visible && !o.userData.pick) return;
      // Instances stand wherever their matrices put them: always tested.
      if (o instanceof InstancedMesh) out.push(o);
      else if (o instanceof Mesh) {
        const g = o.geometry as BufferGeometry;
        if (!g.boundingBox) g.computeBoundingBox();
        if (g.boundingBox) {
          box.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
          // Entered within reach (or already inside it).
          const entry = box.containsPoint(from)
            ? from
            : raycaster.ray.intersectBox(box, at);
          if (entry && entry.distanceTo(from) <= far) out.push(o);
        }
      }
      for (const child of o.children) visit(child);
    };
    visit(options.root);
    return out;
  };
  return (x: number, y: number): InspectionTarget | null => {
    raycaster.setFromCamera(pointer.set(x, y), options.camera);
    raycaster.far = INSPECT_REACH_METRES * options.metre;
    hits.length = 0;
    for (const mesh of nearby(raycaster.ray.origin, raycaster.far, []))
      mesh.raycast(raycaster, hits);
    hits.sort((a, b) => a.distance - b.distance);
    for (const hit of hits) {
      if (!(hit.object instanceof Mesh) || !shown(hit.object)) continue;
      const identity =
        owningComponent(hit.object)?.identity ?? options.identify?.(hit.object);
      return identity ? inspectComponent(identity, options.world?.()) : null;
    }
    return null;
  };
}
