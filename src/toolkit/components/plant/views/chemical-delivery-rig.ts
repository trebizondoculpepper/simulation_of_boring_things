import { Group } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet, pushButton, selector } from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import { createFramedChemicalTank } from './framed-chemical-tank';
import {
  DELIVERY_TANKS,
  capacityOf,
  deliveryRunning,
  newDeliveryState,
  roomFor,
  stepDelivery,
  stockOf,
} from '../../../../game/plant/chemical-delivery-demo';
import type { DeliveryChemical } from '../../../../game/plant/chemical-delivery-demo';

/** A product-specific, working bulk-delivery trial, with its hose already attached. */
export function createChemicalDeliveryRig(
  kit: PanelKit,
  chemical: DeliveryChemical,
) {
  const group = new Group();
  const t = plantTools(kit);
  const f = tools(kit);
  const parts = createPartSet();
  const spec = DELIVERY_TANKS[chemical];
  const acid = chemical === 'acid';
  const product = acid ? 'HYDROCHLORIC ACID 10%' : 'SODIUM HYPOCHLORITE 14%';
  const colour = acid ? '#b92b24' : '#d2ae20';
  const paint = t.paint(colour, 0.45);
  const dark = t.paint('#30383a', 0.7);
  let state = newDeliveryState(chemical);
  const tanks: Array<{ setLevel(level: number): void }> = [];

  // Framed rectangular HDPE tanks (`framed-chemical-tank.ts`), each with
  // its fill, outlet, level transmitter, display and high-level switch.
  const makeTank = (tag: string) =>
    createFramedChemicalTank(kit, {
      tag,
      product,
      litres: spec.eachLitres,
      acid,
    });

  for (let i = 0; i < spec.count; i++) {
    const tank = makeTank(`${acid ? 'AS' : 'HS'}-T${i + 1}`);
    const x = (i - (spec.count - 1) / 2) * 2.75;
    tank.object.position.set(x, 0, -1.9);
    group.add(tank.object);
    tanks.push(tank);
    // A separate, labelled fill main from the fill point to each tank's
    // inlet valve.
    const [fx, fy, fz] = tank.fillAt;
    t.pipe(group, 50, [
      [0, 0.45, 1.15],
      [0, 0.45, 0.2],
      [x + fx, 0.45, 0.2],
      [x + fx, fy, -1.9 + fz],
    ]);
  }

  // The pre-connected tanker hose ends at the dedicated, incompatible inlet.
  const cabinet = new Group();
  cabinet.position.set(0, 0, 1.18);
  group.add(cabinet);
  const cabinetShell = t.paint('#d4dad7', 0.7);
  t.box(cabinet, cabinetShell, 0.84, 1.15, 0.34, 0, 1.08, 0);
  t.box(cabinet, dark, 0.75, 0.12, 0.32, 0, 0.58, 0.02); // contained drip tray
  t.box(cabinet, t.paint('#9faeac', 0.4), 0.74, 0.68, 0.015, 0, 1.13, 0.184);
  t.box(cabinet, cabinetShell, 0.07, 0.88, 0.03, -0.38, 1.16, 0.19);
  t.box(cabinet, cabinetShell, 0.07, 0.88, 0.03, 0.38, 1.16, 0.19);
  t.box(cabinet, cabinetShell, 0.8, 0.07, 0.03, 0, 1.59, 0.19);
  t.box(cabinet, cabinetShell, 0.8, 0.07, 0.03, 0, 0.74, 0.19);
  t.box(cabinet, paint, 0.66, 0.12, 0.02, 0, 1.42, 0.211);
  f.label(cabinet, product, 0, 1.43, 0.228, 0.019, '#ffffff', colour);
  t.cyl(cabinet, paint, acid ? 0.065 : 0.083, 0.14, 0, 0.96, 0.24, 'z', 20);
  t.cyl(cabinet, dark, acid ? 0.084 : 0.103, 0.045, 0, 0.96, 0.29, 'z', 20);
  f.label(
    cabinet,
    'DEDICATED FILL POINT',
    0,
    0.77,
    0.226,
    0.018,
    '#182322',
    '#d4dad7',
  );
  t.pipe(group, 50, [
    [-2.2, 0.5, 3.55],
    [-1.2, 0.6, 2.8],
    [0, 0.96, 1.5],
  ]);
  t.box(group, dark, 0.85, 0.6, 1.4, -2.2, 0.37, 3.45);
  f.label(
    group,
    'TANKER HOSE CONNECTED',
    -2.2,
    0.78,
    4.16,
    0.023,
    '#ffffff',
    '#30383a',
  );

  // Local delivery panel: all player controls and the transfer record.
  t.box(group, dark, 1.8, 1.8, 0.15, 2.0, 1.4, 2.4);
  const face = f.printed(
    1.6,
    1.0,
    (c, w, h) => {
      c.fillStyle = '#d8dfbc';
      c.fillRect(0, 0, w, h);
    },
    512,
    true,
  );
  face.mesh.position.set(2, 1.75, 2.49);
  face.mesh.userData.live = true;
  group.add(face.mesh);
  const draw = () => {
    const c = face.context;
    const w = c.canvas.width;
    const h = c.canvas.height;
    c.fillStyle = '#d8dfbc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#182721';
    c.font = 'bold 29px monospace';
    c.fillText(product, 14, 35);
    c.font = '24px monospace';
    c.fillText(
      `STOCK  ${Math.round(stockOf(state))}/${capacityOf(state)} L`,
      14,
      89,
    );
    c.fillText(`SPACE  ${Math.round(roomFor(state))} L`, 14, 129);
    c.fillText(`TRUCK  ${Math.round(state.tankerLitres)} L`, 14, 169);
    c.fillText(
      `FLOW   ${deliveryRunning(state) ? spec.rateLpm : 0} L/min`,
      14,
      209,
    );
    c.fillText(`RECEIVED ${Math.round(state.deliveredLitres)} L`, 14, 249);
    c.fillStyle =
      state.emergencyStopped || state.highAlarm ? '#8b1813' : '#194f2b';
    c.fillText(
      state.emergencyStopped
        ? 'EMERGENCY STOP'
        : state.highAlarm
          ? 'HIGH-HIGH: STOP'
          : deliveryRunning(state)
            ? 'TRANSFERRING'
            : 'READY / STOPPED',
      14,
      293,
    );
    face.texture.needsUpdate = true;
  };
  const control = (
    label: string,
    colour: 'black' | 'red',
    x: number,
    y: number,
    action: () => void,
  ) => {
    const part = pushButton(kit, { colour, legend: label, action });
    parts.add(part);
    part.object.position.set(x, y, 2.495);
    part.object.scale.setScalar(0.85);
    group.add(part.object);
  };
  const key = selector(kit, {
    positions: 2,
    key: true,
    legend: 'TRANSFER OFF · ON',
    name: 'Delivery enable key',
    bound: {
      get value() {
        return state.enabled ? 1 : 0;
      },
      set: (n: number) => {
        state = { ...state, enabled: n === 1 };
        draw();
      },
    },
  });
  parts.add(key);
  key.object.position.set(1.45, 0.93, 2.495);
  group.add(key.object);
  const valve = selector(kit, {
    positions: 2,
    legend: 'INLET SHUT · OPEN',
    name: 'Bulk tank inlet valve',
    bound: {
      get value() {
        return state.valveOpen ? 1 : 0;
      },
      set: (n: number) => {
        state = { ...state, valveOpen: n === 1 };
        draw();
      },
    },
  });
  parts.add(valve);
  valve.object.position.set(2.0, 0.93, 2.495);
  group.add(valve.object);
  control('E-STOP', 'red', 2.55, 0.93, () => {
    state = { ...state, emergencyStopped: true, enabled: false };
    draw();
  });
  control('RESET', 'black', 1.45, 0.67, () => {
    state = { ...state, emergencyStopped: false };
    draw();
  });
  control('NEXT LOAD', 'black', 2.0, 0.67, () => {
    if (deliveryRunning(state)) return;
    state = {
      ...state,
      hoseConnected: true,
      tankerLitres: spec.eachLitres,
      deliveredLitres: 0,
    };
    draw();
  });
  control('USE 500 L', 'black', 2.55, 0.67, () => {
    let left = 500;
    const tanksLitres = state.tanksLitres.map((litres) => {
      const used = Math.min(litres, left);
      left -= used;
      return litres - used;
    });
    state = { ...state, tanksLitres, highAlarm: false };
    draw();
  });
  draw();
  return {
    object: group,
    parts,
    update(seconds: number) {
      const next = stepDelivery(state, seconds);
      if (next !== state) {
        state = next;
        draw();
      }
      tanks.forEach((tank, i) =>
        tank.setLevel(state.tanksLitres[i] / spec.eachLitres),
      );
    },
    status: () =>
      `${product}: ${Math.round(stockOf(state))} L stored; ${Math.round(state.deliveredLitres)} L received`,
  };
}
