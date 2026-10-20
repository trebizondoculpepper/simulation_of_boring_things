import { computed, signal } from '@preact/signals-core';
import { Group, MeshBasicMaterial } from 'three';
import type { BrandId } from '../../core/logic/brands';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createPartSet, pushButton } from '../../core/parts/parts';
import { plantTools } from '../../plant/views/plant-tools';
import { createCharacterLcd } from './panel-instruments';
import {
  LAMP_COLOURS,
  LEGEND_COLUMNS,
  legendText,
  readoutText,
} from '../logic/mimic';
import type { MimicSpec, MimicState, MimicSymbol } from '../logic/mimic';

/**
 * A mimic board, built from its spec (`logic/mimic.ts`): an enamelled
 * steel board in a dark frame, the system drawn on it as an infographic,
 * indicator LEDs set into it, four-digit LED readouts each with a small
 * LCD legend, and along the bottom an illuminated button for each
 * display mode and a LAMP TEST button. In metres, facing +z, its back at
 * z = 0. Everything that changes is marked live, so a room does not merge
 * it into still geometry.
 */
export interface MimicBoardView {
  group: Group;
  parts: ReturnType<typeof createPartSet>;
  /** The mode now shown, by id. */
  mode: { value: string };
  /** Show the plant's state. */
  show(state: MimicState): void;
}

const live = (o: {
  traverse(f: (o: { userData: Record<string, unknown> }) => void): void;
}) => o.traverse((x) => (x.userData.live = true));

/** Draw `symbol` centred at (x, y), `r` pixels across its half. */
function drawSymbol(
  c: CanvasRenderingContext2D,
  symbol: MimicSymbol,
  x: number,
  y: number,
  r: number,
) {
  c.save();
  c.translate(x, y);
  c.lineWidth = Math.max(3, r * 0.12);
  c.strokeStyle = '#1b1f20';
  c.fillStyle = '#e4e8e5';
  const box = (w: number, h: number) => {
    c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeRect(-w / 2, -h / 2, w, h);
  };
  const ring = (rr = r) => {
    c.beginPath();
    c.arc(0, 0, rr, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  };
  const word = (text: string) => {
    c.fillStyle = '#1b1f20';
    c.font = `bold ${r * 0.7}px ${SANS}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 0, 0);
  };
  switch (symbol) {
    case 'tank':
      box(r * 2.4, r * 2);
      c.beginPath();
      c.moveTo(-r * 1.2, -r * 0.3);
      c.lineTo(r * 1.2, -r * 0.3);
      c.stroke();
      break;
    case 'pool':
      box(r * 3.2, r * 1.4);
      c.beginPath();
      for (let i = 0; i <= 12; i++)
        c.lineTo(
          -r * 1.4 + (i / 12) * r * 2.8,
          -r * 0.3 + Math.sin(i * 1.4) * r * 0.12,
        );
      c.stroke();
      break;
    case 'pump':
      ring();
      c.beginPath();
      c.moveTo(-r * 0.5, -r * 0.55);
      c.lineTo(r * 0.7, 0);
      c.lineTo(-r * 0.5, r * 0.55);
      c.closePath();
      c.fillStyle = '#1b1f20';
      c.fill();
      break;
    case 'filter':
      ring();
      c.beginPath();
      c.moveTo(-r * 0.7, 0);
      c.lineTo(r * 0.7, 0);
      c.setLineDash([r * 0.15, r * 0.12]);
      c.stroke();
      break;
    case 'valve':
      c.beginPath();
      c.moveTo(-r, -r * 0.6);
      c.lineTo(r, r * 0.6);
      c.lineTo(r, -r * 0.6);
      c.lineTo(-r, r * 0.6);
      c.closePath();
      c.fill();
      c.stroke();
      break;
    case 'hx':
      box(r * 1.4, r * 2);
      c.beginPath();
      for (let i = 0; i <= 6; i++)
        c.lineTo((i % 2 ? 1 : -1) * r * 0.5, -r + (i / 6) * r * 2);
      c.stroke();
      break;
    case 'coil':
      box(r * 1.2, r * 2);
      c.beginPath();
      for (let i = 0; i <= 8; i++)
        c.lineTo((i % 2 ? 1 : -1) * r * 0.4, -r + (i / 8) * r * 2);
      c.stroke();
      break;
    case 'boiler':
      box(r * 1.6, r * 2.2);
      c.fillStyle = '#c4452a';
      c.beginPath();
      c.moveTo(0, -r * 0.6);
      c.quadraticCurveTo(r * 0.5, r * 0.2, 0, r * 0.6);
      c.quadraticCurveTo(-r * 0.5, r * 0.2, 0, -r * 0.6);
      c.fill();
      break;
    case 'fan':
      ring();
      for (let i = 0; i < 4; i++) {
        c.save();
        c.rotate((i * Math.PI) / 2);
        c.beginPath();
        c.ellipse(r * 0.4, 0, r * 0.4, r * 0.15, 0.4, 0, Math.PI * 2);
        c.fillStyle = '#1b1f20';
        c.fill();
        c.restore();
      }
      break;
    case 'uv':
      box(r * 2.4, r * 1);
      word('UV');
      break;
    case 'heatpump':
      box(r * 2, r * 1.6);
      word('HP');
      break;
    case 'cylinder':
      c.beginPath();
      c.ellipse(0, 0, r * 0.8, r * 1.3, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      break;
    case 'damper':
      c.beginPath();
      c.moveTo(0, -r);
      c.lineTo(0, r);
      c.moveTo(-r * 0.6, r * 0.5);
      c.lineTo(r * 0.6, -r * 0.5);
      c.stroke();
      break;
  }
  c.restore();
}

export function createMimicBoard(
  kit: PanelKit,
  spec: MimicSpec,
  {
    maker = 'penfold' as BrandId,
    press = () => {},
  }: {
    maker?: BrandId;
    /** Called with a button's id when one of the drawing's buttons is pressed. */
    press?: (id: string) => void;
  } = {},
): MimicBoardView {
  const t = plantTools(kit);
  const group = new Group();
  const { width: W, height: H } = spec;
  // The frame, and the board with its drawing.
  t.box(group, t.paint('#3b3f42', 0.5), W + 0.06, H + 0.06, 0.04, 0, 0, 0.02);
  const board = t.printed(
    W,
    H,
    (c, cw, ch) => {
      const X = (m: number) => ((m + W / 2) / W) * cw;
      const Y = (m: number) => ((H / 2 - m) / H) * ch;
      const px = (m: number) => (m / W) * cw;
      c.fillStyle = '#c9d0cd';
      c.fillRect(0, 0, cw, ch);
      for (const line of spec.lines) {
        c.strokeStyle = line.colour;
        c.lineWidth = line.width ?? 10;
        c.lineJoin = 'round';
        c.lineCap = 'round';
        c.beginPath();
        line.points.forEach(([x, y], i) =>
          i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y)),
        );
        c.stroke();
      }
      c.textAlign = 'center';
      for (const shape of spec.shapes) {
        const r = px((shape.size ?? 0.12) / 2);
        drawSymbol(c, shape.symbol, X(shape.at[0]), Y(shape.at[1]), r);
        if (shape.label) {
          c.fillStyle = '#1b1f20';
          c.font = `bold ${ch / 36}px ${SANS}`;
          c.textBaseline = 'top';
          c.fillText(shape.label, X(shape.at[0]), Y(shape.at[1]) + r * 1.3 + 4);
        }
      }
      c.textBaseline = 'middle';
      for (const label of spec.labels ?? []) {
        c.fillStyle = '#1b1f20';
        c.font = `bold ${(ch / 36) * (label.size ?? 1)}px ${SANS}`;
        c.fillText(label.text, X(label.at[0]), Y(label.at[1]));
      }
      c.font = `bold ${ch / 20}px ${SANS}`;
      c.textAlign = 'left';
      c.textBaseline = 'top';
      c.fillText(spec.title, ch * 0.04, ch * 0.03);
    },
    1024,
  );
  board.mesh.position.z = 0.041;
  group.add(board.mesh);
  const z = 0.044;
  // The indicator LEDs.
  const lamps = spec.lamps.map((lamp) => {
    const material = new MeshBasicMaterial({ color: '#3a3c3a' });
    kit.materials.push(material);
    const mesh = t.cyl(
      group,
      material,
      0.009,
      0.006,
      lamp.at[0],
      lamp.at[1],
      z,
      'z',
      16,
    );
    mesh.userData.live = true;
    if (lamp.label) {
      const tag = createMicroLabel(kit, lamp.label, {
        height: 0.014,
        ink: '#1b1f20',
        plate: '#f1f1ec',
      });
      tag.position.set(lamp.at[0], lamp.at[1] - 0.028, z);
      group.add(tag);
    }
    return { id: lamp.id, material, colour: LAMP_COLOURS[lamp.colour] };
  });
  // The readouts and their legends.
  const readouts = spec.readouts.map((readout) => {
    const [x, y] = readout.at;
    t.box(
      group,
      t.paint('#1a1b1c', 0.4),
      0.19,
      0.13,
      0.012,
      x,
      y - 0.025,
      z - 0.002,
    );
    const digits = createSevenSegment(kit, 4, { digitHeight: 0.03 });
    digits.group.position.set(x, y, z + 0.004);
    live(digits.group);
    group.add(digits.group);
    const legend = createCharacterLcd(kit, {
      columns: LEGEND_COLUMNS,
      rows: 1,
      cell: 0.0042,
    });
    legend.group.position.set(x, y - 0.06, z + 0.004);
    live(legend.group);
    group.add(legend.group);
    return { id: readout.id, digits, legend };
  });
  // The mode buttons and LAMP TEST, along the bottom.
  const parts = createPartSet();
  const mode = signal(spec.modes[0]?.id ?? '');
  const test = signal(false);
  let testUntil = 0;
  let clock = 0;
  const row = -H / 2 + 0.06;
  const startX = -W / 2 + 0.12;
  spec.modes.forEach((m, i) => {
    const button = pushButton(kit, {
      colour: 'white',
      head: 'illuminated',
      legend: m.legend,
      lamp: computed(() => mode.value === m.id || test.value),
      action: () => (mode.value = m.id),
    });
    button.object.position.set(startX + i * 0.12, row, z);
    live(button.object);
    group.add(button.object);
    parts.add(button);
  });
  // The buttons in the drawing.
  for (const b of spec.buttons ?? []) {
    const button = pushButton(kit, {
      colour: b.colour,
      head: 'flush',
      legend: b.legend,
      action: () => press(b.id),
      name: `${spec.title}: ${b.legend ?? b.id}`,
    });
    button.object.position.set(b.at[0], b.at[1], z);
    live(button.object);
    group.add(button.object);
    parts.add(button);
  }
  const lampTest = pushButton(kit, {
    colour: 'black',
    legend: 'LAMP TEST',
    action: () => (testUntil = clock + 2),
  });
  lampTest.object.position.set(
    startX + spec.modes.length * 0.12 + 0.06,
    row,
    z,
  );
  live(lampTest.object);
  group.add(lampTest.object);
  parts.add(lampTest);
  // The panel builder's mark, top right.
  panelMakerMark(kit, group, {
    width: W,
    height: H,
    z: z - 0.0005,
    maker,
    size: 0.024,
  });
  return {
    group,
    parts,
    mode,
    show(state) {
      clock += 1 / 60;
      test.value = clock < testUntil;
      for (const lamp of lamps)
        lamp.material.color.set(
          test.value || state.lamps[lamp.id] ? lamp.colour : '#3a3c3a',
        );
      for (const r of readouts) {
        const reading = state.readouts[r.id]?.[mode.value];
        r.digits.show(test.value ? '8.8.8.8.' : readoutText(reading));
        r.legend.show(
          [test.value ? '#'.repeat(LEGEND_COLUMNS) : legendText(reading)],
          true,
        );
      }
    },
  };
}
