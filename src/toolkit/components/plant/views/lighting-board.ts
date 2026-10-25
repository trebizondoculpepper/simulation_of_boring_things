import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { createBrandBadge } from '../../core/views/brand-badge';
import {
  createPartSet,
  disconnectHandle,
  pushButton,
} from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';
import { LIGHTING_BOARD } from '../../../gallery/logic/switch-room';

/** One way of the board: its legend, and its RCBO's place in the world. */
export interface LightingWay {
  legend: string;
  /** Its phase, L1 to L3. */
  phase: string;
  on(): boolean;
  set(on: boolean): void;
  /** Its trip flag showing. */
  tripped(): boolean;
  /** Its TEST button pressed. */
  test(): void;
}

/** The board's main switch-disconnector, in the world. */
export interface LightingMain {
  on(): boolean;
  set(on: boolean): void;
}

/**
 * The lighting distribution board, DB-L1, after Hager's 24-way TP&N
 * boards with their covers off for working (the owner, 2026-10-25): a
 * 4-pole main switch-disconnector at its head; its ways in two columns of
 * twelve, each a 10 A Type B RCBO, 30 mA, two modules wide, its dolly up
 * for ON, its TEST button, and its trip flag, yellow while it has tripped;
 * beside each, the circuit chart's line: its way, its phase and the zone
 * it lights. A spare way's RCBO is off and marked SPARE. Bound, each
 * way's RCBO is its zone's in the world. Voltara's. Wall-mounted, its
 * middle at the origin, its front +z.
 */
export function createLightingBoard(
  kit: PanelKit,
  ways: readonly (LightingWay | null)[],
  /** Whether the board has a supply: its main switch's flag shows it. */
  live: () => boolean = () => true,
  main?: LightingMain,
): LiveExhibit {
  const t = plantTools(kit);
  const object = new Group();
  object.name = 'Lighting distribution board DB-L1';
  const L = brandLivery(kit, 'voltara');
  const { w, h, d } = LIGHTING_BOARD;
  t.box(object, L.paint.casing, w, h, d, 0, 0, d / 2);
  // The chassis behind the ways.
  const front = d + 0.002;
  t.box(
    object,
    t.paint('#2b2e31', 0.6),
    w - 0.06,
    h - 0.16,
    0.004,
    0,
    -0.03,
    front,
  );
  const label = (
    text: string,
    x: number,
    y: number,
    options: Parameters<typeof createMicroLabel>[2],
  ) => {
    const mark = createMicroLabel(kit, text, options);
    mark.position.set(x, y, front + 0.003);
    object.add(mark);
    return mark;
  };
  label('DB-L1  LIGHTING', -0.12, h / 2 - 0.045, {
    height: 0.024,
    ink: '#151515',
    plate: '#f2f0e8',
  });
  label(
    '400 V TP&N  24 WAY  RCBO 10 A TYPE B 30 mA  FED FROM MSB-1 DB-LIGHTING',
    -0.06,
    h / 2 - 0.075,
    { height: 0.0085, ink: '#151515' },
  );
  const badge = createBrandBadge(kit, 'voltara', {
    height: 0.026,
    plate: '#eceee8',
  });
  badge.position.set(w / 2 - 0.1, h / 2 - 0.05, front + 0.003);
  object.add(badge);
  const parts = createPartSet();
  // Its main switch-disconnector, four modules, at the head of the left
  // column; its LIVE flag red while the board has its supply.
  const mainX = w / 2 - 0.09;
  const mainY = h / 2 - 0.115;
  const mainSwitch = disconnectHandle(kit, {
    style: 'dolly',
    modules: 4,
    initial: main?.on() === false ? 'off' : 'on',
    bound: main
      ? {
          get value() {
            return main.on() ? ('on' as const) : ('off' as const);
          },
          set: (p: 'on' | 'off' | 'tripped') => main.set(p === 'on'),
        }
      : undefined,
    name: 'DB-L1 main switch',
  });
  mainSwitch.object.position.set(mainX, mainY, front + 0.001);
  object.add(mainSwitch.object);
  parts.add(mainSwitch);
  label('MAIN SWITCH', mainX, mainY - 0.055, { height: 0.009, ink: '#e8e4d8' });
  const liveFlag = new MeshBasicMaterial({ color: '#3a0d0a' });
  const flagMesh = new Mesh(new BoxGeometry(0.008, 0.005, 0.002), liveFlag);
  flagMesh.position.set(mainX + 0.03, mainY + 0.025, front + 0.022);
  object.add(flagMesh);
  const flags: { flag: MeshBasicMaterial; way: LightingWay | null }[] = [];
  const rows = 12;
  const top = h / 2 - 0.2;
  const pitch = (h - 0.28) / rows;
  ways.forEach((way, i) => {
    const column = Math.floor(i / rows);
    const row = i % rows;
    const x = -w / 2 + 0.05 + column * (w / 2);
    const y = top - row * pitch;
    const rcbo = new Group();
    rcbo.position.set(x, y, front + 0.001);
    rcbo.scale.setScalar(0.62);
    object.add(rcbo);
    const handle = disconnectHandle(kit, {
      style: 'dolly',
      modules: 2,
      initial: way?.on() === false || !way ? 'off' : 'on',
      bound: way
        ? {
            get value() {
              return way.on() ? ('on' as const) : ('off' as const);
            },
            set: (p: 'on' | 'off' | 'tripped') => way.set(p === 'on'),
          }
        : undefined,
      name: `DB-L1 way ${i + 1} ${way?.legend ?? 'spare'} RCBO`,
    });
    rcbo.add(handle.object);
    parts.add(handle);
    // Its TEST button, small and yellow, beside the dolly.
    const test = pushButton(kit, {
      colour: 'yellow',
      head: 'flush',
      name: `DB-L1 way ${i + 1} ${way?.legend ?? 'spare'} RCBO TEST`,
      action: () => way?.test(),
    });
    test.object.position.set(0.011, -0.03, 0.013);
    test.object.scale.setScalar(0.35);
    rcbo.add(test.object);
    parts.add(test);
    // Its trip flag: a window under its dolly, yellow while tripped.
    const flag = new MeshBasicMaterial({ color: '#2c2c2c' });
    const window_ = new Mesh(new BoxGeometry(0.008, 0.004, 0.002), flag);
    window_.position.set(-0.009, -0.03, 0.0125);
    rcbo.add(window_);
    flags.push({ flag, way });
    // Its line of the chart: its way, its phase, its zone.
    const line = label(
      `${String(i + 1).padStart(2)} ${way?.phase ?? '  '}  ${way?.legend ?? 'SPARE'}`,
      0,
      y,
      { height: 0.011, ink: '#e8e4d8', align: 'left' },
    );
    line.geometry.computeBoundingBox();
    const width =
      line.geometry.boundingBox!.max.x - line.geometry.boundingBox!.min.x;
    line.position.x = x + 0.022 + width / 2;
  });
  return {
    object,
    parts,
    update() {
      liveFlag.color.set(live() ? '#e2261b' : '#3a0d0a');
      for (const { flag, way } of flags)
        flag.color.set(way?.tripped() ? '#f2c21b' : '#2c2c2c');
    },
    dispose() {
      parts.dispose();
    },
  };
}
