import { Group } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../components/core/views/eighties-controls';
import { tools } from '../../components/core/views/fitting-tools';
import { panelMakerMark } from '../../components/core/views/panel-maker-mark';
import {
  createPartSet,
  pilotLight,
  potentiometer,
  selector,
} from '../../components/core/parts/parts';
import { PENFOLD_GREY } from '../../components/industrial-control/views/control-cubicle';
import { roomWorld } from '../../save/world-store';
import { serviceAvailable } from '../../../game/plant/services';

/** Remote illuminator controls, mounted in the Jacuzzi plant room. */
export function createJacuzziFibreControl(kit: PanelKit) {
  const store = roomWorld();
  const state = () => store.world.value.jacuzziFibreIlluminator;
  const t = tools(kit);
  const group = new Group();
  const parts = createPartSet();
  t.box(group, t.paint('#25282a', 0.7), 0.72, 0.64, 0.025, 0, 0, 0.01);
  t.box(group, t.paint(PENFOLD_GREY, 0.55), 0.68, 0.6, 0.12, 0, 0, 0.08);
  const face = new Group();
  face.position.z = 0.145;
  group.add(face);
  const label = (text: string, x: number, y: number, height = 0.012) => {
    const plate = createMicroLabel(kit, text, {
      height,
      ink: '#171b1d',
      maxWidth: 0.62,
    });
    plate.position.set(x, y, 0.002);
    face.add(plate);
  };
  label('SPA FIBRE ILLUMINATOR', 0, 0.245, 0.018);
  const power = parts.add(
    selector(kit, {
      positions: 2,
      series: 'xb4',
      name: 'Spa fibre illuminator on/off',
      bound: {
        get value() {
          return Number(state().on);
        },
        set: (value) =>
          store.dispatch({
            type: 'jacuzzi/fibre-illuminator',
            action: { control: 'on', value: Boolean(value) },
          }),
      },
    }),
  );
  power.object.position.set(-0.21, 0.11, 0);
  face.add(power.object);
  label('OFF / ON', -0.21, 0.055);
  const run = parts.add(
    pilotLight(kit, {
      colour: 'green',
      series: 'xb4',
      name: 'Spa fibre illuminator running indicator',
      drive: {
        get value() {
          return state().on;
        },
      },
      power: {
        get value() {
          return serviceAvailable(
            store.world.value.plant,
            'plant_pool_03',
            'power',
          );
        },
      },
      pushToTest: false,
    }),
  );
  run.object.position.set(-0.04, 0.11, 0);
  face.add(run.object);
  label('ON', -0.04, 0.055);
  const colour = parts.add(
    selector(kit, {
      positions: 2,
      series: 'xb4',
      name: 'Spa fibre white or rainbow',
      bound: {
        get value() {
          return Number(state().rainbow);
        },
        set: (value) =>
          store.dispatch({
            type: 'jacuzzi/fibre-illuminator',
            action: { control: 'rainbow', value: Boolean(value) },
          }),
      },
    }),
  );
  colour.object.position.set(0.22, 0.11, 0);
  face.add(colour.object);
  label('WHITE / COLOUR', 0.22, 0.055);
  const brightness = parts.add(
    potentiometer(kit, {
      steps: 10,
      name: 'Spa fibre brightness',
      bound: {
        get value() {
          return Math.round(state().brightness * 10);
        },
        set: (value) =>
          store.dispatch({
            type: 'jacuzzi/fibre-illuminator',
            action: { control: 'brightness', value: value / 10 },
          }),
      },
    }),
  );
  brightness.object.position.set(-0.17, -0.115, 0);
  face.add(brightness.object);
  label('BRIGHTNESS 0-10', -0.17, -0.205);
  const speed = parts.add(
    potentiometer(kit, {
      steps: 10,
      name: 'Spa fibre twinkle speed',
      bound: {
        get value() {
          return state().twinkleSpeed;
        },
        set: (value) =>
          store.dispatch({
            type: 'jacuzzi/fibre-illuminator',
            action: { control: 'twinkleSpeed', value },
          }),
      },
    }),
  );
  speed.object.position.set(0.17, -0.115, 0);
  face.add(speed.object);
  label('TWINKLE 0-10', 0.17, -0.205);
  label('0 = STEADY', 0.17, -0.242, 0.009);
  panelMakerMark(kit, face, {
    width: 0.68,
    height: 0.6,
    z: 0,
    corner: 'bottom-right',
  });
  return { group, parts };
}
