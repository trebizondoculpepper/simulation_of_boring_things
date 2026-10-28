import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import type { Part } from '../../components/core/parts/parts';
import { markComponent } from '../../components/core/views/component-identity';
import { createChemicalBallValve } from '../../components/plant/views/chemical-ball-valve';
import {
  createCheckValve,
  createMotorisedChemicalValve,
} from '../../components/plant/views/dosing-valves';
import { installedValveFor } from '../../../game/plant/installed-valves';
import type { WorldStore } from '../../save/world-store';
import type { CheckFitting, PipeRun, Valve } from '../logic/room-pipes';

type Vec3 = readonly [number, number, number];

/**
 * A chemical line's own fittings drawn in its run (plan 085;
 * `logic/chemical-line-fittings.ts`): each isolating valve a PVC-U
 * true-union ball valve (or, where the schematic motorises it, the
 * motorised one), the world's installed valve, worked by its handle; each
 * non-return valve a PVC-U check valve passing while its line is open.
 * Each marked as its fitting in its room's model.
 */
export function createChemicalLineFittings(
  kit: PanelKit,
  room: string,
  store: WorldStore | null,
  lift: (p: Vec3) => Vec3,
  addPart: <T extends Part>(part: T) => T,
) {
  const group = new Group();
  const updates: (() => void)[] = [];
  const dn = (od: number) => (od >= 0.04 ? 40 : 15);
  const turn = (object: Group, axis: Valve['axis']) => {
    // Built along x, its handle up.
    if (axis === 'z') object.rotation.y = Math.PI / 2;
    else if (axis === 'y') object.rotation.z = Math.PI / 2;
  };
  return {
    group,
    /** A run's chemical-line isolating valve. */
    valve(run: PipeRun, v: Valve) {
      const installed = installedValveFor(room, run.name, v.name);
      const open = () =>
        store?.world.value.installedValves[installed.assetId] ??
        installed.normal === 'open';
      const name = `${installed.tag} · ${v.name}`;
      let object: Group;
      if (v.operator === 'motor') {
        const motor = addPart(
          createMotorisedChemicalValve(kit, { dn: dn(v.od), name }),
        );
        updates.push(() => motor.command(open()));
        object = motor.object as Group;
      } else {
        const ball = addPart(
          createChemicalBallValve(kit, {
            dn: dn(v.od),
            name,
            binding: {
              open,
              set: (on: boolean) =>
                store?.dispatch({
                  type: 'plant/valve',
                  id: installed.assetId,
                  open: on,
                }),
            },
          }),
        );
        object = ball.object as Group;
      }
      turn(object, v.axis);
      object.position.set(...lift(v.at));
      group.add(
        markComponent(object, {
          tag: installed.tag,
          ...(v.fitting ? { model: { fitting: v.fitting } } : {}),
        }),
      );
    },
    /** A run's non-return valve, passing while its line's valves are open. */
    check(run: PipeRun, c: CheckFitting) {
      const check = addPart(
        createCheckValve(kit, { dn: dn(c.od), name: c.name }),
      );
      const object = check.object as Group;
      const a = c.along;
      if (Math.abs(a[1]) > 0.5)
        object.rotation.z = a[1] > 0 ? Math.PI / 2 : -Math.PI / 2;
      else object.rotation.y = Math.atan2(-a[2], a[0]);
      object.position.set(...lift(c.at));
      // It passes while every isolating valve on its run is open.
      const valves = run.valves.map((v) =>
        installedValveFor(room, run.name, v.name),
      );
      updates.push(() => {
        check.flowing = valves.every(
          (v) =>
            store?.world.value.installedValves[v.assetId] ??
            v.normal === 'open',
        );
      });
      group.add(
        markComponent(object, {
          ...(c.tag ? { tag: c.tag } : { name: c.name }),
          model: { fitting: c.fitting },
        }),
      );
    },
    update() {
      for (const u of updates) u();
    },
  };
}
