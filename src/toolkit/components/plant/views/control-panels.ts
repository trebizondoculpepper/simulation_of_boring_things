import { Group } from 'three';
import type { Mesh, Object3D } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import {
  createMicroLabel,
  createSevenSegment,
} from '../../core/views/eighties-controls';
import { SANS } from '../../core/views/fitting-tools';
import { brandLivery } from '../../core/views/brand-livery';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  createAnnunciatorPanel,
  createChartRecorder,
} from '../../industrial-control/views/cabinet-fittings';
import { createPanelMeter } from '../../industrial-control/views/panel-instruments';
import {
  createCircularChartRecorder,
  createCrtMonitor,
} from '../../industrial-control/views/period-instruments';
import { teleprinterInMetres } from '../../industrial-control/views/teleprinter';
import { createBbcWorkstation } from '../../industrial-control/views/bbc-workstation';
import { createAnnunciator } from '../../industrial-control/logic/annunciator';
import type { ScreenLine } from '../../industrial-control/logic/bbc-micro';
import { createPartSet, pushButton } from '../../core/parts/parts';
import {
  ALARM_TEXT,
  ANNUNCIATOR_ALARMS,
  fixed,
} from '../../../gallery/logic/control-room-demo';
import type {
  AlarmId,
  PlantReading,
} from '../../../gallery/logic/control-room-demo';
import { plantTools } from './plant-tools';

/**
 * The control room's instruments, as a leisure centre's plant would have
 * them about twenty-five years ago: no single screen that shows
 * everything, but many instruments that each show one thing, all live,
 * all fed the plant's reading (`PlantReading`). (The mimic boards are
 * `industrial-control/views/mimic-board.ts`.) An alarm annunciator
 * whose windows name the fault, worked by ACCEPT, RESET and LAMP TEST; a
 * strip-chart and a circular chart recorder drawing on paper; red LED
 * readouts and moving-coil ammeters; a dot-matrix printer logging every
 * alarm with the room to go to; and a BBC Micro on its Cub monitor running
 * the plant's own POOLMON pages, already old when it was installed. The
 * room tells the operator something is wrong and where; putting it right
 * means going there. In metres, each facing +z.
 */

/** A label plate, `height` metres tall, at (x, y, z). */
function tag(
  kit: PanelKit,
  parent: Object3D,
  text: string,
  x: number,
  y: number,
  z: number,
  height = 0.016,
) {
  const label = createMicroLabel(kit, text, {
    height,
    ink: '#1b1f20',
    plate: '#f1f1ec',
  });
  label.position.set(x, y, z);
  parent.add(label);
}

/** A seven-segment readout that can be set as it runs. */
function readout(
  kit: PanelKit,
  parent: Object3D,
  x: number,
  y: number,
  z: number,
  digitHeight = 0.03,
) {
  const digits = createSevenSegment(kit, 4, { digitHeight });
  digits.group.position.set(x, y, z);
  digits.group.traverse((o) => (o.userData.live = true));
  parent.add(digits.group);
  return digits;
}

export interface AnnunciatorAssemblyView {
  group: Group;
  parts: ReturnType<typeof createPartSet>;
  /** Feed the plant's alarms; call every frame with the time. */
  update(reading: PlantReading, seconds: number): void;
  /** Called when an alarm comes in, is accepted, or clears. */
  onEvent: (event: 'in' | 'accept' | 'clear', alarm: AlarmId | null) => void;
}

/**
 * The alarm annunciator: 24 windows in a steel box, each naming its
 * fault, flashing as its alarm comes in until ACCEPT, then steady until it
 * clears and RESET puts it out (ISA sequence M, so the operator sees what
 * tripped); LAMP TEST lights every window while held. The horn sits on
 * top. Each event is passed to `onEvent`, for the alarm printer.
 */
export function createAnnunciatorAssembly(
  kit: PanelKit,
): AnnunciatorAssemblyView {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#3b3f42', 0.5), 0.86, 0.7, 0.12, 0, 0, 0.06);
  const labels = ANNUNCIATOR_ALARMS.map((id) => ALARM_TEXT[id].window);
  const panel = createAnnunciatorPanel(kit, labels, { columns: 6, cell: 0.12 });
  panel.group.position.set(0, 0.06, 0.12);
  panel.group.traverse((o) => (o.userData.live = true));
  group.add(panel.group);
  const logic = createAnnunciator(labels.length, { manualReset: true });
  const parts = createPartSet();
  const view: AnnunciatorAssemblyView = {
    group,
    parts,
    update() {},
    onEvent: () => {},
  };
  const button = (
    legend: string,
    colour: 'black' | 'white' | 'red' | 'green',
    x: number,
    action: () => void,
  ) => {
    const part = pushButton(kit, { colour, legend, action });
    part.object.position.set(x, -0.27, 0.12);
    part.object.traverse((o) => (o.userData.live = true));
    group.add(part.object);
    parts.add(part);
    return part;
  };
  button('ACCEPT', 'black', -0.27, () => {
    const flashing = logic.states.flatMap((s, i) =>
      s === 'flashing' ? [i] : [],
    );
    logic.acknowledge();
    for (const i of flashing) view.onEvent('accept', ANNUNCIATOR_ALARMS[i]);
  });
  button('RESET', 'black', -0.09, () => logic.reset());
  let testUntil = 0;
  let now = 0;
  button('LAMP TEST', 'white', 0.09, () => (testUntil = now + 2));
  button('MUTE', 'red', 0.27, () => view.onEvent('accept', null));
  const horn = t.paint('#c8261c', 0.45);
  t.cyl(group, horn, 0.05, 0.06, 0, 0.4, 0.06, 'z', 20);
  t.cyl(group, t.paint('#2a2b2c', 0.5), 0.03, 0.02, 0, 0.4, 0.1, 'z', 20);
  const badge = createBrandBadge(kit, 'warden', { height: 0.02 });
  badge.position.set(0.3, -0.33, 0.1205);
  group.add(badge);
  let was = new Set<AlarmId>();
  view.update = (reading, seconds) => {
    now = seconds;
    const present = new Set(reading.alarms);
    logic.sense(ANNUNCIATOR_ALARMS.map((id) => present.has(id)));
    for (const id of present) if (!was.has(id)) view.onEvent('in', id);
    for (const id of was) if (!present.has(id)) view.onEvent('clear', id);
    was = present;
    logic.test = seconds < testUntil;
    const lit = logic.lit(seconds);
    panel.set(lit);
  };
  return view;
}

export interface RecorderPanelView {
  group: Group;
  show(reading: PlantReading, delta: number): void;
}

/**
 * The recorder panel: a strip-chart recorder of pool temperatures, one of
 * free chlorine and pH, and a circular seven-day chart recorder of the
 * hall's air, in a steel panel 1.3 × 0.6 m. The charts run fast here (a
 * turn of the circular chart an hour), so the traces can be seen growing.
 */
export function createRecorderPanel(kit: PanelKit): RecorderPanelView {
  const t = plantTools(kit);
  const group = new Group();
  t.box(group, t.paint('#7d8a86', 0.55), 1.3, 0.6, 0.06, 0, 0, 0.03);
  const temps = createChartRecorder(kit, {
    pens: ['#c4211b', '#1c48b8', '#1b8a3c'],
    title: 'POOL TEMPS',
  });
  const water = createChartRecorder(kit, {
    pens: ['#c4211b', '#1c48b8'],
    title: 'CL / PH',
  });
  [temps, water].forEach((recorder, i) => {
    recorder.group.scale.setScalar(1.8);
    recorder.group.position.set(-0.5 + i * 0.28, 0, 0.06);
    recorder.group.traverse((o) => (o.userData.live = true));
    group.add(recorder.group);
  });
  const circular = createCircularChartRecorder(kit, { rate: 1 / 3600 });
  circular.group.position.set(0.32, 0, 0.06);
  circular.group.traverse((o) => (o.userData.live = true));
  group.add(circular.group);
  const span = (value: number, lo: number, hi: number) =>
    (value - lo) / (hi - lo);
  return {
    group,
    show(r, delta) {
      temps.set([
        span(r.mainPool, 20, 40),
        span(r.learnerPool, 20, 40),
        span(r.spa, 20, 40),
      ]);
      water.set([span(r.chlorine, 0, 3), span(r.ph, 6.8, 7.8)]);
      circular.set([span(r.hallAir, 20, 40), span(r.hallRh, 0, 100)]);
      temps.update(delta);
      water.update(delta);
      circular.update(delta);
    },
  };
}

export interface ReadoutBoardView {
  group: Group;
  show(reading: PlantReading, delta: number): void;
}

/**
 * The readout board: red LED indicators of the pools', the hall's air and
 * humidity and the circulation flow, over moving-coil ammeters for the
 * main motors, each with its legend, on a steel panel 1.3 × 0.55 m.
 */
export function createReadoutBoard(kit: PanelKit): ReadoutBoardView {
  const t = plantTools(kit);
  const livery = brandLivery(kit, 'kessler-moody');
  const group = new Group();
  t.box(group, livery.paint.casing, 1.3, 0.55, 0.05, 0, 0, 0.025);
  const names = [
    'MAIN POOL °C',
    'LEARNER °C',
    'SPA °C',
    'HALL AIR °C',
    'HALL RH %',
    'FLOW m³/h',
  ];
  const digits = names.map((name, i) => {
    const x = -0.53 + i * 0.212;
    t.box(group, livery.paint.shade, 0.16, 0.08, 0.02, x, 0.12, 0.06);
    tag(kit, group, name, x, 0.06, 0.0505);
    return readout(kit, group, x, 0.12, 0.071, 0.034);
  });
  const meters = [
    'P1 MOTOR',
    'P2 MOTOR',
    'AHU SUPPLY',
    'AHU EXTRACT',
    'BOILERS',
  ].map((name, i) => {
    const x = -0.5 + i * 0.25;
    const meter = createPanelMeter(kit, 'A', { width: 0.096, scaleMax: 60 });
    meter.group.position.set(x, -0.1, 0.05);
    meter.group.traverse((o) => (o.userData.live = true));
    group.add(meter.group);
    tag(kit, group, name, x, -0.2, 0.0505);
    return meter;
  });
  const plate = livery.nameplate(['Plant indication', '230 V AC'], 0.14, 0.07);
  plate.position.set(0.55, -0.22, 0.051);
  group.add(plate);
  return {
    group,
    show(r, delta) {
      [r.mainPool, r.learnerPool, r.spa, r.hallAir].forEach((v, i) =>
        digits[i].show(fixed(v)),
      );
      digits[4].show(String(Math.round(r.hallRh)).padStart(4, ' '));
      digits[5].show(String(Math.round(r.flow)).padStart(4, ' '));
      const a = r.amps;
      [a.p1, a.p2, a.supply, a.extract, a.boilers].forEach((amps, i) => {
        meters[i].set(amps / 60);
        meters[i].update(delta);
      });
    },
  };
}

export interface PrinterStandView {
  group: Group;
  print(line: string): void;
  update(delta: number): void;
}

/**
 * The alarm printer: the teleprinter on its steel stand, its endless
 * fanfold paper falling to a pile on the floor, logging every alarm with
 * the time and the room to go to.
 */
export function createPrinterStand(kit: PanelKit): PrinterStandView {
  const t = plantTools(kit);
  const group = new Group();
  const height = 0.95;
  t.box(
    group,
    t.paint('#3d4a45', 0.55),
    0.62,
    height - 0.25,
    0.5,
    0,
    (height - 0.25) / 2,
    0,
  );
  const printer = teleprinterInMetres('POOL PLANT ALARM LOG', height);
  printer.group.traverse((o) => (o.userData.live = true));
  group.add(printer.group);
  return {
    group,
    print: (line) => printer.record(line),
    update: (delta) => printer.update(delta, false),
  };
}

/** The CCTV camera names, and the CRT they share in quarters. */
export function createCctvCrt(kit: PanelKit) {
  const t = plantTools(kit);
  const group = new Group();
  const steel = t.paint('#4a4e52', 0.5);
  t.box(group, steel, 0.3, 0.02, 0.35, 0, -0.02, 0.17);
  t.box(group, steel, 0.02, 0.15, 0.02, 0, -0.09, 0.01);
  const crt = createCrtMonitor(kit, { colour: '#3a3c3e' });
  crt.group.scale.setScalar(0.85);
  crt.group.traverse((o) => (o.userData.live = true));
  group.add(crt.group);
  // The cameras' grain is drawn once; the clock burnt in redraws.
  const grain = Array.from({ length: 1600 }, () => [
    Math.random(),
    Math.random(),
    Math.random() * 0.12,
  ]);
  let shown = -1;
  return {
    group,
    update(seconds: number) {
      const second = Math.floor(seconds);
      if (second === shown) return;
      shown = second;
      crt.show((c, cw, ch) => {
        c.fillStyle = '#101112';
        c.fillRect(0, 0, cw, ch);
        const names = [
          'CAM 1 POOL HALL',
          'CAM 2 RECEPTION',
          'CAM 3 PLANT CORR',
          'CAM 4 MALL DOOR',
        ];
        for (let q = 0; q < 4; q++) {
          const qx = (q % 2) * (cw / 2),
            qy = Math.floor(q / 2) * (ch / 2);
          const g = c.createLinearGradient(qx, qy, qx, qy + ch / 2);
          g.addColorStop(0, q === 0 ? '#9fa8a6' : '#6e7472');
          g.addColorStop(1, '#3a3d3c');
          c.fillStyle = g;
          c.fillRect(qx + 2, qy + 2, cw / 2 - 4, ch / 2 - 4);
          c.fillStyle = 'rgba(30,32,32,0.6)';
          c.fillRect(qx + cw * 0.05, qy + ch * 0.28, cw * 0.4, ch * 0.08);
          c.fillStyle = '#f2f2f2';
          c.font = `bold ${ch / 26}px "Courier New", monospace`;
          c.fillText(names[q], qx + 8, qy + ch / 2 - 10);
        }
        for (const [x, y, a] of grain) {
          c.fillStyle = `rgba(255,255,255,${a})`;
          c.fillRect(x * cw, y * ch, 2, 1);
        }
        const s = 43 * 60 + second;
        const time = `07:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        c.fillStyle = '#f2f2f2';
        c.fillText(`20-10-99 ${time}`, cw * 0.6, ch * 0.06);
      });
    },
  };
}

/** POOLMON's pages, in Mode 7 colours, from the plant's reading. */
function poolmonPage(page: number, r: PlantReading): ScreenLine[] {
  const white = '#f2f2ee',
    cyan = '#5fe0e8',
    yellow = '#f4e04a',
    red = '#ff5a4a',
    green = '#6af06a';
  const head: ScreenLine[] = [
    ['POOLMON 2.1  LINDEN COURT LEISURE POOL', cyan],
    ['(C) 1987 MERIDALE TRAINING SOLUTIONS', white],
    ['', white],
  ];
  const status = (ok: boolean) => (ok ? green : red);
  if (page === 0)
    return [
      ...head,
      ['TEMPERATURES                  PAGE 1/3', yellow],
      ['', white],
      [`MAIN POOL ........... ${fixed(r.mainPool)} C`, white],
      [`LEARNER POOL ........ ${fixed(r.learnerPool)} C`, white],
      [`SPA ................. ${fixed(r.spa)} C`, white],
      [`HALL AIR ............ ${fixed(r.hallAir)} C`, white],
      [`HALL HUMIDITY ....... ${fixed(r.hallRh, 0)} %`, status(r.hallRh <= 62)],
      [`LTHW FLOW ........... ${fixed(r.lthw)} C`, white],
    ];
  if (page === 1)
    return [
      ...head,
      ['WATER                         PAGE 2/3', yellow],
      ['', white],
      [
        `CIRCULATION ........ ${String(Math.round(r.flow)).padStart(4)} M3/H`,
        white,
      ],
      ...r.filterDp.map((dp, i): ScreenLine => [
        `FILTER ${i + 1} DP ........ ${dp.toFixed(2)} BAR`,
        status(dp <= 0.7),
      ]),
      [
        `FREE CHLORINE ....... ${r.chlorine.toFixed(2)} MG/L`,
        status(r.chlorine >= 1),
      ],
      [`PH .................. ${r.ph.toFixed(2)}`, white],
      [`BALANCE TANK ........ ${fixed(r.balance * 100, 0)} %`, white],
    ];
  return [
    ...head,
    ['ALARMS                        PAGE 3/3', yellow],
    ['', white],
    ...(r.alarms.length
      ? r.alarms.map((id): ScreenLine => [
          `${ALARM_TEXT[id].window.replace('\n', ' ').padEnd(20)} ${ALARM_TEXT[id].room}`,
          red,
        ])
      : ([['NO ALARMS', green]] as ScreenLine[])),
  ];
}

/**
 * The operator's desk: the BBC Micro with its Cub monitor and disk drive
 * on the workstation the plant was built with, running POOLMON, the
 * plant's own monitoring program, a page every ten seconds; with the
 * plant logbook and a desk telephone beside it.
 */
export function createPoolmonDesk(kit: PanelKit) {
  const t = plantTools(kit);
  const workstation = createBbcWorkstation(kit);
  const group = workstation.group;
  workstation.cub.group.traverse((o) => (o.userData.live = true));
  workstation.cub.power(true);
  const top = workstation.top;
  const log = t.printed(
    0.32,
    0.22,
    (c, cw, ch) => {
      c.fillStyle = '#f3f0e3';
      c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#9fb5c9';
      for (let y = ch / 8; y < ch; y += ch / 8) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(cw, y);
        c.stroke();
      }
      c.fillStyle = '#1d2b6b';
      c.font = `italic ${ch / 11}px ${SANS}`;
      [
        'Plant log  Oct 99',
        '07:00 rounds — F2 dP 0.7',
        'Cl 1.4  pH 7.3  T 29.2',
        'Backwash F2 requested',
      ].forEach((line, i) =>
        c.fillText(line, cw * 0.05, (ch / 8) * (i + 1) - 4),
      );
    },
    512,
  );
  log.mesh.rotation.x = -Math.PI / 2;
  log.mesh.position.set(-0.45, top + 0.004, 0.25);
  group.add(log.mesh);
  const phone = t.paint('#5b5e60', 0.5);
  t.box(group, phone, 0.2, 0.05, 0.2, 0.5, top + 0.025, 0.1);
  t.box(
    group,
    t.paint('#3c3f42', 0.5),
    0.2,
    0.035,
    0.05,
    0.5,
    top + 0.065,
    0.05,
  );
  let page = 0;
  let turned = 0;
  return {
    group,
    update(reading: PlantReading, seconds: number, delta: number) {
      turned += delta;
      if (turned > 10) {
        turned = 0;
        page = (page + 1) % 3;
      }
      workstation.cub.update(seconds, poolmonPage(page, reading));
    },
    dispose() {
      workstation.cub.dispose();
    },
  };
}

/** Make a mesh's colour live; for typing. */
export const asMesh = (o: Object3D) => o as Mesh;
