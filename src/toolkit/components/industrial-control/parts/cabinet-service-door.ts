import { mergeStatic } from '../../core/views/merge-static';
import { Group, Vector3 } from 'three';
import type { Material } from 'three';
import { createPartSet, doorBack, doorLatch } from '../../core/parts/parts';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  cabinetRearPaint,
  createBondingLead,
  createCabinetRearPanel,
} from '../views/cabinet-rear-fittings';

/** A true-size rear leaf using the same latches, cover and sounds as MCC doors. */
export function cabinetServiceDoor(
  kit: PanelKit,
  props: {
    width: number;
    height: number;
    material: Material;
    name: string;
    handed: 'left' | 'right';
  },
) {
  const object = new Group();
  object.name = props.name;
  const hinge = new Group();
  const side = props.handed === 'left' ? -1 : 1;
  hinge.position.x = (side * props.width) / 2;
  object.add(hinge);
  const leaf = createCabinetRearPanel(
    kit,
    props.width,
    props.height,
    props.material,
    false,
  );
  leaf.position.x = (-side * props.width) / 2;
  mergeStatic(leaf, Infinity);
  hinge.add(leaf);
  const parts = createPartSet();
  let shared: ReturnType<typeof doorLatch>['door'] | undefined;
  for (const y of [-props.height / 2 + 0.07, props.height / 2 - 0.07]) {
    const latch = parts.add(
      doorLatch(kit, {
        material: cabinetRearPaint(kit, '#252c29'),
        shared,
        large: true,
        name: `${props.name} fastener`,
      }),
    );
    shared ??= latch.door;
    latch.object.position.set(-side * (props.width - 0.025), y, 0.003);
    hinge.add(latch.object);
  }
  const door = shared!;
  const back = parts.add(
    doorBack(kit, {
      shared: door,
      material: props.material,
      name: `${props.name} inside cover`,
      layout: {
        width: props.width - 0.006,
        height: props.height - 0.006,
        panWidth: props.width - 0.04,
        panHeight: props.height - 0.04,
        panX: 0,
        flangeDepth: 0.002,
        panDepth: 0.018,
        opening: null,
      },
    }),
  );
  back.object.position.set((-side * props.width) / 2, 0, -0.002);
  mergeStatic(back.object, Infinity);
  hinge.add(back.object);
  const from = new Vector3(
    side * (props.width / 2 - 0.025),
    -props.height / 2 + 0.07,
    -0.04,
  );
  let bond = createBondingLead(
    kit,
    from,
    from.clone().add(new Vector3(-side * 0.055, 0.025, 0.02)),
  );
  object.add(bond);
  let lastAngle = Number.NaN;
  const update = (delta: number) => {
    const target = door.state.value ? side * 1.55 : 0;
    hinge.rotation.y += (target - hinge.rotation.y) * Math.min(1, delta * 8);
    if (Math.abs(hinge.rotation.y - target) < 0.001) hinge.rotation.y = target;
    if (lastAngle !== hinge.rotation.y) {
      hinge.updateMatrix();
      const end = new Vector3(
        -side * 0.055,
        -props.height / 2 + 0.095,
        -0.015,
      ).applyMatrix4(hinge.matrix);
      // Rebuild only during motion; a stationary cabinet allocates nothing.
      bond.traverse((o) => {
        if ('geometry' in o) (o as import('three').Mesh).geometry.dispose();
      });
      bond.removeFromParent();
      bond = createBondingLead(kit, from, end);
      object.add(bond);
      lastAngle = hinge.rotation.y;
    }
    parts.update(delta);
  };
  return {
    object,
    uses: parts.uses,
    update,
    dispose: parts.dispose,
    setAudible: parts.setAudible,
    onEvent: (listener: Parameters<typeof parts.onEvent>[0]) =>
      parts.onEvent(listener),
    door,
    hinge,
    get visibleInside() {
      return door.state.value || Math.abs(hinge.rotation.y) > 0.001;
    },
  };
}
