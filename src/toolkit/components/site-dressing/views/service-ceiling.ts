import {
  detectorRows,
  layOutServiceCeiling,
  SYSTEMS,
} from '../logic/service-ceiling';
import type { CeilingOptions, CeilingRoom } from '../logic/service-ceiling';
import { createServiceMaterials } from './service-materials';
import type { ServiceMaterials } from './service-materials';
import {
  ACOUSTIC_CELL,
  acousticGrid,
  gridOpening,
  alongRun,
  cableLadder,
  detectorBatten,
  flowArrow,
  cableTray,
  cellularBeam,
  createPartSink,
  laggedDuct,
  metalDeck,
  pipeClip,
  pipeRun,
  spiralDuct,
  sprinklerPipe,
  strutTrapeze,
  swirlDiffuser,
  wireBasket,
} from './service-parts';
import { headingAt } from './service-sweep';

/**
 * A procedural services ceiling: the runs `layOutServiceCeiling` lays
 * out, built from the separate parts in `service-parts.ts` on a deck and
 * cellular beams, and merged by material, so a busy ceiling costs a
 * handful of draw calls. Set decoration, not plant (`AGENTS.md`). Metres.
 */

export interface ServiceCeilingOptions extends CeilingOptions {
  /** The beams across the room under the deck: their spacing. */
  beamEvery?: number;
  /** Shared finishes, if a room already has them. */
  materials?: ServiceMaterials;
  /** Smoke detectors on strut battens under the beams (on by default). */
  detectors?: boolean;
  /** A felt acoustic grid hung under it all (off by default). */
  acoustic?: boolean | { cell?: number };
}

/** How far apart the flow arrows are along a pipe or duct. */
const ARROW_EVERY = 4;

/** Depth of the steel beams under the deck, which the services hang below. */
export const BEAM_DEPTH = 0.45;

/**
 * Build the ceiling over `room`, whose `deckY` is the underside of the
 * deck. Returns the group and the runs it was built from.
 */
export function createServiceCeiling(
  room: CeilingRoom,
  options: ServiceCeilingOptions,
) {
  const m = options.materials ?? createServiceMaterials();
  const sink = createPartSink();
  metalDeck(sink, m, { ...room, y: room.deckY });
  const beamEvery = options.beamEvery ?? 5;
  for (let x = room.minX + beamEvery / 2; x < room.maxX; x += beamEvery)
    cellularBeam(sink, m, {
      x,
      minZ: room.minZ,
      maxZ: room.maxZ,
      top: room.deckY,
      depth: BEAM_DEPTH,
    });

  const top = room.deckY - BEAM_DEPTH;
  // The felt grid under it all, if it has one: where it is, so the
  // diffusers can come down through it.
  const grid = options.acoustic
    ? {
        bottom: top - 1.45,
        cell:
          typeof options.acoustic === 'object' && options.acoustic.cell
            ? options.acoustic.cell
            : ACOUSTIC_CELL,
      }
    : null;
  // Smoke detectors on strut battens fixed under the beams, wired along
  // them in red; the conduit and sprinkler pipe up there keep clear.
  const rows = options.detectors === false ? [] : detectorRows(room);
  for (const row of rows)
    detectorBatten(sink, m, {
      minX: room.minX,
      maxX: room.maxX,
      z: row.z,
      y: top,
      detectors: row.detectors.map(([x]) => x),
    });
  const keepClear = [
    ...(options.keepClear ?? []),
    ...rows.map((row) => ({
      layers: ['deck', 'top'],
      box: {
        minX: room.minX,
        maxX: room.maxX,
        minZ: row.z - 0.15,
        maxZ: row.z + 0.15,
      },
    })),
  ];
  const runs = layOutServiceCeiling(
    { ...room, deckY: top },
    { ...options, keepClear },
  );
  for (const run of runs) {
    const s = SYSTEMS[run.system];
    const { points, y } = run;
    const r = s.size / 2;
    switch (run.system) {
      case 'tray':
        cableTray(sink, m, { points, y, width: s.size, bend: s.bend });
        break;
      case 'basket':
        wireBasket(sink, m, { points, y, width: s.size, bend: s.bend });
        break;
      case 'ladder':
        cableLadder(sink, m, { points, y, width: s.size, bend: s.bend });
        break;
      case 'duct':
        spiralDuct(sink, m, { points, y, diameter: s.size, bend: s.bend });
        for (const [x, z] of run.drops) {
          if (!grid) {
            swirlDiffuser(sink, m, x, y, z);
            continue;
          }
          // Down through the grid: in the middle of the nearest opening,
          // a branch out to it if the duct does not pass over it, and the
          // face just under the felt.
          const [gx, gz] = gridOpening(room, x, z, grid.cell);
          if (Math.hypot(gx - x, gz - z) > 0.05)
            spiralDuct(sink, m, {
              points: [
                [x, z],
                [gx, z],
                [gx, gz],
              ].filter(
                (p, i, all) =>
                  i === 0 ||
                  Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > 0.01,
              ) as [number, number][],
              y,
              diameter: 0.3,
              bend: 0.15,
            });
          swirlDiffuser(sink, m, gx, y, gz, {
            drop: y - grid.bottom - 0.03,
          });
        }
        break;
      case 'lagged-duct':
        laggedDuct(sink, m, { points, y, diameter: s.size, bend: s.bend });
        break;
      case 'sprinkler':
        sprinklerPipe(sink, m, {
          points,
          y,
          diameter: s.size,
          bend: s.bend,
          heads: run.drops,
        });
        break;
      case 'pipe':
        pipeRun(sink, m.pipe, { points, y, diameter: s.size, bend: s.bend });
        break;
      case 'conduit':
        pipeRun(sink, m.conduit, { points, y, diameter: s.size, bend: s.bend });
        break;
    }
    // Flow arrows on its underside, the way it flows: red over blue on
    // ductwork, white on pipe.
    const arrows =
      run.system === 'duct' || run.system === 'lagged-duct'
        ? [m.arrowRed, m.arrowBlue]
        : run.system === 'pipe' || run.system === 'sprinkler'
          ? [m.arrowWhite]
          : null;
    if (arrows)
      for (const [x, z] of alongRun(points, ARROW_EVERY))
        flowArrow(
          sink,
          m,
          x,
          y - r,
          z,
          headingAt(points, [x, z]),
          Math.max(0.12, s.size * 0.75),
          arrows,
        );
    // Hung from the beams' underside: trapezes under the wide runs, ring
    // clips on the pipes.
    const wide = ['tray', 'basket', 'ladder', 'duct', 'lagged-duct'].includes(
      run.system,
    );
    for (const [x, z] of run.hangers) {
      const t = headingAt(points, [x, z]);
      if (wide) {
        const under = y - (run.system.includes('duct') ? r : 0.05);
        strutTrapeze(sink, m, x, under, z, t, s.size, top);
      } else pipeClip(sink, m, x, y, z, t, s.size, top);
    }
  }
  if (grid) acousticGrid(sink, m, { ...room, ...grid });
  return { group: sink.build('Services ceiling'), runs, materials: m };
}
