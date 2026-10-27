import { Group } from 'three';
import { signal } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createPartSet, pilotLight, selector } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createBrandBadge } from '../../core/views/brand-badge';
import { plantTools } from './plant-tools';
import { CHANGEOVER_POSITIONS } from '../../../../game/plant/changeover';
import type { ChangeoverPosition } from '../../../../game/plant/changeover';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';

/** The changeover switch's enclosure, metres: wall-mounted. */
export const CHANGEOVER_SWITCH = { w: 0.5, h: 0.7, d: 0.25, y: 1.45 } as const;

/** What the switch shows and works: its handle, and the supplies at its two sides. */
export interface ChangeoverBinding {
  position(): ChangeoverPosition;
  /** Turn its handle one position: −1 toward I, +1 toward II. */
  turn(direction: -1 | 1): void;
  mainsAvailable(): boolean;
  generatorAvailable(): boolean;
  /** Its state in words, for inspection. */
  status(): string;
}

/**
 * The mains/generator changeover switch (prompt 089, item 6), after the
 * Socomec SIRCOVER and ABB OT…C manual changeovers: a Voltara three-pole
 * changeover switch-disconnector in a steel enclosure built by Penfold
 * Controls, its big rotary handle through the door, I (mains) · 0 (off) ·
 * II (generator), one position a turn, so it always passes 0 (break
 * before make); MAINS AVAILABLE and GENERATOR AVAILABLE lamps, each lit
 * from its own side's supply. Unbound, an exhibit's: its handle its own,
 * the mains always there, no generator. Its back on the wall at z = 0,
 * its middle at y = 0, its door at +z.
 */
export function createChangeoverSwitch(
  kit: PanelKit,
  binding?: ChangeoverBinding,
): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Mains/generator changeover switch';
  const { w, h, d } = CHANGEOVER_SWITCH;
  const grey = t.paint('#c9ccc6', 0.5, 0.15);
  const seam = t.paint('#2b2d2e', 0.6);
  // The box, its door a little proud with a dark seam round it, and two
  // quarter-turn locks on the door's free edge.
  t.box(object, grey, w, h, d - 0.02, 0, 0, (d - 0.02) / 2);
  t.box(object, seam, w - 0.01, h - 0.01, 0.004, 0, 0, d - 0.018);
  t.box(object, grey, w - 0.016, h - 0.016, 0.016, 0, 0, d - 0.008);
  for (const y of [-0.22, 0.22])
    t.cyl(object, seam, 0.01, 0.012, w / 2 - 0.035, y, d + 0.006, 'z', 12);
  // Its gland plate and the cables' trunking into its top, from the wall.
  t.box(object, seam, w - 0.12, 0.012, d - 0.06, 0, h / 2 + 0.006, d / 2);
  const face = new Group();
  face.position.z = d;
  object.add(face);
  panelMakerMark(kit, face, { width: w, height: h, z: 0.001 });
  const plate = (
    text: string,
    y: number,
    height: number,
    plateColour = '#f0ede3',
  ) => {
    const label = createMicroLabel(kit, text, {
      height,
      ink: '#151515',
      plate: plateColour,
    });
    label.position.set(0, y, 0.001);
    face.add(label);
    return label;
  };
  plate('MAINS / GENERATOR CHANGEOVER', h / 2 - 0.07, 0.02);
  plate('400 A  3 POLE + N  400 V', h / 2 - 0.1, 0.014);
  plate('DANGER  400 V', -h / 2 + 0.05, 0.02, '#f0d21c');
  plate('ONE SUPPLY ONLY  -  TURN THROUGH 0', -h / 2 + 0.085, 0.013);
  // The switch's maker on its handle's escutcheon.
  const mark = createBrandBadge(kit, 'voltara', { height: 0.018 });
  mark.position.set(0, -0.205, 0.002);
  face.add(mark);
  // The handle: a big lever selector, one position per turn.
  const parts = createPartSet();
  const mount = <P extends Part>(part: P, x: number, y: number, s: number) => {
    parts.add(part);
    part.object.position.set(x, y, 0.002);
    part.object.scale.setScalar(s);
    face.add(part.object);
    return part;
  };
  let held: ChangeoverPosition = 'I';
  const position = () => binding?.position() ?? held;
  mount(
    selector(kit, {
      positions: 3,
      name: 'Changeover switch handle',
      initial: CHANGEOVER_POSITIONS.indexOf(position()),
      bound: {
        get value() {
          return CHANGEOVER_POSITIONS.indexOf(position());
        },
        set: (n: number) => {
          const now = CHANGEOVER_POSITIONS.indexOf(position());
          const direction = Math.sign(n - now);
          if (direction === 0) return;
          if (binding) binding.turn(direction as -1 | 1);
          else
            held =
              CHANGEOVER_POSITIONS[Math.max(0, Math.min(2, now + direction))];
        },
      },
    }),
    0,
    -0.02,
    4,
  );
  // Its positions round the handle, where its lever points: I upper left,
  // 0 up, II upper right.
  CHANGEOVER_POSITIONS.forEach((p, i) => {
    const angle = Math.PI / 2 + (1 - i) * (Math.PI / 4);
    const label = createMicroLabel(kit, p, { height: 0.026, ink: '#151515' });
    label.position.set(
      Math.cos(angle) * 0.105,
      -0.02 + Math.sin(angle) * 0.105,
      0.002,
    );
    face.add(label);
  });
  const legends = createMicroLabel(kit, 'I MAINS     0 OFF     II GENERATOR', {
    height: 0.012,
    ink: '#151515',
  });
  legends.position.set(0, -0.175, 0.002);
  face.add(legends);
  // Its lamps, each lit from its own side's supply.
  const mainsLit = signal(binding?.mainsAvailable() ?? true);
  const generatorLit = signal(binding?.generatorAvailable() ?? false);
  // The mains lamp is lit from the mains side, not the switchboard: the
  // room's going dark with the switch at 0 or II does not put it out
  // (`room-power.ts`).
  const own = <P extends Part>(part: P) => {
    part.object.userData.ownPower = true;
    return part;
  };
  own(
    mount(
      pilotLight(kit, {
        colour: 'white',
        legend: 'MAINS AVAILABLE',
        drive: mainsLit,
        name: 'Changeover MAINS AVAILABLE lamp',
      }),
      -0.13,
      0.16,
      0.9,
    ),
  );
  // The generator's lamp is lit from the generator side, when there is
  // one (none is modelled yet): with the switch room dark, it is dark.
  mount(
    pilotLight(kit, {
      colour: 'amber',
      legend: 'GENERATOR AVAILABLE',
      drive: generatorLit,
      name: 'Changeover GENERATOR AVAILABLE lamp',
    }),
    0.13,
    0.16,
    0.9,
  );
  // Their legends, large enough to read from the floor.
  for (const [text, x] of [
    ['MAINS\nAVAILABLE', -0.13],
    ['GENERATOR\nAVAILABLE', 0.13],
  ] as const) {
    const label = createMicroLabel(kit, text, {
      height: 0.011,
      ink: '#151515',
      plate: '#f0ede3',
    });
    label.position.set(x, 0.205, 0.002);
    face.add(label);
  }
  return {
    object,
    parts,
    update() {
      mainsLit.value = binding?.mainsAvailable() ?? true;
      generatorLit.value = binding?.generatorAvailable() ?? false;
    },
    status: () =>
      binding?.status() ??
      `Handle at ${position()}; MAINS AVAILABLE lit, GENERATOR AVAILABLE unlit`,
    dispose() {
      parts.dispose();
    },
  };
}
