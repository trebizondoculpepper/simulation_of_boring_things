import { Group } from 'three';
import type { Object3D } from 'three';
import type { PanelKit } from '../../components/core/views/eighties-controls';
import { createPipe } from '../../components/core/views/pipe-kinds';
import { markComponent } from '../../components/core/views/component-identity';
import { createPipeMarker } from '../../components/plant/views/pipe-marker';
import { markPipe } from '../../components/plant/views/pipe-markers';
import type { PipeService } from '../../components/plant/views/pipe-markers';
import { corridorServices } from '../logic/corridor-services';
import type {
  CorridorRun,
  CorridorService,
  Vec3,
} from '../logic/corridor-services';

/**
 * The services through the ring corridor (prompt 088,
 * `logic/corridor-services.ts`): set decoration, every line drawn to its
 * kind and size, fire-stopped where it goes into a wall (a collar on a
 * plastic pipe, a sleeve on a metal one), and marked to BS 1710 with its
 * flow: the water and heating lines with their bands and labels, the
 * chemical lines' containment with their hazard markers and flow arrows
 * every few metres and by every wall.
 */

const MARKED: Record<CorridorService, PipeService> = {
  'heating flow': 'heating flow',
  'heating return': 'heating return',
  'make-up': 'pool water',
  'cold water': 'pool water',
  'hot water': 'pool water',
  drainage: 'drainage',
  hypochlorite: 'hypochlorite',
  acid: 'acid',
};

/** Where along a run its chemical markers go: the middle of every straight of 0.8 m or more, and every 6 m along a longer one. */
function markerPlaces(points: readonly Vec3[]) {
  const out: { at: Vec3; dir: Vec3 }[] = [];
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const L = Math.hypot(...d);
    if (L < 0.8 || Math.abs(d[1]) > 1e-6) continue;
    const n = Math.max(1, Math.round(L / 6));
    const u: Vec3 = [d[0] / L, d[1] / L, d[2] / L];
    for (let k = 0; k < n; k++) {
      const t = ((k + 0.5) / n) * L;
      out.push({
        at: [a[0] + u[0] * t, a[1] + u[1] * t, a[2] + u[2] * t],
        dir: u,
      });
    }
  }
  return out;
}

const outerOf = (r: CorridorRun) =>
  r.contained ? Math.max(0.05, r.od * 1.9) : r.od;

export function createCorridorServices(kit: PanelKit) {
  const group = new Group();
  group.name = 'corridor services';
  const runs = corridorServices();
  // One marker built per chemical, cloned wherever it is wanted.
  const markers = new Map<string, Object3D>();
  const markerFor = (r: CorridorRun) => {
    const key = `${r.service} ${outerOf(r)}`;
    let m = markers.get(key);
    if (!m) {
      m = createPipeMarker(kit, {
        r: outerOf(r) / 2,
        chemical: r.service as 'hypochlorite' | 'acid',
        contained: true,
      }).object;
      markers.set(key, m);
    }
    return m.clone();
  };
  for (const r of runs) {
    const od = outerOf(r);
    // A chemical line in its containment, drawn as the containment.
    const kind = r.contained ? 'double-contained' : r.kind;
    const pipe = createPipe(kind, od, r.points, {
      through: r.through.map((t) => ({
        at: t.at,
        normal: t.normal,
        thickness: 0.2,
        kind:
          r.kind === 'pvc-pressure'
            ? ('fire-collar' as const)
            : ('sleeve' as const),
      })),
    });
    pipe.name = r.name;
    group.add(markComponent(pipe, { name: r.name, decorative: true }));
    if (r.contained)
      for (const m of markerPlaces(r.points)) {
        const marker = markerFor(r);
        marker.position.set(...m.at);
        marker.rotation.y = Math.atan2(-m.dir[2], m.dir[0]);
        group.add(markComponent(marker, { name: r.name, decorative: true }));
      }
    else if (od >= 0.02)
      group.add(
        markComponent(
          markPipe(kit, r.points, {
            radius: od / 2 + (r.kind === 'lagged-heating' ? 0.04 : 0),
            service: MARKED[r.service],
            text: r.label,
          }),
          { name: r.name, decorative: true },
        ),
      );
  }
  return group;
}
