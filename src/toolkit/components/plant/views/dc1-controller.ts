import { Group, Mesh } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createSevenSegment } from '../../core/views/eighties-controls';
import { tools } from '../../core/views/fitting-tools';
import { createPartSet } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { drawBrandMark, wordmarkFont } from '../../core/views/brand-logo';
import { brandLivery } from '../../core/views/brand-livery';
import { OT216_LIVERY } from '../../industrial-control/views/ot216-terminal';
import { keyLegend, membraneKey } from './membrane-key';
import { describe } from './describe';
import { dc1Display, newDc1Face, pressDc1, tickDc1 } from '../logic/dc1-face';
import type { Dc1Face, Dc1Key } from '../logic/dc1-face';
import type { ControllerState, DoseChannel } from '../logic/dosing-controller';

/** One unit's body, metres (the D1C's wall housing, about 198 × 200 × 110 mm). */
export const DC1_BODY = { w: 0.198, h: 0.2, d: 0.11 } as const;

const KEYS: readonly {
  key: Dc1Key;
  legend: string;
  x: number;
  y: number;
  accent?: 'green' | 'red';
}[] = [
  { key: 'change', legend: '◄►', x: -0.05, y: -0.035 },
  { key: 'up', legend: '▲', x: 0, y: -0.035 },
  { key: 'down', legend: '▼', x: 0.05, y: -0.035 },
  { key: 'back', legend: '↩', x: -0.05, y: -0.07 },
  { key: 'enter', legend: '↵', x: 0, y: -0.07 },
  { key: 'startstop', legend: 'START/STOP', x: 0.05, y: -0.07, accent: 'red' },
];

const LAMPS: readonly {
  id: string;
  legend: string;
  colour: string;
  x: number;
  y: number;
}[] = [
  { id: 'meas', legend: 'MEAS', colour: '#ffb02e', x: -0.072, y: 0.004 },
  { id: 'out', legend: 'OUT %', colour: '#ffb02e', x: -0.036, y: 0.004 },
  { id: 'set', legend: 'SET', colour: '#ffb02e', x: 0, y: 0.004 },
  { id: 'auto', legend: 'AUTO', colour: '#3cff5a', x: 0.036, y: 0.004 },
  { id: 'man', legend: 'MAN', colour: '#ffb02e', x: 0.072, y: 0.004 },
  { id: 'stop', legend: 'STOP', colour: '#ff3b24', x: 0.08, y: 0.064 },
  { id: 'dose', legend: 'DOSE', colour: '#3cff5a', x: 0.08, y: 0.051 },
  { id: 'lim', legend: 'LIMIT', colour: '#ffb02e', x: 0.08, y: 0.038 },
  { id: 'alarm', legend: 'ALARM', colour: '#ff3b24', x: 0.08, y: 0.025 },
];

/**
 * One Chlorella DC-1 single-channel dosing controller (prompt 105), after
 * ProMinent's DULCOMETER D1C (about 2000): a pale green moulded clamshell
 * as Chlorella's OT-216 terminals have, a darker green printed fascia with
 * its channel across a band (CHLORINE or pH), a four-digit red LED
 * readout, its LEDs (MEAS, OUT %, SET, AUTO, MAN; DOSE, LIMIT, ALARM,
 * STOP) and six grey membrane keys (`membrane-key.ts`), their legends
 * printed above: ◄► (CHANGE), ▲, ▼, ↩ (BACK), ↵ (ENTER) and START/STOP.
 * Its face (`dc1-face.ts`) works its channel of the controller it is
 * given. Facing +z, its back at z = 0, its middle at the origin.
 */
export function createDc1Unit(
  kit: PanelKit,
  {
    tag,
    channel,
    state,
    change,
    tuning = false,
  }: {
    tag: string;
    channel: DoseChannel;
    /** Its tuning menus open (`DC1_TUNING_MENUS`). */
    tuning?: boolean;
    state: () => ControllerState;
    change: (c: ControllerState) => void;
  },
) {
  const t = tools(kit);
  const B = DC1_BODY;
  const object = new Group();
  object.name = `${tag} Chlorella DC-1 ${channel === 'hypochlorite' ? 'chlorine' : 'pH'} controller`;
  const keys: Part[] = [];
  const livery = brandLivery(kit, 'chlorella');
  const plastic = t.paint(OT216_LIVERY.shell, 0.92);
  const shell = new Mesh(
    new RoundedBoxGeometry(B.w, B.h, B.d, 4, 0.01),
    plastic,
  );
  shell.position.z = B.d / 2;
  object.add(shell);
  const z = B.d + 0.0004;
  const title = channel === 'hypochlorite' ? 'CHLORINE' : 'pH';
  const fw = B.w - 0.02;
  const fh = B.h - 0.02;
  const fascia = t.printed(
    fw,
    fh,
    (c, cw, ch) => {
      const k = cw / fw;
      const px = (x: number) => (x + fw / 2) * k;
      const py = (y: number) => (fh / 2 - y) * k;
      c.fillStyle = OT216_LIVERY.fascia;
      c.fillRect(0, 0, cw, ch);
      // Its band.
      c.fillStyle = channel === 'hypochlorite' ? '#f2d03b' : '#c8261c';
      c.fillRect(0, py(0.088), cw, 0.014 * k);
      c.fillStyle = channel === 'hypochlorite' ? '#1b1b1b' : '#ffffff';
      c.font = `bold ${0.009 * k}px Arial, sans-serif`;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(title, px(-0.085), py(0.081));
      c.textAlign = 'right';
      c.fillText(
        channel === 'hypochlorite' ? 'mg/l Cl₂' : 'pH',
        px(0.085),
        py(0.081),
      );
      // The readout's surround.
      c.fillStyle = '#1b2a1a';
      c.fillRect(px(-0.08), py(0.068), 0.122 * k, 0.05 * k);
      // The lamps' legends.
      c.fillStyle = '#e6f2dc';
      c.font = `${0.0042 * k}px Arial, sans-serif`;
      for (const l of LAMPS) {
        if (l.y > 0.01) {
          c.textAlign = 'right';
          c.fillText(l.legend, px(l.x - 0.005), py(l.y));
        } else {
          c.textAlign = 'center';
          c.fillText(l.legend, px(l.x), py(l.y - 0.0075));
        }
      }
      // The mark and model.
      drawBrandMark(
        c,
        livery.brand,
        px(-0.078),
        py(-0.088),
        0.008 * k,
        OT216_LIVERY.fascia,
      );
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.font = wordmarkFont(livery.brand, 0.0075 * k);
      c.fillText(
        livery.brand.wordmark ?? livery.brand.name,
        px(-0.068),
        py(-0.0875),
      );
      c.font = `bold ${0.006 * k}px Arial, sans-serif`;
      c.textAlign = 'right';
      c.fillText(`DC-1 · ${tag}`, px(0.085), py(-0.0875));
    },
    512,
  );
  fascia.mesh.position.set(0, 0, z);
  object.add(fascia.mesh);
  // Its readout.
  const readout = createSevenSegment(kit, 4, { digitHeight: 0.02 });
  readout.group.position.set(-0.0125, 0.043, z);
  readout.group.userData.live = true;
  object.add(readout.group);
  // Its lamps (the stacked ones beside the readout are set apart by their legends to their left).
  const lamps = new Map(
    LAMPS.map((l) => {
      const led = t.led(object, l.colour, 0.0022, l.x, l.y, z + 0.0006);
      led.mesh.userData.live = true;
      return [l.id, led] as const;
    }),
  );
  // Its keys, their legends printed above.
  let face: Dc1Face = newDc1Face(channel, tuning);
  for (const k of KEYS) {
    const key = membraneKey(kit, {
      legend: k.legend,
      name: `${tag} ${k.legend} key`,
      accent: k.accent,
      w: 0.02,
      h: 0.012,
      action: () => {
        const r = pressDc1(face, state(), k.key);
        face = r.face;
        if (r.controller !== state()) change(r.controller);
        show();
      },
    });
    key.object.position.set(k.x, k.y, z);
    object.add(key.object);
    keys.push(key);
    keyLegend(kit, object, k.legend, k.x, k.y, z + 0.0004, 0.012);
  }
  const show = () => {
    const d = dc1Display(face, state());
    readout.show(d.text);
    lamps.get('meas')!.set(d.lamps.meas);
    lamps.get('out')!.set(d.lamps.out);
    lamps.get('set')!.set(d.lamps.set);
    lamps.get('auto')!.set(d.lamps.auto);
    lamps.get('man')!.set(d.lamps.man);
    lamps.get('dose')!.set(d.lamps.dose);
    lamps.get('lim')!.set(d.lamps.lim);
    lamps.get('alarm')!.set(d.lamps.alarm);
    lamps.get('stop')!.set(d.lamps.stop);
    return d;
  };
  // Cable glands below.
  const gland = t.paint('#2a2d2e', 0.6);
  for (const x of [-0.06, -0.02, 0.02, 0.06])
    t.cyl(object, gland, 0.006, 0.014, x, -B.h / 2 - 0.006, B.d / 2, 'y', 10);
  // Its rating plate on its side.
  const plate = t.printed(
    0.07,
    0.04,
    (c, cw, ch) => {
      c.fillStyle = '#e4e6e2';
      c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#16301a';
      c.font = `bold ${ch * 0.17}px Arial, sans-serif`;
      c.fillText(
        `Chlorella DC-1 ${channel === 'hypochlorite' ? 'Cl' : 'pH'}`,
        cw * 0.05,
        ch * 0.22,
      );
      c.font = `${ch * 0.11}px Arial, sans-serif`;
      [
        '230 V AC 50 Hz 8 VA · IP65',
        'P/PID · 4–20 mA · 2 relays',
        `Ser. DC1-99-${channel === 'hypochlorite' ? '2231' : '2232'} · 1999`,
      ].forEach((l, i) => c.fillText(l, cw * 0.05, ch * (0.47 + i * 0.19)));
    },
    256,
  );
  plate.mesh.rotation.y = Math.PI / 2;
  plate.mesh.position.set(B.w / 2 + 0.0005, 0, B.d / 2);
  object.add(plate.mesh);
  let last = show().text;
  describe(
    object,
    `${tag}: Chlorella DC-1 ${title} controller`,
    () => `Showing ${last}`,
  );
  return {
    object,
    keys,
    /** Its face a step on (its keys are stepped by whoever holds them). */
    update(delta: number) {
      face = tickDc1(face, delta);
      last = show().text;
    },
    glandsAt: (i: number) =>
      [-0.06 + i * 0.04, -B.h / 2 - 0.013, B.d / 2] as const,
  };
}

/**
 * The Lounge's pair (prompt 105): the chlorine and pH DC-1s side by side
 * on a backplate, one controller between them (the pH unit's limit relay
 * to the chlorine unit's pause input: the pH lockout).
 */
export function createDc1Pair(
  kit: PanelKit,
  props: {
    tag: string;
    state: () => ControllerState;
    change: (c: ControllerState) => void;
    tuning?: boolean;
  },
) {
  const t = tools(kit);
  const object = new Group();
  object.name = `${props.tag} Chlorella DC-1 pair`;
  t.box(object, t.paint('#8d9493', 0.5, 0.3), 0.48, 0.26, 0.006, 0, 0, 0.003);
  const parts = createPartSet();
  const units = (['hypochlorite', 'acid'] as const).map((channel, i) => {
    const u = createDc1Unit(kit, {
      ...props,
      tag: `${props.tag}${i ? '-2' : '-1'}`,
      channel,
    });
    u.object.position.set(i ? 0.115 : -0.115, 0, 0.006);
    object.add(u.object);
    for (const key of u.keys) parts.add(key);
    return u;
  });
  return {
    object,
    units,
    parts,
    update(delta: number) {
      for (const u of units) u.update(delta);
      parts.update(delta);
    },
  };
}
