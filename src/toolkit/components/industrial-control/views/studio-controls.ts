import { ExtrudeGeometry, Group, Mesh, Path, Shape } from 'three';
import type { Material } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';

/**
 * Studio controls: the low, short-travel switches of high-end studio and
 * broadcast gear of the 2010s, a different family from the heavy-duty
 * 30 mm and 22 mm industrial devices. Metres, true size, facing +z, the
 * panel's face at z = 0.
 */

/** The LED colours a studio switch's window can light. */
export const STUDIO_LED_COLOURS = {
  green: '#47ff7a',
  amber: '#ffb21e',
  red: '#ff3b2a',
  blue: '#3ea8ff',
  white: '#f4f6ff',
} as const;
export type StudioLedColour = keyof typeof STUDIO_LED_COLOURS;

/**
 * The caps a studio switch comes with, chosen apart from its LED: each a
 * soft-touch finish and the ink its legend is printed in.
 */
export const STUDIO_CAP_COLOURS = {
  graphite: { cap: '#34363a', ink: '#eceef0' },
  black: { cap: '#1a1b1d', ink: '#eceef0' },
  grey: { cap: '#8d9196', ink: '#16171a' },
  white: { cap: '#e6e7e3', ink: '#16171a' },
  red: { cap: '#b3261e', ink: '#f6f4ef' },
  blue: { cap: '#245b9c', ink: '#f6f4ef' },
  yellow: { cap: '#e8c12a', ink: '#16171a' },
} as const;
export type StudioCapColour = keyof typeof STUDIO_CAP_COLOURS;

/** Its sizes, metres: bezel, cap, chamfer, LED, travel. */
export const STUDIO_SWITCH = {
  bezel: 0.026,
  cap: 0.019,
  /** The cut across one corner, a share of the side. */
  chamfer: 0.24,
  led: 0.0034,
  travel: 0.0012,
} as const;

/**
 * A square with its top-right corner cut off at 45°: a squashed hexagon.
 * Centred on the origin, `size` across.
 */
function chamfered<P extends Path = Shape>(
  size: number,
  path: P = new Shape() as unknown as P,
): P {
  const s = size / 2;
  const c = size * STUDIO_SWITCH.chamfer;
  path.moveTo(-s, -s);
  path.lineTo(s, -s);
  path.lineTo(s, s - c);
  path.lineTo(s - c, s);
  path.lineTo(-s, s);
  path.closePath();
  return path;
}

export interface StudioSwitchView {
  group: Group;
  /** The cap: what a press works. */
  cap: Mesh;
  /** Light its LED, or not. */
  setLit(lit: boolean): void;
  /** Push the cap down a moment. */
  press(): void;
  update(delta: number): void;
}

/**
 * A short-travel studio switch: a square cap with one corner chamfered,
 * soft-touch charcoal, in a matching satin-graphite bezel standing a
 * little proud of the panel; a small square LED window near the top of
 * the cap, dark until lit, and its legend printed in white on the cap
 * beneath it. A press dips the cap about a millimetre.
 */
export function createStudioSwitch(
  kit: PanelKit,
  {
    legend = '',
    led = 'green' as StudioLedColour,
    cap: capFinish = 'graphite' as StudioCapColour,
  } = {},
): StudioSwitchView {
  const group = new Group();
  const bezelPaint = kitPaint(kit, '#24262a', 0.55);
  // The bezel: a chamfered frame round a chamfered opening.
  const frame = chamfered<Shape>(STUDIO_SWITCH.bezel);
  frame.holes.push(chamfered(STUDIO_SWITCH.cap + 0.0012, new Path()));
  const bezelGeometry = new ExtrudeGeometry(frame, {
    depth: 0.0025,
    bevelEnabled: true,
    bevelThickness: 0.0004,
    bevelSize: 0.0004,
    bevelSegments: 2,
  });
  const bezel = new Mesh(bezelGeometry, bezelPaint);
  group.add(bezel);
  // A dark well behind the cap, so the gap round it reads as depth.
  const well = new Mesh(
    new ExtrudeGeometry(chamfered<Shape>(STUDIO_SWITCH.cap + 0.0012), {
      depth: 0.0006,
      bevelEnabled: false,
    }),
    kitPaint(kit, '#0c0d0e'),
  );
  group.add(well);
  // The cap, soft-touch, its edges eased.
  const finish = STUDIO_CAP_COLOURS[capFinish];
  const capPaint = kitPaint(kit, finish.cap, 0.05);
  const capGeometry = new ExtrudeGeometry(
    chamfered<Shape>(STUDIO_SWITCH.cap - 0.001),
    {
      depth: 0.0038,
      bevelEnabled: true,
      bevelThickness: 0.0005,
      bevelSize: 0.0005,
      bevelSegments: 3,
    },
  );
  const cap = new Mesh(capGeometry, capPaint);
  const holder = new Group();
  holder.add(cap);
  group.add(holder);
  // It goes in when pressed: not merged with the still parts (`mergeTree`).
  holder.userData.live = true;
  const top = 0.0038 + 0.0005;
  // The LED window, set into the cap's top near its upper edge.
  const off: Material = kitPaint(kit, '#141516', 0.6);
  const on: Material = kitGlow(kit, STUDIO_LED_COLOURS[led]);
  const window = new Mesh(
    new ExtrudeGeometry(
      (() => {
        const square = new Shape();
        const h = STUDIO_SWITCH.led / 2;
        square.moveTo(-h, -h);
        square.lineTo(h, -h);
        square.lineTo(h, h);
        square.lineTo(-h, h);
        square.closePath();
        return square;
      })(),
      { depth: 0.0003, bevelEnabled: false },
    ),
    off,
  );
  window.position.set(-0.002, 0.0045, top);
  // Lit by changing its paint: not merged with the still parts.
  window.userData.live = true;
  holder.add(window);
  if (legend) {
    const label = createMicroLabel(kit, legend, {
      height: 0.0021,
      ink: finish.ink,
      maxWidth: STUDIO_SWITCH.cap - 0.003,
    });
    label.position.set(-0.0005, -0.0035, top + 0.0002);
    holder.add(label);
  }
  // A press: down quickly, back on its spring.
  let pressed = 1;
  return {
    group,
    cap,
    setLit(lit) {
      window.material = lit ? on : off;
    },
    press() {
      pressed = 0;
    },
    update(delta) {
      pressed = Math.min(1, pressed + delta / 0.12);
      const depth = pressed < 0.3 ? 1 : 1 - (pressed - 0.3) / 0.7;
      holder.position.z = -STUDIO_SWITCH.travel * Math.max(0, depth);
    },
  };
}
