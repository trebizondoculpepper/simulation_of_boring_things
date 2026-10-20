import { BoxGeometry, CylinderGeometry, Group, Mesh } from 'three';
import { createMicroLabel, kitPaint } from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { pcbMaterials } from './pcb-textures';

/** Passive FR4 backplane, front at z=0; mounted equipment remains separate working parts. */
export function createPcbBackplane(
  kit: PanelKit,
  width: number,
  height: number,
  seed: number,
  legend: string,
  chipMaker = 'PD',
) {
  const group = new Group();
  group.name = `${legend} PCB backplane`;
  group.userData.pcbBackplane = { width, height, seed };
  const variant =
    legend.includes('DRIVE') || seed === 650
      ? 'drive'
      : width / height > 1.1
        ? 'backplane'
        : 'cabinet';
  const geometry = new BoxGeometry(width, height, 0.0024);
  const materials = pcbMaterials(kit, variant, 'z');
  // Four identical FR4 edge groups and two identical solder-mask faces
  // can each draw together, retaining the existing UVs and appearance.
  const groups = geometry.groups.slice();
  geometry.clearGroups();
  for (const group of groups) {
    const materialIndex = materials.indexOf(
      materials[group.materialIndex ?? 0],
    );
    const previous = geometry.groups.at(-1);
    if (
      previous?.materialIndex === materialIndex &&
      previous.start + previous.count === group.start
    )
      previous.count += group.count;
    else geometry.addGroup(group.start, group.count, materialIndex);
  }
  const board = new Mesh(geometry, materials);
  board.name = 'Textured green PCB';
  board.position.z = -0.0012;
  group.add(board);
  const brass = kitPaint(kit, '#b2a471', 0.65);
  const silver = kitPaint(kit, '#aeb9ba', 0.7);
  // Insulated standoffs and fixing screws keep the board clear of the steel pan.
  for (const x of [-width / 2 + 0.012, width / 2 - 0.012])
    for (const y of [-height / 2 + 0.012, height / 2 - 0.012]) {
      const post = new Mesh(
        new CylinderGeometry(0.004, 0.004, 0.012, 8),
        brass,
      );
      post.rotation.x = Math.PI / 2;
      post.position.set(x, y, -0.0084);
      group.add(post);
      const screw = new Mesh(
        new CylinderGeometry(0.003, 0.003, 0.0015, 12),
        silver,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, y, 0.00075);
      group.add(screw);
    }
  // Headers stay clear of the equipment in the middle of the board.
  const plastic = kitPaint(kit, '#232929');
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - 0.026);
    const header = new Mesh(
      new BoxGeometry(0.012, height * 0.52, 0.009),
      plastic,
    );
    header.name =
      side < 0 ? 'Backplane supply connector' : 'Backplane expansion connector';
    header.position.set(x, 0, 0.0045);
    group.add(header);
    const count = Math.floor((height * 0.52) / 0.00508);
    for (let i = 0; i < count; i++) {
      const pin = new Mesh(new BoxGeometry(0.001, 0.001, 0.004), brass);
      pin.position.set(x, (i - (count - 1) / 2) * 0.00508, 0.011);
      group.add(pin);
    }
    const mark = createMicroLabel(kit, side < 0 ? 'J1' : 'J2', {
      height: 0.005,
      ink: '#e4ead6',
    });
    mark.position.set(x, height * 0.29, 0.001);
    group.add(mark);
  }
  // Through-hole logic and support chips populate the motherboard's clear side.
  const chipMaterial = kitPaint(kit, '#242629');
  const chipPin = kitPaint(kit, '#b8bdba', 0.7);
  for (let chip = 0; chip < 5; chip++) {
    const wide = chip < 2;
    const w = wide ? 0.025 : 0.016;
    const h = wide ? 0.034 : 0.018;
    const x = -width * (chip % 2 === 0 ? 0.32 : 0.22);
    const y = height * 0.3 - Math.floor(chip / 2) * height * 0.21;
    const packageBody = new Mesh(new BoxGeometry(w, h, 0.004), chipMaterial);
    packageBody.name = `Motherboard logic chip U${chip + 1}`;
    packageBody.position.set(x, y, 0.003);
    group.add(packageBody);
    for (const side of [-1, 1])
      for (let pin = 0; pin < 8; pin++) {
        const lead = new Mesh(new BoxGeometry(0.003, 0.001, 0.001), chipPin);
        lead.position.set(
          x + side * (w / 2 + 0.001),
          y + ((pin - 3.5) * h) / 9,
          0.0015,
        );
        group.add(lead);
      }
    const mark = createMicroLabel(
      kit,
      `U${chip + 1}\n${chipMaker}-${271 + chip}`,
      {
        height: 0.0012,
        maxWidth: w * 0.8,
        ink: '#9b9d95',
      },
    );
    mark.position.set(x, y, 0.0051);
    group.add(mark);
  }
  return group;
}

/** Fixed female edge connector. The two rails leave a real, dark open card slot. */
export function createCardEdgeSlot(
  kit: PanelKit,
  index: number,
  contactLength = 0.196,
) {
  const group = new Group();
  group.name = `Fixed black card slot ${index + 1}`;
  group.userData.attachment = 'fixed';
  group.userData.cardSlot = index;
  const plastic = kitPaint(kit, '#171a1c');
  const inside = kitPaint(kit, '#050606');
  const gold = kitPaint(kit, '#b9a35e', 0.65);
  const piece = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = plastic,
  ) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  piece(0.011, contactLength + 0.008, 0.003, 0, 0, 0.0015);
  piece(0.003, contactLength - 0.001, 0.0005, 0, 0, 0.0033, inside);
  for (const side of [-1, 1]) {
    piece(0.0035, contactLength, 0.017, side * 0.00325, 0, 0.0115);
    piece(0.011, 0.004, 0.02, 0, side * (contactLength / 2 + 0.002), 0.01);
    const pins = Math.min(32, Math.floor(contactLength / 0.00508));
    for (let pin = 0; pin < pins; pin++)
      piece(
        0.00035,
        0.0022,
        0.008,
        side * 0.00125,
        (pin - (pins - 1) / 2) * 0.00508,
        0.0075,
        gold,
      );
  }
  const legend = createMicroLabel(kit, `SLOT ${index + 1}`, {
    height: 0.0018,
    maxWidth: 0.025,
    ink: '#e4ead6',
  });
  legend.position.set(0, -contactLength / 2 - 0.018, 0.0002);
  group.add(legend);
  return group;
}
