import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import { kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createTwinSocket } from './building-fittings';

/** Shared metalclad UK twin socket, mounted on a floor-bolted service box. */
export function createWorkstationPowerBox(kit: PanelKit) {
  const group = new Group();
  group.name = 'Floor-bolted workstation power box';
  const paint = kitPaint(kit, '#878e91');
  const base = new Mesh(new BoxGeometry(0.2, 0.008, 0.14), paint);
  base.position.y = 0.004;
  group.add(base);
  const socket = createTwinSocket(kit, { metalclad: true, testers: false });
  socket.group.rotation.x = -Math.PI / 2;
  socket.group.position.y = 0.008;
  // An unswitched outlet: power is operated at the computer itself.
  for (const side of socket.sides) side.rocker.parent?.removeFromParent();
  group.add(socket.group);
  for (const x of [-0.087, 0.087])
    for (const z of [-0.057, 0.057]) {
      const bolt = new Mesh(
        new CylinderGeometry(0.0045, 0.0045, 0.006, 6),
        kitPaint(kit, '#b8bec0'),
      );
      bolt.position.set(x, 0.011, z);
      group.add(bolt);
    }
  // Two fitted BS 1363 plugs, cables exiting towards the desk.
  for (const x of [-0.036, 0.036]) {
    const plug = new Mesh(
      new BoxGeometry(0.038, 0.026, 0.043),
      kitPaint(kit, '#242622'),
    );
    plug.name = x < 0 ? 'BBC floor power plug' : 'Cub floor power plug';
    plug.position.set(x, 0.071, 0.006);
    group.add(plug);
  }
  return group;
}
