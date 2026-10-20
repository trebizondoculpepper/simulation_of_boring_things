import { Group, Mesh } from 'three';
import type { Material, Object3D, Texture } from 'three';
import { planFireSafety } from '../game/fire-safety-plan';
import type { Fitting } from '../game/fire-safety-plan';
import { createPanelKit } from '../toolkit/components/core/views/eighties-controls';
import { mergeStatic } from '../toolkit/components/core/views/merge-static';
import {
  createCallPoint,
  createExtinguisher,
  createFirePanel,
  createSmokeDetector,
  createSounderBeacon,
} from '../toolkit/components/fire/views/fire-fittings';
import {
  createBeamHead,
  createBeamReflector,
  createFireExitDoor,
  createFirePointStand,
  createHeatDetector,
} from '../toolkit/components/fire/views/detection-and-exits';
import {
  createEmergencyBulkhead,
  createEmergencyLight,
} from '../toolkit/components/general-safety/views/safety-fittings';
import {
  createEscapeSign,
  createFireDoorSign,
  createFirstAidSign,
} from '../toolkit/components/general-safety/views/escape-signs';

/**
 * The building's fire safety fittings (`planFireSafety`), drawn with the
 * toolkit's fire and safety fittings. Each kind of fitting is built once
 * and copied wherever it goes, sharing its geometry and materials, and
 * each room's fittings are then merged, so a room's hundred fittings draw
 * in a handful of calls. Nothing here works yet: the lamps show their
 * healthy standing states (charge lamps green, signs lit). One group per
 * room, shown with its room.
 */
export function createFireSafety(plan: readonly Fitting[] = planFireSafety()) {
  const kit = createPanelKit();
  const prototypes = new Map<string, Object3D>();
  const prototype = (key: string, make: () => Object3D) => {
    let p = prototypes.get(key);
    if (!p) {
      p = make();
      // Static: nothing changes its lamps, so everything may merge.
      p.traverse((o) => {
        delete o.userData.live;
        if (o instanceof Mesh) delete (o.material as Material).userData.live;
      });
      prototypes.set(key, p);
    }
    return p.clone();
  };
  const build = (f: Fitting): Object3D => {
    switch (f.kind) {
      case 'smoke':
        return prototype(f.kind, () => createSmokeDetector(kit).group);
      case 'heat':
        return prototype(f.kind, () => createHeatDetector(kit));
      case 'beam-transmitter':
        return prototype(f.kind, () => createBeamHead(kit));
      case 'beam-reflector':
        return prototype(f.kind, () => createBeamReflector(kit));
      case 'call-point':
        return prototype(f.kind, () => createCallPoint(kit).group);
      case 'sounder':
        return prototype(f.kind, () => createSounderBeacon(kit).group);
      case 'fire-panel':
        return prototype(f.kind, () => createFirePanel(kit).group);
      case 'emergency-downlight':
        return prototype(f.kind, () => createEmergencyLight(kit).group);
      case 'emergency-bulkhead':
        return prototype(f.kind, () => createEmergencyBulkhead(kit).group);
      case 'exit-sign': {
        const arrow = f.arrow ?? 'up';
        return prototype(`${f.kind}:${arrow}:${Boolean(f.finalExit)}`, () =>
          createEscapeSign(kit, arrow, f.finalExit),
        );
      }
      case 'fire-door-sign':
        return prototype(f.kind, () => createFireDoorSign(kit));
      case 'first-aid-sign':
        return prototype(f.kind, () => createFirstAidSign(kit));
      case 'extinguisher': {
        const type = f.extinguisher ?? 'co2';
        return prototype(
          `${f.kind}:${type}`,
          () => createExtinguisher(kit, type).group,
        );
      }
      case 'fire-exit-door':
        return prototype(`${f.kind}:${f.width}`, () =>
          createFireExitDoor(kit, f.width ?? 1),
        );
    }
  };

  const group = new Group();
  group.name = 'fire-safety';
  const rooms = new Map<string, Group>();
  for (const f of plan) {
    let room = rooms.get(f.room);
    if (!room) {
      room = new Group();
      room.name = `fire-safety:${f.room}`;
      rooms.set(f.room, room);
      group.add(room);
    }
    const item = build(f);
    const holder = new Group();
    holder.position.set(f.x, f.y, f.z);
    holder.rotation.y = f.yaw;
    if (f.stand && f.kind === 'extinguisher') {
      // On a fire point board on the deck, the extinguisher hung on its face.
      holder.add(prototype('stand', () => createFirePointStand(kit)));
      item.position.y = 0.2;
    }
    holder.add(item);
    room.add(holder);
  }
  for (const room of rooms.values()) {
    room.updateMatrixWorld(true);
    mergeStatic(room, 200, new Set(), { share: true });
  }
  return {
    group,
    show(ids: ReadonlySet<string>) {
      for (const [id, room] of rooms) room.visible = ids.has(id);
    },
    dispose() {
      const geometries = new Set<{ dispose(): void }>();
      const materials = new Set<Material>();
      const textures = new Set<Texture>(kit.textures);
      group.traverse((o) => {
        if (o instanceof Mesh) {
          geometries.add(o.geometry);
          materials.add(o.material as Material);
        }
      });
      for (const g of geometries) g.dispose();
      for (const m of [...materials, ...kit.materials]) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
