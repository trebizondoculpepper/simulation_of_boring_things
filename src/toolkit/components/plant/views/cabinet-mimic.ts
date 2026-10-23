import { Group, Mesh, PlaneGeometry } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { createPartSet, pushButton } from '../../core/parts/parts';
import { createPs1Material } from '../../core/parts/ps1-material';
import { createCanvasTexture } from '../../core/views/screens';
import { SANS } from '../../core/views/fitting-tools';
import { createDymoLabel } from '../../core/views/hand-labels';
import { plantTools } from './plant-tools';

/**
 * A packaged spa set's own mimic (the owner, 2026-10-23: the foot spa is
 * too small for a board of its own; its mimic is part of its cabinet):
 * the top of the cabinet's control panel, its circuit printed on it (the
 * spa, the surge vessel, the pump, the filter, the UV, the heat exchanger
 * and back), an LED set into the print at each thing that runs or opens,
 * and one fixed-purpose LED readout, the water's temperature, its legend
 * on Dymo tape; and its thermostat: ▲ and ▼ beside the readout, which
 * show its setting (its SET lamp lit) and step it by half a degree, the
 * readout going back to the water a few seconds after the last press.
 * `width` by 0.24 m, facing +z, its middle at the origin.
 */
export interface CabinetMimicState {
  pump: boolean;
  uv: boolean;
  /** Heat called for: the heat exchanger's primary on. */
  heat: boolean;
  /** The drain running and make-up valve open (the foot spa's). */
  drain?: boolean;
  /** Fresh make-up water is actually flowing into the foot spa. */
  filling?: boolean;
  makeUp?: boolean;
  /** The water's temperature, °C; nothing while the panel is unpowered. */
  waterC: number | null;
  /** Its thermostat's setting, °C. */
  setC: number;
}

/** How long the readout shows the setting after the last press, s. */
export const SET_SHOWN = 4;

export function createCabinetMimic(
  kit: PanelKit,
  {
    width = 0.46,
    drainAndMakeUp = true,
    onSet,
    parts = createPartSet(),
  }: {
    width?: number;
    drainAndMakeUp?: boolean;
    /** Its ▲ or ▼ pressed: the setting stepped by `step`, °C. */
    onSet?: (step: number) => void;
    /** The panel's parts its buttons join, to be worked with the rest. */
    parts?: ReturnType<typeof createPartSet>;
  } = {},
) {
  const t = plantTools(kit);
  const group = new Group();
  group.name = 'Cabinet mimic';
  const H = 0.24;
  const px = 600;
  const ph = Math.round((px * H) / width);
  const { context: c, texture } = createCanvasTexture(px, ph);
  kit.textures.push(texture);
  const s = px / width;
  // In metres from the plate's middle: x right, y up.
  const P = (x: number, y: number): [number, number] => [
    px / 2 + x * s,
    ph / 2 - y * s,
  ];
  c.fillStyle = '#e9ece6';
  c.fillRect(0, 0, px, ph);
  c.fillStyle = '#1b1f20';
  c.font = `bold ${0.018 * s}px ${SANS}`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText('WATER CIRCUIT', ...P(-width / 2 + 0.015, H / 2 - 0.02));
  // The circuit: along the bottom, left to right, and back over the top.
  const yLoop = -0.04;
  const yTop = 0.045;
  const xs = {
    spa: -0.195,
    surge: -0.135,
    pump: -0.08,
    filter: -0.025,
    uv: 0.03,
    hx: 0.08,
  };
  c.strokeStyle = '#2f7d3a';
  c.lineWidth = 0.006 * s;
  c.beginPath();
  c.moveTo(...P(xs.spa, yLoop));
  c.lineTo(...P(xs.hx + 0.03, yLoop));
  c.lineTo(...P(xs.hx + 0.03, yTop));
  c.lineTo(...P(xs.spa, yTop));
  c.lineTo(...P(xs.spa, yLoop));
  c.stroke();
  const symbol = (x: number, label: string, draw: () => void) => {
    c.save();
    c.translate(...P(x, yLoop));
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#1b1f20';
    c.lineWidth = 0.002 * s;
    draw();
    c.restore();
    c.fillStyle = '#1b1f20';
    c.font = `bold ${0.011 * s}px ${SANS}`;
    c.textAlign = 'center';
    c.fillText(label, ...P(x, yLoop - 0.03));
  };
  const r = 0.014 * s;
  symbol(xs.spa, 'SPA', () => {
    c.fillRect(-r * 1.4, -r, r * 2.8, r * 2);
    c.strokeRect(-r * 1.4, -r, r * 2.8, r * 2);
  });
  symbol(xs.surge, 'SURGE', () => {
    c.fillRect(-r * 0.8, -r * 1.2, r * 1.6, r * 2.4);
    c.strokeRect(-r * 0.8, -r * 1.2, r * 1.6, r * 2.4);
  });
  symbol(xs.pump, 'PUMP', () => {
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-r * 0.4, -r * 0.6);
    c.lineTo(r * 0.7, 0);
    c.lineTo(-r * 0.4, r * 0.6);
    c.closePath();
    c.fillStyle = '#1b1f20';
    c.fill();
  });
  symbol(xs.filter, 'FILTER', () => {
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(-r, 0);
    c.lineTo(r, 0);
    c.stroke();
  });
  symbol(xs.uv, 'UV', () => {
    c.fillRect(-r * 1.2, -r * 0.6, r * 2.4, r * 1.2);
    c.strokeRect(-r * 1.2, -r * 0.6, r * 2.4, r * 1.2);
  });
  symbol(xs.hx, 'HEAT', () => {
    c.fillRect(-r * 0.8, -r, r * 1.6, r * 2);
    c.strokeRect(-r * 0.8, -r, r * 1.6, r * 2);
    c.beginPath();
    for (let k = 0; k <= 4; k++)
      c.lineTo((k % 2 ? 1 : -1) * r * 0.5, -r + (k / 4) * 2 * r);
    c.stroke();
  });
  if (drainAndMakeUp) {
    c.fillStyle = '#1b1f20';
    c.font = `bold ${0.011 * s}px ${SANS}`;
    c.textAlign = 'center';
    c.fillText('DRAIN', ...P(xs.spa - 0.01, yTop + 0.035));
    c.fillText('MAKE-UP', ...P(xs.surge + 0.03, yTop + 0.035));
  }
  texture.needsUpdate = true;
  const face = new Mesh(
    new PlaneGeometry(width, H),
    createPs1Material({ map: texture, roughness: 0.6 }),
  );
  kit.materials.push(face.material as never);
  group.add(face);
  // The LEDs, set into the print beside what they tell of.
  const at = (x: number, y: number, colour: string) => {
    const l = t.led(group, colour, 0.0045, x, y, 0.002);
    l.mesh.userData.live = true;
    return l;
  };
  const leds = {
    pump: at(xs.pump, yLoop + 0.025, '#4cff6a'),
    uv: at(xs.uv, yLoop + 0.025, '#4aa8ff'),
    heat: at(xs.hx, yLoop + 0.03, '#ffb02a'),
    ...(drainAndMakeUp
      ? {
          drain: at(xs.spa - 0.01, yTop + 0.018, '#ff3b24'),
          makeUp: at(xs.surge + 0.03, yTop + 0.018, '#4aa8ff'),
        }
      : {}),
  };
  // The circuit LEDs are useful close up, but drain-down must be obvious
  // from the aisle. These larger annunciators sit below the printed mimic.
  const statusLeds = drainAndMakeUp
    ? (() => {
        t.box(
          group,
          t.paint('#424a49', 0.65),
          width,
          0.065,
          0.008,
          0,
          -0.16,
          0.001,
        );
        const drain = t.led(group, '#ff3b24', 0.012, -0.2, -0.16, 0.008);
        const makeUp = t.led(group, '#4aa8ff', 0.012, 0.02, -0.16, 0.008);
        for (const [label, x] of [
          ['DRAINING', -0.125],
          ['FILLING', 0.12],
        ] as const) {
          const mark = createMicroLabel(kit, label, {
            height: 0.012,
            ink: '#f1f3ed',
          });
          mark.position.set(x, -0.16, 0.006);
          group.add(mark);
        }
        return { drain, makeUp };
      })()
    : null;
  // The water's temperature: an LED readout, its legend on Dymo tape.
  const readout = createSevenSegment(kit, 3, { digitHeight: 0.022 });
  readout.group.position.set(width / 2 - 0.07, 0.02, 0.002);
  readout.group.traverse((o) => (o.userData.live = true));
  group.add(readout.group);
  const tape = createDymoLabel(kit, 'WATER °C', { seed: 9 });
  tape.position.set(width / 2 - 0.07, -0.025, 0.003);
  group.add(tape);
  // The thermostat: ▲ and ▼ beside the readout, and its SET lamp.
  let shownFor = 0;
  const press = (step: number) => {
    onSet?.(step);
    shownFor = SET_SHOWN;
  };
  for (const [legend, step, y] of [
    ['+', 0.5, 0.032],
    ['−', -0.5, 0.004],
  ] as const) {
    const button = parts.add(
      pushButton(kit, {
        colour: 'black',
        name: `Spa set thermostat ${step > 0 ? 'up' : 'down'}`,
        action: () => press(step),
      }),
    );
    button.object.position.set(width / 2 - 0.018, y, 0.002);
    button.object.scale.setScalar(0.7);
    group.add(button.object);
    const mark = createMicroLabel(kit, legend, {
      height: 0.015,
      ink: '#1b1f20',
    });
    mark.position.set(width / 2 - 0.034, y, 0.002);
    group.add(mark);
  }
  // Over the readout, clear of the print.
  const setLamp = at(width / 2 - 0.05, 0.06, '#ffb02a');
  const setMark = createMicroLabel(kit, 'SET', {
    height: 0.008,
    ink: '#1b1f20',
  });
  setMark.position.set(width / 2 - 0.075, 0.06, 0.002);
  group.add(setMark);
  return {
    group,
    parts,
    /** Step the time its setting stays shown. */
    update(delta: number) {
      shownFor = Math.max(0, shownFor - delta);
    },
    show(s: CabinetMimicState) {
      const setting = shownFor > 0 && s.waterC !== null;
      setLamp.set(setting);
      leds.pump.set(s.pump);
      leds.uv.set(s.uv);
      leds.heat.set(s.heat);
      leds.drain?.set(!!s.drain);
      leds.makeUp?.set(!!s.makeUp);
      statusLeds?.drain.set(!!s.drain);
      statusLeds?.makeUp.set(!!s.filling);
      if (setting) {
        readout.show(s.setC.toFixed(1));
        return;
      }
      readout.show(s.waterC === null ? '' : s.waterC.toFixed(1));
    },
  };
}
