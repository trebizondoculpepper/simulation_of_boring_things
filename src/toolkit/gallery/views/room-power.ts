import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { Material, Object3D } from 'three';
import { serviceAvailable } from '../../../game/plant/services';
import type { ServiceRoom } from '../../../game/plant/services';
import { worldStore } from '../../save/world-store';

/**
 * A room's powered equipment going dark with its supply: every lamp, LED,
 * display and screen in it (each a self-lit material: unlit, or glowing)
 * out while `powered` says it has no power, and back as its equipment
 * last set it once power returns.
 *
 * Left alone: the light fittings, which follow their lighting zones
 * (`room-lights.ts`, `userData.lightFitting`); daylight
 * (`userData.daylight`); anything with a supply of its own
 * (`userData.ownPower` on it or something it hangs from: the scenario
 * simulator, powered from other universes); and anything that never was
 * powered (`userData.unpowered`: a placeholder's label).
 *
 * What it covers is found again every couple of seconds. While the room
 * has no power each is held dark every frame; a lamp its equipment sets
 * meanwhile is remembered, and shown once the power is back.
 */
export function bindRoomPower(root: Object3D, powered: () => boolean) {
  type Held = { colour: number; emissive: number; dark: boolean };
  const basics = new Map<MeshBasicMaterial, Held>();
  const glows = new Map<MeshStandardMaterial, Held>();
  const ownPower = (o: Object3D | null) => {
    for (let p = o; p; p = p.parent) if (p.userData.ownPower) return true;
    return false;
  };
  const skip = (m: Material) =>
    m.userData.lightFitting || m.userData.daylight || m.userData.unpowered;
  const scan = () =>
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const materials = (
        Array.isArray(o.material) ? o.material : [o.material]
      ) as Material[];
      if (
        materials.every(
          (m) =>
            basics.has(m as MeshBasicMaterial) ||
            glows.has(m as MeshStandardMaterial),
        )
      )
        return;
      if (ownPower(o)) return;
      for (const m of materials) {
        if (skip(m)) continue;
        if (m instanceof MeshBasicMaterial && !basics.has(m))
          basics.set(m, { colour: m.color.getHex(), emissive: 0, dark: false });
        else if (
          m instanceof MeshStandardMaterial &&
          m.emissiveIntensity > 0 &&
          m.emissive.getHex() !== 0 &&
          !glows.has(m)
        )
          glows.set(m, {
            colour: 0,
            emissive: m.emissiveIntensity,
            dark: false,
          });
      }
    });
  const DARK = 0x050505;
  let since = Infinity;
  let was = true;
  return {
    update(delta: number) {
      since += delta;
      if (since > 2) {
        scan();
        since = 0;
      }
      const on = powered();
      if (on && was) return;
      for (const [m, h] of basics) {
        if (on) {
          if (h.dark) m.color.setHex(h.colour);
          h.dark = false;
          continue;
        }
        // Set meanwhile by its equipment: remembered for when power is back.
        if (h.dark && m.color.getHex() !== DARK) h.colour = m.color.getHex();
        else if (!h.dark) h.colour = m.color.getHex();
        m.color.setHex(DARK);
        h.dark = true;
      }
      for (const [m, h] of glows) {
        if (on) {
          if (h.dark) m.emissiveIntensity = h.emissive;
          h.dark = false;
          continue;
        }
        if (h.dark && m.emissiveIntensity !== 0)
          h.emissive = m.emissiveIntensity;
        else if (!h.dark) h.emissive = m.emissiveIntensity;
        m.emissiveIntensity = 0;
        h.dark = true;
      }
      was = on;
    },
  };
}

/** Whether a plant room has power in the world: its feeder, and the site's supply. */
export function roomPowered(room: ServiceRoom) {
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  return () => {
    const w = store?.world.value;
    return w ? serviceAvailable(w.plant, room, 'power') : true;
  };
}

/** Whether the site has power: the main switch, and the switch room's supply (the halls and corridors). */
export function sitePowered() {
  const store = typeof window === 'undefined' ? null : worldStore('dev');
  return () => {
    const w = store?.world.value;
    return w ? w.plant.sources.power && w.plant.feeders.switch_room : true;
  };
}
