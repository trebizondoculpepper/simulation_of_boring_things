import { describe, expect, it } from 'vite-plus/test';
import { roomPipes } from './room-pipes';
import { cabinetPipes } from './cabinet-pipes';
import { roomServiceRoutes } from './room-services';
import { PIPE_KINDS } from '../../components/core/views/pipe-kinds';
import type { PipeKindId } from '../../components/core/views/pipe-kinds';
import { pipeClashes } from '../../components/core/logic/pipe-route';
import type { DrawnRun, Vec3 } from '../../components/core/logic/pipe-route';
import { ROOM_SERVICES } from '../../../game/plant/services';

/** Every rigid run drawn in a room, as the pipe helper draws it. */
function drawnRuns(room: string): DrawnRun[] {
  const runs: DrawnRun[] = [];
  const add = (
    name: string,
    kind: string,
    od: number,
    points: readonly Vec3[],
  ) => {
    const k = PIPE_KINDS[kind as PipeKindId] as
      | (typeof PIPE_KINDS)[PipeKindId]
      | undefined;
    // Ducts are not pipe; flexible hose and cable lie where they fall.
    if (!k || k.flexible) return;
    runs.push({
      name,
      od,
      points,
      joint: k.joint,
      bend: k.bend,
      lengths: k.lengths,
      insulation: k.insulation?.thickness,
    });
  };
  for (const r of roomPipes(room)) add(r.name, r.kind, r.od, r.points);
  for (const r of cabinetPipes(room)) add(r.name, r.kind, r.od, r.points);
  for (const r of roomServiceRoutes(room)) add(r.name, r.kind, r.od, r.points);
  return runs;
}

/**
 * The clashes found when the check was written (2026-10-23), room by
 * room: the lounge's filter inlets through their outlets; the cabinet
 * rooms' heating flow against its return, and the isolator's supply
 * against the room supply; the air plant's power feeds laid one along
 * another. Each may only fall.
 */
const KNOWN: Partial<Record<string, number>> = {
  plant_pool_01: 2,
  plant_pool_03: 3,
  plant_pool_04: 3,
  air_plant: 10,
};

describe('no pipe or fitting cuts into another', () => {
  it.each(Object.keys(ROOM_SERVICES))('%s', (room) => {
    const clashes = pipeClashes(drawnRuns(room));
    expect(
      clashes.length,
      clashes.map((c) => `${c.what}: ${c.run} into ${c.other}`).join('\n'),
    ).toBeLessThanOrEqual(KNOWN[room] ?? 0);
  });
});
