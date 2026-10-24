import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { createEngravedPlate } from '../../components/core/views/plant-signs';
import {
  createSwitchFuse,
  useSwitchFuse,
} from '../../components/industrial-control/views/switch-fuse';
import { createPowerIsolator } from '../../components/industrial-control/views/panel-switchgear';
import { createBusbarTapOff } from '../../components/industrial-control/views/busbar-tap-off';
import {
  BUSBAR_TAP_OFF,
  POWER_ISOLATOR,
  SWITCH_FUSE,
  TAP_OFF_GLAND,
  glandTop,
} from '../../components/industrial-control/logic/enclosures';
import { choosePipe } from '../../components/core/logic/plumber';
import type { TestFitting } from './test-boards';

/**
 * A machine's supply, as the spas' plant rooms have it (`cabinet-pipes.ts`),
 * on a wall for trying out its parts (the owner, 2026-10-24: examples of
 * the new components in dev0): plug-in busbar trunking, as the plumber
 * chooses it; a tap-off unit on it; a conduit down into a switch-fuse's
 * supply gland; from its feed gland, up, across and down into a rotary
 * isolator's; from the isolator's feed gland, out through the wall to its
 * machine. The switch-fuse and the isolator both work. Built in metres on
 * a wall at z = 0, its face toward +z, along x.
 */
export function createBusbarLineDemo(kit: PanelKit): TestFitting {
  const group = new Group();
  group.name = 'Busbar line demonstration';
  const parts = createPartSet();
  const bar = choosePipe({
    commodity: 'ac-400v-3ph',
    current: 63,
    busbar: true,
  });
  const circuit = choosePipe({ commodity: 'ac-400v-3ph', current: 32 });
  const BAR_Y = 2.6;
  const FUSE = { x: -0.25, y: 1.5 };
  const ISO = { x: 0.3, y: 1.5 };
  const CROSS = 1.95;
  // The bar, along the wall over its tap-off, capped at both ends.
  const barZ = BUSBAR_TAP_OFF.d / 2;
  group.add(
    createPipe(
      'busbar-trunking',
      bar.od,
      [
        [-0.65, BAR_Y, barZ],
        [0.65, BAR_Y, barZ],
      ],
      { ends: ['cap', 'cap'] },
    ),
  );
  // The switch-fuse: its first gland its supply, its second its feed.
  const fuse = createSwitchFuse(kit, { legend: 'DEMO SUPPLY' });
  fuse.group.position.set(FUSE.x, FUSE.y, 0);
  group.add(fuse.group);
  useSwitchFuse(fuse, parts.uses);
  const fuseTop = FUSE.y + glandTop(SWITCH_FUSE);
  const [fIn, fOut] = SWITCH_FUSE.glands.x.map((g) => FUSE.x + g);
  const gz = SWITCH_FUSE.glands.z;
  // The tap-off unit, over the switch-fuse's supply gland.
  const tapY = BAR_Y - bar.od / 2 - BUSBAR_TAP_OFF.h / 2;
  const tap = createBusbarTapOff(kit, { legend: 'DEMO', bar: bar.od });
  tap.position.set(fIn, tapY, 0);
  group.add(tap);
  // The isolator: its first gland its supply, its second its feed.
  const isolator = createPowerIsolator(kit, {
    on: true,
    rating: 'TP&N 32A',
    maker: 'VOLTARA',
  });
  isolator.group.position.set(ISO.x, ISO.y, 0);
  group.add(isolator.group);
  isolator.handle.traverse((o) => parts.uses.set(o, () => isolator.toggle()));
  const isoTop = ISO.y + glandTop(POWER_ISOLATOR);
  const [iIn, iOut] = POWER_ISOLATOR.glands.x.map((g) => ISO.x + g);
  const conduit = (points: [number, number, number][], through = false) =>
    group.add(
      createPipe(circuit.kind, circuit.od, points, {
        ...(through
          ? {
              through: [
                {
                  at: [0, 0, -0.1] as const,
                  normal: [0, 0, 1] as const,
                  kind: 'sleeve' as const,
                  thickness: 0.2,
                },
              ],
            }
          : {}),
      }),
    );
  // Tap-off to switch-fuse, straight down.
  conduit([
    [fIn, tapY - TAP_OFF_GLAND, gz],
    [fIn, fuseTop, gz],
  ]);
  // Switch-fuse to isolator, up, across and down.
  conduit([
    [fOut, fuseTop, gz],
    [fOut, CROSS, gz],
    [iIn, CROSS, gz],
    [iIn, isoTop, gz],
  ]);
  // Isolator to its machine, up and back through the wall.
  conduit(
    [
      [iOut, isoTop, gz],
      [iOut, CROSS + 0.1, gz],
      [iOut, CROSS + 0.1, -0.25],
    ],
    true,
  );
  const plate = createEngravedPlate(
    kit,
    ['BUSBAR · TAP-OFF · SWITCH-FUSE · ISOLATOR'],
    { colour: 'white', width: 0.9, height: 0.06 },
  );
  plate.position.set(0, 1.1, 0.005);
  group.add(plate);
  return {
    group,
    parts,
    update(_seconds, delta) {
      parts.update(delta);
      fuse.update(delta);
      isolator.update(delta);
    },
    dispose: () => parts.dispose(),
  };
}
