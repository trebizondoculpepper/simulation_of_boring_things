import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createEngravedPlate } from '../../core/views/plant-signs';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import {
  createPartSet,
  pilotLight,
  pushButton,
  selector,
} from '../../core/parts/parts';
import {
  TRI_STATES,
  triStateIndicator,
} from '../../core/parts/panel-indicators';
import { PENFOLD_GREY } from '../../industrial-control/views/control-cubicle';
import {
  AUTO,
  FLUE_HIGH,
  boilersPermitted,
  fanProven,
  fanRuns,
} from '../logic/combustion';
import type { CombustionState } from '../logic/combustion';

/**
 * The boiler house's combustion and ventilation panel, a wall-mounted
 * Penfold Controls enclosure (900 × 650 mm): a seven-segment readout of
 * each boiler's flue gas temperature and the common header's, with a
 * FLUE HIGH lamp under each boiler's; the combustion air fan's tri-state
 * indicator and HAND · OFF · AUTO selector; the room's carbon monoxide in
 * ppm with its alarm lamp; BOILERS PERMITTED; and RESET. In metres,
 * facing +z, its back on the wall.
 */

export interface CombustionPanelView {
  group: Group;
  parts: ReturnType<typeof createPartSet>;
  /** Show the state; call each frame. Its parts step with the room's. */
  show(c: CombustionState): void;
}

const W = 0.9,
  H = 0.65,
  D = 0.2;

export function createCombustionPanel(
  kit: PanelKit,
  { setFan, reset }: { setFan: (hoa: number) => void; reset: () => void },
): CombustionPanelView {
  const t = tools(kit);
  const group = new Group();
  group.name = 'Combustion and ventilation panel';
  t.box(group, t.paint(PENFOLD_GREY, 0.55), W, H, D, 0, 0, D / 2);
  const face = new Group();
  face.position.z = D;
  group.add(face);
  const plate = createEngravedPlate(
    kit,
    ['BOILER HOUSE COMBUSTION AND VENTILATION'],
    { colour: 'white', width: 0.7, height: 0.05 },
  );
  plate.position.set(0, H / 2 - 0.05, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, {
    width: W,
    height: H,
    z: 0,
    corner: 'bottom-right',
  });
  const parts = createPartSet();
  const readout = (legend: string, x: number, y: number) => {
    t.box(face, t.paint('#141516', 0.4), 0.15, 0.075, 0.01, x, y, 0.005);
    const digits = createSevenSegment(kit, 4, { digitHeight: 0.026 });
    digits.group.position.set(x, y + 0.004, 0.011);
    digits.group.traverse((o) => (o.userData.live = true));
    face.add(digits.group);
    const label = createMicroLabel(kit, legend, {
      height: 0.01,
      ink: '#16181a',
    });
    label.position.set(x, y - 0.05, 0.002);
    face.add(label);
    return digits;
  };
  const lamp = (
    colour: 'green' | 'amber' | 'red',
    legend: string,
    x: number,
    y: number,
  ) => {
    const on = signal(false);
    const part = parts.add(
      pilotLight(kit, { colour, legend, drive: on, name: `${legend} lamp` }),
    );
    part.object.position.set(x, y, 0);
    face.add(part.object);
    return on;
  };
  // The flue temperatures, across the top.
  const flues = [
    readout('B-501 FLUE  °C', -0.28, 0.16),
    readout('B-502 FLUE  °C', 0, 0.16),
  ];
  const header = readout('HEADER FLUE  °C', 0.28, 0.16);
  const flueHigh = [
    lamp('amber', 'B-501 FLUE HIGH', -0.28, 0.04),
    lamp('amber', 'B-502 FLUE HIGH', 0, 0.04),
  ];
  // The fan, the CO and the interlock, below.
  const fan = signal<number | null>(1);
  const indicator = triStateIndicator(kit, {
    lamps: TRI_STATES.motor,
    state: fan,
    title: 'AF-01 COMBUSTION AIR FAN',
  });
  indicator.group.position.set(-0.3, -0.1, 0);
  face.add(indicator.group);
  for (const l of indicator.lamps) parts.add(l);
  const hoa = parts.add(
    selector(kit, {
      positions: 3,
      initial: AUTO,
      legend: 'HAND · OFF · AUTO',
      name: 'Combustion air fan HAND OFF AUTO',
    }),
  );
  hoa.object.position.set(-0.3, -0.25, 0);
  face.add(hoa.object);
  const co = readout('CO  ppm', 0.02, -0.1);
  const coAlarm = lamp('red', 'CO ALARM', 0.02, -0.23);
  const permitted = lamp('green', 'BOILERS PERMITTED', 0.28, 0.04);
  const inhibited = lamp('red', 'BOILERS INHIBITED', 0.28, -0.1);
  const resetButton = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'RESET',
      action: reset,
      name: 'Combustion panel reset',
    }),
  );
  resetButton.object.position.set(0.24, -0.23, 0);
  face.add(resetButton.object);
  let hoaShown = AUTO;
  const two = (v: number) =>
    String(Math.round(Math.max(0, Math.min(999, v)))).padStart(4, ' ');
  return {
    group,
    parts,
    show(c) {
      if (hoa.position.value !== hoaShown) {
        hoaShown = hoa.position.value;
        setFan(hoaShown);
      }
      c.flues.forEach((v, i) => {
        flues[i]?.show(two(v));
        if (flueHigh[i]) flueHigh[i].value = v > FLUE_HIGH;
      });
      header.show(two(c.header));
      co.show(two(c.co));
      // Its fan: running when proven, stopped when off, FAULT while it
      // runs unproven (starting, or its air switch not made).
      fan.value = fanProven(c.vent) ? 0 : fanRuns(c.vent) ? 2 : 1;
      coAlarm.value = c.coAlarm;
      permitted.value = boilersPermitted(c);
      inhibited.value = !boilersPermitted(c);
    },
  };
}
