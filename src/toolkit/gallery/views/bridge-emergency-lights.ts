import {
  BoxGeometry,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { emergencyPlan } from '../logic/bridge-lighting';

/**
 * The bridge's emergency lighting (the owner, 2026-10-27: very dim, cool,
 * "so you can just about get around"; `emergencyPlan`, a proposal): slim
 * white luminaires, their lenses glowing cool white, and low-level LED
 * strips on the stage's step nosings and the ramps' open edges, with a
 * faint cool fill for the room while they are lit. On the central battery
 * system, so not the room's power (`userData.ownPower`) or its lighting
 * way's dimming (`userData.ownSwitching`): `set(lit)` each frame from the
 * world (`bridgeEmergencyLit`).
 */
export function createBridgeEmergencyLights(kit: PanelKit) {
  const group = new Group();
  group.name = 'Bridge emergency lighting';
  group.userData.ownPower = true;
  const body = new MeshStandardMaterial({ color: '#eceeee', roughness: 0.5 });
  const lens = new MeshStandardMaterial({
    color: '#dfe8f2',
    emissive: '#cfe2ff',
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const strip = new MeshStandardMaterial({
    color: '#3a3f44',
    emissive: '#bcd6ff',
    emissiveIntensity: 0,
    roughness: 0.4,
  });
  kit.materials.push(body, lens, strip);
  const plan = emergencyPlan();
  for (const l of plan.luminaires) {
    // A slim maintained luminaire, 330 × 110 × 45 mm, its lens below.
    const g = new Group();
    g.name = `Emergency luminaire (${l.name})`;
    g.position.set(l.x, l.y, l.z);
    g.rotation.y = l.yaw;
    const box = new Mesh(new BoxGeometry(0.33, 0.11, 0.045), body);
    box.position.z = 0.0225;
    const glass = new Mesh(new BoxGeometry(0.3, 0.012, 0.035), lens);
    glass.position.set(0, -0.058, 0.024);
    g.add(box, glass);
    group.add(g);
  }
  for (const s of plan.strips) {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const dz = s.b.z - s.a.z;
    const len = Math.hypot(dx, dy, dz);
    const m = new Mesh(new BoxGeometry(0.012, 0.006, len), strip);
    m.name = `Emergency strip (${s.name})`;
    m.position.set(
      (s.a.x + s.b.x) / 2,
      (s.a.y + s.b.y) / 2 + 0.004,
      (s.a.z + s.b.z) / 2,
    );
    // Along its run (lookAt works in world space: turned by direction).
    m.quaternion.setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(dx, dy, dz).normalize(),
    );
    group.add(m);
  }
  // The little light they give the room: cool and faint.
  const fill = new HemisphereLight('#cfe0ff', '#202833', 0);
  fill.userData.ownSwitching = true;
  group.add(fill);
  let was: boolean | null = null;
  return {
    group,
    set(lit: boolean) {
      if (lit === was) return;
      was = lit;
      lens.emissiveIntensity = lit ? 1.4 : 0;
      strip.emissiveIntensity = lit ? 1.6 : 0;
      fill.intensity = lit ? 0.16 : 0;
    },
  };
}
