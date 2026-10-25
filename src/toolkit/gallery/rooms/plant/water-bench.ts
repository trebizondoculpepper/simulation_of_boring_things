import { signal } from '@preact/signals-core';
import { Group } from 'three';
import type { LiveExhibit, PlantExhibit } from './exhibit';
import type { PanelKit } from '../../../components/core/views/eighties-controls';
import { createMicroLabel } from '../../../components/core/views/eighties-controls';
import { createCharacterLcd } from '../../../components/industrial-control/views/panel-instruments';
import {
  createPartSet,
  pushButton,
} from '../../../components/core/parts/parts';
import { createPipe } from '../../../components/core/views/pipe-kinds';
import { plantTools } from '../../../components/plant/views/plant-tools';
import type { WaterCondition } from '../../../../game/water/water-condition';
import {
  BENCH,
  BENCH_MACHINES,
  actOnBench,
  benchOut,
  newBench,
  settingOf,
  stepBench,
} from '../../logic/water-bench';
import type { Bench, BenchMachine } from '../../logic/water-bench';

/** What this room is for, printed on its title card. */
export const PURPOSE =
  'The water bench: each of the water’s machines on a line of its own, an ideal source through it to an ideal outlet, to see it do what it should to the water. Dirty water through a filter comes out cleaner; clean water through a boiler hotter, through a dosing station more chlorinated; pool water through a UV unit with fewer chloramines.';
export const FINISH = { wall: '#cbd3d0', floor: '#929a97' };

/**
 * Dev41, the water bench (the owner, 2026-10-25; prompt 070): one line a
 * machine, each its source drum, its machine (RUN, − and +, a display of
 * its setting) and its outlet drum, joined by pipe, each drum displaying
 * the water at it: temperature, suspended solids, free and combined
 * chlorine. Run by `water-bench.ts` alone, fresh each time the room is
 * built.
 */

let bench: Bench = newBench();
export function prepareRoom() {
  bench = newBench();
}
// For trying it from the console: `waterBench.act({ line: 'boiler', act: 'run' })`.
if (typeof window !== 'undefined')
  (window as unknown as { waterBench?: unknown }).waterBench = {
    get bench() {
      return bench;
    },
    act: (a: Parameters<typeof actOnBench>[1]) =>
      (bench = actOnBench(bench, a)),
    out: (m: BenchMachine) => benchOut(bench, m),
  };

/** A water on a drum's display. */
const lines = (w: WaterCondition, flow: number) => [
  `${flow.toFixed(1).padStart(5)}m3/h ${w.temperature.toFixed(1).padStart(5)}C`,
  `SS${w.solids.toFixed(1).padStart(5)} Cl${w.freeChlorine.toFixed(2).padStart(5)}/${w.combinedChlorine.toFixed(2)}`,
];

function display(kit: PanelKit, title: string) {
  const group = new Group();
  const t = plantTools(kit);
  t.box(group, t.paint('#31383b', 0.55), 0.5, 0.22, 0.04, 0, 0, 0);
  const lcd = createCharacterLcd(kit, {
    columns: 20,
    rows: 2,
    cell: 0.01,
    backlight: true,
  });
  lcd.group.position.set(0, 0, 0.022);
  group.add(lcd.group);
  const name = createMicroLabel(kit, title, {
    height: 0.022,
    maxWidth: 0.48,
    ink: '#f2f2ea',
    plate: '#25343a',
  });
  name.position.set(0, 0.15, 0.022);
  group.add(name);
  let shown = '';
  return {
    group,
    show(l: string[]) {
      const key = l.join('|');
      if (key === shown) return;
      shown = key;
      lcd.show(l);
    },
  };
}

/** A line: its source drum, its machine and its outlet drum, joined by pipe, 4 m long. */
function benchLine(kit: PanelKit, m: BenchMachine): LiveExhibit {
  const t = plantTools(kit);
  const spec = BENCH[m];
  const object = new Group();
  object.name = `${spec.title} bench line`;
  const parts = createPartSet();
  const drum = (x: number, colour: string) => {
    t.cyl(object, t.paint(colour, 0.45), 0.35, 1.0, x, 0.5, 0, 'y', 32);
    t.cyl(object, t.paint('#e8ecee', 0.4), 0.36, 0.05, x, 1.0, 0, 'y', 32);
  };
  drum(-1.6, m === 'filter' ? '#7a5a2a' : m === 'uv' ? '#3d8a7a' : '#2b7fc4');
  drum(1.6, '#9fd0ea');
  // The machine: a cabinet, its controls and its display.
  t.box(
    object,
    t.paint(
      m === 'boiler'
        ? '#b83a2e'
        : m === 'dosing'
          ? '#e8c84a'
          : m === 'uv'
            ? '#7d5bb5'
            : '#2a6fb0',
      0.5,
    ),
    0.9,
    1.3,
    0.6,
    0,
    0.65,
    0,
  );
  object.add(
    createPipe('pvc-pressure', 0.063, [
      [-1.25, 0.8, 0],
      [-0.45, 0.8, 0],
    ]),
    createPipe('pvc-pressure', 0.063, [
      [0.45, 0.8, 0],
      [1.25, 0.8, 0],
    ]),
  );
  const inside = display(kit, `${spec.sourceName} IN`);
  inside.group.position.set(-1.6, 1.45, 0.3);
  object.add(inside.group);
  const outside = display(kit, 'WATER OUT');
  outside.group.position.set(1.6, 1.45, 0.3);
  object.add(outside.group);
  const machine = display(kit, spec.title);
  machine.group.position.set(0, 1.0, 0.31);
  object.add(machine.group);
  const lit = signal(false);
  (
    [
      ['RUN', 'green', 'run'],
      ['−', 'black', 'down'],
      ['+', 'black', 'up'],
    ] as const
  ).forEach(([legend, colour, act], i) => {
    const button = parts.add(
      pushButton(kit, {
        colour,
        ...(act === 'run' ? { head: 'illuminated' as const, lamp: lit } : {}),
        legend,
        name: `${spec.title} ${legend}`,
        action: () => (bench = actOnBench(bench, { line: m, act })),
      }),
    );
    button.object.position.set(-0.15 + i * 0.15, 0.62, 0.31);
    object.add(button.object);
  });
  return {
    object,
    parts,
    update(delta) {
      // The bench's one clock, kept by its first line.
      if (m === BENCH_MACHINES[0]) bench = stepBench(bench, delta);
      const io = benchOut(bench, m);
      lit.value = bench.lines[m].running;
      inside.show(lines(io.in, io.flow));
      outside.show(lines(io.out, io.flow));
      const s = settingOf(bench, m);
      machine.show([
        bench.lines[m].running ? 'PUMP RUNNING' : 'PUMP STOPPED',
        m === 'filter'
          ? `BED ${bench.filter.filter.dirt.toFixed(2)} kg`
          : `SET ${s} ${spec.unit}`,
      ]);
    },
  };
}

export const EXHIBITS: readonly PlantExhibit[] = BENCH_MACHINES.map((m) => ({
  title: `${BENCH[m].title}: bench line`,
  reference: `${BENCH[m].sourceName.toLowerCase()} from an ideal source, through the ${BENCH[m].title.toLowerCase()}, to an ideal outlet, each drum showing its water`,
  size: { w: 4.2, d: 1.0, h: 1.8, mount: 'floor' as const },
  build: (kit: PanelKit) => benchLine(kit, m),
}));
