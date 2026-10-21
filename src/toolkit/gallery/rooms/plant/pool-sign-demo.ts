import { Group } from 'three';
import type { Object3D } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { tools } from '../../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../../components/core/views/panel-maker-mark';
import { createEngravedPlate } from '../../../components/core/views/plant-signs';
import {
  createPartSet,
  potentiometer,
  pushButton,
  selector,
} from '../../../components/core/parts/parts';
import { PENFOLD_GREY } from '../../../components/industrial-control/views/control-cubicle';
import {
  DEV_SIGN_DEFAULTS,
  devSignState,
} from '../../../components/pool/logic/pool-info-sign';
import type {
  DevSignMode,
  DevSignValues,
} from '../../../components/pool/logic/pool-info-sign';
import {
  createPoolInfoSign,
  POOL_SIGN,
} from '../../../components/pool/views/pool-info-sign';
import type { PoolSignMount } from '../../../components/pool/views/pool-info-sign';

/**
 * The poolside information sign on trial, wall-mounted and on a post,
 * each with a development test panel beside it. The panel is the sign's
 * data source here, and says so: its knobs set the readings by hand; no
 * chemistry simulation is behind them. In the game the sign takes the
 * sample flow cell's readings (`src/game/plant/sampling.ts`) and the
 * combined chlorine keyed in after the daily DPD test.
 *
 * The panel: POWER (off, on); MODE, a four-way cam switch (NORMAL; NO
 * DATA, every reading missing, shown as dashes; STALE, the online
 * readings ten minutes old, flashing; TEST, every segment lit); a knob
 * for each reading; and POOL, which changes the name insert.
 */

const MODES: readonly DevSignMode[] = ['normal', 'missing', 'stale', 'test'];
const NAMES = ['MAIN POOL', 'LEARNER POOL', 'SPA POOL', 'RING POOL'];

/** Each knob: its legend, first value, step and number of steps. */
const KNOBS: readonly {
  key: keyof Omit<DevSignValues, 'combinedAt'>;
  legend: string;
  from: number;
  step: number;
  steps: number;
}[] = [
  { key: 'air', legend: 'AIR °C', from: 24, step: 0.5, steps: 20 },
  { key: 'humidity', legend: 'RH %', from: 40, step: 2, steps: 30 },
  { key: 'water', legend: 'WATER °C', from: 24, step: 0.5, steps: 20 },
  { key: 'ph', legend: 'pH', from: 6.8, step: 0.1, steps: 12 },
  { key: 'free', legend: 'FREE Cl', from: 0, step: 0.1, steps: 30 },
  { key: 'combined', legend: 'COMB Cl', from: 0, step: 0.05, steps: 20 },
  { key: 'redox', legend: 'REDOX mV', from: 500, step: 10, steps: 40 },
];

/** The time of day by the computer's clock, seconds, for the sign's clock. */
const clockNow = () => {
  const d = new Date();
  return (
    d.getHours() * 3600 +
    d.getMinutes() * 60 +
    d.getSeconds() +
    d.getMilliseconds() / 1000
  );
};

/** The test panel: a small grey Penfold box, its face toward +z. */
function testPanel(kit: PanelKit) {
  const t = tools(kit);
  const w = 0.62;
  const h = 0.42;
  const object = new Group();
  object.name = 'Pool sign test panel';
  t.box(object, t.paint(PENFOLD_GREY, 0.55), w, h, 0.1, 0, 0, 0.05);
  const face = new Group();
  face.position.z = 0.1;
  object.add(face);
  const plate = createEngravedPlate(
    kit,
    ['POOL SIGN TEST', 'DEV DATA · NOT FROM PLANT'],
    { colour: 'white', width: w - 0.05, height: 0.06 },
  );
  plate.position.set(0, h / 2 - 0.05, 0.002);
  face.add(plate);
  panelMakerMark(kit, face, {
    width: w,
    height: h,
    z: 0,
    corner: 'bottom-right',
  });
  const parts = createPartSet();
  const power = parts.add(
    selector(kit, {
      positions: 2,
      initial: 1,
      legend: 'POWER',
      name: 'Pool sign power',
    }),
  );
  power.object.position.set(-0.18, 0.06, 0);
  const mode = parts.add(
    selector(kit, {
      positions: 4,
      initial: 0,
      legend: 'NORM · NO DATA · STALE · TEST',
      name: 'Pool sign mode',
    }),
  );
  mode.object.position.set(0.02, 0.06, 0);
  let nameIndex = 0;
  const pool = parts.add(
    pushButton(kit, {
      colour: 'black',
      legend: 'POOL',
      name: 'Pool sign name',
      action: () => (nameIndex = (nameIndex + 1) % NAMES.length),
    }),
  );
  pool.object.position.set(0.2, 0.06, 0);
  const knobs = KNOBS.map((k, i) => {
    const initial = (DEV_SIGN_DEFAULTS[k.key] - k.from) / (k.step * k.steps);
    const knob = parts.add(
      potentiometer(kit, {
        steps: k.steps,
        initial,
        legend: k.legend,
        name: `Pool sign ${k.legend}`,
      }),
    );
    knob.object.position.set(-0.24 + i * 0.08, -0.09, 0);
    return { ...k, knob };
  });
  for (const part of [power, mode, pool, ...knobs.map((k) => k.knob)])
    face.add(part.object);

  const values: DevSignValues = { ...DEV_SIGN_DEFAULTS };
  const source = (now: number) => {
    for (const k of knobs) {
      const value = +(k.from + k.knob.position.value * k.step).toFixed(2);
      // Combined chlorine is keyed in: its time is when it last changed.
      if (k.key === 'combined' && value !== values.combined)
        values.combinedAt = now;
      values[k.key] = value;
    }
    return devSignState(
      NAMES[nameIndex],
      power.position.value === 1,
      MODES[mode.position.value],
      values,
      now,
      clockNow(),
    );
  };
  return { object, parts, source, w, h };
}

/** A sign and its test panel, working together. */
function signDemo(kit: PanelKit, mount: PoolSignMount): LiveExhibit {
  const object = new Group();
  const sign = createPoolInfoSign(kit, mount);
  object.add(sign.object);
  const panel = testPanel(kit);
  object.add(panel.object);
  if (mount === 'wall') {
    // The sign at a poolside height, its panel at hand to its right.
    sign.object.position.set(-0.42, 0.15, 0);
    panel.object.position.set(0.42, -0.55, 0);
  } else {
    // The panel on its own stand beside the post.
    sign.object.position.x = -0.3;
    panel.object.position.set(0.42, 1.1, 0);
    const t = tools(kit);
    const stand = t.paint('#3a3d40', 0.6);
    t.box(object, stand, 0.05, 0.9, 0.05, 0.42, 0.45, 0.03);
    t.box(object, stand, 0.3, 0.012, 0.25, 0.42, 0.006, 0.03);
  }
  // Everything here changes as it runs; keep it out of merged geometry.
  object.traverse((o: Object3D) => (o.userData.live = true));
  const clock = () => performance.now() / 1000;
  return {
    object,
    parts: panel.parts,
    update() {
      const now = clock();
      sign.show(panel.source(now), now);
      sign.update(now);
    },
  };
}

export const POOL_SIGN_WALL: PlantExhibit = {
  title: 'Pool information sign, wall',
  reference:
    'After Eltin’s poolside water-treatment board (Bodet’s for the case); 0.62 × 1.3 m, 60 and 90 mm digits, estimated. Test panel is development data, not the plant',
  size: { w: 1.8, d: 0.2, h: 1.65, mount: 'wall', y: 1.75 },
  build: (kit) => signDemo(kit, 'wall'),
};

export const POOL_SIGN_POST: PlantExhibit = {
  title: 'Pool information sign, post',
  reference:
    'The same sign clamped to a 76 mm post on a base plate, its middle 1.9 m up. Test panel is development data, not the plant',
  size: {
    w: 1.5,
    d: 0.5,
    h: POOL_SIGN.postCentreY + POOL_SIGN.h / 2 + 0.06,
    mount: 'floor',
  },
  build: (kit) => signDemo(kit, 'post'),
};
