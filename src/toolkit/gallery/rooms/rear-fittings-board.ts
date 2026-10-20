import { BoxGeometry, Group, Mesh, Vector3 } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import {
  createMicroLabel,
  kitPaint,
} from '../../components/core/views/eighties-controls';
import { createPartSet } from '../../components/core/parts/parts';
import { cabinetServiceDoor } from '../../components/industrial-control/parts/cabinet-service-door';
import {
  createCablePartition,
  createBondingLead,
  createCabinetDuct,
  createCabinetEntryPlate,
  createCabinetFilter,
  createCabinetRearPanel,
} from '../../components/industrial-control/views/cabinet-rear-fittings';
import type { TestFitting } from './test-boards';

/** Production rear fittings at their true sizes, including a working service leaf. */
export function createRearFittingsBoard(kit: PanelKit): TestFitting {
  const group = new Group();
  group.name = 'Cabinet rear fittings gallery';
  const parts = createPartSet();
  const backing = new Mesh(
    new BoxGeometry(2.8, 1.5, 0.025),
    kitPaint(kit, '#d3d5ca'),
  );
  backing.position.z = -0.045;
  group.add(backing);
  const label = (text: string, x: number, y: number, size = 0.012) => {
    const mark = createMicroLabel(kit, text, {
      height: size,
      ink: '#263430',
      maxWidth: 2.6,
    });
    mark.position.set(x, y, 0.006);
    group.add(mark);
  };
  label('CABINET REAR FITTINGS — TRUE SIZE', 0, 0.66, 0.024);
  const paint = kitPaint(kit, '#8fb2c3');
  const door = parts.add(
    cabinetServiceDoor(kit, {
      width: 0.45,
      height: 0.75,
      material: paint,
      name: 'Gallery rear service door',
      handed: 'left',
    }),
  );
  door.object.position.set(-0.98, 0.04, 0.015);
  group.add(door.object);
  label('SERVICE DOOR / USE BLACK FASTENERS', -0.95, -0.43, 0.009);
  const panel = createCabinetRearPanel(kit, 0.35, 0.55, paint);
  panel.position.set(0.98, 0.05, 0.01);
  group.add(panel);
  label('BOLTED SHEET PANEL', 0.98, -0.3, 0.01);
  const partition = createCablePartition(
    kit,
    0.24,
    0.4,
    [{ x: 0, y: 0 }],
    paint,
  );
  partition.position.set(0.48, 0.04, 0.01);
  group.add(partition);
  label('GROMMETED PARTITION', 0.48, -0.22, 0.008);
  const duct = createCabinetDuct(kit, 0.45);
  duct.position.set(-0.4, 0.14, 0.01);
  group.add(duct);
  label('CD 60×40 DUCT', -0.4, -0.15, 0.01);
  const filter = createCabinetFilter(kit);
  filter.position.set(0.02, 0.3, 0.01);
  group.add(filter);
  label('116.5 mm FAN/FILTER', 0.02, 0.18, 0.009);
  const plate = createCabinetEntryPlate(kit, 0.28, 'BLANKED CABLE ENTRY');
  plate.position.set(0.1, -0.1, 0.01);
  group.add(plate);
  label('GLAND / BLANKING PLATE', 0.1, -0.2, 0.01);
  const bond = createBondingLead(
    kit,
    new Vector3(-0.16, -0.42, 0.02),
    new Vector3(0.18, -0.42, 0.02),
  );
  group.add(bond);
  label('FLEXIBLE PROTECTIVE BOND', 0, -0.57, 0.01);
  return {
    group,
    parts,
    update: (_seconds, delta) => parts.update(delta),
    dispose: parts.dispose,
  };
}
