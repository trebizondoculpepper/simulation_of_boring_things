import { Group, Mesh, MeshBasicMaterial } from 'three';
import type { PanelKit } from '../../core/views/eighties-controls';
import { createMicroLabel } from '../../core/views/eighties-controls';
import { brandLivery } from '../../core/views/brand-livery';
import { createBrandBadge } from '../../core/views/brand-badge';
import { createPartSet, disconnectHandle } from '../../core/parts/parts';
import { plantTools } from './plant-tools';
import type { LiveExhibit } from '../../../gallery/rooms/plant/exhibit';
import { LIGHTING_BOARD } from '../../../gallery/logic/switch-room';

/** One way of the board: its legend, and its breaker's place in the world. */
export interface LightingWay {
  legend: string;
  on(): boolean;
  set(on: boolean): void;
}

/**
 * The lighting distribution board, DB-L1, after Hager's 24-way TPN
 * boards with their covers off for working: its ways in two columns of
 * twelve, each an MCB with its rocker (lit while on) and, beside it, the
 * circuit chart's line for it, the zone it lights; a spare way's MCB off
 * and marked SPARE. Bound, each way's breaker is its zone's in the world.
 * Voltara's. Wall-mounted, its middle at the origin, its front +z.
 */
export function createLightingBoard(
  kit: PanelKit,
  ways: readonly (LightingWay | null)[],
  /** Whether the board has a supply: its rockers light only while it has. */
  live: () => boolean = () => true,
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
  label('230 V  24 WAY  FED FROM MSB-1 DB-LIGHTING', -0.12, h / 2 - 0.075, {
    height: 0.01,
    ink: '#151515',
  });
  const badge = createBrandBadge(kit, 'voltara', {
    height: 0.026,
    plate: '#eceee8',
  });
  badge.position.set(w / 2 - 0.1, h / 2 - 0.05, front + 0.003);
  object.add(badge);
  const parts = createPartSet();
  const lenses: { lens: MeshBasicMaterial; on: () => boolean }[] = [];
  const rows = 12;
  const top = h / 2 - 0.13;
  const pitch = (h - 0.2) / rows;
  ways.forEach((way, i) => {
    const column = Math.floor(i / rows);
    const row = i % rows;
    const x = -w / 2 + 0.06 + column * (w / 2);
    const y = top - row * pitch;
    const handle = disconnectHandle(kit, {
      style: 'rocker',
      initial: way?.on() === false || !way ? 'off' : 'on',
      bound: way
        ? {
            get value() {
              return way.on() ? ('on' as const) : ('off' as const);
            },
            set: (p: 'on' | 'off' | 'tripped') => way.set(p === 'on'),
          }
        : undefined,
      name: `DB-L1 way ${i + 1} ${way?.legend ?? 'spare'} breaker`,
    });
    // Its rocker's lens: lit while the board is live, by its position.
    handle.object.traverse((o) => {
      if (
        o instanceof Mesh &&
        o.userData.live &&
        o.material instanceof MeshBasicMaterial
      )
        lenses.push({ lens: o.material, on: () => handle.on.value });
    });
    handle.object.position.set(x, y, front + 0.001);
    handle.object.scale.setScalar(1.3);
    object.add(handle.object);
    parts.add(handle);
    // Its line of the chart, starting just right of its rocker.
    const line = label(
      `${String(i + 1).padStart(2)}  ${way?.legend ?? 'SPARE'}`,
      0,
      y,
      { height: 0.012, ink: '#e8e4d8', align: 'left' },
    );
    line.geometry.computeBoundingBox();
    const width =
      line.geometry.boundingBox!.max.x - line.geometry.boundingBox!.min.x;
    line.position.x = x + 0.025 + width / 2;
  });
  return {
    object,
    parts,
    update() {
      const powered = live();
      for (const { lens, on } of lenses)
        lens.color.set(powered ? (on() ? '#ff4a2e' : '#7a1f16') : '#140605');
    },
    dispose() {
      parts.dispose();
    },
  };
}
