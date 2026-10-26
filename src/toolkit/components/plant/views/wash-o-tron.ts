import { signal } from '@preact/signals-core';
import type { Signal } from '@preact/signals-core';
import { BoxGeometry, CircleGeometry, Group, Mesh, PlaneGeometry } from 'three';
import { createPartSet, pilotLight, pushButton } from '../../core/parts/parts';
import type { Part } from '../../core/parts/parts';
import { panelMakerMark } from '../../core/views/panel-maker-mark';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  createMicroLabel,
  kitGlow,
  kitPaint,
} from '../../core/views/eighties-controls';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createCharacterLcd } from '../../industrial-control/views/panel-instruments';
import type { OperatorColour } from '../../industrial-control/views/industrial-controls';
import { createCanvasTexture } from '../../core/views/screens';
import { createPs1Material } from '../../core/parts/ps1-material';
import { FILTER_VALVES } from '../../../../game/plant/wash-o-tron';
import type {
  FilterMode,
  FilterValve,
  WashAction,
  WashOTron,
  Alarm,
} from '../../../../game/plant/wash-o-tron';
import { stateLamp, washDisplay } from '../logic/wash-o-tron-display';

/**
 * The Lidoluxe Wash-O-Tron (prompt 072): the filter maker's retrofit wash
 * controller, about 1996, built into a Penfold panel. A mimic band of the
 * five vessels with a lamp on each valve, lit while it is open; under
 * each vessel its cluster of illuminated state buttons, AUTO, LOCKOUT,
 * a blanked AIR SCOUR (NOT FITTED) and its FAULT lamp; to the right its
 * two-line LCD with MODE, −, +, ENTER and PROGRAMME, the programme's
 * buttons and an annunciator. Every button is an illuminated push button
 * (the owner, 2026-10-26), so a copy elsewhere reads the same. Its
 * origin is the middle of its back, its face toward +z.
 */

export const WASH_O_TRON_SIZE = { w: 1.34, h: 0.98, d: 0.16 } as const;

export interface WashOTronControls {
  state: () => WashOTron;
  /** The world's time, s; filter n's valves as they stand; the pit's share. */
  time: () => number;
  valves: (n: number) => Readonly<Record<FilterValve, boolean>>;
  pitShare: () => number;
  act: (a: WashAction) => void;
}

const STATES: { mode: FilterMode; legend: string; colour: OperatorColour }[] = [
  { mode: 'filter', legend: 'FILTER', colour: 'green' },
  { mode: 'backwash', legend: 'BACKWASH', colour: 'amber' },
  { mode: 'rinse', legend: 'RINSE', colour: 'blue' },
  { mode: 'isolate', legend: 'ISOLATE', colour: 'white' },
  { mode: 'drain', legend: 'DRAIN', colour: 'white' },
];

/** Where each valve's lamp sits on a vessel's mimic, from its centre, m. */
const VALVE_AT: Record<FilterValve, [number, number]> = {
  V1: [-0.06, 0.07],
  V2: [0.06, -0.07],
  V3: [-0.06, -0.07],
  V4: [0.06, 0.07],
  V5: [0.075, -0.035],
  DV1: [0, -0.095],
};

export function createWashOTron(kit: PanelKit, c?: WashOTronControls) {
  const { w: W, h: H, d: D } = WASH_O_TRON_SIZE;
  const group = new Group();
  group.name = 'Lidoluxe Wash-O-Tron';
  const parts = createPartSet();
  // Its case: beige powder coat, a darker mimic band.
  const beige = kitPaint(kit, '#d8cfb4');
  {
    const box = new Mesh(new BoxGeometry(W, H, D), beige);
    box.position.z = D / 2;
    group.add(box);
  }
  const face = new Group();
  face.position.z = D + 0.001;
  group.add(face);
  panelMakerMark(kit, face, { width: W, height: H, z: 0.001 });
  // Its fascia plate (the owner, 2026-10-26: "ever so slightly more
  // whimsical"): a printed aqua plate over most of the front, scattered
  // with bubble decals, Lidoluxe's own livery of the 1990s.
  {
    const fw = W - 0.04;
    const fh = H - 0.1;
    const art = createCanvasTexture(1024, Math.round((1024 * fh) / fw));
    const g = art.context;
    const cw = art.canvas.width;
    const ch = art.canvas.height;
    const grad = g.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#d9f1f2');
    grad.addColorStop(1, '#a9d8e0');
    g.fillStyle = grad;
    g.fillRect(0, 0, cw, ch);
    // Bubbles: a seeded scatter, rising thicker toward the top.
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) {
      const x = rnd() * cw;
      const y = ch * Math.pow(rnd(), 1.6);
      const r = 4 + Math.pow(rnd(), 2.2) * 38;
      g.strokeStyle = 'rgba(255,255,255,0.75)';
      g.lineWidth = Math.max(1.5, r * 0.12);
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      // A glint on each.
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2);
      g.fill();
    }
    // A wavy waterline along its foot.
    g.fillStyle = 'rgba(60,150,175,0.35)';
    g.beginPath();
    g.moveTo(0, ch);
    for (let x = 0; x <= cw; x += 8)
      g.lineTo(x, ch - 26 - 10 * Math.sin(x / 40));
    g.lineTo(cw, ch);
    g.fill();
    art.texture.needsUpdate = true;
    kit.textures.push(art.texture);
    const m = createPs1Material({ map: art.texture, color: '#ffffff' });
    kit.materials.push(m);
    const fascia = new Mesh(new PlaneGeometry(fw, fh), m);
    fascia.position.set(0, -0.03, 0.0004);
    face.add(fascia);
  }
  // Its name plate and the maker's badge, top left.
  const badge = createBrandBadge(kit, 'lidoluxe', { height: 0.03 });
  badge.position.set(-W / 2 + 0.1, H / 2 - 0.04, 0.001);
  face.add(badge);
  const name = createMicroLabel(
    kit,
    'WASH-O-TRON 5  ·  FILTER WASH CONTROLLER',
    {
      height: 0.016,
      ink: '#1d1d1d',
    },
  );
  name.position.set(-0.12, H / 2 - 0.04, 0.001);
  face.add(name);
  const plate = createMicroLabel(kit, 'MODEL WOT-5  ·  1996  ·  240 V 50 Hz', {
    height: 0.006,
    ink: '#3a3a3a',
  });
  plate.position.set(W / 2 - 0.2, -H / 2 + 0.02, 0.001);
  face.add(plate);

  const COL = 0.19;
  const x0 = -W / 2 + 0.13;
  const colX = (n: number) => x0 + n * COL;

  // The mimic band: the vessels, their headers and lines, painted.
  const mimicH = 0.27;
  const mimicY = H / 2 - 0.08 - mimicH / 2;
  {
    const mw = COL * 5 + 0.04;
    const art = createCanvasTexture(1024, Math.round((1024 * mimicH) / mw));
    const g = art.context;
    const sx = 1024 / mw;
    const px = (x: number) => (x + mw / 2) * sx;
    const py = (y: number) => (mimicH / 2 - y) * sx;
    g.fillStyle = '#2d3a35';
    g.fillRect(0, 0, art.canvas.width, art.canvas.height);
    g.lineWidth = 5;
    g.lineCap = 'round';
    const line = (colour: string, pts: [number, number][]) => {
      g.strokeStyle = colour;
      g.beginPath();
      pts.forEach(([x, y], i) =>
        i ? g.lineTo(px(x), py(y)) : g.moveTo(px(x), py(y)),
      );
      g.stroke();
    };
    const centre = (n: number) => n * COL - 2 * COL;
    // Headers: inlet (blue) along the top, outlet (green) along the bottom,
    // the backwash main to the pit (amber), the waste (brown).
    line('#5b8fd6', [
      [centre(0) - 0.06, 0.115],
      [centre(4) + 0.06, 0.115],
    ]);
    line('#59b36a', [
      [centre(0) + 0.06, -0.115],
      [centre(4) + 0.06, -0.115],
    ]);
    line('#d79a3a', [
      [centre(0) + 0.06, 0.105],
      [centre(4) + 0.09, 0.105],
    ]);
    for (let n = 0; n < 5; n++) {
      const cx = centre(n);
      g.fillStyle = '#c5ccc7';
      g.strokeStyle = '#e8ece8';
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(px(cx), py(0), 0.045 * sx, 0.075 * sx, 0, 0, Math.PI * 2);
      g.stroke();
      g.lineWidth = 5;
      line('#5b8fd6', [
        [cx - 0.06, 0.115],
        [cx - 0.06, 0.06],
        [cx - 0.03, 0.06],
      ]);
      line('#59b36a', [
        [cx + 0.06, -0.115],
        [cx + 0.06, -0.06],
        [cx + 0.03, -0.06],
      ]);
      line('#d79a3a', [
        [cx + 0.06, 0.105],
        [cx + 0.06, 0.06],
        [cx + 0.03, 0.06],
      ]);
      line('#a86a3a', [
        [cx + 0.03, -0.035],
        [cx + 0.09, -0.035],
      ]);
      line('#a86a3a', [
        [cx, -0.075],
        [cx, -0.11],
      ]);
      g.fillStyle = '#e8ece8';
      g.font = `bold ${Math.round(0.016 * sx)}px sans-serif`;
      g.textAlign = 'center';
      g.fillText(`F${n + 1}`, px(cx), py(0.005));
    }
    g.fillStyle = '#d79a3a';
    g.font = `bold ${Math.round(0.011 * sx)}px sans-serif`;
    g.textAlign = 'right';
    g.fillText('TO PIT ▸', px(mw / 2 - 0.01), py(0.125));
    art.texture.needsUpdate = true;
    kit.textures.push(art.texture);
    const m = createPs1Material({ map: art.texture, color: '#ffffff' });
    kit.materials.push(m);
    const band = new Mesh(new PlaneGeometry(mw, mimicH), m);
    band.position.set(x0 + 2 * COL, mimicY, 0.0008);
    face.add(band);
  }
  // A lamp on each valve, lit while it is open.
  const valveLamps: Mesh[][] = [];
  const lampOn = '#ffe27a';
  const lampOff = '#3b3524';
  for (let n = 0; n < 5; n++) {
    valveLamps.push(
      FILTER_VALVES.map((v) => {
        const mat = kitGlow(kit, lampOff);
        const lamp = new Mesh(new CircleGeometry(0.006, 16), mat);
        const [dx, dy] = VALVE_AT[v];
        lamp.position.set(colX(n) + dx, mimicY + dy, 0.0016);
        face.add(lamp);
        return lamp;
      }),
    );
  }

  const mount = <P extends Part>(part: P, x: number, y: number, s = 0.62) => {
    parts.add(part);
    part.object.position.set(x, y, 0.001);
    part.object.scale.setScalar(s);
    face.add(part.object);
    return part;
  };
  const flashing = signal(false);

  // Each filter's cluster.
  const stateLit: Signal<'off' | 'on' | 'flash'>[][] = [];
  const autoLit: Signal<boolean>[] = [];
  const lockLit: Signal<boolean>[] = [];
  const faultLit: Signal<boolean>[] = [];
  const top = mimicY - mimicH / 2 - 0.05;
  for (let n = 0; n < 5; n++) {
    const x = colX(n);
    const row: Signal<'off' | 'on' | 'flash'>[] = [];
    STATES.forEach((st, k) => {
      const want = signal<'off' | 'on' | 'flash'>('off');
      row.push(want);
      const lamp = signal(false);
      mount(
        pushButton(kit, {
          colour: st.colour,
          head: 'illuminated',
          legend: st.legend,
          lamp,
          name: `Filter ${n + 1} ${st.legend}`,
          action: () => c?.act({ act: 'mode', filter: n, mode: st.mode }),
        }),
        x - 0.045 + (k % 2) * 0.09,
        top - Math.floor(k / 2) * 0.075,
      );
      // Drive the lamp from its wanted state and the flasher.
      const update = () =>
        (lamp.value =
          want.value === 'on' || (want.value === 'flash' && flashing.value));
      want.subscribe(update);
      flashing.subscribe(update);
    });
    stateLit.push(row);
    const auto = signal(false);
    autoLit.push(auto);
    mount(
      pushButton(kit, {
        colour: 'white',
        head: 'illuminated',
        legend: 'AUTO',
        lamp: auto,
        name: `Filter ${n + 1} AUTO`,
        action: () => c?.act({ act: 'auto', filter: n }),
      }),
      x + 0.045,
      top - 2 * 0.075,
    );
    const lock = signal(false);
    lockLit.push(lock);
    mount(
      pushButton(kit, {
        colour: 'yellow',
        head: 'illuminated',
        legend: 'LOCKOUT',
        lamp: lock,
        name: `Filter ${n + 1} LOCKOUT`,
        action: () => c?.act({ act: 'lockout', filter: n }),
      }),
      x - 0.045,
      top - 3 * 0.075,
    );
    // AIR SCOUR: its place, blanked with a plug, NOT FITTED.
    {
      const plug = new Mesh(
        new CircleGeometry(0.009, 20),
        kitPaint(kit, '#2a2a2a'),
      );
      plug.position.set(x + 0.045, top - 3 * 0.075, 0.002);
      face.add(plug);
      const l = createMicroLabel(kit, 'AIR SCOUR\nNOT FITTED', {
        height: 0.0042,
        ink: '#2a2a2a',
      });
      l.position.set(x + 0.045, top - 3 * 0.075 + 0.02, 0.001);
      face.add(l);
    }
    const fault = signal(false);
    faultLit.push(fault);
    mount(
      pilotLight(kit, {
        colour: 'red',
        legend: 'FAULT',
        drive: fault,
        name: `Filter ${n + 1} fault lamp`,
      }),
      x,
      top - 4 * 0.075 + 0.005,
      0.55,
    );
    const tag = createMicroLabel(kit, `FILTER ${n + 1}`, {
      height: 0.008,
      ink: '#f0ede3',
      plate: '#2d3a35',
    });
    tag.position.set(x, top + 0.04, 0.001);
    face.add(tag);
  }

  // The controller section, on the right.
  const rx = W / 2 - 0.17;
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.0024,
    backlight: true,
  });
  lcd.group.position.set(rx, mimicY + 0.06, 0.001);
  lcd.group.traverse((o) => (o.userData.live = true));
  face.add(lcd.group);
  const programmeLit = signal(false);
  const button = (
    legend: string,
    colour: OperatorColour,
    a: WashAction,
    x: number,
    y: number,
    lamp?: Signal<boolean>,
  ) =>
    mount(
      pushButton(kit, {
        colour,
        head: 'illuminated',
        legend,
        lamp: lamp ?? signal(false),
        name: `Wash-O-Tron ${legend}`,
        action: () => c?.act(a),
      }),
      x,
      y,
    );
  const r1 = mimicY - 0.035;
  button('MODE', 'white', { act: 'view' }, rx - 0.105, r1);
  button('−', 'white', { act: 'adjust', by: -1 }, rx - 0.035, r1);
  button('+', 'white', { act: 'adjust', by: 1 }, rx + 0.035, r1);
  button('ENTER', 'white', { act: 'enter' }, rx + 0.105, r1);
  button(
    'PROGRAMME',
    'yellow',
    { act: 'unlock' },
    rx - 0.07,
    r1 - 0.075,
    programmeLit,
  );
  const runLit = signal(false);
  const holdLit = signal(false);
  const r3 = r1 - 0.17;
  button('AUTO', 'green', { act: 'run' }, rx - 0.105, r3, runLit);
  button('HOLD', 'amber', { act: 'hold' }, rx - 0.035, r3, holdLit);
  button('STEP', 'white', { act: 'step' }, rx + 0.035, r3);
  button('SKIP', 'white', { act: 'skip' }, rx + 0.105, r3);
  // WASH NOW: the filter the NEXT view shows is washed out of turn.
  const washNowLit = signal(false);
  let washNowFilter = 0;
  mount(
    pushButton(kit, {
      colour: 'blue',
      head: 'illuminated',
      legend: 'WASH NOW',
      lamp: washNowLit,
      name: 'Wash-O-Tron WASH NOW',
      action: () => c?.act({ act: 'wash-now', filter: washNowFilter }),
    }),
    rx + 0.07,
    r1 - 0.075,
  );
  // The annunciator: four windows, ACCEPT and RESET.
  const ALARM_LEGENDS: [Alarm, string][] = [
    ['stepOverrun', 'STEP\nOVERRUN'],
    ['valveFault', 'VALVE\nFAULT'],
    ['pitInhibit', 'PIT\nINHIBIT'],
    ['lowCirc', 'LOW\nCIRC'],
  ];
  const r4 = r3 - 0.11;
  const windows = ALARM_LEGENDS.map(([, legend], i) => {
    const art = createCanvasTexture(128, 96);
    const g = art.context;
    const draw = (on: boolean) => {
      g.fillStyle = on ? '#ffcf5a' : '#5a5040';
      g.fillRect(0, 0, 128, 96);
      g.fillStyle = on ? '#2a1a00' : '#c9bfa0';
      g.font = 'bold 26px sans-serif';
      g.textAlign = 'center';
      legend.split('\n').forEach((t, k) => g.fillText(t, 64, 42 + k * 30));
      art.texture.needsUpdate = true;
    };
    draw(false);
    kit.textures.push(art.texture);
    const m = kitGlow(kit, '#ffffff');
    m.map = art.texture;
    const pane = new Mesh(new PlaneGeometry(0.06, 0.045), m);
    pane.position.set(rx - 0.105 + i * 0.07, r4, 0.002);
    face.add(pane);
    return { draw, on: false };
  });
  button('ACCEPT', 'white', { act: 'accept' }, rx - 0.07, r4 - 0.08);
  button('RESET', 'red', { act: 'reset' }, rx + 0.07, r4 - 0.08);

  let clock = 0;
  return {
    group,
    parts,
    update(delta: number) {
      parts.update(delta);
      clock += delta;
      flashing.value = clock % 0.8 < 0.45;
      if (!c) return;
      const s = c.state();
      s.filters.forEach((f, n) => {
        STATES.forEach(
          (st, k) => (stateLit[n][k].value = stateLamp(f, st.mode)),
        );
        autoLit[n].value = f.auto;
        lockLit[n].value = f.lockout;
        faultLit[n].value = f.phase === 'fault' && flashing.value;
        const open = c.valves(n);
        FILTER_VALVES.forEach((v, k) =>
          (
            valveLamps[n][k].material as unknown as {
              color: { set(c: string): void };
            }
          ).color.set(open[v] ? lampOn : lampOff),
        );
      });
      runLit.value = s.running;
      holdLit.value = s.hold && flashing.value;
      programmeLit.value = s.unlocked > 0;
      washNowLit.value = s.washNow !== null;
      washNowFilter = s.washing ?? s.filters.findIndex((f) => !f.lockout);
      ALARM_LEGENDS.forEach(([k], i) => {
        const a = s.alarms[k];
        const on = a.on && (a.accepted || flashing.value);
        if (on !== windows[i].on) {
          windows[i].on = on;
          windows[i].draw(on);
        }
      });
      const [l1, l2] = washDisplay(s, {
        time: c.time(),
        pitShare: c.pitShare(),
      });
      lcd.show([l1, l2]);
    },
    dispose() {
      parts.dispose?.();
    },
  };
}
