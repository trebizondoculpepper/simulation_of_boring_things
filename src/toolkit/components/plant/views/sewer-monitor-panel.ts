import { Group } from 'three';
import { computed, signal } from '@preact/signals-core';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { createPartSet, pilotLight } from '../../core/parts/parts';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import { createTrendRecorder } from '../../industrial-control/views/cabinet-fittings';
import { plantTools } from './plant-tools';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';

/** What the panel shows, as the world has it (`sewer-monitor.ts`). */
export interface SewerMonitorBinding {
  /** The flow now, m³/h. */
  flow(): number;
  /** The totaliser, m³. */
  total(): number;
  /** The chart's samples, newest last, each 0 to 1 across its scale. */
  samples(): readonly number[];
  /** Over the consent now. */
  over(): boolean;
  /** Whether the panel has its supply. */
  powered(): boolean;
}

/** The panel's face, metres. */
export const SEWER_MONITOR_PANEL = { w: 0.6, h: 0.8, d: 0.12 } as const;

/**
 * The sewer outfall monitor (the owner, 2026-10-26): a Penfold steel
 * panel on the wall, with the outfall's electromagnetic flowmeter's remote
 * converter (Kessler-Moody: the flow, m³/h, and its totaliser, m³), the
 * consent written under it, a red OVER CONSENT lamp, and a single-pen
 * strip-chart recorder writing the outfall's flow on its paper (a day in
 * its window, 0 to 30 m³/h, the consent ruled in red). Its middle at the
 * origin, its face +z.
 */
export function createSewerMonitorPanel(
  kit: PanelKit,
  binding: SewerMonitorBinding,
  {
    consent,
    scaleMax,
    hourEvery,
  }: { consent: number; scaleMax: number; hourEvery: number },
): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Sewer outfall monitor';
  const { w, h, d } = SEWER_MONITOR_PANEL;
  t.box(object, t.paint('#7d8a86', 0.55), w, h, d, 0, 0, d / 2);
  panelMakerMark(kit, object, { width: w, height: h, z: d + 0.001 });
  const face = d + 0.002;
  const label = (text: string, x: number, y: number, size: number) => {
    const mark = createMicroLabel(kit, text, {
      height: size,
      ink: '#151515',
      plate: '#f2f0e8',
    });
    mark.position.set(x, y, face);
    object.add(mark);
  };
  label('SEWER OUTFALL MONITOR', -0.06, h / 2 - 0.045, 0.024);
  label(`FOUL SEWER  CONSENT ${consent} m3/h`, -0.06, h / 2 - 0.085, 0.016);
  // The flowmeter's remote converter: its rate and its totaliser.
  t.box(
    object,
    t.paint('#c9cbc6', 0.6, 0.2),
    0.26,
    0.11,
    0.04,
    -0.13,
    0.2,
    d + 0.02,
  );
  const lcd = createCharacterLcd(kit, {
    columns: 16,
    rows: 2,
    cell: 0.0075,
    backlight: true,
  });
  lcd.group.position.set(-0.13, 0.2, d + 0.041);
  object.add(lcd.group);
  label('KESSLER-MOODY  FT  OUTFALL', -0.13, 0.125, 0.012);
  // Over the consent: a red lamp.
  const parts = createPartSet();
  const over = signal(false);
  const powered = signal(true);
  const lamp = parts.add(
    pilotLight(kit, {
      colour: 'red',
      drive: computed(() => over.value && powered.value),
      name: 'Sewer outfall OVER CONSENT lamp',
    }),
  );
  lamp.object.position.set(0.17, 0.2, face);
  object.add(lamp.object);
  label('OVER CONSENT', 0.17, 0.145, 0.012);
  // The recorder, below.
  const recorder = createTrendRecorder(kit, {
    title: 'OUTFALL m3/h',
    scale: `0    ${scaleMax / 2}    ${scaleMax}`,
    marks: [{ at: consent / scaleMax, colour: '#d02b20' }],
    hourEvery,
  });
  recorder.group.scale.setScalar(2.2);
  recorder.group.position.set(0, -0.15, d);
  object.add(recorder.group);
  let shown = '';
  return {
    object,
    parts,
    update(delta) {
      powered.value = binding.powered();
      over.value = binding.over();
      const lines = powered.value
        ? [
            `FLOW ${binding.flow().toFixed(1).padStart(6)} m3/h`,
            `TOTAL ${Math.round(binding.total()).toString().padStart(7)} m3`,
          ]
        : ['', ''];
      const key = lines.join('|');
      if (key !== shown) {
        shown = key;
        lcd.show(lines);
      }
      recorder.show(binding.samples());
      recorder.update(delta);
    },
  };
}
